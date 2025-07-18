-- ============================================================
-- Garden DX - Supabase PostgreSQL Migration Schema
-- 造園業務管理システム完全版 - マルチテナント対応
-- Created by: worker2 (Production Database Implementation)
-- Date: 2025-07-01
-- ============================================================

-- 💡 Supabase Environment Setup
-- Enable Row Level Security globally
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SET row_security = on;

-- ============================================================
-- 1. Core Company & User Tables (Supabase Auth Compatible)
-- ============================================================

-- 会社テーブル（マルチテナント基盤）
CREATE TABLE companies (
    company_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL, -- 会社識別コード
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo_url VARCHAR(500),
    subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supabase Auth連携ユーザーテーブル
CREATE TABLE user_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'employee', 'viewer')),
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{"view_estimates": true, "create_estimates": false, "view_financial": false}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客テーブル
CREATE TABLE customers (
    customer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'corporate')),
    customer_code VARCHAR(50), -- 顧客コード
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

-- ============================================================
-- 2. Price Master & Product Catalog
-- ============================================================

-- 単価マスタテーブル（階層的カテゴリ管理強化版）
CREATE TABLE price_master (
    item_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 大カテゴリ
    sub_category VARCHAR(100), -- 中カテゴリ
    detail_category VARCHAR(100), -- 詳細カテゴリ
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12, 0) NOT NULL, -- 仕入単価
    default_markup_rate DECIMAL(5, 3) NOT NULL DEFAULT 1.300, -- 標準掛率
    current_price DECIMAL(12, 0), -- 現在単価（自動計算）
    supplier_name VARCHAR(255), -- 仕入先
    lead_time_days INTEGER DEFAULT 0, -- 調達リードタイム
    minimum_order_qty DECIMAL(10, 2) DEFAULT 1, -- 最小発注数量
    stock_quantity DECIMAL(10, 2) DEFAULT 0, -- 在庫数量
    notes TEXT,
    tags JSONB DEFAULT '[]', -- 検索タグ
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Project Management Tables
-- ============================================================

-- 案件テーブル（工程管理統合版）
CREATE TABLE projects (
    project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50), -- 案件コード
    site_address VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'planning' 
        CHECK (status IN ('planning', 'estimating', 'quoted', 'contracted', 'in_progress', 'completed', 'invoiced', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    total_budget DECIMAL(15, 0), -- 実行予算
    actual_cost DECIMAL(15, 0) DEFAULT 0, -- 実績原価
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    project_manager_id UUID REFERENCES user_profiles(user_id),
    notes TEXT,
    attachments JSONB DEFAULT '[]', -- 添付ファイル情報
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工程管理テーブル（ProcessSchedule）
CREATE TABLE process_schedules (
    schedule_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id VARCHAR(100), -- テンプレート識別子
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工程タスクテーブル（ProcessTask）
CREATE TABLE process_tasks (
    task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES process_schedules(schedule_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- survey, design, planting, etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration DECIMAL(5, 2) NOT NULL, -- 期間（日数）
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'delayed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES user_profiles(user_id),
    dependencies JSONB DEFAULT '[]', -- 依存タスクID配列
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Estimate & Invoice Management
-- ============================================================

-- 見積テーブル（収益性分析強化版）
CREATE TABLE estimates (
    estimate_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(project_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    estimate_number VARCHAR(50) UNIQUE NOT NULL,
    estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    revision_number INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'expired', 'converted')),
    
    -- 金額関連（拡張版）
    subtotal DECIMAL(15, 0) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 0) DEFAULT 0, -- 割引額
    adjustment_amount DECIMAL(15, 0) DEFAULT 0, -- 調整額
    tax_rate DECIMAL(5, 3) DEFAULT 0.10, -- 消費税率
    tax_amount DECIMAL(15, 0) DEFAULT 0, -- 消費税額
    total_amount DECIMAL(15, 0) NOT NULL DEFAULT 0, -- 税込み総額
    total_cost DECIMAL(15, 0) NOT NULL DEFAULT 0, -- 原価合計
    gross_profit DECIMAL(15, 0) NOT NULL DEFAULT 0, -- 粗利額
    gross_margin_rate DECIMAL(7, 4), -- 粗利率
    
    -- 営業管理
    competitor_info TEXT, -- 競合情報
    win_probability INTEGER CHECK (win_probability >= 0 AND win_probability <= 100), -- 受注確率
    expected_order_date DATE, -- 受注予定日
    
    notes TEXT,
    terms_conditions TEXT, -- 取引条件
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 見積明細テーブル（階層構造・在庫連携強化版）
CREATE TABLE estimate_items (
    item_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_id UUID NOT NULL REFERENCES estimates(estimate_id) ON DELETE CASCADE,
    price_master_item_id UUID REFERENCES price_master(item_id),
    
    -- 階層構造
    parent_item_id UUID REFERENCES estimate_items(item_id),
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'item' 
        CHECK (item_type IN ('header', 'item', 'subtotal')),
    
    -- 品目情報
    item_description VARCHAR(500) NOT NULL,
    specification TEXT, -- 仕様詳細
    quantity DECIMAL(12, 3),
    unit VARCHAR(20),
    
    -- 価格情報
    purchase_price DECIMAL(12, 0), -- 仕入単価
    markup_rate DECIMAL(7, 4), -- 掛率
    unit_price DECIMAL(12, 0), -- 提出単価
    line_discount_rate DECIMAL(5, 3) DEFAULT 0, -- 明細割引率
    line_total DECIMAL(15, 0), -- 明細金額
    line_cost DECIMAL(15, 0), -- 明細原価
    
    -- 工程連携
    process_task_id UUID REFERENCES process_tasks(task_id), -- 関連工程
    estimated_work_hours DECIMAL(8, 2), -- 予定作業時間
    
    -- フラグ・属性
    is_optional BOOLEAN DEFAULT FALSE, -- オプション項目
    is_free_entry BOOLEAN DEFAULT FALSE, -- 自由入力
    delivery_date DATE, -- 納期
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 請求書テーブル（支払管理強化版）
CREATE TABLE invoices (
    invoice_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    estimate_id UUID REFERENCES estimates(estimate_id),
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- 金額情報
    subtotal DECIMAL(15, 0) NOT NULL,
    tax_rate DECIMAL(5, 3) DEFAULT 0.10,
    tax_amount DECIMAL(15, 0) DEFAULT 0,
    total_amount DECIMAL(15, 0) NOT NULL,
    paid_amount DECIMAL(15, 0) DEFAULT 0, -- 入金済み額
    
    status VARCHAR(50) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    
    -- 支払情報
    payment_method VARCHAR(50),
    payment_terms TEXT, -- 支払条件
    bank_info JSONB, -- 振込先情報（JSON形式）
    
    -- 入金管理
    payment_due_reminder_sent BOOLEAN DEFAULT FALSE,
    last_reminder_date DATE,
    
    notes TEXT,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. System & Audit Tables
-- ============================================================

-- システム設定テーブル
CREATE TABLE system_settings (
    setting_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_system_default BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, setting_key)
);

-- 監査ログテーブル
CREATE TABLE audit_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(user_id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ファイル管理テーブル
CREATE TABLE file_attachments (
    file_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'project', 'estimate', 'invoice', etc.
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL, -- Supabase Storage path
    uploaded_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. Performance Indexes
-- ============================================================

-- Company-based indexes for multi-tenant performance
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_price_master_company_category ON price_master(company_id, category, sub_category);
CREATE INDEX idx_projects_company_status ON projects(company_id, status);
CREATE INDEX idx_process_schedules_project ON process_schedules(project_id);
CREATE INDEX idx_process_tasks_schedule ON process_tasks(schedule_id);
CREATE INDEX idx_estimates_company_status ON estimates(company_id, status);
CREATE INDEX idx_estimate_items_estimate ON estimate_items(estimate_id);
CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX idx_audit_logs_company_date ON audit_logs(company_id, created_at);
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);

-- Search performance indexes
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('japanese', customer_name));
CREATE INDEX idx_price_master_search ON price_master USING gin(to_tsvector('japanese', item_name || ' ' || COALESCE(notes, '')));
CREATE INDEX idx_projects_name_search ON projects USING gin(to_tsvector('japanese', project_name));

-- ============================================================
-- 7. Supabase Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = required_role OR role = 'owner'
        FROM user_profiles 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check permission
CREATE OR REPLACE FUNCTION has_permission(permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT 
            role = 'owner' OR 
            role = 'manager' OR 
            (permissions ->> permission_key)::boolean = true
        FROM user_profiles 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Company policies (owners can manage their own company)
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Owners can update their company" ON companies
    FOR UPDATE USING (company_id = get_user_company_id() AND has_role('owner'));

-- User profiles policies
CREATE POLICY "Users can view profiles in their company" ON user_profiles
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Managers can manage user profiles" ON user_profiles
    FOR ALL USING (company_id = get_user_company_id() AND has_role('manager'));

-- Customer policies
CREATE POLICY "Users can view customers in their company" ON customers
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create customers" ON customers
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update customers" ON customers
    FOR UPDATE USING (company_id = get_user_company_id());

-- Price master policies
CREATE POLICY "Users can view price master in their company" ON price_master
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Managers can manage price master" ON price_master
    FOR ALL USING (company_id = get_user_company_id() AND has_role('manager'));

-- Project policies
CREATE POLICY "Users can view projects in their company" ON projects
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update projects" ON projects
    FOR UPDATE USING (company_id = get_user_company_id());

-- Process schedule policies
CREATE POLICY "Users can view schedules for their company projects" ON process_schedules
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage schedules for their company projects" ON process_schedules
    FOR ALL USING (company_id = get_user_company_id());

-- Process task policies
CREATE POLICY "Users can view tasks in their company" ON process_tasks
    FOR SELECT USING (
        schedule_id IN (
            SELECT schedule_id FROM process_schedules 
            WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can manage tasks in their company" ON process_tasks
    FOR ALL USING (
        schedule_id IN (
            SELECT schedule_id FROM process_schedules 
            WHERE company_id = get_user_company_id()
        )
    );

-- Estimate policies (with financial access control)
CREATE POLICY "Users can view estimates in their company" ON estimates
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can create estimates" ON estimates
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update estimates" ON estimates
    FOR UPDATE USING (company_id = get_user_company_id());

-- Estimate items policies
CREATE POLICY "Users can view estimate items" ON estimate_items
    FOR SELECT USING (
        estimate_id IN (
            SELECT estimate_id FROM estimates 
            WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can manage estimate items" ON estimate_items
    FOR ALL USING (
        estimate_id IN (
            SELECT estimate_id FROM estimates 
            WHERE company_id = get_user_company_id()
        )
    );

-- Invoice policies
CREATE POLICY "Users can view invoices in their company" ON invoices
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users with permission can manage invoices" ON invoices
    FOR ALL USING (company_id = get_user_company_id() AND has_permission('manage_invoices'));

-- System settings policies
CREATE POLICY "Users can view their company settings" ON system_settings
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Owners can manage company settings" ON system_settings
    FOR ALL USING (company_id = get_user_company_id() AND has_role('owner'));

-- Audit log policies (read-only for transparency)
CREATE POLICY "Users can view audit logs for their company" ON audit_logs
    FOR SELECT USING (company_id = get_user_company_id());

-- File attachment policies
CREATE POLICY "Users can view files in their company" ON file_attachments
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can upload files" ON file_attachments
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- 8. Triggers for Automated Updates
-- ============================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_master_updated_at BEFORE UPDATE ON price_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_schedules_updated_at BEFORE UPDATE ON process_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_tasks_updated_at BEFORE UPDATE ON process_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON estimate_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging trigger function
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            company_id, user_id, table_name, record_id, action, new_values
        ) VALUES (
            NEW.company_id, auth.uid(), TG_TABLE_NAME, 
            NEW.company_id, 'INSERT', to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            company_id, user_id, table_name, record_id, action, old_values, new_values
        ) VALUES (
            NEW.company_id, auth.uid(), TG_TABLE_NAME, 
            NEW.company_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            company_id, user_id, table_name, record_id, action, old_values
        ) VALUES (
            OLD.company_id, auth.uid(), TG_TABLE_NAME, 
            OLD.company_id, 'DELETE', to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_estimates_changes AFTER INSERT OR UPDATE OR DELETE ON estimates
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_invoices_changes AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_projects_changes AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- ============================================================
-- 9. Initial Data Setup
-- ============================================================

-- Insert default system settings template
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system_default) VALUES
('app_theme', '{"primary_color": "#4CAF50", "secondary_color": "#8BC34A"}', 'ui', 'アプリケーションテーマ設定', true),
('tax_rate', '{"default_rate": 0.10, "reduced_rate": 0.08}', 'financial', '消費税率設定', true),
('estimate_numbering', '{"prefix": "EST", "format": "EST-{YYYY}{MM}-{###}"}', 'numbering', '見積番号フォーマット', true),
('invoice_numbering', '{"prefix": "INV", "format": "INV-{YYYY}{MM}-{###}"}', 'numbering', '請求書番号フォーマット', true),
('process_templates', '[
    {
        "id": "garden-basic",
        "name": "基本造園工事",
        "description": "一般的な庭園工事の標準工程",
        "estimated_days": 14
    },
    {
        "id": "maintenance",
        "name": "定期メンテナンス", 
        "description": "庭園の定期メンテナンス工程",
        "estimated_days": 3
    },
    {
        "id": "large-project",
        "name": "大規模造園プロジェクト",
        "description": "公園・大型施設等の造園工事",
        "estimated_days": 90
    }
]', 'process', '工程テンプレート設定', true);

-- Success message
SELECT 'Supabase migration schema created successfully! 🎉' AS status;