/**
 * Garden 造園業向け統合業務管理システム
 * アナリティクス・ユーザー行動追跡ユーティリティ
 * プライバシー保護・GDPR準拠・企業級データ分析
 */

import React from 'react';

// ユーザーアクション型定義
export type UserActionType =
  | 'estimate_create'
  | 'estimate_edit'
  | 'estimate_delete'
  | 'estimate_pdf_generate'
  | 'item_add'
  | 'item_edit'
  | 'item_delete'
  | 'profitability_view'
  | 'cost_view'
  | 'adjustment_change'
  | 'login'
  | 'logout'
  | 'permission_denied'
  | 'error_occurred';

export interface UserAction {
  type: UserActionType;
  timestamp: number;
  userId?: string;
  sessionId: string;
  data?: Record<string, any>;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  anonymize: boolean;
}

// デフォルト設定
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  batchSize: 10,
  flushInterval: 5000, // 5秒
  retentionDays: 30,
  anonymize: true,
};

/**
 * プライバシー保護アナリティクスクラス
 */
class AnalyticsService {
  private static instance: AnalyticsService;
  private config: AnalyticsConfig;
  private queue: UserAction[] = [];
  private sessionId: string;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  static getInstance(config?: Partial<AnalyticsConfig>): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(config);
    }
    return AnalyticsService.instance;
  }

  /**
   * ユーザーアクション追跡
   */
  track(
    type: UserActionType,
    data?: Record<string, any>,
    success = true,
    error?: string,
    duration?: number
  ): void {
    if (!this.config.enabled) return;

    const action: UserAction = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: this.config.anonymize ? this.anonymizeData(data) : data,
      success,
      error,
      duration,
    };

    // 機密情報を除外
    this.sanitizeAction(action);

    this.queue.push(action);

    // バッチサイズに達したら即座に送信
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * パフォーマンス測定付きアクション追跡
   */
  trackTimed<T>(
    type: UserActionType,
    action: () => T | Promise<T>,
    data?: Record<string, any>
  ): T | Promise<T> {
    const startTime = performance.now();

    try {
      const result = action();

      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = performance.now() - startTime;
            this.track(type, data, true, undefined, duration);
            return value;
          })
          .catch(error => {
            const duration = performance.now() - startTime;
            this.track(type, data, false, error.message, duration);
            throw error;
          });
      } else {
        const duration = performance.now() - startTime;
        this.track(type, data, true, undefined, duration);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.track(type, data, false, (error as Error).message, duration);
      throw error;
    }
  }

  /**
   * エラー追跡
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.track(
      'error_occurred',
      {
        message: error.message,
        stack: error.stack?.slice(0, 500), // スタックトレースを制限
        ...context,
      },
      false,
      error.message
    );
  }

  /**
   * ページビュー追跡
   */
  trackPageView(page: string, data?: Record<string, any>): void {
    this.track('page_view' as UserActionType, {
      page,
      url: window.location.pathname,
      referrer: document.referrer,
      ...data,
    });
  }

  /**
   * 即座にデータを送信
   */
  flush(): void {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    this.sendBatch(batch).catch(error => {
      console.warn('Analytics flush failed:', error);
      // 失敗したデータをキューに戻す（最大リトライ回数制限）
      this.queue.unshift(...batch.slice(0, 5));
    });
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    queueSize: number;
    sessionId: string;
    config: AnalyticsConfig;
  } {
    return {
      queueSize: this.queue.length,
      sessionId: this.sessionId,
      config: this.config,
    };
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private anonymizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return data;

    const anonymized = { ...data };

    // 機密情報をハッシュ化または除去
    const sensitiveFields = ['email', 'phone', 'address', 'customer_name', 'password'];

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = this.hashString(anonymized[field]);
      }
    }

    return anonymized;
  }

  private sanitizeAction(action: UserAction): void {
    // URLパラメータから機密情報を除去
    if (action.data?.url) {
      action.data.url = action.data.url.replace(/([?&])(token|key|secret)=[^&]*/gi, '$1$2=***');
    }

    // 大きすぎるデータを制限
    if (action.data) {
      const dataStr = JSON.stringify(action.data);
      if (dataStr.length > 1000) {
        action.data = {
          ...action.data,
          _truncated: true,
          _originalSize: dataStr.length,
        };
      }
    }
  }

  private async sendBatch(batch: UserAction[]): Promise<void> {
    if (!this.config.endpoint) {
      // エンドポイントが設定されていない場合はローカルストレージに保存
      this.saveToLocalStorage(batch);
      return;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            version: '1.0.0',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      // フォールバック: ローカルストレージに保存
      this.saveToLocalStorage(batch);
      throw error;
    }
  }

  private saveToLocalStorage(batch: UserAction[]): void {
    try {
      const stored = localStorage.getItem('garden_analytics') || '[]';
      const existing = JSON.parse(stored) as UserAction[];
      const combined = [...existing, ...batch];

      // 保持期間を超えたデータを削除
      const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
      const filtered = combined.filter(action => action.timestamp > cutoff);

      // ストレージサイズ制限（最大1000件）
      const limited = filtered.slice(-1000);

      localStorage.setItem('garden_analytics', JSON.stringify(limited));
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }
}

// シングルトンインスタンス
const analytics = AnalyticsService.getInstance();

// 便利な関数をエクスポート
export const trackUserAction = (
  type: UserActionType,
  data?: Record<string, any>,
  success = true,
  error?: string
): void => {
  analytics.track(type, data, success, error);
};

export const trackTimedAction = <T>(
  type: UserActionType,
  action: () => T | Promise<T>,
  data?: Record<string, any>
): T | Promise<T> => {
  return analytics.trackTimed(type, action, data);
};

export const trackError = (error: Error, context?: Record<string, any>): void => {
  analytics.trackError(error, context);
};

export const trackPageView = (page: string, data?: Record<string, any>): void => {
  analytics.trackPageView(page, data);
};

// React Hook for component lifecycle tracking
export const useAnalytics = (componentName: string) => {
  const mountTime = Date.now();

  React.useEffect(() => {
    trackUserAction('component_mount' as UserActionType, { componentName });

    return () => {
      const unmountTime = Date.now();
      trackUserAction('component_unmount' as UserActionType, {
        componentName,
        mountDuration: unmountTime - mountTime,
      });
    };
  }, [componentName, mountTime]);

  return {
    track: trackUserAction,
    trackTimed: trackTimedAction,
    trackError,
  };
};

// エラーバウンダリー用
export const setupGlobalErrorTracking = (): void => {
  // 未処理エラーをキャッチ
  window.addEventListener('error', event => {
    trackError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 未処理のPromise拒否をキャッチ
  window.addEventListener('unhandledrejection', event => {
    trackError(new Error(event.reason), {
      type: 'unhandledrejection',
    });
  });
};

// ページ離脱時にデータを送信
export const setupBeforeUnloadTracking = (): void => {
  window.addEventListener('beforeunload', () => {
    analytics.flush();
  });

  // Page Visibility APIを使用してタブ切り替えを検知
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      analytics.flush();
    }
  });
};

export { AnalyticsService };
export default analytics;
