/**
 * セキュアなAPIクライアント
 * CSRF対策、認証トークン管理、エラーハンドリングを統合
 */

import axios from 'axios';
import { csrfProtection } from './securityUtils';

// APIクライアントインスタンス作成
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Cookie送信を有効化
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // 認証トークンの追加
    const token = sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRFトークンの追加
    const csrfToken = csrfProtection.sessionToken.get();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // セキュリティヘッダーの追加
    config.headers['X-Requested-With'] = 'XMLHttpRequest';

    // リクエストログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    // レスポンスログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        status: response.status,
        data: response.data
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized - トークン期限切れ
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // トークンリフレッシュ試行
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', {
            refreshToken
          });

          const { accessToken } = response.data;
          sessionStorage.setItem('authToken', accessToken);

          // リクエスト再試行
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // リフレッシュ失敗 - ログアウト処理
        console.error('Token refresh failed:', refreshError);
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }

    // 403 Forbidden - CSRF検証失敗
    if (error.response?.status === 403 && error.response?.data?.error === 'Invalid CSRF token') {
      console.error('CSRF token validation failed');
      // 新しいCSRFトークンを取得して再試行
      try {
        const newToken = csrfProtection.generateToken();
        csrfProtection.sessionToken.set(newToken);
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return apiClient(originalRequest);
      } catch (csrfError) {
        console.error('CSRF token regeneration failed:', csrfError);
      }
    }

    // その他のエラー
    const errorMessage = error.response?.data?.message || error.message || 'ネットワークエラーが発生しました';
    console.error('API Error:', errorMessage);

    return Promise.reject(new Error(errorMessage));
  }
);

// セキュアなAPI呼び出しメソッド
export const secureApi = {
  /**
   * GETリクエスト
   * @param {string} url - エンドポイントURL
   * @param {object} params - クエリパラメータ
   */
  get: async (url, params = {}) => {
    const response = await apiClient.get(url, { params });
    return response.data;
  },

  /**
   * POSTリクエスト
   * @param {string} url - エンドポイントURL
   * @param {object} data - 送信データ
   */
  post: async (url, data = {}) => {
    const response = await apiClient.post(url, data);
    return response.data;
  },

  /**
   * PUTリクエスト
   * @param {string} url - エンドポイントURL
   * @param {object} data - 更新データ
   */
  put: async (url, data = {}) => {
    const response = await apiClient.put(url, data);
    return response.data;
  },

  /**
   * DELETEリクエスト
   * @param {string} url - エンドポイントURL
   */
  delete: async (url) => {
    const response = await apiClient.delete(url);
    return response.data;
  },

  /**
   * ファイルアップロード
   * @param {string} url - エンドポイントURL
   * @param {FormData} formData - アップロードデータ
   * @param {function} onProgress - 進捗コールバック
   */
  upload: async (url, formData, onProgress) => {
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
};

export default apiClient;