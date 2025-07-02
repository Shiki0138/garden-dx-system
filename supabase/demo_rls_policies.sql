-- =====================================================================
-- Garden DX - デモモード用セキュリティポリシー
-- DEMO_MODE=true時のRLSポリシー設定・テストユーザー権限設定
-- =====================================================================

-- =====================================================================
-- デモモード検出関数
-- =====================================================================

-- デモモード確認関数
CREATE OR REPLACE FUNCTION auth.is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    -- 環境変数またはコンテキストからデモモードを確認
    -- 実際の実装では適切な方法で設定値を取得
    RETURN COALESCE(current_setting('app.demo_mode', true)::boolean, false);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモユーザー確認関数
CREATE OR REPLACE FUNCTION auth.is_demo_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- デモユーザーIDかチェック
    RETURN auth.uid()::text = 'demo-user-00000000-0000-0000-0000-000000000001'
           OR auth.is_demo_mode();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- デモ会社ID取得関数
CREATE OR REPLACE FUNCTION auth.get_demo_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN 'demo-company-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- デモモード用RLSポリシー
-- =====================================================================

-- 既存のRLSポリシーを一時的に無効化してデモ用ポリシーを追加

-- 会社テーブル - デモモード用ポリシー
CREATE POLICY "demo_companies_access_policy" ON companies
    FOR ALL USING (
        auth.is_demo_user() 
        AND id = auth.get_demo_company_id()
    );

-- ユーザープロフィール - デモモード用ポリシー
CREATE POLICY "demo_user_profiles_policy" ON user_profiles
    FOR ALL USING (
        auth.is_demo_user()
        AND (
            company_id = auth.get_demo_company_id()
            OR id = auth.uid()
        )
    );

-- 顧客テーブル - デモモード用ポリシー
CREATE POLICY "demo_customers_policy" ON customers
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- 見積書テーブル - デモモード用ポリシー
CREATE POLICY "demo_estimates_policy" ON estimates
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- 見積明細テーブル - デモモード用ポリシー
CREATE POLICY "demo_estimate_items_policy" ON estimate_items
    FOR ALL USING (
        auth.is_demo_user()
        AND EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = estimate_items.estimate_id
            AND estimates.company_id = auth.get_demo_company_id()
        )
    );

-- 請求書テーブル - デモモード用ポリシー
CREATE POLICY "demo_invoices_policy" ON invoices
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- 請求明細テーブル - デモモード用ポリシー
CREATE POLICY "demo_invoice_items_policy" ON invoice_items
    FOR ALL USING (
        auth.is_demo_user()
        AND EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.company_id = auth.get_demo_company_id()
        )
    );

-- プロジェクトテーブル - デモモード用ポリシー
CREATE POLICY "demo_projects_policy" ON projects
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- 価格マスタテーブル - デモモード用ポリシー
CREATE POLICY "demo_price_master_policy" ON price_master
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- ファイルテーブル - デモモード用ポリシー
CREATE POLICY "demo_files_policy" ON files
    FOR ALL USING (
        auth.is_demo_user()
        AND company_id = auth.get_demo_company_id()
    );

-- =====================================================================
-- デモデータ挿入（初期データ）
-- =====================================================================

-- デモ会社データ
INSERT INTO companies (
    id,
    company_name,
    postal_code,
    address,
    phone,
    email,
    website,
    business_license,
    representative_name,
    capital,
    established_date,
    business_hours,
    closed_days,
    business_description,
    specialties,
    service_areas,
    subscription_plan,
    is_active,
    created_at,
    updated_at
) VALUES (
    'demo-company-0000-0000-0000-000000000001'::uuid,
    'デモ造園株式会社',
    '100-0001',
    '東京都千代田区千代田1-1-1',
    '03-1234-5678',
    'info@demo-garden.co.jp',
    'https://demo-garden.co.jp',
    '東京都知事許可（般-1）第12345号',
    'デモ太郎',
    10000000,
    '2020-04-01',
    '8:00-17:00',
    '日曜日、祝日',
    'デモ用造園会社です。庭園設計・造園工事・緑地管理を専門としています。',
    ARRAY['庭園設計', '造園工事', '樹木剪定', '芝生管理', '外構工事', 'エクステリア'],
    ARRAY['東京都', '神奈川県', '埼玉県', 'その他関東圏'],
    'premium',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    updated_at = CURRENT_TIMESTAMP;

-- デモユーザープロフィール
INSERT INTO user_profiles (
    id,
    company_id,
    username,
    email,
    role,
    full_name,
    phone,
    department,
    employee_id,
    hire_date,
    permissions,
    is_active,
    created_at,
    updated_at
) VALUES (
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    'demo_admin',
    'demo@garden-dx.com',
    'owner',
    'デモユーザー（管理者）',
    '03-1234-5678',
    '管理部',
    'DEMO001',
    '2020-04-01',
    '{
        "estimates": "owner",
        "customers": "owner", 
        "invoices": "owner",
        "projects": "owner",
        "price_master": "owner",
        "users": "owner",
        "reports": "owner",
        "company_settings": "owner"
    }'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = CURRENT_TIMESTAMP;

-- デモ顧客データ
INSERT INTO customers (
    id,
    company_id,
    customer_code,
    customer_name,
    customer_type,
    postal_code,
    address,
    phone,
    email,
    contact_person,
    notes,
    credit_limit,
    payment_terms,
    created_by,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    'demo-customer-000000000000-0000-0000-000000000001'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    'CUST-001',
    '田中庭園様',
    'individual',
    '150-0001',
    '東京都渋谷区神宮前1-1-1',
    '03-1111-2222',
    'tanaka@example.com',
    '田中太郎',
    'VIPのお客様です。継続的にご依頼をいただいています。',
    1000000,
    30,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'demo-customer-000000000000-0000-0000-000000000002'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    'CUST-002',
    '山田ガーデン様',
    'corporate',
    '160-0001',
    '東京都新宿区高田馬場1-1-1',
    '03-3333-4444',
    'yamada@example.com',
    '山田花子',
    '法人のお客様。大規模案件が多いです。',
    2000000,
    45,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'demo-customer-000000000000-0000-0000-000000000003'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    'CUST-003',
    '佐藤邸',
    'individual',
    '170-0001',
    '東京都豊島区南池袋1-1-1',
    '03-5555-6666',
    'sato@example.com',
    '佐藤次郎',
    '新築住宅の庭園工事。定期メンテナンス契約あり。',
    500000,
    30,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    updated_at = CURRENT_TIMESTAMP;

-- デモ価格マスタデータ
INSERT INTO price_master (
    id,
    company_id,
    category,
    subcategory,
    item_name,
    item_code,
    unit,
    unit_price,
    material_cost,
    labor_cost,
    equipment_cost,
    profit_margin,
    effective_from,
    created_by,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    'demo-price-0000-0000-0000-000000000001'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    '植栽工事',
    '高木植栽',
    'ケヤキ（H=3.0m）',
    'TREE-001',
    '本',
    15000.00,
    8000.00,
    5000.00,
    2000.00,
    0.20,
    CURRENT_DATE,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'demo-price-0000-0000-0000-000000000002'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    '造園工事',
    '芝生工事',
    '高麗芝張り',
    'LAWN-001',
    '㎡',
    1800.00,
    800.00,
    800.00,
    200.00,
    0.25,
    CURRENT_DATE,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'demo-price-0000-0000-0000-000000000003'::uuid,
    'demo-company-0000-0000-0000-000000000001'::uuid,
    '外構工事',
    '舗装工事',
    'インターロッキング舗装',
    'PAVE-001',
    '㎡',
    5500.00,
    2500.00,
    2500.00,
    500.00,
    0.18,
    CURRENT_DATE,
    'demo-user-00000000-0000-0000-0000-000000000001'::uuid,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================================
-- デモモード用セキュリティ設定
-- =====================================================================

-- デモモード用セキュリティイベント記録
CREATE OR REPLACE FUNCTION log_demo_access(
    event_type TEXT,
    description TEXT
)
RETURNS VOID AS $$
BEGIN
    IF auth.is_demo_user() THEN
        INSERT INTO security_events (
            event_type,
            severity,
            user_id,
            company_id,
            description,
            metadata,
            created_at
        ) VALUES (
            event_type,
            'LOW',
            auth.uid(),
            auth.get_demo_company_id(),
            description,
            '{"demo_mode": true}'::jsonb,
            CURRENT_TIMESTAMP
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- デモモードではエラーを無視
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- デモモード安全性チェック
-- =====================================================================

-- デモデータ削除防止トリガー
CREATE OR REPLACE FUNCTION prevent_demo_data_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- デモ会社データの削除を防ぐ
    IF OLD.id = 'demo-company-0000-0000-0000-000000000001'::uuid THEN
        RAISE EXCEPTION 'デモデータは削除できません';
    END IF;
    
    -- デモユーザーデータの削除を防ぐ
    IF TG_TABLE_NAME = 'user_profiles' AND 
       OLD.id = 'demo-user-00000000-0000-0000-0000-000000000001'::uuid THEN
        RAISE EXCEPTION 'デモユーザーは削除できません';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- デモデータ削除防止トリガー設定
CREATE TRIGGER prevent_demo_company_deletion
    BEFORE DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION prevent_demo_data_deletion();

CREATE TRIGGER prevent_demo_user_deletion
    BEFORE DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION prevent_demo_data_deletion();

-- =====================================================================
-- デモモード用ビュー
-- =====================================================================

-- デモ統計ビュー
CREATE OR REPLACE VIEW demo_statistics AS
SELECT 
    'customers' as entity_type,
    COUNT(*) as count
FROM customers 
WHERE company_id = auth.get_demo_company_id()
AND auth.is_demo_user()

UNION ALL

SELECT 
    'estimates' as entity_type,
    COUNT(*) as count
FROM estimates 
WHERE company_id = auth.get_demo_company_id()
AND auth.is_demo_user()

UNION ALL

SELECT 
    'invoices' as entity_type,
    COUNT(*) as count
FROM invoices 
WHERE company_id = auth.get_demo_company_id()
AND auth.is_demo_user()

UNION ALL

SELECT 
    'projects' as entity_type,
    COUNT(*) as count
FROM projects 
WHERE company_id = auth.get_demo_company_id()
AND auth.is_demo_user();

-- =====================================================================
-- デモモード初期化関数
-- =====================================================================

-- デモモード初期化
CREATE OR REPLACE FUNCTION initialize_demo_mode()
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- デモモード確認
    IF NOT auth.is_demo_mode() THEN
        RETURN 'デモモードが無効です';
    END IF;
    
    -- デモアクセスログ記録
    PERFORM log_demo_access(
        'DEMO_INITIALIZED',
        'デモモードが初期化されました'
    );
    
    result := 'デモモード初期化完了: ';
    result := result || (SELECT COUNT(*) FROM customers WHERE company_id = auth.get_demo_company_id()) || '件の顧客データ、';
    result := result || (SELECT COUNT(*) FROM price_master WHERE company_id = auth.get_demo_company_id()) || '件の価格マスタが利用可能です。';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- コメント追加
-- =====================================================================

COMMENT ON FUNCTION auth.is_demo_mode() IS 'デモモードが有効かどうかを確認';
COMMENT ON FUNCTION auth.is_demo_user() IS '現在のユーザーがデモユーザーかどうかを確認';
COMMENT ON FUNCTION auth.get_demo_company_id() IS 'デモ会社のIDを取得';
COMMENT ON FUNCTION log_demo_access(TEXT, TEXT) IS 'デモモードでのアクセスをログに記録';
COMMENT ON FUNCTION prevent_demo_data_deletion() IS 'デモデータの削除を防ぐトリガー関数';
COMMENT ON FUNCTION initialize_demo_mode() IS 'デモモードを初期化し、統計情報を返す';
COMMENT ON VIEW demo_statistics IS 'デモモード用の統計情報ビュー';