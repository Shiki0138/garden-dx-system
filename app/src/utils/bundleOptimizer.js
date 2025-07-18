/**
 * Garden DX - Bundle Size最適化ユーティリティ
 * 動的インポートとコード分割でバンドルサイズを削減
 */

import React from 'react';

// 動的インポートを使用したコンポーネント読み込み
export const loadComponent = componentPath => {
  return import(componentPath);
};

// 遅延読み込み用のコンポーネントファクトリー
export const createLazyComponent = importFunc => {
  const LazyComponent = React.lazy(importFunc);

  return function WrappedLazyComponent(props) {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
};

// 軽量なローディングコンポーネント
const LoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      color: '#6b7280',
      fontSize: '14px',
    }}
  >
    読み込み中...
  </div>
);

// 条件付きインポート（必要な時だけ読み込み）
export const conditionalImport = async (condition, modulePath) => {
  if (condition) {
    return await import(modulePath);
  }
  return null;
};

// ライブラリの部分インポート最適化
export const optimizedImports = {
  // lodashの必要な関数のみインポート
  debounce: () => import('lodash/debounce'),
  throttle: () => import('lodash/throttle'),
  cloneDeep: () => import('lodash/cloneDeep'),

  // date-fnsの必要な関数のみインポート
  formatDate: () => import('date-fns/format'),
  parseDate: () => import('date-fns/parse'),
  addDays: () => import('date-fns/addDays'),

  // react-iconsの最適化
  FiIcon: iconName => import(`react-icons/fi/index.js`).then(module => module[iconName]),
};

// モジュール分割のベストプラクティス
export const moduleChunks = {
  // 見積関連（最も使用頻度が高い）
  estimate: () => import('../components/estimates/EstimateCreator'),
  estimateList: () => import('../components/estimates/EstimateList'),
  estimatePDF: () => import('../components/estimates/EstimatePDFGenerator'),

  // 請求書関連（頻度中）
  invoice: () => import('../components/invoices/InvoiceForm'),
  invoiceList: () => import('../components/invoices/InvoiceList'),

  // 管理機能（頻度低）
  admin: () => import('../components/admin/AdminPanel'),
  settings: () => import('../components/settings/SettingsPanel'),

  // テスト/デバッグ関連（開発時のみ）
  test: () =>
    process.env.NODE_ENV === 'development'
      ? import('../components/test/TestSuite')
      : Promise.resolve(null),
};

// プリロード戦略
export const preloadStrategy = {
  // 高優先度コンポーネントの事前読み込み
  preloadCritical: () => {
    if (typeof window !== 'undefined') {
      // メインの見積機能を事前読み込み
      moduleChunks.estimate();
      moduleChunks.estimateList();
    }
  },

  // ユーザー操作に基づく予測読み込み
  preloadOnInteraction: section => {
    const preloadMap = {
      'estimate-button': moduleChunks.estimate,
      'invoice-button': moduleChunks.invoice,
      'admin-link': moduleChunks.admin,
    };

    if (preloadMap[section]) {
      preloadMap[section]();
    }
  },

  // アイドル時間での読み込み
  preloadOnIdle: () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        moduleChunks.invoice();
        moduleChunks.settings();
      });
    } else {
      setTimeout(() => {
        moduleChunks.invoice();
        moduleChunks.settings();
      }, 2000);
    }
  },
};

// Tree Shaking最適化用のユーティリティ
export const treeShakingOptimizations = {
  // 使用する機能のみエクスポート
  dateUtils: {
    formatJapaneseDate: date => {
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    },

    formatCurrency: amount => {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(amount);
    },
  },

  // 軽量な検証関数
  validation: {
    isEmail: email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isPhoneNumber: phone => /^[\d-+()]+$/.test(phone),
    isNotEmpty: value => value != null && value.toString().trim() !== '',
  },
};

// Bundle分析用のメトリクス
export const bundleMetrics = {
  // パフォーマンス監視
  measureLoadTime: (componentName, loadPromise) => {
    const startTime = performance.now();

    return loadPromise.then(module => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`Bundle ${componentName} loaded in ${loadTime.toFixed(2)}ms`);

      // プロダクションでは分析サービスに送信
      if (process.env.NODE_ENV === 'production') {
        // analytics.track('bundle_load_time', { componentName, loadTime });
      }

      return module;
    });
  },

  // メモリ使用量監視
  measureMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2),
      };
    }
    return null;
  },
};

// リソース優先度の設定
export const resourcePriority = {
  // 重要なリソースの優先読み込み
  preloadCriticalCSS: () => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = '/static/css/critical.css';
    document.head.appendChild(link);
  },

  // フォントの最適化
  preloadFonts: () => {
    const fontPreloads = ['/fonts/noto-sans-jp-regular.woff2', '/fonts/noto-sans-jp-bold.woff2'];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = font;
      document.head.appendChild(link);
    });
  },
};

// 初期化
export const initBundleOptimization = () => {
  // クリティカルリソースの事前読み込み
  preloadStrategy.preloadCritical();
  resourcePriority.preloadCriticalCSS();
  resourcePriority.preloadFonts();

  // アイドル時の追加読み込み
  preloadStrategy.preloadOnIdle();

  // インタラクションイベントの設定
  document.addEventListener('mouseover', event => {
    const target = event.target.closest('[data-preload]');
    if (target) {
      const preloadKey = target.dataset.preload;
      preloadStrategy.preloadOnInteraction(preloadKey);
    }
  });

  // メトリクス収集の開始
  setInterval(() => {
    const memoryUsage = bundleMetrics.measureMemoryUsage();
    if (memoryUsage && memoryUsage.usage > 80) {
      console.warn('High memory usage detected:', memoryUsage);
    }
  }, 30000); // 30秒ごと
};

export default {
  loadComponent,
  createLazyComponent,
  conditionalImport,
  optimizedImports,
  moduleChunks,
  preloadStrategy,
  treeShakingOptimizations,
  bundleMetrics,
  resourcePriority,
  initBundleOptimization,
};
