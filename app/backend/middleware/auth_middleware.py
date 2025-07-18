"""
認証・権限チェックミドルウェア（Worker4統合準備）
"""

from functools import wraps
from typing import List, Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import get_db

# セキュリティスキーム
security = HTTPBearer()

# 権限定義（useAuth.jsと同期）
class Permissions:
    # 請求書関連権限
    INVOICE_CREATE = 'invoice:create'
    INVOICE_EDIT = 'invoice:edit'
    INVOICE_VIEW = 'invoice:view'
    INVOICE_DELETE = 'invoice:delete'
    INVOICE_SEND = 'invoice:send'
    
    # 見積書関連権限
    ESTIMATE_CREATE = 'estimate:create'
    ESTIMATE_EDIT = 'estimate:edit'
    ESTIMATE_VIEW = 'estimate:view'
    ESTIMATE_PRICE_VIEW = 'estimate:price_view'
    
    # プロジェクト管理権限
    PROJECT_CREATE = 'project:create'
    PROJECT_EDIT = 'project:edit'
    PROJECT_VIEW = 'project:view'
    PROJECT_PROFIT_VIEW = 'project:profit_view'
    
    # マスタ管理権限
    MASTER_EDIT = 'master:edit'
    MASTER_VIEW = 'master:view'
    
    # 顧客管理権限
    CUSTOMER_CREATE = 'customer:create'
    CUSTOMER_EDIT = 'customer:edit'
    CUSTOMER_VIEW = 'customer:view'
    
    # システム管理権限
    SYSTEM_ADMIN = 'system:admin'
    USER_MANAGE = 'user:manage'

# 役割定義
class UserRoles:
    MANAGER = 'manager'     # 経営者（親方）
    EMPLOYEE = 'employee'   # 従業員
    VIEWER = 'viewer'       # 閲覧者

# 役割別権限マッピング
ROLE_PERMISSIONS = {
    UserRoles.MANAGER: [
        # 経営者：全権限
        Permissions.INVOICE_CREATE,
        Permissions.INVOICE_EDIT,
        Permissions.INVOICE_VIEW,
        Permissions.INVOICE_DELETE,
        Permissions.INVOICE_SEND,
        Permissions.ESTIMATE_CREATE,
        Permissions.ESTIMATE_EDIT,
        Permissions.ESTIMATE_VIEW,
        Permissions.ESTIMATE_PRICE_VIEW,
        Permissions.PROJECT_CREATE,
        Permissions.PROJECT_EDIT,
        Permissions.PROJECT_VIEW,
        Permissions.PROJECT_PROFIT_VIEW,
        Permissions.MASTER_EDIT,
        Permissions.MASTER_VIEW,
        Permissions.CUSTOMER_CREATE,
        Permissions.CUSTOMER_EDIT,
        Permissions.CUSTOMER_VIEW,
        Permissions.SYSTEM_ADMIN,
        Permissions.USER_MANAGE
    ],
    UserRoles.EMPLOYEE: [
        # 従業員：制限付き権限
        Permissions.INVOICE_VIEW,
        Permissions.ESTIMATE_CREATE,
        Permissions.ESTIMATE_EDIT,
        Permissions.ESTIMATE_VIEW,
        Permissions.PROJECT_CREATE,
        Permissions.PROJECT_EDIT,
        Permissions.PROJECT_VIEW,
        Permissions.MASTER_VIEW,
        Permissions.CUSTOMER_CREATE,
        Permissions.CUSTOMER_EDIT,
        Permissions.CUSTOMER_VIEW
    ],
    UserRoles.VIEWER: [
        # 閲覧者：参照のみ
        Permissions.INVOICE_VIEW,
        Permissions.ESTIMATE_VIEW,
        Permissions.PROJECT_VIEW,
        Permissions.MASTER_VIEW,
        Permissions.CUSTOMER_VIEW
    ]
}

class CurrentUser:
    """現在のユーザー情報"""
    def __init__(self, user_id: int, email: str, role: str, company_id: int, permissions: List[str]):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.company_id = company_id
        self.permissions = permissions
    
    def has_permission(self, permission: str) -> bool:
        """権限チェック"""
        return permission in self.permissions
    
    def has_role(self, role: str) -> bool:
        """役割チェック"""
        return self.role == role
    
    def is_manager(self) -> bool:
        """経営者権限チェック"""
        return self.role == UserRoles.MANAGER
    
    def is_employee(self) -> bool:
        """従業員権限チェック"""
        return self.role == UserRoles.EMPLOYEE

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> CurrentUser:
    """
    現在のユーザー情報を取得
    Worker4のJWT認証システムと連携
    """
    try:
        token = credentials.credentials
        
        # TODO: Worker4のJWT検証APIと連携
        # 現在は仮のユーザー情報を返す
        mock_user_data = {
            'user_id': 1,
            'email': 'tanaka@landscaping.co.jp',
            'role': UserRoles.MANAGER,
            'company_id': 1
        }
        
        # 役割に基づく権限を取得
        permissions = ROLE_PERMISSIONS.get(mock_user_data['role'], [])
        
        return CurrentUser(
            user_id=mock_user_data['user_id'],
            email=mock_user_data['email'],
            role=mock_user_data['role'],
            company_id=mock_user_data['company_id'],
            permissions=permissions
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_company_id(current_user: CurrentUser = Depends(get_current_user)) -> int:
    """現在のユーザーの会社IDを取得"""
    return current_user.company_id

def require_permission(permission: str):
    """
    権限チェックデコレータ
    指定された権限を持つユーザーのみアクセス可能
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # current_userをkwargsから取得
            current_user = kwargs.get('current_user')
            if not current_user:
                # Dependsから取得を試行
                for arg in args:
                    if isinstance(arg, CurrentUser):
                        current_user = arg
                        break
            
            if not current_user or not current_user.has_permission(permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"権限が不足しています。必要権限: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role: str):
    """
    役割チェックデコレータ
    指定された役割を持つユーザーのみアクセス可能
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                for arg in args:
                    if isinstance(arg, CurrentUser):
                        current_user = arg
                        break
            
            if not current_user or not current_user.has_role(role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"必要な役割がありません。必要役割: {role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_manager():
    """経営者権限チェックデコレータ"""
    return require_role(UserRoles.MANAGER)

# 請求書専用権限チェック関数
async def require_invoice_create(current_user: CurrentUser = Depends(get_current_user)):
    """請求書作成権限チェック"""
    if not current_user.has_permission(Permissions.INVOICE_CREATE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="請求書の作成権限がありません。経営者にお問い合わせください。"
        )
    return current_user

async def require_invoice_edit(current_user: CurrentUser = Depends(get_current_user)):
    """請求書編集権限チェック"""
    if not current_user.has_permission(Permissions.INVOICE_EDIT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="請求書の編集権限がありません。経営者にお問い合わせください。"
        )
    return current_user

async def require_invoice_send(current_user: CurrentUser = Depends(get_current_user)):
    """請求書送付権限チェック"""
    if not current_user.has_permission(Permissions.INVOICE_SEND):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="請求書の送付権限がありません。経営者にお問い合わせください。"
        )
    return current_user

# マルチテナント対応の会社データフィルタリング
def filter_by_company(query, current_user: CurrentUser):
    """
    クエリに会社IDフィルタを追加
    マルチテナント対応
    """
    return query.filter_by(company_id=current_user.company_id)

# Worker4統合テスト用の認証バイパス（開発時のみ）
BYPASS_AUTH_FOR_TESTING = False  # 本番では必ずFalse

async def get_current_user_bypass() -> CurrentUser:
    """テスト用認証バイパス（開発時のみ）"""
    if not BYPASS_AUTH_FOR_TESTING:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です"
        )
    
    return CurrentUser(
        user_id=1,
        email='test@landscaping.co.jp',
        role=UserRoles.MANAGER,
        company_id=1,
        permissions=ROLE_PERMISSIONS[UserRoles.MANAGER]
    )