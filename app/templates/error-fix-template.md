# 🚨 エラー修正テンプレート

## 📋 PRESIDENTから「エラー修正」指示が出た場合の手順

### 🎯 基本方針
- **ユーザー第一主義**: ユーザーが利用する上で全く支障が出ないようにする
- **無料対策優先**: 無料でできるあらゆる策を講じる
- **徹底的な品質確保**: PC、タブレット、スマホ全てで完璧に動作

### 📱 デバイス別チェックリスト

#### PC表示（デスクトップ）
- [ ] Chrome最新版での動作確認
- [ ] Firefox最新版での動作確認
- [ ] Safari最新版での動作確認（Mac）
- [ ] Edge最新版での動作確認
- [ ] 画面幅1920px、1366px、1024pxでの表示確認
- [ ] マウス操作の全機能確認
- [ ] キーボードショートカットの動作確認

#### タブレット表示
- [ ] iPad（縦・横）での表示確認
- [ ] Android タブレット（縦・横）での表示確認
- [ ] タッチ操作の全機能確認
- [ ] 画面回転時の表示崩れチェック
- [ ] ソフトウェアキーボード表示時のレイアウト確認

#### スマートフォン表示
- [ ] iPhone各種サイズでの表示確認
- [ ] Android各種サイズでの表示確認
- [ ] タッチ操作の反応性確認
- [ ] スクロール時のパフォーマンス確認
- [ ] 画面の小ささを考慮したUI/UX確認

### 🔍 エラーチェック手順

#### 1. エラーログの完全分析
```bash
# ブラウザコンソールエラーチェック
# - JavaScriptエラー
# - ネットワークエラー（404, 500等）
# - CSPエラー
# - 非推奨警告

# サーバーログチェック
tail -f logs/error.log
tail -f logs/access.log

# アプリケーションログチェック
grep -i "error\|exception\|fatal" logs/*.log
```

#### 2. 静的解析ツールの実行
```bash
# ESLint（JavaScript）
npm run lint

# StyleLint（CSS）
npm run stylelint

# TypeScript型チェック
npm run type-check

# セキュリティ監査
npm audit
```

#### 3. 自動テストの実行
```bash
# ユニットテスト
npm test

# E2Eテスト（複数ブラウザ）
npm run e2e:chrome
npm run e2e:firefox
npm run e2e:safari

# レスポンシブテスト
npm run test:responsive
```

### 🛡️ 予防策の実装

#### 1. エラーハンドリングの強化
```javascript
// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // エラーレポート送信（無料サービス利用）
    reportError(event.error);
});

// Promise拒否ハンドラー
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// try-catch による個別エラー処理
try {
    // リスクのある処理
} catch (error) {
    console.error('Specific error:', error);
    // フォールバック処理
    handleErrorGracefully(error);
}
```

#### 2. フォールバック実装
```javascript
// 画像読み込みエラー対策
<img src="main.jpg" onerror="this.src='fallback.jpg'" alt="説明">

// フォント読み込みエラー対策
@font-face {
    font-family: 'CustomFont';
    src: url('custom.woff2') format('woff2'),
         url('custom.woff') format('woff');
    font-display: swap; /* フォールバックフォントを即座に表示 */
}

// ネットワークエラー対策
fetch(url)
    .then(response => response.json())
    .catch(error => {
        // オフライン時はキャッシュから
        return getCachedData();
    });
```

#### 3. パフォーマンス最適化
```javascript
// 遅延読み込み
<img loading="lazy" src="image.jpg">

// Critical CSS のインライン化
<style>
/* 初期表示に必要な最小限のCSS */
</style>

// JavaScriptの非同期読み込み
<script async src="script.js"></script>
```

### 📊 レポート作成

#### エラー修正完了報告テンプレート
```markdown
## エラー修正完了報告

### 修正内容
- 修正したエラー: [エラー内容]
- 原因: [根本原因]
- 対策: [実施した対策]

### 動作確認結果
#### PC
- Chrome: ✅ 正常動作
- Firefox: ✅ 正常動作
- Safari: ✅ 正常動作
- Edge: ✅ 正常動作

#### タブレット
- iPad: ✅ 正常動作
- Android: ✅ 正常動作

#### スマートフォン
- iPhone: ✅ 正常動作
- Android: ✅ 正常動作

### 予防策
1. [実装した予防策1]
2. [実装した予防策2]
3. [実装した予防策3]

### パフォーマンス改善
- 読み込み時間: 改善前 3.2秒 → 改善後 1.8秒
- エラー率: 改善前 0.5% → 改善後 0.01%
```

### 🔧 Worker間の連携

```bash
# worker1: エラー分析担当
./agent-send.sh $PROJECT_NAME worker1 "エラーログを分析し、原因を特定してください"

# worker2: PC対応担当
./agent-send.sh $PROJECT_NAME worker2 "PC環境でのエラー修正と動作確認を実施してください"

# worker3: タブレット対応担当
./agent-send.sh $PROJECT_NAME worker3 "タブレット環境でのエラー修正と動作確認を実施してください"

# worker4: スマホ対応担当
./agent-send.sh $PROJECT_NAME worker4 "スマートフォン環境でのエラー修正と動作確認を実施してください"

# worker5: 予防策実装担当
./agent-send.sh $PROJECT_NAME worker5 "エラー予防策の実装とテストを実施してください"
```

### 💡 無料ツール活用

1. **エラー監視**: Sentry (無料プラン)
2. **パフォーマンス監視**: Google PageSpeed Insights
3. **ブラウザテスト**: BrowserStack (無料トライアル)
4. **レスポンシブチェック**: Chrome DevTools
5. **アクセシビリティ**: WAVE, axe DevTools

### ⚠️ 重要な注意事項

1. **データ保護**: エラー修正時もユーザーデータを保護
2. **後方互換性**: 既存機能を壊さない
3. **段階的修正**: 大きな変更は段階的に実施
4. **ロールバック準備**: いつでも元に戻せる状態を維持
5. **ユーザー通知**: 必要に応じてメンテナンス告知