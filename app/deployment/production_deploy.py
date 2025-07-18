"""
Garden DX - 本番環境デプロイメント設定
Docker・Kubernetes・サーバー設定の自動化
"""

import os
import subprocess
import shutil
import json
import yaml
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
import logging

@dataclass
class DeploymentConfig:
    """デプロイメント設定"""
    environment: str = "production"
    app_name: str = "garden-dx"
    version: str = "1.0.0"
    replicas: int = 3
    cpu_request: str = "500m"
    cpu_limit: str = "1000m"
    memory_request: str = "512Mi"
    memory_limit: str = "1Gi"
    storage_size: str = "10Gi"

class ProductionDeployer:
    """本番環境デプロイヤー"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.project_root = Path(__file__).parent.parent
        self.deploy_dir = self.project_root / "deployment"
        self.deploy_dir.mkdir(exist_ok=True)
    
    def generate_dockerfile(self) -> None:
        """Dockerfile生成"""
        dockerfile_content = f'''# Garden DX - 本番環境用Dockerfile
FROM node:18-alpine AS frontend-builder

# フロントエンド依存関係インストール
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

# フロントエンドビルド
COPY frontend/ ./
RUN npm run build

# Python本番環境
FROM python:3.11-slim-bullseye

# システム依存関係
RUN apt-get update && apt-get install -y \\
    postgresql-client \\
    curl \\
    gnupg \\
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
WORKDIR /app

# Python依存関係
COPY requirements/production.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコピー
COPY backend/ ./backend/
COPY database/ ./database/
COPY security/ ./security/
COPY backup/ ./backup/

# フロントエンドビルド結果コピー
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# 実行用ユーザー作成
RUN useradd --create-home --shell /bin/bash garden
RUN chown -R garden:garden /app
USER garden

# ポート公開
EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# エントリーポイント
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "backend.main:app"]
'''
        
        dockerfile_path = self.project_root / "Dockerfile"
        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile_content)
        
        self.logger.info(f"Dockerfile生成完了: {dockerfile_path}")
    
    def generate_docker_compose(self) -> None:
        """Docker Compose設定生成"""
        docker_compose = {
            'version': '3.8',
            'services': {
                'garden-dx-app': {
                    'build': '.',
                    'container_name': f'{self.config.app_name}-app',
                    'restart': 'unless-stopped',
                    'ports': ['8000:8000'],
                    'environment': [
                        'ENVIRONMENT=production',
                        'DB_HOST=garden-dx-db',
                        'DB_PORT=5432',
                        'DB_NAME=garden_dx',
                        'DB_USER=garden_app'
                    ],
                    'env_file': ['.env.production'],
                    'depends_on': ['garden-dx-db', 'garden-dx-redis'],
                    'volumes': [
                        './logs:/app/logs',
                        './uploads:/app/uploads',
                        '/etc/ssl/certs:/etc/ssl/certs:ro'
                    ],
                    'networks': ['garden-dx-network'],
                    'healthcheck': {
                        'test': ['CMD', 'curl', '-f', 'http://localhost:8000/health'],
                        'interval': '30s',
                        'timeout': '10s',
                        'retries': 3,
                        'start_period': '40s'
                    }
                },
                'garden-dx-db': {
                    'image': 'postgres:15-alpine',
                    'container_name': f'{self.config.app_name}-db',
                    'restart': 'unless-stopped',
                    'environment': [
                        'POSTGRES_DB=garden_dx',
                        'POSTGRES_USER=garden_app',
                        'POSTGRES_PASSWORD_FILE=/run/secrets/db_password'
                    ],
                    'secrets': ['db_password'],
                    'volumes': [
                        'postgres_data:/var/lib/postgresql/data',
                        './database/postgresql_production.conf:/etc/postgresql/postgresql.conf',
                        './database/pg_hba_production.conf:/etc/postgresql/pg_hba.conf',
                        './database/init_production_db.sql:/docker-entrypoint-initdb.d/init.sql',
                        './backups:/var/backups/garden_dx'
                    ],
                    'networks': ['garden-dx-network'],
                    'command': [
                        'postgres',
                        '-c', 'config_file=/etc/postgresql/postgresql.conf',
                        '-c', 'hba_file=/etc/postgresql/pg_hba.conf'
                    ],
                    'healthcheck': {
                        'test': ['CMD-SHELL', 'pg_isready -U garden_app -d garden_dx'],
                        'interval': '10s',
                        'timeout': '5s',
                        'retries': 5
                    }
                },
                'garden-dx-redis': {
                    'image': 'redis:7-alpine',
                    'container_name': f'{self.config.app_name}-redis',
                    'restart': 'unless-stopped',
                    'command': ['redis-server', '--appendonly', 'yes', '--requirepass', '${REDIS_PASSWORD}'],
                    'volumes': ['redis_data:/data'],
                    'networks': ['garden-dx-network'],
                    'healthcheck': {
                        'test': ['CMD', 'redis-cli', 'ping'],
                        'interval': '10s',
                        'timeout': '3s',
                        'retries': 3
                    }
                },
                'garden-dx-nginx': {
                    'image': 'nginx:alpine',
                    'container_name': f'{self.config.app_name}-nginx',
                    'restart': 'unless-stopped',
                    'ports': ['80:80', '443:443'],
                    'volumes': [
                        './nginx/nginx.conf:/etc/nginx/nginx.conf',
                        './nginx/garden-dx.conf:/etc/nginx/conf.d/default.conf',
                        '/etc/ssl/certs:/etc/ssl/certs:ro',
                        '/etc/ssl/private:/etc/ssl/private:ro',
                        './logs/nginx:/var/log/nginx'
                    ],
                    'depends_on': ['garden-dx-app'],
                    'networks': ['garden-dx-network']
                }
            },
            'volumes': {
                'postgres_data': None,
                'redis_data': None
            },
            'networks': {
                'garden-dx-network': {
                    'driver': 'bridge'
                }
            },
            'secrets': {
                'db_password': {
                    'file': './secrets/db_password.txt'
                }
            }
        }
        
        docker_compose_path = self.deploy_dir / "docker-compose.production.yml"
        with open(docker_compose_path, 'w') as f:
            yaml.dump(docker_compose, f, default_flow_style=False, sort_keys=False)
        
        self.logger.info(f"Docker Compose設定生成完了: {docker_compose_path}")
    
    def generate_kubernetes_manifests(self) -> None:
        """Kubernetes マニフェスト生成"""
        k8s_dir = self.deploy_dir / "kubernetes"
        k8s_dir.mkdir(exist_ok=True)
        
        # Namespace
        namespace = {
            'apiVersion': 'v1',
            'kind': 'Namespace',
            'metadata': {
                'name': self.config.app_name,
                'labels': {
                    'app': self.config.app_name,
                    'version': self.config.version
                }
            }
        }
        
        # ConfigMap
        configmap = {
            'apiVersion': 'v1',
            'kind': 'ConfigMap',
            'metadata': {
                'name': f'{self.config.app_name}-config',
                'namespace': self.config.app_name
            },
            'data': {
                'ENVIRONMENT': 'production',
                'LOG_LEVEL': 'INFO',
                'DB_HOST': f'{self.config.app_name}-postgresql',
                'DB_PORT': '5432',
                'DB_NAME': 'garden_dx'
            }
        }
        
        # Secret
        secret = {
            'apiVersion': 'v1',
            'kind': 'Secret',
            'metadata': {
                'name': f'{self.config.app_name}-secrets',
                'namespace': self.config.app_name
            },
            'type': 'Opaque',
            'data': {
                # Base64でエンコードされた値を入力
                'DB_PASSWORD': 'REPLACE_WITH_BASE64_ENCODED_PASSWORD',
                'JWT_SECRET_KEY': 'REPLACE_WITH_BASE64_ENCODED_JWT_SECRET',
                'ENCRYPTION_KEY': 'REPLACE_WITH_BASE64_ENCODED_ENCRYPTION_KEY'
            }
        }
        
        # Deployment
        deployment = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {
                'name': f'{self.config.app_name}-deployment',
                'namespace': self.config.app_name,
                'labels': {
                    'app': self.config.app_name,
                    'version': self.config.version
                }
            },
            'spec': {
                'replicas': self.config.replicas,
                'selector': {
                    'matchLabels': {
                        'app': self.config.app_name
                    }
                },
                'template': {
                    'metadata': {
                        'labels': {
                            'app': self.config.app_name,
                            'version': self.config.version
                        }
                    },
                    'spec': {
                        'containers': [{
                            'name': self.config.app_name,
                            'image': f'{self.config.app_name}:{self.config.version}',
                            'ports': [{'containerPort': 8000}],
                            'env': [
                                {
                                    'name': 'DB_PASSWORD',
                                    'valueFrom': {
                                        'secretKeyRef': {
                                            'name': f'{self.config.app_name}-secrets',
                                            'key': 'DB_PASSWORD'
                                        }
                                    }
                                }
                            ],
                            'envFrom': [{
                                'configMapRef': {
                                    'name': f'{self.config.app_name}-config'
                                }
                            }],
                            'resources': {
                                'requests': {
                                    'cpu': self.config.cpu_request,
                                    'memory': self.config.memory_request
                                },
                                'limits': {
                                    'cpu': self.config.cpu_limit,
                                    'memory': self.config.memory_limit
                                }
                            },
                            'livenessProbe': {
                                'httpGet': {
                                    'path': '/health',
                                    'port': 8000
                                },
                                'initialDelaySeconds': 30,
                                'periodSeconds': 10
                            },
                            'readinessProbe': {
                                'httpGet': {
                                    'path': '/ready',
                                    'port': 8000
                                },
                                'initialDelaySeconds': 5,
                                'periodSeconds': 5
                            }
                        }]
                    }
                }
            }
        }
        
        # Service
        service = {
            'apiVersion': 'v1',
            'kind': 'Service',
            'metadata': {
                'name': f'{self.config.app_name}-service',
                'namespace': self.config.app_name
            },
            'spec': {
                'selector': {
                    'app': self.config.app_name
                },
                'ports': [{
                    'port': 80,
                    'targetPort': 8000,
                    'protocol': 'TCP'
                }],
                'type': 'ClusterIP'
            }
        }
        
        # Ingress
        ingress = {
            'apiVersion': 'networking.k8s.io/v1',
            'kind': 'Ingress',
            'metadata': {
                'name': f'{self.config.app_name}-ingress',
                'namespace': self.config.app_name,
                'annotations': {
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
                    'nginx.ingress.kubernetes.io/force-ssl-redirect': 'true',
                    'cert-manager.io/cluster-issuer': 'letsencrypt-prod'
                }
            },
            'spec': {
                'tls': [{
                    'hosts': ['garden-dx.example.com'],
                    'secretName': f'{self.config.app_name}-tls'
                }],
                'rules': [{
                    'host': 'garden-dx.example.com',
                    'http': {
                        'paths': [{
                            'path': '/',
                            'pathType': 'Prefix',
                            'backend': {
                                'service': {
                                    'name': f'{self.config.app_name}-service',
                                    'port': {
                                        'number': 80
                                    }
                                }
                            }
                        }]
                    }
                }]
            }
        }
        
        # ファイル保存
        manifests = {
            'namespace.yaml': namespace,
            'configmap.yaml': configmap,
            'secret.yaml': secret,
            'deployment.yaml': deployment,
            'service.yaml': service,
            'ingress.yaml': ingress
        }
        
        for filename, manifest in manifests.items():
            manifest_path = k8s_dir / filename
            with open(manifest_path, 'w') as f:
                yaml.dump(manifest, f, default_flow_style=False, sort_keys=False)
        
        self.logger.info(f"Kubernetes マニフェスト生成完了: {k8s_dir}")
    
    def generate_nginx_config(self) -> None:
        """Nginx設定生成"""
        nginx_dir = self.deploy_dir / "nginx"
        nginx_dir.mkdir(exist_ok=True)
        
        # Nginx メイン設定
        nginx_conf = '''user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # ログ形式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    # パフォーマンス設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # 設定ファイル読み込み
    include /etc/nginx/conf.d/*.conf;
}'''
        
        # Garden DX サイト設定
        site_conf = f'''# Garden DX - 本番環境Nginx設定
server {{
    listen 80;
    listen [::]:80;
    server_name garden-dx.example.com;
    
    # HTTPからHTTPSへリダイレクト
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name garden-dx.example.com;
    
    # SSL設定
    ssl_certificate /etc/ssl/certs/garden-dx.crt;
    ssl_certificate_key /etc/ssl/private/garden-dx.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # セキュリティ設定
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # アップロードサイズ制限
    client_max_body_size 100M;
    
    # 静的ファイル
    location /static/ {{
        alias /app/frontend/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
    
    location /uploads/ {{
        alias /app/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }}
    
    # API エンドポイント
    location /api/ {{
        proxy_pass http://{self.config.app_name}-app:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }}
    
    # フロントエンドアプリケーション
    location / {{
        try_files $uri $uri/ /index.html;
        root /app/frontend/build;
        expires 1h;
        add_header Cache-Control "public";
    }}
    
    # ヘルスチェック
    location /health {{
        proxy_pass http://{self.config.app_name}-app:8000/health;
        access_log off;
    }}
}}'''
        
        # ファイル保存
        with open(nginx_dir / "nginx.conf", 'w') as f:
            f.write(nginx_conf)
        
        with open(nginx_dir / "garden-dx.conf", 'w') as f:
            f.write(site_conf)
        
        self.logger.info(f"Nginx設定生成完了: {nginx_dir}")
    
    def generate_systemd_service(self) -> None:
        """systemdサービス設定生成"""
        systemd_dir = self.deploy_dir / "systemd"
        systemd_dir.mkdir(exist_ok=True)
        
        service_content = f'''[Unit]
Description=Garden DX Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=exec
User=garden
Group=garden
WorkingDirectory=/opt/garden-dx
Environment=ENVIRONMENT=production
EnvironmentFile=/etc/garden-dx/production.env
ExecStart=/opt/garden-dx/venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 4 --worker-class uvicorn.workers.UvicornWorker backend.main:app
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target'''
        
        with open(systemd_dir / "garden-dx.service", 'w') as f:
            f.write(service_content)
        
        self.logger.info(f"systemdサービス設定生成完了: {systemd_dir}")
    
    def generate_deployment_scripts(self) -> None:
        """デプロイメントスクリプト生成"""
        scripts_dir = self.deploy_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        
        # Docker デプロイスクリプト
        docker_deploy = f'''#!/bin/bash
# Garden DX - Docker デプロイスクリプト

set -e

echo "=== Garden DX Docker デプロイ開始 ==="

# 環境チェック
if [ ! -f ".env.production" ]; then
    echo "エラー: .env.production ファイルが見つかりません"
    exit 1
fi

# イメージビルド
echo "Docker イメージビルド中..."
docker build -t {self.config.app_name}:{self.config.version} .
docker tag {self.config.app_name}:{self.config.version} {self.config.app_name}:latest

# 既存コンテナ停止・削除
echo "既存コンテナ停止中..."
docker-compose -f deployment/docker-compose.production.yml down

# 新しいコンテナ起動
echo "新しいコンテナ起動中..."
docker-compose -f deployment/docker-compose.production.yml up -d

# ヘルスチェック
echo "アプリケーション起動確認中..."
for i in {{1..30}}; do
    if curl -f http://localhost:8000/health; then
        echo "✅ アプリケーション起動完了"
        break
    fi
    echo "待機中... ($i/30)"
    sleep 10
done

echo "=== デプロイ完了 ==="'''
        
        # Kubernetes デプロイスクリプト
        k8s_deploy = f'''#!/bin/bash
# Garden DX - Kubernetes デプロイスクリプト

set -e

echo "=== Garden DX Kubernetes デプロイ開始 ==="

# Namespace作成
kubectl apply -f deployment/kubernetes/namespace.yaml

# ConfigMap・Secret適用
kubectl apply -f deployment/kubernetes/configmap.yaml
kubectl apply -f deployment/kubernetes/secret.yaml

# アプリケーションデプロイ
kubectl apply -f deployment/kubernetes/deployment.yaml
kubectl apply -f deployment/kubernetes/service.yaml
kubectl apply -f deployment/kubernetes/ingress.yaml

# デプロイ状況確認
echo "デプロイ状況確認中..."
kubectl rollout status deployment/{self.config.app_name}-deployment -n {self.config.app_name}

echo "=== デプロイ完了 ==="'''
        
        # バックアップスクリプト
        backup_script = '''#!/bin/bash
# Garden DX - バックアップスクリプト

set -e

echo "=== Garden DX バックアップ開始 ==="

# 環境変数読み込み
source /etc/garden-dx/production.env

# データベースバックアップ
python3 /opt/garden-dx/backup/backup_manager.py full

# ファイルバックアップ
tar -czf /var/backups/garden_dx/files_$(date +%Y%m%d_%H%M%S).tar.gz /opt/garden-dx/uploads

echo "=== バックアップ完了 ==="'''
        
        # ファイル保存
        scripts = {
            'docker-deploy.sh': docker_deploy,
            'k8s-deploy.sh': k8s_deploy,
            'backup.sh': backup_script
        }
        
        for filename, content in scripts.items():
            script_path = scripts_dir / filename
            with open(script_path, 'w') as f:
                f.write(content)
            os.chmod(script_path, 0o755)  # 実行権限付与
        
        self.logger.info(f"デプロイメントスクリプト生成完了: {scripts_dir}")
    
    def deploy_all(self) -> None:
        """全デプロイメント設定生成"""
        try:
            self.logger.info("本番環境デプロイメント設定生成開始")
            
            self.generate_dockerfile()
            self.generate_docker_compose()
            self.generate_kubernetes_manifests()
            self.generate_nginx_config()
            self.generate_systemd_service()
            self.generate_deployment_scripts()
            
            self.logger.info("本番環境デプロイメント設定生成完了")
            
        except Exception as e:
            self.logger.error(f"デプロイメント設定生成エラー: {str(e)}")
            raise

# デプロイメント実行用関数
def generate_production_deployment() -> None:
    """本番環境デプロイメント設定生成"""
    config = DeploymentConfig()
    deployer = ProductionDeployer(config)
    deployer.deploy_all()
    print("本番環境デプロイメント設定生成完了")

if __name__ == "__main__":
    generate_production_deployment()