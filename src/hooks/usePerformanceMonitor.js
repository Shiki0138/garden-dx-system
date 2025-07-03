/**
 * パフォーマンス監視カスタムフック
 * レンダリング時間・再レンダリング回数・メモリ使用量を測定
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * パフォーマンス監視フック
 * @param {string} componentName - コンポーネント名
 * @param {boolean} enabled - 監視有効/無効（開発環境のみ推奨）
 * @returns {Object} パフォーマンス情報とユーティリティ関数
 */
export const usePerformanceMonitor = (componentName = 'Unknown', enabled = process.env.NODE_ENV === 'development') => {
  const renderCountRef = useRef(0);
  const renderTimeRef = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const [performanceData, setPerformanceData] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderDuration: 0,
    memoryUsage: 0
  });

  // レンダリング開始時間記録
  const startTime = useRef(performance.now());

  // レンダリング回数とパフォーマンス測定
  useEffect(() => {
    if (!enabled) return;

    const endTime = performance.now();
    const renderDuration = endTime - startTime.current;
    
    renderCountRef.current += 1;
    renderTimeRef.current += renderDuration;
    
    // メモリ使用量取得（Chrome等でサポート）
    const memoryInfo = performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
    } : null;

    setPerformanceData({
      renderCount: renderCountRef.current,
      averageRenderTime: Math.round(renderTimeRef.current / renderCountRef.current * 100) / 100,
      lastRenderDuration: Math.round(renderDuration * 100) / 100,
      memoryUsage: memoryInfo ? memoryInfo.used : 0,
      memoryInfo
    });

    // パフォーマンス警告（開発環境）
    if (renderDuration > 16.67) { // 60FPS基準
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderDuration.toFixed(2)}ms`);
    }

    if (renderCountRef.current > 100 && renderCountRef.current % 50 === 0) {
      console.info(`📊 ${componentName} Performance Stats:`, {
        renders: renderCountRef.current,
        avgTime: `${Math.round(renderTimeRef.current / renderCountRef.current * 100) / 100 }ms`,
        memory: memoryInfo ? `${memoryInfo.used}MB / ${memoryInfo.total}MB` : 'N/A'
      });
    }

    lastRenderTime.current = endTime;
  });

  // パフォーマンスデータリセット
  const resetPerformanceData = useCallback(() => {
    renderCountRef.current = 0;
    renderTimeRef.current = 0;
    setPerformanceData({
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderDuration: 0,
      memoryUsage: 0
    });
  }, []);

  // パフォーマンス情報出力
  const logPerformanceReport = useCallback(() => {
    if (!enabled) return;
    
    console.group(`🔍 Performance Report: ${componentName}`);
    console.log('📈 Render Count:', renderCountRef.current);
    console.log('⏱️ Average Render Time:', `${Math.round(renderTimeRef.current / renderCountRef.current * 100) / 100 }ms`);
    console.log('🔄 Last Render Duration:', `${performanceData.lastRenderDuration }ms`);
    if (performanceData.memoryInfo) {
      console.log('💾 Memory Usage:', `${performanceData.memoryInfo.used}MB / ${performanceData.memoryInfo.total}MB`);
      console.log('📊 Memory Efficiency:', `${Math.round((performanceData.memoryInfo.used / performanceData.memoryInfo.total) * 100)}%`);
    }
    console.groupEnd();
  }, [componentName, enabled, performanceData]);

  // レンダリング時間測定用マーカー
  const markRenderStart = useCallback((label = 'render') => {
    if (!enabled) return;
    performance.mark(`${componentName}-${label}-start`);
  }, [componentName, enabled]);

  const markRenderEnd = useCallback((label = 'render') => {
    if (!enabled) return;
    performance.mark(`${componentName}-${label}-end`);
    performance.measure(`${componentName}-${label}`, `${componentName}-${label}-start`, `${componentName}-${label}-end`);
  }, [componentName, enabled]);

  return {
    performanceData,
    resetPerformanceData,
    logPerformanceReport,
    markRenderStart,
    markRenderEnd,
    enabled
  };
};

/**
 * 関数実行時間測定ユーティリティ
 * @param {Function} fn - 測定対象の関数
 * @param {string} name - 関数名（ログ用）
 * @returns {Function} ラップされた関数
 */
export const measureExecutionTime = (fn, name = 'function') => {
  return async (...args) => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    const duration = end - start;
    
    if (duration > 5) { // 5ms以上の場合警告
      console.warn(`⏱️ ${name} execution time: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  };
};

/**
 * React DevTools Profiler統合
 * @param {string} id - プロファイラーID
 * @param {Function} onRender - レンダリング時のコールバック
 * @returns {Object} Profilerコンポーネント情報
 */
export const useProfiler = (id, onRender) => {
  const onRenderCallback = useCallback((id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    const profilerData = {
      id,
      phase, // "mount" | "update"
      actualDuration: Math.round(actualDuration * 100) / 100,
      baseDuration: Math.round(baseDuration * 100) / 100,
      startTime: Math.round(startTime * 100) / 100,
      commitTime: Math.round(commitTime * 100) / 100,
      efficiency: baseDuration > 0 ? Math.round((actualDuration / baseDuration) * 100) : 100
    };

    // パフォーマンス警告
    if (actualDuration > 16.67) {
      console.warn(`🐌 Slow ${phase} in ${id}: ${actualDuration.toFixed(2)}ms`);
    }

    if (onRender) {
      onRender(profilerData);
    }
  }, [onRender]);

  return {
    id,
    onRender: onRenderCallback
  };
};

export default usePerformanceMonitor;