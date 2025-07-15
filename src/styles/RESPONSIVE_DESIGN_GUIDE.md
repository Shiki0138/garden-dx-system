# Garden DX - レスポンシブデザイン統一ガイド

## 概要

このガイドは、Garden
DXプロジェクトで統一されたレスポンシブデザインを実現するための包括的な指針です。

## 統一ブレークポイント

### 標準ブレークポイント

| デバイス    | 幅       | 説明                 |
| ----------- | -------- | -------------------- |
| XS (極小)   | 〜359px  | 極小スマートフォン   |
| SM (小)     | 360px〜  | スマートフォン       |
| MD (中)     | 480px〜  | 大きめスマートフォン |
| LG (大)     | 768px〜  | タブレット           |
| XL (特大)   | 1024px〜 | 大きめタブレット     |
| XXL (超大)  | 1200px〜 | デスクトップ         |
| XXXL (最大) | 1400px〜 | 大きめデスクトップ   |

### 使用方法

#### CSS Variables (推奨)

```css
/* CSSファイルで */
@media (max-width: 768px) {
  .component {
    padding: var(--spacing-md, 16px);
    font-size: var(--font-sm, 14px);
  }
}
```

#### Styled Components

```javascript
// JSXファイルで
import { breakpoints } from '../styles/breakpoints';

const Component = styled.div`
  padding: 24px;

  ${breakpoints.tablet} {
    padding: 16px;
  }

  ${breakpoints.mobile} {
    padding: 12px;
  }
`;
```

## 統一設計原則

### 1. モバイルファースト

- 最小画面から設計開始
- 段階的に大画面対応
- パフォーマンス重視

### 2. タッチターゲットサイズ

- **最小**: 44px × 44px (WCAG AA準拠)
- **モバイル**: 48px × 48px (推奨)
- **快適**: 56px × 56px (理想)

### 3. フォントサイズ

```css
:root {
  --font-xs: 12px; /* 補助テキスト */
  --font-sm: 14px; /* 小さなテキスト */
  --font-md: 16px; /* 標準テキスト（iOS Safari ズーム回避） */
  --font-lg: 18px; /* 大きなテキスト */
  --font-xl: 20px; /* 見出し */
  --font-xxl: 24px; /* 大見出し */
  --font-xxxl: 32px; /* 特大見出し */
}
```

### 4. スペーシング

```css
:root {
  --spacing-xs: 4px; /* 極小間隔 */
  --spacing-sm: 8px; /* 小間隔 */
  --spacing-md: 16px; /* 標準間隔 */
  --spacing-lg: 24px; /* 大間隔 */
  --spacing-xl: 32px; /* 特大間隔 */
  --spacing-xxl: 48px; /* 超大間隔 */
}
```

## デバイス別最適化

### スマートフォン (〜768px)

```css
@media (max-width: 768px) {
  /* 必須対応項目 */
  .touch-target {
    min-height: var(--touch-target-mobile, 48px);
  }

  .container {
    padding: 0 var(--container-padding-mobile, 16px);
  }

  .text-input {
    font-size: var(--font-md, 16px); /* iOS ズーム回避 */
  }
}
```

### タブレット (768px〜1024px)

```css
@media (min-width: 768px) and (max-width: 1024px) {
  /* タブレット特有の調整 */
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### デスクトップ (1200px〜)

```css
@media (min-width: 1200px) {
  .container {
    max-width: var(--container-max-width, 1200px);
  }
}
```

## 共通パターン

### 1. フレキシブルグリッド

```css
.responsive-grid {
  display: grid;
  gap: var(--spacing-md, 16px);
  grid-template-columns: 1fr;
}

@media (min-width: 480px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1200px) {
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### 2. レスポンシブテキスト

```css
.responsive-text {
  font-size: var(--font-sm, 14px);
}

@media (min-width: 480px) {
  .responsive-text {
    font-size: var(--font-md, 16px);
  }
}

@media (min-width: 768px) {
  .responsive-text {
    font-size: var(--font-lg, 18px);
  }
}
```

### 3. 適応的ナビゲーション

```css
.nav-menu {
  display: none; /* モバイルでは隠す */
}

.mobile-menu-toggle {
  display: block;
}

@media (min-width: 768px) {
  .nav-menu {
    display: flex;
  }

  .mobile-menu-toggle {
    display: none;
  }
}
```

## テスト要件

### 1. デバイステスト

- iPhone SE (375px)
- iPhone 12 (390px)
- iPad (768px)
- iPad Pro (1024px)
- Desktop (1200px+)

### 2. ブラウザテスト

- Safari (iOS)
- Chrome (Android)
- Edge (Desktop)
- Firefox (Desktop)

### 3. 機能テスト

- タッチ操作
- キーボードナビゲーション
- スクリーンリーダー
- ズーム (200%まで)

## パフォーマンス最適化

### 1. メディアクエリの最適化

```css
/* 良い例: モバイルファースト */
.component {
  padding: 12px; /* デフォルト（モバイル） */
}

@media (min-width: 768px) {
  .component {
    padding: 24px; /* タブレット以上 */
  }
}

/* 悪い例: デスクトップファースト */
.component {
  padding: 24px; /* デスクトップ前提 */
}

@media (max-width: 767px) {
  .component {
    padding: 12px; /* モバイル向け修正 */
  }
}
```

### 2. 条件付きローディング

```javascript
// 大きな画面でのみ重いコンポーネントをロード
const HeavyComponent = lazy(() =>
  window.innerWidth > 768
    ? import('./HeavyComponent')
    : import('./LightComponent')
);
```

## アクセシビリティ

### 1. フォーカス管理

```css
.focusable:focus {
  outline: 3px solid var(--garden-primary, #2d5016);
  outline-offset: 2px;
}

/* キーボードユーザーのみにフォーカス表示 */
.focusable:focus:not(:focus-visible) {
  outline: none;
}
```

### 2. 十分なコントラスト

```css
:root {
  --text-color: #333333; /* 4.5:1 以上 */
  --bg-color: #ffffff;
  --link-color: #0066cc; /* 4.5:1 以上 */
}
```

### 3. スキップリンク

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--garden-primary);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 4px;
}

.skip-link:focus {
  top: 0;
}
```

## デバッグツール

### 1. ブレークポイント表示

```html
<!-- 開発時のみ表示 -->
<div class="debug-breakpoints"></div>
```

### 2. グリッド可視化

```css
.debug-grid {
  background-image:
    linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

## チェックリスト

### 設計段階

- [ ] モバイルファーストで設計
- [ ] 統一ブレークポイント使用
- [ ] タッチターゲットサイズ確保
- [ ] フォントサイズ適切
- [ ] コントラスト比確保

### 実装段階

- [ ] CSS変数活用
- [ ] メディアクエリ最適化
- [ ] パフォーマンス考慮
- [ ] アクセシビリティ対応

### テスト段階

- [ ] 複数デバイステスト
- [ ] ブラウザ横断テスト
- [ ] キーボード操作テスト
- [ ] スクリーンリーダーテスト
- [ ] ズームテスト (200%)

## トラブルシューティング

### よくある問題と解決策

#### iOS Safari のズーム問題

```css
/* 解決策: font-size を 16px 以上に */
input {
  font-size: 16px;
}
```

#### Android Chrome のビューポート問題

```html
<!-- 解決策: ビューポート設定 -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, shrink-to-fit=no"
/>
```

#### Internet Explorer の CSS Grid 問題

```css
/* 解決策: フォールバック提供 */
.grid {
  display: flex;
  flex-wrap: wrap;
}

@supports (display: grid) {
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}
```

## まとめ

統一されたレスポンシブデザインシステムにより：

1. **一貫性**: 全画面サイズで統一された体験
2. **効率性**: 開発・保守の効率化
3. **品質**: 高いアクセシビリティとパフォーマンス
4. **将来性**: 新デバイス対応の容易さ

このガイドに従って実装することで、Garden
DXは全てのユーザーにとって最適な体験を提供できます。
