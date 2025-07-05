-- =================================================================
-- 庭想システム - 管理者プロファイル作成（実行準備完了）
-- =================================================================
-- このスクリプトをSupabase SQL Editorで実行してください
-- ユーザーID: b591c784-71d9-4119-8123-c7fb47c6ed43

-- 1. まず既存のテーブルを確認
SELECT 'Companies Table:' as info;
SELECT * FROM companies WHERE id = '550e8400-e29b-41d4-a716-446655440000';

SELECT 'Users in Auth:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@teisou.com';

-- 2. 会社データが存在しない場合は作成
INSERT INTO companies (
    id, 
    name, 
    address, 
    phone, 
    email,
    postal_code,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '庭想システム管理会社',
    '東京都渋谷区',
    '03-0000-0000',
    'admin@teisou.com',
    '150-0001',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = '庭想システム管理会社',
    updated_at = NOW();

-- 3. 管理者プロファイルを作成
INSERT INTO user_profiles (
    id,
    company_id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'b591c784-71d9-4119-8123-c7fb47c6ed43',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@teisou.com',
    'システム管理者',
    'owner',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'owner',
    is_active = true,
    updated_at = NOW();

-- 4. 作成結果を確認
SELECT 'Created User Profile:' as info;
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.is_active,
    c.name as company_name
FROM user_profiles up
JOIN companies c ON up.company_id = c.id
WHERE up.email = 'admin@teisou.com';

-- 5. デモ用の初期データを作成（オプション）
-- 顧客サンプル
INSERT INTO customers (
    id, 
    company_id, 
    name, 
    company_name, 
    address, 
    phone, 
    email, 
    created_at,
    updated_at
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440000',
    '山田太郎',
    '山田邸',
    '東京都世田谷区1-1-1',
    '090-1111-1111',
    'yamada@example.com',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440000',
    '鈴木花子',
    '鈴木邸',
    '東京都杉並区2-2-2',
    '090-2222-2222',
    'suzuki@example.com',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 単価マスタサンプル
INSERT INTO price_master (
    id,
    company_id,
    category,
    sub_category,
    item_name,
    unit,
    purchase_price,
    default_markup_rate,
    created_at,
    updated_at
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440000',
    '植栽工事',
    '高木',
    'ソメイヨシノ H3.0m',
    '本',
    15000,
    1.5,
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440000',
    '植栽工事',
    '低木',
    'ツツジ H0.5m',
    '本',
    800,
    1.8,
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440000',
    '外構工事',
    '舗装',
    'インターロッキング',
    'm2',
    3500,
    1.4,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- 実行完了後の確認
-- =================================================================
SELECT 'Setup Complete!' as status;
SELECT 'Login URL: https://garden-dx-system.vercel.app' as url;
SELECT 'Admin Email: admin@teisou.com' as email;
SELECT 'Admin Password: Teisou2025!' as password;