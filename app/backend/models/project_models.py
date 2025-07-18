"""
Garden Project Management System - Database Models
プロジェクト管理機能用SQLAlchemyモデル定義

Created by: worker2
Date: 2025-06-30
Purpose: 史上最強の造園業向けプロジェクト管理システムのデータモデル
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum

from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Decimal as SQLDecimal,
    Boolean, ForeignKey, CheckConstraint, Index, event
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func

Base = declarative_base()

# ==============================================
# Enumクラス定義
# ==============================================

class ProjectStatus(str, Enum):
    """プロジェクトステータス"""
    ESTIMATING = "見積中"
    IN_PROGRESS = "進行中" 
    COMPLETED = "完了"
    INVOICED = "請求済"
    LOST = "失注"
    SUSPENDED = "中断"

class TaskStatus(str, Enum):
    """タスクステータス"""
    NOT_STARTED = "未開始"
    IN_PROGRESS = "進行中"
    COMPLETED = "完了"
    DELAYED = "遅延"
    SUSPENDED = "中断"

class TaskType(str, Enum):
    """タスクタイプ"""
    WORK = "作業"
    MILESTONE = "マイルストーン"
    APPROVAL = "承認"
    INSPECTION = "検査"

class Priority(str, Enum):
    """優先度"""
    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"

class ChangeOrderType(str, Enum):
    """変更指示タイプ"""
    ADDITION = "追加"
    MODIFICATION = "変更"
    DELETION = "削除"
    SPECIFICATION_CHANGE = "仕様変更"

class ChangeOrderStatus(str, Enum):
    """変更指示ステータス"""
    REQUESTED = "申請中"
    ESTIMATING = "見積中"
    PENDING_APPROVAL = "承認待ち"
    APPROVED = "承認済"
    REJECTED = "却下"
    IN_PROGRESS = "実行中"
    COMPLETED = "完了"

class BudgetCategory(str, Enum):
    """予算カテゴリ"""
    MATERIALS = "材料費"
    LABOR = "人件費"
    SUBCONTRACT = "外注費"
    OTHER = "その他"

class BudgetStatus(str, Enum):
    """予算ステータス"""
    PLANNED = "計画"
    ORDERED = "発注済"
    EXECUTED = "実行済"
    CANCELLED = "キャンセル"

# ==============================================
# マルチテナント基盤モデル
# ==============================================

class Company(Base):
    """会社（マルチテナント）"""
    __tablename__ = 'companies'
    
    company_id = Column(Integer, primary_key=True)
    company_name = Column(String(255), nullable=False)
    company_code = Column(String(20), unique=True, nullable=False)
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    logo_url = Column(String(500))
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # リレーション
    projects = relationship("Project", back_populates="company")

# ==============================================
# プロジェクト管理 中核モデル
# ==============================================

class Project(Base):
    """プロジェクト（案件）"""
    __tablename__ = 'projects'
    
    project_id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    customer_id = Column(Integer, nullable=False)  # customers テーブル参照
    estimate_id = Column(Integer)  # estimates テーブル参照
    project_name = Column(String(255), nullable=False)
    project_description = Column(Text)
    site_address = Column(String(255))
    status = Column(String(50), default=ProjectStatus.IN_PROGRESS.value)
    priority = Column(String(20), default=Priority.MEDIUM.value)
    start_date = Column(Date)
    end_date = Column(Date)
    planned_end_date = Column(Date)  # 当初計画完了日
    total_budget = Column(SQLDecimal(12, 0), default=0)  # 実行予算（原価）
    estimated_revenue = Column(SQLDecimal(12, 0), default=0)  # 見積金額（売上）
    actual_cost = Column(SQLDecimal(12, 0), default=0)  # 実績原価
    progress_percentage = Column(SQLDecimal(5, 2), default=0)
    manager_id = Column(Integer)  # 担当者ID
    notes = Column(Text)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # 制約
    __table_args__ = (
        CheckConstraint('status IN (\'見積中\', \'進行中\', \'完了\', \'請求済\', \'失注\', \'中断\')', name='check_project_status'),
        CheckConstraint('priority IN (\'高\', \'中\', \'低\')', name='check_project_priority'),
        CheckConstraint('progress_percentage BETWEEN 0 AND 100', name='check_progress_percentage'),
        Index('idx_projects_company_id', 'company_id'),
        Index('idx_projects_status', 'status'),
        Index('idx_projects_dates', 'start_date', 'end_date'),
    )
    
    # リレーション
    company = relationship("Company", back_populates="projects")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    budget_records = relationship("BudgetTracking", back_populates="project", cascade="all, delete-orphan")
    change_orders = relationship("ChangeOrder", back_populates="project", cascade="all, delete-orphan")
    
    @validates('status')
    def validate_status(self, key, status):
        if status not in [s.value for s in ProjectStatus]:
            raise ValueError(f"Invalid project status: {status}")
        return status
    
    @validates('priority')
    def validate_priority(self, key, priority):
        if priority not in [p.value for p in Priority]:
            raise ValueError(f"Invalid priority: {priority}")
        return priority
    
    @property
    def estimated_profit(self) -> Decimal:
        """見積利益額"""
        return self.estimated_revenue - self.total_budget
    
    @property
    def estimated_profit_rate(self) -> float:
        """見積利益率（%）"""
        if self.estimated_revenue > 0:
            return float((self.estimated_profit / self.estimated_revenue) * 100)
        return 0.0
    
    @property
    def budget_consumption_rate(self) -> float:
        """予算消化率（%）"""
        if self.total_budget > 0:
            return float((self.actual_cost / self.total_budget) * 100)
        return 0.0
    
    @property
    def schedule_status(self) -> str:
        """スケジュールステータス"""
        today = date.today()
        if self.end_date and self.end_date < today and self.progress_percentage < 100:
            return "遅延"
        elif self.end_date and self.end_date == today and self.progress_percentage < 100:
            return "要注意"
        elif self.progress_percentage == 100:
            return "完了"
        return "正常"
    
    @property
    def budget_status(self) -> str:
        """予算ステータス"""
        if self.actual_cost > self.total_budget:
            return "予算超過"
        elif self.actual_cost > self.total_budget * Decimal('0.9'):
            return "要注意"
        return "正常"

class ProjectTask(Base):
    """プロジェクトタスク（工程）"""
    __tablename__ = 'project_tasks'
    
    task_id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    task_name = Column(String(255), nullable=False)
    task_description = Column(Text)
    task_type = Column(String(50), default=TaskType.WORK.value)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    planned_start_date = Column(Date)  # 当初計画開始日
    planned_end_date = Column(Date)  # 当初計画完了日
    progress_percentage = Column(SQLDecimal(5, 2), default=0)
    status = Column(String(50), default=TaskStatus.NOT_STARTED.value)
    assigned_to = Column(String(100))  # 担当者名
    dependencies = Column(Text)  # JSON array of task_ids
    budget_amount = Column(SQLDecimal(10, 0), default=0)
    actual_cost = Column(SQLDecimal(10, 0), default=0)
    sort_order = Column(Integer, default=0)
    level = Column(Integer, default=0)  # 階層レベル
    parent_task_id = Column(Integer, ForeignKey('project_tasks.task_id'))
    is_milestone = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # 制約
    __table_args__ = (
        CheckConstraint('task_type IN (\'作業\', \'マイルストーン\', \'承認\', \'検査\')', name='check_task_type'),
        CheckConstraint('status IN (\'未開始\', \'進行中\', \'完了\', \'遅延\', \'中断\')', name='check_task_status'),
        CheckConstraint('progress_percentage BETWEEN 0 AND 100', name='check_task_progress'),
        CheckConstraint('level >= 0', name='check_task_level'),
        Index('idx_project_tasks_project_id', 'project_id'),
        Index('idx_project_tasks_dates', 'start_date', 'end_date'),
        Index('idx_project_tasks_status', 'status'),
        Index('idx_project_tasks_parent', 'parent_task_id'),
    )
    
    # リレーション
    project = relationship("Project", back_populates="tasks")
    parent_task = relationship("ProjectTask", remote_side=[task_id], back_populates="child_tasks")
    child_tasks = relationship("ProjectTask", back_populates="parent_task")
    budget_records = relationship("BudgetTracking", back_populates="task")
    
    @validates('task_type')
    def validate_task_type(self, key, task_type):
        if task_type not in [t.value for t in TaskType]:
            raise ValueError(f"Invalid task type: {task_type}")
        return task_type
    
    @validates('status')
    def validate_status(self, key, status):
        if status not in [s.value for s in TaskStatus]:
            raise ValueError(f"Invalid task status: {status}")
        return status
    
    @property
    def duration_days(self) -> int:
        """作業日数"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0
    
    @property
    def delay_days(self) -> int:
        """遅延日数"""
        today = date.today()
        if self.end_date and self.end_date < today and self.progress_percentage < 100:
            return (today - self.end_date).days
        return 0
    
    @property
    def budget_consumption_rate(self) -> float:
        """予算消化率（%）"""
        if self.budget_amount > 0:
            return float((self.actual_cost / self.budget_amount) * 100)
        return 0.0

# ==============================================
# 予実管理モデル
# ==============================================

class BudgetTracking(Base):
    """予実管理"""
    __tablename__ = 'budget_tracking'
    
    tracking_id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    task_id = Column(Integer, ForeignKey('project_tasks.task_id', ondelete='SET NULL'))
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100))
    description = Column(String(255), nullable=False)
    planned_amount = Column(SQLDecimal(10, 0), nullable=False, default=0)
    actual_amount = Column(SQLDecimal(10, 0), nullable=False, default=0)
    committed_amount = Column(SQLDecimal(10, 0), default=0)  # 発注済金額
    purchase_order_id = Column(Integer)  # 発注書ID
    invoice_id = Column(Integer)  # 請求書ID
    recorded_date = Column(Date, nullable=False, default=func.current_date())
    transaction_type = Column(String(20), default='支出')
    status = Column(String(50), default=BudgetStatus.PLANNED.value)
    notes = Column(Text)
    created_by = Column(Integer)  # 記録者ID
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # 制約
    __table_args__ = (
        CheckConstraint('category IN (\'材料費\', \'人件費\', \'外注費\', \'その他\')', name='check_budget_category'),
        CheckConstraint('transaction_type IN (\'支出\', \'収入\')', name='check_transaction_type'),
        CheckConstraint('status IN (\'計画\', \'発注済\', \'実行済\', \'キャンセル\')', name='check_budget_status'),
        Index('idx_budget_tracking_project_id', 'project_id'),
        Index('idx_budget_tracking_task_id', 'task_id'),
        Index('idx_budget_tracking_category', 'category'),
        Index('idx_budget_tracking_date', 'recorded_date'),
    )
    
    # リレーション
    project = relationship("Project", back_populates="budget_records")
    task = relationship("ProjectTask", back_populates="budget_records")
    
    @validates('category')
    def validate_category(self, key, category):
        if category not in [c.value for c in BudgetCategory]:
            raise ValueError(f"Invalid budget category: {category}")
        return category
    
    @validates('status')
    def validate_status(self, key, status):
        if status not in [s.value for s in BudgetStatus]:
            raise ValueError(f"Invalid budget status: {status}")
        return status

# ==============================================
# 変更・増工管理モデル
# ==============================================

class ChangeOrder(Base):
    """変更指示書"""
    __tablename__ = 'change_orders'
    
    change_order_id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    change_order_number = Column(String(50), unique=True)  # 自動生成
    change_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    reason = Column(Text)
    estimated_cost = Column(SQLDecimal(10, 0), default=0)
    estimated_duration_days = Column(Integer, default=0)
    status = Column(String(50), default=ChangeOrderStatus.REQUESTED.value)
    priority = Column(String(20), default=Priority.MEDIUM.value)
    requested_by = Column(String(100), nullable=False)
    requested_date = Column(Date, nullable=False, default=func.current_date())
    reviewed_by = Column(String(100))
    reviewed_date = Column(Date)
    approved_by = Column(String(100))
    approved_date = Column(Date)
    rejection_reason = Column(Text)
    impact_assessment = Column(Text)
    customer_approval_required = Column(Boolean, default=True)
    customer_approved_date = Column(Date)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # 制約
    __table_args__ = (
        CheckConstraint('change_type IN (\'追加\', \'変更\', \'削除\', \'仕様変更\')', name='check_change_type'),
        CheckConstraint('status IN (\'申請中\', \'見積中\', \'承認待ち\', \'承認済\', \'却下\', \'実行中\', \'完了\')', name='check_change_status'),
        CheckConstraint('priority IN (\'高\', \'中\', \'低\')', name='check_change_priority'),
        Index('idx_change_orders_project_id', 'project_id'),
        Index('idx_change_orders_status', 'status'),
        Index('idx_change_orders_date', 'requested_date'),
    )
    
    # リレーション
    project = relationship("Project", back_populates="change_orders")
    
    @validates('change_type')
    def validate_change_type(self, key, change_type):
        if change_type not in [t.value for t in ChangeOrderType]:
            raise ValueError(f"Invalid change order type: {change_type}")
        return change_type
    
    @validates('status')
    def validate_status(self, key, status):
        if status not in [s.value for s in ChangeOrderStatus]:
            raise ValueError(f"Invalid change order status: {status}")
        return status
    
    @validates('priority')
    def validate_priority(self, key, priority):
        if priority not in [p.value for p in Priority]:
            raise ValueError(f"Invalid priority: {priority}")
        return priority

# ==============================================
# イベントリスナー（自動計算）
# ==============================================

@event.listens_for(ProjectTask, 'after_insert')
@event.listens_for(ProjectTask, 'after_update')
@event.listens_for(ProjectTask, 'after_delete')
def update_project_progress(mapper, connection, target):
    """タスク更新時にプロジェクト進捗を自動計算"""
    if isinstance(target, ProjectTask):
        project_id = target.project_id
    else:
        return
    
    # プロジェクト進捗率計算（大項目タスクのみで計算）
    stmt = """
    UPDATE projects 
    SET progress_percentage = (
        SELECT COALESCE(AVG(progress_percentage), 0)
        FROM project_tasks 
        WHERE project_id = :project_id
        AND parent_task_id IS NULL
    ),
    actual_cost = (
        SELECT COALESCE(SUM(actual_cost), 0)
        FROM project_tasks 
        WHERE project_id = :project_id
    )
    WHERE project_id = :project_id
    """
    connection.execute(stmt, project_id=project_id)

# ==============================================
# ユーティリティ関数
# ==============================================

def generate_change_order_number(session, project_id: int, company_code: str) -> str:
    """変更指示書番号自動生成"""
    # 連番取得
    result = session.execute(
        """
        SELECT COALESCE(MAX(
            CAST(RIGHT(change_order_number, 3) AS INTEGER)
        ), 0) + 1
        FROM change_orders 
        WHERE project_id = :project_id
        """,
        {"project_id": project_id}
    ).scalar()
    
    next_number = result or 1
    
    # 変更指示書番号生成: {COMPANY_CODE}-{PROJECT_ID}-CHG-{001}
    return f"{company_code}-{project_id}-CHG-{next_number:03d}"

# ==============================================
# 初期化関数
# ==============================================

def create_tables(engine):
    """テーブル作成"""
    Base.metadata.create_all(bind=engine)

def drop_tables(engine):
    """テーブル削除（開発用）"""
    Base.metadata.drop_all(bind=engine)

# ==============================================
# 完了
# ==============================================
# プロジェクト管理機能のSQLAlchemyモデル定義完了
# - マルチテナント対応
# - 型安全性確保（Pydantic連携可能）
# - 自動計算機能付き
# - バリデーション機能付き
# - リレーション完全定義
# - インデックス最適化済み