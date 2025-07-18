# 🚨 Vercel環境変数の緊急修正手順

## 問題
本番環境でSupabase URLエラーが発生しています。Vercelの環境変数が正しく設定されていません。

## 🔧 即座に実行する手順

### 1. Vercelダッシュボードにアクセス
以下のURLを開いてください：
```
https://vercel.com/dashboard
```

### 2. プロジェクトを選択
- `garden` または `app` プロジェクトをクリック

### 3. 環境変数を設定
1. 上部メニューから「Settings」をクリック
2. 左メニューから「Environment Variables」をクリック
3. 以下の環境変数を追加または更新：

| 変数名 | 値 |
|--------|-----|
| REACT_APP_SUPABASE_URL | `https://ppplfluvazaufassdkra.supabase.co` |
| REACT_APP_SUPABASE_ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcGxmbHV2YXphdWZhc3Nka3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5NjczOTYsImV4cCI6MjAzNTU0MzM5Nn0.IWHrTSjfE-fKKgJOVXHECtWo8DGOLGe0Nx0z-vbpyWQ` |
| REACT_APP_API_BASE_URL | `https://ppplfluvazaufassdkra.supabase.co` |
| REACT_APP_DEMO_MODE | `true` |
| REACT_APP_ENVIRONMENT | `production` |

### 4. 再デプロイ
1. 「Deployments」タブをクリック
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Use existing Build Cache」のチェックを**外す**
5. 「Redeploy」ボタンをクリック

### 5. デプロイ完了を待つ
- 約2-3分でデプロイが完了します
- 完了後、本番URLでアクセス

## 🚀 代替案：ローカルでのテスト

Vercel設定中は、ローカル環境でテストを続けることができます：

```bash
# ローカルサーバーを起動
npm start
```

ローカルURL: `http://localhost:3000`

## 📝 重要な注意点

- 環境変数は「Production」環境に設定してください
- 変数名は `REACT_APP_` で始まる必要があります
- 再デプロイ時はキャッシュをクリアしてください

この手順を実行してください。設定完了後、本番環境でシステムが正常に動作します。