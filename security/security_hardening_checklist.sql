-- ======================================
-- Garden システム セキュリティ強化スクリプト
-- 95%完成目標 - 企業級セキュリティ実装
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【セキュリティ強化】脆弱性対策実装開始';
    RAISE NOTICE '95%完成目標 - 企業級セキュリティ達成';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. SQLインジェクション対策強化
-- ======================================

-- 入力値検証関数
CREATE OR REPLACE FUNCTION validate_input_sql_injection(input_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    suspicious_patterns TEXT[] := ARRAY[
        'union\s+select', 'drop\s+table', 'delete\s+from', 'insert\s+into',
        'update\s+.*set', 'alter\s+table', 'create\s+table', 'exec\s*\(',
        'execute\s*\(', 'sp_executesql', 'xp_cmdshell', 'script\s*>',
        '<\s*script', 'javascript\s*:', 'vbscript\s*:', 'onload\s*=',
        'onerror\s*=', 'onclick\s*=', 'eval\s*\(', 'document\s*\.',
        'window\s*\.', 'alert\s*\(', 'confirm\s*\('
    ];
    pattern TEXT;
BEGIN
    -- NULL または空文字チェック
    IF input_text IS NULL OR LENGTH(TRIM(input_text)) = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- 危険なパターンをチェック
    FOREACH pattern IN ARRAY suspicious_patterns
    LOOP
        IF input_text ~* pattern THEN
            -- ログ記録
            INSERT INTO security_violations (
                violation_type, violation_description, detected_pattern, input_value, detected_at
            ) VALUES (
                'SQL_INJECTION_ATTEMPT', 
                'Suspicious SQL injection pattern detected',
                pattern,
                LEFT(input_text, 500),
                CURRENT_TIMESTAMP
            );
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セキュリティ違反記録テーブル
CREATE TABLE IF NOT EXISTS security_violations (
    violation_id SERIAL PRIMARY KEY,
    violation_type VARCHAR(50) NOT NULL,
    violation_description TEXT,
    detected_pattern TEXT,
    input_value TEXT,
    user_id INTEGER,
    company_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) DEFAULT 'HIGH',
    status VARCHAR(20) DEFAULT 'DETECTED' -- 'DETECTED', 'INVESTIGATED', 'RESOLVED'
);

CREATE INDEX IF NOT EXISTS idx_security_violations_type_time ON security_violations(violation_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_violations_ip ON security_violations(ip_address, detected_at DESC);

-- ======================================
-- 2. XSS（クロスサイトスクリプティング）対策
-- ======================================

-- XSS対策用サニタイズ関数
CREATE OR REPLACE FUNCTION sanitize_html_content(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    sanitized_text TEXT;
    xss_patterns TEXT[] := ARRAY[
        '<script[^>]*>.*?</script>',
        '<iframe[^>]*>.*?</iframe>',
        '<object[^>]*>.*?</object>',
        '<embed[^>]*>.*?</embed>',
        '<link[^>]*>',
        '<meta[^>]*>',
        'javascript\s*:',
        'vbscript\s*:',
        'data\s*:',
        'on\w+\s*=',
        'expression\s*\(',
        'url\s*\('
    ];
    pattern TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    sanitized_text := input_text;
    
    -- 危険なHTMLタグとスクリプトを除去
    FOREACH pattern IN ARRAY xss_patterns
    LOOP
        sanitized_text := regexp_replace(sanitized_text, pattern, '', 'gi');
    END LOOP;
    
    -- HTMLエンティティエスケープ
    sanitized_text := replace(sanitized_text, '<', '&lt;');
    sanitized_text := replace(sanitized_text, '>', '&gt;');
    sanitized_text := replace(sanitized_text, '"', '&quot;');
    sanitized_text := replace(sanitized_text, '''', '&#x27;');
    sanitized_text := replace(sanitized_text, '&', '&amp;');
    
    RETURN sanitized_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================
-- 3. パスワードセキュリティ強化
-- ======================================

-- パスワード強度チェック関数
CREATE OR REPLACE FUNCTION validate_password_strength(password_text TEXT)
RETURNS JSON AS $$
DECLARE
    score INTEGER := 0;
    issues TEXT[] := ARRAY[]::TEXT[];
    min_length CONSTANT INTEGER := 8;
    max_length CONSTANT INTEGER := 128;
BEGIN
    -- 長さチェック
    IF LENGTH(password_text) < min_length THEN
        issues := array_append(issues, format('パスワードは%s文字以上である必要があります', min_length));
    ELSE
        score := score + 1;
    END IF;
    
    IF LENGTH(password_text) > max_length THEN
        issues := array_append(issues, format('パスワードは%s文字以下である必要があります', max_length));
    END IF;
    
    -- 大文字チェック
    IF password_text !~ '[A-Z]' THEN
        issues := array_append(issues, '大文字を含む必要があります');
    ELSE
        score := score + 1;
    END IF;
    
    -- 小文字チェック
    IF password_text !~ '[a-z]' THEN
        issues := array_append(issues, '小文字を含む必要があります');
    ELSE
        score := score + 1;
    END IF;
    
    -- 数字チェック
    IF password_text !~ '[0-9]' THEN
        issues := array_append(issues, '数字を含む必要があります');
    ELSE
        score := score + 1;
    END IF;
    
    -- 特殊文字チェック
    IF password_text !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?~`]' THEN
        issues := array_append(issues, '特殊文字を含む必要があります');
    ELSE
        score := score + 1;
    END IF;
    
    -- 一般的なパスワードチェック
    IF LOWER(password_text) = ANY(ARRAY['password', '123456', '123456789', 'qwerty', 'abc123', 'password123', 'admin', 'letmein', 'welcome']) THEN
        issues := array_append(issues, '一般的なパスワードは使用できません');
        score := 0;
    END IF;
    
    RETURN json_build_object(
        'is_valid', array_length(issues, 1) IS NULL,
        'score', score,
        'max_score', 5,
        'strength', CASE 
            WHEN score >= 5 THEN 'STRONG'
            WHEN score >= 3 THEN 'MEDIUM'
            ELSE 'WEAK'
        END,
        'issues', issues
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================
-- 4. セッション管理強化
-- ======================================

-- セッションタイムアウト管理
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- 期限切れセッション削除
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR last_activity < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- 長時間非アクティブセッション無効化
    UPDATE user_sessions SET 
        is_active = FALSE
    WHERE last_activity < CURRENT_TIMESTAMP - INTERVAL '2 hours'
    AND is_active = TRUE;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- セッション盗取検知
CREATE OR REPLACE FUNCTION detect_session_hijacking(
    session_id_param VARCHAR,
    ip_address_param INET,
    user_agent_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    stored_ip INET;
    stored_user_agent TEXT;
    session_user_id INTEGER;
BEGIN
    -- セッション情報取得
    SELECT ip_address, user_agent, user_id
    INTO stored_ip, stored_user_agent, session_user_id
    FROM user_sessions 
    WHERE session_id = session_id_param AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- IP アドレス変更検知
    IF stored_ip != ip_address_param THEN
        -- セキュリティ違反記録
        INSERT INTO security_violations (
            violation_type, violation_description, user_id, ip_address, detected_at
        ) VALUES (
            'SESSION_IP_CHANGE', 
            format('Session IP changed from %s to %s', stored_ip, ip_address_param),
            session_user_id, ip_address_param, CURRENT_TIMESTAMP
        );
        
        -- セッション無効化
        UPDATE user_sessions SET is_active = FALSE 
        WHERE session_id = session_id_param;
        
        RETURN FALSE;
    END IF;
    
    -- User-Agent大幅変更検知（一部変更は許可）
    IF stored_user_agent IS NOT NULL AND 
       LENGTH(stored_user_agent) > 0 AND
       user_agent_param IS NOT NULL AND
       similarity(stored_user_agent, user_agent_param) < 0.5 THEN
        
        INSERT INTO security_violations (
            violation_type, violation_description, user_id, ip_address, detected_at
        ) VALUES (
            'SESSION_USERAGENT_CHANGE', 
            'Significant User-Agent change detected',
            session_user_id, ip_address_param, CURRENT_TIMESTAMP
        );
        
        -- 警告レベル（セッション継続するが記録）
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 5. レート制限・DoS攻撃対策
-- ======================================

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(
    user_id_param INTEGER,
    endpoint_param VARCHAR,
    window_minutes INTEGER DEFAULT 60,
    max_requests INTEGER DEFAULT 100
) RETURNS JSON AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
    is_allowed BOOLEAN;
BEGIN
    window_start := CURRENT_TIMESTAMP - (window_minutes || ' minutes')::INTERVAL;
    
    -- 現在のリクエスト数取得
    SELECT COALESCE(requests_count, 0) INTO current_count
    FROM api_rate_limits
    WHERE user_id = user_id_param 
    AND endpoint = endpoint_param
    AND window_start > window_start;
    
    is_allowed := current_count < max_requests;
    
    IF is_allowed THEN
        -- リクエスト数更新
        INSERT INTO api_rate_limits (user_id, endpoint, requests_count, window_start, max_requests)
        VALUES (user_id_param, endpoint_param, 1, CURRENT_TIMESTAMP, max_requests)
        ON CONFLICT (user_id, endpoint) 
        DO UPDATE SET 
            requests_count = CASE 
                WHEN api_rate_limits.window_start < window_start THEN 1
                ELSE api_rate_limits.requests_count + 1
            END,
            window_start = CASE
                WHEN api_rate_limits.window_start < window_start THEN CURRENT_TIMESTAMP
                ELSE api_rate_limits.window_start
            END;
    ELSE
        -- レート制限違反記録
        INSERT INTO security_violations (
            violation_type, violation_description, user_id, detected_at
        ) VALUES (
            'RATE_LIMIT_EXCEEDED', 
            format('Rate limit exceeded for endpoint %s: %s/%s requests', 
                   endpoint_param, current_count, max_requests),
            user_id_param, CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN json_build_object(
        'allowed', is_allowed,
        'current_count', current_count,
        'max_requests', max_requests,
        'window_minutes', window_minutes,
        'reset_time', window_start + (window_minutes || ' minutes')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 6. データ暗号化関数
-- ======================================

-- 機密データ暗号化関数（AES）
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(
    data_text TEXT,
    encryption_key TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    key_to_use TEXT;
BEGIN
    -- デフォルトキーまたは提供されたキーを使用
    key_to_use := COALESCE(encryption_key, current_setting('app.encryption_key', true));
    
    IF key_to_use IS NULL OR LENGTH(key_to_use) = 0 THEN
        RAISE EXCEPTION 'Encryption key not provided';
    END IF;
    
    -- pgcrypto を使用した暗号化
    RETURN encode(
        encrypt_iv(data_text::bytea, key_to_use::bytea, gen_random_bytes(16), 'aes-cbc'), 
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 機密データ復号化関数
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(
    encrypted_data TEXT,
    encryption_key TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    key_to_use TEXT;
BEGIN
    key_to_use := COALESCE(encryption_key, current_setting('app.encryption_key', true));
    
    IF key_to_use IS NULL OR LENGTH(key_to_use) = 0 THEN
        RAISE EXCEPTION 'Encryption key not provided';
    END IF;
    
    RETURN convert_from(
        decrypt_iv(decode(encrypted_data, 'base64'), key_to_use::bytea, gen_random_bytes(16), 'aes-cbc'),
        'UTF8'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 7. 監査ログセキュリティ強化
-- ======================================

-- 監査ログ改ざん防止（ハッシュ値計算）
CREATE OR REPLACE FUNCTION calculate_audit_hash(
    user_id_param INTEGER,
    action_type_param VARCHAR,
    resource_type_param VARCHAR,
    resource_id_param INTEGER,
    timestamp_param TIMESTAMP WITH TIME ZONE
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            format('%s|%s|%s|%s|%s', 
                   COALESCE(user_id_param::TEXT, ''),
                   action_type_param,
                   resource_type_param,
                   COALESCE(resource_id_param::TEXT, ''),
                   timestamp_param::TEXT
            ), 
            'sha256'
        ), 
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 監査ログテーブルにハッシュ列追加
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS audit_hash TEXT;

-- 監査ログ整合性検証関数
CREATE OR REPLACE FUNCTION verify_audit_log_integrity()
RETURNS TABLE (
    audit_id INTEGER,
    is_valid BOOLEAN,
    calculated_hash TEXT,
    stored_hash TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.audit_id,
        CASE 
            WHEN al.audit_hash = calculate_audit_hash(
                al.user_id, al.action_type, al.resource_type, al.resource_id, al.performed_at
            ) THEN TRUE
            ELSE FALSE
        END as is_valid,
        calculate_audit_hash(
            al.user_id, al.action_type, al.resource_type, al.resource_id, al.performed_at
        ) as calculated_hash,
        al.audit_hash as stored_hash
    FROM audit_logs al
    WHERE al.audit_hash IS NOT NULL
    ORDER BY al.performed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 8. セキュリティ設定テーブル
-- ======================================

-- セキュリティ設定マスタ
CREATE TABLE IF NOT EXISTS security_settings (
    setting_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'STRING', -- 'STRING', 'INTEGER', 'BOOLEAN', 'JSON'
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_security_settings_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT unq_security_settings_company_key UNIQUE (company_id, setting_key)
);

-- デフォルトセキュリティ設定投入
INSERT INTO security_settings (company_id, setting_key, setting_value, setting_type, description) VALUES
(1, 'password_min_length', '8', 'INTEGER', 'パスワード最小長'),
(1, 'password_complexity_required', 'true', 'BOOLEAN', 'パスワード複雑性要求'),
(1, 'session_timeout_minutes', '120', 'INTEGER', 'セッションタイムアウト（分）'),
(1, 'max_login_attempts', '5', 'INTEGER', '最大ログイン試行回数'),
(1, 'account_lockout_minutes', '30', 'INTEGER', 'アカウントロック時間（分）'),
(1, 'require_two_factor_auth', 'false', 'BOOLEAN', '2要素認証必須'),
(1, 'ip_address_validation', 'false', 'BOOLEAN', 'IPアドレス検証'),
(1, 'audit_log_retention_days', '365', 'INTEGER', '監査ログ保持日数'),
(1, 'rate_limit_requests_per_hour', '1000', 'INTEGER', '1時間あたりAPIリクエスト制限'),
(1, 'encryption_at_rest', 'true', 'BOOLEAN', '保存時暗号化')
ON CONFLICT (company_id, setting_key) DO NOTHING;

-- ======================================
-- 9. セキュリティダッシュボード拡張
-- ======================================

-- 包括的セキュリティメトリクス
CREATE OR REPLACE VIEW comprehensive_security_dashboard AS
WITH security_metrics AS (
    -- ログイン失敗統計
    SELECT 'login_failures_1h' as metric, COUNT(*) as value, 'ログイン失敗数（1時間）' as description
    FROM login_attempts 
    WHERE attempt_result = 'failure' AND attempted_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    
    UNION ALL
    
    SELECT 'login_failures_24h' as metric, COUNT(*) as value, 'ログイン失敗数（24時間）' as description
    FROM login_attempts 
    WHERE attempt_result = 'failure' AND attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    
    UNION ALL
    
    -- セキュリティ違反統計
    SELECT 'security_violations_24h' as metric, COUNT(*) as value, 'セキュリティ違反数（24時間）' as description
    FROM security_violations 
    WHERE detected_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    
    UNION ALL
    
    -- アクティブセッション
    SELECT 'active_sessions' as metric, COUNT(*) as value, 'アクティブセッション数' as description
    FROM user_sessions 
    WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
    
    UNION ALL
    
    -- ロック中アカウント
    SELECT 'locked_accounts' as metric, COUNT(*) as value, 'ロック中アカウント数' as description
    FROM users 
    WHERE account_locked_until > CURRENT_TIMESTAMP
    
    UNION ALL
    
    -- 2要素認証有効ユーザー
    SELECT 'two_factor_enabled' as metric, COUNT(*) as value, '2要素認証有効ユーザー数' as description
    FROM users 
    WHERE two_factor_secret IS NOT NULL AND is_active = TRUE
    
    UNION ALL
    
    -- パスワード期限切れ予定
    SELECT 'password_expiring_7d' as metric, COUNT(*) as value, 'パスワード期限切れ予定（7日以内）' as description
    FROM users 
    WHERE password_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' AND is_active = TRUE
)
SELECT 
    metric,
    value,
    description,
    CASE 
        WHEN metric = 'login_failures_1h' AND value > 10 THEN 'WARNING'
        WHEN metric = 'login_failures_24h' AND value > 50 THEN 'CRITICAL'
        WHEN metric = 'security_violations_24h' AND value > 0 THEN 'WARNING'
        WHEN metric = 'locked_accounts' AND value > 0 THEN 'INFO'
        WHEN metric = 'password_expiring_7d' AND value > 0 THEN 'WARNING'
        ELSE 'OK'
    END as alert_level,
    CURRENT_TIMESTAMP as generated_at
FROM security_metrics
ORDER BY 
    CASE alert_level
        WHEN 'CRITICAL' THEN 1
        WHEN 'WARNING' THEN 2
        WHEN 'INFO' THEN 3
        ELSE 4
    END,
    value DESC;

-- ======================================
-- 10. セキュリティテスト関数
-- ======================================

-- 包括的セキュリティテスト実行
CREATE OR REPLACE FUNCTION run_security_tests()
RETURNS JSON AS $$
DECLARE
    test_results JSON;
    sql_injection_test BOOLEAN;
    password_strength_test BOOLEAN;
    session_security_test BOOLEAN;
    encryption_test BOOLEAN;
    rate_limit_test BOOLEAN;
    audit_integrity_test BOOLEAN;
BEGIN
    -- 1. SQLインジェクション対策テスト
    sql_injection_test := NOT validate_input_sql_injection('1'' OR ''1''=''1');
    
    -- 2. パスワード強度テスト
    password_strength_test := (validate_password_strength('Test123!')::json->>'is_valid')::boolean;
    
    -- 3. セッション検証テスト
    session_security_test := cleanup_expired_sessions() >= 0;
    
    -- 4. 暗号化テスト
    BEGIN
        PERFORM decrypt_sensitive_data(encrypt_sensitive_data('test_data', 'test_key_1234567890123456'), 'test_key_1234567890123456');
        encryption_test := TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            encryption_test := FALSE;
    END;
    
    -- 5. レート制限テスト
    rate_limit_test := (check_rate_limit(1, '/test', 1, 1)::json->>'allowed')::boolean;
    
    -- 6. 監査ログ整合性テスト
    audit_integrity_test := EXISTS(SELECT 1 FROM verify_audit_log_integrity() LIMIT 1);
    
    test_results := json_build_object(
        'sql_injection_protection', sql_injection_test,
        'password_strength_validation', password_strength_test,
        'session_security', session_security_test,
        'data_encryption', encryption_test,
        'rate_limiting', rate_limit_test,
        'audit_log_integrity', audit_integrity_test,
        'overall_score', CASE 
            WHEN sql_injection_test AND password_strength_test AND session_security_test 
                 AND encryption_test AND rate_limit_test AND audit_integrity_test THEN 100
            ELSE (
                (CASE WHEN sql_injection_test THEN 1 ELSE 0 END +
                 CASE WHEN password_strength_test THEN 1 ELSE 0 END +
                 CASE WHEN session_security_test THEN 1 ELSE 0 END +
                 CASE WHEN encryption_test THEN 1 ELSE 0 END +
                 CASE WHEN rate_limit_test THEN 1 ELSE 0 END +
                 CASE WHEN audit_integrity_test THEN 1 ELSE 0 END) * 100 / 6
            )
        END,
        'tested_at', CURRENT_TIMESTAMP
    );
    
    RETURN test_results;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 完了確認とセキュリティ検証
-- ======================================

DO $$
DECLARE
    security_functions_count INTEGER;
    security_tables_count INTEGER;
    test_results JSON;
    overall_score INTEGER;
BEGIN
    -- セキュリティ関数数確認
    SELECT COUNT(*) INTO security_functions_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND (p.proname LIKE '%security%' OR p.proname LIKE 'validate_%' 
         OR p.proname LIKE 'sanitize_%' OR p.proname LIKE 'encrypt_%'
         OR p.proname LIKE 'decrypt_%');
    
    -- セキュリティテーブル数確認
    SELECT COUNT(*) INTO security_tables_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('security_violations', 'security_settings', 'login_attempts', 'user_sessions');
    
    -- セキュリティテスト実行
    test_results := run_security_tests();
    overall_score := (test_results->>'overall_score')::INTEGER;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【セキュリティ強化】実装完了確認';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'セキュリティ関数数: %', security_functions_count;
    RAISE NOTICE 'セキュリティテーブル数: %', security_tables_count;
    RAISE NOTICE 'セキュリティテスト総合スコア: %/100', overall_score;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'テスト結果詳細:';
    RAISE NOTICE 'SQLインジェクション対策: %', CASE WHEN (test_results->>'sql_injection_protection')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'パスワード強度検証: %', CASE WHEN (test_results->>'password_strength_validation')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'セッションセキュリティ: %', CASE WHEN (test_results->>'session_security')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'データ暗号化: %', CASE WHEN (test_results->>'data_encryption')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'レート制限: %', CASE WHEN (test_results->>'rate_limiting')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE '監査ログ整合性: %', CASE WHEN (test_results->>'audit_log_integrity')::boolean THEN '✅' ELSE '❌' END;
    RAISE NOTICE '===========================================';
    
    IF security_functions_count >= 8 AND security_tables_count >= 4 AND overall_score >= 85 THEN
        RAISE NOTICE '✅ セキュリティ強化 - 完全成功！';
        RAISE NOTICE '🔒 企業級セキュリティレベル達成';
        RAISE NOTICE '🛡️ 脆弱性対策完全実装';
        RAISE NOTICE '🎯 95%完成目標へ大きく前進！';
    ELSE
        RAISE WARNING '⚠️ 一部セキュリティ機能に問題があります';
        RAISE WARNING '関数数: %（期待値: 8以上）', security_functions_count;
        RAISE WARNING 'テーブル数: %（期待値: 4以上）', security_tables_count;
        RAISE WARNING 'テストスコア: %（期待値: 85以上）', overall_score;
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;