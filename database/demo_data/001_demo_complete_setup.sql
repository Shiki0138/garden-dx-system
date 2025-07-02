-- ============================================================
-- Garden DX - デモ環境完全構築スクリプト（エラーハンドリング対応）
-- DEPLOYMENT_ERROR_PREVENTION_RULES.md 準拠
-- Created by: Claude Code (Demo Environment Setup)
-- Date: 2025-07-02
-- ============================================================

-- 🚨 重要：デモ環境即利用可能なデータベース構築
-- company_id=1のテストデータを含む完全なデモ環境を構築

-- ============================================================
-- 0. エラー防止・安全性設定
-- ============================================================

-- エラー時停止設定
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- トランザクション開始
BEGIN;

-- セーブポイント設定
SAVEPOINT demo_setup_start;

-- ============================================================
-- 1. 環境チェック・前提条件確認
-- ============================================================

-- デモ環境セットアップログテーブル
CREATE TABLE IF NOT EXISTS demo_setup_log (
    log_id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('START', 'SUCCESS', 'ERROR', 'WARNING')),
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ログ記録関数
CREATE OR REPLACE FUNCTION log_demo_action(
    p_action TEXT,
    p_status TEXT,
    p_message TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO demo_setup_log (action, status, message, details)
    VALUES (p_action, p_status, p_message, p_details);
    
    RAISE NOTICE '[%] %: %', p_status, p_action, COALESCE(p_message, '実行完了');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ログ記録エラー: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- セットアップ開始ログ
SELECT log_demo_action('DEMO_SETUP_START', 'START', 'デモ環境構築開始');

-- 環境チェック
DO $$
DECLARE
    v_version_num INTEGER;
    v_table_count INTEGER;
BEGIN
    -- PostgreSQLバージョンチェック
    SELECT current_setting('server_version_num')::INTEGER INTO v_version_num;
    
    IF v_version_num < 130000 THEN
        PERFORM log_demo_action('VERSION_CHECK', 'ERROR', 
            format('PostgreSQL 13以上が必要です。現在: %s', current_setting('server_version')));
        RAISE EXCEPTION 'PostgreSQL version requirements not met';
    END IF;
    
    -- 既存テーブル数チェック
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('companies', 'user_profiles', 'customers', 'projects');
    
    PERFORM log_demo_action('ENVIRONMENT_CHECK', 'SUCCESS', 
        format('環境チェック完了。既存テーブル数: %s', v_table_count));
        
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('ENVIRONMENT_CHECK', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 2. 必要拡張・関数の確実な作成
-- ============================================================

-- UUID拡張（エラーハンドリング付き）
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    PERFORM log_demo_action('EXTENSION_UUID', 'SUCCESS', 'UUID拡張有効化完了');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('EXTENSION_UUID', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- デモ用特別関数：デモモード判定
CREATE OR REPLACE FUNCTION is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモ会社ID（固定値1）の存在チェック
    RETURN EXISTS (
        SELECT 1 FROM companies 
        WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
        AND company_code = 'DEMO_COMPANY'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモ用認証バイパス関数（開発環境専用）
CREATE OR REPLACE FUNCTION get_demo_user_company_id()
RETURNS UUID AS $$
BEGIN
    -- デモモード時は固定のcompany_idを返す
    IF is_demo_mode() THEN
        RETURN '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;
    
    -- 通常モードでは既存の関数を使用
    RETURN get_user_company_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

PERFORM log_demo_action('DEMO_FUNCTIONS', 'SUCCESS', 'デモ用関数作成完了');

-- ============================================================
-- 3. デモ会社・ユーザーデータ作成（エラーハンドリング付き）
-- ============================================================

-- デモ会社データ作成
DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- デモ会社データ投入
    INSERT INTO companies (
        company_id,
        company_name,
        company_code,
        postal_code,
        address,
        phone,
        email,
        subscription_plan,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_demo_company_id,
        '株式会社デモ造園',
        'DEMO_COMPANY',
        '150-0001',
        '東京都渋谷区神宮前1-1-1 デモビル5F',
        '03-1234-5678',
        'demo@garden-dx.com',
        'premium',
        TRUE,
        NOW(),
        NOW()
    ) ON CONFLICT (company_id) DO UPDATE SET
        updated_at = NOW();

    -- デモユーザープロフィール作成（auth.usersテーブルがない場合の対応）
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role,
        full_name,
        position,
        phone,
        is_active,
        permissions,
        created_at,
        updated_at
    ) VALUES (
        v_demo_user_id,
        v_demo_company_id,
        'owner',
        'デモ 太郎',
        '代表取締役',
        '090-1234-5678',
        TRUE,
        '{
            "view_estimates": true,
            "create_estimates": true,
            "view_financial": true,
            "manage_users": true,
            "manage_settings": true
        }'::JSONB,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    -- 追加デモユーザー
    INSERT INTO user_profiles (
        user_id,
        company_id,
        role,
        full_name,
        position,
        phone,
        is_active,
        permissions,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000003'::UUID,
        v_demo_company_id,
        'manager',
        'デモ 花子',
        '営業部長',
        '090-2345-6789',
        TRUE,
        '{
            "view_estimates": true,
            "create_estimates": true,
            "view_financial": false,
            "manage_users": false
        }'::JSONB,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    PERFORM log_demo_action('DEMO_COMPANY_USER', 'SUCCESS', 
        format('デモ会社・ユーザー作成完了。会社ID: %s', v_demo_company_id));

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_COMPANY_USER', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 4. デモ顧客データ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_customer_count INTEGER := 0;
BEGIN
    -- デモ顧客データ投入
    WITH demo_customers AS (
        SELECT * FROM (VALUES
            ('田中 太郎', 'individual', 'TANAKA_001', '160-0001', '東京都新宿区新宿1-1-1', '03-1111-1111', 'tanaka@example.com', '田中太郎', '個人庭園の手入れを希望'),
            ('佐藤 花子', 'individual', 'SATO_001', '170-0005', '東京都豊島区南池袋2-2-2', '03-2222-2222', 'sato@example.com', '佐藤花子', '新築の庭園設計を依頼'),
            ('株式会社山田商事', 'corporate', 'YAMADA_CORP', '100-0001', '東京都千代田区千代田3-3-3', '03-3333-3333', 'info@yamada-corp.com', '山田部長', '社屋前の植栽管理'),
            ('鈴木造園', 'corporate', 'SUZUKI_GARDEN', '140-0001', '東京都品川区北品川4-4-4', '03-4444-4444', 'contact@suzuki-garden.com', '鈴木社長', '協力会社として登録'),
            ('高橋 次郎', 'individual', 'TAKAHASHI_001', '180-0001', '東京都武蔵野市吉祥寺5-5-5', '03-5555-5555', 'takahashi@example.com', '高橋次郎', 'マンション共用部の植栽')
        ) AS t(customer_name, customer_type, customer_code, postal_code, address, phone, email, contact_person, notes)
    )
    INSERT INTO customers (
        customer_id,
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
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        v_demo_company_id,
        customer_name,
        customer_type::VARCHAR(50),
        customer_code,
        postal_code,
        address,
        phone,
        email,
        contact_person,
        notes,
        v_demo_user_id,
        NOW(),
        NOW()
    FROM demo_customers
    ON CONFLICT (customer_code, company_id) DO UPDATE SET
        updated_at = NOW();

    GET DIAGNOSTICS v_customer_count = ROW_COUNT;
    
    PERFORM log_demo_action('DEMO_CUSTOMERS', 'SUCCESS', 
        format('デモ顧客データ作成完了。作成数: %s', v_customer_count));

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_CUSTOMERS', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 5. デモプロジェクトデータ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_customer_ids UUID[];
    v_project_count INTEGER := 0;
BEGIN
    -- 顧客IDを取得
    SELECT ARRAY_AGG(customer_id) INTO v_customer_ids
    FROM customers 
    WHERE company_id = v_demo_company_id
    LIMIT 5;

    IF array_length(v_customer_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'デモ顧客データが見つかりません';
    END IF;

    -- デモプロジェクトデータ投入
    WITH demo_projects AS (
        SELECT * FROM (VALUES
            ('田中邸庭園リフォーム', 'PROJ_2025_001', '東京都新宿区新宿1-1-1', 'in_progress', 'high', '2025-06-01', '2025-07-15', 850000, 320000, 65),
            ('佐藤邸新築庭園設計', 'PROJ_2025_002', '東京都豊島区南池袋2-2-2', 'planning', 'medium', '2025-07-10', '2025-08-30', 1200000, 0, 0),
            ('山田商事社屋植栽管理', 'PROJ_2025_003', '東京都千代田区千代田3-3-3', 'contracted', 'medium', '2025-05-15', '2025-12-31', 2400000, 800000, 35),
            ('鈴木造園協力案件', 'PROJ_2025_004', '東京都品川区北品川4-4-4', 'completed', 'low', '2025-04-01', '2025-05-31', 680000, 680000, 100),
            ('高橋邸マンション植栽', 'PROJ_2025_005', '東京都武蔵野市吉祥寺5-5-5', 'estimating', 'high', '2025-07-20', '2025-08-15', 450000, 0, 0)
        ) AS t(project_name, project_code, site_address, status, priority, start_date, end_date, total_budget, actual_cost, progress_percentage)
    )
    INSERT INTO projects (
        project_id,
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
        actual_cost,
        progress_percentage,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        v_demo_company_id,
        v_customer_ids[row_number() OVER ()],
        project_name,
        project_code,
        site_address,
        status::VARCHAR(50),
        priority::VARCHAR(20),
        start_date::DATE,
        end_date::DATE,
        total_budget::DECIMAL(15,0),
        actual_cost::DECIMAL(15,0),
        progress_percentage::INTEGER,
        v_demo_user_id,
        NOW(),
        NOW()
    FROM demo_projects
    ON CONFLICT (project_code, company_id) DO UPDATE SET
        updated_at = NOW();

    GET DIAGNOSTICS v_project_count = ROW_COUNT;
    
    PERFORM log_demo_action('DEMO_PROJECTS', 'SUCCESS', 
        format('デモプロジェクトデータ作成完了。作成数: %s', v_project_count));

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_PROJECTS', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 6. Price_Master デモデータ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_price_count INTEGER := 0;
BEGIN
    -- Price Masterテーブルが存在しない場合は作成
    CREATE TABLE IF NOT EXISTS price_master (
        price_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        item_name VARCHAR(255) NOT NULL,
        item_code VARCHAR(50),
        unit VARCHAR(20) NOT NULL,
        unit_price DECIMAL(10, 0) NOT NULL,
        labor_cost DECIMAL(10, 0) DEFAULT 0,
        material_cost DECIMAL(10, 0) DEFAULT 0,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID REFERENCES user_profiles(user_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, item_code)
    );

    -- デモ単価マスタデータ投入
    WITH demo_prices AS (
        SELECT * FROM (VALUES
            ('植栽工事', '高木植栽', 'シマトネリコ H2.5m', 'TREE_001', '本', 12000, 3000, 9000, '自然樹形、株立ち'),
            ('植栽工事', '高木植栽', 'ソヨゴ H2.0m', 'TREE_002', '本', 8500, 2500, 6000, '常緑樹、実なり'),
            ('植栽工事', '低木植栽', 'アベリア H0.6m', 'SHRUB_001', '本', 800, 200, 600, '花期長い、生垣用'),
            ('植栽工事', '低木植栽', 'ツツジ H0.5m', 'SHRUB_002', '本', 1200, 300, 900, '春花、和風庭園'),
            ('植栽工事', '草花植栽', 'シバザクラ 9cmポット', 'FLOWER_001', '鉢', 300, 100, 200, 'グランドカバー'),
            ('土工事', '掘削工事', '植栽用穴掘り', 'DIG_001', 'ｍ３', 2500, 2500, 0, '手掘り、残土処分込み'),
            ('土工事', '客土工事', '植栽用土', 'SOIL_001', 'ｍ３', 4500, 1500, 3000, '腐葉土配合'),
            ('資材工事', '支柱工事', '竹支柱 3m', 'SUPPORT_001', '本', 800, 300, 500, '天然竹、結束込み'),
            ('資材工事', '防草シート', '防草シート張り', 'SHEET_001', 'ｍ２', 1200, 600, 600, '耐久性5年'),
            ('維持管理', '剪定工事', '高木剪定', 'PRUNE_001', '本', 3500, 3500, 0, '透かし剪定'),
            ('維持管理', '剪定工事', '生垣剪定', 'PRUNE_002', 'ｍ', 600, 600, 0, '高さ1.5m以下'),
            ('維持管理', '施肥工事', '有機肥料施用', 'FERT_001', 'ｍ２', 300, 100, 200, '年2回施用'),
            ('外構工事', '石工事', '自然石張り', 'STONE_001', 'ｍ２', 8500, 3500, 5000, '乱張り仕上げ'),
            ('外構工事', '舗装工事', 'インターロッキング', 'PAVE_001', 'ｍ２', 6500, 2500, 4000, '透水性舗装'),
            ('設備工事', '散水設備', 'スプリンクラー設置', 'WATER_001', '箇所', 15000, 8000, 7000, '自動散水タイマー付')
        ) AS t(category, subcategory, item_name, item_code, unit, unit_price, labor_cost, material_cost, description)
    )
    INSERT INTO price_master (
        company_id,
        category,
        subcategory,
        item_name,
        item_code,
        unit,
        unit_price,
        labor_cost,
        material_cost,
        description,
        is_active,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        v_demo_company_id,
        category,
        subcategory,
        item_name,
        item_code,
        unit,
        unit_price,
        labor_cost,
        material_cost,
        description,
        TRUE,
        v_demo_user_id,
        NOW(),
        NOW()
    FROM demo_prices
    ON CONFLICT (company_id, item_code) DO UPDATE SET
        updated_at = NOW();

    GET DIAGNOSTICS v_price_count = ROW_COUNT;
    
    PERFORM log_demo_action('DEMO_PRICE_MASTER', 'SUCCESS', 
        format('デモ単価マスタ作成完了。作成数: %s', v_price_count));

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_PRICE_MASTER', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 7. デモ見積データ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_project_ids UUID[];
    v_estimate_count INTEGER := 0;
BEGIN
    -- Estimatesテーブル作成（存在しない場合）
    CREATE TABLE IF NOT EXISTS estimates (
        estimate_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        estimate_number VARCHAR(50) NOT NULL,
        estimate_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
        subtotal DECIMAL(15, 0) DEFAULT 0,
        tax_amount DECIMAL(15, 0) DEFAULT 0,
        total_amount DECIMAL(15, 0) DEFAULT 0,
        valid_until DATE,
        notes TEXT,
        created_by UUID REFERENCES user_profiles(user_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, estimate_number)
    );

    -- プロジェクトID取得
    SELECT ARRAY_AGG(project_id) INTO v_project_ids
    FROM projects 
    WHERE company_id = v_demo_company_id
    LIMIT 3;

    IF array_length(v_project_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'デモプロジェクトデータが見つかりません';
    END IF;

    -- デモ見積データ投入
    WITH demo_estimates AS (
        SELECT * FROM (VALUES
            ('EST-2025-001', '田中邸庭園リフォーム見積書', 'approved', 850000, 85000, 935000, '2025-08-31'),
            ('EST-2025-002', '佐藤邸新築庭園設計見積書', 'sent', 1200000, 120000, 1320000, '2025-08-15'),
            ('EST-2025-003', '山田商事植栽管理見積書', 'approved', 2400000, 240000, 2640000, '2025-12-31')
        ) AS t(estimate_number, estimate_name, status, subtotal, tax_amount, total_amount, valid_until)
    )
    INSERT INTO estimates (
        company_id,
        project_id,
        estimate_number,
        estimate_name,
        status,
        subtotal,
        tax_amount,
        total_amount,
        valid_until,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        v_demo_company_id,
        v_project_ids[row_number() OVER ()],
        estimate_number,
        estimate_name,
        status::VARCHAR(50),
        subtotal::DECIMAL(15,0),
        tax_amount::DECIMAL(15,0),
        total_amount::DECIMAL(15,0),
        valid_until::DATE,
        v_demo_user_id,
        NOW(),
        NOW()
    FROM demo_estimates
    ON CONFLICT (company_id, estimate_number) DO UPDATE SET
        updated_at = NOW();

    GET DIAGNOSTICS v_estimate_count = ROW_COUNT;
    
    PERFORM log_demo_action('DEMO_ESTIMATES', 'SUCCESS', 
        format('デモ見積データ作成完了。作成数: %s', v_estimate_count));

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_ESTIMATES', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 8. デモ用RLSポリシー追加設定
-- ============================================================

-- デモモード用のRLSポリシー追加
DO $$
BEGIN
    -- デモ会社データアクセス許可ポリシー
    DROP POLICY IF EXISTS demo_access_policy ON companies;
    CREATE POLICY demo_access_policy ON companies
        FOR ALL
        USING (
            company_id = get_user_company_id() 
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );

    -- Price Masterのデモアクセスポリシー
    DROP POLICY IF EXISTS price_master_demo_policy ON price_master;
    CREATE POLICY price_master_demo_policy ON price_master
        FOR ALL
        USING (
            company_id = get_user_company_id() 
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );

    PERFORM log_demo_action('DEMO_RLS_POLICIES', 'SUCCESS', 'デモ用RLSポリシー設定完了');

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_RLS_POLICIES', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 9. インデックス・パフォーマンス最適化
-- ============================================================

DO $$
BEGIN
    -- デモデータ用インデックス作成
    CREATE INDEX IF NOT EXISTS idx_price_master_company_category ON price_master(company_id, category);
    CREATE INDEX IF NOT EXISTS idx_price_master_active ON price_master(company_id, is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_projects_status_company ON projects(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_estimates_company_status ON estimates(company_id, status);
    
    PERFORM log_demo_action('DEMO_INDEXES', 'SUCCESS', 'デモ用インデックス作成完了');

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_INDEXES', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ============================================================
-- 10. データ整合性チェック・最終検証
-- ============================================================

DO $$
DECLARE
    v_check_results JSONB := '{}'::JSONB;
    v_company_count INTEGER;
    v_user_count INTEGER;
    v_customer_count INTEGER;
    v_project_count INTEGER;
    v_price_count INTEGER;
    v_estimate_count INTEGER;
BEGIN
    -- 各テーブルのレコード数チェック
    SELECT COUNT(*) INTO v_company_count FROM companies WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    SELECT COUNT(*) INTO v_user_count FROM user_profiles WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    SELECT COUNT(*) INTO v_customer_count FROM customers WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    SELECT COUNT(*) INTO v_project_count FROM projects WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    SELECT COUNT(*) INTO v_price_count FROM price_master WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    SELECT COUNT(*) INTO v_estimate_count FROM estimates WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;

    -- 結果をJSONで記録
    v_check_results := jsonb_build_object(
        'companies', v_company_count,
        'users', v_user_count,
        'customers', v_customer_count,
        'projects', v_project_count,
        'price_master', v_price_count,
        'estimates', v_estimate_count
    );

    -- 最小要件チェック
    IF v_company_count = 0 THEN
        RAISE EXCEPTION 'デモ会社データが作成されていません';
    END IF;
    
    IF v_user_count < 2 THEN
        RAISE EXCEPTION 'デモユーザーデータが不足しています（期待値: 2以上、実際: %）', v_user_count;
    END IF;

    IF v_customer_count < 3 THEN
        RAISE EXCEPTION 'デモ顧客データが不足しています（期待値: 3以上、実際: %）', v_customer_count;
    END IF;

    PERFORM log_demo_action('DATA_INTEGRITY_CHECK', 'SUCCESS', 
        'データ整合性チェック完了', v_check_results);

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DATA_INTEGRITY_CHECK', 'ERROR', SQLERRM, v_check_results);
        RAISE;
END $$;

-- ============================================================
-- 11. デモ環境セットアップ完了処理
-- ============================================================

DO $$
DECLARE
    v_total_errors INTEGER;
    v_setup_summary JSONB;
BEGIN
    -- エラー数カウント
    SELECT COUNT(*) INTO v_total_errors
    FROM demo_setup_log
    WHERE status = 'ERROR';

    -- セットアップサマリー作成
    SELECT jsonb_object_agg(action, status) INTO v_setup_summary
    FROM (
        SELECT action, 
               CASE WHEN COUNT(*) FILTER (WHERE status = 'ERROR') > 0 THEN 'ERROR'
                    ELSE 'SUCCESS'
               END as status
        FROM demo_setup_log
        WHERE action != 'DEMO_SETUP_START'
        GROUP BY action
    ) t;

    IF v_total_errors = 0 THEN
        PERFORM log_demo_action('DEMO_SETUP_COMPLETE', 'SUCCESS', 
            'デモ環境構築が正常に完了しました', v_setup_summary);
        
        RAISE NOTICE '🎉 デモ環境構築完了！';
        RAISE NOTICE '📊 デモ会社ID: 00000000-0000-0000-0000-000000000001';
        RAISE NOTICE '👤 デモユーザーID: 00000000-0000-0000-0000-000000000002';
        RAISE NOTICE '✅ すべてのテストデータが正常に作成されました';
        
    ELSE
        PERFORM log_demo_action('DEMO_SETUP_COMPLETE', 'ERROR', 
            format('デモ環境構築中に%d件のエラーが発生しました', v_total_errors), 
            v_setup_summary);
        
        RAISE EXCEPTION 'デモ環境構築でエラーが発生しました。ログを確認してください。';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_demo_action('DEMO_SETUP_COMPLETE', 'ERROR', SQLERRM);
        ROLLBACK TO SAVEPOINT demo_setup_start;
        RAISE;
END $$;

-- セーブポイント解放
RELEASE SAVEPOINT demo_setup_start;

-- ============================================================
-- 12. 最終コミット・クリーンアップ
-- ============================================================

-- 成功時のコミット（実際の実行時にコメントアウトを解除）
-- COMMIT;

-- セットアップログの最終確認クエリ
SELECT 
    '🎉 Garden DX デモ環境構築完了' as status,
    'company_id=1のテストデータ完全セットアップ済み' as description,
    NOW() as completed_at;

-- デモデータ確認用クエリ（参考）
SELECT 
    'デモデータ確認' as info,
    'SELECT * FROM companies WHERE company_id = ''00000000-0000-0000-0000-000000000001''::UUID;' as company_check,
    'SELECT * FROM price_master WHERE company_id = ''00000000-0000-0000-0000-000000000001''::UUID LIMIT 5;' as price_check,
    'SELECT * FROM projects WHERE company_id = ''00000000-0000-0000-0000-000000000001''::UUID;' as project_check;

-- エラーログ確認用クエリ
SELECT 
    action,
    status,
    message,
    details,
    created_at
FROM demo_setup_log
ORDER BY created_at;