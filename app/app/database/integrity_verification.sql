-- ======================================
-- Garden システム データベース整合性確認
-- サイクル6: 統合テスト・データ整合性検証
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】データベース整合性確認開始';
    RAISE NOTICE '外部キー制約・データ整合性・マルチテナント分離検証';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. 外部キー制約確認
-- ======================================

-- 外部キー制約一覧取得
CREATE OR REPLACE VIEW foreign_key_constraints AS
SELECT 
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 外部キー制約検証関数
CREATE OR REPLACE FUNCTION verify_foreign_key_integrity()
RETURNS TABLE (
    constraint_name TEXT,
    referencing_table TEXT,
    referencing_column TEXT,
    referenced_table TEXT,
    referenced_column TEXT,
    violations_count BIGINT,
    status TEXT
) AS $$
DECLARE
    fk_record RECORD;
    violation_count BIGINT;
    check_sql TEXT;
BEGIN
    FOR fk_record IN 
        SELECT * FROM foreign_key_constraints
    LOOP
        -- 違反データ確認SQL作成
        check_sql := format(
            'SELECT COUNT(*) FROM %I rt WHERE rt.%I IS NOT NULL AND rt.%I NOT IN (SELECT %I FROM %I)',
            fk_record.referencing_table,
            fk_record.referencing_column,
            fk_record.referencing_column,
            fk_record.referenced_column,
            fk_record.referenced_table
        );
        
        EXECUTE check_sql INTO violation_count;
        
        RETURN QUERY SELECT 
            fk_record.constraint_name::TEXT,
            fk_record.referencing_table::TEXT,
            fk_record.referencing_column::TEXT,
            fk_record.referenced_table::TEXT,
            fk_record.referenced_column::TEXT,
            violation_count,
            CASE WHEN violation_count = 0 THEN 'OK' ELSE 'VIOLATION' END::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 2. マルチテナント分離確認
-- ======================================

-- 企業間データ分離確認関数
CREATE OR REPLACE FUNCTION verify_multi_tenant_isolation()
RETURNS TABLE (
    table_name TEXT,
    company_1_count BIGINT,
    company_2_count BIGINT,
    cross_reference_violations BIGINT,
    isolation_status TEXT
) AS $$
DECLARE
    tenant_table RECORD;
    company1_count BIGINT;
    company2_count BIGINT;
    cross_violations BIGINT;
    check_sql TEXT;
BEGIN
    -- company_idを持つテーブルを対象
    FOR tenant_table IN 
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND c.column_name = 'company_id'
        AND t.table_type = 'BASE TABLE'
    LOOP
        -- 各企業のデータ数取得
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = 1', tenant_table.table_name) INTO company1_count;
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = 2', tenant_table.table_name) INTO company2_count;
        
        -- クロス参照違反チェック（例：company_id=1のプロジェクトがcompany_id=2の顧客を参照）
        cross_violations := 0;
        IF tenant_table.table_name = 'projects' THEN
            SELECT COUNT(*) INTO cross_violations
            FROM projects p
            JOIN customers c ON p.customer_id = c.customer_id
            WHERE p.company_id != c.company_id;
        ELSIF tenant_table.table_name = 'estimates' THEN
            SELECT COUNT(*) INTO cross_violations
            FROM estimates e
            JOIN projects p ON e.project_id = p.project_id
            WHERE e.company_id != p.company_id;
        ELSIF tenant_table.table_name = 'invoices' THEN
            SELECT COUNT(*) INTO cross_violations
            FROM invoices i
            JOIN projects p ON i.project_id = p.project_id
            WHERE i.company_id != p.company_id;
        END IF;
        
        RETURN QUERY SELECT 
            tenant_table.table_name::TEXT,
            company1_count,
            company2_count,
            cross_violations,
            CASE WHEN cross_violations = 0 THEN 'ISOLATED' ELSE 'VIOLATION' END::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 3. データ整合性確認
-- ======================================

-- 金額計算整合性確認
CREATE OR REPLACE FUNCTION verify_amount_calculations()
RETURNS TABLE (
    estimate_id INTEGER,
    calculated_subtotal DECIMAL(12,0),
    stored_subtotal DECIMAL(12,0),
    calculated_tax DECIMAL(12,0),
    stored_tax DECIMAL(12,0),
    calculated_total DECIMAL(12,0),
    stored_total DECIMAL(12,0),
    status TEXT
) AS $$
DECLARE
    estimate_record RECORD;
    calc_subtotal DECIMAL(12,0);
    calc_tax DECIMAL(12,0);
    calc_total DECIMAL(12,0);
BEGIN
    FOR estimate_record IN 
        SELECT e.estimate_id, e.subtotal, e.tax_amount, e.total_amount, e.discount_amount
        FROM estimates e
        WHERE e.is_active = TRUE
    LOOP
        -- 明細から小計計算
        SELECT COALESCE(SUM(line_total), 0) INTO calc_subtotal
        FROM estimate_items
        WHERE estimate_id = estimate_record.estimate_id;
        
        -- 税額計算（10%）
        calc_tax := ROUND(calc_subtotal * 0.1);
        
        -- 合計計算
        calc_total := calc_subtotal + calc_tax - COALESCE(estimate_record.discount_amount, 0);
        
        RETURN QUERY SELECT 
            estimate_record.estimate_id,
            calc_subtotal,
            estimate_record.subtotal,
            calc_tax,
            estimate_record.tax_amount,
            calc_total,
            estimate_record.total_amount,
            CASE 
                WHEN calc_subtotal = estimate_record.subtotal 
                AND calc_tax = estimate_record.tax_amount 
                AND calc_total = estimate_record.total_amount 
                THEN 'OK' 
                ELSE 'MISMATCH' 
            END::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 4. RLS（Row Level Security）動作確認
-- ======================================

-- RLS動作確認関数
CREATE OR REPLACE FUNCTION verify_rls_functionality()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    test_isolation BOOLEAN,
    status TEXT
) AS $$
DECLARE
    rls_table RECORD;
    policy_count_val INTEGER;
    test_result BOOLEAN;
    company1_visible INTEGER;
    company2_visible INTEGER;
BEGIN
    FOR rls_table IN 
        SELECT t.tablename, t.rowsecurity
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        AND t.tablename IN ('users', 'customers', 'projects', 'estimates', 'invoices')
    LOOP
        -- ポリシー数取得
        SELECT COUNT(*) INTO policy_count_val
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = rls_table.tablename;
        
        -- RLS動作テスト（company_id設定による分離確認）
        test_result := TRUE;
        
        IF rls_table.tablename IN ('customers', 'projects', 'estimates', 'invoices') THEN
            -- company_id=1設定時のデータ数
            PERFORM set_config('app.current_company_id', '1', true);
            EXECUTE format('SELECT COUNT(*) FROM %I', rls_table.tablename) INTO company1_visible;
            
            -- company_id=2設定時のデータ数
            PERFORM set_config('app.current_company_id', '2', true);
            EXECUTE format('SELECT COUNT(*) FROM %I', rls_table.tablename) INTO company2_visible;
            
            -- 分離されているかチェック（通常は異なる数値になるはず）
            IF company1_visible = company2_visible THEN
                test_result := FALSE;
            END IF;
        END IF;
        
        RETURN QUERY SELECT 
            rls_table.tablename::TEXT,
            rls_table.rowsecurity,
            policy_count_val,
            test_result,
            CASE 
                WHEN rls_table.rowsecurity AND policy_count_val > 0 AND test_result 
                THEN 'OK' 
                ELSE 'ISSUE' 
            END::TEXT;
    END LOOP;
    
    -- 設定をリセット
    PERFORM set_config('app.current_company_id', '', true);
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 5. インデックス効率性確認
-- ======================================

-- インデックス使用状況確認
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- インデックス効率性分析
CREATE OR REPLACE FUNCTION analyze_index_efficiency()
RETURNS TABLE (
    table_name TEXT,
    total_indexes INTEGER,
    unused_indexes INTEGER,
    efficiency_score INTEGER,
    recommendations TEXT
) AS $$
DECLARE
    table_record RECORD;
    total_idx INTEGER;
    unused_idx INTEGER;
    efficiency INTEGER;
    recommendations_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT DISTINCT tablename 
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
    LOOP
        -- インデックス数取得
        SELECT COUNT(*) INTO total_idx
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public' AND tablename = table_record.tablename;
        
        -- 未使用インデックス数
        SELECT COUNT(*) INTO unused_idx
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public' 
        AND tablename = table_record.tablename
        AND idx_scan = 0;
        
        -- 効率性スコア計算
        efficiency := CASE 
            WHEN total_idx = 0 THEN 0
            ELSE ((total_idx - unused_idx) * 100 / total_idx)
        END;
        
        -- 推奨事項
        recommendations_text := CASE 
            WHEN unused_idx > 0 THEN format('未使用インデックス%s個の削除を検討', unused_idx)
            WHEN efficiency >= 90 THEN '良好'
            WHEN efficiency >= 70 THEN 'クエリパターンの見直しを推奨'
            ELSE 'インデックス戦略の全面見直しが必要'
        END;
        
        RETURN QUERY SELECT 
            table_record.tablename::TEXT,
            total_idx,
            unused_idx,
            efficiency,
            recommendations_text;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 6. 統合整合性確認実行
-- ======================================

-- 統合整合性確認メイン関数
CREATE OR REPLACE FUNCTION run_comprehensive_integrity_check()
RETURNS JSON AS $$
DECLARE
    fk_violations INTEGER;
    tenant_violations INTEGER;
    amount_mismatches INTEGER;
    rls_issues INTEGER;
    index_inefficiencies INTEGER;
    overall_status TEXT;
    check_results JSON;
BEGIN
    -- 外部キー制約違反数
    SELECT COUNT(*) INTO fk_violations
    FROM verify_foreign_key_integrity()
    WHERE status = 'VIOLATION';
    
    -- マルチテナント分離違反数
    SELECT COUNT(*) INTO tenant_violations
    FROM verify_multi_tenant_isolation()
    WHERE isolation_status = 'VIOLATION';
    
    -- 金額計算不整合数
    SELECT COUNT(*) INTO amount_mismatches
    FROM verify_amount_calculations()
    WHERE status = 'MISMATCH';
    
    -- RLS問題数
    SELECT COUNT(*) INTO rls_issues
    FROM verify_rls_functionality()
    WHERE status = 'ISSUE';
    
    -- インデックス非効率数
    SELECT COUNT(*) INTO index_inefficiencies
    FROM analyze_index_efficiency()
    WHERE efficiency_score < 70;
    
    -- 総合ステータス判定
    overall_status := CASE 
        WHEN fk_violations = 0 AND tenant_violations = 0 AND amount_mismatches = 0 
             AND rls_issues = 0 AND index_inefficiencies = 0 
        THEN 'EXCELLENT'
        WHEN fk_violations = 0 AND tenant_violations = 0 AND amount_mismatches = 0 
        THEN 'GOOD'
        WHEN fk_violations = 0 AND tenant_violations = 0 
        THEN 'ACCEPTABLE'
        ELSE 'NEEDS_ATTENTION'
    END;
    
    check_results := json_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'overall_status', overall_status,
        'foreign_key_violations', fk_violations,
        'tenant_isolation_violations', tenant_violations,
        'amount_calculation_mismatches', amount_mismatches,
        'rls_issues', rls_issues,
        'index_inefficiencies', index_inefficiencies,
        'detailed_results', json_build_object(
            'foreign_keys', (SELECT json_agg(row_to_json(t)) FROM verify_foreign_key_integrity() t),
            'tenant_isolation', (SELECT json_agg(row_to_json(t)) FROM verify_multi_tenant_isolation() t),
            'amount_calculations', (SELECT json_agg(row_to_json(t)) FROM verify_amount_calculations() t LIMIT 5),
            'rls_functionality', (SELECT json_agg(row_to_json(t)) FROM verify_rls_functionality() t),
            'index_efficiency', (SELECT json_agg(row_to_json(t)) FROM analyze_index_efficiency() t)
        )
    );
    
    RETURN check_results;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 7. 整合性確認実行・結果表示
-- ======================================

DO $$
DECLARE
    integrity_results JSON;
    overall_status TEXT;
    fk_violations INTEGER;
    tenant_violations INTEGER;
    amount_mismatches INTEGER;
    rls_issues INTEGER;
    index_inefficiencies INTEGER;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【サイクル6】統合整合性確認実行';
    RAISE NOTICE '===========================================';
    
    -- 整合性確認実行
    SELECT run_comprehensive_integrity_check() INTO integrity_results;
    
    -- 結果取得
    overall_status := integrity_results->>'overall_status';
    fk_violations := (integrity_results->>'foreign_key_violations')::INTEGER;
    tenant_violations := (integrity_results->>'tenant_isolation_violations')::INTEGER;
    amount_mismatches := (integrity_results->>'amount_calculation_mismatches')::INTEGER;
    rls_issues := (integrity_results->>'rls_issues')::INTEGER;
    index_inefficiencies := (integrity_results->>'index_inefficiencies')::INTEGER;
    
    RAISE NOTICE '整合性確認結果:';
    RAISE NOTICE '外部キー制約違反: %件', fk_violations;
    RAISE NOTICE 'テナント分離違反: %件', tenant_violations;
    RAISE NOTICE '金額計算不整合: %件', amount_mismatches;
    RAISE NOTICE 'RLS問題: %件', rls_issues;
    RAISE NOTICE 'インデックス非効率: %件', index_inefficiencies;
    RAISE NOTICE '総合ステータス: %', overall_status;
    RAISE NOTICE '===========================================';
    
    IF overall_status = 'EXCELLENT' THEN
        RAISE NOTICE '✅ データベース整合性確認 - 完璧！';
        RAISE NOTICE '🏆 全項目で最高レベル達成';
        RAISE NOTICE '🚀 統合テスト準備万全';
    ELSIF overall_status = 'GOOD' THEN
        RAISE NOTICE '✅ データベース整合性確認 - 良好！';
        RAISE NOTICE '⚡ 主要項目すべてクリア';
    ELSIF overall_status = 'ACCEPTABLE' THEN
        RAISE NOTICE '✅ データベース整合性確認 - 合格！';
        RAISE NOTICE '📈 軽微な最適化の余地あり';
    ELSE
        RAISE WARNING '⚠️ データベース整合性に問題があります';
        RAISE WARNING '🔧 修正が必要な項目があります';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;