# Vercel設定修正手順

## 1. Vercel Dashboardで設定を修正

### アクセス先
https://vercel.com/shikis-projects-6e27447a/garden-dx-system/settings/general

### 修正項目

#### Root Directory
- 現在: `~/Desktop/system/garden/app/app` (間違い)
- 修正後: `app`

#### Build & Output Settings
- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

#### Functions設定
Settings → Functions タブを確認し、不要な設定があれば削除

## 2. GitHub Secretsを更新

新しいProject IDに更新:
- VERCEL_PROJECT_ID: `prj_F96LcQYQsEWgeQv0oL6dmTGA9vjI`

## 3. 修正後の確認

1. Vercel Dashboardで「Save」をクリック
2. GitHubに再度プッシュしてデプロイをトリガー

## エラーの原因

「The `functions` property cannot be used in conjunction with the `builds` property」エラーは、Vercelの古い設定が残っているために発生しています。上記の手順で解決できます。