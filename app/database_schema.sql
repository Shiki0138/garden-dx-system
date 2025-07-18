-- ============================================================
-- 造園業向け統合業務管理システム データベーススキーマ
-- Garden DX - Phase 1: 見積エンジン中核テーブル
-- ============================================================

-- 会社テーブル（マルチテナント対応）
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル（RBAC対応）
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'employee')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 顧客テーブル
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'corporate'
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 単価マスタテーブル（階層的カテゴリ管理）
CREATE TABLE price_master (
    item_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    category VARCHAR(100) NOT NULL, -- 大カテゴリ（例：植栽工事、外構工事）
    sub_category VARCHAR(100), -- 中カテゴリ（例：高木、低木、石材）
    item_name VARCHAR(255) NOT NULL, -- 品目名（例：マツ H3.0、ヒラドツツジ）
    item_code VARCHAR(50), -- 品目コード（検索用）
    unit VARCHAR(20) NOT NULL, -- 単位（本、m2、式など）
    purchase_price DECIMAL(10, 0) NOT NULL, -- 仕入単価（原価）
    default_markup_rate DECIMAL(5, 3) NOT NULL DEFAULT 1.300, -- 標準掛率（例：1.3 = 30%利益）
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 案件テーブル
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    project_name VARCHAR(255) NOT NULL,
    site_address VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'planning' 
        CHECK (status IN ('planning', 'estimating', 'quoted', 'contracted', 'in_progress', 'completed', 'invoiced', 'cancelled')),
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(12, 0), -- 実行予算（原価合計）
    actual_cost DECIMAL(12, 0) DEFAULT 0, -- 実績原価
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 見積テーブル
CREATE TABLE estimates (
    estimate_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    project_id INTEGER REFERENCES projects(project_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    estimate_number VARCHAR(50) UNIQUE NOT NULL, -- 見積番号
    estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE, -- 見積有効期限
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'expired')),
    
    -- 金額関連
    subtotal DECIMAL(12, 0) NOT NULL DEFAULT 0, -- 明細合計
    adjustment_amount DECIMAL(12, 0) DEFAULT 0, -- 合計調整額（値引き/割増）
    total_amount DECIMAL(12, 0) NOT NULL DEFAULT 0, -- 最終見積金額
    total_cost DECIMAL(12, 0) NOT NULL DEFAULT 0, -- 原価合計
    gross_profit DECIMAL(12, 0) NOT NULL DEFAULT 0, -- 粗利額
    gross_margin_rate DECIMAL(5, 3), -- 粗利率
    
    notes TEXT,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 見積明細テーブル（階層構造対応）
CREATE TABLE estimate_items (
    item_id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL REFERENCES estimates(estimate_id) ON DELETE CASCADE,
    price_master_item_id INTEGER REFERENCES price_master(item_id), -- NULLの場合は自由入力
    
    -- 階層構造
    parent_item_id INTEGER REFERENCES estimate_items(item_id), -- 親明細（見出し行など）
    level INTEGER NOT NULL DEFAULT 0, -- 階層レベル（0=大項目、1=中項目、2=内訳）
    sort_order INTEGER NOT NULL, -- 表示順
    item_type VARCHAR(20) NOT NULL DEFAULT 'item' 
        CHECK (item_type IN ('header', 'item', 'subtotal')), -- 'header'=見出し、'item'=明細、'subtotal'=小計
    
    -- 品目情報
    item_description VARCHAR(255) NOT NULL, -- 品目・摘要
    quantity DECIMAL(10, 2), -- 数量
    unit VARCHAR(20), -- 単位
    
    -- 価格情報
    purchase_price DECIMAL(10, 0), -- 仕入単価（原価）
    markup_rate DECIMAL(5, 3), -- 掛率
    unit_price DECIMAL(10, 0), -- 提出単価
    line_item_adjustment DECIMAL(10, 0) DEFAULT 0, -- 明細調整額
    line_total DECIMAL(12, 0), -- 明細金額（数量×単価+調整額）
    line_cost DECIMAL(12, 0), -- 明細原価（数量×仕入単価）
    
    -- フラグ
    is_free_entry BOOLEAN DEFAULT FALSE, -- 自由入力項目か
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 請求書テーブル
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    estimate_id INTEGER REFERENCES estimates(estimate_id),
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- 請求書番号
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE, -- 支払期限
    
    -- 金額
    invoice_amount DECIMAL(12, 0) NOT NULL, -- 請求金額
    tax_amount DECIMAL(12, 0) DEFAULT 0, -- 消費税額
    total_amount DECIMAL(12, 0) NOT NULL, -- 税込み合計
    
    status VARCHAR(50) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
    
    payment_method VARCHAR(50), -- 支払方法
    bank_info TEXT, -- 振込先情報
    notes TEXT,
    
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_price_master_company_id ON price_master(company_id);
CREATE INDEX idx_price_master_category ON price_master(category, sub_category);
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_estimates_company_id ON estimates(company_id);
CREATE INDEX idx_estimates_project_id ON estimates(project_id);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_parent ON estimate_items(parent_item_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

-- 初期データ投入例
INSERT INTO companies (company_name, address, phone, email) VALUES 
('サンプル造園', '東京都渋谷区1-1-1', '03-1234-5678', 'info@sample-garden.co.jp');

INSERT INTO users (company_id, username, email, password_hash, role, full_name) VALUES 
(1, 'owner', 'owner@sample-garden.co.jp', '$2b$12$hash_placeholder', 'owner', '代表取締役'),
(1, 'employee1', 'emp1@sample-garden.co.jp', '$2b$12$hash_placeholder', 'employee', '従業員A');

-- サンプル単価マスタデータ
INSERT INTO price_master (company_id, category, sub_category, item_name, item_code, unit, purchase_price, default_markup_rate, notes) VALUES 
(1, '植栽工事', '高木', 'マツ H3.0', 'PLANT_001', '本', 15000, 1.400, '黒松 高さ3m'),
(1, '植栽工事', '低木', 'ヒラドツツジ', 'PLANT_002', '本', 800, 1.500, '樹高0.5m'),
(1, '外構工事', '石材', '御影石 乱貼り', 'STONE_001', 'm2', 12000, 1.300, '厚さ30mm'),
(1, '外構工事', '舗装', 'インターロッキング', 'PAVE_001', 'm2', 8000, 1.250, '標準色'),
(1, '設備工事', '照明', 'LED庭園灯', 'LIGHT_001', '基', 25000, 1.200, '100V仕様');

COMMENT ON TABLE companies IS '会社テーブル：マルチテナント対応';
COMMENT ON TABLE users IS 'ユーザーテーブル：RBAC（役割ベースアクセス制御）';
COMMENT ON TABLE customers IS '顧客テーブル';
COMMENT ON TABLE price_master IS '単価マスタテーブル：階層的カテゴリ管理';
COMMENT ON TABLE projects IS '案件テーブル';
COMMENT ON TABLE estimates IS '見積テーブル：収益性管理機能付き';
COMMENT ON TABLE estimate_items IS '見積明細テーブル：階層構造対応';
COMMENT ON TABLE invoices IS '請求書テーブル';