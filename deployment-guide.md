# Garden DX System - Production Deployment Guide
# 造園業向け統合業務管理システム - 本番環境デプロイガイド

## 🚀 デプロイ構成
- **フロントエンド**: Vercel (無料プラン)
- **バックエンド**: Supabase (無料プラン)
- **データベース**: PostgreSQL (Supabase内蔵)
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage
- **リアルタイム**: Supabase Realtime

## 📋 事前準備

### 1. アカウント作成
- [ ] [Vercel](https://vercel.com/)でアカウント作成
- [ ] [Supabase](https://supabase.com/)でアカウント作成
- [ ] GitHubアカウント（既存のものでOK）

### 2. 必要なツール
```bash
# Node.js（インストール済みの場合はスキップ）
node --version  # v16以上が必要

# Vercel CLI
npm install -g vercel

# Supabase CLI（オプション）
npm install -g supabase
```

## 🛠️ Supabaseセットアップ

### 1. プロジェクト作成
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力:
   - Project name: `garden-dx-production`
   - Database Password: 強力なパスワードを設定（保存必須）
   - Region: `Northeast Asia (Tokyo)`
   - Pricing Plan: `Free tier`

### 2. データベーススキーマ適用
1. Supabase DashboardのSQL Editorを開く
2. `supabase/schema.sql`の内容をコピー＆ペースト
3. 「RUN」をクリックしてスキーマを作成

### 3. 認証設定
1. Authentication → Settings
2. Site URLに本番URLを設定: `https://your-app.vercel.app`
3. Email認証を有効化
4. パスワードポリシー設定（最小6文字）

### 4. ストレージバケット作成
1. Storage → Create Bucket
2. バケット名: `garden-dx-files`
3. Public bucket: OFF（プライベート）

### 5. 環境変数取得
Project Settings → APIから以下を取得:
- Project URL: `https://xxxxx.supabase.co`
- Anon/Public key: `eyJhbGci...`
- Service role key: `eyJhbGci...`（秘密、Vercelのみ）

## 🌐 Vercelデプロイ

### 1. GitHubリポジトリ準備
```bash
# プロジェクトディレクトリで実行
cd /Users/leadfive/Desktop/system/garden

# Gitリポジトリ初期化（未実施の場合）
git init
git add .
git commit -m "Initial commit for production deployment"

# GitHubにプッシュ
git remote add origin https://github.com/yourusername/garden-dx-system.git
git push -u origin main
```

### 2. Vercelでインポート
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 「Import Project」をクリック
3. GitHubリポジトリを選択
4. Configure Project:
   - Framework Preset: `Create React App`
   - Root Directory: `app`
   - Build Command: `npm run build`
   - Output Directory: `build`

### 3. 環境変数設定
Project Settings → Environment Variablesで以下を設定:

```
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...（Productionのみ）
REACT_APP_ENV=production
REACT_APP_STORAGE_BUCKET=garden-dx-files
```

### 4. デプロイ実行
```bash
# Vercel CLIを使用
vercel --prod

# または、GitHubにプッシュで自動デプロイ
git add .
git commit -m "Update for production"
git push origin main
```

## 📱 初期データセットアップ

### 1. 管理者アカウント作成
本番URLでサインアップ:
- Email: admin@your-company.com
- Password: 強力なパスワード
- 会社名: あなたの会社名
- 担当者名: 管理者名

### 2. 初期データ投入
Supabase SQL Editorで実行:

```sql
-- 項目テンプレート初期データ
INSERT INTO item_templates (company_id, category, name, unit, purchase_price, markup_rate)
SELECT 
  (SELECT id FROM companies LIMIT 1),
  category,
  name,
  unit,
  purchase_price,
  markup_rate
FROM (VALUES
  ('植栽工事', 'クロマツ H3.0m', '本', 20000, 1.5),
  ('植栽工事', 'ヒラドツツジ H0.5m', '本', 1500, 1.5),
  ('植栽工事', 'シマトネリコ H2.5m', '本', 12000, 1.5),
  ('土工事', '客土・土壌改良', 'm3', 5000, 1.5),
  ('土工事', '掘削・整地', 'm3', 3500, 1.5),
  ('外構工事', '御影石縁石設置', 'm', 8000, 1.5),
  ('外構工事', 'インターロッキング', 'm2', 6000, 1.5)
) AS t(category, name, unit, purchase_price, markup_rate);
```

## 🔒 セキュリティ設定

### 1. Row Level Security (RLS)
Supabase DashboardでRLSポリシー設定:

```sql
-- 会社データへのアクセス制限
CREATE POLICY "Users can only see their company data" ON companies
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM users WHERE company_id = companies.id
  ));

-- 見積データへのアクセス制限
CREATE POLICY "Users can only see their company estimates" ON estimates
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

### 2. Vercelセキュリティヘッダー
`vercel.json`に追加:

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
          "value": "SAMEORIGIN"
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

## 🧪 動作確認チェックリスト

### 基本機能
- [ ] ログイン・ログアウト
- [ ] 新規アカウント登録
- [ ] 見積作成（EstimateWizardPro）
- [ ] 見積一覧表示
- [ ] 見積編集・削除
- [ ] PDF出力

### データ保存
- [ ] 見積データの保存
- [ ] 顧客情報の保存
- [ ] 項目テンプレートの表示

### セキュリティ
- [ ] 他社データが見えないこと
- [ ] 未認証アクセスの遮断
- [ ] HTTPS通信の確認

## 📈 モニタリング

### Vercel Analytics
1. Project Settings → Analytics
2. Enable Web Analytics（無料）

### Supabase Monitoring
1. Project Dashboard → Reports
2. API使用状況の確認
3. データベース容量の確認

## 🆘 トラブルシューティング

### よくある問題と解決策

1. **「CORS error」が発生**
   - Supabase DashboardでCORS設定確認
   - Allowed originsに本番URLを追加

2. **「認証エラー」が発生**
   - 環境変数が正しく設定されているか確認
   - Supabase URLとキーの確認

3. **「データが表示されない」**
   - RLSポリシーの確認
   - company_idの関連付け確認

4. **「ビルドエラー」**
   - Node.jsバージョン確認（16以上）
   - 依存関係の再インストール

## 🎯 次のステップ

### 運用開始後の推奨事項
1. **バックアップ設定**
   - Supabase Pro版でのポイントインタイムリカバリ
   - 定期的なデータエクスポート

2. **カスタムドメイン設定**
   - Vercelでカスタムドメイン追加
   - SSL証明書の自動設定

3. **パフォーマンス最適化**
   - 画像の最適化
   - コード分割の実装
   - キャッシュ戦略の設定

4. **拡張機能の実装**
   - メール通知機能
   - 請求書管理機能
   - レポート機能

## 📞 サポート

問題が発生した場合:
1. [Vercel Documentation](https://vercel.com/docs)
2. [Supabase Documentation](https://supabase.com/docs)
3. GitHubのIssuesで質問

---

🎉 **デプロイ完了おめでとうございます！**

造園業DXシステムの本番環境が稼働開始しました。
1社向けの低コスト運用で、プロフェッショナルなシステムを提供できます。