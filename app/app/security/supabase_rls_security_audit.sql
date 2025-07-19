-- Garden DX Project - Supabase RLS Security Audit
-- Supabase RLSポリシーセキュリティ監査スクリプト
-- 
-- Created: 2025-07-02
-- Purpose: RLSポリシーの包括的セキュリティ監査
-- Coverage:
-- - RLSポリシー有効性チェック
-- - データ分離セキュリティ検証
-- - 権限昇格防止確認
-- - 不正アクセス防止テスト
-- - パフォーマンス vs セキュリティバランス検証

-- =======================================================================================
-- 1. RLSポリシー基本セキュリティチェック
-- =======================================================================================

-- RLS有効性確認関数
CREATE OR REPLACE FUNCTION check_rls_enabled()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    security_status TEXT,
    risk_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity::BOOLEAN as rls_enabled,
        COALESCE(p.policy_count, 0)::INTEGER,
        CASE 
            WHEN t.rowsecurity = TRUE AND COALESCE(p.policy_count, 0) > 0 THEN 'SECURE'
            WHEN t.rowsecurity = TRUE AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS_ENABLED_NO_POLICIES'
            ELSE 'RLS_DISABLED'
        END::TEXT as security_status,
        CASE 
            WHEN t.rowsecurity = TRUE AND COALESCE(p.policy_count, 0) > 0 THEN 'LOW'
            WHEN t.rowsecurity = TRUE AND COALESCE(p.policy_count, 0) = 0 THEN 'CRITICAL'
            ELSE 'HIGH'
        END::TEXT as risk_level
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            schemaname, 
            tablename, 
            COUNT(*) as policy_count
        FROM pg_policies 
        GROUP BY schemaname, tablename
    ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN ('companies', 'user_profiles', 'customers', 'projects', 
                        'price_master', 'estimates', 'estimate_items', 
                        'process_schedules', 'process_tasks')
    ORDER BY 
        CASE 
            WHEN t.rowsecurity = FALSE THEN 1
            WHEN COALESCE(p.policy_count, 0) = 0 THEN 2
            ELSE 3
        END,
        t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLSポリシー詳細分析
CREATE OR REPLACE FUNCTION analyze_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    policy_type TEXT,
    policy_definition TEXT,
    uses_company_id BOOLEAN,
    uses_auth_uid BOOLEAN,
    potential_vulnerabilities TEXT[],
    security_score INTEGER
) AS $$
DECLARE
    policy_record RECORD;
    vulnerabilities TEXT[];
    security_score INTEGER;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        vulnerabilities := ARRAY[]::TEXT[];
        security_score := 100;
        
        -- セキュリティチェック項目
        
        -- 1. company_id チェックの存在確認
        IF policy_record.qual IS NULL OR policy_record.qual !~ 'company_id' THEN
            vulnerabilities := array_append(vulnerabilities, 'NO_COMPANY_ID_CHECK');
            security_score := security_score - 30;
        END IF;
        
        -- 2. auth.uid() の使用確認
        IF policy_record.qual !~ 'auth\.uid\(\)' THEN
            vulnerabilities := array_append(vulnerabilities, 'NO_AUTH_UID_CHECK');
            security_score := security_score - 20;
        END IF;
        
        -- 3. ハードコードされたUUIDの確認（潜在的脆弱性）
        IF policy_record.qual ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
            vulnerabilities := array_append(vulnerabilities, 'HARDCODED_UUID');
            security_score := security_score - 10;
        END IF;
        
        -- 4. SQLインジェクション脆弱性の可能性
        IF policy_record.qual ~ '(\|\||&&|\bOR\b|\bAND\b)' AND policy_record.qual !~ 'get_user_company_id' THEN
            vulnerabilities := array_append(vulnerabilities, 'POTENTIAL_SQL_INJECTION');
            security_score := security_score - 25;
        END IF;
        
        -- 5. 権限昇格の可能性
        IF policy_record.qual ~ '\bTRUE\b' OR policy_record.qual ~ '1\s*=\s*1' THEN
            vulnerabilities := array_append(vulnerabilities, 'PRIVILEGE_ESCALATION_RISK');
            security_score := security_score - 40;
        END IF;
        
        -- 6. 適切な関数使用の確認
        IF policy_record.qual !~ '(get_user_company_id|has_permission)' THEN
            vulnerabilities := array_append(vulnerabilities, 'NO_SECURITY_FUNCTIONS');
            security_score := security_score - 15;
        END IF;
        
        RETURN QUERY SELECT 
            policy_record.tablename::TEXT,
            policy_record.policyname::TEXT,
            policy_record.cmd::TEXT,
            policy_record.qual::TEXT,
            (policy_record.qual ~ 'company_id')::BOOLEAN,
            (policy_record.qual ~ 'auth\.uid\(\)')::BOOLEAN,
            vulnerabilities,
            GREATEST(0, security_score)::INTEGER;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 2. Company_ID データ分離セキュリティテスト
-- =======================================================================================

-- データ分離テスト関数
CREATE OR REPLACE FUNCTION test_data_isolation(test_company_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS TABLE(
    test_name TEXT,
    table_name TEXT,
    expected_isolation BOOLEAN,
    actual_isolation BOOLEAN,
    cross_company_leak BOOLEAN,
    security_status TEXT,
    details TEXT
) AS $$
DECLARE
    table_record RECORD;
    test_user_1 UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    test_user_2 UUID := '00000000-0000-0000-0000-000000000003'::UUID;
    company_1 UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    company_2 UUID := '00000000-0000-0000-0000-000000000004'::UUID;
    count_1 INTEGER;
    count_2 INTEGER;
    cross_access_detected BOOLEAN;
BEGIN
    -- テスト対象テーブル
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'customers', 'projects', 'price_master', 'estimates')
    LOOP
        -- User1（Company1）としてテスト
        PERFORM auth.set_user_id(test_user_1);
        
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = %L', 
                      table_record.table_name, company_1) INTO count_1;
        
        -- User2（Company2）のデータにアクセス試行
        cross_access_detected := FALSE;
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = %L', 
                          table_record.table_name, company_2) INTO count_2;
            IF count_2 > 0 THEN
                cross_access_detected := TRUE;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            count_2 := 0; -- アクセス拒否（正常）
        END;
        
        RETURN QUERY SELECT 
            format('isolation_test_%s', table_record.table_name)::TEXT,
            table_record.table_name::TEXT,
            TRUE::BOOLEAN, -- 分離が期待される
            (count_2 = 0)::BOOLEAN, -- 実際の分離状況
            cross_access_detected::BOOLEAN,
            CASE 
                WHEN count_2 = 0 THEN 'SECURE'
                ELSE 'VULNERABLE'
            END::TEXT,
            format('Company1 records: %s, Cross-company access: %s', count_1, count_2)::TEXT;
    END LOOP;
    
    -- 認証解除
    PERFORM auth.set_user_id(NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 3. 権限昇格攻撃テスト
-- =======================================================================================

-- 権限昇格脆弱性テスト
CREATE OR REPLACE FUNCTION test_privilege_escalation()
RETURNS TABLE(
    attack_vector TEXT,
    table_name TEXT,
    attack_successful BOOLEAN,
    vulnerability_details TEXT,
    mitigation_required BOOLEAN
) AS $$
DECLARE
    table_list TEXT[] := ARRAY['companies', 'user_profiles', 'customers', 'projects'];
    table_name_var TEXT;
    attack_result BOOLEAN;
    error_message TEXT;
BEGIN
    FOREACH table_name_var IN ARRAY table_list LOOP
        -- Attack Vector 1: 直接的な権限昇格試行
        BEGIN
            EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE TRUE)', table_name_var) INTO attack_result;
            
            RETURN QUERY SELECT 
                'direct_privilege_escalation'::TEXT,
                table_name_var::TEXT,
                attack_result::BOOLEAN,
                'Attempted direct access without authentication'::TEXT,
                attack_result::BOOLEAN;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RETURN QUERY SELECT 
                'direct_privilege_escalation'::TEXT,
                table_name_var::TEXT,
                FALSE::BOOLEAN,
                format('Access properly denied: %s', error_message)::TEXT,
                FALSE::BOOLEAN;
        END;
        
        -- Attack Vector 2: SQL Injection 試行
        BEGIN
            EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE company_id = company_id OR 1=1)', 
                          table_name_var) INTO attack_result;
            
            RETURN QUERY SELECT 
                'sql_injection_attempt'::TEXT,
                table_name_var::TEXT,
                attack_result::BOOLEAN,
                'SQL injection with OR 1=1'::TEXT,
                attack_result::BOOLEAN;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RETURN QUERY SELECT 
                'sql_injection_attempt'::TEXT,
                table_name_var::TEXT,
                FALSE::BOOLEAN,
                format('SQL injection blocked: %s', error_message)::TEXT,
                FALSE::BOOLEAN;
        END;
        
        -- Attack Vector 3: 関数バイパス試行
        BEGIN
            EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE get_user_company_id() IS NULL OR get_user_company_id() IS NOT NULL)', 
                          table_name_var) INTO attack_result;
            
            RETURN QUERY SELECT 
                'function_bypass_attempt'::TEXT,
                table_name_var::TEXT,
                attack_result::BOOLEAN,
                'Attempted to bypass security functions'::TEXT,
                attack_result::BOOLEAN;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RETURN QUERY SELECT 
                'function_bypass_attempt'::TEXT,
                table_name_var::TEXT,
                FALSE::BOOLEAN,
                format('Function bypass blocked: %s', error_message)::TEXT,
                FALSE::BOOLEAN;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 4. SQLインジェクション防止確認
-- =======================================================================================

-- SQLインジェクション脆弱性スキャン
CREATE OR REPLACE FUNCTION scan_sql_injection_vulnerabilities()
RETURNS TABLE(
    function_name TEXT,
    parameter_name TEXT,
    uses_dynamic_sql BOOLEAN,
    has_input_validation BOOLEAN,
    uses_parameterized_queries BOOLEAN,
    vulnerability_score INTEGER,
    recommendations TEXT[]
) AS $$
DECLARE
    func_record RECORD;
    func_source TEXT;
    recommendations TEXT[];
    vuln_score INTEGER;
BEGIN
    -- システム内の関数をスキャン
    FOR func_record IN 
        SELECT proname, prosrc 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname LIKE '%company%' OR proname LIKE '%user%' OR proname LIKE '%auth%'
    LOOP
        func_source := func_record.prosrc;
        recommendations := ARRAY[]::TEXT[];
        vuln_score := 0;
        
        -- Dynamic SQL使用チェック
        IF func_source ~ '(EXECUTE\s+format|EXECUTE\s+[^;]+\|\||EXECUTE\s+.*\+)' THEN
            vuln_score := vuln_score + 30;
            recommendations := array_append(recommendations, 'Use parameterized queries instead of dynamic SQL');
        END IF;
        
        -- 入力検証の不足
        IF func_source !~ '(COALESCE|NULLIF|CASE\s+WHEN.*IS\s+NULL)' AND func_source ~ 'EXECUTE' THEN
            vuln_score := vuln_score + 20;
            recommendations := array_append(recommendations, 'Add input validation for NULL and empty values');
        END IF;
        
        -- エスケープ処理の不足
        IF func_source ~ 'EXECUTE.*%[sI]' AND func_source !~ 'quote_literal|quote_ident' THEN
            vuln_score := vuln_score + 25;
            recommendations := array_append(recommendations, 'Use quote_literal() or quote_ident() for user input');
        END IF;
        
        -- エラーハンドリングの不足
        IF func_source ~ 'EXECUTE' AND func_source !~ 'EXCEPTION\s+WHEN' THEN
            vuln_score := vuln_score + 15;
            recommendations := array_append(recommendations, 'Add proper exception handling');
        END IF;
        
        RETURN QUERY SELECT 
            func_record.proname::TEXT,
            'dynamic_parameters'::TEXT,
            (func_source ~ 'EXECUTE')::BOOLEAN,
            (func_source ~ '(COALESCE|NULLIF|CASE\s+WHEN.*IS\s+NULL)')::BOOLEAN,
            (func_source ~ 'quote_literal|quote_ident|\$[0-9]+')::BOOLEAN,
            vuln_score::INTEGER,
            recommendations;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 5. 包括的セキュリティレポート生成
-- =======================================================================================

-- セキュリティ監査総合レポート
CREATE OR REPLACE FUNCTION generate_security_audit_report()
RETURNS TABLE(
    audit_category TEXT,
    finding_type TEXT,
    severity TEXT,
    description TEXT,
    affected_components TEXT[],
    recommendation TEXT,
    priority INTEGER
) AS $$
DECLARE
    rls_issues INTEGER := 0;
    isolation_issues INTEGER := 0;
    injection_issues INTEGER := 0;
    privilege_issues INTEGER := 0;
BEGIN
    -- RLSセキュリティ問題の集計
    SELECT COUNT(*) INTO rls_issues 
    FROM check_rls_enabled() 
    WHERE security_status != 'SECURE';
    
    IF rls_issues > 0 THEN
        RETURN QUERY SELECT 
            'RLS_SECURITY'::TEXT,
            'POLICY_CONFIGURATION'::TEXT,
            'HIGH'::TEXT,
            format('%s tables have RLS security issues', rls_issues)::TEXT,
            ARRAY(SELECT table_name FROM check_rls_enabled() WHERE security_status != 'SECURE'),
            'Review and fix RLS policies for all tables'::TEXT,
            1::INTEGER;
    END IF;
    
    -- データ分離問題の集計
    SELECT COUNT(*) INTO isolation_issues 
    FROM test_data_isolation() 
    WHERE security_status = 'VULNERABLE';
    
    IF isolation_issues > 0 THEN
        RETURN QUERY SELECT 
            'DATA_ISOLATION'::TEXT,
            'CROSS_COMPANY_ACCESS'::TEXT,
            'CRITICAL'::TEXT,
            format('%s tables allow cross-company data access', isolation_issues)::TEXT,
            ARRAY(SELECT table_name FROM test_data_isolation() WHERE security_status = 'VULNERABLE'),
            'Implement strict company_id filtering in RLS policies'::TEXT,
            1::INTEGER;
    END IF;
    
    -- SQLインジェクション脆弱性の集計
    SELECT COUNT(*) INTO injection_issues 
    FROM scan_sql_injection_vulnerabilities() 
    WHERE vulnerability_score > 50;
    
    IF injection_issues > 0 THEN
        RETURN QUERY SELECT 
            'SQL_INJECTION'::TEXT,
            'UNSAFE_DYNAMIC_SQL'::TEXT,
            'HIGH'::TEXT,
            format('%s functions have SQL injection vulnerabilities', injection_issues)::TEXT,
            ARRAY(SELECT function_name FROM scan_sql_injection_vulnerabilities() WHERE vulnerability_score > 50),
            'Use parameterized queries and input validation'::TEXT,
            2::INTEGER;
    END IF;
    
    -- 権限昇格脆弱性の集計
    SELECT COUNT(*) INTO privilege_issues 
    FROM test_privilege_escalation() 
    WHERE attack_successful = TRUE;
    
    IF privilege_issues > 0 THEN
        RETURN QUERY SELECT 
            'PRIVILEGE_ESCALATION'::TEXT,
            'UNAUTHORIZED_ACCESS'::TEXT,
            'CRITICAL'::TEXT,
            format('%s attack vectors succeeded', privilege_issues)::TEXT,
            ARRAY(SELECT DISTINCT table_name FROM test_privilege_escalation() WHERE attack_successful = TRUE),
            'Strengthen access controls and authentication checks'::TEXT,
            1::INTEGER;
    END IF;
    
    -- 総合評価
    IF rls_issues = 0 AND isolation_issues = 0 AND injection_issues = 0 AND privilege_issues = 0 THEN
        RETURN QUERY SELECT 
            'OVERALL_SECURITY'::TEXT,
            'ASSESSMENT'::TEXT,
            'LOW'::TEXT,
            'Security audit passed - no critical vulnerabilities detected'::TEXT,
            ARRAY['all_systems']::TEXT[],
            'Continue regular security monitoring'::TEXT,
            5::INTEGER;
    ELSE
        RETURN QUERY SELECT 
            'OVERALL_SECURITY'::TEXT,
            'ASSESSMENT'::TEXT,
            'HIGH'::TEXT,
            format('Security audit found %s critical issues requiring immediate attention', 
                   rls_issues + isolation_issues + injection_issues + privilege_issues)::TEXT,
            ARRAY['multiple_systems']::TEXT[],
            'Address all high and critical severity issues immediately'::TEXT,
            1::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 6. 実行用メインスクリプト
-- =======================================================================================

-- セキュリティ監査実行関数
CREATE OR REPLACE FUNCTION run_complete_security_audit()
RETURNS TABLE(
    audit_timestamp TIMESTAMPTZ,
    audit_section TEXT,
    results JSONB
) AS $$
BEGIN
    -- 監査実行時刻記録
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'METADATA'::TEXT,
        jsonb_build_object(
            'audit_version', '1.0',
            'garden_dx_version', 'v2025.07.02',
            'auditor', 'Garden_DX_Security_Scanner',
            'scope', 'Comprehensive RLS and Database Security'
        );
    
    -- 1. RLS設定確認
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'RLS_CONFIGURATION'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM check_rls_enabled() t;
    
    -- 2. RLSポリシー分析
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'RLS_POLICY_ANALYSIS'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM analyze_rls_policies() t;
    
    -- 3. データ分離テスト
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'DATA_ISOLATION_TEST'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM test_data_isolation() t;
    
    -- 4. 権限昇格テスト
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'PRIVILEGE_ESCALATION_TEST'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM test_privilege_escalation() t;
    
    -- 5. SQLインジェクションスキャン
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'SQL_INJECTION_SCAN'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM scan_sql_injection_vulnerabilities() t;
    
    -- 6. 総合レポート
    RETURN QUERY SELECT 
        NOW()::TIMESTAMPTZ,
        'SECURITY_AUDIT_REPORT'::TEXT,
        jsonb_agg(to_jsonb(t)) FROM generate_security_audit_report() t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 7. 実行とレポート出力
-- =======================================================================================

-- 監査結果をファイルに出力する関数
CREATE OR REPLACE FUNCTION export_security_audit_results()
RETURNS TEXT AS $$
DECLARE
    audit_results JSONB;
    report_text TEXT;
BEGIN
    -- 監査実行
    SELECT jsonb_object_agg(audit_section, results) INTO audit_results
    FROM run_complete_security_audit()
    WHERE audit_section != 'METADATA';
    
    -- レポート生成
    report_text := format(
        E'# Garden DX Security Audit Report\n\n' ||
        E'**Generated:** %s\n' ||
        E'**System:** Garden DX Landscaping Management System\n' ||
        E'**Scope:** Supabase RLS and Database Security\n\n' ||
        E'## Executive Summary\n\n' ||
        E'%s\n\n' ||
        E'## Detailed Findings\n\n' ||
        E'```json\n%s\n```\n',
        NOW()::TEXT,
        'Security audit completed. Review detailed findings below.',
        jsonb_pretty(audit_results)
    );
    
    RETURN report_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セキュリティ監査完了通知
DO $$
BEGIN
    RAISE NOTICE '=== Garden DX Security Audit System Ready ===';
    RAISE NOTICE 'Execute: SELECT * FROM run_complete_security_audit();';
    RAISE NOTICE 'Generate Report: SELECT export_security_audit_results();';
    RAISE NOTICE 'Quick RLS Check: SELECT * FROM check_rls_enabled();';
    RAISE NOTICE 'Data Isolation Test: SELECT * FROM test_data_isolation();';
    RAISE NOTICE '=============================================';
END;
$$;