/**
 * PDF生成パフォーマンス最適化ユーティリティ
 * メモリ効率的なPDF生成とパフォーマンス監視機能
 */

import { globalMemoryMonitor } from './memoryMonitor';

// パフォーマンス閾値設定
const PERFORMANCE_THRESHOLDS = {
  memoryWarning: 0.7, // 70%でメモリ警告
  memoryCritical: 0.85, // 85%でメモリクリティカル
  maxRenderTime: 30000, // 最大レンダリング時間（30秒）
  maxImageSize: 5 * 1024 * 1024, // 最大画像サイズ（5MB）
  maxDocumentSize: 50 * 1024 * 1024, // 最大ドキュメントサイズ（50MB）
  batchSize: 10 // バッチ処理のサイズ
};

// キャッシュマネージャー
class PDFCacheManager {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (this.cache.has(key)) {
      this.accessOrder.set(key, Date.now());
      return this.cache.get(key);
    }
    return null;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
  }

  evictOldest() {
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldest = key;
        oldestTime = time;
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest);
      this.accessOrder.delete(oldest);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
  }

  getSize() {
    return this.cache.size;
  }
}

// グローバルキャッシュインスタンス
const pdfCache = new PDFCacheManager();

/**
 * メモリ効率的なPDF生成のための前処理
 */
export const preprocessPDFData = async (data, options = {}) => {
  const {
    optimizeImages = true,
    compressData = true,
    validateSize = true
  } = options;

  try {
    let processedData = { ...data };
    const startMemory = globalMemoryMonitor.getCurrentMemoryUsage();

    // データサイズ検証
    if (validateSize) {
      const dataSize = JSON.stringify(data).length;
      if (dataSize > PERFORMANCE_THRESHOLDS.maxDocumentSize) {
        throw new Error(`Document size (${dataSize} bytes) exceeds maximum allowed size`);
      }
    }

    // 画像最適化
    if (optimizeImages && data.items) {
      const optimizedItems = await Promise.all(
        data.items.map(async (item) => {
          if (item.image && typeof item.image === 'string') {
            return {
              ...item,
              image: await optimizeImageForPDF(item.image)
            };
          }
          return item;
        })
      );
      processedData.items = optimizedItems;
    }

    // データ圧縮
    if (compressData) {
      processedData = compressDataForPDF(processedData);
    }

    const endMemory = globalMemoryMonitor.getCurrentMemoryUsage();
    const memoryUsed = endMemory - startMemory;

    return {
      success: true,
      data: processedData,
      stats: {
        memoryUsed,
        optimizationsApplied: {
          images: optimizeImages,
          compression: compressData,
          validation: validateSize
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      originalData: data
    };
  }
};

/**
 * PDF用画像最適化
 */
const optimizeImageForPDF = async (imageData) => {
  try {
    // Base64画像の場合
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 最大サイズ制限
          const maxWidth = 1200;
          const maxHeight = 800;
          
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // 品質調整（0.8 = 80%品質）
          const optimizedData = canvas.toDataURL('image/jpeg', 0.8);
          resolve(optimizedData);
        };
        
        img.onerror = () => reject(new Error('Image optimization failed'));
        img.src = imageData;
      });
    }
    
    return imageData;
  } catch (error) {
    console.warn('Image optimization failed:', error);
    return imageData;
  }
};

/**
 * データ圧縮（冗長な情報の削除）
 */
const compressDataForPDF = (data) => {
  const compressed = { ...data };
  
  // 空のフィールドを削除
  Object.keys(compressed).forEach(key => {
    if (compressed[key] === null || compressed[key] === undefined || compressed[key] === '') {
      delete compressed[key];
    }
  });
  
  // アイテムの最適化
  if (compressed.items && Array.isArray(compressed.items)) {
    compressed.items = compressed.items.map(item => {
      const optimizedItem = { ...item };
      
      // 不要なフィールドを削除
      ['tempId', 'editing', 'dirty'].forEach(field => {
        delete optimizedItem[field];
      });
      
      return optimizedItem;
    });
  }
  
  return compressed;
};

/**
 * バッチ処理によるPDF生成
 */
export const generatePDFInBatches = async (data, generatorFunction, options = {}) => {
  const {
    batchSize = PERFORMANCE_THRESHOLDS.batchSize,
    onProgress = () => {},
    onBatchComplete = () => {}
  } = options;

  try {
    const items = data.items || [];
    const batches = [];
    
    // バッチに分割
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    let processedItems = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchData = { ...data, items: batch };
      
      // メモリチェック
      const memoryUsage = globalMemoryMonitor.getCurrentMemoryUsage();
      if (memoryUsage > PERFORMANCE_THRESHOLDS.memoryWarning) {
        console.warn(`High memory usage detected: ${(memoryUsage * 100).toFixed(1)}%`);
        
        // ガベージコレクションの実行
        if (window.gc) {
          window.gc();
        }
      }
      
      // バッチ処理
      const batchResult = await generatorFunction(batchData);
      processedItems = processedItems.concat(batchResult);
      
      // プログレス更新
      const progress = ((i + 1) / batches.length) * 100;
      onProgress(progress);
      onBatchComplete(i + 1, batches.length);
      
      // 短い休憩でUIブロッキングを防止
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return {
      success: true,
      result: { ...data, items: processedItems },
      batchesProcessed: batches.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      partialResult: null
    };
  }
};

/**
 * リアルタイムパフォーマンス監視
 */
export class PDFPerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      memoryStart: null,
      memoryPeak: null,
      memoryEnd: null,
      renderTime: null,
      warnings: [],
      errors: []
    };
    this.monitoringInterval = null;
  }

  start() {
    this.metrics.startTime = performance.now();
    this.metrics.memoryStart = globalMemoryMonitor.getCurrentMemoryUsage();
    this.metrics.memoryPeak = this.metrics.memoryStart;
    
    // メモリ監視を開始
    this.monitoringInterval = setInterval(() => {
      const currentMemory = globalMemoryMonitor.getCurrentMemoryUsage();
      
      if (currentMemory > this.metrics.memoryPeak) {
        this.metrics.memoryPeak = currentMemory;
      }
      
      if (currentMemory > PERFORMANCE_THRESHOLDS.memoryCritical) {
        this.metrics.errors.push({
          type: 'MEMORY_CRITICAL',
          message: `Critical memory usage: ${(currentMemory * 100).toFixed(1)}%`,
          timestamp: Date.now()
        });
      } else if (currentMemory > PERFORMANCE_THRESHOLDS.memoryWarning) {
        this.metrics.warnings.push({
          type: 'MEMORY_WARNING',
          message: `High memory usage: ${(currentMemory * 100).toFixed(1)}%`,
          timestamp: Date.now()
        });
      }
    }, 1000);
  }

  end(pdfSize = null) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.metrics.endTime = performance.now();
    this.metrics.memoryEnd = globalMemoryMonitor.getCurrentMemoryUsage();
    this.metrics.renderTime = this.metrics.endTime - this.metrics.startTime;
    
    if (pdfSize) {
      this.metrics.pdfSize = pdfSize;
    }
    
    // パフォーマンス評価
    if (this.metrics.renderTime > PERFORMANCE_THRESHOLDS.maxRenderTime) {
      this.metrics.warnings.push({
        type: 'SLOW_RENDER',
        message: `Slow rendering: ${this.metrics.renderTime.toFixed(2)}ms`,
        timestamp: Date.now()
      });
    }
    
    return this.getReport();
  }

  getReport() {
    return {
      renderTime: this.metrics.renderTime,
      memoryUsage: {
        start: this.metrics.memoryStart,
        peak: this.metrics.memoryPeak,
        end: this.metrics.memoryEnd,
        difference: this.metrics.memoryEnd - this.metrics.memoryStart
      },
      pdfSize: this.metrics.pdfSize,
      warnings: this.metrics.warnings,
      errors: this.metrics.errors,
      performance: this.evaluatePerformance()
    };
  }

  evaluatePerformance() {
    const score = {
      memory: 100,
      speed: 100,
      overall: 100
    };
    
    // メモリスコア計算
    if (this.metrics.memoryPeak > PERFORMANCE_THRESHOLDS.memoryCritical) {
      score.memory = 30;
    } else if (this.metrics.memoryPeak > PERFORMANCE_THRESHOLDS.memoryWarning) {
      score.memory = 60;
    }
    
    // スピードスコア計算
    if (this.metrics.renderTime > PERFORMANCE_THRESHOLDS.maxRenderTime) {
      score.speed = 40;
    } else if (this.metrics.renderTime > PERFORMANCE_THRESHOLDS.maxRenderTime / 2) {
      score.speed = 70;
    }
    
    // 総合スコア
    score.overall = Math.round((score.memory + score.speed) / 2);
    
    return score;
  }
}

/**
 * キャッシュを使用した効率的なPDF生成
 */
export const generateCachedPDF = async (data, generatorFunction, cacheKey = null) => {
  try {
    // キャッシュキーの生成
    const key = cacheKey || generateCacheKey(data);
    
    // キャッシュから確認
    const cached = pdfCache.get(key);
    if (cached) {
      console.info('PDF loaded from cache:', key);
      return {
        success: true,
        result: cached,
        fromCache: true
      };
    }
    
    // 新規生成
    const result = await generatorFunction(data);
    
    // キャッシュに保存（サイズ制限あり）
    if (result && JSON.stringify(result).length < 1024 * 1024) { // 1MB未満
      pdfCache.set(key, result);
    }
    
    return {
      success: true,
      result,
      fromCache: false
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * キャッシュキー生成
 */
const generateCacheKey = (data) => {
  const keyData = {
    id: data.id,
    type: data.type,
    itemCount: data.items ? data.items.length : 0,
    lastModified: data.lastModified || data.updatedAt
  };
  
  return btoa(JSON.stringify(keyData)).substring(0, 32);
};

/**
 * パフォーマンス統計の取得
 */
export const getPDFPerformanceStats = () => {
  return {
    cacheStats: {
      size: pdfCache.getSize(),
      maxSize: pdfCache.maxSize,
      hitRate: '統計機能は今後実装予定'
    },
    memoryStats: globalMemoryMonitor.getStats(),
    thresholds: PERFORMANCE_THRESHOLDS
  };
};

/**
 * キャッシュクリア
 */
export const clearPDFCache = () => {
  pdfCache.clear();
  console.info('PDF cache cleared');
};

export default {
  preprocessPDFData,
  generatePDFInBatches,
  PDFPerformanceMonitor,
  generateCachedPDF,
  getPDFPerformanceStats,
  clearPDFCache,
  PERFORMANCE_THRESHOLDS
};