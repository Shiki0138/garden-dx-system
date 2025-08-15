/**
 * メモリ使用量監視とガベージコレクション管理ユーティリティ
 */

/**
 * メモリ監視クラス
 */
export class MemoryMonitor {
  constructor(options = {}) {
    this.enabled = !!performance.memory;
    this.thresholds = {
      warning: options.warningThreshold || 50, // MB
      critical: options.criticalThreshold || 100, // MB
      cleanup: options.cleanupThreshold || 80, // MB
    };
    
    this.callbacks = {
      onWarning: options.onWarning || null,
      onCritical: options.onCritical || null,
      onCleanup: options.onCleanup || null,
    };
    
    this.intervalId = null;
    this.monitoringInterval = options.monitoringInterval || 5000; // 5秒
    this.isMonitoring = false;
    
    // 履歴管理
    this.memoryHistory = [];
    this.maxHistoryLength = options.maxHistoryLength || 100;
    
    // ガベージコレクション統計
    this.gcStats = {
      forceCleanupCount: 0,
      lastCleanupTime: null,
      totalMemoryFreed: 0,
    };
    
    // Web Workers対応
    this.supportsWebWorkers = typeof Worker !== 'undefined';
  }
  
  /**
   * 現在のメモリ使用状況を取得
   */
  getCurrentMemoryUsage() {
    if (!this.enabled) {
      return {
        supported: false,
        used: 0,
        total: 0,
        limit: 0,
        percentage: 0,
      };
    }
    
    const memory = performance.memory;
    return {
      supported: true,
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      raw: memory,
    };
  }
  
  /**
   * メモリ監視を開始
   */
  startMonitoring() {
    if (this.isMonitoring || !this.enabled) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.monitoringInterval);
    
    console.log('メモリ監視を開始しました');
  }
  
  /**
   * メモリ監視を停止
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('メモリ監視を停止しました');
  }
  
  /**
   * メモリ使用量をチェック
   */
  checkMemoryUsage() {
    const usage = this.getCurrentMemoryUsage();
    
    if (!usage.supported) return usage;
    
    // 履歴に追加
    this.addToHistory(usage);
    
    // 閾値チェック
    if (usage.used >= this.thresholds.critical) {
      this.handleCriticalMemory(usage);
    } else if (usage.used >= this.thresholds.cleanup) {
      this.handleCleanupMemory(usage);
    } else if (usage.used >= this.thresholds.warning) {
      this.handleWarningMemory(usage);
    }
    
    return usage;
  }
  
  /**
   * 警告レベルのメモリ使用量処理
   */
  handleWarningMemory(usage) {
    console.warn(`メモリ使用量が警告レベルに達しました: ${usage.used}MB`);
    
    if (this.callbacks.onWarning) {
      this.callbacks.onWarning(usage);
    }
  }
  
  /**
   * クリーンアップレベルのメモリ使用量処理
   */
  async handleCleanupMemory(usage) {
    console.warn(`メモリ使用量がクリーンアップレベルに達しました: ${usage.used}MB`);
    
    const beforeCleanup = usage.used;
    await this.forceCleanup();
    
    const afterUsage = this.getCurrentMemoryUsage();
    const freed = beforeCleanup - afterUsage.used;
    
    this.gcStats.totalMemoryFreed += freed;
    this.gcStats.lastCleanupTime = new Date();
    
    console.log(`メモリクリーンアップ完了: ${freed}MB解放`);
    
    if (this.callbacks.onCleanup) {
      this.callbacks.onCleanup(usage, afterUsage, freed);
    }
  }
  
  /**
   * 危険レベルのメモリ使用量処理
   */
  async handleCriticalMemory(usage) {
    console.error(`メモリ使用量が危険レベルに達しました: ${usage.used}MB`);
    
    // 強制的なクリーンアップを実行
    await this.forceCleanup();
    await this.emergencyCleanup();
    
    if (this.callbacks.onCritical) {
      this.callbacks.onCritical(usage);
    }
  }
  
  /**
   * 強制ガベージコレクション
   */
  async forceCleanup() {
    this.gcStats.forceCleanupCount++;
    
    // ブラウザのガベージコレクションを試行
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
    
    // 手動でクリーンアップを促す
    await this.triggerCleanup();
  }
  
  /**
   * 緊急クリーンアップ
   */
  async emergencyCleanup() {
    // DOM要素のクリーンアップ
    this.cleanupDOMElements();
    
    // イベントリスナーのクリーンアップ
    this.cleanupEventListeners();
    
    // キャッシュのクリーンアップ
    this.cleanupCaches();
    
    // 短時間待機してガベージコレクションを促す
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 再度ガベージコレクションを試行
    if (window.gc) {
      window.gc();
    }
  }
  
  /**
   * クリーンアップを促すための処理
   */
  async triggerCleanup() {
    // 大きな配列を作成・削除してガベージコレクションを促す
    const tempArray = new Array(1000).fill(null);
    tempArray.length = 0;
    
    // Promise解決を遅延させてガベージコレクションの時間を作る
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  /**
   * DOM要素のクリーンアップ
   */
  cleanupDOMElements() {
    // 非表示の画像要素を削除
    const hiddenImages = document.querySelectorAll('img[style*="display: none"]');
    hiddenImages.forEach(img => img.remove());
    
    // 未使用のcanvas要素をクリーンアップ
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      if (!canvas.isConnected || canvas.style.display === 'none') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });
  }
  
  /**
   * イベントリスナーのクリーンアップ
   */
  cleanupEventListeners() {
    // WeakMapを使用してメモリリークを防ぐ
    if (window._memoryMonitorListeners) {
      window._memoryMonitorListeners.clear();
    }
  }
  
  /**
   * キャッシュのクリーンアップ
   */
  cleanupCaches() {
    // ブラウザキャッシュのクリーンアップ（可能な場合）
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('cache')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // sessionStorageの大きなアイテムをクリーンアップ
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        if (value && value.length > 1024 * 100) { // 100KB以上
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('sessionStorageのクリーンアップに失敗:', error);
    }
  }
  
  /**
   * メモリ使用履歴に追加
   */
  addToHistory(usage) {
    const timestamp = new Date();
    this.memoryHistory.push({
      ...usage,
      timestamp,
    });
    
    // 履歴の長さを制限
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }
  }
  
  /**
   * メモリ使用統計を取得
   */
  getMemoryStatistics() {
    if (this.memoryHistory.length === 0) {
      return null;
    }
    
    const usages = this.memoryHistory.map(h => h.used);
    const average = usages.reduce((sum, val) => sum + val, 0) / usages.length;
    const max = Math.max(...usages);
    const min = Math.min(...usages);
    
    return {
      current: this.getCurrentMemoryUsage(),
      statistics: {
        average: Math.round(average),
        max,
        min,
        samples: this.memoryHistory.length,
      },
      gcStats: { ...this.gcStats },
      history: this.memoryHistory.slice(),
    };
  }
  
  /**
   * メモリリークの検出
   */
  detectMemoryLeaks() {
    if (this.memoryHistory.length < 10) {
      return { hasLeak: false, confidence: 0 };
    }
    
    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);
    
    if (older.length === 0) {
      return { hasLeak: false, confidence: 0 };
    }
    
    const recentAvg = recent.reduce((sum, h) => sum + h.used, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.used, 0) / older.length;
    
    const growth = recentAvg - olderAvg;
    const growthRate = growth / olderAvg;
    
    // 10%以上の継続的な増加はメモリリークの可能性
    const hasLeak = growthRate > 0.1;
    const confidence = Math.min(growthRate * 100, 100);
    
    return {
      hasLeak,
      confidence: Math.round(confidence),
      growth,
      growthRate,
      recentAverage: Math.round(recentAvg),
      olderAverage: Math.round(olderAvg),
    };
  }
  
  /**
   * メモリプロファイルレポートを生成
   */
  generateReport() {
    const stats = this.getMemoryStatistics();
    const leakDetection = this.detectMemoryLeaks();
    
    return {
      timestamp: new Date().toISOString(),
      enabled: this.enabled,
      monitoring: this.isMonitoring,
      thresholds: this.thresholds,
      ...stats,
      leakDetection,
      recommendations: this.generateRecommendations(stats, leakDetection),
    };
  }
  
  /**
   * 推奨事項を生成
   */
  generateRecommendations(stats, leakDetection) {
    const recommendations = [];
    
    if (!stats) return recommendations;
    
    if (stats.current.used > this.thresholds.warning) {
      recommendations.push('メモリ使用量が高いです。不要なデータの削除を検討してください。');
    }
    
    if (leakDetection.hasLeak) {
      recommendations.push(`メモリリークの可能性があります（信頼度: ${leakDetection.confidence}%）。コードのレビューが必要です。`);
    }
    
    if (stats.gcStats.forceCleanupCount > 10) {
      recommendations.push('頻繁なガベージコレクションが発生しています。メモリ効率の改善を検討してください。');
    }
    
    if (stats.current.percentage > 80) {
      recommendations.push('メモリ使用率が80%を超えています。アプリケーションの最適化が必要です。');
    }
    
    return recommendations;
  }
}

/**
 * グローバルメモリ監視インスタンス
 */
export const globalMemoryMonitor = new MemoryMonitor({
  warningThreshold: 50,
  criticalThreshold: 100,
  cleanupThreshold: 80,
  monitoringInterval: 10000, // 10秒
});

/**
 * 高負荷処理用のメモリセーフなラッパー
 */
export const withMemoryManagement = async (asyncFunction, options = {}) => {
  const monitor = new MemoryMonitor(options);
  
  // 処理前のメモリ状況を記録
  const beforeUsage = monitor.getCurrentMemoryUsage();
  
  try {
    // 定期的にメモリをチェックしながら処理を実行
    const checkInterval = setInterval(() => {
      const usage = monitor.getCurrentMemoryUsage();
      if (usage.used > (options.memoryLimit || 150)) {
        console.warn(`メモリ使用量が制限を超えました: ${usage.used}MB`);
        monitor.forceCleanup();
      }
    }, 1000);
    
    const result = await asyncFunction();
    
    clearInterval(checkInterval);
    
    // 処理後のメモリ状況を記録
    const afterUsage = monitor.getCurrentMemoryUsage();
    const memoryDelta = afterUsage.used - beforeUsage.used;
    
    console.log(`メモリ使用量変化: ${memoryDelta > 0 ? '+' : ''}${memoryDelta}MB`);
    
    return result;
  } catch (error) {
    // エラー時もメモリをクリーンアップ
    await monitor.forceCleanup();
    throw error;
  }
};

export default MemoryMonitor;