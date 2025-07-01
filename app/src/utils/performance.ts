/**
 * Garden 造園業向け統合業務管理システム
 * パフォーマンス最適化ユーティリティ
 * 企業級パフォーマンス・メモリ効率・レスポンス最適化
 */

// デバウンス関数（型安全）
export const debounce = <T extends (..._args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

// スロットル関数（型安全）
export const throttle = <T extends (..._args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
};

// メモ化キャッシュ（LRU実装）
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // LRU: 使用されたアイテムを最新に
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 最も古いアイテムを削除
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// 高性能メモ化関数
export const memoize = <Args extends any[], Return>(
  fn: (..._args: Args) => Return,
  keyGenerator?: (..._args: Args) => string
): ((..._args: Args) => Return) => {
  const cache = new LRUCache<string, Return>(50);
  
  return (...args: Args): Return => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// バッチ処理最適化
export const batch = <T>(
  items: T[],
  batchSize: number,
  processor: (_batch: T[]) => Promise<void>,
  delay = 0
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let index = 0;
    
    const processBatch = async () => {
      try {
        const batch = items.slice(index, index + batchSize);
        if (batch.length === 0) {
          resolve();
          return;
        }
        
        await processor(batch);
        index += batchSize;
        
        if (delay > 0) {
          setTimeout(processBatch, delay);
        } else {
          // 次のイベントループで実行（UIブロック防止）
          setTimeout(processBatch, 0);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    processBatch();
  });
};

// 仮想スクロール用計算最適化
export const calculateVisibleRange = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 5
): { start: number; end: number; total: number } => {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);
  
  return { start, end, total: totalItems };
};

// リサイズ観察最適化
export const createResizeObserver = (
  callback: (_entries: ResizeObserverEntry[]) => void,
  _options?: ResizeObserverOptions
): ResizeObserver => {
  const throttledCallback = throttle(callback, 16); // 60fps制限
  return new ResizeObserver(throttledCallback);
};

// Intersection Observer最適化
export const createIntersectionObserver = (
  callback: (_entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit  
): IntersectionObserver => {
  const throttledCallback = throttle(callback, 100);
  return new IntersectionObserver(throttledCallback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
};

// パフォーマンス測定
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  mark(name: string): void {
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const measurement = performance.measure(name, startMark, endMark);
    const duration = measurement.duration;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const measurements = this.metrics.get(name)!;
    measurements.push(duration);
    
    // 最新100件のみ保持
    if (measurements.length > 100) {
      measurements.shift();
    }
    
    return duration;
  }

  getAverageTime(name: string): number {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }

  getStats(): Record<string, { avg: number; count: number; latest: number }> {
    const stats: Record<string, { avg: number; count: number; latest: number }> = {};
    
    this.metrics.forEach((measurements, name) => {
      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      stats[name] = {
        avg: parseFloat(avg.toFixed(2)),
        count: measurements.length,
        latest: parseFloat(measurements[measurements.length - 1]?.toFixed(2) || '0'),
      };
    });
    
    return stats;
  }

  clear(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// メモリ使用量監視
export const getMemoryUsage = (): {
  used: number;
  total: number;
  limit?: number;
} | null => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
    };
  }
  return null;
};

// FPS測定
export class FPSMonitor {
  private fps = 0;
  private frames = 0;
  private lastTime = performance.now();
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
  }

  getFPS(): number {
    return Math.round(this.fps);
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    this.frames++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      this.fps = (this.frames * 1000) / (currentTime - this.lastTime);
      this.frames = 0;
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame(this.tick);
  };
}

// リソース読み込み最適化
export const preloadResource = (url: string, type: 'script' | 'style' | 'image' = 'script'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
      default:
        link.as = 'script';
        break;
    }
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${url}`));
    
    document.head.appendChild(link);
  });
};

// イベント委譲最適化
export const createEventDelegator = <T extends Event>(
  container: HTMLElement,
  eventType: string,
  selector: string,
  handler: (_event: T, _element: HTMLElement) => void
): (() => void) => {
  const delegatedHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    const element = target.closest(selector) as HTMLElement;
    
    if (element && container.contains(element)) {
      handler(event as T, element);
    }
  };
  
  container.addEventListener(eventType, delegatedHandler);
  
  // クリーンアップ関数を返す
  return () => {
    container.removeEventListener(eventType, delegatedHandler);
  };
};

const performanceUtils = {
  debounce,
  throttle,
  memoize,
  batch,
  calculateVisibleRange,
  createResizeObserver,
  createIntersectionObserver,
  PerformanceMonitor,
  getMemoryUsage,
  FPSMonitor,
  preloadResource,
  createEventDelegator,
};

export default performanceUtils;