-- ============================================================
-- Garden DX 初期データ投入スクリプト
-- ============================================================

-- デモ会社データ
INSERT INTO companies (company_name, postal_code, address, phone, email) VALUES
('ガーデンDXデモ株式会社', '123-4567', '東京都千代田区1-1-1', '03-1234-5678', 'demo@garden-dx.jp');

-- デモユーザーデータ（パスワード: demo123）
INSERT INTO users (company_id, username, email, password_hash, role, full_name) VALUES
(1, 'owner', 'owner@garden-dx.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY8LrEfNvlNvlNe', 'owner', '経営太郎'),
(1, 'employee', 'employee@garden-dx.jp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY8LrEfNvlNvlNe', 'employee', '従業員花子');

-- デモ顧客データ
INSERT INTO customers (company_id, customer_name, customer_type, postal_code, address, phone, email, contact_person) VALUES
(1, '田中邸', 'individual', '234-5678', '東京都世田谷区2-2-2', '090-1234-5678', 'tanaka@example.com', '田中太郎'),
(1, '山田商事株式会社', 'corporate', '345-6789', '東京都港区3-3-3', '03-2345-6789', 'info@yamada.co.jp', '山田花子'),
(1, '佐藤邸', 'individual', '456-7890', '東京都目黒区4-4-4', '080-2345-6789', 'sato@example.com', '佐藤次郎');

-- 単価マスタデータ（造園業標準項目）
INSERT INTO price_master (company_id, category, item_name, unit, default_unit_price, description) VALUES
(1, '植栽工事', '高木植栽（3m以上）', '本', 25000, 'クスノキ、ケヤキ等の高木植栽'),
(1, '植栽工事', '中木植栽（1-3m）', '本', 8000, 'サザンカ、ツツジ等の中木植栽'),
(1, '植栽工事', '低木植栽（1m以下）', '本', 3000, '低木類の植栽'),
(1, '植栽工事', '芝張り', '㎡', 2500, '高麗芝、野芝等'),
(1, '植栽工事', '地被類', '㎡', 1500, 'タマリュウ、リュウノヒゲ等'),
(1, '土工事', '土壌改良', '㎥', 15000, '腐葉土、バーク堆肥混入'),
(1, '土工事', '整地', '㎡', 800, '敷地の整地作業'),
(1, '土工事', '残土処分', '㎥', 8000, '残土の搬出処分'),
(1, '外構工事', 'コンクリート打設', '㎡', 12000, '土間コンクリート'),
(1, '外構工事', 'ブロック積み', '㎡', 15000, 'CBブロック積み'),
(1, '外構工事', 'フェンス設置', 'm', 18000, 'アルミフェンス設置'),
(1, '外構工事', '門扉設置', '基', 150000, 'アルミ門扉設置'),
(1, '管理作業', '剪定作業（高木）', '本', 8000, '高木の剪定作業'),
(1, '管理作業', '剪定作業（中低木）', '本', 3000, '中低木の剪定作業'),
(1, '管理作業', '除草作業', '㎡', 500, '手作業による除草'),
(1, '管理作業', '薬剤散布', '㎡', 300, '病害虫防除薬剤散布'),
(1, '管理作業', '施肥', '㎡', 400, '化成肥料、有機肥料施肥'),
(1, '諸経費', '諸経費', '式', 0, '現場管理費等'),
(1, '諸経費', '運搬費', '式', 30000, '資材運搬費'),
(1, '諸経費', '廃材処分費', '式', 20000, '廃材処分費用');

-- デモ見積データ
INSERT INTO estimates (company_id, customer_id, estimate_number, estimate_date, valid_until, title, status, tax_rate, notes, created_by, updated_by) VALUES
(1, 1, 'EST-2025-0001', '2025-07-01', '2025-07-31', '田中邸 お庭リフォーム工事', 'draft', 0.10, '見積有効期限は発行日より30日間とさせていただきます。', 1, 1),
(1, 2, 'EST-2025-0002', '2025-07-01', '2025-07-31', '山田商事様 外構植栽工事', 'sent', 0.10, '施工時期により植物の入荷状況が変わる場合があります。', 1, 1);

-- デモ見積明細データ
INSERT INTO estimate_items (estimate_id, category, item_name, description, quantity, unit, unit_price, amount, cost_rate, sort_order) VALUES
-- 田中邸の見積明細
(1, '植栽工事', '高木植栽（シマトネリコ）', 'H3.0m 支柱込み', 2, '本', 25000, 50000, 0.6, 1),
(1, '植栽工事', '中木植栽（オリーブ）', 'H2.0m', 3, '本', 12000, 36000, 0.6, 2),
(1, '植栽工事', '低木植栽（ローズマリー）', 'H0.5m', 10, '本', 3000, 30000, 0.6, 3),
(1, '植栽工事', '芝張り', '高麗芝 目地張り', 30, '㎡', 2500, 75000, 0.7, 4),
(1, '土工事', '土壌改良', 'バーク堆肥混入', 5, '㎥', 15000, 75000, 0.7, 5),
(1, '諸経費', '諸経費', '現場管理費、運搬費等', 1, '式', 40000, 40000, 0.3, 6),
-- 山田商事の見積明細
(2, '植栽工事', '高木植栽（クスノキ）', 'H4.0m 支柱込み', 5, '本', 35000, 175000, 0.6, 1),
(2, '植栽工事', '中木植栽（サザンカ）', 'H1.5m', 20, '本', 8000, 160000, 0.6, 2),
(2, '植栽工事', '地被類（タマリュウ）', 'ポット苗', 100, '㎡', 1500, 150000, 0.7, 3),
(2, '外構工事', 'コンクリート打設', '土間コンクリート t=10cm', 50, '㎡', 12000, 600000, 0.7, 4),
(2, '諸経費', '諸経費', '現場管理費、安全対策費等', 1, '式', 100000, 100000, 0.3, 5);

-- 統計情報更新
SELECT setval('companies_company_id_seq', (SELECT MAX(company_id) FROM companies));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('customers_customer_id_seq', (SELECT MAX(customer_id) FROM customers));
SELECT setval('price_master_price_id_seq', (SELECT MAX(price_id) FROM price_master));
SELECT setval('estimates_estimate_id_seq', (SELECT MAX(estimate_id) FROM estimates));
SELECT setval('estimate_items_item_id_seq', (SELECT MAX(item_id) FROM estimate_items));