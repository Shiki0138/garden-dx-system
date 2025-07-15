/**
 * PDF生成最適化ユーティリティ
 * 造園業界標準準拠・高性能PDF生成のための共通最適化機能
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// パフォーマンス最適化用キャッシュ
const FONT_CACHE = new Map();
const LAYOUT_CACHE = new Map();
const IMAGE_CACHE = new Map();

// 最適化設定
const OPTIMIZATION_CONFIG = {
  // メモリ管理
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  chunkSize: 1000, // バッチ処理サイズ
  gcInterval: 5000, // ガベージコレクション間隔

  // パフォーマンス
  enableWebWorker: true,
  parallelProcessing: true,
  compressionLevel: 9,

  // 画質設定
  imageQuality: 0.92,
  dpi: 300,
  fontSubsetting: true,
};

/**
 * PDF生成パフォーマンス監視
 */
class PDFPerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: 0,
      endTime: 0,
      memoryUsage: 0,
      dataSize: 0,
      renderTime: 0,
      compressionRatio: 0,
    };
  }

  start() {
    this.metrics.startTime = performance.now();
    this.metrics.memoryUsage = performance.memory?.usedJSHeapSize || 0;
  }

  end(pdfSize) {
    this.metrics.endTime = performance.now();
    this.metrics.renderTime = this.metrics.endTime - this.metrics.startTime;

    const currentMemory = performance.memory?.usedJSHeapSize || 0;
    this.metrics.memoryUsage = currentMemory - this.metrics.memoryUsage;

    console.log('PDF生成パフォーマンス:', {
      renderTime: `${this.metrics.renderTime.toFixed(2)}ms`,
      memoryUsage: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      pdfSize: `${(pdfSize / 1024).toFixed(2)}KB`,
    });
  }
}

/**
 * メモリ効率的なデータ処理
 */
export const processDataInChunks = async (
  data,
  chunkProcessor,
  chunkSize = OPTIMIZATION_CONFIG.chunkSize
) => {
  const results = [];
  const totalChunks = Math.ceil(data.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    const chunk = data.slice(start, end);

    // チャンク処理
    const chunkResult = await chunkProcessor(chunk, i, totalChunks);
    results.push(...chunkResult);

    // メモリ解放のための短い遅延
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
};

/**
 * フォントの最適化とキャッシュ
 */
export const optimizeFont = async (doc, fontName, fontData) => {
  const cacheKey = `font_${fontName}`;

  if (FONT_CACHE.has(cacheKey)) {
    return FONT_CACHE.get(cacheKey);
  }

  // フォントサブセット化（使用文字のみ含める）
  if (OPTIMIZATION_CONFIG.fontSubsetting && fontData) {
    const optimizedFont = await createFontSubset(fontData);
    FONT_CACHE.set(cacheKey, optimizedFont);
    return optimizedFont;
  }

  FONT_CACHE.set(cacheKey, fontData);
  return fontData;
};

/**
 * 画像の最適化とキャッシュ
 */
export const optimizeImage = async (imageUrl, options = {}) => {
  const cacheKey = `img_${imageUrl}_${JSON.stringify(options)}`;

  if (IMAGE_CACHE.has(cacheKey)) {
    return IMAGE_CACHE.get(cacheKey);
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 最適なサイズに調整
      const maxWidth = options.maxWidth || 800;
      const maxHeight = options.maxHeight || 600;

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 画像を描画
      ctx.drawImage(img, 0, 0, width, height);

      // 最適化された画像データを取得
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', OPTIMIZATION_CONFIG.imageQuality);

      IMAGE_CACHE.set(cacheKey, {
        dataUrl: optimizedDataUrl,
        width,
        height,
      });

      // キャッシュサイズ管理
      manageCacheSize();

      resolve(IMAGE_CACHE.get(cacheKey));
    };

    img.onerror = reject;
    img.src = imageUrl;
  });
};

/**
 * レイアウトキャッシュ
 */
export const getCachedLayout = (layoutKey, calculator) => {
  if (LAYOUT_CACHE.has(layoutKey)) {
    return LAYOUT_CACHE.get(layoutKey);
  }

  const layout = calculator();
  LAYOUT_CACHE.set(layoutKey, layout);

  return layout;
};

/**
 * キャッシュサイズ管理
 */
const manageCacheSize = () => {
  const totalSize = estimateCacheSize();

  if (totalSize > OPTIMIZATION_CONFIG.maxCacheSize) {
    // 最も古いエントリから削除
    const caches = [FONT_CACHE, LAYOUT_CACHE, IMAGE_CACHE];

    caches.forEach(cache => {
      const entriesToRemove = Math.floor(cache.size * 0.3); // 30%削除
      const keys = Array.from(cache.keys());

      for (let i = 0; i < entriesToRemove; i++) {
        cache.delete(keys[i]);
      }
    });
  }
};

/**
 * キャッシュサイズ推定
 */
const estimateCacheSize = () => {
  let totalSize = 0;

  // 簡易的なサイズ推定
  FONT_CACHE.forEach(value => {
    totalSize += JSON.stringify(value).length * 2; // UTF-16
  });

  IMAGE_CACHE.forEach(value => {
    totalSize += value.dataUrl.length;
  });

  LAYOUT_CACHE.forEach(value => {
    totalSize += JSON.stringify(value).length * 2;
  });

  return totalSize;
};

/**
 * PDFストリーム最適化
 */
export const createOptimizedPDF = (options = {}) => {
  const defaultOptions = {
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 2,
    userUnit: 1.0,
    ...options,
  };

  const doc = new jsPDF(defaultOptions);

  // 圧縮設定
  doc.internal.compression = OPTIMIZATION_CONFIG.compressionLevel;

  return doc;
};

/**
 * 大量データの効率的な描画
 */
export const renderLargeTable = async (doc, tableData, options = {}) => {
  const monitor = new PDFPerformanceMonitor();
  monitor.start();

  const {
    startY = 20,
    columnWidths = [],
    rowHeight = 10,
    headerRows = 1,
    pageBreakThreshold = 20,
  } = options;

  let currentY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();

  // ヘッダー描画関数
  const drawHeader = () => {
    for (let i = 0; i < headerRows; i++) {
      const row = tableData[i];
      drawRow(doc, row, currentY, columnWidths, true);
      currentY += rowHeight;
    }
  };

  // 最初のヘッダー描画
  drawHeader();

  // データ行を効率的に描画
  await processDataInChunks(tableData.slice(headerRows), async chunk => {
    chunk.forEach(row => {
      // ページ送りチェック
      if (currentY + rowHeight > pageHeight - pageBreakThreshold) {
        doc.addPage();
        currentY = startY;
        drawHeader();
      }

      drawRow(doc, row, currentY, columnWidths, false);
      currentY += rowHeight;
    });

    return [];
  });

  monitor.end(doc.output('blob').size);
};

/**
 * 行描画ヘルパー
 */
const drawRow = (doc, row, y, columnWidths, isHeader) => {
  let x = 20;

  row.forEach((cell, index) => {
    const width = columnWidths[index] || 30;

    if (isHeader) {
      doc.setFillColor(240, 240, 240);
      doc.rect(x, y, width, 10, 'F');
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFont(undefined, 'normal');
    }

    doc.text(String(cell), x + 2, y + 7);
    x += width;
  });
};

/**
 * Web Worker を使用した並列処理
 */
export const processInWorker = async (workerScript, data) => {
  if (!OPTIMIZATION_CONFIG.enableWebWorker || !window.Worker) {
    // Web Workerが使用できない場合は通常処理
    return processDataInChunks(data, async chunk => chunk);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.onmessage = e => {
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.result);
      }
      worker.terminate();
    };

    worker.onerror = error => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ data });
  });
};

/**
 * フォントサブセット作成（簡易版）
 */
const createFontSubset = async fontData => {
  // 実際の実装では、使用文字を分析してサブセットを作成
  // ここでは簡易的に元のフォントを返す
  return fontData;
};

/**
 * PDF最適化のメイン関数
 */
export const optimizePDFGeneration = async (generateFunc, data, options = {}) => {
  const monitor = new PDFPerformanceMonitor();
  monitor.start();

  try {
    // メモリクリーンアップ
    if (global.gc) {
      global.gc();
    }

    // 最適化されたPDF生成
    const result = await generateFunc(data, {
      ...options,
      optimizer: {
        processDataInChunks,
        optimizeFont,
        optimizeImage,
        getCachedLayout,
        renderLargeTable,
      },
    });

    monitor.end(result.size || 0);

    return result;
  } catch (error) {
    console.error('PDF生成エラー:', error);
    throw error;
  } finally {
    // 定期的なキャッシュクリーンアップ
    setTimeout(manageCacheSize, OPTIMIZATION_CONFIG.gcInterval);
  }
};

export default {
  optimizePDFGeneration,
  createOptimizedPDF,
  processDataInChunks,
  optimizeImage,
  optimizeFont,
  getCachedLayout,
  renderLargeTable,
  PDFPerformanceMonitor,
};
