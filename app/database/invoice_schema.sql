-- 請求書関連のデータベーススキーマ
-- Garden: 造園業向け統合業務管理システム

-- ====================
-- 請求書テーブル (Invoices)
-- ====================
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER REFERENCES projects(project_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    estimate_id INTEGER REFERENCES estimates(estimate_id),
    
    -- 請求書基本情報
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- 金額情報
    subtotal DECIMAL(12,0) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,3) NOT NULL DEFAULT 0.10,
    tax_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    
    -- ステータス管理
    status VARCHAR(50) NOT NULL DEFAULT '未送付' 
        CHECK (status IN ('未送付', '送付済', '確認済', 'キャンセル')),
    payment_status VARCHAR(50) NOT NULL DEFAULT '未払い'
        CHECK (payment_status IN ('未払い', '支払済', '一部支払', '滞納')),
    
    -- 支払情報
    paid_amount DECIMAL(12,0) DEFAULT 0,
    paid_date DATE,
    payment_method VARCHAR(50),
    
    -- その他
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    updated_by INTEGER REFERENCES users(user_id),
    
    -- インデックス用
    CONSTRAINT uk_invoice_number UNIQUE (company_id, invoice_number)
);

-- ====================
-- 請求書明細テーブル (Invoice_Items)
-- ====================
CREATE TABLE invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    
    -- 品目情報
    category VARCHAR(100),
    sub_category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    
    -- 数量・単価
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20),
    unit_price DECIMAL(10,0) NOT NULL DEFAULT 0,
    amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    
    -- 表示順序・階層
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    is_header BOOLEAN DEFAULT FALSE,
    
    -- 備考
    notes TEXT,
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- 請求書履歴テーブル (Invoice_History)
-- ====================
CREATE TABLE invoice_history (
    history_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id),
    
    -- 変更情報
    action VARCHAR(50) NOT NULL CHECK (action IN ('作成', '更新', '送付', '支払確認', 'キャンセル')),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_payment_status VARCHAR(50),
    new_payment_status VARCHAR(50),
    
    -- 変更詳細
    change_summary TEXT,
    change_details JSON,
    
    -- システム管理
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by INTEGER REFERENCES users(user_id),
    
    -- 備考
    notes TEXT
);

-- ====================
-- 請求書添付ファイルテーブル (Invoice_Attachments)
-- ====================
CREATE TABLE invoice_attachments (
    attachment_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    
    -- ファイル情報
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    
    -- 分類
    attachment_type VARCHAR(50) NOT NULL DEFAULT 'その他'
        CHECK (attachment_type IN ('PDF請求書', '見積書', '契約書', '写真', '図面', 'その他')),
    
    -- 説明
    description TEXT,
    
    -- システム管理
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(user_id)
);

-- ====================
-- 入金管理テーブル (Invoice_Payments)
-- ====================
CREATE TABLE invoice_payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id),
    
    -- 入金情報
    payment_amount DECIMAL(12,0) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT '銀行振込'
        CHECK (payment_method IN ('銀行振込', '現金', '小切手', 'クレジットカード', 'その他')),
    
    -- 振込情報
    bank_name VARCHAR(100),
    account_info VARCHAR(100),
    transaction_id VARCHAR(100),
    
    -- 備考
    notes TEXT,
    
    -- システム管理
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER REFERENCES users(user_id)
);

-- ====================
-- インデックス作成
-- ====================

-- 請求書テーブル
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_estimate_id ON invoices(estimate_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- 請求書明細テーブル
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort_order ON invoice_items(invoice_id, sort_order);

-- 請求書履歴テーブル
CREATE INDEX idx_invoice_history_invoice_id ON invoice_history(invoice_id);
CREATE INDEX idx_invoice_history_changed_at ON invoice_history(changed_at);

-- 請求書添付ファイルテーブル
CREATE INDEX idx_invoice_attachments_invoice_id ON invoice_attachments(invoice_id);

-- 入金管理テーブル
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date);

-- ====================
-- ビュー作成
-- ====================

-- 請求書一覧ビュー（顧客・プロジェクト情報含む）
CREATE VIEW invoice_list_view AS
SELECT 
    i.invoice_id,
    i.company_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.status,
    i.payment_status,
    i.paid_amount,
    i.paid_date,
    c.customer_name,
    c.contact_person,
    p.project_name,
    p.site_address,
    e.estimate_number,
    i.created_at,
    i.updated_at,
    -- 支払期限超過チェック
    CASE 
        WHEN i.payment_status = '未払い' AND i.due_date < CURRENT_DATE THEN '滞納'
        ELSE i.payment_status
    END AS actual_payment_status,
    -- 残高計算
    (i.total_amount - COALESCE(i.paid_amount, 0)) AS outstanding_amount
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.customer_id
LEFT JOIN projects p ON i.project_id = p.project_id
LEFT JOIN estimates e ON i.estimate_id = e.estimate_id;

-- 請求書詳細ビュー（明細含む）
CREATE VIEW invoice_detail_view AS
SELECT 
    i.invoice_id,
    i.company_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.subtotal,
    i.tax_rate,
    i.tax_amount,
    i.total_amount,
    i.status,
    i.payment_status,
    i.notes,
    c.customer_name,
    c.contact_person,
    c.address as customer_address,
    c.phone as customer_phone,
    c.email as customer_email,
    p.project_name,
    p.site_address,
    e.estimate_number,
    -- 明細数
    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.invoice_id) as item_count,
    -- 入金履歴
    (SELECT COUNT(*) FROM invoice_payments ip WHERE ip.invoice_id = i.invoice_id) as payment_count
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.customer_id
LEFT JOIN projects p ON i.project_id = p.project_id
LEFT JOIN estimates e ON i.estimate_id = e.estimate_id;

-- ====================
-- トリガー関数
-- ====================

-- 請求書更新時のタイムスタンプ更新
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 請求書明細更新時のタイムスタンプ更新
CREATE OR REPLACE FUNCTION update_invoice_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 請求書金額の自動計算
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    calc_subtotal DECIMAL(12,0);
    calc_tax_amount DECIMAL(12,0);
    calc_total DECIMAL(12,0);
BEGIN
    -- 明細の合計を計算
    SELECT COALESCE(SUM(amount), 0) INTO calc_subtotal
    FROM invoice_items 
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- 消費税計算
    SELECT tax_rate INTO calc_tax_amount
    FROM invoices 
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    calc_tax_amount := FLOOR(calc_subtotal * calc_tax_amount);
    calc_total := calc_subtotal + calc_tax_amount;
    
    -- 請求書テーブルを更新
    UPDATE invoices 
    SET 
        subtotal = calc_subtotal,
        tax_amount = calc_tax_amount,
        total_amount = calc_total,
        updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 履歴記録関数
CREATE OR REPLACE FUNCTION record_invoice_history()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータス変更の場合のみ履歴記録
    IF (TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR 
        OLD.payment_status IS DISTINCT FROM NEW.payment_status)) THEN
        
        INSERT INTO invoice_history (
            invoice_id,
            action,
            old_status,
            new_status,
            old_payment_status,
            new_payment_status,
            change_summary,
            changed_by
        ) VALUES (
            NEW.invoice_id,
            '更新',
            OLD.status,
            NEW.status,
            OLD.payment_status,
            NEW.payment_status,
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 
                    'ステータス変更: ' || OLD.status || ' → ' || NEW.status
                WHEN OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN 
                    '支払状況変更: ' || OLD.payment_status || ' → ' || NEW.payment_status
            END,
            NEW.updated_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- トリガー作成
-- ====================

-- 請求書テーブル
CREATE TRIGGER trigger_update_invoice_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_timestamp();

CREATE TRIGGER trigger_record_invoice_history
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION record_invoice_history();

-- 請求書明細テーブル
CREATE TRIGGER trigger_update_invoice_item_timestamp
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_item_timestamp();

CREATE TRIGGER trigger_calculate_invoice_totals_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- ====================
-- 初期データ・サンプルデータ挿入
-- ====================

-- サンプル請求書番号シーケンス用関数
CREATE OR REPLACE FUNCTION generate_invoice_number(company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    sequence_num INTEGER;
    invoice_number VARCHAR(50);
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- 同月の請求書数を取得
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM invoices 
    WHERE company_id = company_id 
    AND EXTRACT(YEAR FROM invoice_date) = current_year
    AND EXTRACT(MONTH FROM invoice_date) = current_month;
    
    invoice_number := 'INV-' || current_year || LPAD(current_month::TEXT, 2, '0') || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- セキュリティ・権限設定
-- ====================

-- RLS (Row Level Security) 有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- 会社IDによるデータ分離ポリシー
CREATE POLICY invoice_company_policy ON invoices
    USING (company_id = current_setting('app.current_company_id')::INTEGER);

CREATE POLICY invoice_items_company_policy ON invoice_items
    USING (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.invoice_id = invoice_items.invoice_id 
        AND invoices.company_id = current_setting('app.current_company_id')::INTEGER
    ));

-- ====================
-- パフォーマンス最適化
-- ====================

-- パーティションテーブル（大量データ対応）
-- 年別パーティション例（将来的に実装）
/*
CREATE TABLE invoices_2024 PARTITION OF invoices
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE invoices_2025 PARTITION OF invoices  
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
*/

-- ====================
-- バックアップ・メンテナンス
-- ====================

-- 定期的なバキューム用関数
CREATE OR REPLACE FUNCTION maintenance_invoice_tables()
RETURNS VOID AS $$
BEGIN
    -- 統計情報更新
    ANALYZE invoices;
    ANALYZE invoice_items;
    ANALYZE invoice_history;
    
    -- 古い履歴データのクリーンアップ（3年以上前）
    DELETE FROM invoice_history 
    WHERE changed_at < CURRENT_DATE - INTERVAL '3 years';
    
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON TABLE invoices IS '請求書マスタテーブル';
COMMENT ON TABLE invoice_items IS '請求書明細テーブル';
COMMENT ON TABLE invoice_history IS '請求書履歴テーブル';
COMMENT ON TABLE invoice_attachments IS '請求書添付ファイルテーブル';
COMMENT ON TABLE invoice_payments IS '入金管理テーブル';

COMMENT ON COLUMN invoices.invoice_number IS '請求書番号（会社内ユニーク）';
COMMENT ON COLUMN invoices.status IS '請求書ステータス（未送付/送付済/確認済/キャンセル）';
COMMENT ON COLUMN invoices.payment_status IS '支払状況（未払い/支払済/一部支払/滞納）';
COMMENT ON COLUMN invoice_items.level IS '明細の階層レベル（1=大項目、2=中項目、3=詳細）';
COMMENT ON COLUMN invoice_items.is_header IS '見出し行かどうか';

-- 実行完了メッセージ
SELECT 'Invoice schema created successfully!' as message;