/**
 * アナリティクスユーティリティ
 */

/**
 * ユーザーアクションのトラッキング
 * @param {string} action - アクション名
 * @param {Object} data - 追加データ
 */
export const trackUserAction = (action, data = {}) => {
  // 実際のアナリティクスサービスに送信する場合はここに実装
  console.log('[Analytics]', action, data);
  
  // Google Analytics、Mixpanel等を使用する場合の例
  // if (window.gtag) {
  //   window.gtag('event', action, {
  //     event_category: 'User Interaction',
  //     ...data
  //   });
  // }
};

/**
 * エラートラッキング
 * @param {Error} error - エラーオブジェクト
 * @param {Object} context - エラーコンテキスト
 */
export const trackError = (error, context = {}) => {
  console.error('[Error Tracking]', error, context);
  
  // Sentryなどのエラートラッキングサービスに送信
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context
  //   });
  // }
};

/**
 * パフォーマンストラッキング
 * @param {string} metric - メトリクス名
 * @param {number} value - 値
 */
export const trackPerformance = (metric, value) => {
  console.log('[Performance]', metric, value);
  
  // パフォーマンスモニタリングサービスに送信
  // if (window.performance && window.performance.mark) {
  //   window.performance.mark(metric);
  // }
};