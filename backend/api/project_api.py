"""
Garden Project Management System - Project API
プロジェクト管理機能用FastAPI エンドポイント

Created by: worker2
Date: 2025-06-30
Purpose: 史上最強の造園業向けプロジェクト管理APIの実装
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from pydantic import BaseModel, Field, validator

from backend.models.project_models import (
    Project, ProjectTask, BudgetTracking, ChangeOrder,
    ProjectStatus, TaskStatus, TaskType, Priority,
    ChangeOrderType, ChangeOrderStatus, BudgetCategory
)
from backend.database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])

# ==============================================
# Pydantic Models (Request/Response)
# ==============================================

class ProjectBase(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=255)
    project_description: Optional[str] = None
    site_address: Optional[str] = None
    status: ProjectStatus = ProjectStatus.IN_PROGRESS
    priority: Priority = Priority.MEDIUM
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    total_budget: Decimal = Field(default=0, ge=0)
    estimated_revenue: Decimal = Field(default=0, ge=0)
    manager_id: Optional[int] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    company_id: int
    customer_id: int
    estimate_id: Optional[int] = None

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    site_address: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    total_budget: Optional[Decimal] = None
    estimated_revenue: Optional[Decimal] = None
    manager_id: Optional[int] = None
    notes: Optional[str] = None

class ProjectResponse(ProjectBase):
    project_id: int
    company_id: int
    customer_id: int
    estimate_id: Optional[int]
    actual_cost: Decimal
    progress_percentage: Decimal
    created_at: datetime
    updated_at: datetime
    
    # Calculated fields
    estimated_profit: Decimal
    estimated_profit_rate: float
    budget_consumption_rate: float
    schedule_status: str
    budget_status: str
    
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    task_name: str = Field(..., min_length=1, max_length=255)
    task_description: Optional[str] = None
    task_type: TaskType = TaskType.WORK
    start_date: date
    end_date: date
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    assigned_to: Optional[str] = None
    dependencies: Optional[List[int]] = None
    budget_amount: Decimal = Field(default=0, ge=0)
    level: int = Field(default=0, ge=0)
    parent_task_id: Optional[int] = None
    is_milestone: bool = False

class TaskCreate(TaskBase):
    project_id: int

class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    task_description: Optional[str] = None
    task_type: Optional[TaskType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    progress_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    status: Optional[TaskStatus] = None
    assigned_to: Optional[str] = None
    dependencies: Optional[List[int]] = None
    budget_amount: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    level: Optional[int] = None
    parent_task_id: Optional[int] = None
    is_milestone: Optional[bool] = None

class TaskResponse(TaskBase):
    task_id: int
    project_id: int
    progress_percentage: Decimal
    status: TaskStatus
    actual_cost: Decimal
    sort_order: int
    created_at: datetime
    updated_at: datetime
    
    # Calculated fields
    duration_days: int
    delay_days: int
    budget_consumption_rate: float
    
    class Config:
        from_attributes = True

class BudgetTrackingBase(BaseModel):
    category: BudgetCategory
    subcategory: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=255)
    planned_amount: Decimal = Field(default=0, ge=0)
    actual_amount: Decimal = Field(default=0, ge=0)
    committed_amount: Decimal = Field(default=0, ge=0)
    recorded_date: date = Field(default_factory=date.today)
    notes: Optional[str] = None

class BudgetTrackingCreate(BudgetTrackingBase):
    project_id: int
    task_id: Optional[int] = None

class BudgetTrackingResponse(BudgetTrackingBase):
    tracking_id: int
    project_id: int
    task_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChangeOrderBase(BaseModel):
    change_type: ChangeOrderType
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    reason: Optional[str] = None
    estimated_cost: Decimal = Field(default=0)
    estimated_duration_days: int = Field(default=0, ge=0)
    priority: Priority = Priority.MEDIUM
    requested_by: str = Field(..., min_length=1, max_length=100)
    impact_assessment: Optional[str] = None
    customer_approval_required: bool = True

class ChangeOrderCreate(ChangeOrderBase):
    project_id: int

class ChangeOrderResponse(ChangeOrderBase):
    change_order_id: int
    project_id: int
    change_order_number: str
    status: ChangeOrderStatus
    requested_date: date
    reviewed_by: Optional[str]
    reviewed_date: Optional[date]
    approved_by: Optional[str]
    approved_date: Optional[date]
    rejection_reason: Optional[str]
    customer_approved_date: Optional[date]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProjectOverviewResponse(BaseModel):
    project_id: int
    project_name: str
    status: str
    priority: str
    progress_percentage: float
    estimated_profit_rate: float
    budget_consumption_rate: float
    schedule_status: str
    budget_status: str
    total_tasks: int
    completed_tasks: int
    delayed_tasks: int
    change_orders_count: int
    pending_change_orders: int

class ProjectStatistics(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    delayed_projects: int
    total_budget: Decimal
    total_revenue: Decimal
    total_profit: Decimal
    average_profit_rate: float

# ==============================================
# Utility Functions
# ==============================================

def get_current_user_company_id() -> int:
    """現在のユーザーの会社IDを取得（認証システム連携予定）"""
    # TODO: 認証システムと連携
    return 1

def calculate_task_duration(start_date: date, end_date: date) -> int:
    """タスクの作業日数を計算"""
    return (end_date - start_date).days + 1

def calculate_delay_days(end_date: date, progress: float) -> int:
    """遅延日数を計算"""
    today = date.today()
    if end_date < today and progress < 100:
        return (today - end_date).days
    return 0

# ==============================================
# Project Endpoints
# ==============================================

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    db: Session = Depends(get_db),
    status: Optional[ProjectStatus] = None,
    priority: Optional[Priority] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """プロジェクト一覧取得"""
    company_id = get_current_user_company_id()
    
    query = db.query(Project).filter(Project.company_id == company_id)
    
    if status:
        query = query.filter(Project.status == status.value)
    if priority:
        query = query.filter(Project.priority == priority.value)
    
    projects = query.order_by(desc(Project.updated_at)).offset(skip).limit(limit).all()
    
    # 計算フィールドを追加
    result = []
    for project in projects:
        project_dict = project.__dict__.copy()
        project_dict['estimated_profit'] = project.estimated_profit
        project_dict['estimated_profit_rate'] = project.estimated_profit_rate
        project_dict['budget_consumption_rate'] = project.budget_consumption_rate
        project_dict['schedule_status'] = project.schedule_status
        project_dict['budget_status'] = project.budget_status
        result.append(ProjectResponse(**project_dict))
    
    return result

@router.get("/overview", response_model=List[ProjectOverviewResponse])
async def get_projects_overview(
    db: Session = Depends(get_db)
):
    """プロジェクト概要一覧（ダッシュボード用）"""
    company_id = get_current_user_company_id()
    
    # SQL直接実行でパフォーマンス最適化
    query = """
    SELECT 
        p.project_id,
        p.project_name,
        p.status,
        p.priority,
        p.progress_percentage,
        CASE 
            WHEN p.estimated_revenue > 0 THEN 
                ROUND(((p.estimated_revenue - p.total_budget) / p.estimated_revenue * 100)::NUMERIC, 2)
            ELSE 0 
        END AS estimated_profit_rate,
        CASE 
            WHEN p.total_budget > 0 THEN 
                ROUND((p.actual_cost / p.total_budget * 100)::NUMERIC, 2)
            ELSE 0 
        END AS budget_consumption_rate,
        CASE 
            WHEN p.end_date < CURRENT_DATE AND p.progress_percentage < 100 THEN '遅延'
            WHEN p.end_date = CURRENT_DATE AND p.progress_percentage < 100 THEN '要注意'
            WHEN p.progress_percentage = 100 THEN '完了'
            ELSE '正常'
        END AS schedule_status,
        CASE 
            WHEN p.actual_cost > p.total_budget THEN '予算超過'
            WHEN p.actual_cost > p.total_budget * 0.9 THEN '要注意'
            ELSE '正常'
        END AS budget_status,
        (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id) AS total_tasks,
        (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id AND status = '完了') AS completed_tasks,
        (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.project_id AND status = '遅延') AS delayed_tasks,
        (SELECT COUNT(*) FROM change_orders WHERE project_id = p.project_id) AS change_orders_count,
        (SELECT COUNT(*) FROM change_orders WHERE project_id = p.project_id AND status = '申請中') AS pending_change_orders
    FROM projects p
    WHERE p.company_id = :company_id
    ORDER BY p.updated_at DESC
    """
    
    result = db.execute(query, {"company_id": company_id}).fetchall()
    
    return [
        ProjectOverviewResponse(
            project_id=row[0],
            project_name=row[1],
            status=row[2],
            priority=row[3],
            progress_percentage=float(row[4]),
            estimated_profit_rate=float(row[5]),
            budget_consumption_rate=float(row[6]),
            schedule_status=row[7],
            budget_status=row[8],
            total_tasks=row[9],
            completed_tasks=row[10],
            delayed_tasks=row[11],
            change_orders_count=row[12],
            pending_change_orders=row[13]
        )
        for row in result
    ]

@router.get("/statistics", response_model=ProjectStatistics)
async def get_project_statistics(
    db: Session = Depends(get_db)
):
    """プロジェクト統計情報"""
    company_id = get_current_user_company_id()
    
    projects = db.query(Project).filter(Project.company_id == company_id).all()
    
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.status in ['進行中', '見積中']])
    completed_projects = len([p for p in projects if p.status == '完了'])
    delayed_projects = len([p for p in projects if p.schedule_status == '遅延'])
    
    total_budget = sum(p.total_budget for p in projects)
    total_revenue = sum(p.estimated_revenue for p in projects)
    total_profit = total_revenue - total_budget
    
    average_profit_rate = 0
    if total_revenue > 0:
        average_profit_rate = float((total_profit / total_revenue) * 100)
    
    return ProjectStatistics(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        delayed_projects=delayed_projects,
        total_budget=total_budget,
        total_revenue=total_revenue,
        total_profit=total_profit,
        average_profit_rate=average_profit_rate
    )

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db)
):
    """プロジェクト作成"""
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # 計算フィールドを追加してレスポンス
    project_dict = db_project.__dict__.copy()
    project_dict['estimated_profit'] = db_project.estimated_profit
    project_dict['estimated_profit_rate'] = db_project.estimated_profit_rate
    project_dict['budget_consumption_rate'] = db_project.budget_consumption_rate
    project_dict['schedule_status'] = db_project.schedule_status
    project_dict['budget_status'] = db_project.budget_status
    
    return ProjectResponse(**project_dict)

@router.post("/from-estimate/{estimate_id}", response_model=ProjectResponse)
async def create_project_from_estimate(
    estimate_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """見積からプロジェクト自動作成"""
    # TODO: 見積データ取得（worker1の見積システムと連携）
    # estimate = get_estimate(estimate_id)
    
    # 仮実装
    company_id = get_current_user_company_id()
    
    project_data = ProjectCreate(
        company_id=company_id,
        customer_id=1,  # TODO: 見積から取得
        estimate_id=estimate_id,
        project_name="見積からの自動プロジェクト",
        total_budget=Decimal('1000000'),
        estimated_revenue=Decimal('1500000'),
        start_date=date.today(),
        end_date=date.today()
    )
    
    return await create_project(project_data, db)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """プロジェクト詳細取得"""
    company_id = get_current_user_company_id()
    
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_dict = project.__dict__.copy()
    project_dict['estimated_profit'] = project.estimated_profit
    project_dict['estimated_profit_rate'] = project.estimated_profit_rate
    project_dict['budget_consumption_rate'] = project.budget_consumption_rate
    project_dict['schedule_status'] = project.schedule_status
    project_dict['budget_status'] = project.budget_status
    
    return ProjectResponse(**project_dict)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int = Path(...),
    project_update: ProjectUpdate = ...,
    db: Session = Depends(get_db)
):
    """プロジェクト更新"""
    company_id = get_current_user_company_id()
    
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 更新
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    project_dict = project.__dict__.copy()
    project_dict['estimated_profit'] = project.estimated_profit
    project_dict['estimated_profit_rate'] = project.estimated_profit_rate
    project_dict['budget_consumption_rate'] = project.budget_consumption_rate
    project_dict['schedule_status'] = project.schedule_status
    project_dict['budget_status'] = project.budget_status
    
    return ProjectResponse(**project_dict)

@router.delete("/{project_id}")
async def delete_project(
    project_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """プロジェクト削除"""
    company_id = get_current_user_company_id()
    
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

# ==============================================
# Task Endpoints
# ==============================================

@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
async def get_project_tasks(
    project_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """プロジェクトのタスク一覧取得（ガントチャート用）"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = db.query(ProjectTask).filter(
        ProjectTask.project_id == project_id
    ).order_by(ProjectTask.sort_order).all()
    
    # 計算フィールドを追加
    result = []
    for task in tasks:
        task_dict = task.__dict__.copy()
        task_dict['duration_days'] = task.duration_days
        task_dict['delay_days'] = task.delay_days
        task_dict['budget_consumption_rate'] = task.budget_consumption_rate
        result.append(TaskResponse(**task_dict))
    
    return result

@router.post("/{project_id}/tasks", response_model=TaskResponse)
async def create_task(
    project_id: int = Path(...),
    task: TaskCreate = ...,
    db: Session = Depends(get_db)
):
    """タスク作成"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # ソート順序を自動設定
    max_sort_order = db.query(func.max(ProjectTask.sort_order)).filter(
        ProjectTask.project_id == project_id
    ).scalar() or 0
    
    task_data = task.dict()
    task_data['project_id'] = project_id
    task_data['sort_order'] = max_sort_order + 1
    
    db_task = ProjectTask(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    task_dict = db_task.__dict__.copy()
    task_dict['duration_days'] = db_task.duration_days
    task_dict['delay_days'] = db_task.delay_days
    task_dict['budget_consumption_rate'] = db_task.budget_consumption_rate
    
    return TaskResponse(**task_dict)

@router.put("/{project_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: int = Path(...),
    task_id: int = Path(...),
    task_update: TaskUpdate = ...,
    db: Session = Depends(get_db)
):
    """タスク更新"""
    company_id = get_current_user_company_id()
    
    # プロジェクトとタスクの存在確認
    task = db.query(ProjectTask).join(Project).filter(
        and_(
            ProjectTask.task_id == task_id,
            ProjectTask.project_id == project_id,
            Project.company_id == company_id
        )
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 更新
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    task_dict = task.__dict__.copy()
    task_dict['duration_days'] = task.duration_days
    task_dict['delay_days'] = task.delay_days
    task_dict['budget_consumption_rate'] = task.budget_consumption_rate
    
    return TaskResponse(**task_dict)

# ==============================================
# Budget Tracking Endpoints
# ==============================================

@router.get("/{project_id}/budget", response_model=List[BudgetTrackingResponse])
async def get_project_budget(
    project_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """プロジェクト予実管理データ取得"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    budget_records = db.query(BudgetTracking).filter(
        BudgetTracking.project_id == project_id
    ).order_by(desc(BudgetTracking.recorded_date)).all()
    
    return budget_records

@router.post("/{project_id}/budget", response_model=BudgetTrackingResponse)
async def create_budget_record(
    project_id: int = Path(...),
    budget: BudgetTrackingCreate = ...,
    db: Session = Depends(get_db)
):
    """予実管理データ作成"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    budget_data = budget.dict()
    budget_data['project_id'] = project_id
    
    db_budget = BudgetTracking(**budget_data)
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    return db_budget

# ==============================================
# Change Order Endpoints
# ==============================================

@router.get("/{project_id}/change-orders", response_model=List[ChangeOrderResponse])
async def get_change_orders(
    project_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """変更指示書一覧取得"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    change_orders = db.query(ChangeOrder).filter(
        ChangeOrder.project_id == project_id
    ).order_by(desc(ChangeOrder.requested_date)).all()
    
    return change_orders

@router.post("/{project_id}/change-orders", response_model=ChangeOrderResponse)
async def create_change_order(
    project_id: int = Path(...),
    change_order: ChangeOrderCreate = ...,
    db: Session = Depends(get_db)
):
    """変更指示書作成"""
    company_id = get_current_user_company_id()
    
    # プロジェクトの存在確認
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    change_order_data = change_order.dict()
    change_order_data['project_id'] = project_id
    
    db_change_order = ChangeOrder(**change_order_data)
    db.add(db_change_order)
    db.commit()
    db.refresh(db_change_order)
    
    return db_change_order

@router.put("/{project_id}/change-orders/{change_order_id}/approve")
async def approve_change_order(
    project_id: int = Path(...),
    change_order_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """変更指示書承認"""
    company_id = get_current_user_company_id()
    
    change_order = db.query(ChangeOrder).join(Project).filter(
        and_(
            ChangeOrder.change_order_id == change_order_id,
            ChangeOrder.project_id == project_id,
            Project.company_id == company_id
        )
    ).first()
    
    if not change_order:
        raise HTTPException(status_code=404, detail="Change order not found")
    
    # 承認処理
    change_order.status = ChangeOrderStatus.APPROVED.value
    change_order.approved_date = date.today()
    change_order.approved_by = "承認者"  # TODO: 認証システムから取得
    
    # プロジェクト予算更新
    project = change_order.project
    project.total_budget += change_order.estimated_cost
    
    db.commit()
    
    return {"message": "Change order approved successfully"}

# ==============================================
# 完了
# ==============================================
# プロジェクト管理機能のFastAPI実装完了
# - RESTful API設計
# - マルチテナント対応
# - 型安全性確保（Pydantic）
# - エラーハンドリング
# - パフォーマンス最適化
# - 認証システム連携準備済み