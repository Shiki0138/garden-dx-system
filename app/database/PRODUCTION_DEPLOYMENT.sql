-- =================================================================
-- Garden DX Production Database Deployment Script
-- =================================================================
-- このスクリプトを本番Supabaseで実行して、完全な動作環境を構築します
-- 実行順序: 1. Schema → 2. Demo Data → 3. Security Policies

-- =================================================================
-- 1. 基本スキーマとテーブル作成
-- =================================================================

-- Companies (マルチテナント対応)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_number VARCHAR(50),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles (Supabase Auth統合)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'employee', -- 'owner', 'manager', 'employee'
    permissions JSONB DEFAULT '[]',
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers (顧客管理)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price Master (単価マスタ)
CREATE TABLE IF NOT EXISTS price_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12, 0) NOT NULL,
    default_markup_rate DECIMAL(5, 3) DEFAULT 1.3,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects (案件・プロジェクト)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    site_address TEXT,
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'estimated', 'active', 'completed', 'cancelled'
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(12, 0),
    actual_cost DECIMAL(12, 0) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates (見積書)
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    estimate_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtotal DECIMAL(12, 0) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    adjustment_amount DECIMAL(12, 0) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'approved', 'rejected'
    valid_until DATE,
    notes TEXT,
    terms_conditions TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimate Items (見積明細)
CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
    price_master_item_id UUID REFERENCES price_master(id),
    item_description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(10, 0),
    markup_rate DECIMAL(5, 3) DEFAULT 1.3,
    unit_price DECIMAL(10, 0) NOT NULL,
    line_total DECIMAL(12, 0) NOT NULL,
    adjustment_amount DECIMAL(10, 0) DEFAULT 0,
    is_free_entry BOOLEAN DEFAULT false,
    level INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices (請求書)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES estimates(id),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtotal DECIMAL(12, 0) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. インデックス作成（パフォーマンス最適化）
-- =================================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Price Master
CREATE INDEX IF NOT EXISTS idx_price_master_company_id ON price_master(company_id);
CREATE INDEX IF NOT EXISTS idx_price_master_category ON price_master(category, sub_category);
CREATE INDEX IF NOT EXISTS idx_price_master_active ON price_master(is_active);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Estimates
CREATE INDEX IF NOT EXISTS idx_estimates_company_id ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);

-- Estimate Items
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_sort ON estimate_items(sort_order);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- =================================================================
-- 3. RLS (Row Level Security) 有効化
-- =================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 4. セキュリティ関数
-- =================================================================

-- ユーザーの会社IDを取得
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    company_id UUID;
BEGIN
    SELECT up.company_id INTO company_id
    FROM user_profiles up
    WHERE up.id = auth.uid();
    
    RETURN company_id;
END;
$$;

-- ロール確認
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT up.role INTO user_role
    FROM user_profiles up
    WHERE up.id = auth.uid();
    
    RETURN user_role = role_name OR user_role = 'owner';
END;
$$;

-- =================================================================
-- 5. RLS ポリシー
-- =================================================================

-- Companies: 自社データのみアクセス可能
CREATE POLICY "Users can only access their company" ON companies
    FOR ALL USING (id = get_user_company_id());

-- User Profiles: 同一会社のユーザーのみアクセス可能
CREATE POLICY "Users can access profiles in their company" ON user_profiles
    FOR ALL USING (company_id = get_user_company_id());

-- Customers: 同一会社の顧客のみアクセス可能
CREATE POLICY "Users can access customers in their company" ON customers
    FOR ALL USING (company_id = get_user_company_id());

-- Price Master: 同一会社の単価マスタのみアクセス可能
CREATE POLICY "Users can access price master in their company" ON price_master
    FOR ALL USING (company_id = get_user_company_id());

-- Projects: 同一会社のプロジェクトのみアクセス可能
CREATE POLICY "Users can access projects in their company" ON projects
    FOR ALL USING (company_id = get_user_company_id());

-- Estimates: 同一会社の見積のみアクセス可能
CREATE POLICY "Users can access estimates in their company" ON estimates
    FOR ALL USING (company_id = get_user_company_id());

-- Estimate Items: 見積を通じてアクセス制御
CREATE POLICY "Users can access estimate items through estimates" ON estimate_items
    FOR ALL USING (
        estimate_id IN (
            SELECT id FROM estimates WHERE company_id = get_user_company_id()
        )
    );

-- Invoices: 同一会社の請求書のみアクセス可能
CREATE POLICY "Users can access invoices in their company" ON invoices
    FOR ALL USING (company_id = get_user_company_id());

-- =================================================================
-- 6. デモデータ挿入
-- =================================================================

-- デモ会社
INSERT INTO companies (id, name, address, phone, email) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'デモ造園株式会社', '東京都渋谷区1-1-1', '03-1234-5678', 'demo@garden-dx.com')
ON CONFLICT (id) DO NOTHING;

-- デモユーザー（経営者）
INSERT INTO user_profiles (id, company_id, email, full_name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'owner@demo.com', '経営者 太郎', 'owner')
ON CONFLICT (id) DO NOTHING;

-- デモユーザー（従業員）
INSERT INTO user_profiles (id, company_id, email, full_name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'employee@demo.com', '従業員 花子', 'employee')
ON CONFLICT (id) DO NOTHING;

-- デモ顧客
INSERT INTO customers (id, company_id, name, company_name, address, phone, email, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '田中 一郎', '田中邸', '東京都世田谷区2-2-2', '090-1234-5678', 'tanaka@example.com', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '佐藤 美智子', '佐藤邸', '東京都杉並区3-3-3', '090-2345-6789', 'sato@example.com', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- デモ単価マスタ
INSERT INTO price_master (id, company_id, category, sub_category, item_name, unit, purchase_price, default_markup_rate) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '植栽工事', '高木', 'ソメイヨシノ H3.0m', '本', 15000, 1.5),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '植栽工事', '低木', 'ツツジ H0.5m', '本', 800, 1.8),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '外構工事', '舗装', 'インターロッキング', 'm2', 3500, 1.4),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', '外構工事', '石工', '自然石積み', 'm2', 12000, 1.3),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', '管理', '諸経費', '現場管理費', '式', 50000, 1.0)
ON CONFLICT (id) DO NOTHING;

-- デモプロジェクト
INSERT INTO projects (id, company_id, customer_id, project_name, site_address, status, start_date, end_date, total_budget, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', '田中邸庭園リフォーム', '東京都世田谷区2-2-2', 'planning', '2025-07-15', '2025-08-15', 500000, '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', '佐藤邸新規造園', '東京都杉並区3-3-3', 'estimated', '2025-08-01', '2025-09-30', 800000, '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- デモ見積
INSERT INTO estimates (id, company_id, project_id, customer_id, estimate_number, title, subtotal, tax_amount, total_amount, status, valid_until, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', 'EST-2025-001', '田中邸庭園リフォーム工事', 454545, 45455, 500000, 'draft', '2025-08-01', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440011', 'EST-2025-002', '佐藤邸新規造園工事', 727273, 72727, 800000, 'sent', '2025-08-15', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- デモ見積明細
INSERT INTO estimate_items (id, estimate_id, price_master_item_id, item_description, quantity, unit, purchase_price, markup_rate, unit_price, line_total, sort_order) VALUES 
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440020', 'ソメイヨシノ H3.0m', 2, '本', 15000, 1.5, 22500, 45000, 1),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440021', 'ツツジ H0.5m', 20, '本', 800, 1.8, 1440, 28800, 2),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440022', 'インターロッキング', 30, 'm2', 3500, 1.4, 4900, 147000, 3),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440024', '現場管理費', 1, '式', 50000, 1.0, 50000, 50000, 4)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- 7. トリガー関数（更新日時自動更新）
-- =================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_price_master_updated_at BEFORE UPDATE ON price_master FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON estimate_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =================================================================
-- 完了メッセージ
-- =================================================================

SELECT 'Garden DX Production Database Setup Complete!' as status,
       'Tables: ' || count(*) || ' created' as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'user_profiles', 'customers', 'price_master', 'projects', 'estimates', 'estimate_items', 'invoices');