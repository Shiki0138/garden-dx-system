/**
 * Garden DX - グローバルモバイルスタイル
 * 全体的なモバイル最適化のためのスタイル設定
 */

import { createGlobalStyle } from 'styled-components';
import { FONT_SIZES, COLORS, MOBILE_STYLES, mediaQuery } from './mobileConstants';

const GlobalMobileStyles = createGlobalStyle`
  /* ベースのリセットとモバイル最適化 */
  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  /* iOS自動ズーム防止 */
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ルート要素のフォントサイズ設定 */
  :root {
    font-size: 16px; /* iOS自動ズーム防止のため16px以上 */
  }

  /* ボディのベーススタイル */
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: ${FONT_SIZES.base};
    line-height: 1.5;
    color: ${COLORS.gray[800]};
    background-color: ${COLORS.white};
    
    /* スムーズスクロール */
    ${MOBILE_STYLES.smoothScroll}
  }

  /* 入力フィールドのデフォルトスタイル */
  input, textarea, select {
    font-family: inherit;
    font-size: ${FONT_SIZES.base};
    line-height: inherit;
    color: inherit;
    
    /* iOS自動ズーム防止 */
    ${mediaQuery.mobile} {
      font-size: 16px !important;
    }
  }

  /* ボタンのデフォルトスタイル */
  button {
    font-family: inherit;
    cursor: pointer;
    ${MOBILE_STYLES.touchOptimized}
  }

  /* リンクのデフォルトスタイル */
  a {
    color: ${COLORS.primary};
    text-decoration: none;
    ${MOBILE_STYLES.touchOptimized}
    
    &:hover {
      text-decoration: underline;
    }
    
    &:active {
      opacity: 0.8;
    }
  }

  /* フォーカススタイル（アクセシビリティ） */
  :focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }

  /* スクロールバーのスタイル */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${COLORS.gray[100]};
  }

  ::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[400]};
    border-radius: 4px;
    
    &:hover {
      background: ${COLORS.gray[500]};
    }
  }

  /* モバイルでのスクロールバー非表示 */
  ${mediaQuery.mobile} {
    ::-webkit-scrollbar {
      display: none;
    }
    
    * {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }

  /* セーフエリア対応 */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .safe-area-left {
    padding-left: env(safe-area-inset-left);
  }

  .safe-area-right {
    padding-right: env(safe-area-inset-right);
  }

  /* キーボード表示時の調整 */
  .keyboard-aware {
    ${MOBILE_STYLES.keyboardAware}
  }

  /* モバイル用ユーティリティクラス */
  ${mediaQuery.mobile} {
    .mobile-only {
      display: block !important;
    }
    
    .desktop-only {
      display: none !important;
    }
    
    .mobile-full-width {
      width: 100% !important;
    }
    
    .mobile-text-center {
      text-align: center !important;
    }
  }

  ${mediaQuery.notMobile} {
    .mobile-only {
      display: none !important;
    }
    
    .desktop-only {
      display: block !important;
    }
  }

  /* アニメーション設定 */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* プリント時のスタイル */
  @media print {
    * {
      background: transparent !important;
      color: black !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    
    a,
    a:visited {
      text-decoration: underline;
    }
    
    a[href]:after {
      content: " (" attr(href) ")";
    }
    
    abbr[title]:after {
      content: " (" attr(title) ")";
    }
    
    img {
      max-width: 100% !important;
    }
    
    p,
    h2,
    h3 {
      orphans: 3;
      widows: 3;
    }
    
    h2,
    h3 {
      page-break-after: avoid;
    }
  }
`;

export default GlobalMobileStyles;