# Vercel Root Directory 設定修正

## 問題
Vercelがルートディレクトリでpackage.jsonを探していますが、実際は`app`ディレクトリにあります。

## 修正方法

### 方法1: Vercel Dashboard で設定（推奨）
1. https://vercel.com/shikis-projects-6e27447a/garden-dx-system/settings/general にアクセス
2. "Root Directory" を `app` に設定
3. "Save" をクリック

### 方法2: vercel.jsonで設定（既に実施済み）
```json
{
  "root": "app",
  ...
}
```

## 確認事項
- Root Directory: `app`
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

## 次のステップ
1. Vercel Dashboardで設定を確認・修正
2. 再デプロイをトリガー