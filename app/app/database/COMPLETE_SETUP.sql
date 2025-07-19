-- =================================================================
-- 庭想システム - 完全セットアップ（テーブル作成 + 管理者設定）
-- =================================================================
-- このスクリプトをSupabase SQL Editorで実行してください
-- ユーザーID: b591c784-71d9-4119-8123-c7fb47c6ed43

-- Step 1: 必要なExtensionを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: 会社テーブル（Supabase用にシンプル化）
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    postal_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: ユーザープロファイルテーブル（Supabase Auth連携）
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_user_profiles_role CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'viewer'))
);

-- Step 4: 顧客テーブル
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: 単価マスタテーブル
CREATE TABLE IF NOT EXISTS price_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12, 0) NOT NULL DEFAULT 0,
    default_markup_rate DECIMAL(5, 3) NOT NULL DEFAULT 1.300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'estimating',
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_projects_status CHECK (status IN ('estimating', 'approved', 'in_progress', 'completed', 'cancelled'))
);

-- Step 7: 見積テーブル
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_number VARCHAR(50) NOT NULL,
    estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal DECIMAL(12, 0) DEFAULT 0,
    tax_rate DECIMAL(5, 3) DEFAULT 0.100,
    tax_amount DECIMAL(12, 0) DEFAULT 0,
    total_amount DECIMAL(12, 0) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_estimates_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

-- Step 8: 見積明細テーブル
CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
    price_master_id UUID REFERENCES price_master(id) ON DELETE SET NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(20),
    unit_price DECIMAL(10, 0) DEFAULT 0,
    line_amount DECIMAL(12, 0) DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: RLS（Row Level Security）の設定
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Step 10: RLSポリシーの作成
-- 会社データへのアクセス制御
CREATE POLICY "Users can access their own company" ON companies
    FOR ALL USING (
        id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- ユーザープロファイルへのアクセス制御
CREATE POLICY "Users can access their own profile and company members" ON user_profiles
    FOR ALL USING (
        id = auth.uid() OR 
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 顧客データへのアクセス制御
CREATE POLICY "Users can access their company's customers" ON customers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 単価マスタへのアクセス制御
CREATE POLICY "Users can access their company's price master" ON price_master
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- プロジェクトへのアクセス制御
CREATE POLICY "Users can access their company's projects" ON projects
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 見積へのアクセス制御
CREATE POLICY "Users can access their company's estimates" ON estimates
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 見積明細へのアクセス制御
CREATE POLICY "Users can access their company's estimate items" ON estimate_items
    FOR ALL USING (
        estimate_id IN (
            SELECT id FROM estimates 
            WHERE company_id IN (
                SELECT company_id FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Step 11: 管理者用の会社データを作成
INSERT INTO companies (
    id, 
    name, 
    address, 
    phone, 
    email,
    postal_code
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '庭想システム管理会社',
    '東京都渋谷区',
    '03-0000-0000',
    'admin@teisou.com',
    '150-0001'
)
ON CONFLICT (id) DO UPDATE SET
    name = '庭想システム管理会社',
    updated_at = NOW();

-- Step 12: 管理者プロファイルを作成
INSERT INTO user_profiles (
    id,
    company_id,
    email,
    full_name,
    role,
    is_active
) VALUES (
    'b591c784-71d9-4119-8123-c7fb47c6ed43',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@teisou.com',
    'システム管理者',
    'owner',
    true
)
ON CONFLICT (id) DO UPDATE SET
    role = 'owner',
    is_active = true,
    updated_at = NOW();

-- Step 13: サンプルデータを作成
-- 顧客サンプル
INSERT INTO customers (
    id, 
    company_id, 
    name, 
    company_name, 
    address, 
    phone, 
    email
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440000',
    '山田太郎',
    '山田邸',
    '東京都世田谷区1-1-1',
    '090-1111-1111',
    'yamada@example.com'
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440000',
    '鈴木花子',
    '鈴木邸',
    '東京都杉並区2-2-2',
    '090-2222-2222',
    'suzuki@example.com'
)
ON CONFLICT (id) DO NOTHING;

-- 単価マスタサンプル
INSERT INTO price_master (
    id,
    company_id,
    category,
    sub_category,
    item_name,
    unit,
    purchase_price,
    default_markup_rate
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440000',
    '植栽工事',
    '高木',
    'ソメイヨシノ H3.0m',
    '本',
    15000,
    1.5
),
(
    '550e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440000',
    '植栽工事',
    '低木',
    'ツツジ H0.5m',
    '本',
    800,
    1.8
),
(
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440000',
    '外構工事',
    '舗装',
    'インターロッキング',
    'm2',
    3500,
    1.4
)
ON CONFLICT (id) DO NOTHING;

-- Step 14: 設定結果を確認
SELECT 'セットアップ完了確認' as status;

SELECT 'Companies:' as info;
SELECT id, name, email FROM companies;

SELECT 'User Profiles:' as info;
SELECT id, email, full_name, role FROM user_profiles;

SELECT 'Customers:' as info;
SELECT id, name, company_name FROM customers;

SELECT 'Price Master:' as info;
SELECT id, category, item_name, unit, purchase_price FROM price_master;

-- =================================================================
-- セットアップ完了！
-- =================================================================
-- ログイン情報:
-- URL: https://garden-dx-system.vercel.app
-- Email: admin@teisou.com
-- Password: Teisou2025!
-- =================================================================