# Database Migration System

## 🚀 Garden システム データベース移行管理

### 📋 概要
本システムは PostgreSQL ベースのマルチテナント対応データベースです。
段階的な開発・デプロイに対応するため、バージョン管理されたマイグレーションシステムを採用しています。

### 🗂 ファイル構成
```
database/
├── schemas/                 # スキーマ定義ファイル
│   ├── 00_core_schema.sql  # 基盤スキーマ（全テーブル）
│   └── 01_er_diagram.md    # ER図ドキュメント
├── migrations/             # マイグレーションファイル
│   ├── README.md          # このファイル
│   ├── 001_initial_setup.sql
│   ├── 002_sample_data.sql
│   └── rollback/          # ロールバック用スクリプト
└── models/                # データモデル（アプリケーション層）
    └── [future_models]/
```

### 📊 マイグレーション実行順序

#### Phase 1: 基盤構築
1. **001_initial_setup.sql** - 基本スキーマとテーブル作成
2. **002_sample_data.sql** - 初期データとサンプルデータ投入

#### Phase 2: 機能拡張（予定）
3. **003_advanced_features.sql** - CRM・写真管理機能
4. **004_performance_optimization.sql** - パフォーマンス最適化

### 🔧 実行方法

#### 開発環境セットアップ
```bash
# PostgreSQL データベース作成
createdb garden_development

# マイグレーション実行
psql -d garden_development -f database/migrations/001_initial_setup.sql
psql -d garden_development -f database/migrations/002_sample_data.sql
```

#### 本番環境デプロイ
```bash
# 本番データベース作成
createdb garden_production

# マイグレーション実行（慎重に）
psql -d garden_production -f database/migrations/001_initial_setup.sql
# サンプルデータは本番では実行しない
```

### 🔒 セキュリティ注意事項

#### Row Level Security (RLS)
- すべての主要テーブルでRLSが有効化されています
- アプリケーションは必ず `current_company_id` を設定してからアクセス

#### アクセス制御
```sql
-- セッション開始時に企業IDを設定
SET app.current_company_id = 1;

-- 以降のクエリは自動的に該当企業のデータのみ取得
SELECT * FROM customers; -- company_id = 1 のデータのみ
```

### 📈 パフォーマンス最適化

#### インデックス戦略
- マルチテナント対応の複合インデックス
- 検索頻度の高いカラムへの専用インデックス
- 外部キー制約による自動インデックス

#### 推奨設定
```sql
-- PostgreSQL 設定推奨値
shared_buffers = 256MB
effective_cache_size = 1GB
random_page_cost = 1.1
```

### 🛠 開発ツール

#### データベース管理
- **pgAdmin 4**: GUI管理ツール
- **DBeaver**: 軽量管理ツール
- **psql**: コマンドライン管理

#### マイグレーション管理
```bash
# スキーマ差分確認
pg_dump -s garden_development > current_schema.sql
diff database/schemas/00_core_schema.sql current_schema.sql

# データバックアップ
pg_dump garden_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 🔄 ロールバック手順

#### 緊急時ロールバック
```bash
# データベース復元
dropdb garden_production
createdb garden_production
psql -d garden_production -f backup_YYYYMMDD_HHMMSS.sql
```

#### 個別マイグレーションのロールバック
```bash
# ロールバックスクリプト実行
psql -d garden_production -f database/migrations/rollback/001_rollback.sql
```

### 📊 データ容量見積もり

#### 想定データ量（1企業・1年間）
- **顧客**: 500件
- **案件**: 1,000件
- **見積**: 1,200件
- **見積明細**: 20,000件
- **請求書**: 1,000件

#### ストレージ要件
- **初期**: 100MB
- **1年後**: 500MB
- **5年後**: 2GB

### 🌐 マルチテナント拡張

#### 企業追加手順
```sql
-- 新規企業登録
INSERT INTO companies (company_name, company_code, subscription_plan) 
VALUES ('新規造園企業', 'COMPANY_002', 'standard');

-- 管理者ユーザー作成
INSERT INTO users (company_id, role_id, username, email, password_hash, full_name)
VALUES (2, 1, 'admin002', 'admin@company002.com', '$2b$12$...', '管理者');
```

### 🎯 品質管理

#### テストデータ
- 全テーブルの制約テスト
- パフォーマンステスト用大量データ
- 権限テスト用多企業データ

#### 監視項目
- データベース接続数
- レスポンス時間
- ディスク使用量
- ロック競合

---

**作成日**: 2025-06-30
**担当**: worker5（Database Architect）
**品質**: 史上最強のデータベース基盤