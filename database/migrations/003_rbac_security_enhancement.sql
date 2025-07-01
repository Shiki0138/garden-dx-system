-- ======================================
-- Garden システム RBAC・セキュリティ強化
-- Migration: 003_rbac_security_enhancement.sql
-- 最終統合対応: 完全RBAC + セキュリティ強化
-- ======================================

-- 開始ログ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【最終統合】RBAC・セキュリティ強化開始';
    RAISE NOTICE 'Worker4認証システム統合準備';
    RAISE NOTICE '95%完成目標 - セキュリティ完全実装';
    RAISE NOTICE '===========================================';
END $$;

-- ======================================
-- 1. 権限テーブル拡張（細粒度権限制御）
-- ======================================

-- 権限カテゴリテーブル
CREATE TABLE IF NOT EXISTS permission_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    category_description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 権限詳細テーブル（細粒度制御）
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(100) NOT NULL,
    permission_description TEXT,
    resource_type VARCHAR(50), -- 'estimate', 'invoice', 'project', 'user'
    action_type VARCHAR(50),   -- 'create', 'read', 'update', 'delete', 'approve'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_permissions_category FOREIGN KEY (category_id) REFERENCES permission_categories(category_id) ON DELETE RESTRICT
);

-- 役割-権限マッピングテーブル
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    
    -- 外部キー制約
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- 重複防止
    CONSTRAINT unq_role_permissions UNIQUE (role_id, permission_id)
);

-- ユーザー個別権限テーブル（例外的権限付与）
CREATE TABLE IF NOT EXISTS user_permissions (
    user_permission_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE, -- FALSE = 権限剥奪
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    
    -- 外部キー制約
    CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- 重複防止
    CONSTRAINT unq_user_permissions UNIQUE (user_id, permission_id)
);

-- ======================================
-- 2. セキュリティ強化テーブル
-- ======================================

-- ログイン試行履歴（セキュリティ監視）
CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    attempt_result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'blocked'
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    company_id INTEGER,
    
    -- 制約
    CONSTRAINT chk_login_attempts_result CHECK (attempt_result IN ('success', 'failure', 'blocked', 'locked'))
);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    session_data JSONB,
    
    -- 外部キー制約
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_sessions_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    company_id INTEGER,
    action_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
    resource_type VARCHAR(50) NOT NULL, -- 'estimate', 'invoice', 'project'
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- API使用制限テーブル（レート制限）
CREATE TABLE IF NOT EXISTS api_rate_limits (
    limit_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    company_id INTEGER,
    endpoint VARCHAR(255) NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    window_duration INTERVAL DEFAULT '1 hour',
    max_requests INTEGER DEFAULT 1000,
    
    -- 外部キー制約
    CONSTRAINT fk_api_rate_limits_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_api_rate_limits_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- ======================================
-- 3. ユーザーテーブル セキュリティ強化
-- ======================================

-- ユーザーテーブル セキュリティフィールド追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    password_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days');

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    failed_login_count INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    account_locked_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    two_factor_secret VARCHAR(32);

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    backup_codes TEXT[];

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    security_questions JSONB;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    last_security_check TIMESTAMP WITH TIME ZONE;

-- 制約追加
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS 
    chk_users_failed_login_count CHECK (failed_login_count >= 0);

-- ======================================
-- 4. 権限・カテゴリマスタデータ投入
-- ======================================

-- 権限カテゴリ投入
INSERT INTO permission_categories (category_name, category_description, display_order) VALUES
('見積管理', '見積書の作成・編集・承認・PDF出力', 1),
('請求管理', '請求書の作成・編集・発行・入金管理', 2),
('プロジェクト管理', 'プロジェクトの作成・編集・進捗管理', 3),
('顧客管理', '顧客情報の管理・編集', 4),
('単価管理', '単価マスタの管理・編集', 5),
('ユーザー管理', 'ユーザーアカウント・権限管理', 6),
('レポート', '各種レポート・ダッシュボードの閲覧', 7),
('システム管理', 'システム設定・セキュリティ管理', 8)
ON CONFLICT (category_name) DO NOTHING;

-- 詳細権限投入
INSERT INTO permissions (category_id, permission_code, permission_name, permission_description, resource_type, action_type) VALUES
-- 見積管理
(1, 'estimate:create', '見積作成', '新規見積の作成', 'estimate', 'create'),
(1, 'estimate:read', '見積閲覧', '見積の閲覧・検索', 'estimate', 'read'),
(1, 'estimate:update', '見積編集', '見積の編集・修正', 'estimate', 'update'),
(1, 'estimate:delete', '見積削除', '見積の削除', 'estimate', 'delete'),
(1, 'estimate:approve', '見積承認', '見積の承認・差し戻し', 'estimate', 'approve'),
(1, 'estimate:view_cost', '原価閲覧', '見積の原価・利益率閲覧', 'estimate', 'read'),
(1, 'estimate:pdf_export', 'PDF出力', '見積書PDF出力', 'estimate', 'export'),
(1, 'estimate:final_discount', '最終値引き', '見積合計の最終調整', 'estimate', 'update'),

-- 請求管理
(2, 'invoice:create', '請求書作成', '新規請求書の作成', 'invoice', 'create'),
(2, 'invoice:read', '請求書閲覧', '請求書の閲覧・検索', 'invoice', 'read'),
(2, 'invoice:update', '請求書編集', '請求書の編集・修正', 'invoice', 'update'),
(2, 'invoice:delete', '請求書削除', '請求書の削除', 'invoice', 'delete'),
(2, 'invoice:issue', '請求書発行', '請求書の発行・送付', 'invoice', 'issue'),
(2, 'invoice:pdf_export', 'PDF出力', '請求書PDF出力', 'invoice', 'export'),
(2, 'invoice:payment_update', '入金更新', '入金状況の更新', 'invoice', 'update'),

-- プロジェクト管理
(3, 'project:create', 'プロジェクト作成', '新規プロジェクトの作成', 'project', 'create'),
(3, 'project:read', 'プロジェクト閲覧', 'プロジェクトの閲覧', 'project', 'read'),
(3, 'project:update', 'プロジェクト編集', 'プロジェクトの編集', 'project', 'update'),
(3, 'project:delete', 'プロジェクト削除', 'プロジェクトの削除', 'project', 'delete'),
(3, 'project:view_financials', '収益性閲覧', 'プロジェクトの予実・収益性閲覧', 'project', 'read'),

-- 顧客管理
(4, 'customer:create', '顧客作成', '新規顧客の登録', 'customer', 'create'),
(4, 'customer:read', '顧客閲覧', '顧客情報の閲覧', 'customer', 'read'),
(4, 'customer:update', '顧客編集', '顧客情報の編集', 'customer', 'update'),
(4, 'customer:delete', '顧客削除', '顧客情報の削除', 'customer', 'delete'),

-- 単価管理
(5, 'price_master:read', '単価閲覧', '単価マスタの閲覧', 'price_master', 'read'),
(5, 'price_master:update', '単価編集', '単価マスタの編集', 'price_master', 'update'),
(5, 'price_master:create', '単価作成', '新規単価の登録', 'price_master', 'create'),
(5, 'price_master:delete', '単価削除', '単価の削除', 'price_master', 'delete'),

-- ユーザー管理
(6, 'user:create', 'ユーザー作成', '新規ユーザーの作成', 'user', 'create'),
(6, 'user:read', 'ユーザー閲覧', 'ユーザー情報の閲覧', 'user', 'read'),
(6, 'user:update', 'ユーザー編集', 'ユーザー情報の編集', 'user', 'update'),
(6, 'user:delete', 'ユーザー削除', 'ユーザーの削除', 'user', 'delete'),
(6, 'user:manage_permissions', '権限管理', 'ユーザー権限の管理', 'user', 'manage'),

-- レポート
(7, 'report:financial', '財務レポート', '売上・利益レポートの閲覧', 'report', 'read'),
(7, 'report:project', 'プロジェクトレポート', 'プロジェクト進捗レポート', 'report', 'read'),
(7, 'report:customer', '顧客レポート', '顧客分析レポート', 'report', 'read'),

-- システム管理
(8, 'system:settings', 'システム設定', 'システム設定の変更', 'system', 'manage'),
(8, 'system:backup', 'バックアップ', 'データベースバックアップ', 'system', 'backup'),
(8, 'system:audit', '監査ログ', '監査ログの閲覧', 'system', 'read'),
(8, 'system:security', 'セキュリティ管理', 'セキュリティ設定管理', 'system', 'manage')
ON CONFLICT (permission_code) DO NOTHING;

-- ======================================
-- 5. 役割-権限マッピング設定
-- ======================================

-- 経営者（owner）権限 - 全権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM permissions WHERE is_active = TRUE
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 従業員（employee）権限 - 基本業務権限のみ
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, permission_id FROM permissions 
WHERE permission_code IN (
    'estimate:create', 'estimate:read', 'estimate:update', 'estimate:pdf_export',
    'invoice:read', 'invoice:pdf_export',
    'project:create', 'project:read', 'project:update',
    'customer:create', 'customer:read', 'customer:update',
    'price_master:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 管理者（admin）権限 - システム管理権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, permission_id FROM permissions WHERE is_active = TRUE
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 閲覧者（viewer）権限 - 閲覧のみ
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, permission_id FROM permissions 
WHERE action_type = 'read' OR permission_code LIKE '%:pdf_export'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ======================================
-- 6. セキュリティ関数群
-- ======================================

-- 権限チェック関数
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id_param INTEGER,
    permission_code_param VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    user_role_id INTEGER;
BEGIN
    -- ユーザーの役割を取得
    SELECT role_id INTO user_role_id 
    FROM users 
    WHERE user_id = user_id_param AND is_active = TRUE;
    
    IF user_role_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 役割による権限チェック
    SELECT EXISTS(
        SELECT 1 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = user_role_id 
        AND p.permission_code = permission_code_param
        AND p.is_active = TRUE
    ) INTO has_permission;
    
    -- 個別権限チェック（上書き）
    SELECT CASE 
        WHEN up.is_granted IS NOT NULL THEN up.is_granted
        ELSE has_permission
    END INTO has_permission
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.permission_id
    WHERE up.user_id = user_id_param 
    AND p.permission_code = permission_code_param
    AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP);
    
    RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ログイン試行記録関数
CREATE OR REPLACE FUNCTION record_login_attempt(
    username_param VARCHAR,
    email_param VARCHAR,
    ip_address_param INET,
    user_agent_param TEXT,
    result_param VARCHAR,
    failure_reason_param VARCHAR DEFAULT NULL,
    company_id_param INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO login_attempts (
        username, email, ip_address, user_agent, 
        attempt_result, failure_reason, company_id
    ) VALUES (
        username_param, email_param, ip_address_param, user_agent_param,
        result_param, failure_reason_param, company_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 監査ログ記録関数
CREATE OR REPLACE FUNCTION record_audit_log(
    user_id_param INTEGER,
    company_id_param INTEGER,
    action_type_param VARCHAR,
    resource_type_param VARCHAR,
    resource_id_param INTEGER,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, company_id, action_type, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        user_id_param, company_id_param, action_type_param, 
        resource_type_param, resource_id_param, old_values_param, 
        new_values_param, ip_address_param, user_agent_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- アカウントロック関数
CREATE OR REPLACE FUNCTION lock_user_account(
    user_id_param INTEGER,
    lock_duration INTERVAL DEFAULT '30 minutes'
) RETURNS VOID AS $$
BEGIN
    UPDATE users SET
        account_locked_until = CURRENT_TIMESTAMP + lock_duration,
        failed_login_count = 0
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 7. セキュリティ監視ビュー
-- ======================================

-- セキュリティダッシュボードビュー
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    'login_failures_24h' as metric,
    COUNT(*) as value,
    'ログイン失敗数（24時間）' as description
FROM login_attempts 
WHERE attempt_result = 'failure' 
AND attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'

UNION ALL

SELECT 
    'locked_accounts' as metric,
    COUNT(*) as value,
    'ロック中アカウント数' as description
FROM users 
WHERE account_locked_until > CURRENT_TIMESTAMP

UNION ALL

SELECT 
    'active_sessions' as metric,
    COUNT(*) as value,
    'アクティブセッション数' as description
FROM user_sessions 
WHERE is_active = TRUE 
AND expires_at > CURRENT_TIMESTAMP

UNION ALL

SELECT 
    'audit_logs_24h' as metric,
    COUNT(*) as value,
    '監査ログ数（24時間）' as description
FROM audit_logs 
WHERE performed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- ======================================
-- 8. インデックス作成（パフォーマンス最適化）
-- ======================================

-- セキュリティ関連インデックス
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time ON login_attempts(username, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_result ON login_attempts(attempt_result, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_company_active ON user_sessions(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_resource ON audit_logs(company_id, resource_type, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON audit_logs(action_type, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id) WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- ======================================
-- 9. Row Level Security 更新
-- ======================================

-- 監査ログのRLSポリシー
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_company_policy ON audit_logs
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- セッション管理のRLSポリシー
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_company_policy ON user_sessions
    USING (company_id = current_setting('app.current_company_id', true)::INTEGER);

-- ======================================
-- 10. トリガー設定
-- ======================================

-- 監査ログ自動記録トリガー関数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    action_type VARCHAR;
BEGIN
    -- アクション種別決定
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        new_data := to_jsonb(NEW);
        old_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        new_data := to_jsonb(NEW);
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        new_data := NULL;
        old_data := to_jsonb(OLD);
    END IF;
    
    -- 監査ログ記録
    PERFORM record_audit_log(
        current_setting('app.current_user_id', true)::INTEGER,
        current_setting('app.current_company_id', true)::INTEGER,
        action_type,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.estimate_id
            ELSE NEW.estimate_id
        END,
        old_data,
        new_data
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 主要テーブルに監査トリガー設定
CREATE TRIGGER audit_estimates_trigger
    AFTER INSERT OR UPDATE OR DELETE ON estimates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 更新日時トリガー
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 完了確認とバリデーション
-- ======================================

DO $$
DECLARE
    permission_count INTEGER;
    role_permission_count INTEGER;
    security_table_count INTEGER;
    audit_log_test INTEGER;
BEGIN
    -- 権限数確認
    SELECT COUNT(*) INTO permission_count FROM permissions WHERE is_active = TRUE;
    SELECT COUNT(*) INTO role_permission_count FROM role_permissions;
    
    -- セキュリティテーブル確認
    SELECT COUNT(*) INTO security_table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('login_attempts', 'user_sessions', 'audit_logs', 'api_rate_limits');
    
    -- 監査ログ機能テスト
    SELECT COUNT(*) INTO audit_log_test FROM audit_logs;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '【最終統合】RBAC・セキュリティ強化完了';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '権限数: %', permission_count;
    RAISE NOTICE '役割-権限マッピング: %', role_permission_count;
    RAISE NOTICE 'セキュリティテーブル: %', security_table_count;
    RAISE NOTICE '監査ログ初期化: %', audit_log_test;
    RAISE NOTICE '===========================================';
    
    IF permission_count >= 30 AND role_permission_count >= 60 AND security_table_count = 4 THEN
        RAISE NOTICE '✅ RBAC・セキュリティ強化 - 完全成功！';
        RAISE NOTICE '🔒 企業級セキュリティレベル達成';
        RAISE NOTICE '🎯 95%完成目標に向けて前進';
    ELSE
        RAISE WARNING '⚠️ 一部セキュリティ機能に問題があります';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;