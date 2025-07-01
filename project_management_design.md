# プロジェクト管理機能 設計仕様書

## 🎯 概要
造園業向け統合業務管理システムの中核となるプロジェクト管理機能の設計・実装仕様書。
仕様書第3章「プロジェクト実行 – 統合された進捗と予算の管理」に基づく。

## 🏗️ アーキテクチャ設計

### 技術スタック
- **フロントエンド**: React 18 + TypeScript + Material-UI
- **バックエンド**: FastAPI + SQLAlchemy + Pydantic
- **データベース**: PostgreSQL 15
- **リアルタイム**: WebSocket (FastAPI WebSocket)
- **ガントチャート**: React-Gantt-Chart + D3.js
- **状態管理**: Redux Toolkit + RTK Query

### システム構成
```
Frontend (React)
├── ProjectDashboard (親方ダッシュボード)
├── GanttChart (ガントチャート)
├── BudgetTracking (予実管理)
└── ChangeOrders (変更・増工管理)

Backend (FastAPI)
├── Projects API
├── Tasks API  
├── Budget Tracking API
└── Change Orders API

Database (PostgreSQL)
├── projects (案件テーブル)
├── project_tasks (タスクテーブル)
├── budget_tracking (予実管理テーブル)
└── change_orders (変更指示書テーブル)
```

## 📊 データベース設計

### 1. projects テーブル (案件)
```sql
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    estimate_id INTEGER,
    project_name VARCHAR(255) NOT NULL,
    site_address VARCHAR(255),
    status VARCHAR(50) DEFAULT '進行中',
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(12, 0),
    actual_cost DECIMAL(12, 0) DEFAULT 0,
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. project_tasks テーブル (タスク)
```sql
CREATE TABLE project_tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER NOT NULL,
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT '未開始',
    assigned_to VARCHAR(100),
    dependencies TEXT, -- JSON array of task_ids
    budget_amount DECIMAL(10, 0),
    actual_cost DECIMAL(10, 0) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. budget_tracking テーブル (予実管理)
```sql
CREATE TABLE budget_tracking (
    tracking_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    task_id INTEGER REFERENCES project_tasks(task_id),
    category VARCHAR(100), -- '材料費', '人件費', '外注費'
    description VARCHAR(255),
    planned_amount DECIMAL(10, 0),
    actual_amount DECIMAL(10, 0),
    purchase_order_id INTEGER, -- 発注書ID (将来拡張)
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. change_orders テーブル (変更指示書)
```sql
CREATE TABLE change_orders (
    change_order_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    change_type VARCHAR(50), -- '追加', '変更', '削除'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10, 0),
    status VARCHAR(50) DEFAULT '承認待ち',
    requested_by VARCHAR(100),
    requested_date DATE NOT NULL,
    approved_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 UI/UX設計

### 1. 親方ダッシュボード
```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Garden システム - プロジェクト管理                    │
├─────────────────────────────────────────────────────────┤
│ 📊 プロジェクト概要                                      │
│ ┌─────────┬─────────┬─────────┬─────────┐               │
│ │進行中: 3│完了: 7  │遅延: 1  │予算超過:0│               │
│ └─────────┴─────────┴─────────┴─────────┘               │
│                                                         │
│ 📋 案件一覧                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │案件名     │進捗│予算  │実績  │差異  │状態│詳細│     │ │
│ │○○邸庭園  │75%│500万│420万│+80万│◯   │[詳]│     │ │
│ │△△公園   │30%│800万│240万│+560万│⚠  │[詳]│     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2. ガントチャート
```
┌─────────────────────────────────────────────────────────┐
│ 📅 ○○邸庭園工事 - 工程表                                 │
├─────────────────────────────────────────────────────────┤
│ タスク名        │6/1│6/8│6/15│6/22│6/29│7/6│進捗│    │
│ ┌─────────────┬───┬───┬────┬────┬───┬───┬────┐   │
│ │整地作業     │███│   │    │    │   │   │100%│   │
│ │植栽工事     │   │███│████│    │   │   │ 60%│   │
│ │石工事       │   │   │    │████│███│   │  0%│   │
│ │仕上げ       │   │   │    │    │   │███│  0%│   │
│ └─────────────┴───┴───┴────┴────┴───┴───┴────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3. 予実管理
```
┌─────────────────────────────────────────────────────────┐
│ 💰 ○○邸庭園工事 - 予実管理                               │
├─────────────────────────────────────────────────────────┤
│ 📊 全体サマリー                                          │
│ ┌─────────┬─────────┬─────────┬─────────┐               │
│ │実行予算 │実績原価 │予算消化率│着地見込 │               │
│ │500万円  │420万円  │84%      │490万円  │               │
│ └─────────┴─────────┴─────────┴─────────┘               │
│                                                         │
│ 📋 カテゴリ別詳細                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │カテゴリ   │予算  │実績  │差異  │進捗│状態│        │ │
│ │材料費     │200万│180万│+20万│90% │◯   │        │ │
│ │人件費     │250万│200万│+50万│80% │◯   │        │ │
│ │外注費     │50万 │40万 │+10万│80% │◯   │        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## ⚡ 核心機能仕様

### 1. 自動化されたプロジェクト開始 (3.1章対応)

#### ワンクリックプロジェクト化
```python
# FastAPI エンドポイント
@router.post("/projects/create-from-estimate/{estimate_id}")
async def create_project_from_estimate(estimate_id: int):
    # 1. 見積情報取得
    estimate = await get_estimate(estimate_id)
    
    # 2. Projects テーブルに新規レコード作成
    project = await create_project({
        "customer_id": estimate.customer_id,
        "estimate_id": estimate_id,
        "project_name": f"{estimate.customer_name}邸工事",
        "total_budget": estimate.total_cost,
        "start_date": estimate.proposed_start_date,
        "end_date": estimate.proposed_end_date
    })
    
    # 3. 見積大項目からタスク自動生成
    tasks = await generate_tasks_from_estimate(estimate)
    
    # 4. ガントチャート初期データ生成
    gantt_data = await generate_gantt_chart(project.project_id, tasks)
    
    return {"project": project, "tasks": tasks, "gantt": gantt_data}
```

### 2. リアルタイム親方ダッシュボード (3.2章対応)

#### 進捗可視化
- **ガントチャート**: 計画vs実績の色分け表示
- **遅延アラート**: 遅延タスクの即座識別
- **依存関係**: タスク間依存の可視化

#### 予実管理統合ビュー
```python
@router.get("/projects/{project_id}/budget-overview")
async def get_budget_overview(project_id: int):
    return {
        "total_budget": project.total_budget,
        "actual_cost": sum(budget_tracking.actual_amount),
        "budget_consumption_rate": (actual_cost / total_budget) * 100,
        "estimated_final_cost": calculate_final_cost_projection(),
        "variance": total_budget - estimated_final_cost,
        "status": determine_budget_status()
    }
```

### 3. 変更・増工管理ワークフロー (3.3章対応)

#### 変更指示書作成
```python
@router.post("/change-orders")
async def create_change_order(change_order: ChangeOrderCreate):
    # 変更指示書作成
    change_order = await create_change_order_record(change_order)
    
    # 承認フロー開始
    await initiate_approval_workflow(change_order)
    
    # 通知送信 (経営者へ)
    await send_approval_notification(change_order)
    
    return change_order

@router.put("/change-orders/{change_order_id}/approve")
async def approve_change_order(change_order_id: int):
    # 承認処理
    change_order = await approve_change_order(change_order_id)
    
    # プロジェクト予算自動更新
    await update_project_budget(change_order)
    
    # ガントチャート更新 (必要に応じて)
    await update_gantt_chart_for_changes(change_order)
    
    return {"status": "approved", "change_order": change_order}
```

## 🔄 ワークフロー

### プロジェクト開始フロー
1. 見積承認 → 「契約」ボタンクリック
2. システムが自動でプロジェクトレコード作成
3. 見積大項目からタスクリスト自動生成
4. ガントチャート初期表示
5. 親方ダッシュボードで確認可能

### 日常運用フロー
1. 現場担当者がタスク進捗を更新
2. 経費発生時に予実管理に実績入力
3. 親方が毎日ダッシュボードで全案件確認
4. 遅延・予算超過アラートに対処

### 変更管理フロー
1. 顧客から変更要望 → 変更指示書作成
2. 見積作成 (既存見積エンジン活用)
3. 顧客承認 → システム上で承認処理
4. プロジェクト予算・スケジュール自動更新

## 🚀 実装優先順位

### Phase 1 (高優先度)
1. ✅ データベーススキーマ設計・作成
2. ✅ 基本CRUD API (Projects, Tasks)
3. ✅ 見積からプロジェクト自動生成
4. ✅ シンプルなガントチャート表示

### Phase 2 (中優先度)
1. ⚡ 予実管理機能
2. ⚡ リアルタイム更新 (WebSocket)
3. ⚡ 親方ダッシュボード統合ビュー
4. ⚡ 進捗アラート機能

### Phase 3 (拡張機能)
1. 🔮 変更・増工管理ワークフロー
2. 🔮 モバイル対応 (進捗入力)
3. 🔮 レポート機能
4. 🔮 AI予測機能

## 🎯 成功指標 (KPI)

### ユーザビリティ
- プロジェクト作成時間: 5分 → 30秒
- 進捗把握時間: 30分 → 3分
- 予算状況確認: 1時間 → 10秒

### ビジネス効果
- プロジェクト遅延率: 30% → 10%
- 予算超過率: 20% → 5%
- 変更対応時間: 2日 → 1時間

---

**作成者**: worker2  
**最終更新**: 2025-06-30  
**ステータス**: 設計完了 → 実装開始準備完了