/**
 * パフォーマンス最適化ユーティリティ
 */

/**
 * デバウンス関数
 * @param {Function} func - デバウンスする関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * スロットル関数
 * @param {Function} func - スロットルする関数
 * @param {number} limit - 実行間隔（ミリ秒）
 * @returns {Function} スロットルされた関数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * パフォーマンス測定
 * @param {string} name - 測定名
 * @param {Function} func - 測定する関数
 */
export const measurePerformance = async (name, func) => {
  const startTime = performance.now();
  try {
    const result = await func();
    const endTime = performance.now();
    console.log(`${name}: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const endTime = performance.now();
    console.error(`${name} failed: ${(endTime - startTime).toFixed(2)}ms`, error);
    throw error;
  }
};