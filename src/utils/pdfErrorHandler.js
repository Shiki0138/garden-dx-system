/**
 * PDF生成エラーハンドリングユーティリティ
 * 包括的なエラー処理とデバッグ支援機能
 */

// エラータイプ定義
export const PDF_ERROR_TYPES = {
  MEMORY_ERROR: 'MEMORY_ERROR',
  FONT_ERROR: 'FONT_ERROR',
  IMAGE_ERROR: 'IMAGE_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  RENDERING_ERROR: 'RENDERING_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  BROWSER_ERROR: 'BROWSER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// エラーレベル定義
export const ERROR_LEVELS = {
  CRITICAL: 'critical',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * PDF生成専用エラークラス
 */
export class PDFGenerationError extends Error {
  constructor(message, type = PDF_ERROR_TYPES.RENDERING_ERROR, level = ERROR_LEVELS.ERROR, details = {}) {
    super(message);
    this.name = 'PDFGenerationError';
    this.type = type;
    this.level = level;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // スタックトレースの保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PDFGenerationError);
    }
  }

  /**
   * エラー情報を構造化された形式で取得
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      level: this.level,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * システム情報収集
 */
const collectSystemInfo = () => {
  try {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: 'Failed to collect system info', message: error.message };
  }
};

/**
 * PDF生成エラーの詳細解析
 */
export const analyzePDFError = (error, context = {}) => {
  let errorType = PDF_ERROR_TYPES.RENDERING_ERROR;
  let level = ERROR_LEVELS.ERROR;
  let suggestions = [];
  let details = { ...context };

  const errorMessage = error.message || error.toString();
  const errorStack = error.stack || '';

  // エラーメッセージによる分類
  if (errorMessage.includes('out of memory') || errorMessage.includes('Maximum call stack')) {
    errorType = PDF_ERROR_TYPES.MEMORY_ERROR;
    level = ERROR_LEVELS.CRITICAL;
    suggestions.push('データ量を削減してください');
    suggestions.push('バッチ処理を検討してください');
    suggestions.push('メモリ最適化設定を確認してください');
  } else if (errorMessage.includes('font') || errorMessage.includes('Font')) {
    errorType = PDF_ERROR_TYPES.FONT_ERROR;
    suggestions.push('フォント設定を確認してください');
    suggestions.push('フォールバックフォントを設定してください');
  } else if (errorMessage.includes('image') || errorMessage.includes('canvas')) {
    errorType = PDF_ERROR_TYPES.IMAGE_ERROR;
    suggestions.push('画像ファイルの形式を確認してください');
    suggestions.push('画像サイズを縮小してください');
  } else if (errorMessage.includes('permission') || errorMessage.includes('blocked')) {
    errorType = PDF_ERROR_TYPES.PERMISSION_ERROR;
    level = ERROR_LEVELS.WARNING;
    suggestions.push('ブラウザのセキュリティ設定を確認してください');
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    errorType = PDF_ERROR_TYPES.NETWORK_ERROR;
    suggestions.push('インターネット接続を確認してください');
    suggestions.push('画像URLが正しいか確認してください');
  }

  // ブラウザ固有の問題
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    details.browserNote = 'Safari固有の問題の可能性があります';
    suggestions.push('Chrome/Firefoxでの動作を確認してください');
  } else if (userAgent.includes('Firefox')) {
    details.browserNote = 'Firefox固有の問題の可能性があります';
  }

  // システム情報の追加
  details.systemInfo = collectSystemInfo();
  details.errorAnalysis = {
    type: errorType,
    level: level,
    suggestions: suggestions,
    originalError: {
      message: errorMessage,
      name: error.name,
      stack: errorStack
    }
  };

  return new PDFGenerationError(
    errorMessage,
    errorType,
    level,
    details
  );
};

/**
 * エラーログの記録
 */
export const logPDFError = (error, context = {}) => {
  const analyzedError = error instanceof PDFGenerationError 
    ? error 
    : analyzePDFError(error, context);

  // コンソール出力
  const logMethod = analyzedError.level === ERROR_LEVELS.CRITICAL ? 'error' :
                   analyzedError.level === ERROR_LEVELS.ERROR ? 'error' :
                   analyzedError.level === ERROR_LEVELS.WARNING ? 'warn' : 'info';

  console.group(`🔴 PDF Generation ${analyzedError.level.toUpperCase()}`);
  console[logMethod]('Message:', analyzedError.message);
  console.log('Type:', analyzedError.type);
  console.log('Timestamp:', analyzedError.timestamp);
  
  if (analyzedError.details.errorAnalysis?.suggestions?.length > 0) {
    console.log('💡 Suggestions:');
    analyzedError.details.errorAnalysis.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }
  
  if (analyzedError.details.systemInfo) {
    console.log('💻 System Info:', analyzedError.details.systemInfo);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Full Details:', analyzedError.details);
    console.log('📚 Stack Trace:', analyzedError.stack);
  }
  
  console.groupEnd();

  // 本番環境での外部サービスへの送信（オプション）
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_ERROR_REPORTING === 'true') {
    sendErrorToService(analyzedError).catch(err => {
      console.warn('Failed to send error to reporting service:', err);
    });
  }

  return analyzedError;
};

/**
 * エラーレポートサービスへの送信
 */
const sendErrorToService = async (error) => {
  try {
    // 外部サービス（Sentry、LogRocket等）への送信
    const reportData = {
      error: error.toJSON(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // 実際の実装では適切なエンドポイントに送信
    console.info('Error report prepared for external service:', reportData);
    
    // fetch('/api/error-report', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(reportData)
    // });
  } catch (sendError) {
    console.warn('Failed to send error report:', sendError);
  }
};

/**
 * 安全なPDF生成実行ラッパー
 */
export const safePDFGeneration = async (generatorFunction, context = {}) => {
  try {
    // メモリ使用量の事前チェック
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      if (memoryUsage > 0.8) {
        console.warn('High memory usage detected:', `${(memoryUsage * 100).toFixed(1)}%`);
        
        // ガベージコレクションの強制実行（可能な場合）
        if (window.gc) {
          window.gc();
        }
      }
    }

    // PDF生成の実行
    const startTime = performance.now();
    const result = await generatorFunction();
    const endTime = performance.now();

    // パフォーマンス情報をログ出力
    console.info(`PDF generation completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      success: true,
      result,
      performance: {
        duration: endTime - startTime,
        memoryUsed: performance.memory?.usedJSHeapSize
      }
    };

  } catch (error) {
    const analyzedError = logPDFError(error, context);
    
    return {
      success: false,
      error: analyzedError,
      context
    };
  }
};

/**
 * ユーザーフレンドリーなエラーメッセージの生成
 */
export const getUserFriendlyErrorMessage = (error) => {
  const analyzedError = error instanceof PDFGenerationError ? error : analyzePDFError(error);
  
  const baseMessage = 'PDF生成中にエラーが発生しました。';
  
  switch (analyzedError.type) {
    case PDF_ERROR_TYPES.MEMORY_ERROR:
      return baseMessage + 'データが大きすぎる可能性があります。画像を減らすか、データを分割して再試行してください。';
    
    case PDF_ERROR_TYPES.FONT_ERROR:
      return baseMessage + '日本語フォントの読み込みに失敗しました。ページを再読み込みして再試行してください。';
    
    case PDF_ERROR_TYPES.IMAGE_ERROR:
      return baseMessage + '画像の処理に失敗しました。画像ファイルを確認して再試行してください。';
    
    case PDF_ERROR_TYPES.PERMISSION_ERROR:
      return baseMessage + 'ブラウザの設定により処理が制限されています。設定を確認してください。';
    
    case PDF_ERROR_TYPES.NETWORK_ERROR:
      return baseMessage + 'ネットワークエラーが発生しました。インターネット接続を確認して再試行してください。';
    
    default:
      return baseMessage + 'しばらく時間をおいて再試行してください。問題が継続する場合は、サポートにお問い合わせください。';
  }
};

export default {
  PDFGenerationError,
  analyzePDFError,
  logPDFError,
  safePDFGeneration,
  getUserFriendlyErrorMessage,
  PDF_ERROR_TYPES,
  ERROR_LEVELS
};