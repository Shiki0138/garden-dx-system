-- ======================================
-- 単価マスター・価格システム拡張スキーマ
-- バージョンアップ: 仕入額・掛け率・調整額機能
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';\nctory    RAISE NOTICE '【バージョンアップ】単価マスター拡張開始';\n    RAISE NOTICE 'カテゴリ階層・価格履歴・計算エンジン実装';\n    RAISE NOTICE '===========================================';\nEND $$;

-- ======================================
-- 1. カテゴリマスターテーブル（階層構造）
-- ======================================

CREATE TABLE IF NOT EXISTS price_categories (
    category_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    parent_category_id INTEGER,
    category_code VARCHAR(20) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_name_kana VARCHAR(100),
    category_description TEXT,
    level_depth INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    icon_name VARCHAR(50),
    color_code VARCHAR(7) DEFAULT '#4CAF50',
    is_leaf_category BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_price_categories_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_price_categories_parent FOREIGN KEY (parent_category_id) REFERENCES price_categories(category_id) ON DELETE CASCADE,
    CONSTRAINT unq_price_categories_company_code UNIQUE (company_id, category_code),
    CONSTRAINT chk_price_categories_level CHECK (level_depth >= 1 AND level_depth <= 5),
    CONSTRAINT chk_price_categories_parent_level CHECK (
        parent_category_id IS NULL OR 
        (SELECT level_depth FROM price_categories p WHERE p.category_id = parent_category_id) < level_depth
    )
);

-- カテゴリ階層データ投入
INSERT INTO price_categories (company_id, parent_category_id, category_code, category_name, category_name_kana, level_depth, sort_order, icon_name, color_code, is_leaf_category) VALUES
-- レベル1（大分類）
(1, NULL, 'P', '植栽工事', 'ショクサイコウジ', 1, 1, 'local_florist', '#4CAF50', FALSE),
(1, NULL, 'E', '土工事', 'ツチコウジ', 1, 2, 'landscape', '#8BC34A', FALSE),
(1, NULL, 'S', '石工事', 'イシコウジ', 1, 3, 'terrain', '#607D8B', FALSE),
(1, NULL, 'W', '給排水工事', 'キュウハイスイコウジ', 1, 4, 'water_drop', '#2196F3', FALSE),
(1, NULL, 'F', '施設工事', 'シセツコウジ', 1, 5, 'build', '#FF9800', FALSE),

-- レベル2（中分類）
(1, 1, 'P01', '高木植栽', 'コウボクショクサイ', 2, 1, 'park', '#4CAF50', FALSE),
(1, 1, 'P02', '中木植栽', 'チュウボクショクサイ', 2, 2, 'nature', '#66BB6A', FALSE),
(1, 1, 'P03', '低木植栽', 'テイボクショクサイ', 2, 3, 'grass', '#81C784', FALSE),
(1, 1, 'P04', '芝・グランドカバー', 'シバ・グランドカバー', 2, 4, 'yard', '#A5D6A7', FALSE),

(1, 2, 'E01', '掘削工事', 'クッサクコウジ', 2, 1, 'construction', '#8BC34A', FALSE),
(1, 2, 'E02', '埋戻・整地', 'ウメモドシ・セイチ', 2, 2, 'agriculture', '#9CCC65', FALSE),
(1, 2, 'E03', '土壌改良', 'ドジョウカイリョウ', 2, 3, 'eco', '#AED581', FALSE),

(1, 3, 'S01', '石積・擁壁', 'イシヅミ・ヨウヘキ', 2, 1, 'foundation', '#607D8B', FALSE),
(1, 3, 'S02', '石張・舗装', 'イシバリ・ホソウ', 2, 2, 'texture', '#78909C', FALSE),
(1, 3, 'S03', '飛石・敷石', 'トビイシ・シキイシ', 2, 3, 'scatter_plot', '#90A4AE', FALSE),

-- レベル3（小分類）  
(1, 6, 'P0101', '常緑高木', 'ジョウリョクコウボク', 3, 1, 'forest', '#4CAF50', TRUE),
(1, 6, 'P0102', '落葉高木', 'ラクヨウコウボク', 3, 2, 'forest', '#689F38', TRUE),
(1, 7, 'P0201', '常緑中木', 'ジョウリョクチュウボク', 3, 1, 'nature_people', '#66BB6A', TRUE),
(1, 7, 'P0202', '落葉中木', 'ラクヨウチュウボク', 3, 2, 'nature_people', '#7CB342', TRUE)
ON CONFLICT (company_id, category_code) DO NOTHING;

-- ======================================
-- 2. 拡張単価マスターテーブル
-- ======================================

-- 既存price_masterテーブル拡張
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS category_id INTEGER;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,0) DEFAULT 0;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS markup_rate DECIMAL(5,3) DEFAULT 1.300;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(10,0) DEFAULT 0;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,0);
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS price_calculation_method VARCHAR(20) DEFAULT 'markup';
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10,3) DEFAULT 1.000;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS unit_weight DECIMAL(8,2);
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS seasonal_factor DECIMAL(4,3) DEFAULT 1.000;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS quality_grade VARCHAR(10) DEFAULT 'A';
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS specification_notes TEXT;
ALTER TABLE price_master ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

-- 外部キー制約追加
ALTER TABLE price_master ADD CONSTRAINT fk_price_master_category 
    FOREIGN KEY (category_id) REFERENCES price_categories(category_id) ON DELETE SET NULL;

-- 計算方法チェック制約
ALTER TABLE price_master ADD CONSTRAINT chk_price_master_calculation_method 
    CHECK (price_calculation_method IN ('markup', 'fixed', 'cost_plus', 'market_based'));

-- 品質グレードチェック制約
ALTER TABLE price_master ADD CONSTRAINT chk_price_master_quality_grade 
    CHECK (quality_grade IN ('S', 'A', 'B', 'C'));

-- ======================================
-- 3. 価格履歴テーブル
-- ======================================

CREATE TABLE IF NOT EXISTS price_history (
    history_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    change_reason TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    previous_purchase_price DECIMAL(10,0),
    new_purchase_price DECIMAL(10,0),
    previous_markup_rate DECIMAL(5,3),
    new_markup_rate DECIMAL(5,3),
    previous_adjustment_amount DECIMAL(10,0),
    new_adjustment_amount DECIMAL(10,0),
    previous_final_price DECIMAL(10,0),
    new_final_price DECIMAL(10,0),
    changed_by INTEGER,
    change_approved_by INTEGER,
    change_approved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_price_history_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_price_history_item FOREIGN KEY (item_id) REFERENCES price_master(item_id) ON DELETE CASCADE,
    CONSTRAINT fk_price_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_price_history_approved_by FOREIGN KEY (change_approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_price_history_change_type CHECK (change_type IN ('price_update', 'markup_update', 'adjustment_update', 'bulk_update', 'seasonal_update', 'market_update'))
);

-- ======================================
-- 4. 季節・市場価格変動テーブル
-- ======================================

CREATE TABLE IF NOT EXISTS seasonal_pricing (
    seasonal_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    category_id INTEGER,
    item_id INTEGER,
    season_name VARCHAR(20) NOT NULL,
    start_month INTEGER NOT NULL,
    end_month INTEGER NOT NULL,
    price_factor DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    availability_factor DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    quality_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_seasonal_pricing_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_seasonal_pricing_category FOREIGN KEY (category_id) REFERENCES price_categories(category_id) ON DELETE CASCADE,
    CONSTRAINT fk_seasonal_pricing_item FOREIGN KEY (item_id) REFERENCES price_master(item_id) ON DELETE CASCADE,
    CONSTRAINT chk_seasonal_pricing_months CHECK (start_month >= 1 AND start_month <= 12 AND end_month >= 1 AND end_month <= 12),
    CONSTRAINT chk_seasonal_pricing_season CHECK (season_name IN ('spring', 'summer', 'autumn', 'winter', 'rainy', 'year_round'))
);

-- 季節データ投入
INSERT INTO seasonal_pricing (company_id, category_id, season_name, start_month, end_month, price_factor, availability_factor, quality_notes) VALUES
(1, 1, 'spring', 3, 5, 1.200, 1.000, '植栽最適期・品質最良'),
(1, 1, 'summer', 6, 8, 1.500, 0.700, '猛暑による品質低下・枯死リスク高'),
(1, 1, 'autumn', 9, 11, 1.100, 1.200, '植栽適期・豊富な在庫'),
(1, 1, 'winter', 12, 2, 0.900, 0.800, '休眠期・移植リスク低・在庫限定'),
(1, 2, 'rainy', 6, 7, 1.300, 0.600, '梅雨期・土工事困難・機械稼働率低下'),
(1, 2, 'year_round', 1, 12, 1.000, 1.000, '通年施工可能')
ON CONFLICT DO NOTHING;

-- ======================================
-- 5. 仕入先・サプライヤー管理テーブル
-- ======================================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(50) NOT NULL,
    contact_person VARCHAR(100),
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    business_type VARCHAR(50),
    speciality_categories TEXT[],
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    quality_rating INTEGER DEFAULT 5,
    reliability_rating INTEGER DEFAULT 5,
    price_competitiveness INTEGER DEFAULT 5,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_suppliers_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT unq_suppliers_company_code UNIQUE (company_id, supplier_code),
    CONSTRAINT chk_suppliers_quality_rating CHECK (quality_rating >= 1 AND quality_rating <= 10),
    CONSTRAINT chk_suppliers_reliability_rating CHECK (reliability_rating >= 1 AND reliability_rating <= 10),
    CONSTRAINT chk_suppliers_price_competitiveness CHECK (price_competitiveness >= 1 AND price_competitiveness <= 10)
);

-- 仕入先データ投入
INSERT INTO suppliers (company_id, supplier_name, supplier_code, contact_person, phone, email, business_type, speciality_categories, quality_rating, reliability_rating, price_competitiveness) VALUES
(1, '緑化資材株式会社', 'SUP001', '営業部 田中', '03-1234-5678', 'tanaka@ryokka-shizai.co.jp', '造園資材卸売', ARRAY['高木', '中木', '低木'], 9, 9, 7),
(1, '桜専門ナーセリー', 'SUP002', '代表 佐藤', '03-2345-6789', 'sato@sakura-nursery.co.jp', '専門苗木生産', ARRAY['桜', '花木'], 10, 8, 8),
(1, '石材店・山田商店', 'SUP003', '山田 次郎', '03-3456-7890', 'yamada@ishizai-ten.co.jp', '石材販売', ARRAY['自然石', '切石', '砂利'], 8, 9, 9),
(1, '土木工事業者・協和建設', 'SUP004', '工事部 鈴木', '03-4567-8901', 'suzuki@kyowa-kensetsu.co.jp', '土木工事業', ARRAY['掘削', '整地', '運搬'], 7, 10, 8),
(1, '花木園芸センター', 'SUP005', '店長 高橋', '03-5678-9012', 'takahashi@kaki-engei.co.jp', '園芸小売', ARRAY['花木', '生垣', '鉢物'], 8, 8, 9)
ON CONFLICT (company_id, supplier_code) DO NOTHING;

-- ======================================
-- 6. 単価マスター・仕入先関連テーブル
-- ======================================

CREATE TABLE IF NOT EXISTS item_suppliers (
    item_supplier_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    supplier_item_code VARCHAR(100),
    supplier_item_name VARCHAR(255),
    supplier_price DECIMAL(10,0),
    minimum_order_quantity DECIMAL(10,3) DEFAULT 1.000,
    delivery_days INTEGER DEFAULT 7,
    price_valid_from DATE DEFAULT CURRENT_DATE,
    price_valid_until DATE,
    is_primary_supplier BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT fk_item_suppliers_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_suppliers_item FOREIGN KEY (item_id) REFERENCES price_master(item_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_suppliers_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    CONSTRAINT unq_item_suppliers_item_supplier UNIQUE (item_id, supplier_id)
);

-- ======================================
-- 7. インデックス作成
-- ======================================

-- カテゴリ関連インデックス
CREATE INDEX IF NOT EXISTS idx_price_categories_company ON price_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_price_categories_parent ON price_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_price_categories_level ON price_categories(level_depth);
CREATE INDEX IF NOT EXISTS idx_price_categories_active ON price_categories(is_active);

-- 拡張単価マスターインデックス
CREATE INDEX IF NOT EXISTS idx_price_master_category ON price_master(category_id);
CREATE INDEX IF NOT EXISTS idx_price_master_final_price ON price_master(final_price);
CREATE INDEX IF NOT EXISTS idx_price_master_calculation_method ON price_master(price_calculation_method);

-- 価格履歴インデックス
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(change_type);

-- 季節価格インデックス
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_category ON seasonal_pricing(category_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_season ON seasonal_pricing(season_name);

-- 仕入先関連インデックス
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_item_suppliers_item ON item_suppliers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suppliers_supplier ON item_suppliers(supplier_id);

-- ======================================
-- 8. 価格計算関数・トリガー
-- ======================================

-- 価格自動計算関数
CREATE OR REPLACE FUNCTION calculate_final_price()
RETURNS TRIGGER AS $$
DECLARE
    calculated_price DECIMAL(10,0);
    seasonal_factor DECIMAL(4,3) := 1.000;
    current_month INTEGER;
BEGIN
    -- 現在の月を取得
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- 季節係数を取得
    SELECT COALESCE(price_factor, 1.000) INTO seasonal_factor
    FROM seasonal_pricing sp
    WHERE sp.company_id = NEW.company_id
    AND (sp.item_id = NEW.item_id OR (sp.item_id IS NULL AND sp.category_id = NEW.category_id))
    AND current_month BETWEEN sp.start_month AND sp.end_month
    AND sp.is_active = TRUE
    ORDER BY sp.item_id NULLS LAST
    LIMIT 1;
    
    -- 計算方法に応じて価格計算
    CASE NEW.price_calculation_method
        WHEN 'markup' THEN
            calculated_price := ROUND((COALESCE(NEW.purchase_price, 0) * COALESCE(NEW.markup_rate, 1.300) + COALESCE(NEW.adjustment_amount, 0)) * seasonal_factor);
        WHEN 'fixed' THEN
            calculated_price := ROUND((COALESCE(NEW.standard_price, 0) + COALESCE(NEW.adjustment_amount, 0)) * seasonal_factor);
        WHEN 'cost_plus' THEN
            calculated_price := ROUND((COALESCE(NEW.purchase_price, 0) + COALESCE(NEW.cost_price, 0) + COALESCE(NEW.adjustment_amount, 0)) * seasonal_factor);
        WHEN 'market_based' THEN
            calculated_price := ROUND((COALESCE(NEW.standard_price, 0) * 1.100 + COALESCE(NEW.adjustment_amount, 0)) * seasonal_factor);
        ELSE
            calculated_price := COALESCE(NEW.standard_price, 0);
    END CASE;
    
    NEW.final_price := calculated_price;
    NEW.seasonal_factor := seasonal_factor;
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 価格変更履歴記録関数
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 価格関連の変更があった場合のみ履歴記録
    IF OLD.purchase_price != NEW.purchase_price OR 
       OLD.markup_rate != NEW.markup_rate OR 
       OLD.adjustment_amount != NEW.adjustment_amount OR
       OLD.final_price != NEW.final_price THEN
        
        INSERT INTO price_history (
            company_id, item_id, change_type, change_reason,
            previous_purchase_price, new_purchase_price,
            previous_markup_rate, new_markup_rate,
            previous_adjustment_amount, new_adjustment_amount,
            previous_final_price, new_final_price,
            changed_by
        ) VALUES (
            NEW.company_id, NEW.item_id, 'price_update', '価格自動更新',
            OLD.purchase_price, NEW.purchase_price,
            OLD.markup_rate, NEW.markup_rate,
            OLD.adjustment_amount, NEW.adjustment_amount,
            OLD.final_price, NEW.final_price,
            1 -- システム更新
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 9. トリガー設定
-- ======================================

-- 価格自動計算トリガー
CREATE TRIGGER calculate_final_price_trigger
    BEFORE INSERT OR UPDATE ON price_master
    FOR EACH ROW
    WHEN (NEW.purchase_price IS NOT NULL OR NEW.markup_rate IS NOT NULL OR NEW.adjustment_amount IS NOT NULL)
    EXECUTE FUNCTION calculate_final_price();

-- 価格変更履歴トリガー
CREATE TRIGGER record_price_history_trigger
    AFTER UPDATE ON price_master
    FOR EACH ROW
    EXECUTE FUNCTION record_price_history();

-- 更新日時トリガー
CREATE TRIGGER update_price_categories_updated_at BEFORE UPDATE ON price_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasonal_pricing_updated_at BEFORE UPDATE ON seasonal_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_item_suppliers_updated_at BEFORE UPDATE ON item_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 10. Row Level Security 設定
-- ======================================

-- RLS有効化
ALTER TABLE price_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_suppliers ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
CREATE POLICY price_categories_company_policy ON price_categories
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY price_history_company_policy ON price_history
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY seasonal_pricing_company_policy ON seasonal_pricing
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY suppliers_company_policy ON suppliers
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

CREATE POLICY item_suppliers_company_policy ON item_suppliers
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- ======================================
-- 11. 完了確認
-- ======================================

DO $$
DECLARE
    new_tables_count INTEGER;
    new_columns_count INTEGER;
    new_indexes_count INTEGER;
    new_triggers_count INTEGER;
    new_functions_count INTEGER;
BEGIN
    -- 新規テーブル数確認
    SELECT COUNT(*) INTO new_tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('price_categories', 'price_history', 'seasonal_pricing', 'suppliers', 'item_suppliers');
    
    -- 新規カラム数確認（price_master拡張）
    SELECT COUNT(*) INTO new_columns_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_master'
    AND column_name IN ('category_id', 'purchase_price', 'markup_rate', 'adjustment_amount', 'final_price');
    
    -- 新規インデックス数確認
    SELECT COUNT(*) INTO new_indexes_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE '%price%' OR indexname LIKE '%supplier%' OR indexname LIKE '%seasonal%';
    
    -- 新規トリガー数確認
    SELECT COUNT(*) INTO new_triggers_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%price%';
    
    -- 新規関数数確認
    SELECT COUNT(*) INTO new_functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name LIKE '%price%';
    
    RAISE NOTICE '===========================================';\n    RAISE NOTICE '【バージョンアップ】単価マスター拡張完了確認';\n    RAISE NOTICE '===========================================';\n    RAISE NOTICE '新規テーブル数: %', new_tables_count;\n    RAISE NOTICE 'price_master拡張カラム数: %', new_columns_count;\n    RAISE NOTICE '新規インデックス数: %', new_indexes_count;\n    RAISE NOTICE '新規トリガー数: %', new_triggers_count;\n    RAISE NOTICE '新規関数数: %', new_functions_count;\n    RAISE NOTICE '===========================================';\n    \n    IF new_tables_count >= 5 AND new_columns_count >= 5 AND new_indexes_count >= 10 THEN\n        RAISE NOTICE '✅ 単価マスター拡張 - 完全成功！';\n        RAISE NOTICE '🚀 カテゴリ階層・価格計算エンジン実装';\n        RAISE NOTICE '⚡ 仕入額・掛け率・調整額機能完了';\n        RAISE NOTICE '🏆 造園事業者向け価格管理システム完成';\n    ELSE\n        RAISE WARNING '⚠️ 一部スキーマ拡張に問題があります';\n    END IF;\n    \n    RAISE NOTICE '===========================================';\nEND $$;