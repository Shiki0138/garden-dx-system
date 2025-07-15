# 🚀 Vercel本番環境セットアップ - 本日18:00締切

## 📋 即座に実行する手順

### 1. Vercelプロジェクト作成
```bash
# Vercel CLIでプロジェクト作成
cd app
vercel
# ↓ 設定時の回答
# Set up and deploy "app"? [Y/n] y
# Which scope do you want to deploy to? [個人アカウント選択]
# Link to existing project? [N/y] n
# What's your project's name? garden-estimate-system
# In which directory is your code located? ./
# Want to override the settings? [y/N] y
```

### 2. 本番環境変数設定
Vercelダッシュボードで以下を設定：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| REACT_APP_SUPABASE_URL | https://ppplfluvazaufassdkra.supabase.co | Production |
| REACT_APP_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcGxmbHV2YXphdWZhc3Nka3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5NjczOTYsImV4cCI6MjAzNTU0MzM5Nn0.IWHrTSjfE-fKKgJOVXHECtWo8DGOLGe0Nx0z-vbpyWQ | Production |
| REACT_APP_API_BASE_URL | https://ppplfluvazaufassdkra.supabase.co | Production |
| REACT_APP_DEMO_MODE | false | Production |
| REACT_APP_ENVIRONMENT | production | Production |
| CI | false | Production |
| GENERATE_SOURCEMAP | false | Production |

### 3. カスタムドメイン設定
```bash
# ドメイン追加（例）
vercel domains add garden-dx.vercel.app
vercel domains add teisou-system.vercel.app

# DNS設定確認
vercel dns
```

### 4. SSL証明書自動設定
- Vercelが自動でLet's Encrypt証明書を発行
- HTTPS強制リダイレクト自動設定
- HSTS設定済み

### 5. 本番デプロイ実行
```bash
# 本番デプロイ
vercel --prod

# デプロイ状況確認
vercel ls
```

## 🔧 Vercel Analytics有効化

### ダッシュボード設定
1. Vercelダッシュボード → プロジェクト選択
2. Analytics タブ → Enable Analytics
3. Speed Insights → Enable
4. Web Vitals → Enable

### コード統合（必要に応じて）
```javascript
// app/src/index.js に追加
import { Analytics } from '@vercel/analytics/react';

// App コンポーネントに追加
<Analytics />
```

## 📊 本番環境監視設定

### Vercelダッシュボード設定
- Functions: 監視有効化
- Analytics: Core Web Vitals監視
- Speed Insights: パフォーマンス監視
- Deployments: デプロイ履歴監視

### アラート設定
```bash
# Vercel CLI でアラート設定
vercel env add ALERT_EMAIL your-email@domain.com
```

## 🔍 デプロイ後確認チェックリスト

### 必須確認項目
- [ ] HTTPS アクセス確認
- [ ] デモモード無効確認
- [ ] 見積機能動作確認
- [ ] PDF生成確認
- [ ] 認証機能確認
- [ ] Supabase接続確認

### パフォーマンステスト
```bash
# Lighthouse監査
npx lighthouse https://your-domain.vercel.app --output=json

# Core Web Vitals確認
curl -I https://your-domain.vercel.app
```

## 🚨 緊急時対応

### ロールバック
```bash
# 前のデプロイメントにロールバック
vercel rollback [deployment-url]
```

### 障害対応
1. Vercelステータス確認: https://vercel-status.com/
2. デプロイログ確認: vercel logs
3. 環境変数確認: vercel env ls

---

## ⏰ 本日のスケジュール

- **12:00** - Vercelプロジェクト作成完了
- **13:00** - 環境変数設定完了  
- **14:00** - 初回デプロイ完了
- **15:00** - 動作確認完了
- **16:00** - 最終テスト完了
- **17:30** - 本番公開完了
- **18:00** - 全作業完了報告

🚀 **18:00厳守で本番環境稼働開始！**