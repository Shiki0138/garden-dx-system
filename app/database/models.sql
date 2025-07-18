-- Garden 造園業向け統合業務管理システム
-- データベース設計: 見積エンジン関連テーブル
-- マルチテナント対応、仕様書準拠

-- 会社テーブル（マルチテナント用）
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 顧客テーブル
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT '個人', -- '個人', '法人'
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 単価マスタテーブル（階層構造対応）
CREATE TABLE price_master (
    item_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    category VARCHAR(100) NOT NULL, -- 大カテゴリ: '植栽工事', '外構工事'
    sub_category VARCHAR(100), -- 中カテゴリ: '高木', '低木', '石材'
    item_name VARCHAR(255) NOT NULL, -- 品目名: 'マツ H3.0', 'ヒラドツツジ'
    unit VARCHAR(20) NOT NULL, -- 単位: '本', 'm2', '式'
    purchase_price DECIMAL(10, 0) NOT NULL, -- 仕入単価
    default_markup_rate DECIMAL(5, 3) NOT NULL DEFAULT 1.300, -- 標準掛率（1.3 = 30%利益）
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_price_master_company (company_id),
    INDEX idx_price_master_category (category, sub_category),
    INDEX idx_price_master_search (item_name, category)
);

-- 見積テーブル
CREATE TABLE estimates (
    estimate_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    estimate_number VARCHAR(50) NOT NULL, -- 見積番号
    estimate_name VARCHAR(255) NOT NULL, -- 見積名
    site_address TEXT, -- 現場住所
    status VARCHAR(50) DEFAULT '作成中', -- '作成中', '提出済', '承認', '失注', 'キャンセル'
    estimate_date DATE NOT NULL,
    valid_until DATE, -- 見積有効期限
    
    -- 金額計算項目
    subtotal_amount DECIMAL(12, 0) DEFAULT 0, -- 小計
    adjustment_amount DECIMAL(12, 0) DEFAULT 0, -- 調整額（値引き・割増）
    adjustment_rate DECIMAL(5, 3) DEFAULT 0, -- 調整率
    total_amount DECIMAL(12, 0) DEFAULT 0, -- 最終見積金額
    total_cost DECIMAL(12, 0) DEFAULT 0, -- 総原価
    gross_profit DECIMAL(12, 0) DEFAULT 0, -- 粗利額
    gross_profit_rate DECIMAL(5, 3) DEFAULT 0, -- 粗利率
    
    -- 備考・条件
    notes TEXT,
    terms_and_conditions TEXT, -- 約款・注意事項
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_estimates_company (company_id),
    INDEX idx_estimates_customer (customer_id),
    INDEX idx_estimates_number (estimate_number),
    INDEX idx_estimates_status (status),
    UNIQUE KEY unique_estimate_number (company_id, estimate_number)
);

-- 見積明細テーブル（階層構造対応）
CREATE TABLE estimate_items (
    item_id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL REFERENCES estimates(estimate_id) ON DELETE CASCADE,
    price_master_item_id INTEGER REFERENCES price_master(item_id), -- NULL可（自由入力の場合）
    
    -- 階層構造
    parent_item_id INTEGER REFERENCES estimate_items(item_id), -- 親項目ID（見出し行用）
    level INTEGER DEFAULT 0, -- 階層レベル（0=大項目, 1=中項目, 2=明細）
    sort_order INTEGER NOT NULL DEFAULT 0, -- 表示順
    item_type VARCHAR(20) DEFAULT 'item', -- 'header', 'item', 'subtotal'
    
    -- 品目情報
    item_description VARCHAR(255) NOT NULL, -- 品目・摘要
    specification TEXT, -- 仕様
    quantity DECIMAL(10, 2) DEFAULT 0, -- 数量
    unit VARCHAR(20), -- 単位
    
    -- 価格情報
    purchase_price DECIMAL(10, 0) DEFAULT 0, -- 仕入単価
    markup_rate DECIMAL(5, 3) DEFAULT 1.300, -- 掛率
    unit_price DECIMAL(10, 0) DEFAULT 0, -- 提出単価
    line_item_adjustment DECIMAL(10, 0) DEFAULT 0, -- 明細調整額
    line_total DECIMAL(12, 0) DEFAULT 0, -- 行合計
    line_cost DECIMAL(12, 0) DEFAULT 0, -- 行原価
    
    -- フラグ
    is_free_entry BOOLEAN DEFAULT FALSE, -- 自由入力項目か
    is_visible_to_customer BOOLEAN DEFAULT TRUE, -- 顧客向け表示
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_estimate_items_estimate (estimate_id),
    INDEX idx_estimate_items_sort (estimate_id, sort_order),
    INDEX idx_estimate_items_hierarchy (parent_item_id, level)
);

-- 見積履歴テーブル（変更追跡用）
CREATE TABLE estimate_history (
    history_id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL REFERENCES estimates(estimate_id),
    change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'submitted', 'approved'
    change_description TEXT,
    changed_by INTEGER, -- ユーザーID（将来の拡張用）
    old_values JSONB, -- 変更前の値
    new_values JSONB, -- 変更後の値
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- トリガー関数：見積明細変更時の金額再計算
CREATE OR REPLACE FUNCTION calculate_estimate_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- 見積の合計金額を再計算
    UPDATE estimates 
    SET 
        subtotal_amount = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM estimate_items 
            WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
            AND item_type = 'item'
        ),
        total_cost = (
            SELECT COALESCE(SUM(line_cost), 0) 
            FROM estimate_items 
            WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
            AND item_type = 'item'
        )
    WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    
    -- 最終金額と粗利の計算
    UPDATE estimates 
    SET 
        total_amount = subtotal_amount + adjustment_amount,
        gross_profit = (subtotal_amount + adjustment_amount) - total_cost,
        gross_profit_rate = CASE 
            WHEN (subtotal_amount + adjustment_amount) > 0 
            THEN ((subtotal_amount + adjustment_amount) - total_cost) / (subtotal_amount + adjustment_amount) 
            ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER trigger_calculate_estimate_totals
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_estimate_totals();

-- 見積番号自動生成関数
CREATE OR REPLACE FUNCTION generate_estimate_number(comp_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    current_year VARCHAR(4);
    sequence_num INTEGER;
    estimate_num VARCHAR(50);
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- その年の見積番号の最大値を取得
    SELECT COALESCE(MAX(
        CASE 
            WHEN estimate_number ~ ('^' || current_year || '-[0-9]+$') 
            THEN SUBSTRING(estimate_number FROM '[0-9]+$')::INTEGER 
            ELSE 0 
        END
    ), 0) + 1 INTO sequence_num
    FROM estimates 
    WHERE company_id = comp_id;
    
    estimate_num := current_year || '-' || LPAD(sequence_num::VARCHAR, 4, '0');
    
    RETURN estimate_num;
END;
$$ LANGUAGE plpgsql;

-- サンプルデータ投入
INSERT INTO companies (company_name, address, phone, email) VALUES 
('株式会社庭園工房', '東京都渋谷区xxx-xxx', '03-1234-5678', 'info@garden-kobo.co.jp');

INSERT INTO price_master (company_id, category, sub_category, item_name, unit, purchase_price, default_markup_rate) VALUES 
(1, '植栽工事', '高木', 'マツ H3.0', '本', 15000, 1.400),
(1, '植栽工事', '高木', 'ケヤキ H4.0', '本', 25000, 1.350),
(1, '植栽工事', '低木', 'ヒラドツツジ H0.8', '本', 1200, 1.500),
(1, '植栽工事', '地被類', '芝張り（高麗芝）', 'm2', 800, 1.600),
(1, '外構工事', '石材', '御影石敷石 t=30', 'm2', 8000, 1.300),
(1, '外構工事', '石材', '玉石積み', 'm2', 12000, 1.250),
(1, '管理費', 'その他', '現場管理費', '式', 0, 1.000);

COMMENT ON TABLE companies IS '会社マスタ（マルチテナント対応）';
COMMENT ON TABLE customers IS '顧客マスタ';
COMMENT ON TABLE price_master IS '単価マスタ（階層構造対応）';
COMMENT ON TABLE estimates IS '見積テーブル';
COMMENT ON TABLE estimate_items IS '見積明細テーブル（階層構造・ドラッグ&ドロップ対応）';
COMMENT ON TABLE estimate_history IS '見積変更履歴';