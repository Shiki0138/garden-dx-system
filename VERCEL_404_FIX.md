# 🔧 Vercel 404エラー修正手順

## 問題
本番環境とデモモードの両方で404エラーが発生

## 原因の可能性
1. Root Directory設定が正しくない
2. ビルド出力ディレクトリの設定ミス
3. プロジェクト設定の不整合

## 修正手順

### 1. Vercel Dashboardで設定確認
https://vercel.com/shikis-projects-6e27447a/garden-dx-system/settings/general

以下を確認・修正してください：

#### Root Directory
- **現在の設定を確認**
- **正しい設定**: `app` （appディレクトリを指定）

#### Build & Output Settings
- **Framework Preset**: `Other` または `Create React App`
- **Build Command**: `npm run build` または `CI=false npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### 2. 設定変更後の手順
1. 「Save」をクリック
2. Deployments → 最新のデプロイ → 「Redeploy」をクリック
3. 「Redeploy」ボタンを確認

### 3. 環境変数の確認
Settings → Environment Variables で以下が設定されているか確認：
- `REACT_APP_DEMO_MODE=true`
- `REACT_APP_ENVIRONMENT=demo`

### 4. デバッグ確認
もし上記で解決しない場合：
1. デプロイログを確認
2. ビルド成功しているか
3. 出力ファイルが正しく生成されているか

## 代替解決策

### Vercel CLIでの再デプロイ
```bash
cd app
vercel --prod
```

### プロジェクトのリンク解除と再リンク
```bash
cd app
vercel unlink
vercel link
vercel --prod
```

## 期待される結果
- https://garden-dx-system.vercel.app → アプリケーションのトップページ
- https://garden-dx-system.vercel.app/demo → デモランディングページ