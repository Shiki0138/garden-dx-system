# 🚨 デプロイエラー防止ルール徹底ガイド

## 📋 はじめに
本番環境でのエラーゼロを目指すための徹底的なデプロイエラー防止ルールです。**本番エラーゼロ厳守！**

## 🔧 1. Vercel環境変数設定（NEXT_PUBLIC_プレフィックス必須）

### ✅ 必須環境変数
```bash
# Supabase設定（本番・プレビュー・開発環境別）
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 環境識別
REACT_APP_ENVIRONMENT=production
REACT_APP_API_BASE_URL=https://your-project.supabase.co/rest/v1

# セキュリティ設定
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_LOG_LEVEL=error
```

### ⚠️ 環境変数命名規則
- **Create React App**: `REACT_APP_` プレフィックス必須
- **Next.js**: `NEXT_PUBLIC_` プレフィックス必須（将来移行時）
- パブリック変数のみブラウザで利用可能
- 秘密鍵は**絶対に**REACT_APP_プレフィックスを使用しない

### 🛠️ Vercel設定手順
```bash
# Vercel CLI使用
vercel env add REACT_APP_SUPABASE_URL production
vercel env add REACT_APP_SUPABASE_ANON_KEY production

# またはVercel Dashboard > Settings > Environment Variables
```

## 🔐 2. SupabaseクライアントCORS設定確認

### ✅ Supabase CORS設定
```sql
-- RLS（Row Level Security）有効化
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- CORS許可ドメイン設定
-- Supabase Dashboard > Settings > API > CORS Origins
https://your-app.vercel.app
https://your-app-*.vercel.app
http://localhost:3000
```

### 🚨 セキュリティチェックリスト
- [ ] RLS（Row Level Security）全テーブル有効
- [ ] anon keyの適切な権限設定
- [ ] service_role keyの本番環境のみ使用
- [ ] API Rate Limiting設定
- [ ] JWT Secret確認

## 🔨 3. ビルド時CI=false設定で警告無視

### ✅ ビルド設定
```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:production": "CI=false npm run build",
    "build:analyze": "npm run build && npx source-map-explorer 'build/static/js/*.js'"
  }
}
```

### 🚨 Vercel Build Command設定
```bash
# Vercel設定
Build Command: CI=false npm run build
Output Directory: build
Install Command: npm install --production=false
```

### ⚠️ ESLint警告対策
```javascript
// .eslintrc.js またはpackage.json
{
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ],
    "rules": {
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": "warn"
    }
  }
}
```

## 🛡️ 4. 全APIコールにタイムアウト・エラーハンドリング実装

### ✅ APIエラーハンドリング実装状況
- [x] `apiErrorHandler.js` - タイムアウト・リトライ機能
- [x] `supabaseApi.js` - 全API呼び出しでエラーハンドリング使用
- [x] `ErrorBoundary.jsx` - React エラーバウンダリー
- [x] `supabase.js` - 接続状態チェック・フォールバック

### 🔧 タイムアウト設定
```javascript
// APIタイムアウト設定（30秒）
export const API_TIMEOUT = 30000;

// リトライ設定
const maxRetries = 3;
const retryDelay = 1000;

// 使用例
await apiCallWithTimeout(async () => {
  return supabase.from('estimates').select('*');
}, { timeout: 30000 });
```

### 🚨 エラーハンドリングパターン
```javascript
// 1. タイムアウトエラー
if (error.name === 'AbortError') {
  throw new Error('リクエストがタイムアウトしました');
}

// 2. ネットワークエラー
if (error.message === 'Failed to fetch') {
  throw new Error('ネットワークエラーが発生しました');
}

// 3. 認証エラー
if (error.code === 'PGRST301') {
  throw new Error('認証エラーが発生しました');
}
```

## 🔍 5. プレビューデプロイでテスト後本番へ

### ✅ デプロイフロー
```bash
# 1. ローカル環境でビルドテスト
npm run build:production
npm run preview

# 2. プレビューデプロイ
git push origin feature/your-feature
# → Vercel自動プレビューデプロイ

# 3. プレビュー環境テスト
# → https://your-app-git-feature-your-feature.vercel.app

# 4. 本番デプロイ
git push origin main
# → Vercel自動本番デプロイ
```

### 🧪 プレビュー環境テストチェックリスト
- [ ] 認証フロー動作確認
- [ ] PDF生成機能テスト
- [ ] API呼び出し成功確認
- [ ] 環境変数読み込み確認
- [ ] エラーハンドリング動作確認
- [ ] レスポンス速度確認

## 🚀 6. CI/CD Pipeline実装

### ✅ GitHub Actions設定（.github/workflows/deploy.yml）
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      # テスト実行
      - run: npm ci
      - run: npm run test -- --watchAll=false
      - run: npm run build:production
      
      # セキュリティスキャン
      - run: npm audit
      
      # Vercelデプロイ
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔒 7. セキュリティ対策

### ✅ 実装済みセキュリティ機能
- [x] Row Level Security（RLS）
- [x] JWT認証
- [x] CORS設定
- [x] 環境変数暗号化
- [x] CSP（Content Security Policy）ヘッダー

### 🛡️ セキュリティヘッダー設定（vercel.json）
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 📊 8. 監視・ログ機能

### ✅ 実装済み監視機能
- [x] エラーバウンダリーでのクライアントエラー捕捉
- [x] API呼び出しエラーログ
- [x] 環境変数チェック機能
- [x] Supabase接続状態監視

### 📈 エラー報告実装
```javascript
// ErrorBoundary.jsx内
reportErrorToService = (error, errorInfo) => {
  const errorReport = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    environment: process.env.REACT_APP_ENVIRONMENT
  };
  
  // 将来: Sentry等のエラー監視サービスに送信
  console.log('Error Report:', errorReport);
};
```

## 🎯 9. パフォーマンス最適化

### ✅ 実装済み最適化
- [x] バンドルサイズ最適化（322.73 kB）
- [x] 遅延ローディング
- [x] エラー処理の軽量化
- [x] Supabaseクライアント設定最適化

### 📊 パフォーマンス目標
- バンドルサイズ: < 400 kB
- 初回ロード時間: < 3秒
- API レスポンス: < 2秒
- エラー率: < 0.1%

## ✅ 10. デプロイ前最終チェックリスト

### 🔍 必須確認項目
- [ ] 全環境変数設定完了
- [ ] ビルドエラーゼロ
- [ ] ESLintエラーゼロ
- [ ] テスト全項目パス
- [ ] プレビュー環境動作確認
- [ ] セキュリティスキャン完了
- [ ] パフォーマンス要件クリア

### 🚨 緊急時対応手順
1. **即座にロールバック**: `vercel rollback`
2. **エラー分析**: Vercel Logs確認
3. **修正デプロイ**: Hotfix branchで対応
4. **事後報告**: エラー原因・対策記録

## 📞 11. サポート・連絡先

### 🛠️ トラブルシューティング
- Vercel Status: https://vercel-status.com/
- Supabase Status: https://status.supabase.io/
- GitHub Status: https://githubstatus.com/

### 📚 参考ドキュメント
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Supabase React Guide](https://supabase.io/docs/guides/with-react)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)

---

**🎯 最重要:** このルールに従って、**本番エラーゼロ**を達成してください！