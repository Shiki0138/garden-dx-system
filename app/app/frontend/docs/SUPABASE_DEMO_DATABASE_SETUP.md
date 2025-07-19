# Supabase デモデータベース構築ドキュメント

## 🎯 概要

Garden DX プロジェクトの**Supabase PostgreSQL デモ環境**構築の完全ガイドです。`company_id=1`を使用したテストデータセットと、本番環境デプロイエラー防止機能を含む包括的なデータベース環境を提供します。

**構築日**: 2025-07-02  
**対象環境**: Supabase PostgreSQL 15+  
**デモ会社ID**: `00000000-0000-0000-0000-000000000001`

---

## 🏗 アーキテクチャ概要

### データベース構成
```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                     │
├─────────────────────────────────────────────────────────────┤
│  Multi-Tenant Architecture (company_id based)              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Auth      │  │   Core       │  │   Business      │   │
│  │   Tables    │  │   Tables     │  │   Tables        │   │
│  ├─────────────┤  ├──────────────┤  ├─────────────────┤   │
│  │ auth.users  │  │ companies    │  │ customers       │   │
│  │ user_       │  │ user_        │  │ projects        │   │
│  │ profiles    │  │ profiles     │  │ estimates       │   │
│  └─────────────┘  └──────────────┘  │ price_master    │   │
│                                     │ process_        │   │
│                                     │ schedules       │   │
│                                     │ process_tasks   │   │
│                                     └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Row Level Security (RLS) + Demo Mode Support              │
├─────────────────────────────────────────────────────────────┤
│  IPv6/Supavisor Connection Pooling                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 構築ファイル構成

### 主要SQLファイル
```
database/demo_data/
├── 000_execute_demo_setup.sh      # 自動実行スクリプト
├── 001_demo_complete_setup.sql    # 基本データベース構築
├── 002_demo_process_schedules.sql # 工程表・タスクデータ
└── 003_demo_rls_policies_enhanced.sql # デモ対応RLSポリシー

database/
├── supabase_migration_complete.sql     # 基本スキーマ
├── supabase_rls_safe_policies.sql      # 安全なRLSポリシー
└── migration_scripts/
    └── 000_safe_migration_with_rollback.sql # ロールバック対応
```

---

## 🗄 データベーススキーマ

### 1. 認証・会社管理テーブル

#### companies
```sql
CREATE TABLE companies (
    company_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo_url VARCHAR(500),
    subscription_plan VARCHAR(50) DEFAULT 'basic' 
        CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'employee', 'viewer')),
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{
        "view_estimates": true, 
        "create_estimates": false, 
        "view_financial": false
    }',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. ビジネステーブル

#### customers
```sql
CREATE TABLE customers (
    customer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'individual' 
        CHECK (customer_type IN ('individual', 'corporate')),
    customer_code VARCHAR(50),
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### projects
```sql
CREATE TABLE projects (
    project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    site_address VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'planning' 
        CHECK (status IN ('planning', 'estimating', 'quoted', 'contracted', 
                         'in_progress', 'completed', 'invoiced', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(15, 0),
    actual_cost DECIMAL(15, 0) DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. 工程管理テーブル

#### process_schedules
```sql
CREATE TABLE process_schedules (
    schedule_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) DEFAULT 'project' 
        CHECK (schedule_type IN ('project', 'maintenance', 'emergency')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planning' 
        CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### process_tasks
```sql
CREATE TABLE process_tasks (
    task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES process_schedules(schedule_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_code VARCHAR(50),
    task_category VARCHAR(100),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    estimated_hours DECIMAL(5,1) DEFAULT 0,
    actual_hours DECIMAL(5,1) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'delayed')),
    progress_percentage INTEGER DEFAULT 0 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    dependencies UUID[], -- 依存タスクID配列
    assigned_to UUID REFERENCES user_profiles(user_id),
    cost_estimate DECIMAL(10,0) DEFAULT 0,
    actual_cost DECIMAL(10,0) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 単価・見積テーブル

#### price_master
```sql
CREATE TABLE price_master (
    price_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10, 0) NOT NULL,
    labor_cost DECIMAL(10, 0) DEFAULT 0,
    material_cost DECIMAL(10, 0) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, item_code)
);
```

---

## 🎭 デモデータセット

### デモ会社情報
```yaml
会社ID: 00000000-0000-0000-0000-000000000001
会社名: 株式会社デモ造園
会社コード: DEMO_COMPANY
プラン: premium
所在地: 東京都渋谷区神宮前1-1-1
```

### デモユーザー
```yaml
ユーザー1:
  ID: 00000000-0000-0000-0000-000000000002
  名前: デモ 太郎
  役職: 代表取締役
  権限: owner

ユーザー2:
  ID: 00000000-0000-0000-0000-000000000003
  名前: デモ 花子
  役職: 営業部長
  権限: manager
```

### デモ顧客（5社）
1. **田中 太郎** (個人) - 個人庭園の手入れ
2. **佐藤 花子** (個人) - 新築の庭園設計
3. **株式会社山田商事** (法人) - 社屋前の植栽管理
4. **鈴木造園** (法人) - 協力会社として登録
5. **高橋 次郎** (個人) - マンション共用部の植栽

### デモプロジェクト（5件）
1. **田中邸庭園リフォーム** - 進行中(65%完了)
2. **佐藤邸新築庭園設計** - 計画中
3. **山田商事社屋植栽管理** - 契約済み(35%完了)
4. **鈴木造園協力案件** - 完了(100%)
5. **高橋邸マンション植栽** - 見積中

### デモ単価マスタ（15品目）
```yaml
植栽工事:
  - シマトネリコ H2.5m: ¥12,000/本
  - ソヨゴ H2.0m: ¥8,500/本
  - アベリア H0.6m: ¥800/本
  - ツツジ H0.5m: ¥1,200/本

土工事:
  - 植栽用穴掘り: ¥2,500/m³
  - 植栽用土: ¥4,500/m³

設備工事:
  - スプリンクラー設置: ¥15,000/箇所
  - 竹支柱 3m: ¥800/本
```

### デモ工程表・タスク
**田中邸リフォーム**（11タスク）:
- 現場調査・測量 ✅ 完了
- 設計図面作成 ✅ 完了
- 既存植栽撤去 ✅ 完了
- 土工事・整地 ✅ 完了
- 客土・土壌改良 ✅ 完了
- 高木植栽工事 ✅ 完了
- 中低木植栽工事 🟡 進行中(75%)
- 草花・地被植栽 ⏳ 待機中
- 支柱設置工事 ⏳ 待機中
- 散水設備設置 ⏳ 待機中
- 最終清掃・検査 ⏳ 待機中

---

## 🔒 Row Level Security (RLS)

### デモモード対応RLSポリシー

#### 基本方針
```sql
-- 1. 通常モード: 自社データのみアクセス可能
-- 2. デモモード: デモ会社データにもアクセス可能
-- 3. ゲストモード: デモ会社データの読み取りのみ
```

#### 主要RLS関数
```sql
-- ユーザーの会社ID取得（エラーハンドリング付き）
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT company_id INTO v_company_id
    FROM user_profiles 
    WHERE user_id = auth.uid();
    
    RETURN v_company_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモモード判定
CREATE OR REPLACE FUNCTION is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM companies 
        WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
        AND company_code = 'DEMO_COMPANY'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ゲストアクセス許可（読み取り専用）
CREATE OR REPLACE FUNCTION allow_guest_read()
RETURNS BOOLEAN AS $$
BEGIN
    IF is_demo_mode() AND auth.uid() IS NULL THEN
        RETURN TRUE;
    END IF;
    
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### RLSポリシー例（companies テーブル）
```sql
-- 読み取りポリシー（ゲストアクセス対応）
CREATE POLICY companies_demo_read_policy ON companies
    FOR SELECT
    USING (
        -- 認証済みユーザーは自社データにアクセス
        company_id = get_user_company_id()
        OR 
        -- デモモードではデモ会社データにアクセス可能
        (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        OR
        -- ゲストユーザーはデモ会社の基本情報のみ閲覧可能
        (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
    );

-- 更新ポリシー（認証済みユーザーのみ）
CREATE POLICY companies_demo_update_policy ON companies
    FOR ALL
    USING (
        (company_id = get_user_company_id() AND has_role('owner'))
        OR 
        (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID 
         AND has_role('owner'))
    );
```

---

## 🚀 自動構築スクリプト

### 実行方法

#### 1. 環境変数設定
```bash
# Supabaseプロジェクト接続情報
export DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
# または
export POSTGRES_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
```

#### 2. 自動実行
```bash
# デモ環境構築スクリプト実行
cd database/demo_data/
chmod +x 000_execute_demo_setup.sh
./000_execute_demo_setup.sh
```

#### 3. 段階実行（手動）
```bash
# 1. 基本データベース構築
psql "$DATABASE_URL" -f 001_demo_complete_setup.sql

# 2. 工程表・タスクデータ
psql "$DATABASE_URL" -f 002_demo_process_schedules.sql

# 3. デモ用RLSポリシー
psql "$DATABASE_URL" -f 003_demo_rls_policies_enhanced.sql
```

### 実行ログ確認
```sql
-- セットアップログ確認
SELECT 
    action,
    status,
    message,
    created_at
FROM demo_setup_log
ORDER BY created_at;

-- データ統計確認
SELECT * FROM get_demo_statistics();
```

---

## 🔧 エラーハンドリング・ロールバック

### 自動ロールバック機能
```sql
-- ロールバック実行関数
CREATE OR REPLACE FUNCTION rollback_migration()
RETURNS VOID AS $$
DECLARE
    v_backup_record RECORD;
BEGIN
    RAISE NOTICE '=== マイグレーションロールバック開始 ===';
    
    -- 新しく作成されたテーブルを削除
    FOR v_backup_record IN 
        SELECT DISTINCT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name NOT IN (
            SELECT DISTINCT table_name 
            FROM migration_backup
        )
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', v_backup_record.table_name);
        RAISE NOTICE 'Dropped new table: %', v_backup_record.table_name;
    END LOOP;
    
    RAISE NOTICE '✅ ロールバック完了';
END;
$$ LANGUAGE plpgsql;
```

### エラーチェック
```sql
-- データ整合性チェック
SELECT 
    table_name,
    COUNT(*) as record_count
FROM (
    SELECT 'companies' as table_name, COUNT(*) FROM companies WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    UNION ALL
    SELECT 'customers', COUNT(*) FROM customers WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    UNION ALL
    SELECT 'projects', COUNT(*) FROM projects WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    UNION ALL
    SELECT 'price_master', COUNT(*) FROM price_master WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
) counts
GROUP BY table_name;
```

---

## 📊 パフォーマンス最適化

### インデックス設定
```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_price_master_company_category ON price_master(company_id, category);
CREATE INDEX IF NOT EXISTS idx_price_master_active ON price_master(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_process_schedules_company ON process_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_schedule ON process_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_status ON process_tasks(status);
```

### 接続プール設定
```typescript
// Supavisor接続プール（IPv6対応）
const supabaseConfig = {
  url: process.env.VITE_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  db: {
    schema: 'public',
  },
  // 接続プール設定
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};
```

---

## 🧪 テスト・検証

### データ確認クエリ
```sql
-- 1. デモ会社データ確認
SELECT * FROM companies WHERE company_code = 'DEMO_COMPANY';

-- 2. プロジェクト進捗確認
SELECT 
    project_name,
    status,
    progress_percentage,
    start_date,
    end_date
FROM projects 
WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- 3. 工程表・タスク確認
SELECT 
    ps.schedule_name,
    pt.task_name,
    pt.status,
    pt.progress_percentage,
    pt.start_date,
    pt.end_date
FROM process_schedules ps
JOIN process_tasks pt ON ps.schedule_id = pt.schedule_id
WHERE ps.company_id = '00000000-0000-0000-0000-000000000001'::UUID
ORDER BY ps.schedule_name, pt.start_date;

-- 4. 単価マスタ確認
SELECT 
    category,
    item_name,
    unit_price,
    unit
FROM price_master 
WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
ORDER BY category, item_name;
```

### RLSテスト
```sql
-- RLS動作テスト関数実行
SELECT * FROM test_rls_policies();

-- デモアクセステスト
SELECT 
    test_name,
    result,
    details
FROM test_rls_policies('00000000-0000-0000-0000-000000000002'::UUID);
```

---

## 🔮 今後の拡張計画

### Phase 1: 基本機能拡張
- [ ] 見積明細データの追加
- [ ] 請求書テーブルの構築
- [ ] ファイル添付機能

### Phase 2: 高度な機能
- [ ] 監査ログテーブル
- [ ] 通知システム
- [ ] レポート機能強化

### Phase 3: 最適化・監視
- [ ] パーティション分割
- [ ] 監視ダッシュボード
- [ ] バックアップ自動化

---

## 🎯 まとめ

本ドキュメントで構築された**Supabase デモデータベース環境**は、以下の特徴を持ちます：

### ✅ 主要機能
- **完全なテストデータセット**: company_id=1による一貫したデモ環境
- **マルチテナント対応**: RLSによる安全なデータ分離
- **工程管理対応**: ガントチャート・タスク管理データ
- **デモモード対応**: ゲストアクセスとデモユーザー管理
- **エラーハンドリング**: 自動ロールバック・エラー追跡

### ✅ セキュリティ
- Row Level Security (RLS) 完全実装
- デモ/本番環境の安全な分離
- IPv6/Supavisor接続プール対応
- 段階的構築とロールバック機能

### ✅ パフォーマンス
- 最適化されたインデックス設定
- 効率的なRLSポリシー
- 接続プーリング設定
- 大量データ対応設計

この環境により、**Garden DX プロジェクトの即座なデモ利用**と**本番環境への安全な移行**が可能となります。