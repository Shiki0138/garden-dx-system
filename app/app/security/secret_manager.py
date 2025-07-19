"""
Garden DX - 環境変数・秘密管理システム
本番環境用セキュアな設定・秘密情報管理
"""

import os
import json
import hashlib
import base64
from typing import Dict, Optional, Any, Union
from pathlib import Path
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

@dataclass
class SecretConfig:
    """秘密設定クラス"""
    name: str
    value: str
    encrypted: bool = True
    environment: str = "production"
    description: str = ""
    created_at: str = ""
    updated_at: str = ""

class SecretManager:
    """秘密管理システム"""
    
    def __init__(self, config_dir: str = "/etc/garden_dx"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.secrets_file = self.config_dir / "secrets.enc"
        self.env_file = self.config_dir / "production.env"
        
        self.logger = logging.getLogger(__name__)
        
        # 暗号化キー初期化
        self._init_encryption_key()
    
    def _init_encryption_key(self) -> None:
        """暗号化キー初期化"""
        key_file = self.config_dir / "master.key"
        
        if not key_file.exists():
            # 新しいマスターキー生成
            master_password = os.getenv('GARDEN_MASTER_PASSWORD')
            if not master_password:
                raise ValueError("GARDEN_MASTER_PASSWORD環境変数が設定されていません")
            
            # PBKDF2でキー導出
            salt = os.urandom(16)
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
            
            # キーファイル保存
            key_data = {
                'key': key.decode(),
                'salt': base64.b64encode(salt).decode()
            }
            
            with open(key_file, 'w', mode=0o600) as f:
                json.dump(key_data, f)
            
            os.chmod(key_file, 0o600)  # 所有者のみ読み取り可能
            
        # キー読み込み
        with open(key_file, 'r') as f:
            key_data = json.load(f)
        
        self.encryption_key = key_data['key'].encode()
        self.fernet = Fernet(self.encryption_key)
    
    def set_secret(self, name: str, value: str, description: str = "") -> None:
        """秘密設定"""
        try:
            # 既存秘密情報読み込み
            secrets = self._load_secrets()
            
            # 新しい秘密情報追加
            from datetime import datetime
            now = datetime.utcnow().isoformat()
            
            secret_config = SecretConfig(
                name=name,
                value=value,
                encrypted=True,
                environment="production",
                description=description,
                created_at=secrets.get(name, {}).get('created_at', now),
                updated_at=now
            )
            
            secrets[name] = asdict(secret_config)
            
            # 秘密情報保存
            self._save_secrets(secrets)
            
            self.logger.info(f"秘密情報設定完了: {name}")
            
        except Exception as e:
            self.logger.error(f"秘密情報設定エラー: {str(e)}")
            raise
    
    def get_secret(self, name: str) -> Optional[str]:
        """秘密取得"""
        try:
            secrets = self._load_secrets()
            
            if name not in secrets:
                return None
            
            secret_data = secrets[name]
            if secret_data.get('encrypted', True):
                encrypted_value = secret_data['value']
                return self.fernet.decrypt(encrypted_value.encode()).decode()
            else:
                return secret_data['value']
                
        except Exception as e:
            self.logger.error(f"秘密取得エラー: {str(e)}")
            return None
    
    def delete_secret(self, name: str) -> bool:
        """秘密削除"""
        try:
            secrets = self._load_secrets()
            
            if name in secrets:
                del secrets[name]
                self._save_secrets(secrets)
                self.logger.info(f"秘密情報削除完了: {name}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"秘密削除エラー: {str(e)}")
            return False
    
    def list_secrets(self) -> Dict[str, Dict[str, Any]]:
        """秘密一覧取得（値は除く）"""
        try:
            secrets = self._load_secrets()
            
            # 値を除いた情報のみ返す
            result = {}
            for name, data in secrets.items():
                result[name] = {
                    'name': data['name'],
                    'encrypted': data['encrypted'],
                    'environment': data['environment'],
                    'description': data['description'],
                    'created_at': data['created_at'],
                    'updated_at': data['updated_at']
                }
            
            return result
            
        except Exception as e:
            self.logger.error(f"秘密一覧取得エラー: {str(e)}")
            return {}
    
    def _load_secrets(self) -> Dict[str, Dict[str, Any]]:
        """秘密情報読み込み"""
        if not self.secrets_file.exists():
            return {}
        
        try:
            with open(self.secrets_file, 'rb') as f:
                encrypted_data = f.read()
            
            if not encrypted_data:
                return {}
            
            decrypted_data = self.fernet.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
            
        except Exception as e:
            self.logger.error(f"秘密情報読み込みエラー: {str(e)}")
            return {}
    
    def _save_secrets(self, secrets: Dict[str, Dict[str, Any]]) -> None:
        """秘密情報保存"""
        try:
            # 値を暗号化
            for name, data in secrets.items():
                if data.get('encrypted', True) and isinstance(data['value'], str):
                    if not data['value'].startswith('gAAAAAB'):  # 既に暗号化済みでない場合
                        encrypted_value = self.fernet.encrypt(data['value'].encode())
                        data['value'] = encrypted_value.decode()
            
            # JSON形式で暗号化保存
            json_data = json.dumps(secrets, indent=2)
            encrypted_data = self.fernet.encrypt(json_data.encode())
            
            with open(self.secrets_file, 'wb') as f:
                f.write(encrypted_data)
            
            os.chmod(self.secrets_file, 0o600)  # 所有者のみ読み取り可能
            
        except Exception as e:
            self.logger.error(f"秘密情報保存エラー: {str(e)}")
            raise
    
    def generate_env_file(self) -> None:
        """環境変数ファイル生成"""
        try:
            secrets = self._load_secrets()
            
            env_content = []
            env_content.append("# Garden DX Production Environment Variables")
            env_content.append("# Generated automatically - DO NOT EDIT MANUALLY")
            env_content.append("")
            
            # データベース設定
            env_content.append("# Database Configuration")
            env_content.append(f"DB_HOST={self.get_secret('DB_HOST') or 'localhost'}")
            env_content.append(f"DB_PORT={self.get_secret('DB_PORT') or '5432'}")
            env_content.append(f"DB_NAME={self.get_secret('DB_NAME') or 'garden_dx'}")
            env_content.append(f"DB_USER={self.get_secret('DB_USER') or 'garden_app'}")
            env_content.append(f"DB_PASSWORD={self.get_secret('DB_PASSWORD') or ''}")
            env_content.append("")
            
            # 認証設定
            env_content.append("# Authentication Configuration")
            env_content.append(f"JWT_SECRET_KEY={self.get_secret('JWT_SECRET_KEY') or ''}")
            env_content.append(f"JWT_ACCESS_TOKEN_EXPIRES={self.get_secret('JWT_ACCESS_TOKEN_EXPIRES') or '3600'}")
            env_content.append(f"JWT_REFRESH_TOKEN_EXPIRES={self.get_secret('JWT_REFRESH_TOKEN_EXPIRES') or '604800'}")
            env_content.append("")
            
            # 暗号化設定
            env_content.append("# Encryption Configuration")
            env_content.append(f"ENCRYPTION_KEY={self.get_secret('ENCRYPTION_KEY') or ''}")
            env_content.append(f"BACKUP_ENCRYPTION_KEY={self.get_secret('BACKUP_ENCRYPTION_KEY') or ''}")
            env_content.append("")
            
            # SSL設定
            env_content.append("# SSL Configuration")
            env_content.append(f"SSL_CERT_FILE={self.get_secret('SSL_CERT_FILE') or '/etc/ssl/certs/garden-dx.crt'}")
            env_content.append(f"SSL_KEY_FILE={self.get_secret('SSL_KEY_FILE') or '/etc/ssl/private/garden-dx.key'}")
            env_content.append(f"SSL_CA_FILE={self.get_secret('SSL_CA_FILE') or '/etc/ssl/certs/ca.crt'}")
            env_content.append("")
            
            # バックアップ設定
            env_content.append("# Backup Configuration")
            env_content.append(f"BACKUP_DIR={self.get_secret('BACKUP_DIR') or '/var/backups/garden_dx'}")
            env_content.append(f"REMOTE_STORAGE_TYPE={self.get_secret('REMOTE_STORAGE_TYPE') or 'aws_s3'}")
            env_content.append("")
            
            # AWS S3設定
            env_content.append("# AWS S3 Configuration")
            env_content.append(f"AWS_ACCESS_KEY_ID={self.get_secret('AWS_ACCESS_KEY_ID') or ''}")
            env_content.append(f"AWS_SECRET_ACCESS_KEY={self.get_secret('AWS_SECRET_ACCESS_KEY') or ''}")
            env_content.append(f"AWS_REGION={self.get_secret('AWS_REGION') or 'us-east-1'}")
            env_content.append(f"S3_BACKUP_BUCKET={self.get_secret('S3_BACKUP_BUCKET') or ''}")
            env_content.append("")
            
            # SFTP設定
            env_content.append("# SFTP Configuration")
            env_content.append(f"SFTP_HOST={self.get_secret('SFTP_HOST') or ''}")
            env_content.append(f"SFTP_PORT={self.get_secret('SFTP_PORT') or '22'}")
            env_content.append(f"SFTP_USERNAME={self.get_secret('SFTP_USERNAME') or ''}")
            env_content.append(f"SFTP_PASSWORD={self.get_secret('SFTP_PASSWORD') or ''}")
            env_content.append("")
            
            # メール設定
            env_content.append("# Email Configuration")
            env_content.append(f"SMTP_HOST={self.get_secret('SMTP_HOST') or ''}")
            env_content.append(f"SMTP_PORT={self.get_secret('SMTP_PORT') or '587'}")
            env_content.append(f"SMTP_USERNAME={self.get_secret('SMTP_USERNAME') or ''}")
            env_content.append(f"SMTP_PASSWORD={self.get_secret('SMTP_PASSWORD') or ''}")
            env_content.append(f"SMTP_TLS={self.get_secret('SMTP_TLS') or 'true'}")
            env_content.append("")
            
            # 監視設定
            env_content.append("# Monitoring Configuration")
            env_content.append(f"ADMIN_EMAIL={self.get_secret('ADMIN_EMAIL') or ''}")
            env_content.append(f"BACKUP_ADMIN_EMAIL={self.get_secret('BACKUP_ADMIN_EMAIL') or ''}")
            env_content.append("")
            
            # セキュリティ設定
            env_content.append("# Security Configuration")
            env_content.append("DEBUG=false")
            env_content.append("ENVIRONMENT=production")
            env_content.append("LOG_LEVEL=INFO")
            
            # ファイル書き込み
            with open(self.env_file, 'w') as f:
                f.write('\n'.join(env_content))
            
            os.chmod(self.env_file, 0o600)  # 所有者のみ読み取り可能
            
            self.logger.info(f"環境変数ファイル生成完了: {self.env_file}")
            
        except Exception as e:
            self.logger.error(f"環境変数ファイル生成エラー: {str(e)}")
            raise
    
    def init_default_secrets(self) -> None:
        """デフォルト秘密情報初期化"""
        try:
            self.logger.info("デフォルト秘密情報初期化開始")
            
            # データベース接続情報
            self.set_secret("DB_HOST", "localhost", "データベースホスト")
            self.set_secret("DB_PORT", "5432", "データベースポート")
            self.set_secret("DB_NAME", "garden_dx", "データベース名")
            self.set_secret("DB_USER", "garden_app", "データベースユーザー")
            
            # JWT設定
            jwt_secret = base64.urlsafe_b64encode(os.urandom(32)).decode()
            self.set_secret("JWT_SECRET_KEY", jwt_secret, "JWT署名秘密鍵")
            self.set_secret("JWT_ACCESS_TOKEN_EXPIRES", "3600", "アクセストークン有効期限（秒）")
            self.set_secret("JWT_REFRESH_TOKEN_EXPIRES", "604800", "リフレッシュトークン有効期限（秒）")
            
            # 暗号化キー
            encryption_key = Fernet.generate_key().decode()
            self.set_secret("ENCRYPTION_KEY", encryption_key, "データ暗号化キー")
            
            backup_encryption_key = Fernet.generate_key().decode()
            self.set_secret("BACKUP_ENCRYPTION_KEY", backup_encryption_key, "バックアップ暗号化キー")
            
            # バックアップ設定
            self.set_secret("BACKUP_DIR", "/var/backups/garden_dx", "バックアップディレクトリ")
            self.set_secret("REMOTE_STORAGE_TYPE", "aws_s3", "リモートストレージタイプ")
            
            # AWS設定（空で初期化）
            self.set_secret("AWS_ACCESS_KEY_ID", "", "AWS アクセスキーID")
            self.set_secret("AWS_SECRET_ACCESS_KEY", "", "AWS シークレットアクセスキー")
            self.set_secret("AWS_REGION", "us-east-1", "AWS リージョン")
            self.set_secret("S3_BACKUP_BUCKET", "", "S3 バックアップバケット")
            
            # SFTP設定（空で初期化）
            self.set_secret("SFTP_HOST", "", "SFTPホスト")
            self.set_secret("SFTP_PORT", "22", "SFTPポート")
            self.set_secret("SFTP_USERNAME", "", "SFTPユーザー名")
            self.set_secret("SFTP_PASSWORD", "", "SFTPパスワード")
            
            # SSL設定
            self.set_secret("SSL_CERT_FILE", "/etc/ssl/certs/garden-dx.crt", "SSL証明書ファイル")
            self.set_secret("SSL_KEY_FILE", "/etc/ssl/private/garden-dx.key", "SSL秘密鍵ファイル")
            self.set_secret("SSL_CA_FILE", "/etc/ssl/certs/ca.crt", "SSL CA証明書ファイル")
            
            # メール設定（空で初期化）
            self.set_secret("SMTP_HOST", "", "SMTPホスト")
            self.set_secret("SMTP_PORT", "587", "SMTPポート")
            self.set_secret("SMTP_USERNAME", "", "SMTPユーザー名")
            self.set_secret("SMTP_PASSWORD", "", "SMTPパスワード")
            self.set_secret("SMTP_TLS", "true", "SMTP TLS有効")
            
            # 管理者設定（空で初期化）
            self.set_secret("ADMIN_EMAIL", "", "管理者メールアドレス")
            self.set_secret("BACKUP_ADMIN_EMAIL", "", "バックアップ管理者メールアドレス")
            
            self.logger.info("デフォルト秘密情報初期化完了")
            
        except Exception as e:
            self.logger.error(f"デフォルト秘密情報初期化エラー: {str(e)}")
            raise

class ConfigValidator:
    """設定検証"""
    
    @staticmethod
    def validate_database_config(config: Dict[str, str]) -> Dict[str, bool]:
        """データベース設定検証"""
        checks = {
            'host_provided': bool(config.get('DB_HOST')),
            'port_valid': config.get('DB_PORT', '').isdigit(),
            'database_name_provided': bool(config.get('DB_NAME')),
            'user_provided': bool(config.get('DB_USER')),
            'password_provided': bool(config.get('DB_PASSWORD'))
        }
        return checks
    
    @staticmethod
    def validate_jwt_config(config: Dict[str, str]) -> Dict[str, bool]:
        """JWT設定検証"""
        checks = {
            'secret_key_provided': bool(config.get('JWT_SECRET_KEY')),
            'secret_key_length': len(config.get('JWT_SECRET_KEY', '')) >= 32,
            'access_token_expires_valid': config.get('JWT_ACCESS_TOKEN_EXPIRES', '').isdigit(),
            'refresh_token_expires_valid': config.get('JWT_REFRESH_TOKEN_EXPIRES', '').isdigit()
        }
        return checks
    
    @staticmethod
    def validate_ssl_config(config: Dict[str, str]) -> Dict[str, bool]:
        """SSL設定検証"""
        checks = {
            'cert_file_provided': bool(config.get('SSL_CERT_FILE')),
            'key_file_provided': bool(config.get('SSL_KEY_FILE')),
            'cert_file_exists': Path(config.get('SSL_CERT_FILE', '')).exists() if config.get('SSL_CERT_FILE') else False,
            'key_file_exists': Path(config.get('SSL_KEY_FILE', '')).exists() if config.get('SSL_KEY_FILE') else False
        }
        return checks

# 秘密管理実行用スクリプト関数
def init_secrets() -> None:
    """秘密情報初期化"""
    try:
        secret_manager = SecretManager()
        secret_manager.init_default_secrets()
        secret_manager.generate_env_file()
        print("秘密管理システム初期化完了")
    except Exception as e:
        print(f"初期化エラー: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "init":
            init_secrets()
        else:
            print("使用方法: python secret_manager.py [init]")
    else:
        init_secrets()