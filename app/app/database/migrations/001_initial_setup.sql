-- ======================================
-- Garden システム 初期セットアップ
-- Migration: 001_initial_setup.sql
-- ======================================

-- 前提条件チェック
DO $$
BEGIN
    -- PostgreSQL バージョンチェック (13以上必須)
    IF (SELECT current_setting('server_version_num')::int < 130000) THEN
        RAISE EXCEPTION 'PostgreSQL 13 or higher is required. Current version: %', version();
    END IF;
    
    RAISE NOTICE 'PostgreSQL version check passed: %', version();
END $$;

-- タイムゾーン設定
SET timezone = 'Asia/Tokyo';

-- ======================================
-- Extension の有効化
-- ======================================

-- UUID生成機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 暗号化機能
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 全文検索機能（日本語対応）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ======================================
-- 基盤テーブル作成
-- ======================================

-- 企業テーブル（マルチテナント基盤）
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    company_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_users INTEGER DEFAULT 10,
    storage_limit_gb INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_companies_subscription_plan CHECK (subscription_plan IN ('basic', 'standard', 'premium', 'enterprise')),
    CONSTRAINT chk_companies_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial')),
    CONSTRAINT chk_companies_max_users CHECK (max_users > 0),
    CONSTRAINT chk_companies_storage_limit CHECK (storage_limit_gb > 0)
);

-- 役割テーブル（RBAC基盤）
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    can_view_cost BOOLEAN DEFAULT FALSE,
    can_edit_price_master BOOLEAN DEFAULT FALSE,
    can_final_discount BOOLEAN DEFAULT FALSE,
    can_issue_invoice BOOLEAN DEFAULT FALSE,
    can_manage_system BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_roles_role_name CHECK (role_name IN ('owner', 'employee', 'admin', 'viewer'))
);

-- ユーザーテーブル（マルチテナント対応）
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    user_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
    
    -- 制約
    CONSTRAINT chk_users_failed_attempts CHECK (failed_login_attempts >= 0),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 顧客テーブル（マルチテナント対応）
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    customer_code VARCHAR(50),
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'individual',
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    credit_limit DECIMAL(12, 0) DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- 制約
    CONSTRAINT chk_customers_customer_type CHECK (customer_type IN ('individual', 'corporate')),
    CONSTRAINT chk_customers_credit_limit CHECK (credit_limit >= 0),
    
    -- インデックス（マルチテナント対応）
    CONSTRAINT unq_customers_code_per_company UNIQUE (company_id, customer_code)
);

-- 単価マスタテーブル（階層構造対応・マルチテナント）
CREATE TABLE IF NOT EXISTS price_master (
    item_id SERIAL PRIMARY KEY,
    item_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    default_markup_rate DECIMAL(5, 3) NOT NULL DEFAULT 1.300,
    min_markup_rate DECIMAL(5, 3) DEFAULT 1.100,
    max_markup_rate DECIMAL(5, 3) DEFAULT 2.000,
    supplier_code VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_cost_update DATE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_price_master_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_price_master_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- 制約
    CONSTRAINT chk_price_master_purchase_price_positive CHECK (purchase_price >= 0),
    CONSTRAINT chk_price_master_markup_rate_positive CHECK (default_markup_rate > 0),
    CONSTRAINT chk_price_master_markup_rate_range CHECK (
        min_markup_rate <= default_markup_rate AND 
        default_markup_rate <= max_markup_rate
    ),
    
    -- インデックス（マルチテナント対応）
    CONSTRAINT unq_price_master_code_per_company UNIQUE (company_id, item_code)
);

-- プロジェクトテーブル（マルチテナント対応）
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    project_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    site_address TEXT,
    status VARCHAR(50) DEFAULT 'estimating',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    total_budget DECIMAL(12, 0) DEFAULT 0,
    actual_cost DECIMAL(12, 0) DEFAULT 0,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER NOT NULL,
    project_manager INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_projects_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_projects_project_manager FOREIGN KEY (project_manager) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- 制約
    CONSTRAINT chk_projects_status CHECK (status IN ('estimating', 'approved', 'in_progress', 'completed', 'invoiced', 'lost', 'cancelled')),
    CONSTRAINT chk_projects_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_projects_budget_positive CHECK (total_budget >= 0),
    CONSTRAINT chk_projects_actual_cost_positive CHECK (actual_cost >= 0),
    CONSTRAINT chk_projects_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_projects_date_order CHECK (start_date <= end_date),
    CONSTRAINT chk_projects_actual_date_order CHECK (actual_start_date <= actual_end_date),
    
    -- インデックス（マルチテナント対応）
    CONSTRAINT unq_projects_code_per_company UNIQUE (company_id, project_code)
);

-- 見積テーブル（マルチテナント対応）
CREATE TABLE IF NOT EXISTS estimates (
    estimate_id SERIAL PRIMARY KEY,
    estimate_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    estimate_number VARCHAR(50) NOT NULL,
    estimate_version INTEGER DEFAULT 1,
    estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(12, 0) DEFAULT 0,
    tax_rate DECIMAL(5, 3) DEFAULT 0.100,
    tax_amount DECIMAL(12, 0) DEFAULT 0,
    total_amount DECIMAL(12, 0) DEFAULT 0,
    total_cost DECIMAL(12, 0) DEFAULT 0,
    gross_profit DECIMAL(12, 0) DEFAULT 0,
    profit_margin DECIMAL(5, 3) DEFAULT 0,
    final_adjustment DECIMAL(12, 0) DEFAULT 0,
    adjustment_reason TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    is_current_version BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_estimates_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_estimates_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_estimates_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_estimates_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    -- 制約
    CONSTRAINT chk_estimates_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'expired')),
    CONSTRAINT chk_estimates_amounts_positive CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        total_amount >= 0 AND 
        total_cost >= 0
    ),
    CONSTRAINT chk_estimates_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 1),
    CONSTRAINT chk_estimates_version_positive CHECK (estimate_version > 0),
    
    -- インデックス（マルチテナント対応）
    CONSTRAINT unq_estimates_number_per_company UNIQUE (company_id, estimate_number)
);

-- 見積明細テーブル（階層構造対応）
CREATE TABLE IF NOT EXISTS estimate_items (
    item_id SERIAL PRIMARY KEY,
    item_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    estimate_id INTEGER NOT NULL,
    price_master_item_id INTEGER,
    parent_item_id INTEGER,
    level INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL,
    item_type VARCHAR(20) DEFAULT 'item',
    item_description VARCHAR(255) NOT NULL,
    specification TEXT,
    quantity DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(20),
    purchase_price DECIMAL(10, 0) DEFAULT 0,
    markup_rate DECIMAL(5, 3) DEFAULT 1.000,
    unit_price DECIMAL(10, 0) DEFAULT 0,
    line_amount DECIMAL(12, 0) DEFAULT 0,
    line_cost DECIMAL(12, 0) DEFAULT 0,
    line_profit DECIMAL(12, 0) DEFAULT 0,
    line_item_adjustment DECIMAL(10, 0) DEFAULT 0,
    adjustment_reason TEXT,
    is_free_entry BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_estimate_items_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id) ON DELETE CASCADE,
    CONSTRAINT fk_estimate_items_price_master FOREIGN KEY (price_master_item_id) REFERENCES price_master(item_id) ON DELETE SET NULL,
    CONSTRAINT fk_estimate_items_parent FOREIGN KEY (parent_item_id) REFERENCES estimate_items(item_id) ON DELETE CASCADE,
    
    -- 制約
    CONSTRAINT chk_estimate_items_item_type CHECK (item_type IN ('header', 'item', 'subtotal', 'note')),
    CONSTRAINT chk_estimate_items_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_estimate_items_prices_positive CHECK (purchase_price >= 0 AND unit_price >= 0),
    CONSTRAINT chk_estimate_items_markup_rate_positive CHECK (markup_rate > 0),
    CONSTRAINT chk_estimate_items_level_valid CHECK (level >= 0 AND level <= 5),
    CONSTRAINT chk_estimate_items_amounts_positive CHECK (line_amount >= 0 AND line_cost >= 0)
);

-- 請求書テーブル（マルチテナント対応）
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id SERIAL PRIMARY KEY,
    invoice_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    estimate_id INTEGER,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 0) DEFAULT 0,
    tax_rate DECIMAL(5, 3) DEFAULT 0.100,
    tax_amount DECIMAL(12, 0) DEFAULT 0,
    total_amount DECIMAL(12, 0) DEFAULT 0,
    paid_amount DECIMAL(12, 0) DEFAULT 0,
    balance_due DECIMAL(12, 0) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'issued',
    payment_terms VARCHAR(100),
    payment_method VARCHAR(50),
    payment_date DATE,
    payment_reference VARCHAR(100),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    -- 制約
    CONSTRAINT chk_invoices_status CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'partial_paid', 'overdue', 'cancelled')),
    CONSTRAINT chk_invoices_amounts_positive CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        total_amount >= 0 AND 
        paid_amount >= 0 AND 
        balance_due >= 0
    ),
    CONSTRAINT chk_invoices_paid_amount_valid CHECK (paid_amount <= total_amount),
    CONSTRAINT chk_invoices_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 1),
    
    -- インデックス（マルチテナント対応）
    CONSTRAINT unq_invoices_number_per_company UNIQUE (company_id, invoice_number)
);

-- ======================================
-- パフォーマンス最適化インデックス
-- ======================================

-- マルチテナント対応の複合インデックス
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_price_master_company_category ON price_master(company_id, category, sub_category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_company_status ON projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_estimates_company_status ON estimates(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);

-- 検索パフォーマンス向上（全文検索対応）
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_price_master_name_trgm ON price_master USING gin(item_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING gin(project_name gin_trgm_ops);

-- ソート・集約最適化
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_sort ON estimate_items(estimate_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_company_created ON projects(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_company_created ON estimates(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_created ON invoices(company_id, created_at DESC);

-- 日付範囲検索最適化
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(estimate_date);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(invoice_date, due_date);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at) WHERE last_login_at IS NOT NULL;

-- UUID検索最適化
CREATE INDEX IF NOT EXISTS idx_companies_uuid ON companies(company_uuid);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(user_uuid);
CREATE INDEX IF NOT EXISTS idx_customers_uuid ON customers(customer_uuid);
CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(project_uuid);
CREATE INDEX IF NOT EXISTS idx_estimates_uuid ON estimates(estimate_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_uuid ON invoices(invoice_uuid);

-- ======================================
-- トリガー関数定義
-- ======================================

-- 更新日時自動設定関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 見積金額自動計算関数
CREATE OR REPLACE FUNCTION calculate_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
    estimate_record RECORD;
    item_total DECIMAL(12, 0);
    cost_total DECIMAL(12, 0);
BEGIN
    -- 関連する見積のIDを取得
    IF TG_OP = 'DELETE' THEN
        estimate_record := OLD;
    ELSE
        estimate_record := NEW;
    END IF;
    
    -- 見積明細の合計を計算
    SELECT 
        COALESCE(SUM(line_amount), 0),
        COALESCE(SUM(line_cost), 0)
    INTO item_total, cost_total
    FROM estimate_items 
    WHERE estimate_id = estimate_record.estimate_id 
    AND item_type = 'item';
    
    -- 見積テーブルを更新
    UPDATE estimates SET
        subtotal = item_total,
        total_cost = cost_total,
        tax_amount = ROUND(item_total * tax_rate),
        total_amount = item_total + ROUND(item_total * tax_rate) + COALESCE(final_adjustment, 0),
        gross_profit = item_total - cost_total,
        profit_margin = CASE 
            WHEN item_total > 0 THEN (item_total - cost_total) / item_total 
            ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE estimate_id = estimate_record.estimate_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- プロジェクト進捗自動更新関数
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- プロジェクトの進捗状況を自動更新
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.progress_percentage = 100;
        NEW.actual_end_date = CURRENT_DATE;
    ELSIF NEW.status = 'in_progress' AND OLD.status = 'approved' THEN
        NEW.actual_start_date = CURRENT_DATE;
        NEW.progress_percentage = COALESCE(NEW.progress_percentage, 0);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 請求書残高自動計算関数
CREATE OR REPLACE FUNCTION calculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due = NEW.total_amount - NEW.paid_amount;
    
    -- 支払状況に応じてステータスを自動更新
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'paid';
        NEW.payment_date = COALESCE(NEW.payment_date, CURRENT_DATE);
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status = 'partial_paid';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
        NEW.status = 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ======================================
-- トリガー設定
-- ======================================

-- 更新日時トリガー
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_master_updated_at BEFORE UPDATE ON price_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON estimate_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ビジネスロジックトリガー
CREATE TRIGGER trigger_calculate_estimate_totals 
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_estimate_totals();

CREATE TRIGGER trigger_update_project_progress 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_project_progress();

CREATE TRIGGER trigger_calculate_invoice_balance 
    BEFORE INSERT OR UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_balance();

-- ======================================
-- Row Level Security (RLS) 設定
-- ======================================

-- RLSの有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 企業分離ポリシー（完全なマルチテナント分離）
CREATE POLICY company_isolation_policy ON users
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY company_isolation_policy ON customers
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY company_isolation_policy ON price_master
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY company_isolation_policy ON projects
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY company_isolation_policy ON estimates
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY company_isolation_policy ON invoices
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- 見積明細のポリシー（見積経由でのアクセス制御）
CREATE POLICY estimate_items_policy ON estimate_items
    USING (estimate_id IN (
        SELECT estimate_id FROM estimates 
        WHERE company_id = current_setting('app.current_company_id', true)::INTEGER
    ));

-- 企業テーブルのポリシー（管理者のみアクセス可能）
CREATE POLICY companies_admin_policy ON companies
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- ======================================
-- 初期役割データ投入
-- ======================================

INSERT INTO roles (role_name, role_description, can_view_cost, can_edit_price_master, can_final_discount, can_issue_invoice, can_manage_system, can_view_reports, can_manage_users) VALUES
('owner', '経営者（親方）- 全権限', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('employee', '従業員 - 基本業務権限', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('admin', 'システム管理者 - 管理権限', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('viewer', '閲覧者 - 参照のみ', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE)
ON CONFLICT (role_name) DO NOTHING;

-- ======================================
-- セットアップ完了確認
-- ======================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- テーブル数確認
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- インデックス数確認
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- トリガー数確認
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Garden システム 初期セットアップ完了';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'テーブル数: %', table_count;
    RAISE NOTICE 'インデックス数: %', index_count;
    RAISE NOTICE 'トリガー数: %', trigger_count;
    RAISE NOTICE 'PostgreSQL バージョン: %', version();
    RAISE NOTICE 'タイムゾーン: %', current_setting('timezone');
    RAISE NOTICE '===========================================';
    RAISE NOTICE '史上最強の造園業管理システム基盤構築完了！';
    RAISE NOTICE '===========================================';
END $$;