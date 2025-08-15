/**
 * デフォルト価格マスターデータ
 * 依頼者指定の追加項目を含む統合データ
 */

export const defaultPriceMasterData = {
  土工事: [
    {
      code: 'E-001',
      name: '機械掘削',
      specification: 'バックホウ0.45㎥',
      unit: '㎥',
      minPrice: 2500,
      standardPrice: 3000,
      maxPrice: 3500,
      remarks: '残土処分含まず'
    },
    {
      code: 'E-002',
      name: '人力掘削',
      specification: '深さ1.0m未満',
      unit: '㎥',
      minPrice: 6000,
      standardPrice: 8000,
      maxPrice: 10000,
      remarks: '狭小地作業'
    },
    {
      code: 'E-003',
      name: '残土処分',
      specification: '場内処分',
      unit: '㎥',
      minPrice: 1500,
      standardPrice: 2000,
      maxPrice: 2500,
      remarks: '運搬費込み'
    },
    {
      code: 'E-004',
      name: '残土処分',
      specification: '場外搬出（10km以内）',
      unit: '㎥',
      minPrice: 4000,
      standardPrice: 5000,
      maxPrice: 6000,
      remarks: '処分費込み'
    },
    {
      code: 'E-005',
      name: '客土搬入',
      specification: '真砂土',
      unit: '㎥',
      minPrice: 3500,
      standardPrice: 4500,
      maxPrice: 5500,
      remarks: '運搬費込み'
    },
    {
      code: 'E-006',
      name: '土壌改良',
      specification: 'バーク堆肥混入',
      unit: '㎡',
      minPrice: 1200,
      standardPrice: 1500,
      maxPrice: 1800,
      remarks: '深さ30cm'
    },
    {
      code: 'E-007',
      name: '整地・転圧',
      specification: '機械転圧',
      unit: '㎡',
      minPrice: 300,
      standardPrice: 500,
      maxPrice: 700,
      remarks: '-'
    }
  ],
  植栽工事: {
    高木: [
      {
        code: 'P-101',
        name: '高木植栽',
        specification: 'H3.0m未満 C0.15未満',
        unit: '本',
        minPrice: 15000,
        standardPrice: 20000,
        maxPrice: 25000,
        remarks: '支柱込み'
      },
      {
        code: 'P-102',
        name: '高木植栽',
        specification: 'H3.0-5.0m C0.15-0.20',
        unit: '本',
        minPrice: 30000,
        standardPrice: 40000,
        maxPrice: 50000,
        remarks: '支柱込み'
      },
      {
        code: 'P-103',
        name: '高木植栽',
        specification: 'H5.0m以上 C0.21以上',
        unit: '本',
        minPrice: 50000,
        standardPrice: 70000,
        maxPrice: 100000,
        remarks: '支柱・重機使用'
      }
    ],
    中木: [
      {
        code: 'P-201',
        name: '中木植栽',
        specification: 'H1.5-2.0m',
        unit: '本',
        minPrice: 5000,
        standardPrice: 8000,
        maxPrice: 12000,
        remarks: '-'
      },
      {
        code: 'P-202',
        name: '中木植栽',
        specification: 'H2.0-3.0m',
        unit: '本',
        minPrice: 10000,
        standardPrice: 15000,
        maxPrice: 20000,
        remarks: '-'
      }
    ],
    低木: [
      {
        code: 'P-301',
        name: '低木植栽',
        specification: 'H0.3-0.5m',
        unit: '本',
        minPrice: 800,
        standardPrice: 1200,
        maxPrice: 1500,
        remarks: '-'
      },
      {
        code: 'P-302',
        name: '低木植栽',
        specification: 'H0.5-1.0m',
        unit: '本',
        minPrice: 1500,
        standardPrice: 2000,
        maxPrice: 3000,
        remarks: '-'
      }
    ],
    地被: [
      {
        code: 'P-401',
        name: '地被類植栽',
        specification: '3号ポット',
        unit: 'ポット',
        minPrice: 250,
        standardPrice: 350,
        maxPrice: 450,
        remarks: '25ポット/㎡'
      }
    ],
    芝: [
      {
        code: 'P-501',
        name: '芝張り',
        specification: '高麗芝',
        unit: '㎡',
        minPrice: 1200,
        standardPrice: 1500,
        maxPrice: 1800,
        remarks: '目土込み'
      },
      {
        code: 'P-502',
        name: '芝張り',
        specification: '姫高麗芝',
        unit: '㎡',
        minPrice: 1500,
        standardPrice: 2000,
        maxPrice: 2500,
        remarks: '目土込み'
      }
    ]
  },
  外構工事: {
    舗装: [
      {
        code: 'G-001',
        name: '自然石張り',
        specification: '御影石t30乱形',
        unit: '㎡',
        minPrice: 15000,
        standardPrice: 20000,
        maxPrice: 25000,
        remarks: 'モルタル張り'
      },
      {
        code: 'G-002',
        name: 'インターロッキング',
        specification: '標準ブロックt60',
        unit: '㎡',
        minPrice: 6000,
        standardPrice: 8000,
        maxPrice: 10000,
        remarks: '路盤込み'
      },
      {
        code: 'G-003',
        name: 'コンクリート平板',
        specification: '300角t60',
        unit: '㎡',
        minPrice: 5000,
        standardPrice: 7000,
        maxPrice: 9000,
        remarks: '-'
      },
      // 依頼者追加項目
      {
        code: 'G-004',
        name: '石貼り',
        specification: '自然石平面貼り',
        unit: '㎡',
        minPrice: 12000,
        standardPrice: 18000,
        maxPrice: 24000,
        remarks: 'モルタル張り・目地込み'
      },
      {
        code: 'G-005',
        name: '三和土舗装',
        specification: '伝統的土間仕上げ',
        unit: '㎡',
        minPrice: 8000,
        standardPrice: 12000,
        maxPrice: 16000,
        remarks: '消石灰・にがり使用'
      },
      {
        code: 'G-006',
        name: '単粒砕石敷きならし（Aランク）',
        specification: '高品質砕石C-40',
        unit: '㎡',
        minPrice: 1800,
        standardPrice: 2500,
        maxPrice: 3200,
        remarks: '転圧込み・厚さ10cm'
      },
      {
        code: 'G-007',
        name: '単粒砕石敷きならし（Bランク）',
        specification: '標準品質砕石C-40',
        unit: '㎡',
        minPrice: 1200,
        standardPrice: 1800,
        maxPrice: 2400,
        remarks: '転圧込み・厚さ10cm'
      }
    ],
    構造物: [
      {
        code: 'G-101',
        name: 'ブロック積み',
        specification: 'CB150 H1.0m',
        unit: '㎡',
        minPrice: 8000,
        standardPrice: 10000,
        maxPrice: 12000,
        remarks: '基礎込み'
      },
      {
        code: 'G-102',
        name: '自然石積み',
        specification: '野面積み',
        unit: '㎡',
        minPrice: 25000,
        standardPrice: 35000,
        maxPrice: 45000,
        remarks: '基礎込み'
      },
      // 依頼者追加項目
      {
        code: 'G-103',
        name: '石積み（面積み）',
        specification: '規則正しい石積み',
        unit: '㎡',
        minPrice: 18000,
        standardPrice: 25000,
        maxPrice: 32000,
        remarks: '基礎工事込み・モルタル使用'
      },
      {
        code: 'G-104',
        name: '石積み（崩れ積み）',
        specification: '自然風石積み',
        unit: '㎡',
        minPrice: 22000,
        standardPrice: 30000,
        maxPrice: 38000,
        remarks: '基礎工事込み・空積み'
      },
      {
        code: 'G-105',
        name: '石積み（ロックガーデン）',
        specification: '庭園用装飾石積み',
        unit: '㎡',
        minPrice: 30000,
        standardPrice: 40000,
        maxPrice: 50000,
        remarks: '特殊施工・排水考慮'
      }
    ],
    フェンス: [
      {
        code: 'G-201',
        name: 'アルミフェンス',
        specification: 'H1.2m 標準型',
        unit: 'm',
        minPrice: 12000,
        standardPrice: 15000,
        maxPrice: 18000,
        remarks: '基礎込み'
      },
      {
        code: 'G-202',
        name: 'ウッドフェンス',
        specification: 'H1.8m 横張り',
        unit: 'm',
        minPrice: 20000,
        standardPrice: 25000,
        maxPrice: 30000,
        remarks: '防腐処理材'
      }
    ],
    門扉: [
      {
        code: 'G-301',
        name: 'アルミ門扉',
        specification: '両開きW2.0m',
        unit: '基',
        minPrice: 80000,
        standardPrice: 120000,
        maxPrice: 180000,
        remarks: '電気錠なし'
      }
    ],
    カーポート: [
      {
        code: 'G-401',
        name: 'アルミカーポート',
        specification: '1台用標準',
        unit: '基',
        minPrice: 250000,
        standardPrice: 350000,
        maxPrice: 450000,
        remarks: '基礎工事込み'
      }
    ]
  },
  // 依頼者追加カテゴリ
  資材工事: {
    資材: [
      {
        code: 'M-001',
        name: '防草シート（Aランク）',
        specification: '高耐久・高遮光タイプ',
        unit: '㎡',
        minPrice: 800,
        standardPrice: 1200,
        maxPrice: 1600,
        remarks: '厚み1.0mm・UV加工'
      },
      {
        code: 'M-002',
        name: '防草シート（Bランク）',
        specification: '標準仕様タイプ',
        unit: '㎡',
        minPrice: 400,
        standardPrice: 600,
        maxPrice: 800,
        remarks: '厚み0.5mm・標準品'
      }
    ]
  },
  機械損耗費: {
    機械: [
      {
        code: 'K-001',
        name: '移動式グリーン車',
        specification: '芝生管理車両',
        unit: '台/日',
        minPrice: 25000,
        standardPrice: 35000,
        maxPrice: 45000,
        remarks: 'オペレーター込み'
      },
      {
        code: 'K-002',
        name: '小型整地車両',
        specification: 'ミニショベル・整地仕様',
        unit: '台/日',
        minPrice: 30000,
        standardPrice: 40000,
        maxPrice: 50000,
        remarks: 'オペレーター込み'
      },
      {
        code: 'K-003',
        name: '転圧機',
        specification: '振動プレート・歩行式',
        unit: '台/日',
        minPrice: 8000,
        standardPrice: 12000,
        maxPrice: 16000,
        remarks: '燃料・オペレーター込み'
      },
      {
        code: 'K-004',
        name: 'モルタルミキサー',
        specification: '電動・可搬式',
        unit: '台/日',
        minPrice: 5000,
        standardPrice: 8000,
        maxPrice: 12000,
        remarks: '電源・清掃込み'
      }
    ]
  },
  その他工事: {
    水景: [
      {
        code: 'W-001',
        name: 'つくばい設置',
        specification: '自然石つくばい',
        unit: '基',
        minPrice: 80000,
        standardPrice: 120000,
        maxPrice: 180000,
        remarks: '給排水工事込み'
      },
      {
        code: 'W-002',
        name: '池工事',
        specification: '防水シート工法',
        unit: '㎡',
        minPrice: 25000,
        standardPrice: 35000,
        maxPrice: 45000,
        remarks: 'ポンプ別途'
      }
    ],
    照明: [
      {
        code: 'L-001',
        name: '庭園灯設置',
        specification: 'ローボルトLED',
        unit: '基',
        minPrice: 15000,
        standardPrice: 20000,
        maxPrice: 25000,
        remarks: '配線込み'
      },
      {
        code: 'L-002',
        name: 'スポットライト',
        specification: '樹木照明用',
        unit: '基',
        minPrice: 8000,
        standardPrice: 12000,
        maxPrice: 15000,
        remarks: '-'
      }
    ],
    設備: [
      {
        code: 'S-001',
        name: '散水栓設置',
        specification: '不凍水栓',
        unit: '箇所',
        minPrice: 25000,
        standardPrice: 35000,
        maxPrice: 45000,
        remarks: '配管10m込み'
      }
    ],
    仮設: [
      {
        code: 'T-001',
        name: '仮設工事',
        specification: '養生・仮囲い',
        unit: '式',
        minPrice: 50000,
        standardPrice: 100000,
        maxPrice: 200000,
        remarks: '規模による'
      }
    ]
  }
};

// デフォルトデータをローカルストレージに保存する関数
export const loadDefaultPriceMaster = () => {
  try {
    const dataWithIds = addItemIds(defaultPriceMasterData);
    localStorage.setItem('priceMaster', JSON.stringify(dataWithIds));
    localStorage.setItem('priceMasterUpdatedAt', new Date().toISOString());
    console.log('デフォルト価格マスターデータを読み込みました');
    console.log('追加項目:', {
      資材工事: dataWithIds.資材工事?.資材?.length || 0,
      機械損耗費: dataWithIds.機械損耗費?.機械?.length || 0
    });
    return true;
  } catch (error) {
    console.error('Failed to load default price master:', error);
    return false;
  }
};

// 価格マスターデータに一意のIDを付与する関数
export const addItemIds = (data) => {
  let itemIdCounter = 1;
  
  const processCategory = (items) => {
    return items.map(item => ({
      ...item,
      item_id: `item_${itemIdCounter++}`
    }));
  };

  const result = {};
  
  Object.keys(data).forEach(mainCategory => {
    if (Array.isArray(data[mainCategory])) {
      result[mainCategory] = processCategory(data[mainCategory]);
    } else {
      result[mainCategory] = {};
      Object.keys(data[mainCategory]).forEach(subCategory => {
        result[mainCategory][subCategory] = processCategory(data[mainCategory][subCategory]);
      });
    }
  });
  
  return result;
};