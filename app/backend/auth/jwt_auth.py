"""
Garden DX - JWT認証システム
高セキュリティJWT実装
"""

import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, validator
import os
from sqlalchemy.orm import Session
import secrets
import hashlib
import time
import logging
from datetime import datetime, timedelta, timezone

# JWT設定
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8時間
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7日間

# パスワードハッシュ化設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTPBearer認証
security = HTTPBearer()

class Token(BaseModel):
    """JWTトークンレスポンス"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    role: str
    permissions: list

class TokenData(BaseModel):
    """JWTトークンデータ"""
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None

class UserAuth(BaseModel):
    """認証ユーザー情報"""
    user_id: int
    username: str
    email: str
    role: str
    company_id: int
    full_name: str
    is_active: bool

class LoginRequest(BaseModel):
    """ログインリクエスト"""
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('ユーザー名は必須です')
        if len(v) > 50:
            raise ValueError('ユーザー名は50文字以下である必要があります')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) == 0:
            raise ValueError('パスワードは必須です')
        if len(v) < 3:  # ログイン時は緩い制限
            raise ValueError('パスワードは3文字以上である必要があります')
        return v

class PasswordChangeRequest(BaseModel):
    """パスワード変更リクエスト"""
    current_password: str
    new_password: str
    confirm_password: str

class JWTAuthManager:
    """JWT認証マネージャー"""
    
    def __init__(self):
        self.secret_key = JWT_SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.access_token_expire_minutes = JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = JWT_REFRESH_TOKEN_EXPIRE_DAYS
        
        # ログ設定
        self.logger = logging.getLogger("garden_jwt_auth")
        
        # セッション管理用（インメモリ、本番ではRedis推奨）
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.refresh_tokens: Dict[str, Dict[str, Any]] = {}
        
        # パフォーマンス監視
        self.token_generation_times: List[float] = []
        self.token_verification_times: List[float] = []
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """パスワード検証"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """パスワードハッシュ化"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """アクセストークン生成"""
        start_time = time.time()
        
        try:
            to_encode = data.copy()
            now = datetime.now(timezone.utc)
            expire = now + timedelta(minutes=self.access_token_expire_minutes)
            
            # 追加セキュリティクレーム
            to_encode.update({
                "exp": expire,
                "iat": now,
                "nbf": now,  # Not Before
                "type": "access",
                "jti": secrets.token_urlsafe(16),  # JWT ID
                "iss": "garden-dx",  # Issuer
                "aud": "garden-api"  # Audience
            })
            
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            
            # セッション管理
            session_id = hashlib.sha256(encoded_jwt.encode()).hexdigest()[:16]
            self.active_sessions[session_id] = {
                "user_id": data.get("user_id"),
                "username": data.get("sub"),
                "role": data.get("role"),
                "company_id": data.get("company_id"),
                "created_at": now,
                "expires_at": expire,
                "token_hash": session_id,
                "jti": to_encode["jti"]
            }
            
            # パフォーマンス監視
            generation_time = time.time() - start_time
            self.token_generation_times.append(generation_time)
            if len(self.token_generation_times) > 1000:
                self.token_generation_times = self.token_generation_times[-1000:]
            
            self.logger.info(f"アクセストークン生成成功: user_id={data.get('user_id')}, time={generation_time:.3f}s")
            
            return encoded_jwt
            
        except Exception as e:
            self.logger.error(f"アクセストークン生成エラー: {str(e)}")
            raise HTTPException(status_code=500, detail="トークン生成に失敗しました")
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """リフレッシュトークン生成"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        })
        
        refresh_token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        # リフレッシュトークン管理
        token_id = hashlib.sha256(refresh_token.encode()).hexdigest()[:16]
        self.refresh_tokens[token_id] = {
            "user_id": data.get("user_id"),
            "username": data.get("sub"),
            "created_at": datetime.now(timezone.utc),
            "expires_at": expire,
            "is_active": True
        }
        
        return refresh_token
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """トークン検証"""
        start_time = time.time()
        
        try:
            # JWT基本検証
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True
                },
                audience="garden-api",
                issuer="garden-dx"
            )
            
            # トークンタイプ確認
            token_type = payload.get("type")
            if token_type not in ["access", "refresh"]:
                self.logger.warning(f"無効なトークンタイプ: {token_type}")
                return None
            
            # JTI確認（トークンの一意性）
            jti = payload.get("jti")
            if not jti:
                self.logger.warning("JTI が見つかりません")
                return None
            
            # アクセストークンの場合はセッション確認
            if token_type == "access":
                token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
                if token_hash not in self.active_sessions:
                    self.logger.warning(f"セッションが見つかりません: {token_hash}")
                    return None
                
                session = self.active_sessions[token_hash]
                if session["expires_at"] < datetime.now(timezone.utc):
                    self.logger.info(f"セッション期限切れ: {token_hash}")
                    del self.active_sessions[token_hash]
                    return None
                
                # JTI一致確認
                if session.get("jti") != jti:
                    self.logger.warning(f"JTI不一致: session={session.get('jti')}, token={jti}")
                    return None
            
            # パフォーマンス監視
            verification_time = time.time() - start_time
            self.token_verification_times.append(verification_time)
            if len(self.token_verification_times) > 1000:
                self.token_verification_times = self.token_verification_times[-1000:]
            
            if verification_time > 0.1:  # 100ms以上の場合警告
                self.logger.warning(f"トークン検証が遅い: {verification_time:.3f}s")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            self.logger.info("トークンの期限切れ")
            return None
        except jwt.InvalidTokenError as e:
            self.logger.warning(f"無効なトークン: {str(e)}")
            return None
        except Exception as e:
            self.logger.error(f"トークン検証エラー: {str(e)}")
            return None
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[UserAuth]:
        """ユーザー認証"""
        # データベースからユーザー取得（実際の実装では適切なモデルを使用）
        # ここではサンプル実装
        from ..main import users_table  # 仮のテーブル参照
        
        try:
            # SQLAlchemyクエリ
            user = db.query(users_table).filter(
                users_table.username == username,
                users_table.is_active == True
            ).first()
            
            if not user:
                return None
            
            if not self.verify_password(password, user.password_hash):
                return None
            
            return UserAuth(
                user_id=user.user_id,
                username=user.username,
                email=user.email,
                role=user.role,
                company_id=user.company_id,
                full_name=user.full_name,
                is_active=user.is_active
            )
            
        except Exception:
            return None
    
    def generate_tokens(self, user: UserAuth) -> Token:
        """トークンペア生成"""
        # RBAC権限取得
        from .rbac import rbac_manager, UserRole
        permissions = rbac_manager.get_user_permissions(UserRole(user.role))
        
        token_data = {
            "user_id": user.user_id,
            "sub": user.username,
            "role": user.role,
            "company_id": user.company_id,
            "email": user.email
        }
        
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire_minutes * 60,
            user_id=user.user_id,
            role=user.role,
            permissions=[p.value for p in permissions]
        )
    
    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """アクセストークンリフレッシュ"""
        payload = self.verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None
        
        # リフレッシュトークン確認
        token_id = hashlib.sha256(refresh_token.encode()).hexdigest()[:16]
        if token_id not in self.refresh_tokens:
            return None
        
        refresh_data = self.refresh_tokens[token_id]
        if not refresh_data["is_active"]:
            return None
        
        # 新しいアクセストークン生成
        token_data = {
            "user_id": payload.get("user_id"),
            "sub": payload.get("sub"),
            "role": payload.get("role"),
            "company_id": payload.get("company_id"),
            "email": payload.get("email")
        }
        
        return self.create_access_token(token_data)
    
    def logout(self, token: str) -> bool:
        """ログアウト"""
        payload = self.verify_token(token)
        if not payload:
            return False
        
        # セッション削除
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        if token_hash in self.active_sessions:
            del self.active_sessions[token_hash]
        
        return True
    
    def logout_all_sessions(self, user_id: int) -> bool:
        """全セッションログアウト"""
        sessions_to_remove = []
        for session_id, session in self.active_sessions.items():
            if session["user_id"] == user_id:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.active_sessions[session_id]
        
        # リフレッシュトークンも無効化
        tokens_to_remove = []
        for token_id, token_data in self.refresh_tokens.items():
            if token_data["user_id"] == user_id:
                tokens_to_remove.append(token_id)
        
        for token_id in tokens_to_remove:
            self.refresh_tokens[token_id]["is_active"] = False
        
        return True
    
    def get_active_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """アクティブセッション一覧"""
        sessions = []
        for session_id, session in self.active_sessions.items():
            if session["user_id"] == user_id:
                sessions.append({
                    "session_id": session_id,
                    "created_at": session["created_at"],
                    "expires_at": session["expires_at"]
                })
        return sessions
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """認証システムパフォーマンス指標取得"""
        if not self.token_generation_times and not self.token_verification_times:
            return {
                "token_generation": {"count": 0, "avg_time": 0, "max_time": 0},
                "token_verification": {"count": 0, "avg_time": 0, "max_time": 0},
                "active_sessions": 0,
                "refresh_tokens": 0
            }
        
        generation_metrics = {}
        if self.token_generation_times:
            generation_metrics = {
                "count": len(self.token_generation_times),
                "avg_time": sum(self.token_generation_times) / len(self.token_generation_times),
                "max_time": max(self.token_generation_times),
                "min_time": min(self.token_generation_times)
            }
        else:
            generation_metrics = {"count": 0, "avg_time": 0, "max_time": 0, "min_time": 0}
        
        verification_metrics = {}
        if self.token_verification_times:
            verification_metrics = {
                "count": len(self.token_verification_times),
                "avg_time": sum(self.token_verification_times) / len(self.token_verification_times),
                "max_time": max(self.token_verification_times),
                "min_time": min(self.token_verification_times)
            }
        else:
            verification_metrics = {"count": 0, "avg_time": 0, "max_time": 0, "min_time": 0}
        
        return {
            "token_generation": generation_metrics,
            "token_verification": verification_metrics,
            "active_sessions": len(self.active_sessions),
            "refresh_tokens": len([t for t in self.refresh_tokens.values() if t["is_active"]]),
            "memory_usage": {
                "sessions_mb": len(str(self.active_sessions)) / 1024 / 1024,
                "refresh_tokens_mb": len(str(self.refresh_tokens)) / 1024 / 1024
            }
        }
    
    def cleanup_expired_sessions(self) -> int:
        """期限切れセッション・トークンのクリーンアップ"""
        now = datetime.now(timezone.utc)
        cleaned_count = 0
        
        # 期限切れセッション削除
        expired_sessions = []
        for session_id, session in self.active_sessions.items():
            if session["expires_at"] < now:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.active_sessions[session_id]
            cleaned_count += 1
        
        # 期限切れリフレッシュトークン削除
        expired_tokens = []
        for token_id, token_data in self.refresh_tokens.items():
            if token_data["expires_at"] < now:
                expired_tokens.append(token_id)
        
        for token_id in expired_tokens:
            del self.refresh_tokens[token_id]
            cleaned_count += 1
        
        if cleaned_count > 0:
            self.logger.info(f"期限切れセッション・トークン削除: {cleaned_count}件")
        
        return cleaned_count

# グローバル認証マネージャー
auth_manager = JWTAuthManager()

async def get_current_user(request: Request) -> UserAuth:
    """現在のユーザー取得"""
    credentials: HTTPAuthorizationCredentials = await security(request)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証が必要です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = auth_manager.verify_token(credentials.credentials)
        if payload is None:
            raise credentials_exception
        
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        company_id: int = payload.get("company_id")
        email: str = payload.get("email")
        
        if username is None or user_id is None:
            raise credentials_exception
        
        return UserAuth(
            user_id=user_id,
            username=username,
            email=email,
            role=role,
            company_id=company_id,
            full_name="",  # 必要に応じてDBから取得
            is_active=True
        )
        
    except jwt.PyJWTError:
        raise credentials_exception

async def get_optional_user(request: Request) -> Optional[UserAuth]:
    """オプショナルユーザー取得（未認証でもOK）"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

def require_auth(func):
    """認証必須デコレータ"""
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get('request') or args[0] if args else None
        if not request:
            raise HTTPException(status_code=500, detail="リクエスト情報が取得できません")
        
        current_user = await get_current_user(request)
        kwargs['current_user'] = current_user
        
        return await func(*args, **kwargs)
    return wrapper

# パスワード強度チェック
def validate_password_strength(password: str) -> tuple[bool, List[str]]:
    """パスワード強度検証"""
    errors = []
    
    if len(password) < 8:
        errors.append("パスワードは8文字以上である必要があります")
    
    if not any(c.isupper() for c in password):
        errors.append("大文字を含む必要があります")
    
    if not any(c.islower() for c in password):
        errors.append("小文字を含む必要があります")
    
    if not any(c.isdigit() for c in password):
        errors.append("数字を含む必要があります")
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        errors.append("特殊文字を含む必要があります")
    
    return len(errors) == 0, errors