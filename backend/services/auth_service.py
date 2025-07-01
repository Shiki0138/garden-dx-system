"""
Garden 造園業向け統合業務管理システム
認証・権限管理サービス - Worker4統合準備
RBAC (Role-Based Access Control) 実装
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging

from database import get_db

logger = logging.getLogger(__name__)

# セキュリティ設定
SECRET_KEY = "garden-system-super-secret-key-2025"  # 本番では環境変数から取得
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8時間

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# =============================================================================
# ユーザー・権限モデル（Worker4統合準備）
# =============================================================================

Base = declarative_base()

class User(Base):
    """ユーザーテーブル"""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="employee")  # "owner", "employee"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # リレーション
    company = relationship("Company", back_populates="users")

class Role(Base):
    """権限ロールテーブル"""
    __tablename__ = "roles"
    
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255))
    permissions = Column(String(1000))  # JSON文字列で権限リスト保存
    created_at = Column(DateTime, default=datetime.utcnow)

# =============================================================================
# 権限定義（造園業界標準）
# =============================================================================

# 造園業界標準権限マトリクス
GARDEN_PERMISSIONS = {
    "owner": {
        "estimates": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": True,
            "view_cost": True,           # 仕入原価閲覧
            "view_profit": True,         # 粗利率閲覧
            "adjust_total": True,        # 最終調整（値引き）
            "approve": True,             # 見積承認
            "pdf_generate": True,        # PDF生成
        },
        "customers": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": True,
        },
        "price_master": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": True,
            "view_cost": True,           # 仕入単価閲覧
        },
        "invoices": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": True,
            "issue": True,               # 請求書発行
            "pdf_generate": True,        # PDF生成
        },
        "projects": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": True,
            "view_budget": True,         # 予算閲覧
            "view_actual": True,         # 実績原価閲覧
        },
        "dashboard": {
            "profitability": True,       # 収益性ダッシュボード
            "financial": True,           # 財務情報
        },
        "system": {
            "settings": True,            # システム設定
            "user_management": True,     # ユーザー管理
        }
    },
    "employee": {
        "estimates": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": False,             # 削除不可
            "view_cost": False,          # 仕入原価見えない
            "view_profit": False,        # 粗利率見えない
            "adjust_total": False,       # 最終調整不可
            "approve": False,            # 承認不可
            "pdf_generate": True,        # PDF生成可能
        },
        "customers": {
            "view": True,
            "create": True,
            "edit": True,
            "delete": False,
        },
        "price_master": {
            "view": True,                # 品目名・単価は見える
            "create": False,
            "edit": False,
            "delete": False,
            "view_cost": False,          # 仕入単価見えない
        },
        "invoices": {
            "view": False,               # 請求書は見えない
            "create": False,
            "edit": False,
            "delete": False,
            "issue": False,              # 請求書発行不可
            "pdf_generate": False,
        },
        "projects": {
            "view": True,
            "create": False,
            "edit": True,                # 進捗更新可能
            "delete": False,
            "view_budget": False,        # 予算見えない
            "view_actual": False,        # 実績原価見えない
        },
        "dashboard": {
            "profitability": False,      # 収益性見えない
            "financial": False,          # 財務情報見えない
        },
        "system": {
            "settings": False,
            "user_management": False,
        }
    }
}

# =============================================================================
# 認証サービスクラス
# =============================================================================

class AuthService:
    """認証・権限管理サービス"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """パスワード検証"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """パスワードハッシュ化"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """JWTアクセストークン生成"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """ユーザー認証"""
        user = db.query(User).filter(User.username == username).first()
        if not user or not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def get_current_user(db: Session, token: str) -> User:
        """現在ログイン中ユーザー取得"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報が無効です",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
        
        return user

# =============================================================================
# 権限チェック関数
# =============================================================================

class PermissionChecker:
    """権限チェッククラス"""
    
    @staticmethod
    def has_permission(user: User, resource: str, action: str) -> bool:
        """
        権限チェック
        
        Args:
            user: ユーザーオブジェクト
            resource: リソース名 (estimates, customers, etc.)
            action: アクション名 (view, create, edit, etc.)
            
        Returns:
            bool: 権限があるかどうか
        """
        if not user.is_active:
            return False
        
        user_role = user.role
        if user_role not in GARDEN_PERMISSIONS:
            return False
        
        permissions = GARDEN_PERMISSIONS[user_role]
        if resource not in permissions:
            return False
        
        return permissions[resource].get(action, False)
    
    @staticmethod
    def check_estimate_permission(user: User, action: str) -> bool:
        """見積関連権限チェック"""
        return PermissionChecker.has_permission(user, "estimates", action)
    
    @staticmethod
    def check_cost_view_permission(user: User) -> bool:
        """原価情報閲覧権限チェック"""
        return user.role == "owner"
    
    @staticmethod
    def check_profit_view_permission(user: User) -> bool:
        """利益情報閲覧権限チェック"""
        return user.role == "owner"
    
    @staticmethod
    def check_invoice_permission(user: User, action: str) -> bool:
        """請求書関連権限チェック"""
        return PermissionChecker.has_permission(user, "invoices", action)
    
    @staticmethod
    def filter_estimate_data_by_permission(user: User, estimate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        権限に基づく見積データフィルタリング
        
        Args:
            user: ユーザーオブジェクト
            estimate_data: 見積データ
            
        Returns:
            フィルタリング済み見積データ
        """
        if user.role == "owner":
            # 経営者：全データ表示
            return estimate_data
        
        # 従業員：機密情報を隠す
        filtered_data = estimate_data.copy()
        
        # 原価情報を隠す
        if "total_cost" in filtered_data:
            del filtered_data["total_cost"]
        if "gross_profit" in filtered_data:
            del filtered_data["gross_profit"]
        if "gross_profit_rate" in filtered_data:
            del filtered_data["gross_profit_rate"]
        
        # 明細の原価情報を隠す
        if "items" in filtered_data:
            for item in filtered_data["items"]:
                if "purchase_price" in item:
                    del item["purchase_price"]
                if "line_cost" in item:
                    del item["line_cost"]
                if "markup_rate" in item:
                    del item["markup_rate"]
        
        return filtered_data

# =============================================================================
# FastAPI依存関数
# =============================================================================

async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在ユーザー取得依存関数"""
    token = credentials.credentials
    return AuthService.get_current_user(db, token)

def require_permission(resource: str, action: str):
    """権限要求デコレータ"""
    def permission_checker(user: User = Depends(get_current_user_dependency)):
        if not PermissionChecker.has_permission(user, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"権限がありません: {resource}.{action}"
            )
        return user
    return permission_checker

def require_owner_role():
    """経営者権限要求"""
    def owner_checker(user: User = Depends(get_current_user_dependency)):
        if user.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="経営者権限が必要です"
            )
        return user
    return owner_checker

# =============================================================================
# 見積エンジン権限統合関数
# =============================================================================

def apply_estimate_permissions(user: User, estimate_data: Dict[str, Any]) -> Dict[str, Any]:
    """見積データに権限フィルターを適用"""
    return PermissionChecker.filter_estimate_data_by_permission(user, estimate_data)

def get_user_accessible_features(user: User) -> Dict[str, Any]:
    """ユーザーがアクセス可能な機能一覧取得"""
    if user.role not in GARDEN_PERMISSIONS:
        return {}
    
    permissions = GARDEN_PERMISSIONS[user.role]
    
    # フロントエンド用の機能フラグ
    features = {
        "can_view_costs": permissions["estimates"].get("view_cost", False),
        "can_view_profits": permissions["estimates"].get("view_profit", False),
        "can_adjust_total": permissions["estimates"].get("adjust_total", False),
        "can_approve_estimates": permissions["estimates"].get("approve", False),
        "can_issue_invoices": permissions["invoices"].get("issue", False),
        "can_manage_users": permissions["system"].get("user_management", False),
        "can_view_dashboard": permissions["dashboard"].get("profitability", False),
        "role": user.role,
        "role_display": "経営者" if user.role == "owner" else "従業員"
    }
    
    return features