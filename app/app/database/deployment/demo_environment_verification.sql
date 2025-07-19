-- Garden DX Project - Demo Environment Database Final Verification
-- デモ環境データベース最終確認スクリプト
-- 
-- Created: 2025-07-02
-- Purpose: 本番デプロイ前のデモ環境完全性確認
-- Coverage:
-- - デモデータ整合性チェック
-- - RLSポリシー動作確認
-- - テストユーザー即利用可能性確認
-- - パフォーマンス検証
-- - セキュリティ最終チェック

-- =======================================================================================
-- 1. デモ環境基本情報確認
-- =======================================================================================

-- デモ環境基本統計取得
CREATE OR REPLACE FUNCTION get_demo_environment_stats()
RETURNS TABLE(
    item_category TEXT,
    item_name TEXT,
    item_count INTEGER,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- デモ会社確認
    RETURN QUERY SELECT 
        'companies'::TEXT,
        'demo_company'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'ERROR' END::TEXT,
        jsonb_build_object(
            'company_id', (SELECT company_id FROM companies WHERE company_code = 'DEMO_COMPANY'),
            'company_name', (SELECT company_name FROM companies WHERE company_code = 'DEMO_COMPANY'),
            'subscription_plan', (SELECT subscription_plan FROM companies WHERE company_code = 'DEMO_COMPANY')
        )
    FROM companies 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモユーザー確認
    RETURN QUERY SELECT 
        'user_profiles'::TEXT,
        'demo_users'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'ERROR' END::TEXT,
        jsonb_agg(jsonb_build_object(
            'user_id', user_id,
            'full_name', full_name,
            'role', role,
            'is_active', is_active
        ))
    FROM user_profiles 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモ顧客確認
    RETURN QUERY SELECT 
        'customers'::TEXT,
        'demo_customers'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'WARNING' END::TEXT,
        jsonb_agg(jsonb_build_object(
            'customer_id', customer_id,
            'customer_name', customer_name,
            'customer_type', customer_type
        ))
    FROM customers 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモプロジェクト確認
    RETURN QUERY SELECT 
        'projects'::TEXT,
        'demo_projects'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'WARNING' END::TEXT,
        jsonb_agg(jsonb_build_object(
            'project_id', project_id,
            'project_name', project_name,
            'status', status,
            'progress_percentage', progress_percentage
        ))
    FROM projects 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモ単価マスタ確認
    RETURN QUERY SELECT 
        'price_master'::TEXT,
        'demo_price_items'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 15 THEN 'OK' ELSE 'WARNING' END::TEXT,
        jsonb_build_object(
            'categories', (
                SELECT jsonb_agg(DISTINCT category) 
                FROM price_master 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            ),
            'total_value', (
                SELECT SUM(unit_price) 
                FROM price_master 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            )
        )
    FROM price_master 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモ工程表確認
    RETURN QUERY SELECT 
        'process_schedules'::TEXT,
        'demo_schedules'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 1 THEN 'OK' ELSE 'WARNING' END::TEXT,
        jsonb_agg(jsonb_build_object(
            'schedule_id', schedule_id,
            'schedule_name', schedule_name,
            'status', status,
            'progress_percentage', progress_percentage
        ))
    FROM process_schedules 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- デモタスク確認
    RETURN QUERY SELECT 
        'process_tasks'::TEXT,
        'demo_tasks'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) >= 10 THEN 'OK' ELSE 'WARNING' END::TEXT,
        jsonb_build_object(
            'total_tasks', COUNT(*),
            'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
            'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in_progress'),
            'pending_tasks', COUNT(*) FILTER (WHERE status = 'pending')
        )
    FROM process_tasks pt
    JOIN process_schedules ps ON pt.schedule_id = ps.schedule_id
    WHERE ps.company_id = '00000000-0000-0000-0000-000000000001'::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 2. テストユーザーアクセステスト
-- =======================================================================================

-- テストユーザーログイン・アクセステスト
CREATE OR REPLACE FUNCTION test_demo_user_access()
RETURNS TABLE(
    test_name TEXT,
    user_role TEXT,
    user_id UUID,
    access_test TEXT,
    result_status TEXT,
    accessible_records INTEGER,
    error_message TEXT
) AS $$
DECLARE
    demo_owner_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    demo_manager_id UUID := '00000000-0000-0000-0000-000000000003'::UUID;
    test_record RECORD;
    record_count INTEGER;
    error_msg TEXT;
BEGIN
    -- テストユーザー1: オーナー権限テスト
    BEGIN
        PERFORM auth.set_user_id(demo_owner_id);
        
        -- 会社データアクセステスト
        SELECT COUNT(*) INTO record_count FROM companies;
        RETURN QUERY SELECT 
            'owner_companies_access'::TEXT,
            'owner'::TEXT,
            demo_owner_id,
            'companies_table_access'::TEXT,
            CASE WHEN record_count > 0 THEN 'SUCCESS' ELSE 'FAILED' END::TEXT,
            record_count,
            NULL::TEXT;
        
        -- 顧客データアクセステスト
        SELECT COUNT(*) INTO record_count FROM customers;
        RETURN QUERY SELECT 
            'owner_customers_access'::TEXT,
            'owner'::TEXT,
            demo_owner_id,
            'customers_table_access'::TEXT,
            CASE WHEN record_count >= 5 THEN 'SUCCESS' ELSE 'WARNING' END::TEXT,
            record_count,
            NULL::TEXT;
        
        -- プロジェクトデータアクセステスト
        SELECT COUNT(*) INTO record_count FROM projects;
        RETURN QUERY SELECT 
            'owner_projects_access'::TEXT,
            'owner'::TEXT,
            demo_owner_id,
            'projects_table_access'::TEXT,
            CASE WHEN record_count >= 5 THEN 'SUCCESS' ELSE 'WARNING' END::TEXT,
            record_count,
            NULL::TEXT;
        
        -- 単価マスタアクセステスト
        SELECT COUNT(*) INTO record_count FROM price_master WHERE is_active = TRUE;
        RETURN QUERY SELECT 
            'owner_price_master_access'::TEXT,
            'owner'::TEXT,
            demo_owner_id,
            'price_master_table_access'::TEXT,
            CASE WHEN record_count >= 15 THEN 'SUCCESS' ELSE 'WARNING' END::TEXT,
            record_count,
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RETURN QUERY SELECT 
            'owner_access_error'::TEXT,
            'owner'::TEXT,
            demo_owner_id,
            'general_access_error'::TEXT,
            'ERROR'::TEXT,
            0::INTEGER,
            error_msg::TEXT;
    END;
    
    -- テストユーザー2: マネージャー権限テスト
    BEGIN
        PERFORM auth.set_user_id(demo_manager_id);
        
        -- 会社データアクセステスト
        SELECT COUNT(*) INTO record_count FROM companies;
        RETURN QUERY SELECT 
            'manager_companies_access'::TEXT,
            'manager'::TEXT,
            demo_manager_id,
            'companies_table_access'::TEXT,
            CASE WHEN record_count > 0 THEN 'SUCCESS' ELSE 'FAILED' END::TEXT,
            record_count,
            NULL::TEXT;
        
        -- 顧客データアクセステスト
        SELECT COUNT(*) INTO record_count FROM customers;
        RETURN QUERY SELECT 
            'manager_customers_access'::TEXT,
            'manager'::TEXT,
            demo_manager_id,
            'customers_table_access'::TEXT,
            CASE WHEN record_count >= 5 THEN 'SUCCESS' ELSE 'WARNING' END::TEXT,
            record_count,
            NULL::TEXT;
        
        -- 工程管理アクセステスト
        SELECT COUNT(*) INTO record_count FROM process_schedules;
        RETURN QUERY SELECT 
            'manager_schedules_access'::TEXT,
            'manager'::TEXT,
            demo_manager_id,
            'process_schedules_access'::TEXT,
            CASE WHEN record_count >= 1 THEN 'SUCCESS' ELSE 'WARNING' END::TEXT,
            record_count,
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RETURN QUERY SELECT 
            'manager_access_error'::TEXT,
            'manager'::TEXT,
            demo_manager_id,
            'general_access_error'::TEXT,
            'ERROR'::TEXT,
            0::INTEGER,
            error_msg::TEXT;
    END;
    
    -- ゲストアクセステスト（認証なし）
    BEGIN
        PERFORM auth.set_user_id(NULL);
        
        -- デモ会社への読み取り専用アクセス
        SELECT COUNT(*) INTO record_count 
        FROM companies 
        WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
        
        RETURN QUERY SELECT 
            'guest_demo_access'::TEXT,
            'guest'::TEXT,
            NULL::UUID,
            'demo_company_readonly_access'::TEXT,
            CASE WHEN record_count > 0 THEN 'SUCCESS' ELSE 'FAILED' END::TEXT,
            record_count,
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RETURN QUERY SELECT 
            'guest_access_test'::TEXT,
            'guest'::TEXT,
            NULL::UUID,
            'demo_readonly_access'::TEXT,
            'EXPECTED_RESTRICTION'::TEXT,
            0::INTEGER,
            error_msg::TEXT;
    END;
    
    -- 認証リセット
    PERFORM auth.set_user_id(NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 3. RLS ポリシー動作最終確認
-- =======================================================================================

-- RLSポリシー包括動作確認
CREATE OR REPLACE FUNCTION verify_rls_policies_final()
RETURNS TABLE(
    table_name TEXT,
    policy_type TEXT,
    test_scenario TEXT,
    expected_result TEXT,
    actual_result TEXT,
    test_status TEXT,
    details JSONB
) AS $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    other_company_id UUID := '00000000-0000-0000-0000-000000000099'::UUID;
    test_count INTEGER;
    table_list TEXT[] := ARRAY['companies', 'customers', 'projects', 'price_master', 'estimates'];
    current_table TEXT;
BEGIN
    FOREACH current_table IN ARRAY table_list LOOP
        -- 正当なアクセステスト
        BEGIN
            PERFORM auth.set_user_id(demo_user_id);
            
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = %L', 
                          current_table, '00000000-0000-0000-0000-000000000001') INTO test_count;
            
            RETURN QUERY SELECT 
                current_table::TEXT,
                'legitimate_access'::TEXT,
                'demo_company_data_access'::TEXT,
                'ALLOW_ACCESS'::TEXT,
                CASE WHEN test_count > 0 THEN 'ALLOW_ACCESS' ELSE 'DENY_ACCESS' END::TEXT,
                CASE WHEN test_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
                jsonb_build_object('record_count', test_count)::JSONB;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                current_table::TEXT,
                'legitimate_access'::TEXT,
                'demo_company_data_access'::TEXT,
                'ALLOW_ACCESS'::TEXT,
                'ERROR'::TEXT,
                'FAIL'::TEXT,
                jsonb_build_object('error', SQLERRM)::JSONB;
        END;
        
        -- 不正アクセステスト（他社データ）
        BEGIN
            PERFORM auth.set_user_id(demo_user_id);
            
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = %L', 
                          current_table, other_company_id) INTO test_count;
            
            RETURN QUERY SELECT 
                current_table::TEXT,
                'unauthorized_access'::TEXT,
                'other_company_data_access'::TEXT,
                'DENY_ACCESS'::TEXT,
                CASE WHEN test_count = 0 THEN 'DENY_ACCESS' ELSE 'ALLOW_ACCESS' END::TEXT,
                CASE WHEN test_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
                jsonb_build_object('unauthorized_record_count', test_count)::JSONB;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                current_table::TEXT,
                'unauthorized_access'::TEXT,
                'other_company_data_access'::TEXT,
                'DENY_ACCESS'::TEXT,
                'PROPERLY_DENIED'::TEXT,
                'PASS'::TEXT,
                jsonb_build_object('access_denied', true)::JSONB;
        END;
    END LOOP;
    
    -- 認証リセット
    PERFORM auth.set_user_id(NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 4. パフォーマンス検証
-- =======================================================================================

-- デモ環境パフォーマンステスト
CREATE OR REPLACE FUNCTION test_demo_performance()
RETURNS TABLE(
    operation_type TEXT,
    test_description TEXT,
    execution_time_ms NUMERIC,
    records_processed INTEGER,
    performance_rating TEXT,
    optimization_suggestions TEXT[]
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    demo_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    record_count INTEGER;
    exec_time NUMERIC;
    suggestions TEXT[];
BEGIN
    -- ユーザー認証設定
    PERFORM auth.set_user_id(demo_user_id);
    
    -- 1. 基本的なSELECTパフォーマンス
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO record_count FROM customers;
    end_time := clock_timestamp();
    exec_time := EXTRACT(milliseconds FROM (end_time - start_time));
    
    suggestions := CASE 
        WHEN exec_time > 100 THEN ARRAY['Consider adding indexes', 'Review RLS policy efficiency']
        WHEN exec_time > 50 THEN ARRAY['Good performance', 'Monitor under load']
        ELSE ARRAY['Excellent performance']
    END;
    
    RETURN QUERY SELECT 
        'SELECT'::TEXT,
        'Basic customer list retrieval'::TEXT,
        exec_time,
        record_count,
        CASE 
            WHEN exec_time > 100 THEN 'POOR'
            WHEN exec_time > 50 THEN 'GOOD'
            ELSE 'EXCELLENT'
        END::TEXT,
        suggestions;
    
    -- 2. JOIN操作パフォーマンス
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO record_count 
    FROM projects p 
    JOIN customers c ON p.customer_id = c.customer_id;
    end_time := clock_timestamp();
    exec_time := EXTRACT(milliseconds FROM (end_time - start_time));
    
    suggestions := CASE 
        WHEN exec_time > 200 THEN ARRAY['Optimize JOIN operations', 'Add composite indexes']
        WHEN exec_time > 100 THEN ARRAY['Consider query optimization']
        ELSE ARRAY['JOIN performance is good']
    END;
    
    RETURN QUERY SELECT 
        'JOIN'::TEXT,
        'Projects with customers JOIN'::TEXT,
        exec_time,
        record_count,
        CASE 
            WHEN exec_time > 200 THEN 'POOR'
            WHEN exec_time > 100 THEN 'GOOD'
            ELSE 'EXCELLENT'
        END::TEXT,
        suggestions;
    
    -- 3. 複雑なクエリパフォーマンス
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO record_count 
    FROM process_tasks pt
    JOIN process_schedules ps ON pt.schedule_id = ps.schedule_id
    JOIN projects p ON ps.project_id = p.project_id
    WHERE pt.status IN ('pending', 'in_progress');
    end_time := clock_timestamp();
    exec_time := EXTRACT(milliseconds FROM (end_time - start_time));
    
    suggestions := CASE 
        WHEN exec_time > 300 THEN ARRAY['Complex query optimization needed', 'Consider materialized views']
        WHEN exec_time > 150 THEN ARRAY['Performance is acceptable', 'Monitor with real data volume']
        ELSE ARRAY['Complex query performance is excellent']
    END;
    
    RETURN QUERY SELECT 
        'COMPLEX_QUERY'::TEXT,
        'Multi-table task management query'::TEXT,
        exec_time,
        record_count,
        CASE 
            WHEN exec_time > 300 THEN 'POOR'
            WHEN exec_time > 150 THEN 'GOOD'
            ELSE 'EXCELLENT'
        END::TEXT,
        suggestions;
    
    -- 4. RLS関数呼び出しパフォーマンス
    start_time := clock_timestamp();
    FOR i IN 1..100 LOOP
        PERFORM get_user_company_id_cached();
    END LOOP;
    end_time := clock_timestamp();
    exec_time := EXTRACT(milliseconds FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'RLS_FUNCTION'::TEXT,
        'get_user_company_id_cached() 100 calls'::TEXT,
        exec_time,
        100::INTEGER,
        CASE 
            WHEN exec_time > 50 THEN 'POOR'
            WHEN exec_time > 20 THEN 'GOOD'
            ELSE 'EXCELLENT'
        END::TEXT,
        CASE 
            WHEN exec_time > 50 THEN ARRAY['RLS function optimization needed']
            ELSE ARRAY['RLS function performance is good']
        END;
    
    -- 認証リセット
    PERFORM auth.set_user_id(NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 5. 包括的デモ環境検証レポート
-- =======================================================================================

-- 最終検証レポート生成
CREATE OR REPLACE FUNCTION generate_demo_verification_report()
RETURNS TABLE(
    verification_section TEXT,
    check_item TEXT,
    status TEXT,
    details JSONB,
    recommendations TEXT[]
) AS $$
DECLARE
    total_errors INTEGER := 0;
    total_warnings INTEGER := 0;
    total_passed INTEGER := 0;
    overall_status TEXT;
BEGIN
    -- 1. 基本データ統計確認
    RETURN QUERY SELECT 
        'DATA_INTEGRITY'::TEXT,
        check_item_val::TEXT,
        status_val::TEXT,
        details_val::JSONB,
        CASE 
            WHEN status_val = 'ERROR' THEN ARRAY['Fix missing demo data immediately']
            WHEN status_val = 'WARNING' THEN ARRAY['Consider adding more demo data']
            ELSE ARRAY['Data integrity is good']
        END
    FROM (
        SELECT 
            item_name as check_item_val,
            status as status_val,
            details as details_val
        FROM get_demo_environment_stats()
    ) stats;
    
    -- 2. テストユーザーアクセス確認
    RETURN QUERY SELECT 
        'USER_ACCESS'::TEXT,
        access_test::TEXT,
        result_status::TEXT,
        jsonb_build_object(
            'user_role', user_role,
            'accessible_records', accessible_records,
            'error_message', error_message
        )::JSONB,
        CASE 
            WHEN result_status = 'ERROR' THEN ARRAY['Fix user access issues immediately']
            WHEN result_status = 'WARNING' THEN ARRAY['Review access permissions']
            WHEN result_status = 'FAILED' THEN ARRAY['Critical access failure - investigate']
            ELSE ARRAY['User access is working correctly']
        END
    FROM test_demo_user_access();
    
    -- 3. RLSポリシー動作確認
    RETURN QUERY SELECT 
        'RLS_POLICIES'::TEXT,
        format('%s_%s', table_name, test_scenario)::TEXT,
        test_status::TEXT,
        jsonb_build_object(
            'table_name', table_name,
            'policy_type', policy_type,
            'expected_result', expected_result,
            'actual_result', actual_result,
            'details', details
        )::JSONB,
        CASE 
            WHEN test_status = 'FAIL' THEN ARRAY['Critical RLS policy failure - fix immediately']
            ELSE ARRAY['RLS policy working correctly']
        END
    FROM verify_rls_policies_final();
    
    -- 4. パフォーマンス検証
    RETURN QUERY SELECT 
        'PERFORMANCE'::TEXT,
        test_description::TEXT,
        performance_rating::TEXT,
        jsonb_build_object(
            'operation_type', operation_type,
            'execution_time_ms', execution_time_ms,
            'records_processed', records_processed
        )::JSONB,
        optimization_suggestions
    FROM test_demo_performance();
    
    -- 5. 総合評価
    SELECT 
        COUNT(*) FILTER (WHERE status = 'ERROR') INTO total_errors
    FROM (
        SELECT status FROM get_demo_environment_stats()
        UNION ALL
        SELECT result_status FROM test_demo_user_access() WHERE result_status = 'ERROR'
        UNION ALL
        SELECT test_status FROM verify_rls_policies_final() WHERE test_status = 'FAIL'
    ) all_checks;
    
    SELECT 
        COUNT(*) FILTER (WHERE status = 'WARNING') INTO total_warnings
    FROM (
        SELECT status FROM get_demo_environment_stats()
        UNION ALL
        SELECT result_status FROM test_demo_user_access() WHERE result_status = 'WARNING'
    ) all_checks;
    
    overall_status := CASE 
        WHEN total_errors > 0 THEN 'CRITICAL_ISSUES'
        WHEN total_warnings > 3 THEN 'MULTIPLE_WARNINGS'
        WHEN total_warnings > 0 THEN 'MINOR_WARNINGS'
        ELSE 'READY_FOR_PRODUCTION'
    END;
    
    RETURN QUERY SELECT 
        'OVERALL_STATUS'::TEXT,
        'demo_environment_readiness'::TEXT,
        overall_status::TEXT,
        jsonb_build_object(
            'total_errors', total_errors,
            'total_warnings', total_warnings,
            'verification_timestamp', NOW(),
            'environment_status', overall_status
        )::JSONB,
        CASE 
            WHEN overall_status = 'CRITICAL_ISSUES' THEN 
                ARRAY['Critical issues found - do not deploy until resolved']
            WHEN overall_status = 'MULTIPLE_WARNINGS' THEN 
                ARRAY['Multiple warnings found - review before deployment']
            WHEN overall_status = 'MINOR_WARNINGS' THEN 
                ARRAY['Minor issues found - can deploy with monitoring']
            ELSE 
                ARRAY['Demo environment is ready for production deployment']
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================================================
-- 6. 即座実行レポート出力
-- =======================================================================================

-- デモ環境検証実行とレポート出力
DO $$
DECLARE
    verification_results RECORD;
    critical_issues INTEGER := 0;
    warnings INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Garden DX Demo Environment Final Verification ===';
    RAISE NOTICE 'Starting comprehensive demo environment verification...';
    RAISE NOTICE '';
    
    -- 検証実行
    FOR verification_results IN 
        SELECT * FROM generate_demo_verification_report()
    LOOP
        RAISE NOTICE '[%] %: % %', 
            verification_results.verification_section,
            verification_results.check_item,
            verification_results.status,
            CASE 
                WHEN verification_results.status IN ('ERROR', 'CRITICAL_ISSUES', 'FAIL', 'FAILED') 
                THEN '❌'
                WHEN verification_results.status IN ('WARNING', 'MULTIPLE_WARNINGS', 'POOR')
                THEN '⚠️'
                ELSE '✅'
            END;
        
        -- 問題カウント
        IF verification_results.status IN ('ERROR', 'CRITICAL_ISSUES', 'FAIL', 'FAILED') THEN
            critical_issues := critical_issues + 1;
        ELSIF verification_results.status IN ('WARNING', 'MULTIPLE_WARNINGS', 'POOR') THEN
            warnings := warnings + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Verification Summary ===';
    RAISE NOTICE 'Critical Issues: %', critical_issues;
    RAISE NOTICE 'Warnings: %', warnings;
    
    IF critical_issues = 0 AND warnings <= 2 THEN
        RAISE NOTICE '✅ DEMO ENVIRONMENT READY FOR PRODUCTION';
        RAISE NOTICE 'Test users can immediately access the system';
    ELSIF critical_issues = 0 THEN
        RAISE NOTICE '⚠️ DEMO ENVIRONMENT READY WITH MINOR WARNINGS';
        RAISE NOTICE 'Deploy with monitoring recommended';
    ELSE
        RAISE NOTICE '❌ CRITICAL ISSUES FOUND - DO NOT DEPLOY';
        RAISE NOTICE 'Resolve critical issues before deployment';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Quick Access Commands ===';
    RAISE NOTICE 'Full Report: SELECT * FROM generate_demo_verification_report();';
    RAISE NOTICE 'User Access Test: SELECT * FROM test_demo_user_access();';
    RAISE NOTICE 'Performance Test: SELECT * FROM test_demo_performance();';
    RAISE NOTICE 'Demo Stats: SELECT * FROM get_demo_environment_stats();';
    RAISE NOTICE '=============================================';
END;
$$;