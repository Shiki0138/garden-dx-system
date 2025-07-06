/**
 * PDF生成最適化ユーティリティ
 * Garden DXプロジェクト - 共通PDF最適化ロジック
 * パフォーマンス向上・メモリ効率化・キャッシュ管理
 */

import { jsPDF } from 'jspdf';

// パフォーマンス監視クラス
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      renderTime: 100, // ms
      memoryUsage: 50 * 1024 * 1024, // 50MB
      cacheHitRate: 0.7, // 70%
    };
  }

  startMeasure(label) {
    this.metrics.set(label, {
      startTime: performance.now(),
      startMemory: performance.memory?.usedJSHeapSize || 0,
    });
  }

  endMeasure(label) {
    const start = this.metrics.get(label);
    if (!start) return null;

    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize || 0;
    
    const duration = endTime - start.startTime;
    const memoryDelta = endMemory - start.startMemory;

    const result = {
      label,
      duration,
      memoryDelta,
      timestamp: new Date().toISOString(),
    };

    // パフォーマンス警告
    if (duration > this.thresholds.renderTime) {
      console.warn(`⚠️ PDF生成パフォーマンス警告: ${label} - ${duration.toFixed(2)}ms`);
    }

    if (memoryDelta > this.thresholds.memoryUsage) {
      console.warn(`⚠️ メモリ使用量警告: ${label} - ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }

    return result;
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }
}

// キャッシュマネージャー
class PDFCacheManager {
  constructor(maxSize = 10 * 1024 * 1024) { // 10MB
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  generateKey(data) {
    // データからユニークなキーを生成
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `pdf_${hash}_${str.length}`;
  }

  get(key) {
    if (this.cache.has(key)) {
      this.hitCount++;
      const entry = this.cache.get(key);
      entry.lastAccessed = Date.now();
      // LRU: 最近使用したものを最後に移動
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data;
    }
    this.missCount++;
    return null;
  }

  set(key, data, size) {
    // キャッシュサイズ管理
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      // 最も古いエントリを削除（LRU）
      const oldestKey = this.cache.keys().next().value;
      const oldestEntry = this.cache.get(oldestKey);
      this.currentSize -= oldestEntry.size;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      size,
      created: Date.now(),
      lastAccessed: Date.now(),
    });
    this.currentSize += size;
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  getStats() {
    const hitRate = this.hitCount + this.missCount > 0
      ? this.hitCount / (this.hitCount + this.missCount)
      : 0;

    return {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(2),
    };
  }
}

// メモリ効率的なデータ処理
export class PDFDataOptimizer {
  constructor() {
    this.chunkSize = 100; // バッチ処理サイズ
  }

  /**
   * 大量データの分割処理
   */
  async processLargeDataset(items, processor, options = {}) {
    const { 
      chunkSize = this.chunkSize,
      onProgress = () => {},
      delayBetweenChunks = 0,
    } = options;

    const results = [];
    const totalChunks = Math.ceil(items.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, items.length);
      const chunk = items.slice(start, end);

      // チャンク処理
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      results.push(...chunkResults);

      // 進捗通知
      onProgress({
        current: end,
        total: items.length,
        percentage: (end / items.length) * 100,
      });

      // メモリ解放のための遅延
      if (delayBetweenChunks > 0 && i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }

    return results;
  }

  /**
   * 画像最適化
   */
  async optimizeImage(imageData, options = {}) {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 0.8,
      format = 'image/jpeg',
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // アスペクト比を保持してリサイズ
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          format,
          quality
        );
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * テキストの最適化（長いテキストの省略など）
   */
  optimizeText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 数値フォーマットの最適化
   */
  formatNumber(value, options = {}) {
    const {
      decimals = 0,
      thousandsSeparator = ',',
      prefix = '',
      suffix = '',
    } = options;

    if (typeof value !== 'number') return value;

    const formatted = value.toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

    return `${prefix}${formatted}${suffix}`;
  }
}

// PDF生成最適化メインクラス
export class PDFOptimizer {
  constructor(options = {}) {
    this.performanceMonitor = new PerformanceMonitor();
    this.cacheManager = new PDFCacheManager(options.cacheSize);
    this.dataOptimizer = new PDFDataOptimizer();
    this.options = {
      enableCache: true,
      enableCompression: true,
      enableLazyLoading: true,
      compressionLevel: 9,
      ...options,
    };
  }

  /**
   * 最適化されたPDF生成
   */
  async generateOptimizedPDF(data, generator, options = {}) {
    const cacheKey = this.cacheManager.generateKey({ data, options });
    
    // キャッシュチェック
    if (this.options.enableCache) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        console.log('📋 PDFキャッシュヒット');
        return cached;
      }
    }

    // パフォーマンス測定開始
    this.performanceMonitor.startMeasure('pdf_generation');

    try {
      // PDF生成オプションの最適化
      const optimizedOptions = {
        ...options,
        compress: this.options.enableCompression,
        precision: 2,
        floatPrecision: 2,
      };

      // データの前処理（最適化）
      const optimizedData = await this.preprocessData(data);

      // PDF生成
      const pdf = await generator(optimizedData, optimizedOptions);

      // 圧縮処理
      if (this.options.enableCompression) {
        await this.compressPDF(pdf);
      }

      // キャッシュ保存
      if (this.options.enableCache) {
        const pdfSize = pdf.output('arraybuffer').byteLength;
        this.cacheManager.set(cacheKey, pdf, pdfSize);
      }

      return pdf;
    } finally {
      const metrics = this.performanceMonitor.endMeasure('pdf_generation');
      console.log(`✅ PDF生成完了: ${metrics?.duration.toFixed(2)}ms`);
    }
  }

  /**
   * データの前処理と最適化
   */
  async preprocessData(data) {
    this.performanceMonitor.startMeasure('data_preprocessing');

    try {
      const optimized = { ...data };

      // 画像の最適化
      if (data.images && Array.isArray(data.images)) {
        optimized.images = await this.dataOptimizer.processLargeDataset(
          data.images,
          img => this.dataOptimizer.optimizeImage(img.data, img.options),
          { chunkSize: 5 }
        );
      }

      // テキストの最適化
      if (data.items && Array.isArray(data.items)) {
        optimized.items = data.items.map(item => ({
          ...item,
          description: this.dataOptimizer.optimizeText(item.description, 200),
          notes: this.dataOptimizer.optimizeText(item.notes, 150),
        }));
      }

      return optimized;
    } finally {
      this.performanceMonitor.endMeasure('data_preprocessing');
    }
  }

  /**
   * PDF圧縮処理
   */
  async compressPDF(pdf) {
    this.performanceMonitor.startMeasure('pdf_compression');

    try {
      // jsPDFの内部圧縮設定
      if (pdf.internal && pdf.internal.scaleFactor) {
        pdf.internal.scaleFactor = 1.5; // 解像度調整
      }

      // 画像圧縮設定
      if (pdf.internal && pdf.internal.collections) {
        const images = pdf.internal.collections.images;
        if (images) {
          Object.keys(images).forEach(key => {
            const img = images[key];
            if (img.compressionLevel !== undefined) {
              img.compressionLevel = this.options.compressionLevel;
            }
          });
        }
      }

      return pdf;
    } finally {
      this.performanceMonitor.endMeasure('pdf_compression');
    }
  }

  /**
   * バッチPDF生成（複数PDF同時生成）
   */
  async generateBatchPDFs(dataArray, generator, options = {}) {
    this.performanceMonitor.startMeasure('batch_pdf_generation');

    try {
      const batchOptions = {
        ...options,
        concurrency: options.concurrency || 3,
        onProgress: options.onProgress || (() => {}),
      };

      const results = await this.dataOptimizer.processLargeDataset(
        dataArray,
        async (data) => this.generateOptimizedPDF(data, generator, batchOptions),
        {
          chunkSize: batchOptions.concurrency,
          onProgress: batchOptions.onProgress,
          delayBetweenChunks: 100, // メモリ解放のための遅延
        }
      );

      return results;
    } finally {
      const metrics = this.performanceMonitor.endMeasure('batch_pdf_generation');
      console.log(`✅ バッチPDF生成完了: ${dataArray.length}件 - ${metrics?.duration.toFixed(2)}ms`);
    }
  }

  /**
   * メモリ使用量の監視
   */
  getMemoryUsage() {
    if (!performance.memory) {
      return { supported: false };
    }

    return {
      supported: true,
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
    };
  }

  /**
   * 最適化統計情報の取得
   */
  getOptimizationStats() {
    return {
      cache: this.cacheManager.getStats(),
      memory: this.getMemoryUsage(),
      performance: this.performanceMonitor.getMetrics(),
    };
  }

  /**
   * リソースクリーンアップ
   */
  cleanup() {
    this.cacheManager.clear();
    this.performanceMonitor = new PerformanceMonitor();
    
    // ガベージコレクションのヒント
    if (global.gc) {
      global.gc();
    }
  }
}

// シングルトンインスタンス
let optimizerInstance = null;

/**
 * PDF最適化インスタンスの取得
 */
export function getPDFOptimizer(options = {}) {
  if (!optimizerInstance) {
    optimizerInstance = new PDFOptimizer(options);
  }
  return optimizerInstance;
}

// デフォルトエクスポート
export default {
  PDFOptimizer,
  PDFDataOptimizer,
  PDFCacheManager,
  PerformanceMonitor,
  getPDFOptimizer,
};