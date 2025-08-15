/**
 * エラーハンドリング使用例
 * あなたが示したフォーマットでの詳細なエラーログ実装
 */

import { handlePdfError, handleImageError, handleApiError, globalErrorHandler } from '../utils/errorHandler';
import { ProgressivePDFGenerator } from '../utils/progressivePdfGenerator';
import { resizeImage } from '../utils/imageOptimizer';

/**
 * PDF生成エラーハンドリング例
 */
export const generatePDFWithDetailedErrorHandling = async (data) => {
  try {
    const generator = new ProgressivePDFGenerator({
      orientation: 'portrait',
      format: 'a4',
      margin: 20
    });

    await generator.addHeader('見積書', `見積番号: ${data.estimateNumber}`);
    await generator.addSection('顧客情報', data.customerInfo);
    
    const tableHeaders = ['項目', '数量', '単価', '金額'];
    const tableData = data.items.map(item => [
      item.name,
      item.quantity.toString(),
      `¥${item.unitPrice.toLocaleString()}`,
      `¥${item.totalPrice.toLocaleString()}`
    ]);
    
    await generator.addProgressiveTable(tableHeaders, tableData);
    
    return await generator.getBlob();

  } catch (error) {
    // 詳細なエラーログ（あなたの例と同じフォーマット）
    console.error('PDF生成エラー:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      // 追加コンテキスト情報
      estimateNumber: data?.estimateNumber || 'N/A',
      itemCount: data?.items?.length || 0,
      customerName: data?.customerInfo?.name || 'N/A',
      fileSize: data?.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0,
      // ブラウザ情報
      userAgent: navigator.userAgent,
      url: window.location.href,
      // メモリ情報
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    });

    // 構造化されたエラーハンドリング
    await handlePdfError(error, {
      component: 'PDFGenerator',
      function: 'generatePDFWithDetailedErrorHandling',
      additionalData: {
        estimateNumber: data?.estimateNumber,
        itemCount: data?.items?.length,
        operation: 'pdf_generation'
      }
    });

    // エラーを再スロー
    throw error;
  }
};

/**
 * 画像処理エラーハンドリング例
 */
export const processImageWithErrorHandling = async (file) => {
  try {
    // 画像ファイルの基本検証
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('有効な画像ファイルではありません');
    }

    // ファイルサイズチェック
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`ファイルサイズが大きすぎます: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // 画像リサイズ処理
    const resizedImage = await resizeImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85
    });

    return resizedImage;

  } catch (error) {
    // 詳細なエラーログ
    console.error('画像処理エラー:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      // ファイル情報
      fileName: file?.name || 'unknown',
      fileSize: file?.size || 0,
      fileType: file?.type || 'unknown',
      // 処理パラメータ
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
      // エラー分類
      errorType: error.name || 'UnknownError',
      errorCode: error.code || null
    });

    // 構造化されたエラーハンドリング
    await handleImageError(error, {
      component: 'ImageProcessor',
      function: 'processImageWithErrorHandling',
      additionalData: {
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        operation: 'image_resize'
      }
    });

    throw error;
  }
};

/**
 * API呼び出しエラーハンドリング例
 */
export const fetchDataWithErrorHandling = async (endpoint, options = {}) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();

  try {
    console.log(`API リクエスト開始 [${requestId}]:`, {
      endpoint,
      method: options.method || 'GET',
      timestamp: new Date().toISOString()
    });

    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...options.headers
      },
      ...options
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();

    console.log(`API リクエスト成功 [${requestId}]:`, {
      status: response.status,
      responseTime: `${responseTime}ms`,
      dataSize: JSON.stringify(data).length
    });

    return data;

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // 詳細なエラーログ
    console.error('API呼び出しエラー:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      // リクエスト情報
      requestId,
      endpoint,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      // レスポンス情報
      responseTime: `${responseTime}ms`,
      // ネットワーク情報
      online: navigator.onLine,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      // エラー分類
      errorType: error.name,
      isNetworkError: error.message.includes('fetch'),
      isTimeoutError: error.message.includes('timeout')
    });

    // 構造化されたエラーハンドリング
    await handleApiError(error, {
      component: 'APIClient',
      function: 'fetchDataWithErrorHandling',
      additionalData: {
        requestId,
        endpoint,
        method: options.method || 'GET',
        responseTime,
        operation: 'api_request'
      }
    });

    throw error;
  }
};

/**
 * 複合処理のエラーハンドリング例（見積書作成全体）
 */
export const createEstimateWithFullErrorHandling = async (estimateData, files = []) => {
  const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();

  try {
    console.log(`見積書作成開始 [${operationId}]:`, {
      estimateNumber: estimateData.estimateNumber,
      itemCount: estimateData.items?.length || 0,
      fileCount: files.length,
      timestamp: new Date().toISOString()
    });

    // ステップ1: 画像処理
    const processedImages = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const processedImage = await processImageWithErrorHandling(files[i]);
        processedImages.push(processedImage);
      } catch (imageError) {
        console.warn(`画像処理スキップ [${files[i].name}]:`, imageError.message);
      }
    }

    // ステップ2: データをAPIに保存
    const savedEstimate = await fetchDataWithErrorHandling('/api/estimates', {
      method: 'POST',
      body: JSON.stringify({
        ...estimateData,
        imageCount: processedImages.length
      })
    });

    // ステップ3: PDF生成
    const pdfBlob = await generatePDFWithDetailedErrorHandling({
      ...estimateData,
      images: processedImages
    });

    const totalTime = Date.now() - startTime;

    console.log(`見積書作成完了 [${operationId}]:`, {
      estimateId: savedEstimate.id,
      pdfSize: `${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`,
      processedImages: processedImages.length,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });

    return {
      estimate: savedEstimate,
      pdf: pdfBlob,
      images: processedImages,
      operationId,
      processingTime: totalTime
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;

    // 詳細なエラーログ
    console.error('見積書作成エラー:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      // 操作情報
      operationId,
      estimateNumber: estimateData?.estimateNumber || 'N/A',
      itemCount: estimateData?.items?.length || 0,
      fileCount: files.length,
      processingTime: `${totalTime}ms`,
      // 処理段階
      stage: determineErrorStage(error),
      // システム情報
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null,
      // ブラウザ情報
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // グローバルエラーハンドラーに送信
    await globalErrorHandler.handleError(error, {
      component: 'EstimateCreator',
      function: 'createEstimateWithFullErrorHandling',
      additionalData: {
        operationId,
        estimateNumber: estimateData?.estimateNumber,
        itemCount: estimateData?.items?.length,
        fileCount: files.length,
        processingTime: totalTime,
        operation: 'create_estimate'
      }
    });

    throw error;
  }
};

/**
 * エラーが発生した処理段階を特定
 */
function determineErrorStage(error) {
  if (error.message.includes('画像処理') || error.message.includes('image')) {
    return 'image_processing';
  }
  if (error.message.includes('API') || error.message.includes('fetch')) {
    return 'api_save';
  }
  if (error.message.includes('PDF') || error.message.includes('pdf')) {
    return 'pdf_generation';
  }
  return 'unknown';
}

/**
 * エラー統計レポート生成
 */
export const generateErrorReport = () => {
  const stats = globalErrorHandler.getStats();
  const history = globalErrorHandler.getHistory(20);

  console.log('エラーレポート:', {
    期間: '現在のセッション',
    総エラー数: stats.totalErrors,
    カテゴリ別: stats.errorsByCategory,
    レベル別: stats.errorsByLevel,
    最新エラー: stats.lastError ? {
      時刻: stats.lastError.timestamp,
      メッセージ: stats.lastError.message,
      カテゴリ: stats.lastError.category
    } : null,
    直近のエラー履歴: history.map(error => ({
      時刻: error.timestamp,
      レベル: error.level,
      カテゴリ: error.category,
      メッセージ: error.message.substring(0, 100)
    }))
  });

  return {
    stats,
    history,
    recommendations: generateRecommendations(stats)
  };
};

/**
 * エラー統計に基づく推奨事項
 */
function generateRecommendations(stats) {
  const recommendations = [];

  // PDF生成エラーが多い場合
  if (stats.errorsByCategory.pdf_generation > 5) {
    recommendations.push('PDF生成エラーが頻発しています。データサイズや画像数を確認してください。');
  }

  // メモリ関連エラーが多い場合
  if (stats.errorsByCategory.memory > 3) {
    recommendations.push('メモリ不足エラーが発生しています。ブラウザの再起動を検討してください。');
  }

  // API エラーが多い場合
  if (stats.errorsByCategory.api_request > 10) {
    recommendations.push('API呼び出しエラーが多発しています。ネットワーク接続を確認してください。');
  }

  // 全体的にエラーが多い場合
  if (stats.totalErrors > 50) {
    recommendations.push('エラー発生数が多いため、システムの点検が必要です。');
  }

  return recommendations;
}

export default {
  generatePDFWithDetailedErrorHandling,
  processImageWithErrorHandling,
  fetchDataWithErrorHandling,
  createEstimateWithFullErrorHandling,
  generateErrorReport
};