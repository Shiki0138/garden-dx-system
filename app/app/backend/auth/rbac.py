"""
Garden DX - RBAC (Role-Based Access Control) システム
経営者・従業員権限分離実装
"""

from enum import Enum
from typing import Dict, List, Optional, Callable
from functools import wraps
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
import json

class UserRole(str, Enum):
    """ユーザーロール定義"""
    OWNER = "owner"      # 経営者（親方）
    EMPLOYEE = "employee"  # 従業員

class Permission(str, Enum):
    """権限定義"""
    # 顧客管理
    CUSTOMER_READ = "customer:read"
    CUSTOMER_WRITE = "customer:write"
    CUSTOMER_DELETE = "customer:delete"
    
    # 見積管理
    ESTIMATE_READ = "estimate:read"
    ESTIMATE_WRITE = "estimate:write"
    ESTIMATE_DELETE = "estimate:delete"
    ESTIMATE_APPROVE = "estimate:approve"
    
    # 原価・利益情報
    COST_READ = "cost:read"
    PROFIT_READ = "profit:read"
    MARGIN_READ = "margin:read"
    
    # 価格調整
    PRICE_ADJUST_ITEM = "price:adjust_item"      # 明細ごとの調整
    PRICE_ADJUST_TOTAL = "price:adjust_total"    # 合計調整（値引き）
    
    # 単価マスタ
    PRICE_MASTER_READ = "price_master:read"
    PRICE_MASTER_WRITE = "price_master:write"
    PRICE_MASTER_DELETE = "price_master:delete"
    
    # プロジェクト管理
    PROJECT_READ = "project:read"
    PROJECT_WRITE = "project:write"
    PROJECT_DELETE = "project:delete"
    
    # 請求書
    INVOICE_READ = "invoice:read"
    INVOICE_WRITE = "invoice:write"
    INVOICE_DELETE = "invoice:delete"
    INVOICE_ISSUE = "invoice:issue"
    
    # 収益性ダッシュボード
    DASHBOARD_PROFIT = "dashboard:profit"
    DASHBOARD_ANALYSIS = "dashboard:analysis"
    
    # システム設定
    SYSTEM_SETTINGS = "system:settings"
    USER_MANAGE = "user:manage"

class RBACManager:
    """RBAC管理クラス"""
    
    def __init__(self):
        self.role_permissions: Dict[UserRole, List[Permission]] = {
            # 経営者（親方）- フルアクセス
            UserRole.OWNER: [
                # 顧客管理
                Permission.CUSTOMER_READ,
                Permission.CUSTOMER_WRITE,
                Permission.CUSTOMER_DELETE,
                
                # 見積管理
                Permission.ESTIMATE_READ,
                Permission.ESTIMATE_WRITE,
                Permission.ESTIMATE_DELETE,
                Permission.ESTIMATE_APPROVE,
                
                # 原価・利益情報（経営者のみ）
                Permission.COST_READ,
                Permission.PROFIT_READ,
                Permission.MARGIN_READ,
                
                # 価格調整
                Permission.PRICE_ADJUST_ITEM,
                Permission.PRICE_ADJUST_TOTAL,  # 最終調整は経営者のみ
                
                # 単価マスタ
                Permission.PRICE_MASTER_READ,
                Permission.PRICE_MASTER_WRITE,
                Permission.PRICE_MASTER_DELETE,
                
                # プロジェクト管理
                Permission.PROJECT_READ,
                Permission.PROJECT_WRITE,
                Permission.PROJECT_DELETE,
                
                # 請求書
                Permission.INVOICE_READ,
                Permission.INVOICE_WRITE,
                Permission.INVOICE_DELETE,
                Permission.INVOICE_ISSUE,  # 請求書発行は経営者のみ
                
                # 収益性ダッシュボード（経営者のみ）
                Permission.DASHBOARD_PROFIT,
                Permission.DASHBOARD_ANALYSIS,
                
                # システム設定（経営者のみ）
                Permission.SYSTEM_SETTINGS,
                Permission.USER_MANAGE,
            ],
            
            # 従業員 - 制限付きアクセス
            UserRole.EMPLOYEE: [
                # 顧客管理
                Permission.CUSTOMER_READ,
                Permission.CUSTOMER_WRITE,
                
                # 見積管理
                Permission.ESTIMATE_READ,
                Permission.ESTIMATE_WRITE,
                
                # 価格調整（明細のみ、合計調整は不可）
                Permission.PRICE_ADJUST_ITEM,
                
                # 単価マスタ（閲覧のみ）
                Permission.PRICE_MASTER_READ,
                
                # プロジェクト管理
                Permission.PROJECT_READ,
                Permission.PROJECT_WRITE,
                
                # 請求書（閲覧のみ）
                Permission.INVOICE_READ,
            ]
        }
    
    def has_permission(self, user_role: UserRole, permission: Permission) -> bool:
        """ユーザーロールが指定された権限を持つかチェック"""
        return permission in self.role_permissions.get(user_role, [])
    
    def get_user_permissions(self, user_role: UserRole) -> List[Permission]:
        """ユーザーロールの全権限を取得"""
        return self.role_permissions.get(user_role, [])
    
    def check_permission(self, user_role: UserRole, permission: Permission) -> None:
        """権限チェック（例外発生）"""
        if not self.has_permission(user_role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"権限が不足しています。必要な権限: {permission.value}"
            )

# グローバルRBACマネージャーインスタンス
rbac_manager = RBACManager()

def require_permission(permission: Permission):
    """権限チェックデコレータ"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # リクエストから現在のユーザー情報を取得
            request: Request = kwargs.get('request') or args[0] if args else None
            if not request:
                raise HTTPException(status_code=500, detail="リクエスト情報が取得できません")
            
            # JWTトークンからユーザー情報を取得（実装済みの関数を使用）
            from .jwt_auth import get_current_user
            current_user = await get_current_user(request)
            
            # 権限チェック
            rbac_manager.check_permission(UserRole(current_user.role), permission)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(required_role: UserRole):
    """ロールチェックデコレータ"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request') or args[0] if args else None
            if not request:
                raise HTTPException(status_code=500, detail="リクエスト情報が取得できません")
            
            from .jwt_auth import get_current_user
            current_user = await get_current_user(request)
            
            if UserRole(current_user.role) != required_role:
                raise HTTPException(
                    status_code=403,
                    detail=f"この機能は{required_role.value}のみ利用可能です"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# 主要機能別の権限チェック関数
def check_cost_access(user_role: UserRole) -> bool:
    """原価情報アクセス権限チェック"""
    return rbac_manager.has_permission(user_role, Permission.COST_READ)

def check_profit_access(user_role: UserRole) -> bool:
    """利益情報アクセス権限チェック"""
    return rbac_manager.has_permission(user_role, Permission.PROFIT_READ)

def check_final_adjustment_access(user_role: UserRole) -> bool:
    """最終調整額権限チェック"""
    return rbac_manager.has_permission(user_role, Permission.PRICE_ADJUST_TOTAL)

def check_invoice_issue_access(user_role: UserRole) -> bool:
    """請求書発行権限チェック"""
    return rbac_manager.has_permission(user_role, Permission.INVOICE_ISSUE)

def check_dashboard_access(user_role: UserRole) -> bool:
    """収益性ダッシュボードアクセス権限チェック"""
    return rbac_manager.has_permission(user_role, Permission.DASHBOARD_PROFIT)

# フロントエンド用権限情報API
def get_user_permissions_dict(user_role: UserRole) -> Dict[str, bool]:
    """フロントエンド用の権限辞書を生成"""
    permissions = rbac_manager.get_user_permissions(user_role)
    return {
        # 基本権限
        "canViewCosts": Permission.COST_READ in permissions,
        "canViewProfits": Permission.PROFIT_READ in permissions,
        "canAdjustTotal": Permission.PRICE_ADJUST_TOTAL in permissions,
        "canIssueInvoice": Permission.INVOICE_ISSUE in permissions,
        "canViewDashboard": Permission.DASHBOARD_PROFIT in permissions,
        "canManageUsers": Permission.USER_MANAGE in permissions,
        "canManageSystem": Permission.SYSTEM_SETTINGS in permissions,
        
        # 詳細権限
        "canEditPriceMaster": Permission.PRICE_MASTER_WRITE in permissions,
        "canDeleteCustomers": Permission.CUSTOMER_DELETE in permissions,
        "canDeleteProjects": Permission.PROJECT_DELETE in permissions,
        "canApproveEstimates": Permission.ESTIMATE_APPROVE in permissions,
        
        # 読み取り権限
        "canReadEstimates": Permission.ESTIMATE_READ in permissions,
        "canReadProjects": Permission.PROJECT_READ in permissions,
        "canReadInvoices": Permission.INVOICE_READ in permissions,
    }

# 権限チェック用ミドルウェア関数
async def check_endpoint_permission(request: Request, required_permission: Permission):
    """エンドポイント用権限チェック"""
    try:
        from .jwt_auth import get_current_user
        current_user = await get_current_user(request)
        rbac_manager.check_permission(UserRole(current_user.role), required_permission)
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"権限チェックエラー: {str(e)}")

# 条件付き表示用権限チェック
def filter_data_by_role(data: Dict, user_role: UserRole) -> Dict:
    """ロールに応じてデータをフィルタリング"""
    filtered_data = data.copy()
    
    # 従業員の場合は原価・利益情報を除去
    if user_role == UserRole.EMPLOYEE:
        # 原価情報の除去
        if 'purchase_price' in filtered_data:
            del filtered_data['purchase_price']
        if 'total_cost' in filtered_data:
            del filtered_data['total_cost']
        if 'line_cost' in filtered_data:
            del filtered_data['line_cost']
            
        # 利益情報の除去
        if 'gross_profit' in filtered_data:
            del filtered_data['gross_profit']
        if 'gross_margin_rate' in filtered_data:
            del filtered_data['gross_margin_rate']
        if 'markup_rate' in filtered_data:
            del filtered_data['markup_rate']
            
        # 調整額の制限
        if 'adjustment_amount' in filtered_data:
            del filtered_data['adjustment_amount']
    
    return filtered_data

# 権限マトリクス表示用関数
def get_rbac_matrix() -> Dict[str, Dict[str, bool]]:
    """RBAC権限マトリクスを取得"""
    matrix = {}
    
    for role in UserRole:
        permissions = rbac_manager.get_user_permissions(role)
        matrix[role.value] = {
            "顧客情報の閲覧・編集": Permission.CUSTOMER_WRITE in permissions,
            "見積の作成・編集": Permission.ESTIMATE_WRITE in permissions,
            "仕入原価・粗利率の閲覧": Permission.COST_READ in permissions,
            "単価マスタの編集": Permission.PRICE_MASTER_WRITE in permissions,
            "明細ごとの調整額入力": Permission.PRICE_ADJUST_ITEM in permissions,
            "見積合計に対する最終調整": Permission.PRICE_ADJUST_TOTAL in permissions,
            "収益性ダッシュボード閲覧": Permission.DASHBOARD_PROFIT in permissions,
            "請求書の発行": Permission.INVOICE_ISSUE in permissions,
            "システム全体の設定変更": Permission.SYSTEM_SETTINGS in permissions,
        }
    
    return matrix