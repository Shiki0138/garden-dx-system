"""
Garden DX - バックアップ・復旧システム
本番環境用自動バックアップ・災害復旧機能
"""

import os
import subprocess
import shutil
import gzip
import tarfile
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
import boto3  # AWS S3バックアップ用
import paramiko  # SFTP バックアップ用

@dataclass
class BackupConfig:
    """バックアップ設定"""
    backup_type: str  # full, incremental, differential
    retention_days: int = 30
    compression: bool = True
    encryption: bool = True
    remote_storage: bool = True
    notification: bool = True
    verify_backup: bool = True

@dataclass
class BackupResult:
    """バックアップ結果"""
    backup_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = "running"  # running, completed, failed
    backup_path: str = ""
    file_size: int = 0
    checksum: str = ""
    error_message: str = ""

class DatabaseBackupManager:
    """データベースバックアップ管理"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # データベース接続情報
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = os.getenv('DB_PORT', '5432')
        self.db_name = os.getenv('DB_NAME', 'garden_dx')
        self.db_user = os.getenv('DB_BACKUP_USER', 'garden_backup')
        self.db_password = os.getenv('DB_BACKUP_PASSWORD')
        
        # バックアップディレクトリ
        self.backup_dir = Path(os.getenv('BACKUP_DIR', '/var/backups/garden_dx'))
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def create_full_backup(self) -> BackupResult:
        """フルバックアップ作成"""
        backup_id = f"full_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        result = BackupResult(
            backup_id=backup_id,
            start_time=datetime.now()
        )
        
        try:
            self.logger.info(f"フルバックアップ開始: {backup_id}")
            
            # pg_dump実行
            backup_filename = f"{backup_id}.sql"
            backup_path = self.backup_dir / backup_filename
            
            cmd = [
                'pg_dump',
                f'--host={self.db_host}',
                f'--port={self.db_port}',
                f'--username={self.db_user}',
                '--verbose',
                '--clean',
                '--if-exists',
                '--create',
                '--format=custom',
                '--compress=9',
                '--no-password',
                self.db_name
            ]
            
            # 環境変数でパスワード設定
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            # バックアップ実行
            with open(backup_path, 'wb') as f:
                process = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=True
                )
            
            # ファイルサイズとチェックサム計算
            result.file_size = backup_path.stat().st_size
            result.checksum = self._calculate_checksum(backup_path)
            result.backup_path = str(backup_path)
            
            # 圧縮（設定されている場合）
            if self.config.compression:
                compressed_path = self._compress_backup(backup_path)
                result.backup_path = str(compressed_path)
                result.file_size = compressed_path.stat().st_size
            
            # 暗号化（設定されている場合）
            if self.config.encryption:
                encrypted_path = self._encrypt_backup(Path(result.backup_path))
                result.backup_path = str(encrypted_path)
                result.file_size = encrypted_path.stat().st_size
            
            # リモートストレージへアップロード
            if self.config.remote_storage:
                self._upload_to_remote_storage(Path(result.backup_path))
            
            # バックアップ検証
            if self.config.verify_backup:
                self._verify_backup(Path(result.backup_path))
            
            result.end_time = datetime.now()
            result.status = "completed"
            
            self.logger.info(f"フルバックアップ完了: {backup_id}, サイズ: {result.file_size} bytes")
            
        except Exception as e:
            result.end_time = datetime.now()
            result.status = "failed"
            result.error_message = str(e)
            self.logger.error(f"フルバックアップ失敗: {backup_id}, エラー: {str(e)}")
            
        finally:
            # バックアップ結果を記録
            self._record_backup_result(result)
            
        return result
    
    def create_incremental_backup(self, base_backup_id: str) -> BackupResult:
        """増分バックアップ作成"""
        backup_id = f"incremental_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        result = BackupResult(
            backup_id=backup_id,
            start_time=datetime.now()
        )
        
        try:
            self.logger.info(f"増分バックアップ開始: {backup_id}")
            
            # WAL アーカイブログ取得
            wal_backup_path = self._backup_wal_files(backup_id)
            
            result.backup_path = str(wal_backup_path)
            result.file_size = wal_backup_path.stat().st_size
            result.checksum = self._calculate_checksum(wal_backup_path)
            result.end_time = datetime.now()
            result.status = "completed"
            
            self.logger.info(f"増分バックアップ完了: {backup_id}")
            
        except Exception as e:
            result.end_time = datetime.now()
            result.status = "failed"
            result.error_message = str(e)
            self.logger.error(f"増分バックアップ失敗: {backup_id}, エラー: {str(e)}")
            
        finally:
            self._record_backup_result(result)
            
        return result
    
    def _backup_wal_files(self, backup_id: str) -> Path:
        """WALファイルバックアップ"""
        wal_dir = Path('/var/lib/postgresql/archive')
        backup_path = self.backup_dir / f"{backup_id}_wal.tar.gz"
        
        with tarfile.open(backup_path, 'w:gz') as tar:
            for wal_file in wal_dir.glob('*.wal'):
                tar.add(wal_file, arcname=wal_file.name)
        
        return backup_path
    
    def _compress_backup(self, backup_path: Path) -> Path:
        """バックアップファイル圧縮"""
        compressed_path = backup_path.with_suffix(backup_path.suffix + '.gz')
        
        with open(backup_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # 元ファイル削除
        backup_path.unlink()
        
        return compressed_path
    
    def _encrypt_backup(self, backup_path: Path) -> Path:
        """バックアップファイル暗号化"""
        from cryptography.fernet import Fernet
        
        # 暗号化キー取得
        encryption_key = os.getenv('BACKUP_ENCRYPTION_KEY')
        if not encryption_key:
            raise ValueError("暗号化キーが設定されていません")
        
        fernet = Fernet(encryption_key.encode())
        encrypted_path = backup_path.with_suffix(backup_path.suffix + '.enc')
        
        with open(backup_path, 'rb') as f_in:
            with open(encrypted_path, 'wb') as f_out:
                f_out.write(fernet.encrypt(f_in.read()))
        
        # 元ファイル削除
        backup_path.unlink()
        
        return encrypted_path
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """ファイルチェックサム計算"""
        sha256_hash = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _upload_to_remote_storage(self, backup_path: Path) -> None:
        """リモートストレージへアップロード"""
        storage_type = os.getenv('REMOTE_STORAGE_TYPE', 'aws_s3')
        
        if storage_type == 'aws_s3':
            self._upload_to_s3(backup_path)
        elif storage_type == 'sftp':
            self._upload_to_sftp(backup_path)
    
    def _upload_to_s3(self, backup_path: Path) -> None:
        """AWS S3へアップロード"""
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            bucket_name = os.getenv('S3_BACKUP_BUCKET')
            s3_key = f"garden_dx_backups/{backup_path.name}"
            
            s3_client.upload_file(
                str(backup_path),
                bucket_name,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )
            
            self.logger.info(f"S3アップロード完了: {s3_key}")
            
        except Exception as e:
            self.logger.error(f"S3アップロード失敗: {str(e)}")
            raise
    
    def _upload_to_sftp(self, backup_path: Path) -> None:
        """SFTPサーバーへアップロード"""
        try:
            transport = paramiko.Transport((
                os.getenv('SFTP_HOST'),
                int(os.getenv('SFTP_PORT', '22'))
            ))
            
            transport.connect(
                username=os.getenv('SFTP_USERNAME'),
                password=os.getenv('SFTP_PASSWORD')
            )
            
            sftp = paramiko.SFTPClient.from_transport(transport)
            remote_path = f"/backups/garden_dx/{backup_path.name}"
            
            sftp.put(str(backup_path), remote_path)
            sftp.close()
            transport.close()
            
            self.logger.info(f"SFTPアップロード完了: {remote_path}")
            
        except Exception as e:
            self.logger.error(f"SFTPアップロード失敗: {str(e)}")
            raise
    
    def _verify_backup(self, backup_path: Path) -> bool:
        """バックアップ検証"""
        try:
            # ファイル存在確認
            if not backup_path.exists():
                raise FileNotFoundError(f"バックアップファイルが見つかりません: {backup_path}")
            
            # ファイルサイズ確認
            if backup_path.stat().st_size == 0:
                raise ValueError("バックアップファイルが空です")
            
            # PostgreSQLダンプファイルの場合、構文チェック
            if backup_path.suffix == '.sql' or '.sql' in backup_path.suffixes:
                self._verify_sql_dump(backup_path)
            
            return True
            
        except Exception as e:
            self.logger.error(f"バックアップ検証失敗: {str(e)}")
            return False
    
    def _verify_sql_dump(self, dump_path: Path) -> None:
        """SQLダンプファイル検証"""
        cmd = [
            'pg_restore',
            '--list',
            str(dump_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise ValueError(f"SQLダンプファイルが破損しています: {result.stderr}")
    
    def _record_backup_result(self, result: BackupResult) -> None:
        """バックアップ結果記録"""
        result_file = self.backup_dir / "backup_history.json"
        
        # 既存履歴読み込み
        history = []
        if result_file.exists():
            with open(result_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
        
        # 新しい結果追加
        result_dict = asdict(result)
        result_dict['start_time'] = result.start_time.isoformat()
        if result.end_time:
            result_dict['end_time'] = result.end_time.isoformat()
        
        history.append(result_dict)
        
        # 履歴保存
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    
    def cleanup_old_backups(self) -> List[str]:
        """古いバックアップ削除"""
        deleted_files = []
        cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
        
        for backup_file in self.backup_dir.glob('*'):
            if backup_file.is_file():
                file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
                if file_mtime < cutoff_date:
                    backup_file.unlink()
                    deleted_files.append(str(backup_file))
                    self.logger.info(f"古いバックアップ削除: {backup_file}")
        
        return deleted_files

class DisasterRecoveryManager:
    """災害復旧管理"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backup_dir = Path(os.getenv('BACKUP_DIR', '/var/backups/garden_dx'))
    
    def restore_from_backup(self, backup_path: str, target_db: str = None) -> bool:
        """バックアップから復旧"""
        try:
            self.logger.info(f"データベース復旧開始: {backup_path}")
            
            backup_file = Path(backup_path)
            if not backup_file.exists():
                raise FileNotFoundError(f"バックアップファイルが見つかりません: {backup_path}")
            
            # 暗号化されている場合は復号化
            if backup_file.suffix == '.enc':
                backup_file = self._decrypt_backup(backup_file)
            
            # 圧縮されている場合は展開
            if backup_file.suffix == '.gz':
                backup_file = self._decompress_backup(backup_file)
            
            # データベース復旧実行
            self._restore_database(backup_file, target_db)
            
            self.logger.info("データベース復旧完了")
            return True
            
        except Exception as e:
            self.logger.error(f"データベース復旧失敗: {str(e)}")
            return False
    
    def _decrypt_backup(self, encrypted_path: Path) -> Path:
        """バックアップファイル復号化"""
        from cryptography.fernet import Fernet
        
        encryption_key = os.getenv('BACKUP_ENCRYPTION_KEY')
        if not encryption_key:
            raise ValueError("暗号化キーが設定されていません")
        
        fernet = Fernet(encryption_key.encode())
        decrypted_path = encrypted_path.with_suffix('')
        
        with open(encrypted_path, 'rb') as f_in:
            with open(decrypted_path, 'wb') as f_out:
                f_out.write(fernet.decrypt(f_in.read()))
        
        return decrypted_path
    
    def _decompress_backup(self, compressed_path: Path) -> Path:
        """バックアップファイル展開"""
        decompressed_path = compressed_path.with_suffix('')
        
        with gzip.open(compressed_path, 'rb') as f_in:
            with open(decompressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        return decompressed_path
    
    def _restore_database(self, backup_path: Path, target_db: str = None) -> None:
        """データベース復旧実行"""
        db_name = target_db or os.getenv('DB_NAME', 'garden_dx')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_user = os.getenv('DB_BACKUP_USER', 'garden_backup')
        db_password = os.getenv('DB_BACKUP_PASSWORD')
        
        cmd = [
            'pg_restore',
            f'--host={db_host}',
            f'--port={db_port}',
            f'--username={db_user}',
            '--verbose',
            '--clean',
            '--if-exists',
            '--create',
            '--exit-on-error',
            f'--dbname={db_name}',
            str(backup_path)
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = db_password
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"データベース復旧失敗: {result.stderr}")
    
    def create_recovery_plan(self) -> Dict[str, Any]:
        """復旧計画作成"""
        return {
            "recovery_objectives": {
                "rpo_hours": 1,    # Recovery Point Objective (最大データ損失時間)
                "rto_hours": 4,    # Recovery Time Objective (最大復旧時間)
            },
            "backup_strategy": {
                "full_backup_frequency": "daily",
                "incremental_backup_frequency": "hourly",
                "retention_period_days": 30,
                "offsite_storage": True
            },
            "recovery_procedures": [
                "1. 障害状況の評価",
                "2. 最新バックアップの確認",
                "3. 復旧環境の準備",
                "4. データベース復旧実行",
                "5. アプリケーション動作確認",
                "6. サービス再開"
            ],
            "contact_information": {
                "primary_admin": os.getenv('ADMIN_EMAIL'),
                "backup_admin": os.getenv('BACKUP_ADMIN_EMAIL'),
                "vendor_support": "support@garden-dx.com"
            },
            "testing_schedule": {
                "recovery_test_frequency": "monthly",
                "last_test_date": datetime.now().isoformat(),
                "next_test_date": (datetime.now() + timedelta(days=30)).isoformat()
            }
        }

class BackupScheduler:
    """バックアップスケジューラー"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.db_backup_manager = DatabaseBackupManager(config)
        self.logger = logging.getLogger(__name__)
    
    def run_scheduled_backup(self, backup_type: str = "full") -> BackupResult:
        """スケジュールバックアップ実行"""
        try:
            if backup_type == "full":
                result = self.db_backup_manager.create_full_backup()
            elif backup_type == "incremental":
                # 最新のフルバックアップを基準とする
                base_backup = self._get_latest_full_backup()
                result = self.db_backup_manager.create_incremental_backup(base_backup)
            else:
                raise ValueError(f"不正なバックアップタイプ: {backup_type}")
            
            # 古いバックアップのクリーンアップ
            if result.status == "completed":
                self.db_backup_manager.cleanup_old_backups()
            
            # 通知送信
            if self.config.notification:
                self._send_notification(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"スケジュールバックアップ失敗: {str(e)}")
            raise
    
    def _get_latest_full_backup(self) -> str:
        """最新フルバックアップ取得"""
        backup_history_file = self.db_backup_manager.backup_dir / "backup_history.json"
        
        if not backup_history_file.exists():
            raise FileNotFoundError("バックアップ履歴が見つかりません")
        
        with open(backup_history_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
        
        # フルバックアップを新しい順にソート
        full_backups = [
            item for item in history 
            if item.get('backup_id', '').startswith('full_') and item.get('status') == 'completed'
        ]
        
        if not full_backups:
            raise ValueError("完了したフルバックアップが見つかりません")
        
        full_backups.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        return full_backups[0]['backup_id']
    
    def _send_notification(self, result: BackupResult) -> None:
        """バックアップ結果通知"""
        # TODO: メール通知やSlack通知の実装
        message = f"Garden DX バックアップ結果: {result.status}"
        if result.status == "completed":
            message += f"\nバックアップID: {result.backup_id}"
            message += f"\nファイルサイズ: {result.file_size} bytes"
        else:
            message += f"\nエラー: {result.error_message}"
        
        self.logger.info(f"バックアップ通知: {message}")

# バックアップ実行用スクリプト関数
def run_backup(backup_type: str = "full") -> None:
    """バックアップ実行"""
    config = BackupConfig(
        backup_type=backup_type,
        retention_days=30,
        compression=True,
        encryption=True,
        remote_storage=True,
        notification=True,
        verify_backup=True
    )
    
    scheduler = BackupScheduler(config)
    result = scheduler.run_scheduled_backup(backup_type)
    
    print(f"バックアップ{result.status}: {result.backup_id}")
    if result.status == "failed":
        print(f"エラー: {result.error_message}")

if __name__ == "__main__":
    import sys
    backup_type = sys.argv[1] if len(sys.argv) > 1 else "full"
    run_backup(backup_type)