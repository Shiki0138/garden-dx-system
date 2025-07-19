"""
Garden DX - SSL/TLS セキュリティ設定
本番環境用HTTPS・暗号化通信設定
"""

import ssl
import os
from typing import Dict, Optional, List
from dataclasses import dataclass
from pathlib import Path

@dataclass
class SSLConfig:
    """SSL/TLS設定クラス"""
    cert_file: str
    key_file: str
    ca_file: Optional[str] = None
    ciphers: Optional[str] = None
    protocols: List[str] = None
    verify_mode: int = ssl.CERT_REQUIRED
    check_hostname: bool = True

class SecurityConfig:
    """セキュリティ設定管理"""
    
    # TLS推奨暗号スイート（強力な暗号化）
    STRONG_CIPHERS = (
        "ECDHE+AESGCM:"
        "ECDHE+CHACHA20:"
        "DHE+AESGCM:"
        "DHE+CHACHA20:"
        "!aNULL:"
        "!MD5:"
        "!DSS:"
        "!3DES"
    )
    
    # セキュアプロトコル
    SECURE_PROTOCOLS = [
        "TLSv1.2",
        "TLSv1.3"
    ]
    
    # セキュリティヘッダー
    SECURITY_HEADERS = {
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        ),
        "Permissions-Policy": (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=(), "
            "payment=()"
        )
    }
    
    @classmethod
    def create_ssl_context(cls, config: SSLConfig) -> ssl.SSLContext:
        """セキュアなSSLコンテキスト作成"""
        
        # TLS 1.2以上のみ許可
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        
        # プロトコル設定
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_3
        
        # 証明書設定
        if not os.path.exists(config.cert_file):
            raise FileNotFoundError(f"SSL証明書が見つかりません: {config.cert_file}")
        if not os.path.exists(config.key_file):
            raise FileNotFoundError(f"SSL秘密鍵が見つかりません: {config.key_file}")
            
        context.load_cert_chain(config.cert_file, config.key_file)
        
        # CA証明書設定
        if config.ca_file and os.path.exists(config.ca_file):
            context.load_verify_locations(config.ca_file)
        
        # 暗号スイート設定
        context.set_ciphers(config.ciphers or cls.STRONG_CIPHERS)
        
        # セキュリティオプション
        context.options |= ssl.OP_NO_SSLv2
        context.options |= ssl.OP_NO_SSLv3
        context.options |= ssl.OP_NO_TLSv1
        context.options |= ssl.OP_NO_TLSv1_1
        context.options |= ssl.OP_SINGLE_DH_USE
        context.options |= ssl.OP_SINGLE_ECDH_USE
        context.options |= ssl.OP_NO_COMPRESSION
        
        # 証明書検証設定
        context.verify_mode = config.verify_mode
        context.check_hostname = config.check_hostname
        
        return context
    
    @classmethod
    def get_production_ssl_config(cls) -> SSLConfig:
        """本番環境用SSL設定取得"""
        return SSLConfig(
            cert_file=os.getenv("SSL_CERT_FILE", "/etc/ssl/certs/garden-dx.crt"),
            key_file=os.getenv("SSL_KEY_FILE", "/etc/ssl/private/garden-dx.key"),
            ca_file=os.getenv("SSL_CA_FILE", "/etc/ssl/certs/ca.crt"),
            ciphers=cls.STRONG_CIPHERS,
            protocols=cls.SECURE_PROTOCOLS
        )
    
    @classmethod
    def apply_security_headers(cls, response) -> None:
        """セキュリティヘッダー適用"""
        for header, value in cls.SECURITY_HEADERS.items():
            response.headers[header] = value

class PasswordSecurity:
    """パスワードセキュリティ管理"""
    
    # パスワード要件
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # パスワード履歴
    PASSWORD_HISTORY_COUNT = 10
    
    # アカウントロック設定
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    
    @classmethod
    def validate_password_strength(cls, password: str) -> Dict[str, bool]:
        """パスワード強度検証"""
        result = {
            "length": len(password) >= cls.MIN_LENGTH,
            "uppercase": bool(re.search(r'[A-Z]', password)) if cls.REQUIRE_UPPERCASE else True,
            "lowercase": bool(re.search(r'[a-z]', password)) if cls.REQUIRE_LOWERCASE else True,
            "digits": bool(re.search(r'\d', password)) if cls.REQUIRE_DIGITS else True,
            "special": bool(re.search(f'[{re.escape(cls.SPECIAL_CHARS)}]', password)) if cls.REQUIRE_SPECIAL else True,
            "common_password": not cls.is_common_password(password),
            "personal_info": not cls.contains_personal_info(password)
        }
        
        result["is_valid"] = all(result.values())
        return result
    
    @classmethod
    def is_common_password(cls, password: str) -> bool:
        """よくあるパスワードチェック"""
        common_passwords = {
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "pass123",
            "password1", "123456789", "welcome123", "admin123"
        }
        return password.lower() in common_passwords
    
    @classmethod
    def contains_personal_info(cls, password: str, user_info: Optional[Dict] = None) -> bool:
        """個人情報含有チェック"""
        if not user_info:
            return False
            
        check_fields = ['username', 'email', 'full_name', 'company_name']
        password_lower = password.lower()
        
        for field in check_fields:
            if field in user_info and user_info[field]:
                if user_info[field].lower() in password_lower:
                    return True
        return False

class SessionSecurity:
    """セッションセキュリティ管理"""
    
    # セッション設定
    SESSION_TIMEOUT_MINUTES = 480  # 8時間
    ABSOLUTE_TIMEOUT_HOURS = 24   # 絶対タイムアウト
    MAX_CONCURRENT_SESSIONS = 3   # 同時セッション数
    
    # セッションセキュリティ
    SECURE_COOKIE = True
    HTTP_ONLY_COOKIE = True
    SAME_SITE_COOKIE = "Strict"
    
    # セッション再生成
    REGENERATE_SESSION_ON_LOGIN = True
    REGENERATE_INTERVAL_MINUTES = 60

class DataEncryption:
    """データ暗号化管理"""
    
    # 暗号化アルゴリズム
    ALGORITHM = "AES-256-GCM"
    KEY_SIZE = 32  # 256bit
    IV_SIZE = 16   # 128bit
    TAG_SIZE = 16  # 128bit
    
    @classmethod
    def generate_key(cls) -> bytes:
        """暗号化キー生成"""
        import secrets
        return secrets.token_bytes(cls.KEY_SIZE)
    
    @classmethod
    def encrypt_data(cls, data: str, key: bytes) -> Dict[str, str]:
        """データ暗号化"""
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        import base64
        import secrets
        
        # IV生成
        iv = secrets.token_bytes(cls.IV_SIZE)
        
        # 暗号化実行
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(data.encode()) + encryptor.finalize()
        
        return {
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "iv": base64.b64encode(iv).decode(),
            "tag": base64.b64encode(encryptor.tag).decode()
        }
    
    @classmethod
    def decrypt_data(cls, encrypted_data: Dict[str, str], key: bytes) -> str:
        """データ復号化"""
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        import base64
        
        # Base64デコード
        ciphertext = base64.b64decode(encrypted_data["ciphertext"])
        iv = base64.b64decode(encrypted_data["iv"])
        tag = base64.b64decode(encrypted_data["tag"])
        
        # 復号化実行
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        return plaintext.decode()

class SecurityAudit:
    """セキュリティ監査"""
    
    # 監査イベント
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    PRIVILEGE_ESCALATION = "PRIVILEGE_ESCALATION"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_MODIFICATION = "DATA_MODIFICATION"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    
    # 重要度レベル
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    
    @classmethod
    def log_security_event(cls, event_type: str, user_id: Optional[int], 
                          severity: str, description: str, 
                          metadata: Optional[Dict] = None) -> None:
        """セキュリティイベント記録"""
        import json
        from datetime import datetime
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "severity": severity,
            "description": description,
            "metadata": metadata or {}
        }
        
        # TODO: データベースまたはログファイルに記録
        print(f"SECURITY_EVENT: {json.dumps(event)}")

# セキュリティ設定のエクスポート
__all__ = [
    "SecurityConfig",
    "SSLConfig", 
    "PasswordSecurity",
    "SessionSecurity",
    "DataEncryption",
    "SecurityAudit"
]

import re