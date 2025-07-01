/**
 * Garden Project Management System - D3.js Performance Utilities
 * D3.js パフォーマンス最適化ユーティリティ関数
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Purpose: D3.jsの企業級パフォーマンス最適化
 */

import * as d3 from 'd3';

// パフォーマンス閾値設定
export const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME_WARNING: 50, // ms
  RENDER_TIME_ERROR: 100, // ms
  MEMORY_WARNING: 50, // MB
  ELEMENT_COUNT_WARNING: 500,
  ELEMENT_COUNT_ERROR: 1000,
  FPS_TARGET: 60
} as const;

// データ型定義
export interface PerformanceMetrics {
  renderTime: number;
  elementCount: number;
  memoryUsage: number;
  fps: number;
  timestamp: number;
}

export interface OptimizationResult<T> {
  data: T[];
  stats: PerformanceMetrics;
  optimized: boolean;
  reason?: string;
}

// メモリ使用量測定
export const measureMemoryUsage = (): number => {
  if ('memory' in performance && (performance as any).memory) {
    return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
  }
  return 0;
};

// FPS計算器クラス
export class FPSCalculator {
  private frames: number[] = [];
  private lastTime = 0;

  update(): number {
    const now = performance.now();
    this.frames.push(now);
    
    // 1秒以上古いフレームを削除
    const cutoff = now - 1000;
    while (this.frames.length > 0 && this.frames[0] < cutoff) {
      this.frames.shift();
    }
    
    return this.frames.length;
  }

  getCurrentFPS(): number {
    return this.frames.length;
  }

  reset(): void {
    this.frames = [];
  }
}

// データ最適化器
export class D3DataOptimizer<T> {
  private maxElements: number;
  private enableLOD: boolean; // Level of Detail
  
  constructor(maxElements = 1000, enableLOD = true) {
    this.maxElements = maxElements;
    this.enableLOD = enableLOD;
  }

  // データセット最適化
  optimizeDataset(
    data: T[],
    viewport?: { start: number; end: number },
    lodLevel = 1
  ): OptimizationResult<T> {
    const startTime = performance.now();
    const startMemory = measureMemoryUsage();

    let optimizedData = data;
    let optimized = false;
    let reason = '';

    // データサイズチェック
    if (data.length > this.maxElements) {
      if (viewport) {
        // ビューポートベースフィルタリング
        optimizedData = this.applyViewportFiltering(data, viewport);
        optimized = true;
        reason = 'viewport filtering';
      } else if (this.enableLOD) {
        // Level of Detail適用
        optimizedData = this.applyLevelOfDetail(data, lodLevel);
        optimized = true;
        reason = 'level of detail';
      } else {
        // 単純な間引き
        optimizedData = this.applySampling(data);
        optimized = true;
        reason = 'sampling';
      }
    }

    const endTime = performance.now();
    const endMemory = measureMemoryUsage();

    return {
      data: optimizedData,
      stats: {
        renderTime: endTime - startTime,
        elementCount: optimizedData.length,
        memoryUsage: endMemory - startMemory,
        fps: 0, // 別途計算
        timestamp: Date.now()
      },
      optimized,
      reason
    };
  }

  private applyViewportFiltering(data: T[], viewport: { start: number; end: number }): T[] {
    const buffer = Math.ceil((viewport.end - viewport.start) * 0.1); // 10%バッファ
    const start = Math.max(0, viewport.start - buffer);
    const end = Math.min(data.length, viewport.end + buffer);
    return data.slice(start, end);
  }

  private applyLevelOfDetail(data: T[], lodLevel: number): T[] {
    if (lodLevel <= 1) return data;
    
    const step = Math.ceil(lodLevel);
    return data.filter((_, index) => index % step === 0);
  }

  private applySampling(data: T[]): T[] {
    const ratio = this.maxElements / data.length;
    const step = Math.ceil(1 / ratio);
    return data.filter((_, index) => index % step === 0);
  }
}

// D3レンダリング最適化
export class D3RenderOptimizer {
  private fpsCalculator = new FPSCalculator();
  private renderQueue: (() => void)[] = [];
  private isRendering = false;
  
  // バッチレンダリング
  queueRender(renderFunc: () => void): void {
    this.renderQueue.push(renderFunc);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isRendering || this.renderQueue.length === 0) return;

    this.isRendering = true;
    
    requestAnimationFrame(() => {
      const startTime = performance.now();
      const targetFrameTime = 1000 / PERFORMANCE_THRESHOLDS.FPS_TARGET;

      while (this.renderQueue.length > 0 && (performance.now() - startTime) < targetFrameTime) {
        const renderFunc = this.renderQueue.shift();
        if (renderFunc) {
          renderFunc();
        }
      }

      this.fpsCalculator.update();
      this.isRendering = false;

      // 残りのタスクがあれば次のフレームで処理
      if (this.renderQueue.length > 0) {
        this.processQueue();
      }
    });
  }

  getCurrentFPS(): number {
    return this.fpsCalculator.getCurrentFPS();
  }

  clearQueue(): void {
    this.renderQueue = [];
    this.isRendering = false;
  }
}

// SVG最適化ユーティリティ
export const optimizeSVGElement = (element: SVGElement): void => {
  // 不要な属性削除
  element.removeAttribute('xmlns');
  
  // テキスト最適化
  const textElements = element.querySelectorAll('text');
  textElements.forEach(text => {
    if (text.textContent && text.textContent.length > 50) {
      text.textContent = text.textContent.substring(0, 47) + '...';
    }
  });

  // パス最適化（精度調整）
  const pathElements = element.querySelectorAll('path');
  pathElements.forEach(path => {
    const d = path.getAttribute('d');
    if (d) {
      // 小数点以下2桁に丸める
      const optimizedD = d.replace(/\d+\.\d+/g, (match) => {
        return parseFloat(match).toFixed(2);
      });
      path.setAttribute('d', optimizedD);
    }
  });
};

// Canvas フォールバック
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext('2d')!;
  }

  // 高速矩形描画
  drawOptimizedRect(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fillStyle: string
  ): void {
    this.context.fillStyle = fillStyle;
    this.context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  // 高速テキスト描画
  drawOptimizedText(
    text: string, 
    x: number, 
    y: number, 
    font = '12px Arial', 
    fillStyle = '#000'
  ): void {
    this.context.font = font;
    this.context.fillStyle = fillStyle;
    this.context.fillText(text, Math.round(x), Math.round(y));
  }

  // バッチ描画
  drawBatch(operations: Array<() => void>): void {
    this.context.save();
    operations.forEach(op => op());
    this.context.restore();
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // SVGからCanvasへの変換
  convertFromSVG(svgElement: SVGElement): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        this.clear();
        this.context.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve();
      };

      img.src = url;
    });
  }
}

// パフォーマンス監視
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxHistory = 100;

  record(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }

    this.checkThresholds(metrics);
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_ERROR) {
      console.error(`[D3Performance] Critical render time: ${metrics.renderTime}ms`);
    } else if (metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      console.warn(`[D3Performance] Slow render time: ${metrics.renderTime}ms`);
    }

    if (metrics.elementCount > PERFORMANCE_THRESHOLDS.ELEMENT_COUNT_ERROR) {
      console.error(`[D3Performance] Too many elements: ${metrics.elementCount}`);
    } else if (metrics.elementCount > PERFORMANCE_THRESHOLDS.ELEMENT_COUNT_WARNING) {
      console.warn(`[D3Performance] High element count: ${metrics.elementCount}`);
    }

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      console.warn(`[D3Performance] High memory usage: ${metrics.memoryUsage}MB`);
    }
  }

  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length;
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

// グローバルインスタンス
export const globalPerformanceMonitor = new PerformanceMonitor();
export const globalRenderOptimizer = new D3RenderOptimizer();

// 使いやすいヘルパー関数
export const withPerformanceTracking = <T extends any[]>(
  func: (...args: T) => void,
  name = 'D3Operation'
) => {
  return (...args: T) => {
    const startTime = performance.now();
    const startMemory = measureMemoryUsage();

    func(...args);

    const endTime = performance.now();
    const endMemory = measureMemoryUsage();

    globalPerformanceMonitor.record({
      renderTime: endTime - startTime,
      elementCount: 0, // 外部で設定
      memoryUsage: endMemory - startMemory,
      fps: globalRenderOptimizer.getCurrentFPS(),
      timestamp: Date.now()
    });
  };
};

// デバウンス最適化
export const createOptimizedDebounce = <T extends any[]>(
  func: (...args: T) => void,
  delay = 16
) => {
  let timeoutId: NodeJS.Timeout;
  let lastArgs: T;

  return (...args: T) => {
    lastArgs = args;
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      globalRenderOptimizer.queueRender(() => func(...lastArgs));
    }, delay);
  };
};

export default {
  D3DataOptimizer,
  D3RenderOptimizer,
  CanvasRenderer,
  PerformanceMonitor,
  measureMemoryUsage,
  optimizeSVGElement,
  withPerformanceTracking,
  createOptimizedDebounce,
  globalPerformanceMonitor,
  globalRenderOptimizer
};