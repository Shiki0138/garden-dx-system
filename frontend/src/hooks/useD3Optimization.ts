/**
 * Garden Project Management System - D3.js Optimization Hook
 * D3.js パフォーマンス最適化とコード品質向上のためのカスタムフック
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Purpose: D3.jsの最適化とメモリリーク防止、レンダリング効率化
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { debounce, throttle } from 'lodash';

// D3最適化設定
interface D3OptimizationConfig {
  enableTransitions: boolean;
  transitionDuration: number;
  enableVirtualization: boolean;
  debounceDelay: number;
  maxElements: number;
  useCanvas: boolean;
}

// デフォルト設定
const DEFAULT_CONFIG: D3OptimizationConfig = {
  enableTransitions: true,
  transitionDuration: 300,
  enableVirtualization: true,
  debounceDelay: 16, // ~60fps
  maxElements: 1000,
  useCanvas: false
};

// レンダリング統計
interface RenderStats {
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenders: number;
  memoryUsage: number;
  elementsRendered: number;
}

// D3最適化フック
export const useD3Optimization = (
  config: Partial<D3OptimizationConfig> = {}
) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const renderStats = useRef<RenderStats>({
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenders: 0,
    memoryUsage: 0,
    elementsRendered: 0
  });

  // メモリ使用量測定
  const measureMemory = useCallback((): number => {
    if ('memory' in performance) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }, []);

  // パフォーマンス測定付きレンダリング
  const performanceWrap = useCallback(<T extends any[]>(
    renderFunction: (...args: T) => void,
    name: string = 'D3Render'
  ) => {
    return (...args: T) => {
      const startTime = performance.now();
      const startMemory = measureMemory();

      renderFunction(...args);

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      const endMemory = measureMemory();

      // 統計更新
      renderStats.current.lastRenderTime = renderTime;
      renderStats.current.totalRenders++;
      renderStats.current.averageRenderTime = 
        (renderStats.current.averageRenderTime * (renderStats.current.totalRenders - 1) + renderTime) / 
        renderStats.current.totalRenders;
      renderStats.current.memoryUsage = endMemory;

      // パフォーマンス警告
      if (renderTime > 100) {
        console.warn(`[D3Optimization] ${name} took ${renderTime.toFixed(2)}ms - consider optimization`);
      }

      if (endMemory - startMemory > 10) {
        console.warn(`[D3Optimization] ${name} memory increased by ${endMemory - startMemory}MB`);
      }
    };
  }, [measureMemory]);

  // 最適化されたデバウンス関数
  const createOptimizedDebounce = useCallback(<T extends any[]>(
    func: (...args: T) => void,
    delay: number = finalConfig.debounceDelay
  ) => {
    return debounce(performanceWrap(func), delay, { leading: false, trailing: true });
  }, [finalConfig.debounceDelay, performanceWrap]);

  // 最適化されたスロットル関数
  const createOptimizedThrottle = useCallback(<T extends any[]>(
    func: (...args: T) => void,
    delay: number = finalConfig.debounceDelay
  ) => {
    return throttle(performanceWrap(func), delay, { leading: true, trailing: false });
  }, [finalConfig.debounceDelay, performanceWrap]);

  // D3セレクション最適化
  const optimizedSelection = useCallback((selector: string | Element) => {
    if (typeof selector === 'string') {
      // キャッシュされたセレクション使用
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`[D3Optimization] Element not found: ${selector}`);
        return d3.select(document.createElement('div')); // 空要素を返す
      }
      return d3.select(element);
    }
    return d3.select(selector);
  }, []);

  // 大量データ用仮想化レンダリング
  const createVirtualizedRenderer = useCallback(<T>(
    data: T[],
    itemHeight: number,
    containerHeight: number,
    renderItem: (item: T, index: number) => void
  ) => {
    if (!finalConfig.enableVirtualization || data.length < finalConfig.maxElements) {
      // 仮想化不要 - 通常レンダリング
      return data.forEach(renderItem);
    }

    // 表示範囲計算
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.min(10, Math.ceil(visibleCount * 0.1)); // 10%バッファ

    return (scrollTop: number = 0) => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
      const endIndex = Math.min(data.length - 1, startIndex + visibleCount + buffer * 2);
      
      const visibleData = data.slice(startIndex, endIndex + 1);
      renderStats.current.elementsRendered = visibleData.length;
      
      visibleData.forEach((item, i) => {
        renderItem(item, startIndex + i);
      });
    };
  }, [finalConfig.enableVirtualization, finalConfig.maxElements]);

  // トランジション最適化
  const createOptimizedTransition = useCallback((
    selection: d3.Selection<any, any, any, any>,
    duration: number = finalConfig.transitionDuration
  ) => {
    if (!finalConfig.enableTransitions) {
      return selection;
    }

    return selection
      .transition()
      .duration(duration)
      .ease(d3.easeQuadOut); // 最適化されたイージング関数
  }, [finalConfig.enableTransitions, finalConfig.transitionDuration]);

  // スケール最適化
  const createOptimizedScale = useCallback(<Domain, Range>(
    type: 'linear' | 'time' | 'ordinal' | 'band',
    domain: Domain[],
    range: Range[]
  ) => {
    switch (type) {
      case 'linear':
        return d3.scaleLinear().domain(domain as number[]).range(range as number[]);
      case 'time':
        return d3.scaleTime().domain(domain as Date[]).range(range as number[]);
      case 'ordinal':
        return d3.scaleOrdinal().domain(domain as string[]).range(range as string[]);
      case 'band':
        return d3.scaleBand().domain(domain as string[]).range(range as [number, number]);
      default:
        throw new Error(`[D3Optimization] Unsupported scale type: ${type}`);
    }
  }, []);

  // データジョイン最適化
  const optimizedDataJoin = useCallback(<Datum>(
    parent: d3.Selection<any, any, any, any>,
    data: Datum[],
    selector: string,
    keyFunction?: (d: Datum, i: number) => string | number
  ) => {
    const selection = parent.selectAll(selector).data(data, keyFunction);
    
    // パフォーマンス監視
    const elementCount = selection.size();
    if (elementCount > finalConfig.maxElements) {
      console.warn(`[D3Optimization] Large dataset detected: ${elementCount} elements`);
    }

    return {
      enter: selection.enter(),
      update: selection,
      exit: selection.exit(),
      merge: function(enterSelection: d3.Selection<any, Datum, any, any>) {
        return enterSelection.merge(selection);
      }
    };
  }, [finalConfig.maxElements]);

  // クリーンアップ最適化
  const cleanupSelection = useCallback((selection: d3.Selection<any, any, any, any>) => {
    // イベントリスナーとタイマーのクリーンアップ
    selection.on('.zoom', null)
             .on('.drag', null)
             .on('.brush', null);
    
    // トランジション停止
    selection.interrupt();
    
    // DOM要素削除
    selection.remove();
  }, []);

  // 統計情報取得
  const getStats = useCallback((): RenderStats => {
    return { ...renderStats.current };
  }, []);

  // リセット機能
  const resetStats = useCallback(() => {
    renderStats.current = {
      lastRenderTime: 0,
      averageRenderTime: 0,
      totalRenders: 0,
      memoryUsage: measureMemory(),
      elementsRendered: 0
    };
  }, [measureMemory]);

  return {
    // 基本最適化機能
    config: finalConfig,
    performanceWrap,
    createOptimizedDebounce,
    createOptimizedThrottle,
    
    // D3固有最適化
    optimizedSelection,
    createVirtualizedRenderer,
    createOptimizedTransition,
    createOptimizedScale,
    optimizedDataJoin,
    
    // 管理機能
    cleanupSelection,
    getStats,
    resetStats,
    measureMemory
  };
};

// D3コンポーネント用ベースフック
export const useD3Component = <T extends Element>(
  renderFunction: (container: d3.Selection<T, unknown, null, undefined>) => () => void,
  dependencies: React.DependencyList = [],
  config?: Partial<D3OptimizationConfig>
) => {
  const ref = useRef<T>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { performanceWrap, createOptimizedDebounce, cleanupSelection } = useD3Optimization(config);

  // 最適化されたレンダリング関数
  const optimizedRender = useMemo(() => {
    return createOptimizedDebounce(() => {
      if (!ref.current) return;

      // 前回のクリーンアップ実行
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const selection = d3.select(ref.current);
      cleanupSelection(selection);
      
      cleanupRef.current = renderFunction(selection);
    });
  }, [renderFunction, createOptimizedDebounce, cleanupSelection]);

  // エフェクト
  useEffect(() => {
    optimizedRender();
    return () => {
      optimizedRender.cancel();
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, dependencies);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (ref.current) {
        cleanupSelection(d3.select(ref.current));
      }
    };
  }, [cleanupSelection]);

  return ref;
};

// カスタムスケールフック
export const useD3Scale = <Domain, Range>(
  type: 'linear' | 'time' | 'ordinal' | 'band',
  domain: Domain[],
  range: Range[],
  config?: Partial<D3OptimizationConfig>
) => {
  const { createOptimizedScale } = useD3Optimization(config);
  
  return useMemo(() => {
    return createOptimizedScale(type, domain, range);
  }, [createOptimizedScale, type, domain, range]);
};

export default useD3Optimization;