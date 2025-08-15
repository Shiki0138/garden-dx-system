/**
 * PDF生成エラーハンドリングの使用例
 * 詳細なエラーログとリトライ機能を含む実装例
 */

import { ProgressivePDFGenerator } from '../utils/progressivePdfGenerator';
import { handlePdfError, withRetry, ERROR_CATEGORIES, ERROR_LEVELS } from '../utils/errorHandler';

/**
 * 見積書PDF生成（エラーハンドリング付き）
 */
export const generateEstimateWithErrorHandling = async (estimateData, onProgress) => {
  try {
    // リトライ機能付きでPDF生成を実行
    const pdfBlob = await withRetry(
      async () => {
        const generator = new ProgressivePDFGenerator({
          orientation: 'portrait',
          format: 'a4',
          margin: 20,
          onProgress: (progress) => {
            onProgress?.({
              ...progress,
              stage: 'pdf_generation'
            });
          }
        });

        // ヘッダー追加
        await generator.addHeader(
          '御見積書',
          `見積番号: ${estimateData.estimateNumber}`
        );

        // 顧客情報
        await generator.addSection('お客様情報', `
          ${estimateData.customer.name} 様
          ${estimateData.customer.address}
          TEL: ${estimateData.customer.phone}
        `);

        // 見積内容テーブル
        const tableHeaders = ['項目', '数量', '単位', '単価', '金額'];
        const tableData = estimateData.items.map(item => [
          item.name,
          item.quantity.toString(),
          item.unit,
          `¥${item.unitPrice.toLocaleString()}`,
          `¥${item.totalPrice.toLocaleString()}`
        ]);

        await generator.addProgressiveTable(tableHeaders, tableData, {
          styles: { halign: 'center' },
          columnStyles: {
            0: { halign: 'left', cellWidth: 'auto' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          }
        });

        // 画像がある場合
        if (estimateData.images && estimateData.images.length > 0) {
          await generator.addSection('参考画像', '');
          await generator.addProgressiveImages(estimateData.images, {
            imagesPerRow: 2,
            imageWidth: 80,
            imageHeight: 60
          });
        }

        // 備考
        if (estimateData.notes) {
          await generator.addSection('備考', estimateData.notes);
        }

        return await generator.getBlob();
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        category: ERROR_CATEGORIES.PDF_GENERATION,
        onError: async (error, attempt, maxRetries) => {
          console.warn(`PDF生成試行 ${attempt}/${maxRetries} が失敗:`, error.message);
          
          onProgress?.({
            step: 'retry',
            message: `再試行中... (${attempt}/${maxRetries})`,
            percentage: 0,
            error: error.message
          });

          // エラーの詳細ログ
          await handlePdfError(error, {
            component: 'EstimatePDFGenerator',
            function: 'generateEstimateWithErrorHandling',
            additionalData: {
              estimateNumber: estimateData.estimateNumber,
              itemCount: estimateData.items?.length || 0,
              imageCount: estimateData.images?.length || 0,
              attempt,
              maxRetries
            }
          });
        }
      }
    );

    console.log('PDF生成成功:', {
      size: pdfBlob.size,
      type: pdfBlob.type,
      estimateNumber: estimateData.estimateNumber
    });

    return pdfBlob;

  } catch (error) {
    // 最終的なエラーハンドリング
    await handlePdfError(error, {
      component: 'EstimatePDFGenerator',
      function: 'generateEstimateWithErrorHandling',
      level: ERROR_LEVELS.CRITICAL,
      additionalData: {
        estimateNumber: estimateData.estimateNumber,
        itemCount: estimateData.items?.length || 0,
        imageCount: estimateData.images?.length || 0,
        finalFailure: true
      }
    });

    // ユーザーフレンドリーなエラーメッセージ
    const userMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userMessage);
  }
};

/**
 * 大容量請求書PDF生成（メモリ監視付き）
 */
export const generateLargeInvoicePDF = async (invoiceData, onProgress) => {
  const startTime = Date.now();
  let memoryBefore = null;

  try {
    // メモリ使用量を記録
    if (performance.memory) {
      memoryBefore = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    const generator = new ProgressivePDFGenerator({
      orientation: 'portrait',
      format: 'a4',
      margin: 15,
      memoryThreshold: 80, // 80MB制限
      chunkSize: 50, // 小さなチャンクサイズ
      onProgress: (progress) => {
        onProgress?.({
          ...progress,
          stage: 'invoice_generation',
          memoryUsed: performance.memory ? 
            Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : null
        });
      }
    });

    // 大量データを段階的に処理
    await generator.addHeader(
      '請求書',
      `請求書番号: ${invoiceData.invoiceNumber}`
    );

    // 顧客情報
    await generator.addSection('請求先情報', invoiceData.customerInfo);

    // 大量の請求項目を分割処理
    const itemChunks = chunkArray(invoiceData.items, 50);
    
    for (let i = 0; i < itemChunks.length; i++) {
      const chunk = itemChunks[i];
      const isFirstChunk = i === 0;
      
      const headers = isFirstChunk ? ['項目', '数量', '単価', '金額'] : [];
      const tableData = chunk.map(item => [
        item.description,
        item.quantity.toString(),
        `¥${item.unitPrice.toLocaleString()}`,
        `¥${item.totalAmount.toLocaleString()}`
      ]);

      await generator.addProgressiveTable(headers, tableData);

      // メモリ使用量をチェック
      if (performance.memory) {
        const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
        if (currentMemory > 120) { // 120MB制限
          console.warn(`メモリ使用量が高い: ${currentMemory.toFixed(2)}MB`);
          
          // 強制的にガベージコレクションを促す
          if (global.gc) {
            global.gc();
          }
          
          // 少し待機
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    const pdfBlob = await generator.getBlob();
    
    // パフォーマンス統計
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const memoryAfter = performance.memory ? 
      performance.memory.usedJSHeapSize / 1024 / 1024 : null;

    console.log('大容量PDF生成完了:', {
      processingTime: `${processingTime}ms`,
      fileSize: `${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`,
      itemCount: invoiceData.items.length,
      memoryUsage: memoryBefore && memoryAfter ? 
        `${memoryBefore.toFixed(2)}MB → ${memoryAfter.toFixed(2)}MB` : 'N/A'
    });

    return pdfBlob;

  } catch (error) {
    // 詳細なエラーログ
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      invoiceNumber: invoiceData.invoiceNumber,
      itemCount: invoiceData.items?.length || 0,
      processingTime: Date.now() - startTime,
      memoryBefore: memoryBefore ? `${memoryBefore.toFixed(2)}MB` : 'N/A',
      memoryAfter: performance.memory ? 
        `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    };

    console.error('大容量PDF生成エラー:', errorInfo);

    await handlePdfError(error, {
      component: 'LargeInvoicePDFGenerator',
      function: 'generateLargeInvoicePDF',
      level: ERROR_LEVELS.ERROR,
      additionalData: errorInfo
    });

    throw error;
  }
};

/**
 * 配列をチャンクに分割
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
function getUserFriendlyErrorMessage(error) {
  if (error.message.includes('memory')) {
    return 'メモリ不足のため、PDF生成に失敗しました。データサイズを小さくするか、ブラウザを再起動してください。';
  }
  
  if (error.message.includes('network')) {
    return 'ネットワークエラーのため、PDF生成に失敗しました。インターネット接続を確認してください。';
  }
  
  if (error.message.includes('permission')) {
    return '権限エラーのため、PDF生成に失敗しました。管理者にお問い合わせください。';
  }
  
  if (error.message.includes('timeout')) {
    return 'タイムアウトのため、PDF生成に失敗しました。データ量が多い場合は時間をおいて再試行してください。';
  }
  
  return 'PDF生成中に予期しないエラーが発生しました。しばらく待ってから再試行してください。';
}

/**
 * バッチPDF生成（複数ファイル同時処理）
 */
export const generateBatchPDFs = async (dataArray, options = {}) => {
  const results = [];
  const errors = [];
  const startTime = Date.now();

  const {
    batchSize = 3,
    onProgress = null,
    onBatchComplete = null
  } = options;

  try {
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (data, index) => {
        const globalIndex = i + index;
        
        try {
          const pdf = await generateEstimateWithErrorHandling(data, (progress) => {
            onProgress?.({
              ...progress,
              fileIndex: globalIndex,
              fileName: data.estimateNumber,
              totalFiles: dataArray.length
            });
          });
          
          return {
            success: true,
            index: globalIndex,
            fileName: data.estimateNumber,
            pdf,
            size: pdf.size
          };
          
        } catch (error) {
          await handlePdfError(error, {
            component: 'BatchPDFGenerator',
            function: 'generateBatchPDFs',
            additionalData: {
              batchIndex: Math.floor(i / batchSize),
              fileIndex: globalIndex,
              fileName: data.estimateNumber
            }
          });
          
          return {
            success: false,
            index: globalIndex,
            fileName: data.estimateNumber,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const successCount = batchResults.filter(r => r.success).length;
      const errorCount = batchResults.filter(r => !r.success).length;
      
      if (onBatchComplete) {
        onBatchComplete({
          batchIndex: Math.floor(i / batchSize),
          successCount,
          errorCount,
          totalProcessed: i + batch.length,
          totalFiles: dataArray.length
        });
      }

      // バッチ間で少し待機（メモリとCPU負荷軽減）
      if (i + batchSize < dataArray.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const summary = {
      totalFiles: dataArray.length,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      processingTime: Date.now() - startTime,
      totalSize: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.size, 0)
    };

    console.log('バッチPDF生成完了:', summary);

    return {
      results,
      summary,
      errors: results.filter(r => !r.success)
    };

  } catch (error) {
    await handlePdfError(error, {
      component: 'BatchPDFGenerator',
      function: 'generateBatchPDFs',
      level: ERROR_LEVELS.CRITICAL,
      additionalData: {
        totalFiles: dataArray.length,
        processedFiles: results.length,
        processingTime: Date.now() - startTime
      }
    });

    throw error;
  }
};