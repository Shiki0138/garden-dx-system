-- ============================================================
-- Garden DX - デモ工程表・スケジュールデータ作成
-- Process Schedules & Tasks のデモデータ構築
-- Created by: Claude Code (Demo Process Management)
-- Date: 2025-07-02
-- ============================================================

-- エラー防止設定
\set ON_ERROR_STOP on
BEGIN;
SAVEPOINT demo_process_start;

-- ============================================================
-- 1. Process Schedules & Tasks テーブル作成（存在しない場合）
-- ============================================================

-- 工程スケジュールテーブル
CREATE TABLE IF NOT EXISTS process_schedules (
    schedule_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) DEFAULT 'project' CHECK (schedule_type IN ('project', 'maintenance', 'emergency')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工程タスクテーブル  
CREATE TABLE IF NOT EXISTS process_tasks (
    task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES process_schedules(schedule_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_code VARCHAR(50),
    task_category VARCHAR(100),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    estimated_hours DECIMAL(5,1) DEFAULT 0,
    actual_hours DECIMAL(5,1) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'delayed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    dependencies UUID[], -- 依存タスクID配列
    assigned_to UUID REFERENCES user_profiles(user_id),
    cost_estimate DECIMAL(10,0) DEFAULT 0,
    actual_cost DECIMAL(10,0) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_process_schedules_company ON process_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_process_schedules_project ON process_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_schedule ON process_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_process_tasks_status ON process_tasks(status);
CREATE INDEX IF NOT EXISTS idx_process_tasks_assigned ON process_tasks(assigned_to);

-- ============================================================
-- 2. デモ工程スケジュールデータ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_demo_manager_id UUID := '00000000-0000-0000-0000-000000000003';
    v_project_ids UUID[];
    v_schedule_ids UUID[];
    v_schedule_count INTEGER := 0;
BEGIN
    -- プロジェクトID取得
    SELECT ARRAY_AGG(project_id) INTO v_project_ids
    FROM projects 
    WHERE company_id = v_demo_company_id
    LIMIT 5;

    IF array_length(v_project_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'デモプロジェクトデータが見つかりません';
    END IF;

    -- デモ工程スケジュールデータ投入
    WITH demo_schedules AS (
        SELECT * FROM (VALUES
            ('田中邸庭園リフォーム工程表', 'project', '2025-06-01', '2025-07-15', 'active', 65, 'high', '個人邸庭園の全面リフォーム。既存植栽の一部保存あり。'),
            ('佐藤邸新築庭園設計工程表', 'project', '2025-07-10', '2025-08-30', 'planning', 0, 'medium', '新築住宅の庭園設計・施工。和モダンテイスト希望。'),
            ('山田商事植栽管理工程表', 'maintenance', '2025-05-15', '2025-12-31', 'active', 35, 'medium', '企業施設の年間植栽管理契約。月次メンテナンス含む。'),
            ('鈴木造園協力案件工程表', 'project', '2025-04-01', '2025-05-31', 'completed', 100, 'low', '協力会社との共同施工案件。完工済み。'),
            ('高橋邸マンション植栽工程表', 'project', '2025-07-20', '2025-08-15', 'planning', 0, 'high', 'マンション共用部の植栽リニューアル。')
        ) AS t(schedule_name, schedule_type, start_date, end_date, status, progress_percentage, priority, notes)
    )
    INSERT INTO process_schedules (
        company_id,
        project_id,
        schedule_name,
        schedule_type,
        start_date,
        end_date,
        status,
        progress_percentage,
        priority,
        notes,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        v_demo_company_id,
        v_project_ids[row_number() OVER ()],
        schedule_name,
        schedule_type::VARCHAR(50),
        start_date::DATE,
        end_date::DATE,
        status::VARCHAR(50),
        progress_percentage::INTEGER,
        priority::VARCHAR(20),
        notes,
        v_demo_user_id,
        NOW(),
        NOW()
    FROM demo_schedules
    RETURNING schedule_id INTO v_schedule_ids;

    GET DIAGNOSTICS v_schedule_count = ROW_COUNT;
    
    RAISE NOTICE 'デモ工程スケジュール作成完了: %件', v_schedule_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'デモ工程スケジュール作成エラー: %', SQLERRM;
        ROLLBACK TO SAVEPOINT demo_process_start;
        RAISE;
END $$;

-- ============================================================
-- 3. デモ工程タスクデータ作成（田中邸リフォーム詳細）
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_demo_manager_id UUID := '00000000-0000-0000-0000-000000000003';
    v_schedule_id UUID;
    v_task_count INTEGER := 0;
BEGIN
    -- 田中邸リフォームの工程表ID取得
    SELECT schedule_id INTO v_schedule_id
    FROM process_schedules 
    WHERE company_id = v_demo_company_id
    AND schedule_name = '田中邸庭園リフォーム工程表'
    LIMIT 1;

    IF v_schedule_id IS NULL THEN
        RAISE EXCEPTION '田中邸リフォーム工程表が見つかりません';
    END IF;

    -- 田中邸リフォーム詳細タスク投入
    WITH demo_tasks AS (
        SELECT * FROM (VALUES
            ('現場調査・測量', 'SURVEY_001', '調査・計画', '既存庭園の現況調査と正確な測量', '2025-06-01', '2025-06-03', 16.0, 16.0, 'completed', 100, NULL, 25000, 25000),
            ('設計図面作成', 'DESIGN_001', '設計', '庭園リフォーム設計図面の作成', '2025-06-04', '2025-06-08', 24.0, 20.0, 'completed', 100, NULL, 80000, 75000),
            ('既存植栽撤去', 'REMOVE_001', '撤去工事', '不要な既存植栽の撤去作業', '2025-06-10', '2025-06-12', 20.0, 18.0, 'completed', 100, NULL, 45000, 42000),
            ('土工事・整地', 'EARTH_001', '土工事', '植栽地の掘削・整地作業', '2025-06-13', '2025-06-17', 32.0, 28.0, 'completed', 100, NULL, 85000, 80000),
            ('客土・土壌改良', 'SOIL_001', '土工事', '植栽用土の搬入・土壌改良', '2025-06-18', '2025-06-20', 16.0, 14.0, 'completed', 100, NULL, 55000, 52000),
            ('高木植栽工事', 'PLANT_001', '植栽工事', 'シマトネリコ、ソヨゴ等の高木植栽', '2025-06-23', '2025-06-25', 24.0, 20.0, 'completed', 100, NULL, 95000, 88000),
            ('中低木植栽工事', 'PLANT_002', '植栽工事', 'ツツジ、アベリア等の中低木植栽', '2025-06-26', '2025-06-30', 20.0, 16.0, 'in_progress', 75, NULL, 65000, 48000),
            ('草花・地被植栽', 'PLANT_003', '植栽工事', 'シバザクラ等の草花・地被植物植栽', '2025-07-01', '2025-07-05', 16.0, 0.0, 'pending', 0, NULL, 35000, 0),
            ('支柱設置工事', 'SUPPORT_001', '資材工事', '高木用支柱の設置作業', '2025-07-08', '2025-07-10', 12.0, 0.0, 'pending', 0, NULL, 28000, 0),
            ('散水設備設置', 'WATER_001', '設備工事', '自動散水システムの設置', '2025-07-11', '2025-07-13', 18.0, 0.0, 'pending', 0, NULL, 75000, 0),
            ('最終清掃・検査', 'FINISH_001', '完了検査', '現場清掃と完了検査', '2025-07-14', '2025-07-15', 8.0, 0.0, 'pending', 0, NULL, 15000, 0)
        ) AS t(task_name, task_code, task_category, description, start_date, end_date, estimated_hours, actual_hours, status, progress_percentage, dependencies, cost_estimate, actual_cost)
    )
    INSERT INTO process_tasks (
        schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date,
        end_date,
        estimated_hours,
        actual_hours,
        status,
        progress_percentage,
        assigned_to,
        cost_estimate,
        actual_cost,
        created_at,
        updated_at
    )
    SELECT 
        v_schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date::DATE,
        end_date::DATE,
        estimated_hours,
        actual_hours,
        status::VARCHAR(50),
        progress_percentage,
        CASE 
            WHEN task_category IN ('設計', '調査・計画') THEN v_demo_user_id
            ELSE v_demo_manager_id
        END,
        cost_estimate,
        actual_cost,
        NOW(),
        NOW()
    FROM demo_tasks;

    GET DIAGNOSTICS v_task_count = ROW_COUNT;
    
    RAISE NOTICE '田中邸リフォーム詳細タスク作成完了: %件', v_task_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '田中邸リフォームタスク作成エラー: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================
-- 4. 佐藤邸新築庭園のタスクデータ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_demo_manager_id UUID := '00000000-0000-0000-0000-000000000003';
    v_schedule_id UUID;
    v_task_count INTEGER := 0;
BEGIN
    -- 佐藤邸新築庭園の工程表ID取得
    SELECT schedule_id INTO v_schedule_id
    FROM process_schedules 
    WHERE company_id = v_demo_company_id
    AND schedule_name = '佐藤邸新築庭園設計工程表'
    LIMIT 1;

    IF v_schedule_id IS NULL THEN
        RAISE EXCEPTION '佐藤邸新築庭園工程表が見つかりません';
    END IF;

    -- 佐藤邸新築庭園タスク投入
    WITH demo_tasks AS (
        SELECT * FROM (VALUES
            ('敷地調査・ヒアリング', 'SURVEY_002', '調査・計画', '新築敷地の調査とお客様ヒアリング', '2025-07-10', '2025-07-12', 12.0, 0.0, 'pending', 0, NULL, 30000, 0),
            ('基本設計', 'DESIGN_002', '設計', '和モダン庭園の基本設計', '2025-07-15', '2025-07-20', 20.0, 0.0, 'pending', 0, NULL, 60000, 0),
            ('詳細設計・積算', 'DESIGN_003', '設計', '詳細図面作成と正確な積算', '2025-07-22', '2025-07-27', 24.0, 0.0, 'pending', 0, NULL, 80000, 0),
            ('外構工事', 'CONSTRUCT_001', '外構工事', '石張り・舗装等の外構工事', '2025-08-01', '2025-08-10', 60.0, 0.0, 'pending', 0, NULL, 450000, 0),
            ('植栽工事', 'PLANT_004', '植栽工事', '和風植栽の配植・植付', '2025-08-12', '2025-08-20', 40.0, 0.0, 'pending', 0, NULL, 320000, 0),
            ('設備工事', 'EQUIP_001', '設備工事', '照明・散水設備の設置', '2025-08-22', '2025-08-25', 24.0, 0.0, 'pending', 0, NULL, 180000, 0),
            ('完了検査・引渡し', 'FINISH_002', '完了検査', '完了検査と顧客への引渡し', '2025-08-28', '2025-08-30', 8.0, 0.0, 'pending', 0, NULL, 20000, 0)
        ) AS t(task_name, task_code, task_category, description, start_date, end_date, estimated_hours, actual_hours, status, progress_percentage, dependencies, cost_estimate, actual_cost)
    )
    INSERT INTO process_tasks (
        schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date,
        end_date,
        estimated_hours,
        actual_hours,
        status,
        progress_percentage,
        assigned_to,
        cost_estimate,
        actual_cost,
        created_at,
        updated_at
    )
    SELECT 
        v_schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date::DATE,
        end_date::DATE,
        estimated_hours,
        actual_hours,
        status::VARCHAR(50),
        progress_percentage,
        CASE 
            WHEN task_category IN ('設計', '調査・計画') THEN v_demo_user_id
            ELSE v_demo_manager_id
        END,
        cost_estimate,
        actual_cost,
        NOW(),
        NOW()
    FROM demo_tasks;

    GET DIAGNOSTICS v_task_count = ROW_COUNT;
    
    RAISE NOTICE '佐藤邸新築庭園タスク作成完了: %件', v_task_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '佐藤邸新築庭園タスク作成エラー: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================
-- 5. 山田商事年間管理のタスクデータ作成
-- ============================================================

DO $$
DECLARE
    v_demo_company_id UUID := '00000000-0000-0000-0000-000000000001';
    v_demo_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_demo_manager_id UUID := '00000000-0000-0000-0000-000000000003';
    v_schedule_id UUID;
    v_task_count INTEGER := 0;
BEGIN
    -- 山田商事管理の工程表ID取得
    SELECT schedule_id INTO v_schedule_id
    FROM process_schedules 
    WHERE company_id = v_demo_company_id
    AND schedule_name = '山田商事植栽管理工程表'
    LIMIT 1;

    IF v_schedule_id IS NULL THEN
        RAISE EXCEPTION '山田商事管理工程表が見つかりません';
    END IF;

    -- 山田商事年間管理タスク投入
    WITH demo_tasks AS (
        SELECT * FROM (VALUES
            ('5月剪定作業', 'PRUNE_M05', '剪定管理', '春期の剪定・整姿作業', '2025-05-15', '2025-05-20', 30.0, 30.0, 'completed', 100, NULL, 80000, 80000),
            ('6月施肥作業', 'FERT_M06', '施肥管理', '春期施肥と土壌改良', '2025-06-10', '2025-06-12', 12.0, 12.0, 'completed', 100, NULL, 25000, 25000),
            ('7月病害虫防除', 'PEST_M07', '病害虫管理', '夏期病害虫防除作業', '2025-07-05', '2025-07-07', 8.0, 6.0, 'in_progress', 80, NULL, 15000, 12000),
            ('8月潅水・除草', 'WATER_M08', '水管理', '夏期の潅水と除草作業', '2025-08-01', '2025-08-31', 20.0, 0.0, 'pending', 0, NULL, 35000, 0),
            ('9月秋期剪定', 'PRUNE_M09', '剪定管理', '秋期の軽剪定作業', '2025-09-15', '2025-09-20', 25.0, 0.0, 'pending', 0, NULL, 65000, 0),
            ('10月秋期施肥', 'FERT_M10', '施肥管理', '秋期施肥と冬支度', '2025-10-10', '2025-10-15', 15.0, 0.0, 'pending', 0, NULL, 30000, 0),
            ('11月落葉清掃', 'CLEAN_M11', '清掃管理', '落葉の清掃と冬期準備', '2025-11-20', '2025-11-25', 18.0, 0.0, 'pending', 0, NULL, 20000, 0),
            ('12月年末清掃', 'CLEAN_M12', '清掃管理', '年末の総合清掃作業', '2025-12-20', '2025-12-25', 12.0, 0.0, 'pending', 0, NULL, 18000, 0)
        ) AS t(task_name, task_code, task_category, description, start_date, end_date, estimated_hours, actual_hours, status, progress_percentage, dependencies, cost_estimate, actual_cost)
    )
    INSERT INTO process_tasks (
        schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date,
        end_date,
        estimated_hours,
        actual_hours,
        status,
        progress_percentage,
        assigned_to,
        cost_estimate,
        actual_cost,
        created_at,
        updated_at
    )
    SELECT 
        v_schedule_id,
        task_name,
        task_code,
        task_category,
        description,
        start_date::DATE,
        end_date::DATE,
        estimated_hours,
        actual_hours,
        status::VARCHAR(50),
        progress_percentage,
        v_demo_manager_id, -- 管理作業は管理者が担当
        cost_estimate,
        actual_cost,
        NOW(),
        NOW()
    FROM demo_tasks;

    GET DIAGNOSTICS v_task_count = ROW_COUNT;
    
    RAISE NOTICE '山田商事年間管理タスク作成完了: %件', v_task_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '山田商事管理タスク作成エラー: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================
-- 6. RLSポリシー設定（Process Tables用）
-- ============================================================

-- Process Schedules RLS有効化
DO $$
BEGIN
    ALTER TABLE process_schedules ENABLE ROW LEVEL SECURITY;
    
    -- 基本アクセスポリシー
    DROP POLICY IF EXISTS process_schedules_company_policy ON process_schedules;
    CREATE POLICY process_schedules_company_policy ON process_schedules
        FOR ALL
        USING (
            company_id = get_user_company_id() 
            OR 
            (is_demo_mode() AND company_id = '00000000-0000-0000-0000-000000000001'::UUID)
        );

    RAISE NOTICE 'Process Schedules RLSポリシー設定完了';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Process Schedules RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- Process Tasks RLS有効化
DO $$
BEGIN
    ALTER TABLE process_tasks ENABLE ROW LEVEL SECURITY;
    
    -- 基本アクセスポリシー（スケジュール経由）
    DROP POLICY IF EXISTS process_tasks_company_policy ON process_tasks;
    CREATE POLICY process_tasks_company_policy ON process_tasks
        FOR ALL
        USING (
            schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = get_user_company_id()
            )
            OR 
            (is_demo_mode() AND schedule_id IN (
                SELECT schedule_id 
                FROM process_schedules 
                WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
            ))
        );

    RAISE NOTICE 'Process Tasks RLSポリシー設定完了';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Process Tasks RLSポリシー設定エラー: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================
-- 7. 最終検証・サマリー出力
-- ============================================================

DO $$
DECLARE
    v_schedule_count INTEGER;
    v_task_count INTEGER;
    v_completed_tasks INTEGER;
    v_progress_summary JSONB;
BEGIN
    -- データ件数確認
    SELECT COUNT(*) INTO v_schedule_count
    FROM process_schedules
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;

    SELECT COUNT(*) INTO v_task_count
    FROM process_tasks pt
    JOIN process_schedules ps ON pt.schedule_id = ps.schedule_id
    WHERE ps.company_id = '00000000-0000-0000-0000-000000000001'::UUID;

    SELECT COUNT(*) INTO v_completed_tasks
    FROM process_tasks pt
    JOIN process_schedules ps ON pt.schedule_id = ps.schedule_id
    WHERE ps.company_id = '00000000-0000-0000-0000-000000000001'::UUID
    AND pt.status = 'completed';

    -- 進捗サマリー作成
    v_progress_summary := jsonb_build_object(
        'total_schedules', v_schedule_count,
        'total_tasks', v_task_count,
        'completed_tasks', v_completed_tasks,
        'completion_rate', ROUND((v_completed_tasks::DECIMAL / NULLIF(v_task_count, 0)) * 100, 1)
    );

    RAISE NOTICE '=== デモ工程表データ作成完了 ===';
    RAISE NOTICE 'スケジュール数: %', v_schedule_count;
    RAISE NOTICE 'タスク総数: %', v_task_count;
    RAISE NOTICE '完了タスク: %', v_completed_tasks;
    RAISE NOTICE '進捗率: %％', ROUND((v_completed_tasks::DECIMAL / NULLIF(v_task_count, 0)) * 100, 1);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '最終検証エラー: %', SQLERRM;
        RAISE;
END $$;

-- セーブポイント解放
RELEASE SAVEPOINT demo_process_start;

-- 最終確認クエリ（参考）
SELECT 
    '🎉 デモ工程表・タスクデータ作成完了' as status,
    'ガントチャート表示対応データセット構築済み' as description,
    NOW() as completed_at;