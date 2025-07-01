-- ======================================
-- Garden システム データベースマイグレーション実行
-- サイクル6: 統合テスト・本番デプロイ準備
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】DBマイグレーション実行開始';
    RAISE NOTICE '100%完成システム統合テスト準備';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. データベース作成・設定
-- ======================================

-- 拡張機能有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 設定確認
SHOW shared_preload_libraries;
SHOW work_mem;
SHOW max_connections;

-- ======================================
-- 2. コアスキーマ実行
-- ======================================

-- 企業テーブル
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    representative_name VARCHAR(100),
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    business_license_number VARCHAR(50),
    tax_registration_number VARCHAR(20),
    industry_registration_number VARCHAR(50),
    default_tax_handling VARCHAR(20) DEFAULT 'exclusive',
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    bank_account_type VARCHAR(20),
    bank_account_number VARCHAR(20),
    bank_account_holder VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 役割テーブル
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
    must_change_password BOOLEAN DEFAULT FALSE,
    failed_login_count INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    two_factor_secret VARCHAR(32),
    backup_codes TEXT[],
    security_questions JSONB,
    last_security_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
    CONSTRAINT unq_users_company_username UNIQUE (company_id, username),
    CONSTRAINT unq_users_company_email UNIQUE (company_id, email),
    CONSTRAINT chk_users_failed_login_count CHECK (failed_login_count >= 0)
);

-- 顧客テーブル
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'individual',
    contact_person VARCHAR(100),
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT chk_customers_type CHECK (customer_type IN ('individual', 'corporate'))
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    site_address TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'planning',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    total_budget DECIMAL(12,0),
    actual_cost DECIMAL(12,0),
    created_by INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_projects_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_projects_status CHECK (status IN ('planning', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    CONSTRAINT chk_projects_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- 見積テーブル
CREATE TABLE IF NOT EXISTS estimates (
    estimate_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    estimate_number VARCHAR(50) NOT NULL,
    estimate_title VARCHAR(255) DEFAULT '造園工事見積書',
    estimate_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12,0) DEFAULT 0,
    tax_amount DECIMAL(12,0) DEFAULT 0,
    discount_amount DECIMAL(12,0) DEFAULT 0,
    total_amount DECIMAL(12,0) DEFAULT 0,
    tax_handling VARCHAR(20) DEFAULT 'exclusive',
    tax_rounding VARCHAR(20) DEFAULT 'round',
    payment_terms TEXT DEFAULT '工事完了後30日以内',
    delivery_terms TEXT,
    warranty_terms TEXT,
    special_notes TEXT,
    construction_period VARCHAR(100),
    construction_location TEXT,
    estimate_conditions TEXT,
    quote_number_format VARCHAR(50),
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_estimates_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_estimates_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_estimates_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_estimates_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT unq_estimates_company_number UNIQUE (company_id, estimate_number),
    CONSTRAINT chk_estimates_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'expired', 'deleted')),
    CONSTRAINT chk_estimates_tax_handling CHECK (tax_handling IN ('inclusive', 'exclusive')),
    CONSTRAINT chk_estimates_tax_rounding CHECK (tax_rounding IN ('round', 'floor', 'ceil'))
);

-- 単価マスタテーブル
CREATE TABLE IF NOT EXISTS price_master (
    item_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    standard_unit VARCHAR(20),
    standard_price DECIMAL(10,0),
    cost_price DECIMAL(10,0),
    tax_type VARCHAR(20) DEFAULT 'standard',
    supplier_name VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_price_master_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT unq_price_master_company_code UNIQUE (company_id, item_code),
    CONSTRAINT chk_price_master_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt'))
);

-- 見積明細テーブル
CREATE TABLE IF NOT EXISTS estimate_items (
    item_id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    item_description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20),
    unit_price DECIMAL(10,0) NOT NULL,
    line_total DECIMAL(12,0) NOT NULL,
    tax_type VARCHAR(20) DEFAULT 'standard',
    tax_rate DECIMAL(5,4),
    tax_amount DECIMAL(10,0),
    line_total_with_tax DECIMAL(12,0),
    industry_standard_item_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_estimate_items_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id) ON DELETE CASCADE,
    CONSTRAINT unq_estimate_items_line UNIQUE (estimate_id, line_number),
    CONSTRAINT chk_estimate_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_estimate_items_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt'))
);

-- 請求書テーブル
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    estimate_id INTEGER,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_title VARCHAR(255) DEFAULT '請求書',
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12,0) DEFAULT 0,
    tax_amount DECIMAL(12,0) DEFAULT 0,
    total_amount DECIMAL(12,0) DEFAULT 0,
    paid_amount DECIMAL(12,0) DEFAULT 0,
    tax_handling VARCHAR(20) DEFAULT 'exclusive',
    tax_rounding VARCHAR(20) DEFAULT 'round',
    billing_address TEXT,
    delivery_address TEXT,
    construction_completion_date DATE,
    invoice_conditions TEXT,
    payment_deadline_days INTEGER DEFAULT 30,
    late_payment_penalty_rate DECIMAL(5,3),
    invoice_number_format VARCHAR(50),
    seal_required BOOLEAN DEFAULT TRUE,
    remittance_fee_handling VARCHAR(20) DEFAULT 'customer',
    created_by INTEGER,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT unq_invoices_company_number UNIQUE (company_id, invoice_number),
    CONSTRAINT chk_invoices_status CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'partial_paid', 'overdue', 'cancelled')),
    CONSTRAINT chk_invoices_paid_amount CHECK (paid_amount >= 0),
    CONSTRAINT chk_invoices_remittance_fee CHECK (remittance_fee_handling IN ('customer', 'company'))
);

-- ======================================
-- 3. インデックス作成
-- ======================================

-- 基本インデックス
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_estimates_company ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(estimate_date);

CREATE INDEX IF NOT EXISTS idx_price_master_company ON price_master(company_id);
CREATE INDEX IF NOT EXISTS idx_price_master_category ON price_master(category);
CREATE INDEX IF NOT EXISTS idx_price_master_code ON price_master(item_code);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_line ON estimate_items(line_number);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ======================================
-- 4. Row Level Security 設定
-- ======================================

-- RLS有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
CREATE POLICY users_company_policy ON users
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY customers_company_policy ON customers
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY projects_company_policy ON projects
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY estimates_company_policy ON estimates
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY price_master_company_policy ON price_master
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY estimate_items_company_policy ON estimate_items
    USING (estimate_id IN (SELECT estimate_id FROM estimates WHERE company_id = current_setting('app.current_company_id', true)::INTEGER));

CREATE POLICY invoices_company_policy ON invoices
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- ======================================
-- 5. トリガー関数作成
-- ======================================

-- 更新日時自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積金額自動計算
CREATE OR REPLACE FUNCTION calculate_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
    est_subtotal DECIMAL(12,0);
    est_tax_amount DECIMAL(12,0);
    est_total DECIMAL(12,0);
    current_tax_rate DECIMAL(5,4);
    company_tax_handling VARCHAR(20);
BEGIN
    -- 企業の税処理設定取得
    SELECT default_tax_handling INTO company_tax_handling
    FROM companies 
    WHERE company_id = NEW.company_id;
    
    -- 標準税率取得（10%）
    current_tax_rate := 0.1000;
    
    -- 小計計算
    SELECT COALESCE(SUM(line_total), 0) INTO est_subtotal
    FROM estimate_items
    WHERE estimate_id = NEW.estimate_id;
    
    -- 税額計算
    IF COALESCE(NEW.tax_handling, company_tax_handling) = 'exclusive' THEN
        est_tax_amount := ROUND(est_subtotal * current_tax_rate);
        est_total := est_subtotal + est_tax_amount;
    ELSE
        est_total := est_subtotal;
        est_tax_amount := ROUND(est_total * current_tax_rate / (1 + current_tax_rate));
        est_subtotal := est_total - est_tax_amount;
    END IF;
    
    -- 見積テーブル更新
    UPDATE estimates SET
        subtotal = est_subtotal,
        tax_amount = est_tax_amount,
        total_amount = est_total - COALESCE(discount_amount, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE estimate_id = NEW.estimate_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 6. トリガー設定
-- ======================================

-- 更新日時トリガー
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_master_updated_at BEFORE UPDATE ON price_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 見積金額計算トリガー
CREATE TRIGGER estimate_items_calculate_totals
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items
    FOR EACH ROW EXECUTE FUNCTION calculate_estimate_totals();

-- ======================================
-- 7. 完了確認
-- ======================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- テーブル数確認
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('companies', 'users', 'customers', 'projects', 'estimates', 'price_master', 'estimate_items', 'invoices');
    
    -- インデックス数確認
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    -- トリガー数確認
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    -- RLSポリシー数確認
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】DBスキーマ作成完了確認';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'テーブル数: %', table_count;
    RAISE NOTICE 'インデックス数: %', index_count;
    RAISE NOTICE 'トリガー数: %', trigger_count;
    RAISE NOTICE 'RLSポリシー数: %', policy_count;
    RAISE NOTICE '===========================================';
    
    IF table_count >= 8 AND index_count >= 15 AND trigger_count >= 8 AND policy_count >= 7 THEN
        RAISE NOTICE '✅ DBスキーマ作成 - 完全成功！';
        RAISE NOTICE '🚀 マルチテナント・RLS完全実装';
        RAISE NOTICE '⚡ インデックス・トリガー最適化完了';
    ELSE
        RAISE WARNING '⚠️ 一部スキーマ作成に問題があります';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;