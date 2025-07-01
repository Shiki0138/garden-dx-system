-- ======================================
-- Garden システム 初期データ投入
-- サイクル6: マスターデータ・サンプルデータ作成
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】初期データ投入開始';
    RAISE NOTICE 'マスターデータ・サンプルデータ作成';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. 役割マスターデータ投入
-- ======================================

INSERT INTO roles (role_name, description) VALUES
('owner', '経営者・代表者 - 全権限'),
('admin', '管理者 - システム管理権限'),
('employee', '従業員 - 基本業務権限'),
('viewer', '閲覧者 - 参照のみ権限')
ON CONFLICT (role_name) DO NOTHING;

-- ======================================
-- 2. 税率マスターデータ投入
-- ======================================

CREATE TABLE IF NOT EXISTS tax_rates (
    tax_rate_id SERIAL PRIMARY KEY,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    tax_rate DECIMAL(5, 4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tax_rates (tax_type, tax_rate, effective_from, effective_to, description) VALUES
('standard', 0.0300, '1989-04-01', '1997-03-31', '消費税3%'),
('standard', 0.0500, '1997-04-01', '2014-03-31', '消費税5%'),
('standard', 0.0800, '2014-04-01', '2019-09-30', '消費税8%'),
('standard', 0.1000, '2019-10-01', NULL, '消費税10%'),
('reduced', 0.0800, '2019-10-01', NULL, '軽減税率8%'),
('zero', 0.0000, '1989-04-01', NULL, '非課税0%'),
('exempt', 0.0000, '1989-04-01', NULL, '免税0%')
ON CONFLICT DO NOTHING;

-- ======================================
-- 3. 業界標準項目マスターデータ投入
-- ======================================

CREATE TABLE IF NOT EXISTS industry_standard_items (
    standard_item_id SERIAL PRIMARY KEY,
    category_code VARCHAR(10),
    category_name VARCHAR(100),
    item_code VARCHAR(20),
    item_name VARCHAR(255),
    standard_unit VARCHAR(20),
    tax_type VARCHAR(20) DEFAULT 'standard',
    industry_classification VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO industry_standard_items (category_code, category_name, item_code, item_name, standard_unit, tax_type, industry_classification) VALUES
-- 植栽工事
('P', '植栽工事', 'P001', '高木植栽（H3.0m以上）', '本', 'standard', '造園工事'),
('P', '植栽工事', 'P002', '中木植栽（H1.5-3.0m）', '本', 'standard', '造園工事'),
('P', '植栽工事', 'P003', '低木植栽（H1.5m未満）', '本', 'standard', '造園工事'),
('P', '植栽工事', 'P004', '芝張り（高麗芝）', 'm2', 'standard', '造園工事'),
('P', '植栽工事', 'P005', '芝張り（野芝）', 'm2', 'standard', '造園工事'),

-- 土工事
('E', '土工事', 'E001', '掘削工事（機械掘削）', 'm3', 'standard', '造園工事'),
('E', '土工事', 'E002', '掘削工事（人力掘削）', 'm3', 'standard', '造園工事'),
('E', '土工事', 'E003', '埋戻し工事', 'm3', 'standard', '造園工事'),
('E', '土工事', 'E004', '土壌改良（腐葉土混合）', 'm3', 'standard', '造園工事'),
('E', '土工事', 'E005', '整地・転圧', 'm2', 'standard', '造園工事'),

-- 石工事
('S', '石工事', 'S001', '自然石積み（乱積み）', 'm2', 'standard', '造園工事'),
('S', '石工事', 'S002', '切石積み（布積み）', 'm2', 'standard', '造園工事'),
('S', '石工事', 'S003', '飛石設置', '枚', 'standard', '造園工事'),
('S', '石工事', 'S004', '石張り（自然石）', 'm2', 'standard', '造園工事'),
('S', '石工事', 'S005', '砂利敷き', 'm2', 'standard', '造園工事'),

-- 給排水工事
('W', '給排水工事', 'W001', '散水栓設置', '箇所', 'standard', '造園工事'),
('W', '給排水工事', 'W002', '排水管敷設（VP100）', 'm', 'standard', '造園工事'),
('W', '給排水工事', 'W003', '集水桝設置', '箇所', 'standard', '造園工事'),
('W', '給排水工事', 'W004', '池・水景設備', '式', 'standard', '造園工事'),

-- 施設工事
('F', '施設工事', 'F001', '木製デッキ設置', 'm2', 'standard', '造園工事'),
('F', '施設工事', 'F002', 'パーゴラ設置', '基', 'standard', '造園工事'),
('F', '施設工事', 'F003', 'フェンス設置（アルミ）', 'm', 'standard', '造園工事'),
('F', '施設工事', 'F004', '門扉設置', '箇所', 'standard', '造園工事'),
('F', '施設工事', 'F005', 'ベンチ設置', '基', 'standard', '造園工事')
ON CONFLICT DO NOTHING;

-- ======================================
-- 4. デモ企業データ投入
-- ======================================

INSERT INTO companies (
    company_name, 
    company_code, 
    representative_name, 
    postal_code, 
    address, 
    phone, 
    email, 
    website,
    business_license_number,
    tax_registration_number,
    industry_registration_number,
    default_tax_handling,
    bank_name,
    bank_branch,
    bank_account_type,
    bank_account_number,
    bank_account_holder
) VALUES (
    '株式会社ガーデンデザイン',
    'GARDEN001',
    '田中 太郎',
    '150-0001',
    '東京都渋谷区神宮前1-1-1',
    '03-1234-5678',
    'info@garden-design.co.jp',
    'https://garden-design.co.jp',
    '東京都知事許可（般-01）第12345号',
    '1234567890123',
    '造園工事業登録第001号',
    'exclusive',
    'みずほ銀行',
    '渋谷支店',
    'ordinary',
    '1234567',
    'カ）ガーデンデザイン'
), (
    '緑化システム有限会社',
    'GREEN001',
    '佐藤 花子',
    '160-0023',
    '東京都新宿区西新宿2-2-2',
    '03-2345-6789',
    'contact@green-system.co.jp',
    'https://green-system.co.jp',
    '東京都知事許可（般-02）第23456号',
    '2345678901234',
    '造園工事業登録第002号',
    'exclusive',
    '三井住友銀行',
    '新宿支店',
    'ordinary',
    '2345678',
    'ユ）リョクカシステム'
)
ON CONFLICT (company_code) DO NOTHING;

-- ======================================
-- 5. デモユーザーデータ投入
-- ======================================

-- パスワードハッシュ: 'demo123' をbcryptでハッシュ化したもの
INSERT INTO users (
    company_id, 
    role_id, 
    username, 
    email, 
    password_hash, 
    full_name, 
    phone,
    is_active
) VALUES 
-- 会社1のユーザー
(1, 1, 'demo_owner', 'owner@garden-design.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '田中 太郎', '03-1234-5678', TRUE),
(1, 3, 'demo_employee1', 'emp1@garden-design.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '山田 一郎', '03-1234-5679', TRUE),
(1, 3, 'demo_employee2', 'emp2@garden-design.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '鈴木 次郎', '03-1234-5680', TRUE),
(1, 4, 'demo_viewer', 'viewer@garden-design.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '高橋 三郎', '03-1234-5681', TRUE),

-- 会社2のユーザー
(2, 1, 'green_owner', 'owner@green-system.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '佐藤 花子', '03-2345-6789', TRUE),
(2, 3, 'green_employee', 'emp@green-system.co.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdNR8K8LJhG3K8C', '伊藤 美咲', '03-2345-6790', TRUE)
ON CONFLICT (company_id, username) DO NOTHING;

-- ======================================
-- 6. デモ顧客データ投入
-- ======================================

INSERT INTO customers (
    company_id, 
    customer_name, 
    customer_type, 
    contact_person, 
    postal_code, 
    address, 
    phone, 
    email,
    notes
) VALUES 
-- 会社1の顧客
(1, '個人邸・田中様', 'individual', '田中 義雄', '150-0011', '東京都渋谷区東1-1-1', '03-3456-7890', 'y.tanaka@example.com', '個人邸の庭園リフォーム案件'),
(1, '株式会社オフィスビル', 'corporate', '営業部 山田', '160-0022', '東京都新宿区新宿3-3-3', '03-4567-8901', 'yamada@office-building.co.jp', 'オフィスビル屋上緑化プロジェクト'),
(1, 'マンション管理組合', 'corporate', '理事長 佐藤', '150-0012', '東京都渋谷区広尾2-2-2', '03-5678-9012', 'sato@mansion-kanri.com', 'マンション共有部分緑化'),
(1, '個人邸・鈴木様', 'individual', '鈴木 和子', '150-0013', '東京都渋谷区恵比寿3-3-3', '03-6789-0123', 'k.suzuki@example.com', '新築住宅の庭園設計'),

-- 会社2の顧客
(2, '公園緑化プロジェクト', 'corporate', '市役所 緑化課', '160-0024', '東京都新宿区西新宿4-4-4', '03-7890-1234', 'ryokuka@city.tokyo.jp', '市立公園のリニューアル'),
(2, '個人邸・高橋様', 'individual', '高橋 正雄', '160-0025', '東京都新宿区神楽坂5-5-5', '03-8901-2345', 'm.takahashi@example.com', '和風庭園の改修工事')
ON CONFLICT DO NOTHING;

-- ======================================
-- 7. 単価マスターデータ投入
-- ======================================

INSERT INTO price_master (
    company_id, 
    category, 
    item_name, 
    item_code, 
    standard_unit, 
    standard_price, 
    cost_price, 
    tax_type,
    supplier_name,
    notes
) VALUES 
-- 会社1の単価マスタ
(1, '植栽工事', 'クロマツ H3.0m', 'P001-001', '本', 25000, 18000, 'standard', '緑化資材株式会社', '高品質な黒松'),
(1, '植栽工事', 'ケヤキ H2.5m', 'P001-002', '本', 35000, 25000, 'standard', '緑化資材株式会社', '街路樹グレード'),
(1, '植栽工事', 'サクラ H3.5m', 'P001-003', '本', 45000, 32000, 'standard', '桜専門ナーセリー', 'ソメイヨシノ'),
(1, '植栽工事', 'ツツジ H0.8m', 'P003-001', '本', 2500, 1800, 'standard', '花木園芸', '生垣用'),
(1, '植栽工事', '高麗芝', 'P004-001', 'm2', 1200, 800, 'standard', '芝生農園', 'A級品'),

(1, '土工事', '掘削（機械）', 'E001-001', 'm3', 3000, 2200, 'standard', '土木工事業者', 'バックホウ使用'),
(1, '土工事', '掘削（人力）', 'E002-001', 'm3', 8000, 6000, 'standard', NULL, '狭小地対応'),
(1, '土工事', '土壌改良', 'E004-001', 'm3', 5000, 3500, 'standard', '土壌改良材業者', '腐葉土50%配合'),
(1, '土工事', '整地・転圧', 'E005-001', 'm2', 800, 600, 'standard', NULL, 'プレート転圧'),

(1, '石工事', '自然石積み', 'S001-001', 'm2', 18000, 13000, 'standard', '石材店', '御影石使用'),
(1, '石工事', '飛石設置', 'S003-001', '枚', 8000, 5500, 'standard', '石材店', '自然石形状'),
(1, '石工事', '砂利敷き', 'S005-001', 'm2', 2500, 1800, 'standard', '砂利販売業者', '化粧砂利'),

-- 会社2の単価マスタ
(2, '植栽工事', 'イロハモミジ H2.0m', 'P002-001', '本', 18000, 13000, 'standard', '山林苗木', '紅葉樹'),
(2, '植栽工事', 'シマトネリコ H2.5m', 'P002-002', '本', 22000, 16000, 'standard', '緑化樹木', 'シンボルツリー'),
(2, '植栽工事', 'ハナミズキ H2.0m', 'P002-003', '本', 28000, 20000, 'standard', '花木専門店', '花付き良好'),

(2, '施設工事', '木製デッキ', 'F001-001', 'm2', 25000, 18000, 'standard', 'ウッドデッキ業者', 'ウリン材使用'),
(2, '施設工事', 'アルミフェンス', 'F003-001', 'm', 15000, 11000, 'standard', 'エクステリア業者', 'H1200'),
(2, '給排水工事', '散水栓設置', 'W001-001', '箇所', 45000, 32000, 'standard', '水道工事業者', '立水栓タイプ')
ON CONFLICT (company_id, item_code) DO NOTHING;

-- ======================================
-- 8. デモプロジェクトデータ投入
-- ======================================

INSERT INTO projects (
    company_id, 
    customer_id, 
    project_name, 
    description, 
    site_address, 
    start_date, 
    end_date, 
    status, 
    progress_percentage, 
    total_budget,
    created_by
) VALUES 
-- 会社1のプロジェクト
(1, 1, '田中邸庭園リフォーム', '既存庭園の全面リニューアル工事', '東京都渋谷区東1-1-1', '2025-02-01', '2025-03-31', 'planning', 0.00, 1500000, 2),
(1, 2, 'オフィスビル屋上緑化', '屋上スペースの緑化工事', '東京都新宿区新宿3-3-3', '2025-01-15', '2025-02-28', 'in_progress', 25.00, 3200000, 2),
(1, 3, 'マンション共有部緑化', 'エントランス周辺の植栽工事', '東京都渋谷区広尾2-2-2', '2025-03-01', '2025-04-15', 'planning', 0.00, 800000, 3),
(1, 4, '鈴木邸新築庭園', '新築住宅の庭園設計・施工', '東京都渋谷区恵比寿3-3-3', '2025-04-01', '2025-05-31', 'planning', 0.00, 2100000, 2),

-- 会社2のプロジェクト
(2, 5, '市立公園リニューアル', '公園全体の植栽・施設更新', '東京都新宿区西新宿4-4-4', '2025-03-15', '2025-06-30', 'planning', 0.00, 8500000, 6),
(2, 6, '高橋邸和風庭園改修', '和風庭園の現代的アレンジ', '東京都新宿区神楽坂5-5-5', '2025-02-15', '2025-04-30', 'active', 10.00, 1800000, 6)
ON CONFLICT DO NOTHING;

-- ======================================
-- 9. デモ見積データ投入
-- ======================================

INSERT INTO estimates (
    company_id, 
    project_id, 
    estimate_number, 
    estimate_title, 
    estimate_date, 
    valid_until, 
    status, 
    tax_handling,
    payment_terms,
    special_notes,
    construction_period,
    construction_location,
    created_by
) VALUES 
-- 会社1の見積
(1, 1, 'EST-20250101-001', '田中邸庭園リフォーム工事見積書', '2025-01-01', '2025-01-31', 'submitted', 'exclusive', '工事完了後30日以内', '雨天の場合は工期が延びる場合があります。', '2025年2月1日～2025年3月31日', '東京都渋谷区東1-1-1', 2),
(1, 2, 'EST-20250115-002', 'オフィスビル屋上緑化工事見積書', '2025-01-15', '2025-02-14', 'approved', 'exclusive', '着手金50%、残金工事完了時', '屋上の防水工事は別途となります。', '2025年1月15日～2025年2月28日', '東京都新宿区新宿3-3-3', 2),
(1, 4, 'EST-20250120-003', '鈴木邸新築庭園工事見積書', '2025-01-20', '2025-02-19', 'draft', 'exclusive', '工事完了後30日以内', '建物完成後の着工となります。', '2025年4月1日～2025年5月31日', '東京都渋谷区恵比寿3-3-3', 2),

-- 会社2の見積
(2, 5, 'EST-20250110-001', '市立公園リニューアル工事見積書', '2025-01-10', '2025-02-09', 'submitted', 'exclusive', '契約時30%、中間40%、完了時30%', '官公庁工事につき、所定の手続きが必要です。', '2025年3月15日～2025年6月30日', '東京都新宿区西新宿4-4-4', 6),
(2, 6, 'EST-20250115-002', '高橋邸和風庭園改修工事見積書', '2025-01-15', '2025-02-14', 'approved', 'exclusive', '着手金40%、残金工事完了時', '既存の庭石は可能な限り再利用いたします。', '2025年2月15日～2025年4月30日', '東京都新宿区神楽坂5-5-5', 6)
ON CONFLICT (company_id, estimate_number) DO NOTHING;

-- ======================================
-- 10. デモ見積明細データ投入
-- ======================================

INSERT INTO estimate_items (
    estimate_id, 
    line_number, 
    item_description, 
    quantity, 
    unit, 
    unit_price, 
    line_total,
    tax_type
) VALUES 
-- 見積1の明細
(1, 1, 'クロマツ H3.0m', 3.000, '本', 25000, 75000, 'standard'),
(1, 2, 'ツツジ H0.8m', 15.000, '本', 2500, 37500, 'standard'),
(1, 3, '高麗芝張り', 50.000, 'm2', 1200, 60000, 'standard'),
(1, 4, '土壌改良工事', 8.000, 'm3', 5000, 40000, 'standard'),
(1, 5, '整地・転圧', 80.000, 'm2', 800, 64000, 'standard'),
(1, 6, '既存植物撤去・処分', 1.000, '式', 150000, 150000, 'standard'),

-- 見積2の明細
(2, 1, 'シマトネリコ H2.5m', 8.000, '本', 22000, 176000, 'standard'),
(2, 2, 'ハナミズキ H2.0m', 5.000, '本', 28000, 140000, 'standard'),
(2, 3, '屋上緑化システム', 200.000, 'm2', 12000, 2400000, 'standard'),
(2, 4, '散水設備一式', 1.000, '式', 350000, 350000, 'standard'),
(2, 5, '防根シート敷設', 200.000, 'm2', 800, 160000, 'standard'),

-- 見積3の明細（ドラフト）
(3, 1, 'イロハモミジ H2.0m', 2.000, '本', 18000, 36000, 'standard'),
(3, 2, '木製デッキ', 20.000, 'm2', 25000, 500000, 'standard'),
(3, 3, '自然石積み', 15.000, 'm2', 18000, 270000, 'standard'),
(3, 4, '飛石設置', 8.000, '枚', 8000, 64000, 'standard'),

-- 見積4の明細
(4, 1, '公園植栽（高木）', 25.000, '本', 30000, 750000, 'standard'),
(4, 2, '公園植栽（中木）', 50.000, '本', 15000, 750000, 'standard'),
(4, 3, '芝生広場造成', 1000.000, 'm2', 2000, 2000000, 'standard'),
(4, 4, '園路整備', 500.000, 'm', 8000, 4000000, 'standard'),
(4, 5, 'ベンチ設置', 10.000, '基', 80000, 800000, 'standard'),

-- 見積5の明細
(5, 1, 'ケヤキ H2.5m', 1.000, '本', 35000, 35000, 'standard'),
(5, 2, '和風石組み', 25.000, 'm2', 22000, 550000, 'standard'),
(5, 3, '竹垣設置', 30.000, 'm', 18000, 540000, 'standard'),
(5, 4, '石灯籠設置', 2.000, '基', 150000, 300000, 'standard'),
(5, 5, '和風植栽一式', 1.000, '式', 380000, 380000, 'standard')
ON CONFLICT (estimate_id, line_number) DO NOTHING;

-- ======================================
-- 11. 完了確認・データ検証
-- ======================================

DO $$
DECLARE
    companies_count INTEGER;
    users_count INTEGER;
    customers_count INTEGER;
    projects_count INTEGER;
    estimates_count INTEGER;
    estimate_items_count INTEGER;
    price_master_count INTEGER;
    roles_count INTEGER;
    tax_rates_count INTEGER;
    industry_items_count INTEGER;
BEGIN
    -- データ件数確認
    SELECT COUNT(*) INTO companies_count FROM companies;
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO customers_count FROM customers;
    SELECT COUNT(*) INTO projects_count FROM projects;
    SELECT COUNT(*) INTO estimates_count FROM estimates;
    SELECT COUNT(*) INTO estimate_items_count FROM estimate_items;
    SELECT COUNT(*) INTO price_master_count FROM price_master;
    SELECT COUNT(*) INTO roles_count FROM roles;
    SELECT COUNT(*) INTO tax_rates_count FROM tax_rates;
    SELECT COUNT(*) INTO industry_items_count FROM industry_standard_items;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】初期データ投入完了確認';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '企業データ: %件', companies_count;
    RAISE NOTICE 'ユーザーデータ: %件', users_count;
    RAISE NOTICE '顧客データ: %件', customers_count;
    RAISE NOTICE 'プロジェクトデータ: %件', projects_count;
    RAISE NOTICE '見積データ: %件', estimates_count;
    RAISE NOTICE '見積明細データ: %件', estimate_items_count;
    RAISE NOTICE '単価マスタ: %件', price_master_count;
    RAISE NOTICE '役割マスタ: %件', roles_count;
    RAISE NOTICE '税率マスタ: %件', tax_rates_count;
    RAISE NOTICE '業界標準項目: %件', industry_items_count;
    RAISE NOTICE '===========================================';
    
    IF companies_count >= 2 AND users_count >= 6 AND customers_count >= 6 
       AND projects_count >= 6 AND estimates_count >= 5 AND estimate_items_count >= 20 THEN
        RAISE NOTICE '✅ 初期データ投入 - 完全成功！';
        RAISE NOTICE '🎯 マスターデータ・サンプルデータ完備';
        RAISE NOTICE '🚀 統合テスト準備完了';
    ELSE
        RAISE WARNING '⚠️ 一部データ投入に問題があります';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;