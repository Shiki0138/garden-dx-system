/**
 * Garden DX - モバイル最適化用共通定数
 * iOS自動ズーム防止とタッチ操作最適化のための設定
 */

// ブレークポイント
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

// フォントサイズ（iOS自動ズーム防止のため16px以上）
export const FONT_SIZES = {
  xs: '14px',     // 補助テキスト用（重要でない情報）
  sm: '16px',     // 最小推奨サイズ
  base: '16px',   // 基本サイズ
  md: '18px',     // 中サイズ
  lg: '20px',     // 大サイズ
  xl: '24px',     // 特大サイズ
  '2xl': '28px',  // 見出し用
  '3xl': '32px',  // 大見出し用
};

// タッチターゲットサイズ（最小44px）
export const TOUCH_SIZES = {
  small: '44px',   // 最小推奨サイズ
  medium: '48px',  // 標準サイズ
  large: '56px',   // 大きめサイズ
  xlarge: '64px',  // 特大サイズ（FABなど）
};

// スペーシング
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
};

// モバイル最適化スタイル
export const MOBILE_STYLES = {
  // iOS自動ズーム防止
  preventZoom: `
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
  `,
  
  // タッチ最適化
  touchOptimized: `
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  `,
  
  // セーフエリア対応
  safeArea: `
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
  `,
  
  // キーボード対応
  keyboardAware: `
    padding-bottom: env(keyboard-inset-height, 0);
  `,
  
  // スクロール最適化
  smoothScroll: `
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  `,
  
  // 入力フィールド最適化
  inputOptimized: `
    font-size: 16px;
    padding: 12px 16px;
    min-height: 48px;
    -webkit-appearance: none;
    -webkit-border-radius: 8px;
    border-radius: 8px;
  `,
  
  // ボタン最適化
  buttonOptimized: `
    min-height: 48px;
    min-width: 48px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: 500;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    cursor: pointer;
    
    &:active {
      transform: scale(0.98);
    }
  `,
};

// レスポンシブヘルパー
export const mediaQuery = {
  mobile: `@media (max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `@media (min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.tablet + 1}px)`,
  notMobile: `@media (min-width: ${BREAKPOINTS.mobile + 1}px)`,
};

// z-index階層
export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  loading: 90,
};

// アニメーション設定
export const ANIMATION = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// カラーパレット（アクセシビリティ考慮）
export const COLORS = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  error: '#ef4444',
  errorDark: '#dc2626',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
  black: '#000000',
};

// アクセシビリティ設定
export const A11Y = {
  // コントラスト比（WCAG AA準拠）
  contrastRatio: {
    normal: 4.5,
    large: 3,
  },
  // フォーカススタイル
  focusStyle: `
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  `,
  // スクリーンリーダー専用
  visuallyHidden: `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `,
};