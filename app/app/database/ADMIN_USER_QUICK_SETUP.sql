-- =================================================================
-- 庭想システム - 管理者ユーザークイックセットアップ
-- =================================================================
-- このスクリプトをSupabase SQL Editorで実行して、初期管理者ユーザーを作成します

-- 1. テスト用会社データの作成
INSERT INTO companies (id, name, address, phone, email) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '庭想システム管理会社', '東京都渋谷区', '03-0000-0000', 'admin@teisou.com')
ON CONFLICT (id) DO NOTHING;

-- 2. 管理者ユーザーの作成
-- 注意: まずSupabase DashboardのAuthenticationセクションで以下のユーザーを作成してください：
-- Email: admin@teisou.com
-- Password: Teisou2025!

-- 3. 管理者プロファイルの作成（ユーザー作成後に実行）
-- Supabase Dashboardで作成したユーザーのIDを以下のSQLで確認：
-- SELECT id, email FROM auth.users WHERE email = 'admin@teisou.com';

-- 4. 確認したIDを使って管理者プロファイルを作成
-- 注意: YOUR_USER_ID_HERE を実際のユーザーIDに置き換えてください
/*
INSERT INTO user_profiles (
    id, 
    company_id, 
    email, 
    full_name, 
    role,
    is_active
) VALUES (
    'YOUR_USER_ID_HERE', -- ← ここを実際のユーザーIDに置き換える
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@teisou.com',
    'システム管理者',
    'owner',
    true
)
ON CONFLICT (id) DO UPDATE SET
    role = 'owner',
    is_active = true;
*/

-- 5. デモデータの追加（オプション）
-- 顧客サンプル
INSERT INTO customers (id, company_id, name, company_name, address, phone, email, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '山田太郎', '山田邸', '東京都世田谷区1-1-1', '090-1111-1111', 'yamada@example.com', null),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '鈴木花子', '鈴木邸', '東京都杉並区2-2-2', '090-2222-2222', 'suzuki@example.com', null)
ON CONFLICT (id) DO NOTHING;

-- 単価マスタサンプル
INSERT INTO price_master (id, company_id, category, sub_category, item_name, unit, purchase_price, default_markup_rate) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '植栽工事', '高木', 'ソメイヨシノ H3.0m', '本', 15000, 1.5),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '植栽工事', '低木', 'ツツジ H0.5m', '本', 800, 1.8),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '外構工事', '舗装', 'インターロッキング', 'm2', 3500, 1.4)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- セットアップ手順:
-- =================================================================
-- 1. Supabase Dashboardにログイン
-- 2. Authentication → Users → Create new user
--    - Email: admin@teisou.com
--    - Password: Teisou2025!
-- 3. 作成したユーザーのIDをコピー
-- 4. 上記のSQL内の 'YOUR_USER_ID_HERE' を実際のIDに置き換え
-- 5. SQL Editor でこのスクリプト全体を実行

-- ログイン情報:
-- Email: admin@teisou.com
-- Password: Teisou2025!
-- =================================================================