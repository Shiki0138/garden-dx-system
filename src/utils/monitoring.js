/**
 * 本番環境監視システム統合
 * Vercel Analytics + エラートラッキング + パフォーマンス監視
 */

// Web Vitals監視
export const initWebVitals = () => {
  if (process.env.REACT_APP_ENVIRONMENT === 'production') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Core Web Vitals収集
      getCLS(sendToAnalytics);
      getFID(sendToAnalytics);
      getFCP(sendToAnalytics);
      getLCP(sendToAnalytics);
      getTTFB(sendToAnalytics);
    });
  }
};

// パフォーマンスデータ送信
const sendToAnalytics = (metric) => {
  // Vercel Analyticsに送信
  if (window.va) {
    window.va('track', metric.name, {
      value: Math.round(metric.value),
      delta: Math.round(metric.delta),
      id: metric.id,
    });
  }

  // Console logging（開発用）
  if (process.env.REACT_APP_ENVIRONMENT === 'development') {
    console.log('[Performance]', metric);
  }
};

// エラートラッキング
export const trackError = (error, errorInfo = {}) => {
  if (process.env.REACT_APP_ERROR_REPORTING === 'true') {
    // エラー情報をVercel Analyticsに送信
    if (window.va) {
      window.va('track', 'Error', {
        error: error.message || error,
        stack: error.stack,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }

    // Console logging
    console.error('[Error Tracking]', error, errorInfo);
  }
};

// カスタムイベント追跡
export const trackEvent = (eventName, properties = {}) => {
  if (process.env.REACT_APP_ANALYTICS_ENABLED === 'true') {
    if (window.va) {
      window.va('track', eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
      });
    }
  }
};

// ページビュー追跡
export const trackPageView = (page) => {
  if (process.env.REACT_APP_ANALYTICS_ENABLED === 'true') {
    if (window.va) {
      window.va('track', 'PageView', {
        page,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
      });
    }
  }
};

// リアルタイム監視データ
export const monitoringData = {
  // システム状態
  getSystemStatus: () => ({
    online: navigator.onLine,
    connection: navigator.connection?.effectiveType || 'unknown',
    memory: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    } : null,
    timestamp: new Date().toISOString(),
  }),

  // パフォーマンス情報
  getPerformanceInfo: () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return navigation ? {
      loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
      firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
      firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
    } : null;
  },
};

// 監視システム初期化
export const initMonitoring = () => {
  // Web Vitals初期化
  initWebVitals();

  // ページ離脱時のデータ送信
  window.addEventListener('beforeunload', () => {
    const systemStatus = monitoringData.getSystemStatus();
    const performanceInfo = monitoringData.getPerformanceInfo();
    
    trackEvent('SessionEnd', {
      systemStatus,
      performanceInfo,
      sessionDuration: Date.now() - (window.sessionStart || Date.now()),
    });
  });

  // セッション開始時刻記録
  window.sessionStart = Date.now();

  // 初期ページビュー追跡
  trackPageView(window.location.pathname);

  console.log('[Monitoring] 本番環境監視システムが初期化されました');
};

export default {
  initMonitoring,
  trackError,
  trackEvent,
  trackPageView,
  monitoringData,
};