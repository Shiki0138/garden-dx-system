# 🚀 ローカルテスト環境起動ガイド

## 📋 前提条件

以下がインストールされていることを確認してください：
- Node.js 18+ (推奨: v20.x)
- Python 3.11+
- PostgreSQL 15+
- npm または yarn

## 🛠️ セットアップ手順

### 1. データベースの準備

```bash
# PostgreSQLが起動していることを確認
psql -U postgres

# データベースを作成
CREATE DATABASE garden_db;
\q
```

### 2. バックエンドの起動

```bash
# backendディレクトリに移動
cd backend

# Python仮想環境の作成（初回のみ）
python -m venv venv

# 仮想環境の有効化
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 依存関係のインストール（初回のみ）
pip install -r requirements.txt

# データベースの初期化
python database.py

# バックエンドサーバーの起動
python main.py
```

バックエンドは http://localhost:8000 で起動します。
APIドキュメント: http://localhost:8000/docs

### 3. フロントエンドの起動

新しいターミナルを開いて：

```bash
# appディレクトリに移動
cd app

# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm start
```

フロントエンドは http://localhost:3000 で起動します。

## 🎯 デモモードでのテスト

現在の設定ではデモモードが有効になっており、以下の機能をテストできます：

### 主要機能
1. **見積作成**
   - 単価マスタからの品目選択
   - 階層構造の見積作成
   - リアルタイム粗利計算
   - PDF出力

2. **プロジェクト管理**
   - ガントチャート表示
   - 進捗管理
   - 予実管理

3. **請求書作成**
   - 見積からワンクリック変換
   - PDF出力

### デモユーザー
デモモードでは以下のユーザーが自動的に利用可能：
- 経営者: 全機能アクセス可能
- 従業員: 原価情報非表示、請求書作成不可

## 🔍 動作確認

1. ブラウザで http://localhost:3000 を開く
2. デモバナーが表示されることを確認
3. 各機能をテスト

## ⚠️ トラブルシューティング

### ポート競合エラー
```bash
# 使用中のポートを確認
lsof -i :3000  # フロントエンド
lsof -i :8000  # バックエンド

# プロセスを終了
kill -9 [PID]
```

### データベース接続エラー
```bash
# PostgreSQLの状態確認
pg_ctl status

# データベースの存在確認
psql -U postgres -l | grep garden_db
```

### npm installエラー
```bash
# キャッシュクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules
npm install
```

## 📝 環境変数の確認

- フロントエンド: `/app/.env`
- バックエンド: `/backend/.env`

必要に応じて環境変数を調整してください。

## 🎊 準備完了！

これでローカル環境での開発・テストが可能になりました。
問題がある場合は、開発ログを確認するか、READMEを参照してください。