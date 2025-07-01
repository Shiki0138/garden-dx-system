import axios from 'axios';

// API ベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Axios インスタンス作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 認証トークンを自動付与するインターセプター
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスエラーハンドリング
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラーの場合はログイン画面へリダイレクト
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * 請求書API関数群
 */
export const invoiceApi = {
  /**
   * 請求書一覧を取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} - 請求書一覧
   */
  getInvoices: async (params = {}) => {
    try {
      const response = await apiClient.get('/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('請求書一覧取得エラー:', error);
      throw error;
    }
  },

  /**
   * 請求書詳細を取得
   * @param {number} invoiceId - 請求書ID
   * @returns {Promise<Object>} - 請求書詳細
   */
  getInvoice: async (invoiceId) => {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('請求書詳細取得エラー:', error);
      throw error;
    }
  },

  /**
   * 新規請求書を作成
   * @param {Object} invoiceData - 請求書データ
   * @returns {Promise<Object>} - 作成された請求書
   */
  createInvoice: async (invoiceData) => {
    try {
      const response = await apiClient.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('請求書作成エラー:', error);
      throw error;
    }
  },

  /**
   * 請求書を更新
   * @param {number} invoiceId - 請求書ID
   * @param {Object} invoiceData - 更新データ
   * @returns {Promise<Object>} - 更新された請求書
   */
  updateInvoice: async (invoiceId, invoiceData) => {
    try {
      const response = await apiClient.put(`/invoices/${invoiceId}`, invoiceData);
      return response.data;
    } catch (error) {
      console.error('請求書更新エラー:', error);
      throw error;
    }
  },

  /**
   * 請求書を削除
   * @param {number} invoiceId - 請求書ID
   * @returns {Promise<void>}
   */
  deleteInvoice: async (invoiceId) => {
    try {
      await apiClient.delete(`/invoices/${invoiceId}`);
    } catch (error) {
      console.error('請求書削除エラー:', error);
      throw error;
    }
  },

  /**
   * 見積から請求書を自動生成
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} - 生成された請求書
   */
  createInvoiceFromEstimate: async (estimateId) => {
    try {
      const response = await apiClient.post(`/invoices/from-estimate/${estimateId}`);
      return response.data;
    } catch (error) {
      console.error('見積からの請求書生成エラー:', error);
      throw error;
    }
  },

  /**
   * 請求書PDFを生成・ダウンロード
   * @param {number} invoiceId - 請求書ID
   * @returns {Promise<Blob>} - PDFファイル
   */
  downloadInvoicePDF: async (invoiceId) => {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('請求書PDF生成エラー:', error);
      throw error;
    }
  },

  /**
   * 請求書ステータスを更新
   * @param {number} invoiceId - 請求書ID
   * @param {string} status - 新しいステータス
   * @returns {Promise<Object>} - 更新された請求書
   */
  updateInvoiceStatus: async (invoiceId, status) => {
    try {
      const response = await apiClient.patch(`/invoices/${invoiceId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('請求書ステータス更新エラー:', error);
      throw error;
    }
  },

  /**
   * 支払状況を更新
   * @param {number} invoiceId - 請求書ID
   * @param {string} paymentStatus - 支払状況
   * @param {string} paidDate - 支払日（オプション）
   * @returns {Promise<Object>} - 更新された請求書
   */
  updatePaymentStatus: async (invoiceId, paymentStatus, paidDate = null) => {
    try {
      const response = await apiClient.patch(`/invoices/${invoiceId}/payment-status`, {
        payment_status: paymentStatus,
        paid_date: paidDate
      });
      return response.data;
    } catch (error) {
      console.error('支払状況更新エラー:', error);
      throw error;
    }
  }
};

/**
 * 顧客API関数群
 */
export const customerApi = {
  /**
   * 顧客一覧を取得
   * @returns {Promise<Array>} - 顧客一覧
   */
  getCustomers: async () => {
    try {
      const response = await apiClient.get('/customers');
      return response.data;
    } catch (error) {
      console.error('顧客一覧取得エラー:', error);
      throw error;
    }
  }
};

/**
 * プロジェクトAPI関数群
 */
export const projectApi = {
  /**
   * プロジェクト一覧を取得
   * @param {number} customerId - 顧客ID（オプション）
   * @returns {Promise<Array>} - プロジェクト一覧
   */
  getProjects: async (customerId = null) => {
    try {
      const params = customerId ? { customer_id: customerId } : {};
      const response = await apiClient.get('/projects', { params });
      return response.data;
    } catch (error) {
      console.error('プロジェクト一覧取得エラー:', error);
      throw error;
    }
  }
};

/**
 * 見積API関数群
 */
export const estimateApi = {
  /**
   * 見積一覧を取得
   * @param {number} projectId - プロジェクトID（オプション）
   * @returns {Promise<Array>} - 見積一覧
   */
  getEstimates: async (projectId = null) => {
    try {
      const params = projectId ? { project_id: projectId } : {};
      const response = await apiClient.get('/estimates', { params });
      return response.data;
    } catch (error) {
      console.error('見積一覧取得エラー:', error);
      throw error;
    }
  },

  /**
   * 見積詳細を取得
   * @param {number} estimateId - 見積ID
   * @returns {Promise<Object>} - 見積詳細
   */
  getEstimate: async (estimateId) => {
    try {
      const response = await apiClient.get(`/estimates/${estimateId}`);
      return response.data;
    } catch (error) {
      console.error('見積詳細取得エラー:', error);
      throw error;
    }
  }
};

/**
 * 便利な関数群
 */
export const utils = {
  /**
   * APIエラーメッセージを取得
   * @param {Error} error - エラーオブジェクト
   * @returns {string} - エラーメッセージ
   */
  getErrorMessage: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return '不明なエラーが発生しました';
  },

  /**
   * PDFダウンロード処理
   * @param {Blob} blob - PDFファイルBlob
   * @param {string} filename - ファイル名
   */
  downloadPDF: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 日付フォーマット
   * @param {string} dateString - 日付文字列
   * @returns {string} - フォーマットされた日付
   */
  formatDate: (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ja-JP');
  },

  /**
   * 通貨フォーマット
   * @param {number} amount - 金額
   * @returns {string} - フォーマットされた金額
   */
  formatCurrency: (amount) => {
    if (!amount) return '¥0';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  }
};

export default apiClient;