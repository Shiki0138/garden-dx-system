# Vercel デプロイ設定確認ガイド

## 🔍 GitHubとVercelの連携確認

### 1. Vercel Dashboardで確認
1. https://vercel.com/dashboard にアクセス
2. プロジェクトが存在するか確認

### 2. プロジェクトが見つからない場合

#### 新規インポート方法:
1. Vercel Dashboardで「Add New...」→「Project」
2. 「Import Git Repository」を選択
3. GitHubアカウントを連携（未連携の場合）
4. `Shiki0138/garden-dx-system` リポジトリを検索・選択
5. Import をクリック

#### インポート設定:
```
Project Name: garden-dx-system
Framework Preset: Create React App
Root Directory: app
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

#### 環境変数設定:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_ENV=production
```

### 3. 既存プロジェクトの場合

#### Git連携確認:
1. プロジェクト → Settings → Git
2. Repository が `Shiki0138/garden-dx-system` になっているか確認
3. Production Branch が `main` になっているか確認

#### 自動デプロイ設定:
1. Settings → Git → Deploy Hooks
2. 「Automatically deploy from branches」が有効か確認
3. main ブランチが含まれているか確認

### 4. 手動デプロイ方法

#### A. Vercel Dashboardから:
1. プロジェクトページ → Deployments タブ
2. 最新のコミットの「...」メニュー → 「Redeploy」
3. 「Use existing Build Cache」のチェックを外す
4. 「Redeploy」をクリック

#### B. Vercel CLIから:
```bash
# インストール（未実施の場合）
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

### 5. トラブルシューティング

#### デプロイが開始されない場合:
- GitHub Integrationを再接続
- Webhook設定を確認
- Deploy Hooksを再作成

#### ビルドエラーの場合:
- Build Logsを確認
- 環境変数が正しく設定されているか確認
- Root Directoryが「app」になっているか確認

## 📝 確認項目チェックリスト

- [ ] Vercelプロジェクトが存在する
- [ ] GitHubリポジトリが正しく連携されている
- [ ] Production Branchが「main」に設定されている
- [ ] Root Directoryが「app」に設定されている
- [ ] 環境変数が設定されている
- [ ] 自動デプロイが有効になっている

## 🚀 デプロイURL

デプロイが成功すると以下のようなURLでアクセス可能:
- Production: `https://garden-dx-system.vercel.app`
- Preview: `https://garden-dx-system-git-main-[username].vercel.app`