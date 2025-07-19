-- =====================================================================
-- Garden DX - Supabase Authentication Functions
-- 経営者・従業員権限分離システム + 認証・認可機能
-- =====================================================================

-- =====================================================================
-- 1. 役割ベース権限管理関数
-- =====================================================================

-- 権限レベル定義
CREATE TYPE permission_level AS ENUM ('none', 'read', 'write', 'admin', 'owner');

-- 役割権限マッピング
CREATE OR REPLACE FUNCTION get_role_permissions(user_role TEXT, resource TEXT)
RETURNS permission_level AS $$
BEGIN
    -- オーナー権限（全権限）
    IF user_role = 'owner' THEN
        RETURN 'owner'::permission_level;
    END IF;
    
    -- マネージャー権限
    IF user_role = 'manager' THEN
        CASE resource
            WHEN 'users' THEN RETURN 'admin'::permission_level;
            WHEN 'company_settings' THEN RETURN 'admin'::permission_level;
            WHEN 'financial_reports' THEN RETURN 'admin'::permission_level;
            ELSE RETURN 'write'::permission_level;
        END CASE;
    END IF;
    
    -- 従業員権限
    IF user_role = 'employee' THEN
        CASE resource
            WHEN 'estimates' THEN RETURN 'write'::permission_level;
            WHEN 'customers' THEN RETURN 'write'::permission_level;
            WHEN 'projects' THEN RETURN 'write'::permission_level;
            WHEN 'invoices' THEN RETURN 'read'::permission_level;
            WHEN 'price_master' THEN RETURN 'read'::permission_level;
            WHEN 'reports' THEN RETURN 'none'::permission_level;
            WHEN 'users' THEN RETURN 'none'::permission_level;
            WHEN 'company_settings' THEN RETURN 'none'::permission_level;
            ELSE RETURN 'read'::permission_level;
        END CASE;
    END IF;
    
    -- ビューアー権限（読み取りのみ）
    IF user_role = 'viewer' THEN
        CASE resource
            WHEN 'estimates' THEN RETURN 'read'::permission_level;
            WHEN 'customers' THEN RETURN 'read'::permission_level;
            WHEN 'projects' THEN RETURN 'read'::permission_level;
            WHEN 'invoices' THEN RETURN 'read'::permission_level;
            WHEN 'price_master' THEN RETURN 'read'::permission_level;
            ELSE RETURN 'none'::permission_level;
        END CASE;
    END IF;
    
    -- デフォルトは権限なし
    RETURN 'none'::permission_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 2. セキュアな認証チェック関数
-- =====================================================================

-- ユーザー認証状態チェック
CREATE OR REPLACE FUNCTION check_user_authentication()
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- 認証されたユーザーIDが存在するかチェック
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ユーザープロフィール取得
    SELECT * INTO user_record
    FROM user_profiles
    WHERE id = auth.uid();
    
    -- ユーザーが存在しない
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- ユーザーがアクティブでない
    IF NOT user_record.is_active THEN
        RETURN FALSE;
    END IF;
    
    -- アカウントがロックされている
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 3. 会社データ分離チェック関数
-- =====================================================================

-- レコードが同じ会社に属するかチェック
CREATE OR REPLACE FUNCTION check_company_ownership(record_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- 認証チェック
    IF NOT check_user_authentication() THEN
        RETURN FALSE;
    END IF;
    
    -- 会社IDが一致するかチェック
    RETURN record_company_id = auth.get_user_company_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 4. 操作権限チェック関数
-- =====================================================================

-- リソースに対する操作権限チェック
CREATE OR REPLACE FUNCTION check_operation_permission(
    resource TEXT,
    operation TEXT,
    record_company_id UUID DEFAULT NULL,
    record_creator_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    permission_level permission_level;
    required_level permission_level;
BEGIN
    -- 認証チェック
    IF NOT check_user_authentication() THEN
        RETURN FALSE;
    END IF;
    
    -- 会社データ分離チェック
    IF record_company_id IS NOT NULL AND NOT check_company_ownership(record_company_id) THEN
        RETURN FALSE;
    END IF;
    
    -- ユーザー役割取得
    user_role := auth.get_user_role();
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- リソースに対する権限レベル取得
    permission_level := get_role_permissions(user_role, resource);
    
    -- 操作に必要な権限レベル決定
    CASE operation
        WHEN 'SELECT', 'READ' THEN required_level := 'read'::permission_level;
        WHEN 'INSERT', 'UPDATE', 'DELETE', 'WRITE' THEN required_level := 'write'::permission_level;
        WHEN 'ADMIN' THEN required_level := 'admin'::permission_level;
        WHEN 'OWNER' THEN required_level := 'owner'::permission_level;
        ELSE required_level := 'owner'::permission_level; -- 不明な操作は最高権限要求
    END CASE;
    
    -- 権限レベル比較
    IF permission_level = 'owner' THEN
        RETURN TRUE;
    ELSIF permission_level = 'admin' AND required_level != 'owner' THEN
        RETURN TRUE;
    ELSIF permission_level = 'write' AND required_level IN ('read', 'write') THEN
        RETURN TRUE;
    ELSIF permission_level = 'read' AND required_level = 'read' THEN
        RETURN TRUE;
    END IF;
    
    -- 作成者チェック（自分が作成したレコードなら権限拡張）
    IF record_creator_id IS NOT NULL AND record_creator_id = auth.uid() THEN
        IF permission_level IN ('read', 'write') AND required_level = 'write' THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 5. 特定リソース権限チェック関数
-- =====================================================================

-- 見積書操作権限チェック
CREATE OR REPLACE FUNCTION check_estimate_permission(
    estimate_id UUID,
    operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    estimate_record RECORD;
BEGIN
    -- 見積書情報取得
    SELECT company_id, created_by, status INTO estimate_record
    FROM estimates
    WHERE id = estimate_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 基本権限チェック
    IF NOT check_operation_permission('estimates', operation, estimate_record.company_id, estimate_record.created_by) THEN
        RETURN FALSE;
    END IF;
    
    -- 状態別権限チェック
    IF operation IN ('UPDATE', 'DELETE') THEN
        -- 承認済み見積書は管理者のみ編集可能
        IF estimate_record.status = 'approved' AND auth.get_user_role() NOT IN ('owner', 'manager') THEN
            RETURN FALSE;
        END IF;
        
        -- 期限切れ見積書は編集不可
        IF estimate_record.status = 'expired' THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 請求書操作権限チェック
CREATE OR REPLACE FUNCTION check_invoice_permission(
    invoice_id UUID,
    operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    invoice_record RECORD;
BEGIN
    -- 請求書情報取得
    SELECT company_id, created_by, status INTO invoice_record
    FROM invoices
    WHERE id = invoice_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 基本権限チェック
    IF NOT check_operation_permission('invoices', operation, invoice_record.company_id, invoice_record.created_by) THEN
        RETURN FALSE;
    END IF;
    
    -- 状態別権限チェック
    IF operation IN ('UPDATE', 'DELETE') THEN
        -- 支払済み請求書は編集不可
        IF invoice_record.status = 'paid' THEN
            RETURN FALSE;
        END IF;
        
        -- 送信済み請求書は管理者のみ編集可能
        IF invoice_record.status = 'sent' AND auth.get_user_role() NOT IN ('owner', 'manager') THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 6. セキュリティ監査関数
-- =====================================================================

-- セキュリティイベント記録
CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    severity TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    user_id UUID;
    company_id UUID;
BEGIN
    user_id := auth.uid();
    company_id := auth.get_user_company_id();
    
    INSERT INTO security_events (
        event_type,
        severity,
        user_id,
        company_id,
        description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        event_type,
        severity,
        user_id,
        company_id,
        description,
        metadata,
        inet_client_addr(),
        current_setting('request.headers')::JSONB->>'user-agent'
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 不正アクセス試行記録
CREATE OR REPLACE FUNCTION log_access_violation(
    resource TEXT,
    operation TEXT,
    attempted_record_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    PERFORM log_security_event(
        'ACCESS_VIOLATION',
        'HIGH',
        format('Unauthorized %s attempt on %s', operation, resource),
        jsonb_build_object(
            'resource', resource,
            'operation', operation,
            'attempted_record_id', attempted_record_id,
            'user_role', auth.get_user_role()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 7. ログイン試行管理
-- =====================================================================

-- ログイン失敗記録
CREATE OR REPLACE FUNCTION record_login_failure(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
    max_attempts INTEGER := 5;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    -- ユーザー情報取得
    SELECT * INTO user_record
    FROM user_profiles
    WHERE email = user_email;
    
    IF FOUND THEN
        -- 失敗回数増加
        UPDATE user_profiles
        SET 
            failed_login_attempts = failed_login_attempts + 1,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        -- 最大試行回数超過でアカウントロック
        IF user_record.failed_login_attempts + 1 >= max_attempts THEN
            UPDATE user_profiles
            SET 
                locked_until = NOW() + lockout_duration,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            -- セキュリティイベント記録
            PERFORM log_security_event(
                'ACCOUNT_LOCKED',
                'HIGH',
                format('Account locked due to %s failed login attempts', max_attempts),
                jsonb_build_object('user_id', user_record.id, 'email', user_email)
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ログイン成功記録
CREATE OR REPLACE FUNCTION record_login_success()
RETURNS VOID AS $$
BEGIN
    -- 失敗回数リセット・ログイン時刻更新
    UPDATE user_profiles
    SET 
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login = NOW(),
        updated_at = NOW()
    WHERE id = auth.uid();
    
    -- セキュリティイベント記録
    PERFORM log_security_event(
        'LOGIN_SUCCESS',
        'LOW',
        'User login successful',
        jsonb_build_object('user_id', auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 8. データ変更監査トリガー関数
-- =====================================================================

-- 監査ログ記録関数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    company_id UUID;
    changed_fields TEXT[];
BEGIN
    user_id := auth.uid();
    company_id := auth.get_user_company_id();
    
    -- 変更されたフィールドを特定（UPDATE時）
    IF TG_OP = 'UPDATE' THEN
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each_text(to_jsonb(NEW))
        WHERE value IS DISTINCT FROM (to_jsonb(OLD) ->> key);
    END IF;
    
    -- 監査ログ挿入
    INSERT INTO audit_logs (
        table_name,
        operation,
        record_id,
        user_id,
        company_id,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        user_id,
        company_id,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
        changed_fields,
        inet_client_addr(),
        current_setting('request.headers')::JSONB->>'user-agent'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 9. 監査トリガー設定
-- =====================================================================

-- 主要テーブルに監査トリガー設定
CREATE TRIGGER audit_companies_trigger
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_customers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_price_master_trigger
    AFTER INSERT OR UPDATE OR DELETE ON price_master
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_estimates_trigger
    AFTER INSERT OR UPDATE OR DELETE ON estimates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================================
-- 10. 権限チェック用ビューと関数
-- =====================================================================

-- 現在ユーザーの権限サマリー
CREATE OR REPLACE VIEW current_user_permissions AS
SELECT 
    'estimates' as resource,
    get_role_permissions(auth.get_user_role(), 'estimates') as permission_level
UNION ALL
SELECT 
    'customers' as resource,
    get_role_permissions(auth.get_user_role(), 'customers') as permission_level
UNION ALL
SELECT 
    'invoices' as resource,
    get_role_permissions(auth.get_user_role(), 'invoices') as permission_level
UNION ALL
SELECT 
    'projects' as resource,
    get_role_permissions(auth.get_user_role(), 'projects') as permission_level
UNION ALL
SELECT 
    'price_master' as resource,
    get_role_permissions(auth.get_user_role(), 'price_master') as permission_level
UNION ALL
SELECT 
    'reports' as resource,
    get_role_permissions(auth.get_user_role(), 'reports') as permission_level
UNION ALL
SELECT 
    'users' as resource,
    get_role_permissions(auth.get_user_role(), 'users') as permission_level
UNION ALL
SELECT 
    'company_settings' as resource,
    get_role_permissions(auth.get_user_role(), 'company_settings') as permission_level;

-- 権限チェック簡易関数
CREATE OR REPLACE FUNCTION can_access(resource TEXT, operation TEXT DEFAULT 'SELECT')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN check_operation_permission(resource, operation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;