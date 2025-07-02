import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 認証トークンの設定
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('garden_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const estimateApi = {
  // 見積の取得
  getEstimates: async () => {
    const response = await apiClient.get('/api/estimates');
    return response.data;
  },

  // 見積の作成
  createEstimate: async (estimateData) => {
    const response = await apiClient.post('/api/estimates', estimateData);
    return response.data;
  },

  // 見積の更新
  updateEstimate: async (id, estimateData) => {
    const response = await apiClient.put(`/api/estimates/${id}`, estimateData);
    return response.data;
  },

  // 見積の削除
  deleteEstimate: async (id) => {
    const response = await apiClient.delete(`/api/estimates/${id}`);
    return response.data;
  },

  // 見積アイテムの作成
  createEstimateItem: async (estimateId, itemData) => {
    const response = await apiClient.post(`/api/estimates/${estimateId}/items`, itemData);
    return response.data;
  },

  // 見積アイテムの更新
  updateEstimateItem: async (estimateId, itemId, itemData) => {
    const response = await apiClient.put(`/api/estimates/${estimateId}/items/${itemId}`, itemData);
    return response.data;
  },

  // 見積アイテムの削除
  deleteEstimateItem: async (estimateId, itemId) => {
    const response = await apiClient.delete(`/api/estimates/${estimateId}/items/${itemId}`);
    return response.data;
  },
};

export default apiClient;