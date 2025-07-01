"""
設定管理API - 造園業向け統合業務管理システム
会社情報・ユーザー管理・システム設定・セキュリティ設定のAPI
"""

from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import json

from database import get_db
from services.auth_service import get_current_user_dependency, require_owner_role, User

router = APIRouter(prefix="/api/settings", tags=["settings"])

# =============================================================================
# Pydanticモデル（設定用）
# =============================================================================

class CompanyInfoUpdate(BaseModel):
    """会社情報更新モデル"""
    company_name: Optional[str] = None
    postal_code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    business_license: Optional[str] = None
    representative_name: Optional[str] = None
    capital: Optional[int] = None
    established_date: Optional[str] = None
    business_hours: Optional[str] = None
    closed_days: Optional[str] = None
    logo_url: Optional[str] = None
    seal_url: Optional[str] = None
    business_description: Optional[str] = None
    specialties: Optional[List[str]] = None
    service_areas: Optional[List[str]] = None

class UserCreate(BaseModel):
    """ユーザー作成モデル"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., regex=r'^(owner|employee)$')
    phone: Optional[str] = None
    department: Optional[str] = None
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """ユーザー更新モデル"""
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class SecurityConfig(BaseModel):
    """セキュリティ設定モデル"""
    password_policy: Dict[str, Any] = Field(default_factory=dict)
    session_management: Dict[str, Any] = Field(default_factory=dict)
    authentication: Dict[str, Any] = Field(default_factory=dict)
    security_monitoring: Dict[str, Any] = Field(default_factory=dict)

class SystemConfig(BaseModel):
    """システム設定モデル"""
    general: Dict[str, Any] = Field(default_factory=dict)
    performance: Dict[str, Any] = Field(default_factory=dict)
    data_management: Dict[str, Any] = Field(default_factory=dict)
    business_settings: Dict[str, Any] = Field(default_factory=dict)

class NotificationConfig(BaseModel):
    """通知設定モデル"""
    id: str
    name: str
    description: str
    category: str
    enabled: bool
    channels: Dict[str, bool]
    triggers: Dict[str, Any]
    recipients: Dict[str, Any]
    schedule: Dict[str, Any]

class TemplateConfig(BaseModel):
    """テンプレート設定モデル"""
    id: Optional[str] = None
    name: str
    type: str = Field(..., regex=r'^(estimate|invoice)$')
    is_default: bool = False
    layout: Dict[str, Any]
    styling: Dict[str, Any]
    content: Dict[str, Any]
    landscaping_specific: Dict[str, Any]

# =============================================================================
# 会社情報管理API
# =============================================================================

@router.get("/company")
async def get_company_info(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """会社情報取得"""
    try:
        # TODO: データベースから会社情報を取得
        # company = db.query(Company).filter(Company.company_id == current_user.company_id).first()
        
        # デモデータ
        company_info = {
            "company_id": current_user.company_id,
            "company_name": "株式会社グリーンガーデン",
            "postal_code": "150-0001",
            "address": "東京都渋谷区神宮前1-1-1",
            "phone": "03-1234-5678",
            "email": "info@green-garden.co.jp",
            "fax": "03-1234-5679",
            "website": "https://green-garden.co.jp",
            "business_license": "東京都知事許可（般-1）第12345号",
            "representative_name": "田中 太郎",
            "capital": 10000000,
            "established_date": "2010-04-01",
            "business_hours": "8:00-17:00",
            "closed_days": "日曜日、祝日",
            "business_description": "造園工事・庭園設計・緑地管理を専門とする総合造園業",
            "specialties": ["庭園設計", "造園工事", "樹木剪定", "芝生管理", "外構工事"],
            "service_areas": ["東京都", "神奈川県", "埼玉県"],
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        return company_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"会社情報の取得に失敗しました: {str(e)}")

@router.put("/company")
async def update_company_info(
    company_data: CompanyInfoUpdate,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """会社情報更新（経営者のみ）"""
    try:
        # TODO: データベース更新
        # company = db.query(Company).filter(Company.company_id == current_user.company_id).first()
        # if not company:
        #     raise HTTPException(status_code=404, detail="会社情報が見つかりません")
        
        # for field, value in company_data.dict(exclude_unset=True).items():
        #     setattr(company, field, value)
        
        # db.commit()
        # db.refresh(company)
        
        return {"message": "会社情報が更新されました", "data": company_data.dict(exclude_unset=True)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"会社情報の更新に失敗しました: {str(e)}")

# =============================================================================
# ユーザー管理API
# =============================================================================

@router.get("/users")
async def get_users(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """ユーザー一覧取得（経営者のみ）"""
    try:
        # TODO: データベースからユーザー一覧を取得
        # users = db.query(User).filter(User.company_id == current_user.company_id).all()
        
        # デモデータ
        users = [
            {
                "user_id": 1,
                "username": "owner",
                "email": "owner@green-garden.co.jp",
                "full_name": "田中 太郎",
                "role": "owner",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "last_login": "2025-07-01T09:00:00Z",
                "phone": "090-1234-5678",
                "department": "経営陣"
            },
            {
                "user_id": 2,
                "username": "yamada",
                "email": "yamada@green-garden.co.jp",
                "full_name": "山田 花子",
                "role": "employee",
                "is_active": True,
                "created_at": "2024-02-01T00:00:00Z",
                "last_login": "2025-06-30T17:30:00Z",
                "phone": "090-2345-6789",
                "department": "営業部"
            }
        ]
        
        return users
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザー一覧の取得に失敗しました: {str(e)}")

@router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """ユーザー作成（経営者のみ）"""
    try:
        # TODO: パスワードハッシュ化とユーザー作成
        # from services.auth_service import hash_password
        # hashed_password = hash_password(user_data.password)
        
        # new_user = User(
        #     username=user_data.username,
        #     email=user_data.email,
        #     full_name=user_data.full_name,
        #     role=user_data.role,
        #     phone=user_data.phone,
        #     department=user_data.department,
        #     password_hash=hashed_password,
        #     company_id=current_user.company_id
        # )
        
        # db.add(new_user)
        # db.commit()
        # db.refresh(new_user)
        
        return {
            "message": "ユーザーが作成されました",
            "user_id": 999,  # デモ用
            "username": user_data.username
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザーの作成に失敗しました: {str(e)}")

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """ユーザー更新（経営者のみ）"""
    try:
        # TODO: データベース更新
        # user = db.query(User).filter(
        #     User.user_id == user_id,
        #     User.company_id == current_user.company_id
        # ).first()
        
        # if not user:
        #     raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
        
        # for field, value in user_data.dict(exclude_unset=True).items():
        #     setattr(user, field, value)
        
        # db.commit()
        # db.refresh(user)
        
        return {"message": "ユーザー情報が更新されました", "user_id": user_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザーの更新に失敗しました: {str(e)}")

@router.post("/users/invite")
async def invite_user(
    email: str,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """ユーザー招待メール送信（経営者のみ）"""
    try:
        # TODO: 招待メール送信
        # from services.email_service import send_invitation_email
        # await send_invitation_email(email, current_user.company_id)
        
        return {"message": f"招待メールを {email} に送信しました"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"招待メールの送信に失敗しました: {str(e)}")

# =============================================================================
# セキュリティ設定API
# =============================================================================

@router.get("/security")
async def get_security_config(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """セキュリティ設定取得（経営者のみ）"""
    try:
        # デモデータ
        security_config = {
            "password_policy": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special": True,
                "expiry_days": 90
            },
            "session_management": {
                "timeout_minutes": 480,
                "max_concurrent_sessions": 3,
                "remember_me_enabled": True,
                "remember_me_days": 30
            },
            "authentication": {
                "max_login_attempts": 5,
                "lockout_duration_minutes": 30,
                "two_factor_enabled": False,
                "email_verification_required": True
            },
            "security_monitoring": {
                "failed_login_alerts": True,
                "suspicious_activity_detection": True,
                "audit_log_retention_days": 365,
                "security_report_frequency": "weekly"
            }
        }
        
        return security_config
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"セキュリティ設定の取得に失敗しました: {str(e)}")

@router.put("/security")
async def update_security_config(
    config: SecurityConfig,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """セキュリティ設定更新（経営者のみ）"""
    try:
        # TODO: データベース更新
        return {"message": "セキュリティ設定が更新されました"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"セキュリティ設定の更新に失敗しました: {str(e)}")

# =============================================================================
# システム設定API
# =============================================================================

@router.get("/system")
async def get_system_config(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """システム設定取得（経営者のみ）"""
    try:
        # デモデータ
        system_config = {
            "general": {
                "app_name": "Garden DX",
                "app_version": "1.0.0",
                "timezone": "Asia/Tokyo",
                "date_format": "YYYY/MM/DD",
                "currency": "JPY",
                "language": "ja",
                "theme_mode": "light"
            },
            "performance": {
                "enable_caching": True,
                "cache_duration_hours": 24,
                "max_concurrent_users": 50,
                "page_size_default": 20,
                "api_timeout_seconds": 30
            },
            "data_management": {
                "auto_backup_enabled": True,
                "backup_frequency": "daily",
                "backup_retention_days": 30,
                "data_compression": True,
                "cleanup_old_data": True,
                "cleanup_threshold_days": 365
            },
            "business_settings": {
                "default_tax_rate": 10.0,
                "default_markup_rate": 1.3,
                "auto_estimate_numbering": True,
                "estimate_valid_days": 30,
                "invoice_payment_terms": 30,
                "show_cost_to_employees": False
            }
        }
        
        return system_config
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"システム設定の取得に失敗しました: {str(e)}")

@router.put("/system")
async def update_system_config(
    config: SystemConfig,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """システム設定更新（経営者のみ）"""
    try:
        # TODO: データベース更新
        return {"message": "システム設定が更新されました"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"システム設定の更新に失敗しました: {str(e)}")

@router.get("/system/status")
async def get_system_status(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """システム状態取得（経営者のみ）"""
    try:
        # デモデータ
        system_status = {
            "database_size": "245 MB",
            "total_users": 15,
            "total_estimates": 1284,
            "total_invoices": 856,
            "last_backup": "2025-07-01 03:00:00",
            "disk_usage": 45,
            "memory_usage": 32,
            "cpu_usage": 18,
            "uptime_hours": 168
        }
        
        return system_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"システム状態の取得に失敗しました: {str(e)}")

# =============================================================================
# 通知設定API
# =============================================================================

@router.get("/notifications")
async def get_notification_configs(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """通知設定取得"""
    try:
        # TODO: データベースから通知設定を取得
        # 現在はデモデータを返す
        return {"message": "通知設定取得API（実装予定）"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"通知設定の取得に失敗しました: {str(e)}")

# =============================================================================
# テンプレート設定API
# =============================================================================

@router.get("/templates")
async def get_templates(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """テンプレート一覧取得"""
    try:
        # TODO: データベースからテンプレート一覧を取得
        # 現在はデモデータを返す
        return {"message": "テンプレート取得API（実装予定）"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"テンプレートの取得に失敗しました: {str(e)}")

@router.post("/templates")
async def create_template(
    template: TemplateConfig,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """テンプレート作成"""
    try:
        # TODO: テンプレート作成処理
        return {"message": "テンプレートが作成されました", "template_id": "new_template_id"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"テンプレートの作成に失敗しました: {str(e)}")

# =============================================================================
# バックアップ・メンテナンスAPI
# =============================================================================

@router.post("/backup")
async def create_backup(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """手動バックアップ実行（経営者のみ）"""
    try:
        # TODO: バックアップ実行
        return {"message": "バックアップを開始しました", "backup_id": f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"バックアップの実行に失敗しました: {str(e)}")

@router.post("/maintenance")
async def toggle_maintenance_mode(
    enabled: bool,
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """メンテナンスモード切り替え（経営者のみ）"""
    try:
        # TODO: メンテナンスモード設定
        mode = "有効" if enabled else "無効"
        return {"message": f"メンテナンスモードを{mode}にしました", "maintenance_mode": enabled}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メンテナンスモードの切り替えに失敗しました: {str(e)}")

# =============================================================================
# セキュリティテストAPI
# =============================================================================

@router.post("/security/test")
async def run_security_test(
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """セキュリティテスト実行（経営者のみ）"""
    try:
        # TODO: セキュリティテスト実行
        test_results = {
            "overall_score": 96,
            "vulnerabilities_found": 0,
            "recommendations": [
                "セキュリティヘッダーの追加を推奨",
                "多要素認証の有効化を推奨"
            ],
            "test_timestamp": datetime.now().isoformat()
        }
        
        return test_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"セキュリティテストの実行に失敗しました: {str(e)}")

@router.post("/notifications/test")
async def send_test_notification(
    email: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """テスト通知送信"""
    try:
        # TODO: テストメール送信
        return {"message": f"テスト通知を {email} に送信しました"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"テスト通知の送信に失敗しました: {str(e)}")