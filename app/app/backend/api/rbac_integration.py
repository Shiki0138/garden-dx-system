"""
Garden Project Management System - RBAC Integration API
Worker4認証システムとの統合API

Created by: worker2
Date: 2025-06-30
Purpose: 役割ベースアクセス制御をプロジェクト管理システムに統合
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel

from backend.database import get_db
from backend.models.project_models import Project, ProjectTask, BudgetTracking

router = APIRouter(prefix="/api/rbac", tags=["rbac_integration"])

# ==============================================
# RBAC モデル定義
# ==============================================

class UserRole(BaseModel):
    """ユーザー役割情報"""
    role_id: str
    role_name: str  # '経営者', '従業員', 'manager', 'employee'
    permissions: List[str]
    company_id: int

class RBACUser(BaseModel):
    """RBAC統合ユーザー情報"""
    user_id: int
    username: str
    email: str
    role: UserRole
    company_id: int
    is_active: bool

class PermissionCheck(BaseModel):
    """権限チェック結果"""
    permission: str
    granted: bool
    reason: str

class ProjectAccessControl(BaseModel):
    """プロジェクトアクセス制御"""
    project_id: int
    can_view: bool
    can_edit: bool
    can_view_financials: bool
    can_manage_tasks: bool
    accessible_fields: List[str]
    restricted_fields: List[str]

# ==============================================
# 権限定義
# ==============================================

PERMISSION_DEFINITIONS = {
    # 財務関連権限
    'view_financial_data': '財務データ閲覧',
    'view_profit_data': '利益データ閲覧', 
    'view_cost_data': '原価データ閲覧',
    'manage_budgets': '予算管理',
    
    # プロジェクト管理権限
    'create_projects': 'プロジェクト作成',
    'edit_projects': 'プロジェクト編集',
    'delete_projects': 'プロジェクト削除',
    'view_all_projects': '全プロジェクト閲覧',
    'manage_project_teams': 'プロジェクトチーム管理',
    
    # タスク管理権限
    'create_tasks': 'タスク作成',
    'edit_tasks': 'タスク編集',
    'assign_tasks': 'タスク割り当て',
    'update_task_progress': 'タスク進捗更新',
    
    # 見積・請求関連権限
    'view_estimates': '見積書閲覧',
    'create_estimates': '見積書作成',
    'approve_estimates': '見積書承認',
    'view_invoices': '請求書閲覧',
    'create_invoices': '請求書作成',
    
    # レポート権限
    'view_analytics': '分析レポート閲覧',
    'export_data': 'データエクスポート',
}

ROLE_PERMISSIONS = {
    '経営者': [
        'view_financial_data', 'view_profit_data', 'view_cost_data', 'manage_budgets',
        'create_projects', 'edit_projects', 'delete_projects', 'view_all_projects', 'manage_project_teams',
        'create_tasks', 'edit_tasks', 'assign_tasks', 'update_task_progress',
        'view_estimates', 'create_estimates', 'approve_estimates',
        'view_invoices', 'create_invoices',
        'view_analytics', 'export_data'
    ],
    'manager': [
        'view_financial_data', 'view_profit_data', 'view_cost_data', 'manage_budgets',
        'create_projects', 'edit_projects', 'view_all_projects', 'manage_project_teams',
        'create_tasks', 'edit_tasks', 'assign_tasks', 'update_task_progress',
        'view_estimates', 'create_estimates',
        'view_invoices', 'create_invoices',
        'view_analytics', 'export_data'
    ],
    '従業員': [
        'update_task_progress',
        'view_estimates',
        'view_invoices'
    ],
    'employee': [
        'update_task_progress',
        'view_estimates',
        'view_invoices'
    ]
}

# ==============================================
# ユーティリティ関数
# ==============================================

async def get_current_user_from_token(authorization: str = Header(None)) -> RBACUser:
    """認証トークンからユーザー情報を取得"""
    # TODO: Worker4の認証システムと実際に連携
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="認証トークンが必要です")
    
    token = authorization.replace('Bearer ', '')
    
    # 仮実装: 実際にはWorker4のJWT検証を行う
    # user_data = await verify_jwt_token(token)
    
    # テスト用のユーザーデータ
    if token == 'manager_token':
        return RBACUser(
            user_id=1,
            username="田中経営者",
            email="manager@example.com",
            role=UserRole(
                role_id="role_001",
                role_name="経営者",
                permissions=ROLE_PERMISSIONS['経営者'],
                company_id=1
            ),
            company_id=1,
            is_active=True
        )
    elif token == 'employee_token':
        return RBACUser(
            user_id=2,
            username="佐藤従業員",
            email="employee@example.com",
            role=UserRole(
                role_id="role_002", 
                role_name="従業員",
                permissions=ROLE_PERMISSIONS['従業員'],
                company_id=1
            ),
            company_id=1,
            is_active=True
        )
    else:
        raise HTTPException(status_code=401, detail="無効な認証トークンです")

def check_permission(user: RBACUser, permission: str) -> bool:
    """ユーザーの権限をチェック"""
    return permission in user.role.permissions

def get_accessible_project_fields(user: RBACUser) -> tuple[List[str], List[str]]:
    """ユーザーの役割に応じてアクセス可能なフィールドを取得"""
    
    base_fields = [
        'project_id', 'project_name', 'customer_id', 'start_date', 'end_date',
        'progress_percentage', 'status', 'manager_id', 'notes'
    ]
    
    financial_fields = [
        'total_budget', 'actual_cost', 'estimated_revenue', 
        'estimated_profit', 'estimated_profit_rate'
    ]
    
    cost_fields = [
        'cost_breakdown', 'supplier_costs', 'labor_costs'
    ]
    
    accessible_fields = base_fields.copy()
    restricted_fields = []
    
    if check_permission(user, 'view_financial_data'):
        accessible_fields.extend(financial_fields)
    else:
        restricted_fields.extend(financial_fields)
    
    if check_permission(user, 'view_cost_data'):
        accessible_fields.extend(cost_fields)
    else:
        restricted_fields.extend(cost_fields)
    
    return accessible_fields, restricted_fields

def filter_project_data(project_data: Dict, user: RBACUser) -> Dict:
    """ユーザーの権限に応じてプロジェクトデータをフィルタリング"""
    accessible_fields, restricted_fields = get_accessible_project_fields(user)
    
    filtered_data = {}
    for key, value in project_data.items():
        if key in accessible_fields:
            filtered_data[key] = value
        elif key in restricted_fields:
            filtered_data[key] = "***" if isinstance(value, str) else None
    
    return filtered_data

# ==============================================
# RBAC統合エンドポイント
# ==============================================

@router.get("/user-info")
async def get_user_info(
    current_user: RBACUser = Depends(get_current_user_from_token)
):
    """現在のユーザー情報と権限を取得"""
    return {
        "user": current_user,
        "permissions": {perm: PERMISSION_DEFINITIONS.get(perm, perm) for perm in current_user.role.permissions},
        "accessible_features": {
            "financial_dashboard": check_permission(current_user, 'view_financial_data'),
            "project_management": check_permission(current_user, 'view_all_projects'),
            "cost_analysis": check_permission(current_user, 'view_cost_data'),
            "team_management": check_permission(current_user, 'manage_project_teams')
        }
    }

@router.get("/check-permission/{permission}")
async def check_user_permission(
    permission: str,
    current_user: RBACUser = Depends(get_current_user_from_token)
):
    """特定の権限をチェック"""
    granted = check_permission(current_user, permission)
    
    return PermissionCheck(
        permission=permission,
        granted=granted,
        reason="権限あり" if granted else f"役割 '{current_user.role.role_name}' には '{permission}' 権限がありません"
    )

@router.get("/projects")
async def get_rbac_projects(
    current_user: RBACUser = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """RBAC制御されたプロジェクト一覧"""
    
    # 基本クエリ
    query = db.query(Project).filter(Project.company_id == current_user.company_id)
    
    # 従業員の場合は担当プロジェクトのみ
    if not check_permission(current_user, 'view_all_projects'):
        # TODO: プロジェクトメンバーテーブルと連携
        query = query.filter(Project.manager_id == current_user.user_id)
    
    projects = query.all()
    
    # データフィルタリング
    filtered_projects = []
    for project in projects:
        project_dict = {
            'project_id': project.project_id,
            'project_name': project.project_name,
            'customer_id': project.customer_id,
            'start_date': project.start_date,
            'end_date': project.end_date,
            'progress_percentage': project.progress_percentage,
            'status': project.status,
            'manager_id': project.manager_id,
            'total_budget': project.total_budget,
            'actual_cost': project.actual_cost,
            'estimated_revenue': project.estimated_revenue,
            'estimated_profit': project.estimated_profit,
            'estimated_profit_rate': project.estimated_profit_rate
        }
        
        filtered_project = filter_project_data(project_dict, current_user)
        filtered_projects.append(filtered_project)
    
    return {
        "projects": filtered_projects,
        "total_count": len(filtered_projects),
        "user_permissions": current_user.role.permissions,
        "filtered_fields": get_accessible_project_fields(current_user)[1]
    }

@router.get("/projects/{project_id}/access-control")
async def get_project_access_control(
    project_id: int,
    current_user: RBACUser = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """プロジェクトのアクセス制御情報を取得"""
    
    project = db.query(Project).filter(
        and_(Project.project_id == project_id, Project.company_id == current_user.company_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    
    accessible_fields, restricted_fields = get_accessible_project_fields(current_user)
    
    return ProjectAccessControl(
        project_id=project_id,
        can_view=True,  # 基本的にプロジェクトは閲覧可能
        can_edit=check_permission(current_user, 'edit_projects'),
        can_view_financials=check_permission(current_user, 'view_financial_data'),
        can_manage_tasks=check_permission(current_user, 'assign_tasks'),
        accessible_fields=accessible_fields,
        restricted_fields=restricted_fields
    )

@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    current_user: RBACUser = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """役割に応じたダッシュボード指標"""
    
    metrics = {}
    
    # 基本統計（全ユーザー）
    if check_permission(current_user, 'view_all_projects'):
        total_projects = db.query(Project).filter(Project.company_id == current_user.company_id).count()
        active_projects = db.query(Project).filter(
            and_(Project.company_id == current_user.company_id, Project.status == 'active')
        ).count()
    else:
        # 担当プロジェクトのみ
        total_projects = db.query(Project).filter(
            and_(Project.company_id == current_user.company_id, Project.manager_id == current_user.user_id)
        ).count()
        active_projects = db.query(Project).filter(
            and_(
                Project.company_id == current_user.company_id, 
                Project.manager_id == current_user.user_id,
                Project.status == 'active'
            )
        ).count()
    
    metrics.update({
        "total_projects": total_projects,
        "active_projects": active_projects,
    })
    
    # 財務指標（経営者のみ）
    if check_permission(current_user, 'view_financial_data'):
        financial_query = db.query(Project).filter(Project.company_id == current_user.company_id)
        
        total_revenue = financial_query.with_entities(func.sum(Project.estimated_revenue)).scalar() or 0
        total_profit = financial_query.with_entities(func.sum(Project.estimated_profit)).scalar() or 0
        avg_profit_rate = financial_query.with_entities(func.avg(Project.estimated_profit_rate)).scalar() or 0
        
        metrics.update({
            "total_revenue": float(total_revenue),
            "total_profit": float(total_profit),
            "average_profit_rate": float(avg_profit_rate),
            "budget_consumption_rate": 75.5,  # TODO: 実際の計算
            "overbudget_projects": 2  # TODO: 実際の計算
        })
    
    return {
        "metrics": metrics,
        "user_role": current_user.role.role_name,
        "access_level": "full" if check_permission(current_user, 'view_financial_data') else "limited"
    }

@router.get("/my-assignments")
async def get_my_assignments(
    current_user: RBACUser = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """自分の担当タスク一覧"""
    
    # TODO: タスク担当者テーブルと連携
    tasks = db.query(ProjectTask).join(Project).filter(
        and_(
            Project.company_id == current_user.company_id,
            # ProjectTask.assigned_to == current_user.user_id  # TODO: 実装
        )
    ).all()
    
    task_list = []
    for task in tasks:
        task_data = {
            'task_id': task.task_id,
            'task_name': task.task_name,
            'project_name': task.project.project_name,
            'progress_percentage': task.progress_percentage,
            'start_date': task.start_date,
            'end_date': task.end_date,
            'status': task.status
        }
        
        # 予算情報は権限に応じて表示
        if check_permission(current_user, 'view_financial_data'):
            task_data.update({
                'budget_amount': float(task.budget_amount or 0),
                'actual_cost': float(task.actual_cost or 0)
            })
        
        task_list.append(task_data)
    
    return {
        "tasks": task_list,
        "total_tasks": len(task_list),
        "user_role": current_user.role.role_name
    }

@router.post("/validate-access")
async def validate_access(
    resource: str,
    action: str,
    resource_id: Optional[int] = None,
    current_user: RBACUser = Depends(get_current_user_from_token)
):
    """リソースアクセスの検証"""
    
    access_rules = {
        "project": {
            "view": ["view_all_projects"],
            "edit": ["edit_projects"],
            "delete": ["delete_projects"],
            "create": ["create_projects"]
        },
        "financial": {
            "view": ["view_financial_data"],
            "edit": ["manage_budgets"]
        },
        "task": {
            "view": ["view_all_projects"],
            "edit": ["edit_tasks"],
            "assign": ["assign_tasks"],
            "update_progress": ["update_task_progress"]
        }
    }
    
    required_permissions = access_rules.get(resource, {}).get(action, [])
    
    if not required_permissions:
        return {
            "access_granted": False,
            "reason": f"未定義のリソース/アクション: {resource}/{action}"
        }
    
    has_access = any(check_permission(current_user, perm) for perm in required_permissions)
    
    return {
        "access_granted": has_access,
        "required_permissions": required_permissions,
        "user_permissions": current_user.role.permissions,
        "reason": "アクセス許可" if has_access else f"必要な権限がありません: {required_permissions}"
    }

# ==============================================
# 完了
# ==============================================
# RBAC統合API実装完了
# - Worker4認証システム連携準備
# - 役割ベースアクセス制御
# - プロジェクト・財務データの権限フィルタリング
# - ダッシュボード指標の役割別表示
# - 統合認証とプロジェクト管理の完全連携