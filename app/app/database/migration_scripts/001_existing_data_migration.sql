-- ============================================================
-- Garden DX - データマイグレーションスクリプト
-- 既存SQLiteデータからSupabase PostgreSQLへの移行
-- Created by: worker2 (Database Migration)
-- Date: 2025-07-01
-- ============================================================

-- 🔧 マイグレーション前準備
-- このスクリプトは既存のSQLiteデータをSupabaseに移行します

-- 💾 既存データバックアップ作成
-- 実行前に必ず現在のデータをバックアップしてください

-- ============================================================
-- 1. 会社データマイグレーション
-- ============================================================

-- 一時的なマイグレーション用UUIDマッピングテーブル作成
CREATE TEMPORARY TABLE IF NOT EXISTS migration_mapping (
    old_id INTEGER,
    new_uuid UUID,
    table_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サンプル会社データ挿入（既存データに合わせて調整）
INSERT INTO companies (
    company_id,
    company_name,
    company_code,
    address,
    phone,
    email,
    subscription_plan,
    is_active
) VALUES (
    gen_random_uuid(),
    'サンプル造園',
    'SAMPLE-GARDEN-001',
    '東京都渋谷区1-1-1',
    '03-1234-5678',
    'info@sample-garden.co.jp',
    'standard',
    true
) ON CONFLICT (company_code) DO NOTHING;

-- 会社UUIDをマッピングテーブルに保存
INSERT INTO migration_mapping (old_id, new_uuid, table_name)
SELECT 1, company_id, 'companies' 
FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';

-- ============================================================
-- 2. ユーザーデータマイグレーション
-- ============================================================

-- 注意: Supabase Authでユーザーを事前に作成する必要があります
-- 以下はプロフィール情報のマイグレーション例

-- サンプルユーザープロフィール（実際のauth.usersのUUIDに置き換え）
DO $$
DECLARE
    sample_company_id UUID;
    auth_user_id UUID := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- 実際のSupabase Auth UUID
BEGIN
    -- 会社IDを取得
    SELECT company_id INTO sample_company_id 
    FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';
    
    -- ユーザープロフィール挿入
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role,
        full_name,
        position,
        phone,
        permissions,
        is_active
    ) VALUES (
        auth_user_id,
        sample_company_id,
        'owner',
        '代表取締役',
        '代表取締役社長',
        '090-1234-5678',
        jsonb_build_object(
            'view_estimates', true,
            'create_estimates', true,
            'view_financial', true,
            'manage_users', true,
            'manage_settings', true
        ),
        true
    ) ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        position = EXCLUDED.position,
        permissions = EXCLUDED.permissions;
        
    -- マッピング保存
    INSERT INTO migration_mapping (old_id, new_uuid, table_name)
    VALUES (1, auth_user_id, 'user_profiles');
END $$;

-- ============================================================
-- 3. 顧客データマイグレーション
-- ============================================================

-- 既存顧客データのマイグレーション
DO $$
DECLARE
    sample_company_id UUID;
    migration_user_id UUID;
    customer_uuid UUID;
BEGIN
    -- 会社IDとユーザーIDを取得
    SELECT company_id INTO sample_company_id 
    FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';
    
    SELECT new_uuid INTO migration_user_id 
    FROM migration_mapping WHERE table_name = 'user_profiles' AND old_id = 1;
    
    -- サンプル顧客データ挿入
    INSERT INTO customers (
        company_id,
        customer_name,
        customer_type,
        customer_code,
        postal_code,
        address,
        phone,
        email,
        contact_person,
        notes,
        created_by
    ) VALUES 
    (sample_company_id, '田中太郎', 'individual', 'CUST-001', '150-0001', '東京都渋谷区神宮前1-1-1', '03-1111-1111', 'tanaka@example.com', '田中太郎', '個人宅庭園工事', migration_user_id),
    (sample_company_id, '山田建設株式会社', 'corporate', 'CUST-002', '107-0052', '東京都港区赤坂2-2-2', '03-2222-2222', 'yamada@yamada-const.co.jp', '山田次郎', 'マンション外構工事', migration_user_id),
    (sample_company_id, '佐藤様邸', 'individual', 'CUST-003', '158-0094', '東京都世田谷区玉川3-3-3', '03-3333-3333', 'sato@example.com', '佐藤花子', '庭園メンテナンス', migration_user_id)
    ON CONFLICT (customer_code) DO NOTHING;
    
    -- 顧客マッピングを保存
    INSERT INTO migration_mapping (old_id, new_uuid, table_name)
    SELECT 
        ROW_NUMBER() OVER (ORDER BY customer_id),
        customer_id,
        'customers'
    FROM customers WHERE company_id = sample_company_id;
END $$;

-- ============================================================
-- 4. 単価マスターデータマイグレーション
-- ============================================================

DO $$
DECLARE
    sample_company_id UUID;
    migration_user_id UUID;
BEGIN
    SELECT company_id INTO sample_company_id 
    FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';
    
    SELECT new_uuid INTO migration_user_id 
    FROM migration_mapping WHERE table_name = 'user_profiles' AND old_id = 1;
    
    -- 造園業界標準単価マスターデータ
    INSERT INTO price_master (
        company_id,
        category,
        sub_category,
        detail_category,
        item_name,
        item_code,
        unit,
        purchase_price,
        default_markup_rate,
        supplier_name,
        lead_time_days,
        minimum_order_qty,
        notes,
        tags,
        created_by
    ) VALUES 
    -- 植栽工事
    (sample_company_id, '植栽工事', '高木', '常緑針葉樹', '黒松 H3.0', 'PLANT-001', '本', 15000, 1.400, '○○園芸', 7, 1, '黒松 高さ3m 根回り30cm', '["松", "高木", "常緑"]', migration_user_id),
    (sample_company_id, '植栽工事', '高木', '常緑針葉樹', 'カイヅカイブキ H2.5', 'PLANT-002', '本', 12000, 1.350, '○○園芸', 7, 1, 'カイヅカイブキ 高さ2.5m', '["イブキ", "高木", "常緑"]', migration_user_id),
    (sample_company_id, '植栽工事', '中木', '常緑広葉樹', 'キンモクセイ H1.8', 'PLANT-003', '本', 8000, 1.450, '○○園芸', 5, 1, 'キンモクセイ 高さ1.8m', '["キンモクセイ", "中木", "香り"]', migration_user_id),
    (sample_company_id, '植栽工事', '低木', '落葉低木', 'ヒラドツツジ H0.5', 'PLANT-004', '本', 800, 1.500, '○○園芸', 3, 5, 'ヒラドツツジ 樹高0.5m', '["ツツジ", "低木", "花"]', migration_user_id),
    (sample_company_id, '植栽工事', '低木', '常緑低木', 'サツキ H0.3', 'PLANT-005', '本', 600, 1.600, '○○園芸', 3, 10, 'サツキ 樹高0.3m', '["サツキ", "低木", "刈り込み"]', migration_user_id),
    
    -- 外構工事
    (sample_company_id, '外構工事', '石材', '御影石', '御影石 乱貼り 厚30mm', 'STONE-001', 'm2', 12000, 1.300, '△△石材', 14, 10, '中国産御影石 自然面仕上げ', '["御影石", "乱貼り", "自然石"]', migration_user_id),
    (sample_company_id, '外構工事', '石材', '御影石', '御影石 切石 400角', 'STONE-002', 'm2', 18000, 1.250, '△△石材', 14, 5, '中国産御影石 本磨き仕上げ', '["御影石", "切石", "方形"]', migration_user_id),
    (sample_company_id, '外構工事', '舗装', 'インターロッキング', 'インターロッキング 標準色', 'PAVE-001', 'm2', 8000, 1.250, '▲▲建材', 7, 20, '厚60mm コンクリート製', '["舗装", "インタロ", "車両対応"]', migration_user_id),
    (sample_company_id, '外構工事', '舗装', '洗い出し', '洗い出し 5分', 'PAVE-002', 'm2', 15000, 1.300, '現場施工', 0, 1, '5分砂利洗い出し 厚50mm', '["洗い出し", "現場打ち", "和風"]', migration_user_id),
    
    -- 設備工事
    (sample_company_id, '設備工事', '照明', 'LED庭園灯', 'LED庭園灯 100V 15W', 'LIGHT-001', '基', 25000, 1.200, '■■電設', 10, 1, 'アルミ製 高さ1200mm', '["照明", "LED", "省エネ"]', migration_user_id),
    (sample_company_id, '設備工事', '散水', '散水栓', '散水栓 横水栓 13mm', 'WATER-001', '箇所', 8000, 1.350, '●●水道', 7, 1, '真鍮製 ハンドル付き', '["散水", "水栓", "メンテナンス"]', migration_user_id),
    (sample_company_id, '設備工事', '排水', '排水桝', 'コンクリート桝 300角', 'DRAIN-001', '箇所', 12000, 1.300, '▼▼コンクリート', 7, 1, '深度600mm 蓋付き', '["排水", "桝", "雨水"]', migration_user_id),
    
    -- 土工事
    (sample_company_id, '土工事', '客土', '真砂土', '真砂土', 'SOIL-001', 'm3', 3500, 1.400, '◆◆土木', 3, 2, '篩い済み 造成用', '["客土", "真砂土", "基盤"]', migration_user_id),
    (sample_company_id, '土工事', '客土', '培養土', '植栽用培養土', 'SOIL-002', 'm3', 5500, 1.350, '○○園芸', 5, 1, '有機質堆肥配合', '["培養土", "植栽", "有機"]', migration_user_id)
    
    ON CONFLICT (item_code) DO NOTHING;
END $$;

-- ============================================================
-- 5. プロジェクト・見積データマイグレーション
-- ============================================================

DO $$
DECLARE
    sample_company_id UUID;
    migration_user_id UUID;
    customer1_id UUID;
    customer2_id UUID;
    project1_id UUID;
    project2_id UUID;
    estimate1_id UUID;
BEGIN
    SELECT company_id INTO sample_company_id 
    FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';
    
    SELECT new_uuid INTO migration_user_id 
    FROM migration_mapping WHERE table_name = 'user_profiles' AND old_id = 1;
    
    -- 顧客IDを取得
    SELECT customer_id INTO customer1_id 
    FROM customers WHERE customer_code = 'CUST-001' AND company_id = sample_company_id;
    
    SELECT customer_id INTO customer2_id 
    FROM customers WHERE customer_code = 'CUST-002' AND company_id = sample_company_id;
    
    -- プロジェクトデータ挿入
    INSERT INTO projects (
        company_id,
        customer_id,
        project_name,
        project_code,
        site_address,
        status,
        priority,
        start_date,
        end_date,
        total_budget,
        progress_percentage,
        project_manager_id,
        notes,
        created_by
    ) VALUES 
    (sample_company_id, customer1_id, '田中様邸庭園リフォーム', 'PROJ-2025-001', '東京都渋谷区神宮前1-1-1', 'planning', 'medium', '2025-08-01', '2025-08-31', 2500000, 0, migration_user_id, '既存庭園の全面リニューアル', migration_user_id),
    (sample_company_id, customer2_id, '山田マンション植栽工事', 'PROJ-2025-002', '東京都港区赤坂2-2-2', 'estimating', 'high', '2025-09-01', '2025-10-15', 5000000, 5, migration_user_id, '新築マンション外構植栽', migration_user_id)
    
    RETURNING project_id INTO project1_id;
    
    -- プロジェクトIDを取得
    SELECT project_id INTO project2_id 
    FROM projects WHERE project_code = 'PROJ-2025-002' AND company_id = sample_company_id;
    
    -- 見積データ挿入
    INSERT INTO estimates (
        company_id,
        project_id,
        customer_id,
        estimate_number,
        estimate_date,
        valid_until,
        status,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        total_cost,
        gross_profit,
        gross_margin_rate,
        notes,
        created_by
    ) VALUES 
    (sample_company_id, project1_id, customer1_id, 'EST-2025-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'draft', 2272727, 0.10, 227273, 2500000, 1750000, 750000, 0.3000, '庭園リフォーム見積', migration_user_id)
    
    RETURNING estimate_id INTO estimate1_id;
    
    -- 見積明細データ挿入（サンプル）
    INSERT INTO estimate_items (
        estimate_id,
        level,
        sort_order,
        item_type,
        item_description,
        quantity,
        unit,
        purchase_price,
        markup_rate,
        unit_price,
        line_total,
        line_cost
    ) VALUES 
    (estimate1_id, 0, 1, 'header', '植栽工事', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (estimate1_id, 1, 2, 'item', '黒松 H3.0', 2, '本', 15000, 1.400, 21000, 42000, 30000),
    (estimate1_id, 1, 3, 'item', 'キンモクセイ H1.8', 3, '本', 8000, 1.450, 11600, 34800, 24000),
    (estimate1_id, 1, 4, 'item', 'ヒラドツツジ H0.5', 20, '本', 800, 1.500, 1200, 24000, 16000),
    (estimate1_id, 0, 5, 'header', '外構工事', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (estimate1_id, 1, 6, 'item', '御影石 乱貼り', 50, 'm2', 12000, 1.300, 15600, 780000, 600000),
    (estimate1_id, 1, 7, 'item', 'インターロッキング', 80, 'm2', 8000, 1.250, 10000, 800000, 640000);
    
    -- 見積合計金額更新
    UPDATE estimates SET
        subtotal = (SELECT SUM(line_total) FROM estimate_items WHERE estimate_id = estimate1_id AND item_type = 'item'),
        total_cost = (SELECT SUM(line_cost) FROM estimate_items WHERE estimate_id = estimate1_id AND item_type = 'item')
    WHERE estimate_id = estimate1_id;
    
    UPDATE estimates SET
        gross_profit = subtotal - total_cost,
        gross_margin_rate = CASE WHEN subtotal > 0 THEN (subtotal - total_cost) / subtotal ELSE 0 END,
        tax_amount = subtotal * tax_rate,
        total_amount = subtotal + (subtotal * tax_rate)
    WHERE estimate_id = estimate1_id;
END $$;

-- ============================================================
-- 6. システム設定マイグレーション
-- ============================================================

DO $$
DECLARE
    sample_company_id UUID;
BEGIN
    SELECT company_id INTO sample_company_id 
    FROM companies WHERE company_code = 'SAMPLE-GARDEN-001';
    
    -- 会社固有のシステム設定
    INSERT INTO system_settings (
        company_id,
        setting_key,
        setting_value,
        setting_type,
        description
    ) VALUES 
    (sample_company_id, 'company_logo', '{"url": "", "display": true}', 'ui', '会社ロゴ設定'),
    (sample_company_id, 'estimate_template', '{"header_text": "お見積書", "footer_text": "上記の通りお見積もり申し上げます。", "valid_days": 30}', 'document', '見積書テンプレート設定'),
    (sample_company_id, 'default_tax_rate', '{"rate": 0.10, "effective_date": "2019-10-01"}', 'financial', 'デフォルト消費税率'),
    (sample_company_id, 'markup_rates', '{"default": 1.30, "plant": 1.40, "stone": 1.25, "equipment": 1.20}', 'pricing', 'カテゴリ別標準掛率'),
    (sample_company_id, 'notification_settings', '{"email_estimates": true, "email_invoices": true, "email_reminders": true}', 'notification', '通知設定')
    
    ON CONFLICT (company_id, setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW();
END $$;

-- ============================================================
-- 7. マイグレーション検証
-- ============================================================

-- データ件数確認
SELECT 
    'companies' as table_name, COUNT(*) as record_count
FROM companies
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'price_master', COUNT(*) FROM price_master
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'estimates', COUNT(*) FROM estimates
UNION ALL
SELECT 'estimate_items', COUNT(*) FROM estimate_items
UNION ALL
SELECT 'system_settings', COUNT(*) FROM system_settings
ORDER BY table_name;

-- データ整合性確認
SELECT 
    'price_master_consistency' as check_name,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN purchase_price > 0 AND default_markup_rate > 1.0 THEN 1 END)
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as result
FROM price_master
UNION ALL
SELECT 
    'estimate_totals_consistency',
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN subtotal >= total_cost AND gross_profit >= 0 THEN 1 END)
        THEN 'PASS' 
        ELSE 'FAIL' 
    END
FROM estimates;

-- RLS ポリシー動作確認
-- 注意: 実際のSupabase環境でユーザー認証後に実行
/*
SET SESSION ROLE authenticated;
SELECT COUNT(*) as accessible_records FROM companies; -- 1件のみ表示されるべき
SELECT COUNT(*) as accessible_records FROM customers; -- 会社の顧客のみ表示されるべき
*/

-- マイグレーション完了メッセージ
SELECT 'データマイグレーション完了! 🎉' as status,
       NOW() as completed_at,
       'Supabase PostgreSQL環境への移行が正常に完了しました' as message;

-- 一時テーブルクリーンアップ
DROP TABLE IF EXISTS migration_mapping;