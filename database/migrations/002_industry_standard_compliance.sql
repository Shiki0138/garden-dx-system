-- ======================================
-- Garden システム 造園業界標準対応
-- Migration: 002_industry_standard_compliance.sql
-- 緊急対応: 消費税率管理 + 業界標準フィールド
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '造園業界標準対応マイグレーション開始';
    RAISE NOTICE 'worker1見積書・worker3請求書PDF対応';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. 消費税率管理テーブル（時系列対応）
-- ======================================

CREATE TABLE IF NOT EXISTS tax_rates (
    tax_rate_id SERIAL PRIMARY KEY,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    tax_rate DECIMAL(5, 4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_tax_rates_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt')),
    CONSTRAINT chk_tax_rates_rate_range CHECK (tax_rate >= 0 AND tax_rate <= 1),
    CONSTRAINT chk_tax_rates_date_order CHECK (effective_from <= COALESCE(effective_to, effective_from)),
    
    -- 重複防止
    CONSTRAINT unq_tax_rates_type_period UNIQUE (tax_type, effective_from)
);

-- 税率履歴インデックス
CREATE INDEX IF NOT EXISTS idx_tax_rates_effective_period ON tax_rates(tax_type, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_tax_rates_active ON tax_rates(is_active) WHERE is_active = TRUE;

-- ======================================
-- 2. 造園業界標準項目マスタ
-- ======================================

CREATE TABLE IF NOT EXISTS industry_standard_items (
    standard_item_id SERIAL PRIMARY KEY,
    category_code VARCHAR(10) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    item_code VARCHAR(20) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    standard_unit VARCHAR(20) NOT NULL,
    tax_type VARCHAR(20) DEFAULT 'standard',
    industry_classification VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_industry_items_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt')),
    CONSTRAINT unq_industry_items_code UNIQUE (item_code)
);

-- ======================================
-- 3. 企業テーブル拡張（業界標準対応）
-- ======================================

-- 企業情報の造園業界標準フィールド追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    industry_registration_number VARCHAR(50); -- 造園業登録番号

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    business_license_number VARCHAR(50); -- 営業許可番号

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    tax_registration_number VARCHAR(20); -- 法人番号

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    default_tax_handling VARCHAR(20) DEFAULT 'exclusive'; -- 税込・税抜設定

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    bank_name VARCHAR(100); -- 銀行名

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    bank_branch VARCHAR(100); -- 支店名

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    bank_account_type VARCHAR(20) DEFAULT 'ordinary'; -- 口座種別

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    bank_account_number VARCHAR(20); -- 口座番号

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    bank_account_holder VARCHAR(100); -- 口座名義

-- 制約追加
ALTER TABLE companies ADD CONSTRAINT IF NOT EXISTS 
    chk_companies_tax_handling CHECK (default_tax_handling IN ('inclusive', 'exclusive'));

ALTER TABLE companies ADD CONSTRAINT IF NOT EXISTS 
    chk_companies_account_type CHECK (bank_account_type IN ('ordinary', 'current', 'savings'));

-- ======================================
-- 4. 見積テーブル拡張（造園業界標準対応）
-- ======================================

-- 見積書業界標準フィールド追加
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    estimate_title VARCHAR(255) DEFAULT '造園工事見積書'; -- 見積書タイトル

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    tax_handling VARCHAR(20) DEFAULT 'exclusive'; -- 税込・税抜

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    tax_rounding VARCHAR(20) DEFAULT 'round'; -- 税額端数処理

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    payment_terms TEXT; -- 支払条件

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    delivery_terms TEXT; -- 納期条件

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    warranty_terms TEXT; -- 保証条件

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    special_notes TEXT; -- 特記事項

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    construction_period VARCHAR(100); -- 工事期間

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    construction_location TEXT; -- 施工場所

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    estimate_conditions TEXT; -- 見積条件

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS 
    quote_number_format VARCHAR(50) DEFAULT 'EST-{YYYY}{MM}{DD}-{###}'; -- 見積番号フォーマット

-- 制約追加
ALTER TABLE estimates ADD CONSTRAINT IF NOT EXISTS 
    chk_estimates_tax_handling CHECK (tax_handling IN ('inclusive', 'exclusive'));

ALTER TABLE estimates ADD CONSTRAINT IF NOT EXISTS 
    chk_estimates_tax_rounding CHECK (tax_rounding IN ('round', 'floor', 'ceil'));

-- ======================================
-- 5. 請求書テーブル拡張（造園業界標準対応）
-- ======================================

-- 請求書業界標準フィールド追加
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    invoice_title VARCHAR(255) DEFAULT '請求書'; -- 請求書タイトル

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    tax_handling VARCHAR(20) DEFAULT 'exclusive'; -- 税込・税抜

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    tax_rounding VARCHAR(20) DEFAULT 'round'; -- 税額端数処理

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    billing_address TEXT; -- 請求先住所

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    delivery_address TEXT; -- 納品先住所

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    construction_completion_date DATE; -- 工事完了日

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    invoice_conditions TEXT; -- 請求条件

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    payment_deadline_days INTEGER DEFAULT 30; -- 支払期限日数

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    late_payment_penalty_rate DECIMAL(5, 3) DEFAULT 0.146; -- 遅延損害金利率

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    invoice_number_format VARCHAR(50) DEFAULT 'INV-{YYYY}{MM}{DD}-{###}'; -- 請求書番号フォーマット

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    seal_required BOOLEAN DEFAULT TRUE; -- 印鑑必要フラグ

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS 
    remittance_fee_handling VARCHAR(20) DEFAULT 'customer'; -- 振込手数料負担

-- 制約追加
ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS 
    chk_invoices_tax_handling CHECK (tax_handling IN ('inclusive', 'exclusive'));

ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS 
    chk_invoices_tax_rounding CHECK (tax_rounding IN ('round', 'floor', 'ceil'));

ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS 
    chk_invoices_payment_deadline CHECK (payment_deadline_days > 0);

ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS 
    chk_invoices_penalty_rate CHECK (late_payment_penalty_rate >= 0);

ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS 
    chk_invoices_remittance_fee CHECK (remittance_fee_handling IN ('customer', 'company', 'split'));

-- ======================================
-- 6. 見積明細テーブル拡張（税種別対応）
-- ======================================

-- 見積明細の税種別対応
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS 
    tax_type VARCHAR(20) DEFAULT 'standard'; -- 税種別

ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS 
    tax_rate DECIMAL(5, 4); -- 適用税率

ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS 
    tax_amount DECIMAL(10, 0) DEFAULT 0; -- 税額

ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS 
    line_total_with_tax DECIMAL(12, 0) DEFAULT 0; -- 税込金額

ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS 
    industry_standard_item_id INTEGER; -- 業界標準項目参照

-- 外部キー制約
ALTER TABLE estimate_items ADD CONSTRAINT IF NOT EXISTS 
    fk_estimate_items_industry_standard 
    FOREIGN KEY (industry_standard_item_id) 
    REFERENCES industry_standard_items(standard_item_id) ON DELETE SET NULL;

-- 制約追加
ALTER TABLE estimate_items ADD CONSTRAINT IF NOT EXISTS 
    chk_estimate_items_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt'));

ALTER TABLE estimate_items ADD CONSTRAINT IF NOT EXISTS 
    chk_estimate_items_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- ======================================
-- 7. 請求明細テーブル作成（見積から分離）
-- ======================================

CREATE TABLE IF NOT EXISTS invoice_items (
    item_id SERIAL PRIMARY KEY,
    item_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    invoice_id INTEGER NOT NULL,
    estimate_item_id INTEGER,
    sort_order INTEGER NOT NULL,
    item_type VARCHAR(20) DEFAULT 'item',
    item_description VARCHAR(255) NOT NULL,
    specification TEXT,
    quantity DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(20),
    unit_price DECIMAL(10, 0) DEFAULT 0,
    line_amount DECIMAL(12, 0) DEFAULT 0,
    tax_type VARCHAR(20) DEFAULT 'standard',
    tax_rate DECIMAL(5, 4),
    tax_amount DECIMAL(10, 0) DEFAULT 0,
    line_total_with_tax DECIMAL(12, 0) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_items_estimate_item FOREIGN KEY (estimate_item_id) REFERENCES estimate_items(item_id) ON DELETE SET NULL,
    
    -- 制約
    CONSTRAINT chk_invoice_items_item_type CHECK (item_type IN ('header', 'item', 'subtotal', 'note')),
    CONSTRAINT chk_invoice_items_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_invoice_items_prices_positive CHECK (unit_price >= 0),
    CONSTRAINT chk_invoice_items_tax_type CHECK (tax_type IN ('standard', 'reduced', 'zero', 'exempt')),
    CONSTRAINT chk_invoice_items_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 1),
    CONSTRAINT chk_invoice_items_amounts_positive CHECK (line_amount >= 0 AND tax_amount >= 0 AND line_total_with_tax >= 0)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_sort ON invoice_items(invoice_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_type ON invoice_items(tax_type);

-- ======================================
-- 8. 業界標準マスタデータ投入
-- ======================================

-- 消費税率履歴データ
INSERT INTO tax_rates (tax_type, tax_rate, effective_from, effective_to, description) VALUES
('standard', 0.05, '1989-04-01', '1997-03-31', '消費税導入時'),
('standard', 0.05, '1997-04-01', '2014-03-31', '消費税5%'),
('standard', 0.08, '2014-04-01', '2019-09-30', '消費税8%'),
('standard', 0.10, '2019-10-01', NULL, '消費税10%'),
('reduced', 0.08, '2019-10-01', NULL, '軽減税率8%'),
('zero', 0.00, '1989-04-01', NULL, 'ゼロ税率'),
('exempt', 0.00, '1989-04-01', NULL, '非課税')
ON CONFLICT (tax_type, effective_from) DO NOTHING;

-- 造園業界標準項目マスタ
INSERT INTO industry_standard_items (category_code, category_name, item_code, item_name, standard_unit, tax_type) VALUES
-- 植栽工事
('P', '植栽工事', 'P001', '高木植栽', '本', 'standard'),
('P', '植栽工事', 'P002', '中木植栽', '本', 'standard'),
('P', '植栽工事', 'P003', '低木植栽', '本', 'standard'),
('P', '植栽工事', 'P004', '地被植物', 'm2', 'standard'),
('P', '植栽工事', 'P005', '芝張り', 'm2', 'standard'),

-- 土工事
('E', '土工事', 'E001', '掘削工', 'm3', 'standard'),
('E', '土工事', 'E002', '盛土工', 'm3', 'standard'),
('E', '土工事', 'E003', '整地工', 'm2', 'standard'),
('E', '土工事', 'E004', '土壌改良', 'm3', 'standard'),

-- 石工事
('S', '石工事', 'S001', '自然石積み', 'm2', 'standard'),
('S', '石工事', 'S002', 'コンクリート擁壁', 'm2', 'standard'),
('S', '石工事', 'S003', '飛石据付', '枚', 'standard'),
('S', '石工事', 'S004', '縁石据付', 'm', 'standard'),

-- 給排水工事
('W', '給排水工事', 'W001', '給水管設置', 'm', 'standard'),
('W', '給排水工事', 'W002', '排水管設置', 'm', 'standard'),
('W', '給排水工事', 'W003', '散水設備', '式', 'standard'),

-- その他
('O', 'その他', 'O001', '設計費', '式', 'standard'),
('O', 'その他', 'O002', '現場管理費', '式', 'standard'),
('O', 'その他', 'O003', '諸経費', '式', 'standard')
ON CONFLICT (item_code) DO NOTHING;

-- ======================================
-- 9. 税計算関数の更新
-- ======================================

-- 現在有効な税率取得関数
CREATE OR REPLACE FUNCTION get_current_tax_rate(tax_type_param VARCHAR DEFAULT 'standard')
RETURNS DECIMAL(5, 4) AS $$
DECLARE
    current_rate DECIMAL(5, 4);
BEGIN
    SELECT tax_rate INTO current_rate
    FROM tax_rates
    WHERE tax_type = tax_type_param
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    AND is_active = TRUE
    ORDER BY effective_from DESC
    LIMIT 1;
    
    RETURN COALESCE(current_rate, 0.10); -- デフォルト10%
END;
$$ LANGUAGE plpgsql;

-- 税額計算関数（端数処理対応）
CREATE OR REPLACE FUNCTION calculate_tax_amount(
    base_amount DECIMAL(12, 0),
    tax_rate_param DECIMAL(5, 4),
    rounding_method VARCHAR DEFAULT 'round'
) RETURNS DECIMAL(10, 0) AS $$
DECLARE
    calculated_tax DECIMAL(15, 4);
    result_tax DECIMAL(10, 0);
BEGIN
    calculated_tax := base_amount * tax_rate_param;
    
    CASE rounding_method
        WHEN 'round' THEN
            result_tax := ROUND(calculated_tax);
        WHEN 'floor' THEN
            result_tax := FLOOR(calculated_tax);
        WHEN 'ceil' THEN
            result_tax := CEIL(calculated_tax);
        ELSE
            result_tax := ROUND(calculated_tax);
    END CASE;
    
    RETURN result_tax;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 10. 見積・請求書計算トリガー更新
-- ======================================

-- 見積明細計算トリガー関数（税種別対応）
CREATE OR REPLACE FUNCTION calculate_estimate_item_totals()
RETURNS TRIGGER AS $$
DECLARE
    estimate_record RECORD;
    current_tax_rate DECIMAL(5, 4);
BEGIN
    -- 税率設定（未設定の場合は現在税率を取得）
    IF NEW.tax_rate IS NULL THEN
        NEW.tax_rate := get_current_tax_rate(NEW.tax_type);
    END IF;
    
    -- 基本計算
    NEW.line_amount := NEW.quantity * NEW.unit_price;
    NEW.line_cost := NEW.quantity * NEW.purchase_price;
    NEW.line_profit := NEW.line_amount - NEW.line_cost;
    
    -- 税額計算
    SELECT tax_handling, tax_rounding INTO estimate_record
    FROM estimates WHERE estimate_id = NEW.estimate_id;
    
    IF estimate_record.tax_handling = 'exclusive' THEN
        -- 税抜計算
        NEW.tax_amount := calculate_tax_amount(NEW.line_amount, NEW.tax_rate, estimate_record.tax_rounding);
        NEW.line_total_with_tax := NEW.line_amount + NEW.tax_amount;
    ELSE
        -- 税込計算
        NEW.line_total_with_tax := NEW.line_amount;
        NEW.tax_amount := calculate_tax_amount(NEW.line_amount * NEW.tax_rate / (1 + NEW.tax_rate), NEW.tax_rate, estimate_record.tax_rounding);
        NEW.line_amount := NEW.line_total_with_tax - NEW.tax_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積合計計算トリガー関数（税種別対応）
CREATE OR REPLACE FUNCTION calculate_estimate_totals_advanced()
RETURNS TRIGGER AS $$
DECLARE
    estimate_record RECORD;
    subtotal DECIMAL(12, 0);
    total_tax DECIMAL(12, 0);
    total_cost DECIMAL(12, 0);
BEGIN
    -- 関連する見積のIDを取得
    IF TG_OP = 'DELETE' THEN
        estimate_record := OLD;
    ELSE
        estimate_record := NEW;
    END IF;
    
    -- 見積明細の合計を計算（税種別）
    SELECT 
        COALESCE(SUM(line_amount), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(line_cost), 0)
    INTO subtotal, total_tax, total_cost
    FROM estimate_items 
    WHERE estimate_id = estimate_record.estimate_id 
    AND item_type = 'item';
    
    -- 見積テーブルを更新
    UPDATE estimates SET
        subtotal = subtotal,
        tax_amount = total_tax,
        total_amount = subtotal + total_tax + COALESCE(final_adjustment, 0),
        total_cost = total_cost,
        gross_profit = subtotal - total_cost,
        profit_margin = CASE 
            WHEN subtotal > 0 THEN (subtotal - total_cost) / subtotal 
            ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE estimate_id = estimate_record.estimate_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 11. トリガー再作成
-- ======================================

-- 既存トリガー削除
DROP TRIGGER IF EXISTS trigger_calculate_estimate_totals ON estimate_items;
DROP TRIGGER IF EXISTS trigger_calculate_estimate_item_values ON estimate_items;

-- 新しいトリガー作成
CREATE TRIGGER trigger_calculate_estimate_item_values 
    BEFORE INSERT OR UPDATE ON estimate_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_estimate_item_totals();

CREATE TRIGGER trigger_calculate_estimate_totals_advanced 
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_estimate_totals_advanced();

-- 請求明細トリガー
CREATE TRIGGER trigger_calculate_invoice_item_totals 
    BEFORE INSERT OR UPDATE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_estimate_item_totals();

-- 更新日時トリガー
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON tax_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_industry_standard_items_updated_at BEFORE UPDATE ON industry_standard_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 12. 新しいインデックス作成
-- ======================================

-- 業界標準検索用インデックス
CREATE INDEX IF NOT EXISTS idx_estimates_industry_fields ON estimates(construction_period, tax_handling);
CREATE INDEX IF NOT EXISTS idx_invoices_industry_fields ON invoices(construction_completion_date, tax_handling);
CREATE INDEX IF NOT EXISTS idx_estimate_items_tax_type_rate ON estimate_items(tax_type, tax_rate);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_type_rate ON invoice_items(tax_type, tax_rate);

-- 金額範囲検索用インデックス
CREATE INDEX IF NOT EXISTS idx_estimates_amount_range ON estimates(total_amount) WHERE total_amount > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_amount_range ON invoices(total_amount) WHERE total_amount > 0;

-- ======================================
-- 完了確認とバリデーション
-- ======================================

DO $$
DECLARE
    table_count INTEGER;
    new_column_count INTEGER;
    tax_rate_count INTEGER;
    industry_item_count INTEGER;
BEGIN
    -- 追加テーブル確認
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tax_rates', 'industry_standard_items', 'invoice_items');
    
    -- 追加カラム確認
    SELECT COUNT(*) INTO new_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name IN ('companies', 'estimates', 'invoices', 'estimate_items')
    AND column_name IN ('tax_handling', 'tax_rounding', 'bank_name', 'industry_registration_number');
    
    -- マスタデータ確認
    SELECT COUNT(*) INTO tax_rate_count FROM tax_rates WHERE is_active = TRUE;
    SELECT COUNT(*) INTO industry_item_count FROM industry_standard_items WHERE is_active = TRUE;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '造園業界標準対応マイグレーション完了';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '追加テーブル数: %', table_count;
    RAISE NOTICE '追加カラム数: %', new_column_count;
    RAISE NOTICE '税率マスタ: %件', tax_rate_count;
    RAISE NOTICE '業界標準項目: %件', industry_item_count;
    RAISE NOTICE '===========================================';
    
    IF table_count = 3 AND tax_rate_count > 0 AND industry_item_count > 0 THEN
        RAISE NOTICE '✅ 造園業界標準対応 - 完全成功！';
    ELSE
        RAISE WARNING '⚠️ 一部マイグレーションに問題があります';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;