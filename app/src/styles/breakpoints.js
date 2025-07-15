/**
 * Garden DXシステム - Styled Components用ブレークポイントユーティリティ
 * 統一的なレスポンシブデザインを提供
 *
 * 使用例:
 * const Component = styled.div`
 *   ${breakpoints.mobile} {
 *     padding: 16px;
 *   }
 *   ${breakpoints.tablet} {
 *     padding: 24px;
 *   }
 * `;
 */

// ブレークポイント定義
const breakpointValues = {
  mobile: 360, // 極小スマートフォン
  mobileL: 480, // 大きめスマートフォン
  tablet: 768, // タブレット
  tabletL: 1024, // 大きめタブレット
  desktop: 1200, // デスクトップ
  desktopL: 1400, // 大きめデスクトップ
};

// メディアクエリ生成関数
const createMediaQuery = size => `@media (max-width: ${size}px)`;
const createMinMediaQuery = size => `@media (min-width: ${size}px)`;

// ブレークポイントオブジェクト
export const breakpoints = {
  // max-width メディアクエリ
  mobile: createMediaQuery(breakpointValues.mobile),
  mobileL: createMediaQuery(breakpointValues.mobileL),
  tablet: createMediaQuery(breakpointValues.tablet),
  tabletL: createMediaQuery(breakpointValues.tabletL),
  desktop: createMediaQuery(breakpointValues.desktop),
  desktopL: createMediaQuery(breakpointValues.desktopL),

  // min-width メディアクエリ
  minMobile: createMinMediaQuery(breakpointValues.mobile),
  minMobileL: createMinMediaQuery(breakpointValues.mobileL),
  minTablet: createMinMediaQuery(breakpointValues.tablet),
  minTabletL: createMinMediaQuery(breakpointValues.tabletL),
  minDesktop: createMinMediaQuery(breakpointValues.desktop),
  minDesktopL: createMinMediaQuery(breakpointValues.desktopL),

  // カスタムブレークポイント
  custom: size => createMediaQuery(size),
  customMin: size => createMinMediaQuery(size),

  // 範囲指定
  between: (min, max) => `@media (min-width: ${min}px) and (max-width: ${max}px)`,

  // 特殊メディアクエリ
  landscape: '@media (orientation: landscape)',
  portrait: '@media (orientation: portrait)',
  print: '@media print',
  retina: '@media (min-resolution: 2dppx)',

  // モバイル特有
  mobileKeyboard: '@media (max-width: 768px) and (max-height: 600px)',
  touchDevice: '@media (hover: none) and (pointer: coarse)',
  hoverDevice: '@media (hover: hover) and (pointer: fine)',
};

// ブレークポイント値のエクスポート
export { breakpointValues };

// コンテナ設定
export const container = {
  maxWidth: '1200px',
  padding: '20px',
  paddingMobile: '16px',
  paddingSmall: '12px',
};

// 共通スペーシング
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// フォントサイズ
export const fontSize = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
};

// タッチターゲットサイズ
export const touchTarget = {
  min: '44px', // WCAG AA推奨
  mobile: '48px', // モバイル推奨
  comfortable: '56px', // 快適操作
};

// テーマカラー
export const colors = {
  primary: '#2d5016',
  primaryLight: '#4a7c59',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  black: '#000000',
};

// レスポンシブヘルパー関数
export const responsive = {
  // モバイルファースト
  mobile: styles => `
    ${styles}
    ${breakpoints.minMobileL} {
      ${styles}
    }
  `,

  // タブレットファースト
  tablet: styles => `
    ${breakpoints.minTablet} {
      ${styles}
    }
  `,

  // デスクトップファースト
  desktop: styles => `
    ${breakpoints.minDesktop} {
      ${styles}
    }
  `,

  // 条件付きスタイル
  onlyMobile: styles => `
    ${breakpoints.tablet} {
      ${styles}
    }
  `,

  onlyTablet: styles => `
    ${breakpoints.between(breakpointValues.tablet, breakpointValues.desktop)} {
      ${styles}
    }
  `,

  onlyDesktop: styles => `
    ${breakpoints.minDesktop} {
      ${styles}
    }
  `,
};

// グリッドシステム
export const grid = {
  columns: 12,
  gutter: '20px',
  gutterMobile: '16px',

  // フレックスボックスユーティリティ
  flex: {
    center: `
      display: flex;
      align-items: center;
      justify-content: center;
    `,
    between: `
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    column: `
      display: flex;
      flex-direction: column;
    `,
    wrap: `
      display: flex;
      flex-wrap: wrap;
    `,
  },
};

// ボタンスタイル
export const buttons = {
  base: `
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: ${touchTarget.min};
    touch-action: manipulation;
    user-select: none;
    
    ${breakpoints.tablet} {
      padding: 14px 20px;
      min-height: ${touchTarget.mobile};
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,

  primary: `
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #0056b3, #004085);
      transform: translateY(-1px);
    }
  `,

  secondary: `
    background: ${colors.secondary};
    color: white;
    
    &:hover:not(:disabled) {
      background: #5a6268;
      transform: translateY(-1px);
    }
  `,
};

// アニメーション
export const animations = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

  slideUp: `
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
};

// デフォルトエクスポート
export default {
  breakpoints,
  breakpointValues,
  container,
  spacing,
  fontSize,
  touchTarget,
  colors,
  responsive,
  grid,
  buttons,
  animations,
};
