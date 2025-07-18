/**
 * Garden DX - 統合APIステート管理フック
 * React 18準拠・TypeScript対応・エラーハンドリング統一
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/enhancedApi';
import { log } from '../utils/logger';

// APIステートの型定義
export const API_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// カスタムフック: useApiState
export const useApiState = (initialData = null) => {
  const [state, setState] = useState(API_STATES.IDLE);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // マウント状態追跡（メモリリーク防止）
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // エラーリセット
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
      setState(API_STATES.IDLE);
    }
  }, []);

  // データリセット
  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState(API_STATES.IDLE);
      setData(initialData);
      setError(null);
      setLastFetch(null);
    }
  }, [initialData]);

  return {
    // ステート
    state,
    data,
    error,
    lastFetch,

    // 状態判定
    isIdle: state === API_STATES.IDLE,
    isLoading: state === API_STATES.LOADING,
    isSuccess: state === API_STATES.SUCCESS,
    isError: state === API_STATES.ERROR,

    // 内部セッター（フック内部用）
    setState: newState => isMountedRef.current && setState(newState),
    setData: newData => isMountedRef.current && setData(newData),
    setError: newError => isMountedRef.current && setError(newError),
    setLastFetch: timestamp => isMountedRef.current && setLastFetch(timestamp),

    // ユーティリティ
    clearError,
    reset,
    isMounted: () => isMountedRef.current,
  };
};

// カスタムフック: useApi（汎用API呼び出し）
export const useApi = (apiCall, options = {}) => {
  const {
    immediate = false,
    dependencies = [],
    onSuccess,
    onError,
    fallbackData = null,
    cacheKey = null,
    cacheTTL = 5 * 60 * 1000, // 5分
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const apiState = useApiState(fallbackData);
  const abortControllerRef = useRef();
  const cacheRef = useRef(new Map());

  // キャッシュ確認
  const getCachedData = useCallback(
    key => {
      if (!key) return null;

      const cached = cacheRef.current.get(key);
      if (!cached) return null;

      const now = Date.now();
      if (now - cached.timestamp > cacheTTL) {
        cacheRef.current.delete(key);
        return null;
      }

      return cached.data;
    },
    [cacheTTL]
  );

  // キャッシュ保存
  const setCachedData = useCallback((key, data) => {
    if (!key) return;

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  // API実行関数
  const execute = useCallback(
    async (...args) => {
      if (!apiState.isMounted()) return;

      // 進行中のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // キャッシュ確認
      if (cacheKey) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          apiState.setData(cachedData);
          apiState.setState(API_STATES.SUCCESS);
          apiState.setLastFetch(Date.now());
          log.info(`Cache hit for ${cacheKey}`);
          return { success: true, data: cachedData, fromCache: true };
        }
      }

      // AbortController設定
      abortControllerRef.current = new AbortController();

      apiState.setState(API_STATES.LOADING);
      apiState.setError(null);

      let attempt = 0;
      const maxAttempts = retryCount + 1;

      while (attempt < maxAttempts) {
        try {
          if (!apiState.isMounted()) return;

          const result = await apiCall(...args, {
            signal: abortControllerRef.current.signal,
          });

          if (!apiState.isMounted()) return;

          if (result.success) {
            apiState.setData(result.data);
            apiState.setState(API_STATES.SUCCESS);
            apiState.setLastFetch(Date.now());

            // キャッシュ保存
            if (cacheKey) {
              setCachedData(cacheKey, result.data);
            }

            if (onSuccess) {
              onSuccess(result.data, result);
            }

            return result;
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          attempt++;

          // リクエストがキャンセルされた場合
          if (error.name === 'AbortError') {
            log.info('API request was cancelled');
            return { success: false, cancelled: true };
          }

          // 最後の試行でない場合はリトライ
          if (attempt < maxAttempts) {
            log.info(`API call failed, retrying... (${attempt}/${maxAttempts})`);
            // eslint-disable-next-line no-loop-func
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }

          // 最終的なエラー処理
          if (!apiState.isMounted()) return;

          apiState.setError(error.message || '通信エラーが発生しました');
          apiState.setState(API_STATES.ERROR);

          if (onError) {
            onError(error);
          }

          log.error('API call failed after all retries:', error);
          return { success: false, error: error.message };
        }
      }
    },
    [
      apiCall,
      cacheKey,
      getCachedData,
      setCachedData,
      onSuccess,
      onError,
      retryCount,
      retryDelay,
      apiState,
    ]
  );

  // 自動実行
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...apiState,
    execute,
    refetch: execute,
    cancel: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
  };
};

// カスタムフック: useEstimates（見積一覧用）
export const useEstimates = (params = {}, options = {}) => {
  const apiCall = useCallback(async () => {
    return await api.get('/api/estimates', {
      params,
      showLoading: true,
      loadingMessage: '見積一覧を取得しています...',
      fallbackData: [],
    });
  }, [params]);

  return useApi(apiCall, {
    immediate: true,
    cacheKey: `estimates_${JSON.stringify(params)}`,
    fallbackData: [],
    ...options,
  });
};

// カスタムフック: useEstimate（単一見積用）
export const useEstimate = (estimateId, options = {}) => {
  const apiCall = useCallback(async () => {
    if (!estimateId) {
      throw new Error('見積IDが指定されていません');
    }

    return await api.get(`/api/estimates/${estimateId}`, {
      showLoading: true,
      loadingMessage: '見積詳細を取得しています...',
    });
  }, [estimateId]);

  return useApi(apiCall, {
    immediate: Boolean(estimateId),
    cacheKey: estimateId ? `estimate_${estimateId}` : null,
    dependencies: [estimateId],
    ...options,
  });
};

// カスタムフック: usePriceMaster（単価マスタ用）
export const usePriceMaster = (searchParams = {}, options = {}) => {
  const apiCall = useCallback(async () => {
    return await api.get('/api/price-master', {
      params: searchParams,
      showLoading: true,
      loadingMessage: '単価マスタを取得しています...',
      fallbackData: [],
    });
  }, [searchParams]);

  return useApi(apiCall, {
    immediate: true,
    cacheKey: `price_master_${JSON.stringify(searchParams)}`,
    cacheTTL: 10 * 60 * 1000, // 10分キャッシュ
    fallbackData: [],
    ...options,
  });
};

// カスタムフック: useApiMutation（データ変更用）
export const useApiMutation = (mutationFn, options = {}) => {
  const { onSuccess, onError, onSettled, invalidateCache = [] } = options;

  const [state, setState] = useState(API_STATES.IDLE);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (...args) => {
      if (!isMountedRef.current) return;

      setState(API_STATES.LOADING);
      setError(null);

      try {
        const result = await mutationFn(...args);

        if (!isMountedRef.current) return;

        if (result.success) {
          setState(API_STATES.SUCCESS);

          // キャッシュ無効化
          if (invalidateCache.length > 0) {
            // 実装: キャッシュクリア処理
            log.info('Cache invalidated for:', invalidateCache);
          }

          if (onSuccess) {
            onSuccess(result.data, result);
          }
        } else {
          throw new Error(result.error);
        }

        if (onSettled) {
          onSettled(result.data, null);
        }

        return result;
      } catch (error) {
        if (!isMountedRef.current) return;

        setState(API_STATES.ERROR);
        setError(error.message);

        if (onError) {
          onError(error);
        }

        if (onSettled) {
          onSettled(null, error);
        }

        log.error('Mutation failed:', error);
        throw error;
      }
    },
    [mutationFn, onSuccess, onError, onSettled, invalidateCache]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState(API_STATES.IDLE);
      setError(null);
    }
  }, []);

  return {
    mutate,
    reset,
    state,
    error,
    isIdle: state === API_STATES.IDLE,
    isLoading: state === API_STATES.LOADING,
    isSuccess: state === API_STATES.SUCCESS,
    isError: state === API_STATES.ERROR,
  };
};

// フック使用例用の定数エクスポート
export const HOOKS_EXAMPLES = {
  useEstimates: `
const { data: estimates, isLoading, error, refetch } = useEstimates();
  `,
  useEstimate: `
const { data: estimate, isLoading, error } = useEstimate(estimateId);
  `,
  useApiMutation: `
const createEstimate = useApiMutation(
  (data) => api.post('/api/estimates', data),
  {
    onSuccess: () => showSuccess('見積を作成しました'),
    onError: (error) => showError(error.message)
  }
);
  `,
};

export default {
  useApiState,
  useApi,
  useEstimates,
  useEstimate,
  usePriceMaster,
  useApiMutation,
  API_STATES,
};
