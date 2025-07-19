"""
Garden DX - セキュリティ強化システム
高セキュリティ実装（パスワードハッシュ化・セッション管理・脆弱性対策）
"""

import hashlib
import secrets
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, Request, Response
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
import bcrypt
import logging
from ipaddress import ip_address
import hmac
import base64
import json

# ログ設定
security_logger = logging.getLogger("garden_security")

class SecurityConfig:
    """セキュリティ設定"""
    
    # パスワード設定
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_DIGIT = True
    PASSWORD_REQUIRE_SPECIAL = True
    PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # セッション設定
    SESSION_TIMEOUT_MINUTES = 480  # 8時間
    MAX_SESSIONS_PER_USER = 5
    SESSION_REFRESH_THRESHOLD_MINUTES = 60  # 1時間前にリフレッシュ
    
    # セキュリティ設定
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    RATE_LIMIT_REQUESTS_PER_MINUTE = 60
    
    # CSRF設定
    CSRF_TOKEN_LENGTH = 32
    CSRF_TOKEN_EXPIRE_MINUTES = 60
    
    # セキュリティヘッダー
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }

class PasswordSecurity:
    """パスワードセキュリティ管理"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """高セキュリティパスワードハッシュ化"""
        # bcryptでコスト12（推奨レベル）
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """パスワード検証"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False
    
    @staticmethod
    def validate_password_policy(password: str) -> tuple[bool, List[str]]:
        """パスワードポリシー検証"""
        errors = []
        
        # 長さチェック
        if len(password) < SecurityConfig.PASSWORD_MIN_LENGTH:
            errors.append(f"パスワードは{SecurityConfig.PASSWORD_MIN_LENGTH}文字以上である必要があります")
        
        if len(password) > SecurityConfig.PASSWORD_MAX_LENGTH:
            errors.append(f"パスワードは{SecurityConfig.PASSWORD_MAX_LENGTH}文字以下である必要があります")
        
        # 文字種チェック
        if SecurityConfig.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("大文字を含む必要があります")
        
        if SecurityConfig.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("小文字を含む必要があります")
        
        if SecurityConfig.PASSWORD_REQUIRE_DIGIT and not re.search(r'[0-9]', password):
            errors.append("数字を含む必要があります")
        
        if SecurityConfig.PASSWORD_REQUIRE_SPECIAL:
            special_pattern = f"[{re.escape(SecurityConfig.PASSWORD_SPECIAL_CHARS)}]"
            if not re.search(special_pattern, password):
                errors.append(f"特殊文字({SecurityConfig.PASSWORD_SPECIAL_CHARS})を含む必要があります")
        
        # 脆弱なパスワードパターンチェック
        weak_patterns = [
            r'(.)\1{2,}',  # 同じ文字の連続
            r'(012|123|234|345|456|567|678|789|890)',  # 連続する数字
            r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # 連続するアルファベット
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                errors.append("予測しやすいパターンは使用できません")
                break
        
        # 一般的な脆弱パスワードチェック
        common_passwords = [
            'password', 'password123', '123456789', 'qwerty', 'admin', 'user',
            'garden', 'zouen', 'system', 'test', 'demo'
        ]
        
        if password.lower() in common_passwords:
            errors.append("一般的すぎるパスワードは使用できません")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def generate_secure_password(length: int = 12) -> str:
        """セキュアなパスワード生成"""
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(chars) for _ in range(length))

class SessionSecurity:
    """セッションセキュリティ管理"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.user_sessions: Dict[int, List[str]] = {}
        self.session_activities: Dict[str, List[datetime]] = {}
    
    def create_session(self, user_id: int, user_data: Dict[str, Any], request: Request) -> str:
        """セキュアセッション作成"""
        # 既存セッション数チェック
        if user_id in self.user_sessions:
            if len(self.user_sessions[user_id]) >= SecurityConfig.MAX_SESSIONS_PER_USER:
                # 最古のセッションを削除
                oldest_session = self.user_sessions[user_id][0]
                self.terminate_session(oldest_session)
        
        # セッションID生成
        session_id = secrets.token_urlsafe(32)
        
        # セッション情報保存
        session_data = {
            "user_id": user_id,
            "user_data": user_data,
            "created_at": datetime.now(timezone.utc),
            "last_activity": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=SecurityConfig.SESSION_TIMEOUT_MINUTES),
            "ip_address": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", ""),
            "is_active": True,
            "activity_count": 0
        }
        
        self.active_sessions[session_id] = session_data
        
        # ユーザー別セッション管理
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = []
        self.user_sessions[user_id].append(session_id)
        
        # アクティビティ追跡
        self.session_activities[session_id] = [datetime.now(timezone.utc)]
        
        security_logger.info(f"セッション作成: user_id={user_id}, session_id={session_id[:8]}..., ip={session_data['ip_address']}")
        
        return session_id
    
    def validate_session(self, session_id: str, request: Request) -> Optional[Dict[str, Any]]:
        """セッション検証"""
        if session_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[session_id]
        
        # 期限チェック
        if datetime.now(timezone.utc) > session["expires_at"]:
            self.terminate_session(session_id)
            return None
        
        # アクティブ状態チェック
        if not session["is_active"]:
            return None
        
        # IPアドレス検証（オプション）
        current_ip = self._get_client_ip(request)
        if session["ip_address"] != current_ip:
            security_logger.warning(f"IPアドレス変更検出: session_id={session_id[:8]}..., old_ip={session['ip_address']}, new_ip={current_ip}")
            # 本番環境では無効化を検討
        
        # アクティビティ更新
        session["last_activity"] = datetime.now(timezone.utc)
        session["activity_count"] += 1
        
        # アクティビティ追跡
        if session_id in self.session_activities:
            self.session_activities[session_id].append(datetime.now(timezone.utc))
            # 古いアクティビティを削除（最新100件のみ保持）
            if len(self.session_activities[session_id]) > 100:
                self.session_activities[session_id] = self.session_activities[session_id][-100:]
        
        # セッション延長チェック
        time_until_expiry = session["expires_at"] - datetime.now(timezone.utc)
        if time_until_expiry.total_seconds() < SecurityConfig.SESSION_REFRESH_THRESHOLD_MINUTES * 60:
            session["expires_at"] = datetime.now(timezone.utc) + timedelta(minutes=SecurityConfig.SESSION_TIMEOUT_MINUTES)
            security_logger.info(f"セッション延長: session_id={session_id[:8]}...")
        
        return session
    
    def terminate_session(self, session_id: str) -> bool:
        """セッション終了"""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        user_id = session["user_id"]
        
        # セッション削除
        del self.active_sessions[session_id]
        
        # ユーザー別セッションリストから削除
        if user_id in self.user_sessions and session_id in self.user_sessions[user_id]:
            self.user_sessions[user_id].remove(session_id)
            if not self.user_sessions[user_id]:
                del self.user_sessions[user_id]
        
        # アクティビティ削除
        if session_id in self.session_activities:
            del self.session_activities[session_id]
        
        security_logger.info(f"セッション終了: session_id={session_id[:8]}..., user_id={user_id}")
        
        return True
    
    def terminate_all_user_sessions(self, user_id: int) -> int:
        """ユーザーの全セッション終了"""
        terminated_count = 0
        
        if user_id in self.user_sessions:
            sessions_to_terminate = self.user_sessions[user_id].copy()
            for session_id in sessions_to_terminate:
                if self.terminate_session(session_id):
                    terminated_count += 1
        
        security_logger.info(f"全セッション終了: user_id={user_id}, count={terminated_count}")
        
        return terminated_count
    
    def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """ユーザーのセッション一覧"""
        sessions = []
        
        if user_id in self.user_sessions:
            for session_id in self.user_sessions[user_id]:
                if session_id in self.active_sessions:
                    session = self.active_sessions[session_id]
                    sessions.append({
                        "session_id": session_id[:8] + "...",
                        "created_at": session["created_at"],
                        "last_activity": session["last_activity"],
                        "expires_at": session["expires_at"],
                        "ip_address": session["ip_address"],
                        "user_agent": session["user_agent"],
                        "activity_count": session["activity_count"]
                    })
        
        return sessions
    
    def _get_client_ip(self, request: Request) -> str:
        """クライアントIP取得"""
        # プロキシ環境対応
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"

class SecurityMiddleware(BaseHTTPMiddleware):
    """セキュリティミドルウェア"""
    
    def __init__(self, app, rate_limiter=None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()
        self.csrf_tokens: Dict[str, Dict[str, Any]] = {}
    
    async def dispatch(self, request: Request, call_next):
        # セキュリティヘッダー設定
        response = await call_next(request)
        
        for header, value in SecurityConfig.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        # CSRF保護
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            await self._verify_csrf_token(request)
        
        # レート制限
        client_ip = self._get_client_ip(request)
        if not self.rate_limiter.is_allowed(client_ip):
            raise HTTPException(status_code=429, detail="レート制限に達しました")
        
        return response
    
    def generate_csrf_token(self, session_id: str) -> str:
        """CSRFトークン生成"""
        token = secrets.token_urlsafe(SecurityConfig.CSRF_TOKEN_LENGTH)
        
        self.csrf_tokens[token] = {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=SecurityConfig.CSRF_TOKEN_EXPIRE_MINUTES)
        }
        
        return token
    
    async def _verify_csrf_token(self, request: Request):
        """CSRFトークン検証"""
        token = request.headers.get("X-CSRF-Token") or request.headers.get("X-CSRFToken")
        
        if not token:
            # 一部のAPIエンドポイントはCSRF免除（API認証があるため）
            if request.url.path.startswith("/api/auth/"):
                return
            raise HTTPException(status_code=403, detail="CSRFトークンが必要です")
        
        if token not in self.csrf_tokens:
            raise HTTPException(status_code=403, detail="無効なCSRFトークンです")
        
        csrf_data = self.csrf_tokens[token]
        
        if datetime.now(timezone.utc) > csrf_data["expires_at"]:
            del self.csrf_tokens[token]
            raise HTTPException(status_code=403, detail="CSRFトークンが期限切れです")
    
    def _get_client_ip(self, request: Request) -> str:
        """クライアントIP取得"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"

class RateLimiter:
    """レート制限"""
    
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        """レート制限チェック"""
        now = datetime.now(timezone.utc)
        minute_ago = now - timedelta(minutes=1)
        
        # 古いリクエストを削除
        if client_id in self.requests:
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id]
                if req_time > minute_ago
            ]
        else:
            self.requests[client_id] = []
        
        # リクエスト数チェック
        if len(self.requests[client_id]) >= SecurityConfig.RATE_LIMIT_REQUESTS_PER_MINUTE:
            return False
        
        # リクエスト記録
        self.requests[client_id].append(now)
        return True

class LoginAttemptTracker:
    """ログイン試行追跡"""
    
    def __init__(self):
        self.attempts: Dict[str, Dict[str, Any]] = {}
    
    def record_attempt(self, identifier: str, success: bool, ip_address: str):
        """ログイン試行記録"""
        now = datetime.now(timezone.utc)
        
        if identifier not in self.attempts:
            self.attempts[identifier] = {
                "failed_count": 0,
                "last_attempt": now,
                "locked_until": None,
                "attempts": []
            }
        
        attempt_data = self.attempts[identifier]
        
        # 試行履歴追加
        attempt_data["attempts"].append({
            "timestamp": now,
            "success": success,
            "ip_address": ip_address
        })
        
        # 古い履歴削除（24時間以内のみ保持）
        day_ago = now - timedelta(days=1)
        attempt_data["attempts"] = [
            attempt for attempt in attempt_data["attempts"]
            if attempt["timestamp"] > day_ago
        ]
        
        attempt_data["last_attempt"] = now
        
        if success:
            # 成功時はカウンターリセット
            attempt_data["failed_count"] = 0
            attempt_data["locked_until"] = None
        else:
            # 失敗時はカウンター増加
            attempt_data["failed_count"] += 1
            
            # ロックアウト判定
            if attempt_data["failed_count"] >= SecurityConfig.MAX_LOGIN_ATTEMPTS:
                attempt_data["locked_until"] = now + timedelta(minutes=SecurityConfig.LOCKOUT_DURATION_MINUTES)
                security_logger.warning(f"アカウントロック: identifier={identifier}, ip={ip_address}")
    
    def is_locked(self, identifier: str) -> bool:
        """ロックアウト状態チェック"""
        if identifier not in self.attempts:
            return False
        
        attempt_data = self.attempts[identifier]
        locked_until = attempt_data.get("locked_until")
        
        if locked_until and datetime.now(timezone.utc) < locked_until:
            return True
        
        # ロック期間終了時はリセット
        if locked_until:
            attempt_data["failed_count"] = 0
            attempt_data["locked_until"] = None
        
        return False
    
    def get_remaining_lockout_time(self, identifier: str) -> Optional[timedelta]:
        """残りロックアウト時間"""
        if identifier not in self.attempts:
            return None
        
        locked_until = self.attempts[identifier].get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            return locked_until - datetime.now(timezone.utc)
        
        return None

# グローバルインスタンス
session_security = SessionSecurity()
login_tracker = LoginAttemptTracker()
security_middleware = SecurityMiddleware