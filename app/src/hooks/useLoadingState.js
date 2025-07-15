/**
 * Garden DX - ローディング状態管理フック
 * 統一されたローディングUX・パフォーマンス監視対応
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { showInfo } from '../utils/notifications';
import { log } from '../utils/logger';

// ローディング状態の型定義
export const LOADING_TYPES = {
  API: 'api',
  FILE: 'file', 
  PROCESSING: 'processing',
  NAVIGATION: 'navigation'
};

// グローバルローディング状態管理
class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
    this.listeners = new Set();
  }

  // ローディング状態設定
  setLoading(key, isLoading, meta = {}) {
    const timestamp = Date.now();
    
    if (isLoading) {
      this.loadingStates.set(key, {
        startTime: timestamp,
        type: meta.type || LOADING_TYPES.API,
        message: meta.message || '処理中...',
        progress: meta.progress || 0,
        meta
      });
    } else {
      const loadingState = this.loadingStates.get(key);
      if (loadingState) {
        const duration = timestamp - loadingState.startTime;
        log.info(`Loading completed: ${key} (${duration}ms)`);
        this.loadingStates.delete(key);
      }
    }

    // リスナーに通知
    this.notifyListeners();
  }

  // ローディング状態取得
  getLoading(key) {
    return this.loadingStates.get(key) || null;
  }

  // 全ローディング状態取得
  getAllLoading() {
    return Array.from(this.loadingStates.entries()).map(([key, state]) => ({
      key,
      ...state
    }));
  }

  // アクティブなローディングがあるかチェック
  hasAnyLoading() {
    return this.loadingStates.size > 0;
  }

  // タイプ別ローディング状態取得
  getLoadingByType(type) {
    return this.getAllLoading().filter(loading => loading.type === type);
  }

  // リスナー登録
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // リスナーに通知
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getAllLoading());
      } catch (error) {
        log.error('Loading listener error:', error);
      }
    });
  }

  // 古いローディング状態のクリーンアップ
  cleanup(maxAge = 60000) { // 1分
    const now = Date.now();
    const toDelete = [];

    for (const [key, state] of this.loadingStates) {
      if (now - state.startTime > maxAge) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => {
      log.warn(`Cleaning up stuck loading state: ${key}`);
      this.loadingStates.delete(key);
    });

    if (toDelete.length > 0) {
      this.notifyListeners();
    }
  }

  // 統計情報取得
  getStats() {
    const loadings = this.getAllLoading();
    const now = Date.now();

    return {
      total: loadings.length,
      byType: loadings.reduce((acc, loading) => {
        acc[loading.type] = (acc[loading.type] || 0) + 1;
        return acc;
      }, {}),
      longestRunning: loadings.reduce((max, loading) => {
        const duration = now - loading.startTime;
        return duration > max.duration ? { key: loading.key, duration } : max;
      }, { key: null, duration: 0 }),
      averageDuration: loadings.length > 0 ? 
        loadings.reduce((sum, loading) => sum + (now - loading.startTime), 0) / loadings.length : 0
    };
  }
}

// グローバルインスタンス
const loadingManager = new LoadingManager();

// 定期クリーンアップ
setInterval(() => {
  loadingManager.cleanup();
}, 30000); // 30秒ごと

// カスタムフック: useLoading（個別ローディング状態）
export const useLoading = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const loadingKeyRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // コンポーネントアンマウント時にローディング状態をクリア
      if (loadingKeyRef.current) {
        loadingManager.setLoading(loadingKeyRef.current, false);
      }
    };
  }, []);

  const startLoading = useCallback((options = {}) => {
    if (!isMountedRef.current) return;

    const {
      message: loadingMessage = '処理中...',
      type = LOADING_TYPES.API,
      showNotification = false,
      key = null
    } = options;

    const loadingKey = key || `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    loadingKeyRef.current = loadingKey;

    setIsLoading(true);
    setMessage(loadingMessage);
    setProgress(0);

    // グローバル状態に登録
    loadingManager.setLoading(loadingKey, true, {
      type,
      message: loadingMessage,
      progress: 0
    });

    // 通知表示
    if (showNotification) {
      showInfo(loadingMessage, 2000);
    }

    log.info(`Loading started: ${loadingKey} - ${loadingMessage}`);

    return loadingKey;
  }, []);

  const updateProgress = useCallback((newProgress, newMessage = null) => {
    if (!isMountedRef.current || !loadingKeyRef.current) return;

    setProgress(newProgress);
    
    if (newMessage) {
      setMessage(newMessage);
    }

    // グローバル状態更新
    const currentState = loadingManager.getLoading(loadingKeyRef.current);
    if (currentState) {
      loadingManager.setLoading(loadingKeyRef.current, true, {
        ...currentState.meta,
        progress: newProgress,
        message: newMessage || currentState.message
      });
    }
  }, []);

  const stopLoading = useCallback(() => {
    if (!isMountedRef.current) return;

    setIsLoading(false);
    setMessage('');
    setProgress(0);

    // グローバル状態から削除
    if (loadingKeyRef.current) {
      loadingManager.setLoading(loadingKeyRef.current, false);
      loadingKeyRef.current = null;
    }
  }, []);

  return {
    isLoading,
    message,
    progress,
    startLoading,
    updateProgress,
    stopLoading,
    loadingKey: loadingKeyRef.current
  };
};

// カスタムフック: useGlobalLoading（グローバルローディング状態監視）
export const useGlobalLoading = (filterType = null) => {
  const [loadingStates, setLoadingStates] = useState([]);
  const [hasLoading, setHasLoading] = useState(false);

  useEffect(() => {
    const updateStates = (allStates) => {
      const filteredStates = filterType ? 
        allStates.filter(state => state.type === filterType) : 
        allStates;
      
      setLoadingStates(filteredStates);
      setHasLoading(filteredStates.length > 0);
    };

    // 初期状態設定
    updateStates(loadingManager.getAllLoading());

    // リスナー登録
    const unsubscribe = loadingManager.addListener(updateStates);

    return unsubscribe;
  }, [filterType]);

  const getStats = useCallback(() => {
    return loadingManager.getStats();
  }, []);

  const clearAll = useCallback(() => {
    loadingStates.forEach(state => {
      loadingManager.setLoading(state.key, false);
    });
  }, [loadingStates]);

  return {
    loadingStates,
    hasLoading,
    count: loadingStates.length,
    getStats,
    clearAll
  };
};

// カスタムフック: useApiLoading（API専用ローディング）
export const useApiLoading = () => {
  const loading = useLoading();
  
  const withLoading = useCallback(async (apiCall, options = {}) => {
    const {
      loadingMessage = 'API通信中...',
      showNotification = false,
      onProgress = null
    } = options;

    const loadingKey = loading.startLoading({
      message: loadingMessage,
      type: LOADING_TYPES.API,
      showNotification
    });

    try {
      let result;
      
      if (onProgress && typeof apiCall === 'function') {
        // プログレス監視付きAPI呼び出し
        result = await apiCall((progress) => {
          loading.updateProgress(progress);
        });
      } else {
        result = await apiCall;
      }

      return result;
    } finally {
      loading.stopLoading();
    }
  }, [loading]);

  return {
    ...loading,
    withLoading
  };
};

// カスタムフック: useFileLoading（ファイル処理専用）
export const useFileLoading = () => {
  const loading = useLoading();

  const uploadWithProgress = useCallback(async (uploadFn, file, options = {}) => {
    const {
      onProgress = null,
      showNotification = true
    } = options;

    const loadingKey = loading.startLoading({
      message: `${file.name} をアップロード中...`,
      type: LOADING_TYPES.FILE,
      showNotification
    });

    try {
      const result = await uploadFn(file, (progressEvent) => {
        if (progressEvent.lengthComputable && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          loading.updateProgress(progress, `${file.name} をアップロード中... ${progress}%`);
          onProgress(progress);
        }
      });

      return result;
    } finally {
      loading.stopLoading();
    }
  }, [loading]);

  const downloadWithProgress = useCallback(async (downloadFn, filename, options = {}) => {
    const {
      onProgress = null,
      showNotification = true
    } = options;

    const loadingKey = loading.startLoading({
      message: `${filename} をダウンロード中...`,
      type: LOADING_TYPES.FILE,
      showNotification
    });

    try {
      const result = await downloadFn((progressEvent) => {
        if (progressEvent.lengthComputable && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          loading.updateProgress(progress, `${filename} をダウンロード中... ${progress}%`);
          onProgress(progress);
        }
      });

      return result;
    } finally {
      loading.stopLoading();
    }
  }, [loading]);

  return {
    ...loading,
    uploadWithProgress,
    downloadWithProgress
  };
};

// デバッグ用：ローディング状態可視化コンポーネント用フック
export const useLoadingDebugger = () => {
  const { loadingStates, getStats } = useGlobalLoading();
  
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo({
        states: loadingStates,
        stats: getStats(),
        timestamp: new Date().toISOString()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loadingStates, getStats]);

  return debugInfo;
};

// エクスポート
export {
  loadingManager
  // LOADING_TYPESは既に上部でexportされているため、ここでは削除
};

export default {
  useLoading,
  useGlobalLoading,
  useApiLoading,
  useFileLoading,
  useLoadingDebugger,
  loadingManager,
  LOADING_TYPES
};