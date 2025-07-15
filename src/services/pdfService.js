/**
 * Garden 造園業向け統合業務管理システム
 * PDF出力サービス - 造園業界標準準拠
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class PDFService {
  /**
   * 造園業界標準準拠見積書PDF生成・ダウンロード
   * @param {number} estimateId - 見積ID
   * @returns {Promise<void>}
   */
  async downloadEstimatePDF(estimateId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}/pdf`, {
        responseType: 'blob',
        timeout: 30000, // 30秒タイムアウト
      });

      // ファイル名をレスポンスヘッダーから取得
      const contentDisposition = response.headers['content-disposition'];
      let filename = `見積書_${estimateId}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=([^;]+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      // Blobを作成してダウンロード
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // メモリクリーンアップ
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('PDF生成エラー:', error);

      let errorMessage = 'PDF生成中にエラーが発生しました。';

      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = '指定された見積が見つかりません。';
        } else if (error.response.status === 500) {
          errorMessage =
            'サーバー内部でエラーが発生しました。システム管理者にお問い合わせください。';
        } else if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'PDF生成がタイムアウトしました。時間をおいて再度お試しください。';
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 見積書PDFプレビューデータ取得
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} プレビューデータ
   */
  async getEstimatePDFPreview(estimateId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}/preview`);

      return response.data;
    } catch (error) {
      console.error('プレビューデータ取得エラー:', error);
      throw new Error('プレビューデータの取得に失敗しました。');
    }
  }

  /**
   * PDF生成状況の確認
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} 生成可能性チェック結果
   */
  async checkPDFGenerationPossibility(estimateId) {
    try {
      // 見積データの基本的な妥当性をチェック
      const response = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}`);

      const estimate = response.data;
      const issues = [];

      // 基本情報チェック
      if (!estimate.estimate_number) {
        issues.push('見積番号が設定されていません');
      }

      if (!estimate.customer_id) {
        issues.push('顧客情報が設定されていません');
      }

      // 明細チェック
      const itemsResponse = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}/items`);

      const items = itemsResponse.data || [];
      const actualItems = items.filter(item => item.item_type === 'item');

      if (actualItems.length === 0) {
        issues.push('見積明細が登録されていません');
      }

      // 金額チェック
      if (estimate.total_amount <= 0) {
        issues.push('見積金額が0円以下です');
      }

      return {
        canGenerate: issues.length === 0,
        issues,
        itemCount: actualItems.length,
        totalAmount: estimate.total_amount,
      };
    } catch (error) {
      console.error('PDF生成可能性チェックエラー:', error);
      return {
        canGenerate: false,
        issues: ['見積データの取得に失敗しました'],
        itemCount: 0,
        totalAmount: 0,
      };
    }
  }

  /**
   * 複数見積の一括PDF生成（将来実装予定）
   * @param {number[]} estimateIds - 見積ID配列
   * @returns {Promise<void>}
   */
  async downloadMultipleEstimatesPDF(estimateIds) {
    // 現在は単一ずつ処理
    const results = [];

    for (const estimateId of estimateIds) {
      try {
        const result = await this.downloadEstimatePDF(estimateId);
        results.push({ estimateId, success: true, ...result });
      } catch (error) {
        results.push({
          estimateId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * PDF生成進捗表示用のヘルパー
   * @param {Function} onProgress - 進捗コールバック
   * @param {number} estimateId - 見積ID
   * @returns {Promise<void>}
   */
  async downloadEstimatePDFWithProgress(estimateId, onProgress) {
    try {
      onProgress && onProgress({ stage: 'checking', message: '見積データを確認中...' });

      // 生成可能性チェック
      const checkResult = await this.checkPDFGenerationPossibility(estimateId);
      if (!checkResult.canGenerate) {
        throw new Error(`PDF生成できません: ${checkResult.issues.join(', ')}`);
      }

      onProgress && onProgress({ stage: 'generating', message: 'PDF生成中...' });

      // PDF生成・ダウンロード
      const result = await this.downloadEstimatePDF(estimateId);

      onProgress && onProgress({ stage: 'completed', message: 'PDF生成完了' });

      return result;
    } catch (error) {
      onProgress && onProgress({ stage: 'error', message: error.message });
      throw error;
    }
  }
}

// シングルトンインスタンス
const pdfService = new PDFService();

export default pdfService;
