/**
 * 画像最適化ユーティリティ
 * 大きな画像の自動リサイズとメモリ効率的な処理
 */

/**
 * 画像をリサイズしてBase64形式で返す
 * @param {File} file - 画像ファイル
 * @param {Object} options - リサイズオプション
 * @returns {Promise<{data: string, width: number, height: number, size: number}>}
 */
export const resizeImage = async (file, options = {}) => {
  const {
    maxWidth = parseInt(process.env.REACT_APP_MAX_IMAGE_WIDTH, 10) || 1920,
    maxHeight = parseInt(process.env.REACT_APP_MAX_IMAGE_HEIGHT, 10) || 1080,
    quality = parseFloat(process.env.REACT_APP_IMAGE_QUALITY) || 0.85,
    format = 'jpeg' // jpeg, png, webp
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // キャンバスを作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // アスペクト比を保持しながらサイズを計算
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );
        
        canvas.width = width;
        canvas.height = height;
        
        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // 圧縮してBase64に変換
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('画像の圧縮に失敗しました'));
              return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                data: reader.result,
                width,
                height,
                size: blob.size,
                originalSize: file.size,
                compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(2)
              });
            };
            reader.readAsDataURL(blob);
          },
          `image/${format}`,
          quality
        );
        
        // メモリ解放
        img.remove();
      };
      
      img.onerror = () => {
        reject(new Error('画像の読み込みに失敗しました'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * アスペクト比を保持しながら新しいサイズを計算
 */
const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  // 元のサイズが制限内の場合はそのまま返す
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }
  
  // アスペクト比を計算
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  // 高さが制限を超える場合は高さを基準に再計算
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * 複数の画像を並列でリサイズ
 * @param {File[]} files - 画像ファイルの配列
 * @param {Object} options - リサイズオプション
 * @param {Function} onProgress - 進捗コールバック
 * @returns {Promise<Array>}
 */
export const resizeMultipleImages = async (files, options = {}, onProgress) => {
  const results = [];
  const totalFiles = files.length;
  let completed = 0;
  
  // バッチサイズを設定（メモリ使用量を制御）
  const batchSize = parseInt(process.env.REACT_APP_IMAGE_BATCH_SIZE, 10) || 3;
  
  for (let i = 0; i < totalFiles; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const result = await resizeImage(file, options);
          completed++;
          
          if (onProgress) {
            onProgress({
              completed,
              total: totalFiles,
              percentage: Math.round((completed / totalFiles) * 100)
            });
          }
          
          return {
            success: true,
            file: file.name,
            ...result
          };
        } catch (error) {
          completed++;
          
          if (onProgress) {
            onProgress({
              completed,
              total: totalFiles,
              percentage: Math.round((completed / totalFiles) * 100)
            });
          }
          
          return {
            success: false,
            file: file.name,
            error: error.message
          };
        }
      })
    );
    
    results.push(...batchResults);
    
    // バッチ間でガベージコレクションを促す
    if (i + batchSize < totalFiles) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return results;
};

/**
 * 画像のEXIFデータを削除（プライバシー保護）
 * @param {string} base64Image - Base64形式の画像
 * @returns {Promise<string>}
 */
export const stripExifData = async (base64Image) => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // EXIFデータなしで再エンコード
      resolve(canvas.toDataURL('image/jpeg', 0.95));
      
      // メモリ解放
      img.remove();
    };
    
    img.src = base64Image;
  });
};

/**
 * 画像の遅延読み込み用のサムネイル生成
 * @param {File} file - 画像ファイル
 * @param {number} size - サムネイルサイズ（デフォルト: 150px）
 * @returns {Promise<string>}
 */
export const createThumbnail = async (file, size = 150) => {
  const result = await resizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'jpeg'
  });
  
  return result.data;
};

/**
 * メモリ使用量を監視しながら画像処理
 * @param {Function} processFunc - 処理関数
 * @param {number} memoryThreshold - メモリ閾値（MB）
 * @returns {Promise<any>}
 */
export const processWithMemoryCheck = async (processFunc, memoryThreshold = 100) => {
  // パフォーマンスAPIが利用可能かチェック
  if (performance.memory) {
    const beforeMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
    
    if (beforeMemory > memoryThreshold) {
      console.warn(`メモリ使用量が高い状態です: ${beforeMemory.toFixed(2)}MB`);
      
      // ガベージコレクションを促す
      if (global.gc) {
        global.gc();
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  try {
    const result = await processFunc();
    return result;
  } finally {
    // 処理後のクリーンアップ
    if (performance.memory) {
      const afterMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
      console.log(`メモリ使用量: ${afterMemory.toFixed(2)}MB`);
    }
  }
};