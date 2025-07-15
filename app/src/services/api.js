import axios from 'axios';
import { showError, showWarning } from '../utils/notifications';
import { log } from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒タイムアウト
  headers: {
    'Content-Type': 'application/json',
  },
});

// 認証トークンの設定
apiClient.interceptors.request.use(
  config => {
    try {
      const token = localStorage.getItem('garden_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      log.warn('Failed to get auth token from localStorage:', error);
    }
    return config;
  },
  error => {
    log.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング強化）
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    const { response, request, message } = error;

    // レスポンスエラーの場合
    if (response) {
      const { status, data } = response;

      switch (status) {
        case 400:
          showError(data?.message || '入力内容に誤りがあります。確認してください。');
          break;
        case 401:
          showError('認証に失敗しました。ログインし直してください。');
          // 認証エラーの場合、ログイン画面へリダイレクト
          if (typeof window !== 'undefined') {
            localStorage.removeItem('garden_auth_token');
            window.location.href = '/login';
          }
          break;
        case 403:
          showError('この操作を実行する権限がありません。');
          break;
        case 404:
          showError('要求されたリソースが見つかりません。');
          break;
        case 422:
          showError(data?.message || 'データの検証に失敗しました。入力内容を確認してください。');
          break;
        case 429:
          showWarning('リクエストが多すぎます。しばらく時間をおいてから再度お試しください。');
          break;
        case 500:
          showError('サーバーエラーが発生しました。管理者にお問い合わせください。');
          break;
        case 502:
        case 503:
        case 504:
          showError(
            'サービスが一時的に利用できません。しばらく時間をおいてから再度お試しください。'
          );
          break;
        default:
          showError(data?.message || `予期しないエラーが発生しました（エラーコード: ${status}）`);
      }

      log.error('API Error Response:', {
        status,
        url: response.config?.url,
        method: response.config?.method,
        data,
      });
    }
    // ネットワークエラーまたはタイムアウトの場合
    else if (request) {
      if (message.includes('timeout')) {
        showError('リクエストがタイムアウトしました。インターネット接続を確認してください。');
      } else {
        showError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      }

      log.error('Network Error:', {
        message,
        url: request.responseURL || 'unknown',
        readyState: request.readyState,
      });
    }
    // その他のエラー
    else {
      showError('予期しないエラーが発生しました。');
      log.error('Unknown Error:', message);
    }

    return Promise.reject(error);
  }
);

// エラーハンドリング用のラッパー関数
const apiWrapper = async (apiCall, fallbackData = null) => {
  try {
    const response = await apiCall();
    return {
      success: true,
      data: response.data,
      error: null,
    };
  } catch (error) {
    log.error('API call failed:', error);
    return {
      success: false,
      data: fallbackData,
      error: error.response?.data?.message || error.message || '通信エラーが発生しました',
    };
  }
};

export const estimateApi = {
  // 見積の取得
  getEstimates: async () => {
    return apiWrapper(() => apiClient.get('/api/estimates'), []);
  },

  // 単一見積の取得
  getEstimate: async id => {
    return apiWrapper(() => apiClient.get(`/api/estimates/${id}`));
  },

  // 見積の作成
  createEstimate: async estimateData => {
    if (!estimateData) {
      throw new Error('見積データが指定されていません');
    }
    return apiWrapper(() => apiClient.post('/api/estimates', estimateData));
  },

  // 見積の更新
  updateEstimate: async (id, estimateData) => {
    if (!id || !estimateData) {
      throw new Error('IDまたはデータが指定されていません');
    }
    return apiWrapper(() => apiClient.put(`/api/estimates/${id}`, estimateData));
  },

  // 見積の削除
  deleteEstimate: async id => {
    if (!id) {
      throw new Error('IDが指定されていません');
    }
    return apiWrapper(() => apiClient.delete(`/api/estimates/${id}`));
  },

  // 見積アイテムの取得
  getEstimateItems: async estimateId => {
    if (!estimateId) {
      throw new Error('見積IDが指定されていません');
    }
    return apiWrapper(() => apiClient.get(`/api/estimates/${estimateId}/items`), []);
  },

  // 見積アイテムの追加
  addEstimateItem: async (estimateId, itemData) => {
    if (!estimateId || !itemData) {
      throw new Error('見積IDまたはアイテムデータが指定されていません');
    }
    return apiWrapper(() => apiClient.post(`/api/estimates/${estimateId}/items`, itemData));
  },

  // 見積アイテムの更新
  updateEstimateItem: async (estimateId, itemId, itemData) => {
    if (!estimateId || !itemId || !itemData) {
      throw new Error('必要なパラメータが指定されていません');
    }
    return apiWrapper(() =>
      apiClient.put(`/api/estimates/${estimateId}/items/${itemId}`, itemData)
    );
  },

  // 見積アイテムの削除
  deleteEstimateItem: async (estimateId, itemId) => {
    if (!estimateId || !itemId) {
      throw new Error('見積IDまたはアイテムIDが指定されていません');
    }
    return apiWrapper(() => apiClient.delete(`/api/estimates/${estimateId}/items/${itemId}`));
  },

  // 収益性分析の取得
  getProfitabilityAnalysis: async estimateId => {
    if (!estimateId) {
      throw new Error('見積IDが指定されていません');
    }
    return apiWrapper(() => apiClient.get(`/api/estimates/${estimateId}/profitability`));
  },

  // PDF生成
  generateEstimatePDF: async estimateId => {
    if (!estimateId) {
      throw new Error('見積IDが指定されていません');
    }
    try {
      const response = await apiClient.get(`/api/estimates/${estimateId}/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      log.error('PDF generation failed:', error);
      throw error;
    }
  },

  // 一括操作
  bulkItemsOperation: async (estimateId, operation) => {
    if (!estimateId || !operation) {
      throw new Error('見積IDまたは操作データが指定されていません');
    }
    return apiWrapper(() =>
      apiClient.post(`/api/estimates/${estimateId}/items/bulk`, operation)
    );
  },
};

export default apiClient;
