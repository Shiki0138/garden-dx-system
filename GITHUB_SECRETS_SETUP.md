# GitHub Secrets セットアップガイド

Garden DX SystemのCI/CDパイプラインを動作させるために、以下のGitHub Secretsを設定する必要があります。

## 必要なSecrets

### 1. VERCEL_TOKEN
Vercelの個人アクセストークンです。

**取得方法:**
1. https://vercel.com/account/tokens にアクセス
2. 「Create」をクリック
3. トークン名を入力（例: `garden-dx-deploy`）
4. 「Create Token」をクリック
5. 表示されたトークンをコピー

### 2. VERCEL_ORG_ID
VercelのOrganization IDです。

**取得方法:**
1. Vercel Dashboardでプロジェクトを開く
2. Settings → General
3. 「Project ID」の下にある「Team」セクションを確認
4. Organization IDをコピー

または、ターミナルで:
```bash
cd app
vercel whoami
```

### 3. VERCEL_PROJECT_ID
VercelのProject IDです。

**取得方法:**
1. Vercel Dashboardでプロジェクトを開く
2. Settings → General
3. 「Project ID」をコピー

## GitHub Secretsの設定方法

1. GitHubリポジトリページを開く
   https://github.com/Shiki0138/garden-dx-system

2. Settings → Secrets and variables → Actions

3. 「New repository secret」をクリック

4. 以下の3つのSecretを追加:
   - Name: `VERCEL_TOKEN`
     Secret: [Vercelから取得したトークン]
   
   - Name: `VERCEL_ORG_ID`
     Secret: [VercelのOrganization ID]
   
   - Name: `VERCEL_PROJECT_ID`
     Secret: [VercelのProject ID]

## 確認方法

Secretsが正しく設定されているか確認:
1. GitHub Actions → 最新のワークフロー実行
2. 各ジョブのログを確認
3. `VERCEL_ORG_ID` と `VERCEL_PROJECT_ID` が環境変数として設定されているか確認

## トラブルシューティング

### "Error: No Vercel token found"
- VERCEL_TOKENが正しく設定されているか確認
- トークンの有効期限が切れていないか確認

### "Error: Invalid project settings"
- VERCEL_ORG_IDとVERCEL_PROJECT_IDが正しいか確認
- Vercelプロジェクトが存在するか確認

### テストが失敗する場合
現在、テストは一時的にスキップされています（`|| true`）。
本番環境では適切なテストを実装してください。