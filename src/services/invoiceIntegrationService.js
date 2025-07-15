/**
 * Garden 造園業向け統合業務管理システム
 * 見積書・請求書連携サービス
 * Worker1 (見積書) ⇔ Worker3 (請求書) フロントエンド統合
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class InvoiceIntegrationService {
  /**
   * 見積書から請求書データ生成
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} 請求書データ
   */
  async createInvoiceFromEstimate(estimateId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/estimates/${estimateId}/create-invoice`
      );

      return {
        success: true,
        data: response.data,
        message: '請求書データが正常に生成されました',
      };
    } catch (error) {
      console.error('請求書生成エラー:', error);

      let errorMessage = '請求書生成中にエラーが発生しました。';
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      }

      return {
        success: false,
        error: errorMessage,
        details: error.response?.data,
      };
    }
  }

  /**
   * 見積書から請求書生成プレビュー
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} プレビューデータ
   */
  async previewInvoiceFromEstimate(estimateId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/estimates/${estimateId}/invoice-preview`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('請求書プレビューエラー:', error);

      return {
        success: false,
        error: '請求書プレビューの取得に失敗しました。',
        details: error.response?.data,
      };
    }
  }

  /**
   * 見積書・請求書データ統合表示用
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} 統合データ
   */
  async getIntegratedEstimateInvoiceData(estimateId) {
    try {
      // 見積書データ取得
      const estimateResponse = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}`);

      // 請求書プレビューデータ取得
      const invoicePreview = await this.previewInvoiceFromEstimate(estimateId);

      // PDF生成可能性チェック
      const estimatePdfCheck = await axios.get(
        `${API_BASE_URL}/api/estimates/${estimateId}/preview`
      );

      return {
        success: true,
        estimate: estimateResponse.data,
        invoice_preview: invoicePreview.success ? invoicePreview.data : null,
        pdf_preview: estimatePdfCheck.data,
        integration_status: {
          estimate_valid: Boolean(estimateResponse.data),
          invoice_generable: invoicePreview.success,
          pdf_generable: Boolean(estimatePdfCheck.data),
        },
      };
    } catch (error) {
      console.error('統合データ取得エラー:', error);

      return {
        success: false,
        error: '統合データの取得に失敗しました。',
        details: error.response?.data,
      };
    }
  }

  /**
   * 造園業界標準PDF統合生成テスト
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} テスト結果
   */
  async testIntegratedPDFGeneration(estimateId) {
    try {
      const results = {};

      // 1. 見積書PDF生成テスト
      try {
        const estimatePdfResponse = await axios.get(
          `${API_BASE_URL}/api/estimates/${estimateId}/pdf`,
          { responseType: 'blob', timeout: 15000 }
        );

        results.estimate_pdf = {
          success: true,
          size: estimatePdfResponse.data.size,
          type: estimatePdfResponse.headers['content-type'],
        };
      } catch (error) {
        results.estimate_pdf = {
          success: false,
          error: error.message,
        };
      }

      // 2. 請求書データ生成テスト
      const invoiceData = await this.createInvoiceFromEstimate(estimateId);
      results.invoice_data = invoiceData;

      // 3. 統合テスト結果
      const overall_success = results.estimate_pdf.success && invoiceData.success;

      return {
        success: overall_success,
        results,
        summary: {
          estimate_pdf_ok: results.estimate_pdf.success,
          invoice_data_ok: invoiceData.success,
          integration_complete: overall_success,
          tested_at: new Date().toISOString(),
        },
        message: overall_success
          ? '見積書・請求書システム統合テスト成功'
          : '統合テストで一部エラーが発生しました',
      };
    } catch (error) {
      console.error('統合テストエラー:', error);

      return {
        success: false,
        error: '統合テスト中にエラーが発生しました。',
        details: error.message,
      };
    }
  }

  /**
   * 造園業界標準フォーマット検証
   * @param {Object} estimateData - 見積データ
   * @param {Object} invoiceData - 請求書データ
   * @returns {Object} 検証結果
   */
  validateIndustryStandardFormat(estimateData, invoiceData) {
    const validations = {
      estimate: {},
      invoice: {},
      integration: {},
    };

    // 見積書検証
    validations.estimate = {
      has_company_info: Boolean(estimateData.company && estimateData.company.company_name),
      has_customer_info: Boolean(estimateData.customer && estimateData.customer.customer_name),
      has_estimate_number: Boolean(estimateData.estimate_number),
      has_items: estimateData.items && estimateData.items.length > 0,
      has_amounts: estimateData.total_amount > 0,
    };

    // 請求書検証（データが存在する場合）
    if (invoiceData && invoiceData.invoice_data) {
      const invoice = invoiceData.invoice_data;
      validations.invoice = {
        has_invoice_number: Boolean(invoice.invoice_number),
        has_payment_terms: Boolean(invoice.payment_terms && invoice.payment_terms.bank_info),
        has_tax_calculation: Boolean(invoice.amounts && invoice.amounts.tax_amount),
        has_industry_notes: invoice.notes && invoice.notes.length > 0,
        proper_conversion: invoice.estimate_id === estimateData.estimate_id,
      };
    }

    // 統合検証
    validations.integration = {
      data_consistency: estimateData.estimate_id === invoiceData?.invoice_data?.estimate_id,
      amount_matching:
        estimateData.total_amount === invoiceData?.invoice_data?.amounts?.total_amount,
      customer_matching:
        estimateData.customer?.customer_name === invoiceData?.invoice_data?.customer?.customer_name,
    };

    // 総合評価
    const estimate_score = Object.values(validations.estimate).filter(Boolean).length;
    const invoice_score = invoiceData
      ? Object.values(validations.invoice).filter(Boolean).length
      : 0;
    const integration_score = Object.values(validations.integration).filter(Boolean).length;

    const total_possible =
      Object.keys(validations.estimate).length +
      (invoiceData ? Object.keys(validations.invoice).length : 0) +
      Object.keys(validations.integration).length;
    const total_passed = estimate_score + invoice_score + integration_score;

    return {
      validations,
      scores: {
        estimate: estimate_score,
        invoice: invoice_score,
        integration: integration_score,
        total: total_passed,
        possible: total_possible,
        percentage: Math.round((total_passed / total_possible) * 100),
      },
      industry_standard_compliance: total_passed >= total_possible * 0.8, // 80%以上で合格
    };
  }

  /**
   * 連携機能使用ガイド生成
   * @returns {Array} 使用手順
   */
  getIntegrationGuide() {
    return [
      {
        step: 1,
        title: '見積書作成・完成',
        description:
          '造園業界標準に準拠した見積書を作成し、顧客情報・明細・金額を正確に入力します。',
        actions: ['顧客情報入力', '工事明細追加', '金額確認', '見積PDF出力テスト'],
      },
      {
        step: 2,
        title: '見積承認・契約',
        description: '顧客から見積承認を得て、ステータスを「承認」または「契約済」に変更します。',
        actions: ['ステータス更新', '契約日設定', '工事開始準備'],
      },
      {
        step: 3,
        title: '工事完了・請求書生成',
        description: '工事完了後、見積書から自動的に請求書データを生成します。',
        actions: ['工事完了報告', '請求書データ生成', '内容確認', '請求書PDF出力'],
      },
      {
        step: 4,
        title: '請求・入金管理',
        description: '生成した請求書を顧客に送付し、入金管理を行います。',
        actions: ['請求書送付', '入金確認', 'ステータス更新', 'アフターサービス'],
      },
    ];
  }
}

// シングルトンインスタンス
const invoiceIntegrationService = new InvoiceIntegrationService();

export default invoiceIntegrationService;
