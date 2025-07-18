# 🔐 GitHub Secrets設定 - 本日18:00締切

## 📋 即座に設定する必要があるSecrets

### GitHubリポジトリでの設定手順
1. GitHub リポジトリページを開く
2. Settings → Secrets and variables → Actions
3. "New repository secret" をクリック
4. 以下のSecretsを追加

### 必須Secrets一覧

#### Vercel関連
```
VERCEL_TOKEN=
# Vercelダッシュボード → Settings → Tokens → Create Token

VERCEL_ORG_ID=
# Vercelダッシュボード → Settings → General → Team ID

VERCEL_PROJECT_ID=
# プロジェクトダッシュボード → Settings → General → Project ID
```

#### Supabase関連
```
REACT_APP_SUPABASE_URL=https://ppplfluvazaufassdkra.supabase.co

REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcGxmbHV2YXphdWZhc3Nka3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5NjczOTYsImV4cCI6MjAzNTU0MzM5Nn0.IWHrTSjfE-fKKgJOVXHECtWo8DGOLGe0Nx0z-vbpyWQ

REACT_APP_API_BASE_URL=https://ppplfluvazaufassdkra.supabase.co
```

#### 本番環境URL
```
PRODUCTION_URL=https://garden-estimate-system.vercel.app
# ※デプロイ後にVercel URLを設定
```

## 🚀 自動設定スクリプト

### GitHub CLI使用（推奨）
```bash
# GitHub CLI インストール確認
gh auth status

# Secrets一括設定
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
gh secret set REACT_APP_SUPABASE_URL --body "https://ppplfluvazaufassdkra.supabase.co"
gh secret set REACT_APP_SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set REACT_APP_API_BASE_URL --body "https://ppplfluvazaufassdkra.supabase.co"
```

### 手動設定（GitHub UI）
1. https://github.com/[username]/[repository]/settings/secrets/actions
2. "New repository secret" でそれぞれ追加

## ✅ 設定確認

### Secrets確認
```bash
# 設定されたSecretsを確認
gh secret list
```

### テストデプロイ実行
```bash
# mainブランチにプッシュしてGitHub Actionsをトリガー
git add .
git commit -m "feat: CI/CD setup complete"
git push origin main
```

## 📊 Actions実行確認

### GitHub Actions画面で確認
1. https://github.com/[username]/[repository]/actions
2. 最新のワークフロー実行を確認
3. 全ジョブが✅になることを確認

### 期待される実行時間
- セキュリティ監査: ~2分
- 品質チェック: ~3分  
- ビルドテスト: ~5分
- デプロイ: ~3分
- **合計: ~13分**

## 🚨 トラブルシューティング

### よくあるエラー
1. **VERCEL_TOKEN invalid**: Vercelで新しいトークン作成
2. **Secrets not found**: Secret名のタイポ確認
3. **Build failed**: ローカルビルド成功確認

### デバッグ方法
```bash
# ローカルでの環境変数テスト
export REACT_APP_SUPABASE_URL="https://ppplfluvazaufassdkra.supabase.co"
export REACT_APP_DEMO_MODE="false"
npm run build
```

---

## ⏰ 本日のCI/CDスケジュール

- **13:30** - GitHub Secrets設定完了
- **14:00** - GitHub Actions動作確認
- **14:30** - 自動デプロイテスト完了
- **15:00** - CI/CDパイプライン完成

🔄 **本日18:00までに完全自動化達成！**