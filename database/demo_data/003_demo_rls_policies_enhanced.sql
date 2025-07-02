-- ============================================================
-- Garden DX - デモモード対応RLSポリシー拡張版
-- デモ環境での安全なアクセス制御とゲストアクセス対応
-- Created by: Claude Code (Demo RLS Enhancement)
-- Date: 2025-07-02
-- ============================================================

-- エラー防止設定
\set ON_ERROR_STOP on
BEGIN;
SAVEPOINT demo_rls_start;

-- ============================================================
-- 1. デモモード用拡張関数
-- ============================================================

-- デモアクセス許可判定関数（拡張版）
CREATE OR REPLACE FUNCTION allow_demo_access()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモモードの場合は常にアクセス許可
    IF is_demo_mode() THEN
        RETURN TRUE;
    END IF;
    
    -- 通常モードでは認証チェック
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモユーザー判定関数
CREATE OR REPLACE FUNCTION is_demo_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモユーザーIDの場合はTRUE
    IF auth.uid() IN (
        '00000000-0000-0000-0000-000000000002'::UUID,
        '00000000-0000-0000-0000-000000000003'::UUID
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ゲストアクセス許可関数（読み取り専用）
CREATE OR REPLACE FUNCTION allow_guest_read()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモモードかつ認証されていないユーザーの読み取りを許可
    IF is_demo_mode() AND auth.uid() IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- 認証済みユーザーは通常通り
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモ会社データアクセス判定
CREATE OR REPLACE FUNCTION can_access_demo_company()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモモードの場合は無条件でアクセス許可
    IF is_demo_mode() THEN
        RETURN TRUE;
    END IF;
    
    -- ユーザーの会社IDがデモ会社IDと一致する場合
    IF get_user_company_id() = '00000000-0000-0000-0000-000000000001'::UUID THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. 全テーブルのRLSポリシー再設定（デモ対応版）
-- ============================================================

-- Companies テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS companies_select_policy ON companies;
    DROP POLICY IF EXISTS companies_update_policy ON companies;
    DROP POLICY IF EXISTS demo_access_policy ON companies;
    
    -- 読み取りポリシー（ゲストアクセス対応）
    CREATE POLICY companies_demo_read_policy ON companies
        FOR SELECT
        USING (
            -- 認証済みユーザーは自社データにアクセス
            company_id = get_user_company_id()
            OR 
            -- デモモードではデモ会社データにアクセス可能
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            -- ゲストユーザーはデモ会社の基本情報のみ閲覧可能
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    -- 更新ポリシー（認証済みユーザーのみ）
    CREATE POLICY companies_demo_update_policy ON companies
        FOR ALL
        USING (
            (company_id = get_user_company_id() AND has_role('owner'))
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID AND has_role('owner'))
        );
    
    RAISE NOTICE '✅ Companies RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Companies RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- User Profiles テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS user_profiles_select_policy ON user_profiles;
    DROP POLICY IF EXISTS user_profiles_own_update_policy ON user_profiles;
    DROP POLICY IF EXISTS user_profiles_manager_all_policy ON user_profiles;
    
    -- 読み取りポリシー
    CREATE POLICY user_profiles_demo_read_policy ON user_profiles
        FOR SELECT
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    -- 更新ポリシー
    CREATE POLICY user_profiles_demo_update_policy ON user_profiles
        FOR ALL
        USING (
            (company_id = get_user_company_id() AND user_id = auth.uid())
            OR
            (company_id = get_user_company_id() AND has_role('manager'))
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ User Profiles RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ User Profiles RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Customers テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS customers_select_policy ON customers;
    DROP POLICY IF EXISTS customers_insert_policy ON customers;
    DROP POLICY IF EXISTS customers_update_policy ON customers;
    
    -- 統合ポリシー
    CREATE POLICY customers_demo_policy ON customers
        FOR ALL
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        )
        WITH CHECK (
            company_id = get_user_company_id()
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ Customers RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Customers RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Projects テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS projects_select_policy ON projects;
    DROP POLICY IF EXISTS projects_insert_policy ON projects;
    DROP POLICY IF EXISTS projects_update_policy ON projects;
    
    -- 統合ポリシー
    CREATE POLICY projects_demo_policy ON projects
        FOR ALL
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        )
        WITH CHECK (
            company_id = get_user_company_id()
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ Projects RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Projects RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Price Master テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS price_master_select_policy ON price_master;
    DROP POLICY IF EXISTS price_master_manager_policy ON price_master;
    DROP POLICY IF EXISTS price_master_demo_policy ON price_master;
    
    -- 統合ポリシー
    CREATE POLICY price_master_demo_enhanced_policy ON price_master
        FOR ALL
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        )
        WITH CHECK (
            company_id = get_user_company_id()
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ Price Master RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Price Master RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Process Schedules テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS process_schedules_company_policy ON process_schedules;
    
    -- 統合ポリシー
    CREATE POLICY process_schedules_demo_policy ON process_schedules
        FOR ALL
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        )
        WITH CHECK (
            company_id = get_user_company_id()
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ Process Schedules RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Process Schedules RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Process Tasks テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS process_tasks_company_policy ON process_tasks;
    
    -- 統合ポリシー（スケジュール経由）
    CREATE POLICY process_tasks_demo_policy ON process_tasks
        FOR ALL
        USING (
            schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = get_user_company_id()
            )
            OR 
            (is_demo_mode() AND schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            ))
            OR
            (allow_guest_read() AND schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            ))
        )
        WITH CHECK (
            schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = get_user_company_id()
            )
            OR 
            (is_demo_user() AND schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            ))
        );
    
    RAISE NOTICE '✅ Process Tasks RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Process Tasks RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Estimates テーブル
DO $$
BEGIN
    -- 既存ポリシー削除
    DROP POLICY IF EXISTS estimates_select_policy ON estimates;
    DROP POLICY IF EXISTS estimates_insert_policy ON estimates;
    DROP POLICY IF EXISTS estimates_update_policy ON estimates;
    
    -- 統合ポリシー
    CREATE POLICY estimates_demo_policy ON estimates
        FOR ALL
        USING (
            company_id = get_user_company_id()
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
            OR
            (allow_guest_read() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        )
        WITH CHECK (
            company_id = get_user_company_id()
            OR 
            (is_demo_user() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );
    
    RAISE NOTICE '✅ Estimates RLSポリシー（デモ対応版）設定完了';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Estimates RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================
-- 3. デモモード専用テーブル作成
-- ============================================================

-- デモセッション管理テーブル
CREATE TABLE IF NOT EXISTS demo_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address INET,
    access_level VARCHAR(20) DEFAULT 'guest' CHECK (access_level IN ('guest', 'demo_user', 'full_demo')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    actions_performed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デモアクセスログテーブル
CREATE TABLE IF NOT EXISTS demo_access_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES demo_sessions(session_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON demo_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_access_logs_session ON demo_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_demo_access_logs_created ON demo_access_logs(created_at);

-- デモセッション用RLS設定
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_access_logs ENABLE ROW LEVEL SECURITY;

-- デモテーブルは全員読み取り可能（管理用）
CREATE POLICY demo_sessions_read_policy ON demo_sessions
    FOR SELECT
    USING (TRUE);

CREATE POLICY demo_access_logs_read_policy ON demo_access_logs  
    FOR SELECT
    USING (TRUE);

-- ============================================================
-- 4. デモモード用ユーティリティ関数
-- ============================================================

-- デモセッション作成関数
CREATE OR REPLACE FUNCTION create_demo_session(
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_access_level VARCHAR(20) DEFAULT 'guest'
) RETURNS TABLE(
    session_id UUID,
    session_token VARCHAR(255),
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_session_id UUID;
    v_session_token VARCHAR(255);
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_session_id := gen_random_uuid();
    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '24 hours';
    
    INSERT INTO demo_sessions (
        session_id,
        session_token,
        user_agent,
        ip_address,
        access_level,
        expires_at
    ) VALUES (
        v_session_id,
        v_session_token,
        p_user_agent,
        p_ip_address::INET,
        p_access_level,
        v_expires_at
    );
    
    RETURN QUERY SELECT v_session_id, v_session_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモアクセス記録関数
CREATE OR REPLACE FUNCTION log_demo_access(
    p_session_token VARCHAR(255),
    p_action_type VARCHAR(50),
    p_table_name VARCHAR(100) DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- セッションIDを取得
    SELECT session_id INTO v_session_id
    FROM demo_sessions
    WHERE session_token = p_session_token
    AND expires_at > NOW();
    
    IF v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- アクセスログ記録
    INSERT INTO demo_access_logs (
        session_id,
        action_type,
        table_name,
        record_id,
        details
    ) VALUES (
        v_session_id,
        p_action_type,
        p_table_name,
        p_record_id,
        p_details
    );
    
    -- セッション統計更新
    UPDATE demo_sessions
    SET 
        last_accessed = NOW(),
        page_views = page_views + CASE WHEN p_action_type = 'page_view' THEN 1 ELSE 0 END,
        actions_performed = actions_performed + 1
    WHERE session_id = v_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモデータ統計取得関数
CREATE OR REPLACE FUNCTION get_demo_statistics()
RETURNS TABLE(
    total_companies INTEGER,
    total_projects INTEGER,
    total_customers INTEGER,
    total_price_items INTEGER,
    total_schedules INTEGER,
    total_tasks INTEGER,
    active_sessions INTEGER,
    total_sessions_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM companies WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM projects WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM customers WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM price_master WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM process_schedules WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM process_tasks pt JOIN process_schedules ps ON pt.schedule_id = ps.schedule_id WHERE ps.company_id = '00000000-0000-0000-0000-000000000001'::UUID),
        (SELECT COUNT(*)::INTEGER FROM demo_sessions WHERE expires_at > NOW()),
        (SELECT COUNT(*)::INTEGER FROM demo_sessions WHERE created_at >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. 最終検証・テスト
-- ============================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_function_count INTEGER;
    v_demo_stats RECORD;
BEGIN
    -- ポリシー数確認
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname LIKE '%demo%';
    
    -- 関数数確認
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc
    WHERE proname LIKE '%demo%'
    OR proname LIKE '%guest%';
    
    -- デモ統計取得
    SELECT * INTO v_demo_stats FROM get_demo_statistics();
    
    RAISE NOTICE '=== デモRLS設定完了サマリー ===';
    RAISE NOTICE 'デモ対応ポリシー数: %', v_policy_count;
    RAISE NOTICE 'デモ関連関数数: %', v_function_count;
    RAISE NOTICE 'デモ会社プロジェクト数: %', v_demo_stats.total_projects;
    RAISE NOTICE 'デモ顧客数: %', v_demo_stats.total_customers;
    RAISE NOTICE 'デモ単価アイテム数: %', v_demo_stats.total_price_items;
    RAISE NOTICE '✅ デモ環境RLS設定が正常に完了しました';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 最終検証エラー: %', SQLERRM;
        RAISE;
END $$;

-- セーブポイント解放
RELEASE SAVEPOINT demo_rls_start;

-- 確認用サンプルクエリ（参考）
SELECT 
    '🎉 デモRLS強化完了' as status,
    'ゲストアクセス・デモユーザー対応済み' as features,
    'セッション管理・アクセスログ機能追加' as enhancements,
    NOW() as completed_at;