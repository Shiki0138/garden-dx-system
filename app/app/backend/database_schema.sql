-- Garden Project Management System Database Schema
-- プロジェクト管理機能用データベース設計
-- Created by: worker2
-- Date: 2025-06-30

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- マルチテナント基盤テーブル
-- ==============================================

-- Companies テーブル (マルチテナント対応)
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- プロジェクト管理 中核テーブル
-- ==============================================

-- Projects テーブル (案件) - システムの中核
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    customer_id INTEGER NOT NULL, -- customers テーブル参照 (worker5が作成)
    estimate_id INTEGER, -- estimates テーブル参照 (worker1が作成)
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    site_address VARCHAR(255),
    status VARCHAR(50) DEFAULT '進行中' CHECK (status IN ('見積中', '進行中', '完了', '請求済', '失注', '中断')),
    priority VARCHAR(20) DEFAULT '中' CHECK (priority IN ('高', '中', '低')),
    start_date DATE,
    end_date DATE,
    planned_end_date DATE, -- 当初計画完了日
    total_budget DECIMAL(12, 0) DEFAULT 0, -- 実行予算（原価）
    estimated_revenue DECIMAL(12, 0) DEFAULT 0, -- 見積金額（売上）
    actual_cost DECIMAL(12, 0) DEFAULT 0, -- 実績原価
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    manager_id INTEGER, -- 担当者ID (users テーブル参照)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Tasks テーブル (タスク・工程)
CREATE TABLE project_tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(50) DEFAULT '作業' CHECK (task_type IN ('作業', 'マイルストーン', '承認', '検査')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planned_start_date DATE, -- 当初計画開始日
    planned_end_date DATE, -- 当初計画完了日
    duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT '未開始' CHECK (status IN ('未開始', '進行中', '完了', '遅延', '中断')),
    assigned_to VARCHAR(100), -- 担当者名 (将来的にuser_idに変更予定)
    dependencies TEXT, -- JSON array of task_ids that this task depends on
    budget_amount DECIMAL(10, 0) DEFAULT 0, -- このタスクの予算
    actual_cost DECIMAL(10, 0) DEFAULT 0, -- このタスクの実績原価
    sort_order INTEGER DEFAULT 0, -- 表示順序
    level INTEGER DEFAULT 0, -- 階層レベル (0=大項目, 1=中項目, 2=小項目)
    parent_task_id INTEGER REFERENCES project_tasks(task_id), -- 親タスクID
    is_milestone BOOLEAN DEFAULT FALSE, -- マイルストーンフラグ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 予実管理テーブル
-- ==============================================

-- Budget Tracking テーブル (予実管理)
CREATE TABLE budget_tracking (
    tracking_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(task_id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- '材料費', '人件費', '外注費', 'その他'
    subcategory VARCHAR(100), -- より詳細なカテゴリ
    description VARCHAR(255) NOT NULL,
    planned_amount DECIMAL(10, 0) NOT NULL DEFAULT 0, -- 計画金額
    actual_amount DECIMAL(10, 0) NOT NULL DEFAULT 0, -- 実績金額
    committed_amount DECIMAL(10, 0) DEFAULT 0, -- 発注済金額（未払い）
    purchase_order_id INTEGER, -- 発注書ID (将来拡張)
    invoice_id INTEGER, -- 請求書ID (将来拡張)
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) DEFAULT '支出' CHECK (transaction_type IN ('支出', '収入')),
    status VARCHAR(50) DEFAULT '計画' CHECK (status IN ('計画', '発注済', '実行済', 'キャンセル')),
    notes TEXT,
    created_by INTEGER, -- 記録者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 変更・増工管理テーブル
-- ==============================================

-- Change Orders テーブル (変更指示書)
CREATE TABLE change_orders (
    change_order_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    change_order_number VARCHAR(50) UNIQUE, -- 変更指示書番号 (自動生成)
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('追加', '変更', '削除', '仕様変更')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reason TEXT, -- 変更理由
    estimated_cost DECIMAL(10, 0) DEFAULT 0, -- 見積金額
    estimated_duration_days INTEGER DEFAULT 0, -- 追加日数
    status VARCHAR(50) DEFAULT '申請中' CHECK (status IN ('申請中', '見積中', '承認待ち', '承認済', '却下', '実行中', '完了')),
    priority VARCHAR(20) DEFAULT '中' CHECK (priority IN ('高', '中', '低')),
    requested_by VARCHAR(100) NOT NULL, -- 依頼者
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_by VARCHAR(100), -- 査定者
    reviewed_date DATE,
    approved_by VARCHAR(100), -- 承認者
    approved_date DATE,
    rejection_reason TEXT, -- 却下理由
    impact_assessment TEXT, -- 影響評価
    customer_approval_required BOOLEAN DEFAULT TRUE, -- 顧客承認要否
    customer_approved_date DATE, -- 顧客承認日
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- ダッシュボード用ビュー
-- ==============================================

-- プロジェクト概要ビュー (親方ダッシュボード用)
CREATE OR REPLACE VIEW project_overview AS
SELECT 
    p.project_id,
    p.company_id,
    p.project_name,
    p.status,
    p.priority,
    p.start_date,
    p.end_date,
    p.planned_end_date,
    p.total_budget,
    p.estimated_revenue,
    p.actual_cost,
    p.progress_percentage,
    
    -- 予算関連指標
    (p.estimated_revenue - p.total_budget) AS estimated_profit,
    CASE 
        WHEN p.total_budget > 0 THEN 
            ROUND(((p.estimated_revenue - p.total_budget) / p.estimated_revenue * 100)::NUMERIC, 2)
        ELSE 0 
    END AS estimated_profit_rate,
    
    CASE 
        WHEN p.total_budget > 0 THEN 
            ROUND((p.actual_cost / p.total_budget * 100)::NUMERIC, 2)
        ELSE 0 
    END AS budget_consumption_rate,
    
    -- 進捗関連指標
    CASE 
        WHEN p.end_date < CURRENT_DATE AND p.progress_percentage < 100 THEN '遅延'
        WHEN p.end_date = CURRENT_DATE AND p.progress_percentage < 100 THEN '要注意'
        WHEN p.progress_percentage = 100 THEN '完了'
        ELSE '正常'
    END AS schedule_status,
    
    -- 予算ステータス
    CASE 
        WHEN p.actual_cost > p.total_budget THEN '予算超過'
        WHEN p.actual_cost > p.total_budget * 0.9 THEN '要注意'
        ELSE '正常'
    END AS budget_status,
    
    -- タスク集計
    (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id) AS total_tasks,
    (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id AND status = '完了') AS completed_tasks,
    (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id AND status = '遅延') AS delayed_tasks,
    
    -- 変更指示書数
    (SELECT COUNT(*) FROM change_orders WHERE project_id = p.project_id) AS change_orders_count,
    (SELECT COUNT(*) FROM change_orders WHERE project_id = p.project_id AND status = '申請中') AS pending_change_orders,
    
    p.created_at,
    p.updated_at
FROM projects p;

-- タスク詳細ビュー (ガントチャート用)
CREATE OR REPLACE VIEW task_gantt_view AS
SELECT 
    t.task_id,
    t.project_id,
    t.task_name,
    t.task_description,
    t.task_type,
    t.start_date,
    t.end_date,
    t.planned_start_date,
    t.planned_end_date,
    t.duration_days,
    t.progress_percentage,
    t.status,
    t.assigned_to,
    t.budget_amount,
    t.actual_cost,
    t.level,
    t.parent_task_id,
    t.is_milestone,
    
    -- 遅延日数計算
    CASE 
        WHEN t.end_date < CURRENT_DATE AND t.progress_percentage < 100 THEN 
            CURRENT_DATE - t.end_date
        ELSE 0
    END AS delay_days,
    
    -- 予算消化率
    CASE 
        WHEN t.budget_amount > 0 THEN 
            ROUND((t.actual_cost / t.budget_amount * 100)::NUMERIC, 2)
        ELSE 0 
    END AS budget_consumption_rate,
    
    -- 依存関係解析 (JSON)
    t.dependencies,
    
    -- プロジェクト情報
    p.project_name,
    p.status AS project_status
FROM project_tasks t
JOIN projects p ON t.project_id = p.project_id
ORDER BY t.project_id, t.sort_order;

-- ==============================================
-- インデックス作成 (パフォーマンス最適化)
-- ==============================================

-- Projects テーブル
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Project Tasks テーブル  
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_dates ON project_tasks(start_date, end_date);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_parent ON project_tasks(parent_task_id);

-- Budget Tracking テーブル
CREATE INDEX idx_budget_tracking_project_id ON budget_tracking(project_id);
CREATE INDEX idx_budget_tracking_task_id ON budget_tracking(task_id);
CREATE INDEX idx_budget_tracking_category ON budget_tracking(category);
CREATE INDEX idx_budget_tracking_date ON budget_tracking(recorded_date);

-- Change Orders テーブル
CREATE INDEX idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_orders_date ON change_orders(requested_date);

-- ==============================================
-- トリガー関数 (自動更新)
-- ==============================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at トリガー設定
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_tracking_updated_at BEFORE UPDATE ON budget_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON change_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- プロジェクト進捗自動計算トリガー
-- ==============================================

-- プロジェクト進捗率自動計算関数
CREATE OR REPLACE FUNCTION calculate_project_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- タスクの進捗率からプロジェクト全体の進捗率を計算
    UPDATE projects 
    SET progress_percentage = (
        SELECT COALESCE(AVG(progress_percentage), 0)
        FROM project_tasks 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND parent_task_id IS NULL -- 大項目のみで計算
    ),
    actual_cost = (
        SELECT COALESCE(SUM(actual_cost), 0)
        FROM project_tasks 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    )
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- プロジェクト進捗計算トリガー
CREATE TRIGGER trigger_calculate_project_progress
    AFTER INSERT OR UPDATE OR DELETE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION calculate_project_progress();

-- ==============================================
-- 変更指示書番号自動生成
-- ==============================================

-- 変更指示書番号自動生成関数
CREATE OR REPLACE FUNCTION generate_change_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    company_code VARCHAR(10);
BEGIN
    -- 会社コード取得
    SELECT companies.company_code INTO company_code 
    FROM companies 
    JOIN projects ON companies.company_id = projects.company_id 
    WHERE projects.project_id = NEW.project_id;
    
    -- 連番取得 (同一プロジェクト内)
    SELECT COALESCE(MAX(
        CAST(RIGHT(change_order_number, 3) AS INTEGER)
    ), 0) + 1 INTO next_number
    FROM change_orders 
    WHERE project_id = NEW.project_id;
    
    -- 変更指示書番号生成: {COMPANY_CODE}-{PROJECT_ID}-CHG-{001}
    NEW.change_order_number = company_code || '-' || NEW.project_id || '-CHG-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 変更指示書番号自動生成トリガー
CREATE TRIGGER trigger_generate_change_order_number
    BEFORE INSERT ON change_orders
    FOR EACH ROW EXECUTE FUNCTION generate_change_order_number();

-- ==============================================
-- サンプルデータ挿入 (開発用)
-- ==============================================

-- サンプル会社データ
INSERT INTO companies (company_name, company_code, address, phone, email) VALUES
('株式会社ガーデンクリエイト', 'GDN001', '東京都渋谷区○○1-2-3', '03-1234-5678', 'info@garden-create.co.jp');

-- サンプルプロジェクトデータ
INSERT INTO projects (company_id, customer_id, project_name, site_address, status, start_date, end_date, total_budget, estimated_revenue) VALUES
(1, 1, '田中邸 庭園リフォーム工事', '東京都世田谷区○○2-3-4', '進行中', '2025-07-01', '2025-07-31', 800000, 1200000),
(1, 2, '山田邸 新築外構工事', '東京都杉並区○○3-4-5', '進行中', '2025-07-15', '2025-08-30', 1500000, 2000000);

-- サンプルタスクデータ
INSERT INTO project_tasks (project_id, task_name, start_date, end_date, budget_amount, level, sort_order) VALUES
(1, '整地・準備作業', '2025-07-01', '2025-07-05', 100000, 0, 1),
(1, '植栽工事', '2025-07-06', '2025-07-20', 400000, 0, 2),
(1, '石工事・舗装', '2025-07-21', '2025-07-28', 250000, 0, 3),
(1, '仕上げ・清掃', '2025-07-29', '2025-07-31', 50000, 0, 4);

-- ==============================================
-- 権限設定 (セキュリティ)
-- ==============================================

-- 読み取り専用ユーザー (従業員用)
-- CREATE ROLE garden_employee;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO garden_employee;
-- GRANT SELECT ON project_overview, task_gantt_view TO garden_employee;

-- 管理者ユーザー (経営者用)  
-- CREATE ROLE garden_admin;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO garden_admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO garden_admin;

-- ※ 実際の権限設定はworker4のユーザー管理システムと連携

-- ==============================================
-- 完了
-- ==============================================
-- プロジェクト管理機能のデータベーススキーマ設計完了
-- - マルチテナント対応
-- - 進捗・予実管理統合
-- - ガントチャート対応
-- - 変更管理ワークフロー
-- - パフォーマンス最適化済み
-- - 自動計算・番号生成機能付き