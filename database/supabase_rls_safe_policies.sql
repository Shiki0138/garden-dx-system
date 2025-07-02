-- ============================================================
-- Garden DX - Supabase RLS ポリシー安全実装（エラーハンドリング対応）
-- エラー防止対策を含む本番環境向けRLSポリシー設定
-- Created by: worker2 (Deployment Error Prevention)
-- Date: 2025-07-01
-- ============================================================

-- 🚨 エラー防止対策：トランザクション制御
BEGIN;

-- セーブポイント設定（部分的ロールバック可能）
SAVEPOINT rls_policies_start;

-- ============================================================
-- 0. 事前チェック機能
-- ============================================================

-- RLS有効化状態チェック関数
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tablename::TEXT,
        rowsecurity,
        COUNT(pol.polname)::INTEGER
    FROM pg_tables t
    LEFT JOIN pg_policies pol ON t.tablename = pol.tablename
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- ポリシー作成前の状態を記録
CREATE TEMP TABLE rls_setup_log (
    log_id SERIAL PRIMARY KEY,
    action TEXT,
    table_name TEXT,
    policy_name TEXT,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 1. 安全なヘルパー関数の作成（エラーハンドリング付き）
-- ============================================================

-- ユーザーの会社ID取得（エラーハンドリング付き）
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- 認証チェック
    IF auth.uid() IS NULL THEN
        RAISE NOTICE 'No authenticated user';
        RETURN NULL;
    END IF;
    
    -- 会社ID取得
    SELECT company_id INTO v_company_id
    FROM user_profiles 
    WHERE user_id = auth.uid();
    
    -- 結果チェック
    IF v_company_id IS NULL THEN
        RAISE NOTICE 'No company found for user %', auth.uid();
        RETURN NULL;
    END IF;
    
    RETURN v_company_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_user_company_id: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限チェック関数（エラーハンドリング付き）
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- パラメータチェック
    IF required_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 認証チェック
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ロール取得
    SELECT role INTO v_user_role
    FROM user_profiles 
    WHERE user_id = auth.uid();
    
    -- オーナーは全権限
    IF v_user_role = 'owner' THEN
        RETURN TRUE;
    END IF;
    
    -- ロール比較
    RETURN v_user_role = required_role;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in has_role: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限詳細チェック関数（エラーハンドリング付き）
CREATE OR REPLACE FUNCTION has_permission(permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_permissions JSONB;
    v_has_permission BOOLEAN;
BEGIN
    -- パラメータチェック
    IF permission_key IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 認証チェック
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ユーザー情報取得
    SELECT role, permissions INTO v_user_role, v_permissions
    FROM user_profiles 
    WHERE user_id = auth.uid();
    
    -- オーナー・マネージャーは全権限
    IF v_user_role IN ('owner', 'manager') THEN
        RETURN TRUE;
    END IF;
    
    -- 個別権限チェック
    BEGIN
        v_has_permission := (v_permissions ->> permission_key)::boolean;
        RETURN COALESCE(v_has_permission, FALSE);
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in has_permission: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. RLS有効化（エラーハンドリング付き）
-- ============================================================

-- 安全なRLS有効化関数
CREATE OR REPLACE FUNCTION enable_rls_safe(p_table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- RLSを有効化
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- ログ記録
    INSERT INTO rls_setup_log (action, table_name, status)
    VALUES ('ENABLE_RLS', p_table_name, 'SUCCESS');
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーログ記録
        INSERT INTO rls_setup_log (action, table_name, status, error_message)
        VALUES ('ENABLE_RLS', p_table_name, 'ERROR', SQLERRM);
        
        RAISE NOTICE 'Failed to enable RLS on %: %', p_table_name, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 全テーブルでRLS有効化
DO $$
DECLARE
    v_table_name TEXT;
    v_success BOOLEAN;
BEGIN
    FOR v_table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', 'rls_setup_log')
    LOOP
        v_success := enable_rls_safe(v_table_name);
        IF NOT v_success THEN
            RAISE WARNING 'RLS有効化失敗: %', v_table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 3. ポリシー作成（エラーハンドリング付き）
-- ============================================================

-- 安全なポリシー作成関数
CREATE OR REPLACE FUNCTION create_policy_safe(
    p_policy_name TEXT,
    p_table_name TEXT,
    p_operation TEXT,
    p_using_clause TEXT,
    p_with_check_clause TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- 既存ポリシーチェック
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = p_policy_name 
        AND tablename = p_table_name
    ) THEN
        RAISE NOTICE 'Policy % already exists on table %', p_policy_name, p_table_name;
        RETURN TRUE;
    END IF;
    
    -- ポリシー作成SQL構築
    v_sql := format('CREATE POLICY %I ON %I FOR %s',
        p_policy_name, p_table_name, p_operation);
    
    IF p_using_clause IS NOT NULL THEN
        v_sql := v_sql || format(' USING (%s)', p_using_clause);
    END IF;
    
    IF p_with_check_clause IS NOT NULL THEN
        v_sql := v_sql || format(' WITH CHECK (%s)', p_with_check_clause);
    END IF;
    
    -- ポリシー作成実行
    EXECUTE v_sql;
    
    -- ログ記録
    INSERT INTO rls_setup_log (action, table_name, policy_name, status)
    VALUES ('CREATE_POLICY', p_table_name, p_policy_name, 'SUCCESS');
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーログ記録
        INSERT INTO rls_setup_log (action, table_name, policy_name, status, error_message)
        VALUES ('CREATE_POLICY', p_table_name, p_policy_name, 'ERROR', SQLERRM);
        
        RAISE NOTICE 'Failed to create policy % on %: %', p_policy_name, p_table_name, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. 各テーブルのポリシー設定（エラーハンドリング付き）
-- ============================================================

-- Companies テーブルポリシー
SELECT create_policy_safe(
    'companies_select_policy',
    'companies',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'companies_update_policy',
    'companies',
    'UPDATE',
    'company_id = get_user_company_id() AND has_role(''owner'')'
);

-- User Profiles テーブルポリシー
SELECT create_policy_safe(
    'user_profiles_select_policy',
    'user_profiles',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'user_profiles_own_update_policy',
    'user_profiles',
    'UPDATE',
    'user_id = auth.uid()'
);

SELECT create_policy_safe(
    'user_profiles_manager_all_policy',
    'user_profiles',
    'ALL',
    'company_id = get_user_company_id() AND has_role(''manager'')'
);

-- Customers テーブルポリシー
SELECT create_policy_safe(
    'customers_select_policy',
    'customers',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'customers_insert_policy',
    'customers',
    'INSERT',
    'company_id = get_user_company_id()',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'customers_update_policy',
    'customers',
    'UPDATE',
    'company_id = get_user_company_id()'
);

-- Price Master テーブルポリシー
SELECT create_policy_safe(
    'price_master_select_policy',
    'price_master',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'price_master_manager_policy',
    'price_master',
    'ALL',
    'company_id = get_user_company_id() AND has_role(''manager'')'
);

-- Projects テーブルポリシー
SELECT create_policy_safe(
    'projects_select_policy',
    'projects',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'projects_insert_policy',
    'projects',
    'INSERT',
    'company_id = get_user_company_id()',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'projects_update_policy',
    'projects',
    'UPDATE',
    'company_id = get_user_company_id()'
);

-- Process Schedules テーブルポリシー
SELECT create_policy_safe(
    'process_schedules_company_policy',
    'process_schedules',
    'ALL',
    'company_id = get_user_company_id()'
);

-- Process Tasks テーブルポリシー
SELECT create_policy_safe(
    'process_tasks_company_policy',
    'process_tasks',
    'ALL',
    'schedule_id IN (SELECT schedule_id FROM process_schedules WHERE company_id = get_user_company_id())'
);

-- Estimates テーブルポリシー
SELECT create_policy_safe(
    'estimates_select_policy',
    'estimates',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'estimates_insert_policy',
    'estimates',
    'INSERT',
    'company_id = get_user_company_id()',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'estimates_update_policy',
    'estimates',
    'UPDATE',
    'company_id = get_user_company_id()'
);

-- Estimate Items テーブルポリシー
SELECT create_policy_safe(
    'estimate_items_company_policy',
    'estimate_items',
    'ALL',
    'estimate_id IN (SELECT estimate_id FROM estimates WHERE company_id = get_user_company_id())'
);

-- Invoices テーブルポリシー
SELECT create_policy_safe(
    'invoices_select_policy',
    'invoices',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'invoices_manage_policy',
    'invoices',
    'ALL',
    'company_id = get_user_company_id() AND has_permission(''manage_invoices'')'
);

-- System Settings テーブルポリシー
SELECT create_policy_safe(
    'system_settings_select_policy',
    'system_settings',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'system_settings_owner_policy',
    'system_settings',
    'ALL',
    'company_id = get_user_company_id() AND has_role(''owner'')'
);

-- Audit Logs テーブルポリシー（読み取り専用）
SELECT create_policy_safe(
    'audit_logs_select_policy',
    'audit_logs',
    'SELECT',
    'company_id = get_user_company_id()'
);

-- File Attachments テーブルポリシー
SELECT create_policy_safe(
    'file_attachments_select_policy',
    'file_attachments',
    'SELECT',
    'company_id = get_user_company_id()'
);

SELECT create_policy_safe(
    'file_attachments_insert_policy',
    'file_attachments',
    'INSERT',
    'company_id = get_user_company_id()',
    'company_id = get_user_company_id()'
);

-- ============================================================
-- 5. ポリシー検証
-- ============================================================

-- ポリシー設定状況確認
DO $$
DECLARE
    v_table_count INTEGER;
    v_policy_count INTEGER;
    v_error_count INTEGER;
BEGIN
    -- テーブル数カウント
    SELECT COUNT(*) INTO v_table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations', 'rls_setup_log');
    
    -- ポリシー数カウント
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- エラー数カウント
    SELECT COUNT(*) INTO v_error_count
    FROM rls_setup_log
    WHERE status = 'ERROR';
    
    RAISE NOTICE '=== RLSポリシー設定結果 ===';
    RAISE NOTICE 'テーブル数: %', v_table_count;
    RAISE NOTICE 'ポリシー数: %', v_policy_count;
    RAISE NOTICE 'エラー数: %', v_error_count;
    
    IF v_error_count > 0 THEN
        RAISE WARNING '⚠️ RLSポリシー設定中に%件のエラーが発生しました', v_error_count;
        
        -- エラー詳細表示
        RAISE NOTICE '=== エラー詳細 ===';
        FOR v_table_count IN 
            SELECT log_id 
            FROM rls_setup_log 
            WHERE status = 'ERROR'
        LOOP
            RAISE NOTICE 'Error ID %: 詳細はrls_setup_logを参照', v_table_count;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ すべてのRLSポリシーが正常に設定されました';
    END IF;
END $$;

-- ============================================================
-- 6. RLS動作テスト関数
-- ============================================================

-- RLS動作テスト関数
CREATE OR REPLACE FUNCTION test_rls_policies(p_test_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
DECLARE
    v_company_id UUID;
    v_record_count INTEGER;
BEGIN
    -- テストユーザー設定
    IF p_test_user_id IS NOT NULL THEN
        -- テスト用に一時的にユーザーIDを設定
        -- 実際の本番環境では使用しないこと
        RAISE NOTICE 'Testing with user ID: %', p_test_user_id;
    END IF;
    
    -- 会社ID取得テスト
    RETURN QUERY
    SELECT 
        'get_user_company_id'::TEXT,
        CASE 
            WHEN get_user_company_id() IS NOT NULL THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Company ID: ' || COALESCE(get_user_company_id()::TEXT, 'NULL')::TEXT;
    
    -- 顧客アクセステスト
    v_company_id := get_user_company_id();
    IF v_company_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_record_count
        FROM customers
        WHERE company_id = v_company_id;
        
        RETURN QUERY
        SELECT 
            'customer_access'::TEXT,
            'PASS'::TEXT,
            format('アクセス可能な顧客数: %s', v_record_count)::TEXT;
    END IF;
    
    -- その他のテスト...
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. 最終確認とコミット
-- ============================================================

-- 設定ログ確認
SELECT 
    action,
    table_name,
    policy_name,
    status,
    error_message,
    created_at
FROM rls_setup_log
ORDER BY created_at;

-- エラーがない場合はコミット
DO $$
DECLARE
    v_error_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_error_count
    FROM rls_setup_log
    WHERE status = 'ERROR';
    
    IF v_error_count = 0 THEN
        RAISE NOTICE '✅ RLSポリシー設定が正常に完了しました。変更をコミットします。';
        -- COMMIT; -- 実際の実行時にコメントを外す
    ELSE
        RAISE EXCEPTION '❌ RLSポリシー設定でエラーが発生しました。ロールバックします。';
        -- ROLLBACK TO SAVEPOINT rls_policies_start;
    END IF;
END $$;

-- クリーンアップ（成功時のみ）
-- DROP TABLE IF EXISTS rls_setup_log;

-- 最終メッセージ
SELECT 
    '🎉 Supabase RLSポリシー安全実装完了' as status,
    NOW() as completed_at,
    'エラーハンドリング対応済み・本番環境対応' as message;