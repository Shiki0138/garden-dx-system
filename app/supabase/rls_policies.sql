-- =====================================================================
-- Garden DX - Row Level Security (RLS) Policies
-- Supabase環境での多租户データ分離・RBAC実装
-- =====================================================================

-- =====================================================================
-- ヘルパー関数定義
-- =====================================================================

-- 現在のユーザーの会社IDを取得
CREATE OR REPLACE FUNCTION auth.get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 現在のユーザーの役割を取得
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 現在のユーザーがアクティブかチェック
CREATE OR REPLACE FUNCTION auth.is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT is_active 
        FROM user_profiles 
        WHERE id = auth.uid()
    ) = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限チェック関数
CREATE OR REPLACE FUNCTION auth.has_permission(resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- ユーザーがアクティブでない場合は拒否
    IF NOT auth.is_user_active() THEN
        RETURN FALSE;
    END IF;
    
    user_role := auth.get_user_role();
    
    -- オーナーは全権限
    IF user_role = 'owner' THEN
        RETURN TRUE;
    END IF;
    
    -- マネージャー権限
    IF user_role = 'manager' THEN
        -- マネージャーはほぼ全権限（ユーザー管理以外）
        IF resource = 'user_profiles' AND action IN ('DELETE', 'UPDATE_ROLE') THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;
    
    -- 従業員権限
    IF user_role = 'employee' THEN
        -- 読み取り権限
        IF action = 'SELECT' THEN
            RETURN resource IN ('customers', 'estimates', 'estimate_items', 'invoices', 'invoice_items', 'projects', 'price_master');
        END IF;
        
        -- 作成・更新権限
        IF action IN ('INSERT', 'UPDATE') THEN
            RETURN resource IN ('customers', 'estimates', 'estimate_items', 'projects');
        END IF;
        
        RETURN FALSE;
    END IF;
    
    -- ビューアー権限（読み取りのみ）
    IF user_role = 'viewer' THEN
        IF action = 'SELECT' THEN
            RETURN resource IN ('customers', 'estimates', 'estimate_items', 'invoices', 'invoice_items', 'projects');
        END IF;
        RETURN FALSE;
    END IF;
    
    -- デフォルトは拒否
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自分のレコードかチェック（作成者チェック）
CREATE OR REPLACE FUNCTION auth.is_owner_or_creator(creator_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.get_user_role() IN ('owner', 'manager') OR creator_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- Row Level Security (RLS) 有効化
-- =====================================================================

-- 全テーブルでRLSを有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 1. 会社テーブル（companies）のRLSポリシー
-- =====================================================================

-- 自分の会社情報のみアクセス可能
CREATE POLICY "companies_access_policy" ON companies
    FOR ALL USING (
        id = auth.get_user_company_id()
    );

-- オーナー・マネージャーのみ会社情報更新可能
CREATE POLICY "companies_update_policy" ON companies
    FOR UPDATE USING (
        id = auth.get_user_company_id() 
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- =====================================================================
-- 2. ユーザープロフィール（user_profiles）のRLSポリシー
-- =====================================================================

-- 自分の会社のユーザーのみ表示
CREATE POLICY "user_profiles_select_policy" ON user_profiles
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
    );

-- 自分のプロフィールは更新可能
CREATE POLICY "user_profiles_update_self_policy" ON user_profiles
    FOR UPDATE USING (
        id = auth.uid()
    );

-- オーナー・マネージャーは同じ会社のユーザーを管理可能
CREATE POLICY "user_profiles_admin_policy" ON user_profiles
    FOR ALL USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- 新規ユーザー作成（オーナー・マネージャーのみ）
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
    FOR INSERT WITH CHECK (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- =====================================================================
-- 3. 顧客テーブル（customers）のRLSポリシー
-- =====================================================================

-- 会社データ分離ポリシー
CREATE POLICY "customers_company_isolation" ON customers
    FOR ALL USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('customers', 'SELECT')
    );

-- 顧客作成・更新権限
CREATE POLICY "customers_modify_policy" ON customers
    FOR INSERT WITH CHECK (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('customers', 'INSERT')
    );

CREATE POLICY "customers_update_policy" ON customers
    FOR UPDATE USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('customers', 'UPDATE')
    );

-- 顧客削除権限（オーナー・マネージャーのみ）
CREATE POLICY "customers_delete_policy" ON customers
    FOR DELETE USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- =====================================================================
-- 4. 価格マスタ（price_master）のRLSポリシー
-- =====================================================================

-- 会社データ分離
CREATE POLICY "price_master_company_isolation" ON price_master
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('price_master', 'SELECT')
    );

-- 価格マスタ管理（オーナー・マネージャーのみ）
CREATE POLICY "price_master_admin_policy" ON price_master
    FOR ALL USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- =====================================================================
-- 5. 見積書（estimates）のRLSポリシー
-- =====================================================================

-- 会社データ分離
CREATE POLICY "estimates_company_isolation" ON estimates
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('estimates', 'SELECT')
    );

-- 見積書作成
CREATE POLICY "estimates_insert_policy" ON estimates
    FOR INSERT WITH CHECK (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('estimates', 'INSERT')
        AND created_by = auth.uid()
    );

-- 見積書更新（作成者または管理者）
CREATE POLICY "estimates_update_policy" ON estimates
    FOR UPDATE USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('estimates', 'UPDATE')
        AND (
            auth.is_owner_or_creator(created_by)
            OR status = 'draft' -- ドラフト状態なら編集可能
        )
    );

-- 見積書削除（オーナー・マネージャーのみ、ドラフト状態のみ）
CREATE POLICY "estimates_delete_policy" ON estimates
    FOR DELETE USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
        AND status = 'draft'
    );

-- =====================================================================
-- 6. 見積明細（estimate_items）のRLSポリシー
-- =====================================================================

-- 見積書のRLSポリシーに従う
CREATE POLICY "estimate_items_access_policy" ON estimate_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.company_id = auth.get_user_company_id()
            AND auth.has_permission('estimate_items', 'SELECT')
        )
    );

-- 見積明細の作成・更新（見積書と同じ権限）
CREATE POLICY "estimate_items_modify_policy" ON estimate_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.company_id = auth.get_user_company_id()
            AND auth.has_permission('estimate_items', 'INSERT')
            AND (
                auth.is_owner_or_creator(estimates.created_by)
                OR estimates.status = 'draft'
            )
        )
    );

-- =====================================================================
-- 7. 請求書（invoices）のRLSポリシー
-- =====================================================================

-- 会社データ分離
CREATE POLICY "invoices_company_isolation" ON invoices
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('invoices', 'SELECT')
    );

-- 請求書作成（オーナー・マネージャーのみ）
CREATE POLICY "invoices_insert_policy" ON invoices
    FOR INSERT WITH CHECK (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
        AND created_by = auth.uid()
    );

-- 請求書更新（作成者または管理者、ドラフト・送信済みのみ）
CREATE POLICY "invoices_update_policy" ON invoices
    FOR UPDATE USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
        AND (
            auth.is_owner_or_creator(created_by)
            OR status IN ('draft', 'sent')
        )
    );

-- 請求書削除（オーナーのみ、ドラフト状態のみ）
CREATE POLICY "invoices_delete_policy" ON invoices
    FOR DELETE USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() = 'owner'
        AND status = 'draft'
    );

-- =====================================================================
-- 8. 請求明細（invoice_items）のRLSポリシー
-- =====================================================================

-- 請求書のRLSポリシーに従う
CREATE POLICY "invoice_items_access_policy" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.company_id = auth.get_user_company_id()
            AND auth.has_permission('invoice_items', 'SELECT')
        )
    );

-- =====================================================================
-- 9. プロジェクト（projects）のRLSポリシー
-- =====================================================================

-- 会社データ分離
CREATE POLICY "projects_company_isolation" ON projects
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('projects', 'SELECT')
    );

-- プロジェクト作成
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('projects', 'INSERT')
        AND created_by = auth.uid()
    );

-- プロジェクト更新（作成者、担当者、または管理者）
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE USING (
        company_id = auth.get_user_company_id()
        AND auth.has_permission('projects', 'UPDATE')
        AND (
            auth.is_owner_or_creator(created_by)
            OR project_manager_id = auth.uid()
            OR auth.get_user_role() IN ('owner', 'manager')
        )
    );

-- プロジェクト削除（オーナー・マネージャーのみ）
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- =====================================================================
-- 10. 監査ログ（audit_logs）のRLSポリシー
-- =====================================================================

-- 監査ログ閲覧（オーナー・マネージャーのみ）
CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT USING (
        company_id = auth.get_user_company_id()
        AND auth.get_user_role() IN ('owner', 'manager')
    );

-- 監査ログは挿入のみ許可（システムから）
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- 監査ログの更新・削除は不可（データ整合性保護）

-- =====================================================================
-- 11. セキュリティイベント（security_events）のRLSポリシー
-- =====================================================================

-- セキュリティイベント閲覧（オーナーのみ）
CREATE POLICY "security_events_select_policy" ON security_events
    FOR SELECT USING (
        (company_id = auth.get_user_company_id() OR company_id IS NULL)
        AND auth.get_user_role() = 'owner'
    );

-- セキュリティイベントは挿入のみ許可
CREATE POLICY "security_events_insert_policy" ON security_events
    FOR INSERT WITH CHECK (TRUE);

-- セキュリティイベント解決（オーナーのみ）
CREATE POLICY "security_events_update_policy" ON security_events
    FOR UPDATE USING (
        (company_id = auth.get_user_company_id() OR company_id IS NULL)
        AND auth.get_user_role() = 'owner'
        AND resolved = FALSE
    );

-- =====================================================================
-- セキュリティビュー作成
-- =====================================================================

-- ユーザー権限サマリービュー
CREATE OR REPLACE VIEW user_permissions_summary AS
SELECT 
    up.id,
    up.username,
    up.full_name,
    up.role,
    up.company_id,
    c.company_name,
    up.is_active,
    up.last_login,
    up.failed_login_attempts,
    CASE 
        WHEN up.locked_until > NOW() THEN TRUE 
        ELSE FALSE 
    END AS is_locked
FROM user_profiles up
JOIN companies c ON up.company_id = c.id
WHERE up.company_id = auth.get_user_company_id()
AND auth.get_user_role() IN ('owner', 'manager');

-- セキュリティダッシュボードビュー
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM security_events WHERE severity = 'CRITICAL' AND resolved = FALSE AND company_id = auth.get_user_company_id()) AS critical_events,
    (SELECT COUNT(*) FROM security_events WHERE severity = 'HIGH' AND resolved = FALSE AND company_id = auth.get_user_company_id()) AS high_events,
    (SELECT COUNT(*) FROM user_profiles WHERE failed_login_attempts >= 3 AND company_id = auth.get_user_company_id()) AS users_with_failed_logins,
    (SELECT COUNT(*) FROM user_profiles WHERE locked_until > NOW() AND company_id = auth.get_user_company_id()) AS locked_users,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours' AND company_id = auth.get_user_company_id()) AS audit_events_24h
WHERE auth.get_user_role() IN ('owner', 'manager');