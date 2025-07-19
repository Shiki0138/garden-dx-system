/**
 * Garden DX - 統合API サービス（React 18 + TypeScript準拠）
 * エラーハンドリング統一・UX向上・パフォーマンス最適化
 */

import axios from 'axios';
import { showError, showWarning, showSuccess, showInfo } from '../utils/notifications';
import { log } from '../utils/logger';

// API設定の統一
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// API設定
const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  maxContentLength: 50 * 1024 * 1024, // 50MB
};

// 統合APIクライアント
class EnhancedApiClient {
  constructor() {
    // FastAPI用クライアント
    this.fastApiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      maxRedirects: 5,
      maxContentLength: API_CONFIG.maxContentLength,
    });

    // Supabase用クライアント（将来の拡張用）
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.supabaseClient = axios.create({
        baseURL: `${SUPABASE_URL}/rest/v1`,
        timeout: API_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    }

    this.setupInterceptors();
    this.requestQueue = new Map();
    this.loadingStates = new Map();
  }

  setupInterceptors() {
    // FastAPI リクエストインターセプター
    this.fastApiClient.interceptors.request.use(
      config => {
        // 認証トークン追加
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // リクエストID生成（重複防止用）
        config.requestId = this.generateRequestId(config);
        
        // 重複リクエスト防止
        if (this.requestQueue.has(config.requestId)) {
          const controller = new AbortController();
          config.signal = controller.signal;
          controller.abort();
          return Promise.reject(new Error('Duplicate request cancelled'));
        }

        this.requestQueue.set(config.requestId, config);
        
        return config;
      },
      error => {
        log.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // FastAPI レスポンスインターセプター
    this.fastApiClient.interceptors.response.use(
      response => {
        // リクエストキューから削除
        if (response.config?.requestId) {
          this.requestQueue.delete(response.config.requestId);
        }

        // 成功メッセージ表示
        if (response.config?.showSuccessMessage) {
          showSuccess(response.config.successMessage || '処理が完了しました');
        }

        return response;
      },
      async error => {
        const { config } = error;
        
        // リクエストキューから削除
        if (config?.requestId) {
          this.requestQueue.delete(config.requestId);
        }

        // リトライ処理
        if (this.shouldRetry(error) && !config._isRetrying) {
          return this.retryRequest(error);
        }

        // エラーハンドリング
        if (!config?.silentError) {
          this.handleApiError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // 認証トークン取得
  getAuthToken() {
    try {
      return localStorage.getItem('garden_auth_token') || 
             localStorage.getItem('supabase.auth.token');
    } catch (error) {
      log.warn('Failed to get auth token:', error);
      return null;
    }
  }

  // リクエストID生成（重複防止用）
  generateRequestId(config) {
    const { method, url, data } = config;
    const dataString = data ? JSON.stringify(data) : '';
    return `${method}_${url}_${btoa(dataString).slice(0, 10)}`;
  }

  // リトライ判定
  shouldRetry(error) {
    const { response, code } = error;
    
    // ネットワークエラーの場合はリトライ
    if (!response) return true;
    
    // 5xx エラー（サーバーエラー）の場合はリトライ
    if (response.status >= 500) return true;
    
    // レート制限の場合はリトライ
    if (response.status === 429) return true;
    
    return false;
  }

  // リトライ処理
  async retryRequest(error) {
    const { config } = error;
    config._isRetrying = true;
    config._retryCount = (config._retryCount || 0) + 1;

    if (config._retryCount <= API_CONFIG.retryAttempts) {
      log.info(`API Request retry ${config._retryCount}/${API_CONFIG.retryAttempts} for ${config.url}`);
      
      // 指数バックオフでリトライ
      const delay = API_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.fastApiClient(config);
    }

    return Promise.reject(error);
  }

  // エラーハンドリング統一
  handleApiError(error) {
    const { response, request, message } = error;

    if (response) {
      const errorMessage = this.getErrorMessage(response.status, response.data);
      
      if (response.status >= 500) {
        showError(errorMessage);
      } else if (response.status === 401) {
        showError(errorMessage);
        this.handleAuthError();
      } else if (response.status === 429) {
        showWarning(errorMessage);
      } else {
        showError(errorMessage);
      }

      log.error('API Error Response:', {
        status: response.status,
        url: response.config?.url,
        method: response.config?.method,
        data: response.data,
        timestamp: new Date().toISOString()
      });
    } else if (request) {
      const networkErrorMessage = this.getNetworkErrorMessage(message);
      showError(networkErrorMessage);

      log.error('Network Error:', {
        message,
        url: request.responseURL || 'unknown',
        readyState: request.readyState,
        timestamp: new Date().toISOString()
      });
    } else {
      showError('予期しないエラーが発生しました。');
      log.error('Unknown Error:', message);
    }
  }

  // エラーメッセージ統一
  getErrorMessage(status, data) {
    const defaultMessages = {
      400: '入力内容に誤りがあります。確認してください。',
      401: '認証に失敗しました。ログインし直してください。',
      403: 'この操作を実行する権限がありません。',
      404: '要求されたリソースが見つかりません。',
      422: 'データの検証に失敗しました。入力内容を確認してください。',
      429: 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください。',
      500: 'サーバーエラーが発生しました。管理者にお問い合わせください。',
      502: 'サービスが一時的に利用できません。しばらく時間をおいてから再度お試しください。',
      503: 'サービスが一時的に利用できません。しばらく時間をおいてから再度お試しください。',
      504: 'サービスが一時的に利用できません。しばらく時間をおいてから再度お試しください。'
    };
    
    return data?.message || data?.detail || defaultMessages[status] || 
           `予期しないエラーが発生しました（エラーコード: ${status}）`;
  }

  // ネットワークエラーメッセージ統一
  getNetworkErrorMessage(message) {
    if (message.includes('timeout')) {
      return 'リクエストがタイムアウトしました。インターネット接続を確認してください。';
    } else if (message.includes('Network Error')) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    } else {
      return 'ネットワークに問題があります。インターネット接続を確認してください。';
    }
  }

  // 認証エラー処理
  handleAuthError() {
    try {
      localStorage.removeItem('garden_auth_token');
      localStorage.removeItem('supabase.auth.token');
      
      // カスタムイベント発火（React ルーターと連携）
      window.dispatchEvent(new CustomEvent('auth-error', {
        detail: { message: 'Authentication failed', timestamp: Date.now() }
      }));
    } catch (error) {
      log.error('Auth error handling failed:', error);
    }
  }

  // ローディング状態管理
  setLoading(key, isLoading, message = '') {
    if (isLoading) {
      this.loadingStates.set(key, { message, startTime: Date.now() });
      showInfo(`${message || '処理中...'}`, 1000);
    } else {
      const loadingState = this.loadingStates.get(key);
      if (loadingState) {
        const duration = Date.now() - loadingState.startTime;
        log.info(`Operation '${key}' completed in ${duration}ms`);
        this.loadingStates.delete(key);
      }
    }
  }

  // 統合API呼び出しラッパー
  async callApi(apiCall, options = {}) {
    const {
      fallbackData = null,
      showLoading = false,
      loadingMessage = '処理中...',
      showSuccessMessage = false,
      successMessage = '処理が完了しました',
      silentError = false,
      useSupabase = false
    } = options;

    const loadingKey = `api_${Date.now()}`;

    try {
      // ローディング開始
      if (showLoading) {
        this.setLoading(loadingKey, true, loadingMessage);
      }

      // API呼び出し実行
      const client = useSupabase ? this.supabaseClient : this.fastApiClient;
      const response = await apiCall(client);

      // ローディング終了
      if (showLoading) {
        this.setLoading(loadingKey, false);
      }

      // 成功メッセージ表示
      if (showSuccessMessage) {
        showSuccess(successMessage);
      }

      return {
        success: true,
        data: response.data,
        error: null,
        response
      };

    } catch (error) {
      // ローディング終了
      if (showLoading) {
        this.setLoading(loadingKey, false);
      }

      log.error('API call failed:', {
        error: error.message,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        data: fallbackData,
        error: error.response?.data?.message || error.response?.data?.detail || 
               error.message || '通信エラーが発生しました',
        statusCode: error.response?.status,
        response: error.response
      };
    }
  }

  // 一括リクエストキャンセル
  cancelAllRequests() {
    const count = this.requestQueue.size;
    this.requestQueue.clear();
    log.info(`Cancelled ${count} pending requests`);
  }

  // 統計情報取得
  getStats() {
    return {
      pendingRequests: this.requestQueue.size,
      activeLoadings: this.loadingStates.size,
      loadingStates: Array.from(this.loadingStates.entries())
    };
  }
}

// グローバルインスタンス
const enhancedApiClient = new EnhancedApiClient();

// エクスポート用API
export const api = {
  // 基本メソッド
  get: (url, options = {}) => enhancedApiClient.callApi(
    client => client.get(url), options
  ),
  
  post: (url, data, options = {}) => enhancedApiClient.callApi(
    client => client.post(url, data), options
  ),
  
  put: (url, data, options = {}) => enhancedApiClient.callApi(
    client => client.put(url, data), options
  ),
  
  delete: (url, options = {}) => enhancedApiClient.callApi(
    client => client.delete(url), options
  ),
  
  patch: (url, data, options = {}) => enhancedApiClient.callApi(
    client => client.patch(url, data), options
  ),

  // ファイルアップロード
  upload: (url, formData, options = {}) => enhancedApiClient.callApi(
    client => client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2分
      ...options
    }), 
    { showLoading: true, loadingMessage: 'アップロード中...', ...options }
  ),

  // ファイルダウンロード
  download: (url, options = {}) => enhancedApiClient.callApi(
    client => client.get(url, { 
      responseType: 'blob',
      timeout: 120000, // 2分
      ...options 
    }),
    { showLoading: true, loadingMessage: 'ダウンロード中...', ...options }
  ),

  // ユーティリティ
  cancelAll: () => enhancedApiClient.cancelAllRequests(),
  getStats: () => enhancedApiClient.getStats(),
  client: enhancedApiClient
};

// 特化API群
export const estimateApi = {
  getList: (params = {}) => api.get('/api/estimates', {
    showLoading: true,
    loadingMessage: '見積一覧を取得しています...',
    fallbackData: []
  }),

  getById: (id) => api.get(`/api/estimates/${id}`, {
    showLoading: true,
    loadingMessage: '見積詳細を取得しています...'
  }),

  create: (data) => api.post('/api/estimates', data, {
    showLoading: true,
    loadingMessage: '見積を作成しています...',
    showSuccessMessage: true,
    successMessage: '見積を正常に作成しました'
  }),

  update: (id, data) => api.put(`/api/estimates/${id}`, data, {
    showLoading: true,
    loadingMessage: '見積を更新しています...',
    showSuccessMessage: true,
    successMessage: '見積を正常に更新しました'
  }),

  delete: (id) => api.delete(`/api/estimates/${id}`, {
    showLoading: true,
    loadingMessage: '見積を削除しています...',
    showSuccessMessage: true,
    successMessage: '見積を正常に削除しました'
  }),

  generatePDF: (id) => api.download(`/api/estimates/${id}/pdf`, {
    loadingMessage: 'PDF を生成しています...'
  })
};

export const priceMasterApi = {
  getCategories: () => api.get('/api/price-master/categories', {
    fallbackData: {},
    silentError: true
  }),

  getItems: (params = {}) => api.get('/api/price-master', {
    showLoading: true,
    loadingMessage: '単価マスタを取得しています...',
    fallbackData: []
  }),

  create: (data) => api.post('/api/price-master', data, {
    showLoading: true,
    showSuccessMessage: true,
    successMessage: '単価マスタを正常に追加しました'
  })
};

export default api;