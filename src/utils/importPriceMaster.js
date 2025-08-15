/**
 * 工事単価マスターデータのインポート処理
 * CSVファイルから単価データを読み込み、システムに反映する
 */

// CSVデータをJSONに変換
export const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    
    data.push(row);
  }
  
  return data;
};

// 単価データを構造化
export const structurePriceData = (csvData) => {
  const structured = {
    土工事: [],
    植栽工事: {
      高木: [],
      中木: [],
      低木: [],
      地被: [],
      芝: []
    },
    外構工事: {
      舗装: [],
      構造物: [],
      フェンス: [],
      門扉: [],
      カーポート: []
    },
    資材工事: {
      資材: []
    },
    機械損耗費: {
      機械: []
    },
    その他工事: {
      水景: [],
      照明: [],
      設備: [],
      仮設: []
    }
  };

  csvData.forEach(row => {
    const item = {
      code: row['工事項目コード'],
      name: row['工事項目名'],
      specification: row['仕様・規格'],
      unit: row['単位'],
      minPrice: parseInt(row['最小単価']) || 0,
      standardPrice: parseInt(row['標準単価']) || 0,
      maxPrice: parseInt(row['最大単価']) || 0,
      remarks: row['備考'] || ''
    };

    const category = row['カテゴリ'];
    
    // カテゴリーに応じて振り分け
    switch (category) {
      case '土工事':
        structured.土工事.push(item);
        break;
      case '高木':
      case '中木':
      case '低木':
      case '地被':
      case '芝':
        structured.植栽工事[category].push(item);
        break;
      case '舗装':
      case '構造物':
      case 'フェンス':
      case '門扉':
      case 'カーポート':
        structured.外構工事[category].push(item);
        break;
      case '資材':
        structured.資材工事[category].push(item);
        break;
      case '機械':
        structured.機械損耗費[category].push(item);
        break;
      case '水景':
      case '照明':
      case '設備':
      case '仮設':
        structured.その他工事[category].push(item);
        break;
      default:
        console.warn(`Unknown category: ${category}`);
    }
  });

  return structured;
};

// 単価データをローカルストレージに保存
export const savePriceMaster = (structuredData) => {
  try {
    localStorage.setItem('priceMaster', JSON.stringify(structuredData));
    localStorage.setItem('priceMasterUpdatedAt', new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Failed to save price master:', error);
    return false;
  }
};

// 単価データを取得
export const getPriceMaster = () => {
  try {
    const data = localStorage.getItem('priceMaster');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load price master:', error);
    return null;
  }
};

// ファイルアップロード処理
export const handleFileUpload = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const csvData = parseCSV(csvText);
        const structuredData = structurePriceData(csvData);
        const saved = savePriceMaster(structuredData);
        
        if (saved) {
          resolve({
            success: true,
            message: '単価マスターデータを正常に取り込みました',
            itemCount: csvData.length,
            data: structuredData
          });
        } else {
          reject(new Error('データの保存に失敗しました'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};

// 工事項目を検索
export const searchPriceItem = (keyword) => {
  const priceMaster = getPriceMaster();
  if (!priceMaster) return [];
  
  const results = [];
  const searchKeyword = keyword.toLowerCase();
  
  // 全カテゴリーを検索
  const searchInCategory = (items, categoryName) => {
    items.forEach(item => {
      if (
        item.name.toLowerCase().includes(searchKeyword) ||
        item.code.toLowerCase().includes(searchKeyword) ||
        item.specification.toLowerCase().includes(searchKeyword)
      ) {
        results.push({
          ...item,
          category: categoryName
        });
      }
    });
  };
  
  // 土工事
  searchInCategory(priceMaster.土工事, '土工事');
  
  // 植栽工事
  Object.entries(priceMaster.植栽工事).forEach(([subCategory, items]) => {
    searchInCategory(items, `植栽工事/${subCategory}`);
  });
  
  // 外構工事
  Object.entries(priceMaster.外構工事).forEach(([subCategory, items]) => {
    searchInCategory(items, `外構工事/${subCategory}`);
  });
  
  // 資材工事
  if (priceMaster.資材工事) {
    Object.entries(priceMaster.資材工事).forEach(([subCategory, items]) => {
      searchInCategory(items, `資材工事/${subCategory}`);
    });
  }
  
  // 機械損耗費
  if (priceMaster.機械損耗費) {
    Object.entries(priceMaster.機械損耗費).forEach(([subCategory, items]) => {
      searchInCategory(items, `機械損耗費/${subCategory}`);
    });
  }
  
  // その他工事
  Object.entries(priceMaster.その他工事).forEach(([subCategory, items]) => {
    searchInCategory(items, `その他工事/${subCategory}`);
  });
  
  return results;
};

// 見積項目に単価を適用
export const applyPriceToEstimateItem = (itemCode, quantity = 1, priceType = 'standard') => {
  const priceMaster = getPriceMaster();
  if (!priceMaster) return null;
  
  // 全カテゴリーから該当項目を検索
  let foundItem = null;
  
  const findItem = (items) => {
    return items.find(item => item.code === itemCode);
  };
  
  // 検索実行
  foundItem = findItem(priceMaster.土工事);
  
  if (!foundItem) {
    Object.values(priceMaster.植栽工事).forEach(items => {
      if (!foundItem) foundItem = findItem(items);
    });
  }
  
  if (!foundItem) {
    Object.values(priceMaster.外構工事).forEach(items => {
      if (!foundItem) foundItem = findItem(items);
    });
  }
  
  if (!foundItem && priceMaster.資材工事) {
    Object.values(priceMaster.資材工事).forEach(items => {
      if (!foundItem) foundItem = findItem(items);
    });
  }
  
  if (!foundItem && priceMaster.機械損耗費) {
    Object.values(priceMaster.機械損耗費).forEach(items => {
      if (!foundItem) foundItem = findItem(items);
    });
  }
  
  if (!foundItem) {
    Object.values(priceMaster.その他工事).forEach(items => {
      if (!foundItem) foundItem = findItem(items);
    });
  }
  
  if (!foundItem) return null;
  
  // 単価タイプに応じた金額を計算
  let unitPrice;
  switch (priceType) {
    case 'min':
      unitPrice = foundItem.minPrice;
      break;
    case 'max':
      unitPrice = foundItem.maxPrice;
      break;
    default:
      unitPrice = foundItem.standardPrice;
  }
  
  return {
    ...foundItem,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity
  };
};