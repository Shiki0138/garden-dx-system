# Garden DX システム運用マニュアル
## 🔧 管理者向け運用・保守ガイド

---

## 📋 目次

1. [システム概要](#システム概要)
2. [運用環境](#運用環境)
3. [日常運用](#日常運用)
4. [監視・アラート](#監視アラート)
5. [バックアップ・復旧](#バックアップ復旧)
6. [セキュリティ管理](#セキュリティ管理)
7. [ユーザー管理](#ユーザー管理)
8. [パフォーマンス管理](#パフォーマンス管理)
9. [メンテナンス](#メンテナンス)
10. [インシデント対応](#インシデント対応)
11. [運用スクリプト](#運用スクリプト)
12. [ログ管理](#ログ管理)

---

## システム概要

### アーキテクチャ概要

Garden DX は以下のコンポーネントで構成される3層アーキテクチャです：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │    Application  │    │      Data       │
│      Layer      │    │      Layer      │    │     Layer       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ React Frontend  │◄──►│ FastAPI Backend │◄──►│ PostgreSQL DB   │
│ Nginx Proxy     │    │ Redis Cache     │    │ File Storage    │
│ Load Balancer   │    │ Background Job  │    │ Log Storage     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### システム要件

#### 最小システム要件
- **CPU**: 4コア以上
- **メモリ**: 8GB以上  
- **ストレージ**: 100GB以上（SSD推奨）
- **ネットワーク**: 100Mbps以上

#### 推奨システム要件（本番環境）
- **CPU**: 8コア以上
- **メモリ**: 16GB以上
- **ストレージ**: 500GB以上（NVMe SSD）
- **ネットワーク**: 1Gbps以上

---

## 運用環境

### 🏗️ インフラ構成

#### 本番環境構成
```
Internet
    │
    ▼
┌─────────────┐
│Load Balancer│ (nginx)
│   (SSL)     │
└─────────────┘
    │
    ▼
┌─────────────┐    ┌─────────────┐
│  Frontend   │    │  Backend    │
│   (React)   │    │ (FastAPI)   │
│   nginx     │    │  Gunicorn   │
└─────────────┘    └─────────────┘
                        │
                        ▼
    ┌─────────────┐    ┌─────────────┐
    │ PostgreSQL  │    │   Redis     │
    │   (Main)    │    │  (Cache)    │
    └─────────────┘    └─────────────┘
            │
            ▼
    ┌─────────────┐
    │ PostgreSQL  │
    │  (Backup)   │
    └─────────────┘
```

#### 開発・ステージング環境
```yaml
# docker-compose.yml による構成
services:
  frontend:
    image: garden-dx/frontend:latest
    ports: ["3000:3000"]
  
  backend:
    image: garden-dx/backend:latest
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/garden_dx
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=garden_dx
  
  redis:
    image: redis:7-alpine
```

### 🔧 サービス管理

#### Systemd サービス（本番環境）

**Frontend サービス**
```ini
# /etc/systemd/system/garden-frontend.service
[Unit]
Description=Garden DX Frontend
After=network.target

[Service]
Type=simple
User=garden
WorkingDirectory=/opt/garden-dx/app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Backend サービス**
```ini
# /etc/systemd/system/garden-backend.service
[Unit]
Description=Garden DX Backend
After=network.target postgresql.service

[Service]
Type=simple
User=garden
WorkingDirectory=/opt/garden-dx/backend
ExecStart=/opt/garden-dx/backend/venv/bin/gunicorn main:app \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### サービス操作コマンド
```bash
# サービス開始
sudo systemctl start garden-frontend garden-backend

# サービス停止
sudo systemctl stop garden-frontend garden-backend

# サービス再起動
sudo systemctl restart garden-frontend garden-backend

# サービス状態確認
sudo systemctl status garden-frontend garden-backend

# 自動起動有効化
sudo systemctl enable garden-frontend garden-backend

# ログ確認
sudo journalctl -u garden-backend -f
```

---

## 日常運用

### 📅 日次運用タスク

#### 朝の健全性チェック
```bash
#!/bin/bash
# daily-health-check.sh

echo "🌅 Garden DX 日次健全性チェック開始"
echo "実行日時: $(date)"

# 1. サービス状態確認
echo "📊 サービス状態チェック..."
systemctl is-active garden-frontend garden-backend postgres redis

# 2. ディスク使用量確認
echo "💾 ディスク使用量チェック..."
df -h | grep -E "(/$|/opt/garden-dx|/var/lib/postgresql)"

# 3. メモリ使用量確認
echo "🧠 メモリ使用量チェック..."
free -h

# 4. データベース接続確認
echo "🗄️ データベース接続チェック..."
sudo -u postgres psql -d garden_dx -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ データベース接続: 正常"
else
    echo "❌ データベース接続: 異常"
fi

# 5. API 健全性確認
echo "🔗 API健全性チェック..."
curl -s http://localhost:8000/health | grep -q "healthy"
if [ $? -eq 0 ]; then
    echo "✅ API: 正常"
else
    echo "❌ API: 異常"
fi

# 6. バックアップ確認
echo "🔄 最新バックアップ確認..."
LATEST_BACKUP=$(ls -t /opt/garden-dx/backups/*.sql 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1)
    echo "✅ 最新バックアップ: $BACKUP_DATE"
else
    echo "❌ バックアップファイルが見つかりません"
fi

echo "🏁 健全性チェック完了"
```

#### 夜間バッチ処理
```bash
#!/bin/bash
# nightly-maintenance.sh

echo "🌙 Garden DX 夜間メンテナンス開始"

# 1. ログローテーション
echo "📋 ログローテーション実行..."
sudo logrotate /etc/logrotate.d/garden-dx

# 2. データベース統計更新
echo "📊 データベース統計更新..."
sudo -u postgres psql -d garden_dx -c "ANALYZE;"

# 3. 一時ファイル削除
echo "🗑️ 一時ファイル削除..."
find /tmp -name "garden-dx-*" -mtime +1 -delete
find /opt/garden-dx/app/uploads/temp -mtime +1 -delete

# 4. キャッシュクリーンアップ
echo "🧹 キャッシュクリーンアップ..."
redis-cli FLUSHDB

# 5. バックアップ実行
echo "💾 データベースバックアップ実行..."
./backup-database.sh

echo "🏁 夜間メンテナンス完了"
```

### 📈 週次運用タスク

#### 週次レポート生成
```bash
#!/bin/bash
# weekly-report.sh

REPORT_DATE=$(date +%Y%m%d)
REPORT_FILE="/opt/garden-dx/reports/weekly-report-$REPORT_DATE.md"

cat > "$REPORT_FILE" << EOF
# Garden DX 週次運用レポート
## 期間: $(date -d '1 week ago' +%Y/%m/%d) - $(date +%Y/%m/%d)

### システム稼働状況
- 稼働率: $(calc_uptime)%
- 平均応答時間: $(calc_avg_response)ms
- エラー率: $(calc_error_rate)%

### 利用統計
- アクティブユーザー数: $(count_active_users)人
- 見積作成数: $(count_estimates)件
- PDF生成数: $(count_pdf_generations)件

### リソース使用状況
- CPU使用率平均: $(calc_avg_cpu)%
- メモリ使用率平均: $(calc_avg_memory)%
- ディスク使用率: $(calc_disk_usage)%

### セキュリティイベント
- ログイン失敗数: $(count_failed_logins)回
- 異常アクセス数: $(count_suspicious_access)回

### 推奨アクション
$(generate_recommendations)
EOF

echo "📊 週次レポートを生成しました: $REPORT_FILE"
```

---

## 監視・アラート

### 📊 監視システム構成

#### Prometheus 設定
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "garden-dx-rules.yml"

scrape_configs:
  - job_name: 'garden-dx-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    
  - job_name: 'garden-dx-frontend'
    static_configs:
      - targets: ['localhost:3000']
      
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### アラートルール
```yaml
# garden-dx-rules.yml
groups:
- name: garden-dx-alerts
  rules:
  # API応答時間アラート
  - alert: HighAPIResponseTime
    expr: http_request_duration_seconds > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "API応答時間が遅延しています"
      description: "API応答時間が{{ $value }}秒です"

  # データベース接続アラート
  - alert: DatabaseConnectionDown
    expr: pg_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "データベース接続が失われました"
      
  # ディスク容量アラート
  - alert: HighDiskUsage
    expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "ディスク使用率が85%を超えました"

  # メモリ使用率アラート
  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemFree_bytes) / node_memory_MemTotal_bytes > 0.90
    for: 3m
    labels:
      severity: critical
    annotations:
      summary: "メモリ使用率が90%を超えました"

  # エラー率アラート
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "エラー率が10%を超えました"
```

#### Grafana ダッシュボード

**主要メトリクス監視**
```json
{
  "dashboard": {
    "title": "Garden DX システム監視",
    "panels": [
      {
        "title": "API応答時間",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds",
            "legendFormat": "API応答時間"
          }
        ]
      },
      {
        "title": "データベース接続数",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "アクティブ接続"
          }
        ]
      },
      {
        "title": "リクエスト数/分",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m]) * 60",
            "legendFormat": "リクエスト/分"
          }
        ]
      }
    ]
  }
}
```

### 🚨 アラート通知設定

#### Slack 通知設定
```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'garden-dx-alerts'

receivers:
- name: 'garden-dx-alerts'
  slack_configs:
  - channel: '#garden-dx-alerts'
    title: 'Garden DX アラート'
    text: |
      {{ range .Alerts }}
      アラート: {{ .Annotations.summary }}
      詳細: {{ .Annotations.description }}
      {{ end }}
```

#### メール通知設定
```bash
# システムアラートメール送信
send_alert_email() {
    local SUBJECT="$1"
    local MESSAGE="$2"
    local RECIPIENT="admin@garden-dx.com"
    
    echo "$MESSAGE" | mail -s "Garden DX Alert: $SUBJECT" "$RECIPIENT"
}

# 使用例
if [ $(check_disk_usage) -gt 85 ]; then
    send_alert_email "ディスク容量不足" "ディスク使用率が85%を超えました"
fi
```

---

## バックアップ・復旧

### 💾 バックアップ戦略

#### バックアップ種別

1. **フルバックアップ**: 日次実行（深夜2:00）
2. **差分バックアップ**: 6時間毎実行
3. **ログバックアップ**: 継続的実行（WAL）
4. **設定バックアップ**: 週次実行

#### バックアップスクリプト

**データベースフルバックアップ**
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/opt/garden-dx/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/garden-dx-full-$DATE.sql"

# ディレクトリ作成
mkdir -p "$BACKUP_DIR"

# フルバックアップ実行
echo "🔄 データベースフルバックアップ開始: $DATE"

sudo -u postgres pg_dump -Fc garden_dx > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ バックアップ成功: $BACKUP_FILE"
    
    # 圧縮
    gzip "$BACKUP_FILE"
    
    # 古いバックアップ削除（30日以上）
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
    
    # バックアップサイズ確認
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "📊 バックアップサイズ: $BACKUP_SIZE"
    
else
    echo "❌ バックアップ失敗"
    exit 1
fi
```

**アプリケーションデータバックアップ**
```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/opt/garden-dx/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_BACKUP_FILE="$BACKUP_DIR/garden-dx-app-$DATE.tar.gz"

echo "🔄 アプリケーションデータバックアップ開始"

# アプリケーションファイルバックアップ
tar -czf "$APP_BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="__pycache__" \
    --exclude="*.log" \
    --exclude="venv" \
    /opt/garden-dx/app \
    /opt/garden-dx/backend \
    /etc/nginx/sites-available/garden-dx \
    /etc/systemd/system/garden-*.service

if [ $? -eq 0 ]; then
    echo "✅ アプリケーションバックアップ成功: $APP_BACKUP_FILE"
else
    echo "❌ アプリケーションバックアップ失敗"
    exit 1
fi
```

#### 自動バックアップ設定

**Crontab 設定**
```bash
# Garden DX バックアップスケジュール
# 毎日深夜2:00にフルバックアップ
0 2 * * * /opt/garden-dx/scripts/backup-database.sh >> /var/log/garden-dx/backup.log 2>&1

# 6時間毎に差分バックアップ
0 */6 * * * /opt/garden-dx/scripts/backup-incremental.sh >> /var/log/garden-dx/backup.log 2>&1

# 毎週日曜日にアプリケーションバックアップ
0 3 * * 0 /opt/garden-dx/scripts/backup-application.sh >> /var/log/garden-dx/backup.log 2>&1

# 毎日バックアップ検証
0 4 * * * /opt/garden-dx/scripts/verify-backup.sh >> /var/log/garden-dx/backup.log 2>&1
```

### 🔄 災害復旧手順

#### データベース復旧
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "使用法: $0 <backup_file>"
    exit 1
fi

echo "🔄 データベース復旧開始: $BACKUP_FILE"

# サービス停止
sudo systemctl stop garden-backend garden-frontend

# データベース復旧
sudo -u postgres dropdb garden_dx
sudo -u postgres createdb garden_dx
sudo -u postgres pg_restore -d garden_dx "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ データベース復旧成功"
    
    # サービス再開
    sudo systemctl start garden-backend garden-frontend
    
    # 健全性チェック
    sleep 10
    curl -s http://localhost:8000/health | grep -q "healthy"
    if [ $? -eq 0 ]; then
        echo "✅ システム復旧完了"
    else
        echo "❌ システム復旧確認でエラー"
    fi
else
    echo "❌ データベース復旧失敗"
    exit 1
fi
```

#### ポイント・イン・タイム・リカバリ（PITR）
```bash
#!/bin/bash
# pitr-recovery.sh

TARGET_TIME="$1"  # 例: 2024-07-06 15:30:00

if [ -z "$TARGET_TIME" ]; then
    echo "使用法: $0 '2024-07-06 15:30:00'"
    exit 1
fi

echo "🕐 ポイント・イン・タイム・リカバリ開始: $TARGET_TIME"

# PostgreSQL停止
sudo systemctl stop postgresql

# WALファイルから復旧
sudo -u postgres pg_ctl start -D /var/lib/postgresql/15/main \
    -o "-c recovery_target_time='$TARGET_TIME'"

echo "✅ PITR完了: $TARGET_TIME"
```

---

## セキュリティ管理

### 🛡️ セキュリティ監視

#### ログイン試行監視
```bash
#!/bin/bash
# security-monitor.sh

LOGFILE="/var/log/garden-dx/auth.log"
THRESHOLD=5
TIMEFRAME=300  # 5分間

# 失敗したログイン試行を監視
monitor_failed_logins() {
    FAILED_ATTEMPTS=$(grep "authentication failed" "$LOGFILE" | \
        awk -v threshold=$(date -d '5 minutes ago' +%s) \
        '{ if (systime() - threshold <= 300) print }' | wc -l)
    
    if [ "$FAILED_ATTEMPTS" -gt "$THRESHOLD" ]; then
        echo "🚨 セキュリティアラート: 失敗ログイン試行が多数検出されました"
        echo "過去5分間で $FAILED_ATTEMPTS 回の失敗"
        
        # IP別の失敗試行統計
        grep "authentication failed" "$LOGFILE" | \
            tail -$FAILED_ATTEMPTS | \
            awk '{print $1}' | sort | uniq -c | sort -nr
    fi
}

# 異常なAPIアクセスパターン監視
monitor_api_access() {
    API_LOGFILE="/var/log/garden-dx/api.log"
    
    # 短時間での大量リクエスト検出
    SUSPICIOUS_IPS=$(awk -v threshold=$(date -d '1 minute ago' +%s) \
        '$4 > threshold {print $1}' "$API_LOGFILE" | \
        sort | uniq -c | awk '$1 > 100 {print $2}')
    
    if [ -n "$SUSPICIOUS_IPS" ]; then
        echo "🚨 異常なAPI アクセス検出:"
        echo "$SUSPICIOUS_IPS"
    fi
}

# セキュリティイベント監視実行
monitor_failed_logins
monitor_api_access
```

#### 侵入検知システム（IDS）設定
```bash
#!/bin/bash
# ids-setup.sh

# fail2ban設定
cat > /etc/fail2ban/jail.d/garden-dx.conf << EOF
[garden-dx-auth]
enabled = true
port = 8000
filter = garden-dx-auth
logpath = /var/log/garden-dx/auth.log
maxretry = 5
bantime = 3600
findtime = 600

[garden-dx-api]
enabled = true
port = 8000
filter = garden-dx-api
logpath = /var/log/garden-dx/api.log
maxretry = 50
bantime = 1800
findtime = 300
EOF

# フィルター定義
cat > /etc/fail2ban/filter.d/garden-dx-auth.conf << EOF
[Definition]
failregex = authentication failed.*<HOST>
ignoreregex =
EOF

# fail2ban再起動
sudo systemctl restart fail2ban
```

### 🔐 SSL/TLS 証明書管理

#### Let's Encrypt 証明書自動更新
```bash
#!/bin/bash
# ssl-renewal.sh

DOMAIN="yourdomain.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

# 証明書有効期限チェック
check_cert_expiry() {
    EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_PATH/cert.pem" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    echo "📅 SSL証明書有効期限まで: $DAYS_LEFT 日"
    
    # 30日以内に期限切れの場合は更新
    if [ "$DAYS_LEFT" -lt 30 ]; then
        echo "🔄 SSL証明書更新開始..."
        certbot renew --quiet
        
        if [ $? -eq 0 ]; then
            echo "✅ SSL証明書更新成功"
            sudo systemctl reload nginx
        else
            echo "❌ SSL証明書更新失敗"
            # アラート送信
            send_alert_email "SSL証明書更新失敗" "SSL証明書の更新に失敗しました"
        fi
    fi
}

check_cert_expiry
```

---

## ユーザー管理

### 👥 ユーザーアカウント管理

#### 新規ユーザー作成
```bash
#!/bin/bash
# create-user.sh

EMAIL="$1"
NAME="$2"
ROLE="$3"  # owner または employee

if [ $# -ne 3 ]; then
    echo "使用法: $0 <email> <name> <role>"
    echo "例: $0 test@example.com 'テスト太郎' employee"
    exit 1
fi

# データベースに新規ユーザー追加
sudo -u postgres psql -d garden_dx << EOF
INSERT INTO users (email, name, role, is_active, created_at)
VALUES ('$EMAIL', '$NAME', '$ROLE', true, NOW());
EOF

if [ $? -eq 0 ]; then
    echo "✅ ユーザー作成成功: $EMAIL"
    echo "📧 招待メールを送信してください"
else
    echo "❌ ユーザー作成失敗"
fi
```

#### パスワードリセット
```bash
#!/bin/bash
# reset-password.sh

EMAIL="$1"

if [ -z "$EMAIL" ]; then
    echo "使用法: $0 <email>"
    exit 1
fi

# 一時パスワード生成
TEMP_PASSWORD=$(openssl rand -base64 12)

# パスワードハッシュ化
HASHED_PASSWORD=$(python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
print(pwd_context.hash('$TEMP_PASSWORD'))
")

# データベース更新
sudo -u postgres psql -d garden_dx << EOF
UPDATE users 
SET password_hash = '$HASHED_PASSWORD', 
    must_change_password = true 
WHERE email = '$EMAIL';
EOF

if [ $? -eq 0 ]; then
    echo "✅ パスワードリセット成功"
    echo "📧 一時パスワード: $TEMP_PASSWORD"
    echo "⚠️  ユーザーに安全に伝達してください"
else
    echo "❌ パスワードリセット失敗"
fi
```

#### ユーザー活動監視
```bash
#!/bin/bash
# user-activity-report.sh

DAYS="${1:-7}"  # デフォルト7日間

echo "📊 ユーザー活動レポート（過去 $DAYS 日間）"
echo "生成日時: $(date)"
echo

# アクティブユーザー数
ACTIVE_USERS=$(sudo -u postgres psql -d garden_dx -t -c "
SELECT COUNT(DISTINCT user_id) 
FROM user_activity_logs 
WHERE created_at >= NOW() - INTERVAL '$DAYS days';
")

echo "🔥 アクティブユーザー数: $ACTIVE_USERS 人"

# ログイン回数トップ10
echo
echo "📈 ログイン回数トップ10:"
sudo -u postgres psql -d garden_dx -c "
SELECT u.name, u.email, COUNT(*) as login_count
FROM user_activity_logs ual
JOIN users u ON ual.user_id = u.id
WHERE ual.action = 'login' 
  AND ual.created_at >= NOW() - INTERVAL '$DAYS days'
GROUP BY u.id, u.name, u.email
ORDER BY login_count DESC
LIMIT 10;
"

# 機能利用統計
echo
echo "🎯 機能利用統計:"
sudo -u postgres psql -d garden_dx -c "
SELECT action, COUNT(*) as count
FROM user_activity_logs
WHERE created_at >= NOW() - INTERVAL '$DAYS days'
GROUP BY action
ORDER BY count DESC;
"
```

---

## パフォーマンス管理

### ⚡ パフォーマンス監視

#### データベースパフォーマンス監視
```bash
#!/bin/bash
# db-performance-monitor.sh

echo "🗄️ データベースパフォーマンス監視"
echo "監視時刻: $(date)"

# 接続数確認
echo "📊 データベース接続数:"
sudo -u postgres psql -d garden_dx -c "
SELECT state, COUNT(*) 
FROM pg_stat_activity 
WHERE datname = 'garden_dx'
GROUP BY state;
"

# 実行中のクエリ確認
echo
echo "🔄 実行中のクエリ（1秒以上）:"
sudo -u postgres psql -d garden_dx -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '1 seconds'
  AND state = 'active'
ORDER BY duration DESC;
"

# スロークエリログ解析
echo
echo "🐌 スロークエリ（過去24時間）:"
sudo -u postgres psql -d garden_dx -c "
SELECT query, calls, total_time, mean_time, stddev_time, rows
FROM pg_stat_statements 
WHERE total_time > 1000
ORDER BY total_time DESC 
LIMIT 10;
"

# インデックス使用率
echo
echo "📇 インデックス使用率:"
sudo -u postgres psql -d garden_dx -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
"
```

#### アプリケーションパフォーマンス監視
```bash
#!/bin/bash
# app-performance-monitor.sh

API_ENDPOINT="http://localhost:8000"
LOGFILE="/var/log/garden-dx/performance.log"

# API応答時間測定
measure_api_response() {
    local endpoint="$1"
    local start_time=$(date +%s%3N)
    
    curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT$endpoint"
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    echo "$(date) API $endpoint: ${response_time}ms" >> "$LOGFILE"
}

# 主要エンドポイントの応答時間測定
echo "⚡ API応答時間測定開始"

measure_api_response "/health"
measure_api_response "/api/auth/user-features"
measure_api_response "/api/estimates?limit=10"
measure_api_response "/api/price-master?limit=10"

# 過去1時間の平均応答時間計算
echo "📊 過去1時間の平均応答時間:"
awk -v since="$(date -d '1 hour ago' '+%Y-%m-%d %H:%M')" \
    '$1 " " $2 >= since {print $4}' "$LOGFILE" | \
    sed 's/ms//' | \
    awk '{sum+=$1; count++} END {printf "平均: %.2fms\n", sum/count}'
```

### 🚀 パフォーマンス最適化

#### データベース最適化
```sql
-- vacuum-analyze.sql
-- 定期的なデータベースメンテナンス

-- 統計情報更新
ANALYZE;

-- 不要領域回収
VACUUM;

-- インデックス再構築（必要に応じて）
REINDEX DATABASE garden_dx;

-- テーブル統計確認
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

#### キャッシュ最適化
```bash
#!/bin/bash
# cache-optimization.sh

echo "🔄 キャッシュ最適化開始"

# Redis メモリ使用量確認
REDIS_MEMORY=$(redis-cli info memory | grep used_memory_human | cut -d: -f2)
echo "📊 Redis メモリ使用量: $REDIS_MEMORY"

# 期限切れキーの削除
EXPIRED_KEYS=$(redis-cli eval "
local keys = redis.call('keys', ARGV[1])
local expired = 0
for i=1,#keys do
    if redis.call('ttl', keys[i]) == -1 then
        redis.call('del', keys[i])
        expired = expired + 1
    end
end
return expired
" 0 "*")

echo "🗑️ 期限切れキー削除数: $EXPIRED_KEYS"

# アプリケーションキャッシュ更新
curl -X POST "$API_ENDPOINT/api/cache/refresh"

echo "✅ キャッシュ最適化完了"
```

---

## メンテナンス

### 🔧 定期メンテナンス

#### 月次メンテナンス
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "🗓️ Garden DX 月次メンテナンス開始"
echo "実行日時: $(date)"

# 1. ログファイルアーカイブ
echo "📋 ログファイルアーカイブ..."
cd /var/log/garden-dx
for log in *.log; do
    if [ -f "$log" ]; then
        gzip -c "$log" > "archive/$(date +%Y%m)_$log.gz"
        > "$log"  # ログファイルクリア
    fi
done

# 2. データベース統計更新・最適化
echo "🗄️ データベース最適化..."
sudo -u postgres psql -d garden_dx -f /opt/garden-dx/scripts/vacuum-analyze.sql

# 3. 古いバックアップファイル削除
echo "🗑️ 古いバックアップファイル削除..."
find /opt/garden-dx/backups -name "*.sql.gz" -mtime +90 -delete
find /opt/garden-dx/backups -name "*.tar.gz" -mtime +90 -delete

# 4. セキュリティパッチ確認
echo "🛡️ セキュリティパッチ確認..."
apt list --upgradable | grep -i security

# 5. SSL証明書期限チェック
echo "🔐 SSL証明書期限チェック..."
/opt/garden-dx/scripts/ssl-renewal.sh

# 6. ディスク使用量レポート
echo "💾 ディスク使用量レポート..."
df -h > /opt/garden-dx/reports/disk-usage-$(date +%Y%m).txt

echo "✅ 月次メンテナンス完了"
```

#### アプリケーション更新
```bash
#!/bin/bash
# update-application.sh

VERSION="$1"

if [ -z "$VERSION" ]; then
    echo "使用法: $0 <version>"
    echo "例: $0 v1.1.0"
    exit 1
fi

echo "🚀 Garden DX アプリケーション更新開始: $VERSION"

# 1. 事前バックアップ
echo "💾 事前バックアップ実行..."
/opt/garden-dx/scripts/backup-database.sh
/opt/garden-dx/scripts/backup-application.sh

# 2. メンテナンスモード有効化
echo "🔧 メンテナンスモード有効化..."
touch /opt/garden-dx/maintenance.flag
sudo systemctl stop garden-frontend garden-backend

# 3. アプリケーション更新
echo "📦 アプリケーション更新..."
cd /opt/garden-dx
git fetch origin
git checkout "$VERSION"

# 4. 依存関係更新
echo "📚 依存関係更新..."
cd app && npm ci
cd ../backend && pip install -r requirements.txt

# 5. データベースマイグレーション
echo "🗄️ データベースマイグレーション..."
cd /opt/garden-dx/backend
python -m alembic upgrade head

# 6. アプリケーションビルド
echo "🔨 アプリケーションビルド..."
cd /opt/garden-dx/app
npm run build

# 7. サービス再開
echo "🔄 サービス再開..."
sudo systemctl start garden-backend garden-frontend

# 8. ヘルスチェック
echo "❤️ ヘルスチェック..."
sleep 30
curl -f http://localhost:8000/health
if [ $? -eq 0 ]; then
    echo "✅ 更新成功"
    rm -f /opt/garden-dx/maintenance.flag
else
    echo "❌ 更新失敗 - ロールバック実行"
    /opt/garden-dx/scripts/rollback.sh
fi
```

---

## インシデント対応

### 🚨 インシデント対応手順

#### 重要度分類

| レベル | 説明 | 対応時間 | 対応者 |
|--------|------|----------|--------|
| P1 | システム全停止 | 15分以内 | 全員 |
| P2 | 主要機能停止 | 1時間以内 | 担当者+管理者 |
| P3 | 軽微な機能障害 | 4時間以内 | 担当者 |
| P4 | 改善要望 | 24時間以内 | 担当者 |

#### P1インシデント対応手順
```bash
#!/bin/bash
# p1-incident-response.sh

echo "🚨 P1インシデント対応開始"
echo "開始時刻: $(date)"

# 1. 現状確認
echo "📊 システム状態確認..."
systemctl status garden-frontend garden-backend postgres redis
curl -s http://localhost:8000/health

# 2. エラーログ収集
echo "📋 エラーログ収集..."
tail -100 /var/log/garden-dx/error.log > /tmp/incident-logs-$(date +%Y%m%d_%H%M%S).log
journalctl -u garden-backend --since "10 minutes ago" >> /tmp/incident-logs-$(date +%Y%m%d_%H%M%S).log

# 3. 緊急回復試行
echo "🔄 緊急回復試行..."

# サービス再起動
sudo systemctl restart garden-backend garden-frontend

# 10秒待機
sleep 10

# ヘルスチェック
curl -f http://localhost:8000/health
if [ $? -eq 0 ]; then
    echo "✅ システム回復成功"
    exit 0
fi

# 4. ロードバランサーからの切り離し
echo "⚠️ ロードバランサーから切り離し..."
# nginx設定から該当サーバーを無効化

# 5. データベース確認
echo "🗄️ データベース状態確認..."
sudo -u postgres psql -c "SELECT version();"

# 6. 最新バックアップからの復旧
echo "💾 最新バックアップからの復旧..."
LATEST_BACKUP=$(ls -t /opt/garden-dx/backups/*.sql.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    /opt/garden-dx/scripts/restore-database.sh "$LATEST_BACKUP"
fi

echo "🏁 P1インシデント対応完了"
```

#### インシデント通知
```bash
#!/bin/bash
# incident-notification.sh

SEVERITY="$1"
DESCRIPTION="$2"
IMPACT="$3"

# Slack通知
curl -X POST -H 'Content-type: application/json' \
    --data "{
        \"channel\": \"#garden-dx-incidents\",
        \"username\": \"Garden DX Alert\",
        \"text\": \"🚨 インシデント発生\",
        \"attachments\": [{
            \"color\": \"danger\",
            \"fields\": [
                {\"title\": \"重要度\", \"value\": \"$SEVERITY\", \"short\": true},
                {\"title\": \"説明\", \"value\": \"$DESCRIPTION\", \"short\": false},
                {\"title\": \"影響\", \"value\": \"$IMPACT\", \"short\": false},
                {\"title\": \"時刻\", \"value\": \"$(date)\", \"short\": true}
            ]
        }]
    }" \
    https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# メール通知
cat << EOF | mail -s "Garden DX インシデント: $SEVERITY" admin@garden-dx.com
インシデントが発生しました

重要度: $SEVERITY
説明: $DESCRIPTION
影響: $IMPACT
発生時刻: $(date)

対応を開始してください。
EOF
```

### 📊 インシデント後分析

#### ポストモータム（事後分析）
```bash
#!/bin/bash
# postmortem-template.sh

INCIDENT_ID="$1"
DATE=$(date +%Y-%m-%d)

cat > "/opt/garden-dx/incidents/postmortem-$INCIDENT_ID-$DATE.md" << EOF
# インシデント事後分析レポート

## 基本情報
- **インシデントID**: $INCIDENT_ID
- **発生日時**: 
- **解決日時**: 
- **影響時間**: 
- **重要度**: 

## 概要
<!-- インシデントの概要を記載 -->

## タイムライン
- **XX:XX** - インシデント発生
- **XX:XX** - 検知・アラート
- **XX:XX** - 対応開始
- **XX:XX** - 暫定対応
- **XX:XX** - 根本対応
- **XX:XX** - 解決確認

## 根本原因
<!-- 根本原因の詳細分析 -->

## 影響範囲
- **影響ユーザー数**: 
- **影響機能**: 
- **ビジネス影響**: 

## 対応内容
### 暫定対応
<!-- 緊急時の対応内容 -->

### 根本対応
<!-- 根本的な解決策 -->

## 予防策
<!-- 再発防止策 -->

## アクションアイテム
- [ ] アクション1 - 担当者 - 期限
- [ ] アクション2 - 担当者 - 期限

## 学んだこと
<!-- インシデントから得た教訓 -->
EOF

echo "📊 ポストモータム テンプレートを作成しました"
echo "ファイル: /opt/garden-dx/incidents/postmortem-$INCIDENT_ID-$DATE.md"
```

---

## 運用スクリプト

### 🛠️ 便利な運用スクリプト集

#### システム情報収集
```bash
#!/bin/bash
# system-info.sh

echo "🖥️ Garden DX システム情報収集"
echo "実行日時: $(date)"
echo "================================"

# OS情報
echo "📋 OS情報:"
cat /etc/os-release | grep -E "(NAME|VERSION)"
uname -r

# ハードウェア情報
echo
echo "🔧 ハードウェア情報:"
echo "CPU: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs)"
echo "メモリ: $(free -h | grep Mem | awk '{print $2}')"
echo "ディスク: $(df -h / | tail -1 | awk '{print $2}')"

# サービス状態
echo
echo "🔄 サービス状態:"
systemctl is-active garden-frontend garden-backend postgres redis

# ネットワーク情報
echo
echo "🌐 ネットワーク情報:"
ip route get 8.8.8.8 | head -1 | awk '{print "IPアドレス:", $7}'
ss -tuln | grep -E "(3000|8000|5432|6379)"

# データベース情報
echo
echo "🗄️ データベース情報:"
sudo -u postgres psql -d garden_dx -c "
SELECT 
    current_database() as database,
    version() as version,
    pg_size_pretty(pg_database_size(current_database())) as size;
"

# アプリケーション情報
echo
echo "📦 アプリケーション情報:"
cd /opt/garden-dx
echo "バージョン: $(git describe --tags --always)"
echo "最終コミット: $(git log -1 --format='%h %s')"
```

#### ログ解析
```bash
#!/bin/bash
# log-analyzer.sh

DAYS="${1:-1}"  # デフォルト1日

echo "📊 Garden DX ログ解析（過去 $DAYS 日間）"
echo "解析時刻: $(date)"

# エラー統計
echo "❌ エラー統計:"
find /var/log/garden-dx -name "*.log" -mtime -$DAYS -exec \
    grep -h "ERROR\|CRITICAL" {} \; | \
    awk '{print $1}' | sort | uniq -c | sort -nr

# API エンドポイント利用統計
echo
echo "📈 API エンドポイント利用統計:"
grep "GET\|POST\|PUT\|DELETE" /var/log/garden-dx/api.log | \
    grep -o '"[A-Z]* /[^"]*"' | \
    sort | uniq -c | sort -nr | head -10

# 応答時間統計
echo
echo "⚡ 平均応答時間:"
grep "response_time" /var/log/garden-dx/api.log | \
    awk '{sum+=$NF; count++} END {printf "平均: %.2fms\n", sum/count}'

# ユーザーアクティビティ
echo
echo "👥 ユーザーアクティビティ:"
grep "user_login" /var/log/garden-dx/auth.log | \
    awk '{print $3}' | sort | uniq -c | sort -nr | head -10
```

#### データベースメンテナンス
```bash
#!/bin/bash
# db-maintenance.sh

echo "🗄️ データベースメンテナンス開始"

# 1. 接続数確認
echo "📊 現在の接続数:"
sudo -u postgres psql -d garden_dx -c "
SELECT count(*) as connections 
FROM pg_stat_activity 
WHERE datname = 'garden_dx';"

# 2. テーブルサイズ確認
echo
echo "📏 テーブルサイズ TOP10:"
sudo -u postgres psql -d garden_dx -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"

# 3. 未使用インデックス確認
echo
echo "🔍 未使用インデックス:"
sudo -u postgres psql -d garden_dx -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;"

# 4. VACUUM ANALYZE実行
echo
echo "🧹 VACUUM ANALYZE実行中..."
sudo -u postgres psql -d garden_dx -c "VACUUM ANALYZE;"

echo "✅ データベースメンテナンス完了"
```

---

## ログ管理

### 📋 ログ設定・ローテーション

#### rsyslog設定
```bash
# /etc/rsyslog.d/garden-dx.conf
# Garden DX ログ設定

# アプリケーションログ
if $programname == 'garden-dx' then /var/log/garden-dx/app.log
& stop

# エラーログ
if $msg contains 'ERROR' or $msg contains 'CRITICAL' then /var/log/garden-dx/error.log
& stop

# 認証ログ
if $msg contains 'authentication' then /var/log/garden-dx/auth.log
& stop

# APIアクセスログ
if $msg contains 'api_access' then /var/log/garden-dx/api.log
& stop
```

#### logrotate設定
```bash
# /etc/logrotate.d/garden-dx
/var/log/garden-dx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 garden garden
    sharedscripts
    postrotate
        systemctl reload rsyslog
        systemctl reload garden-backend
    endscript
}

# 特別なローテーション設定（重要ログ）
/var/log/garden-dx/error.log {
    hourly
    rotate 168  # 1週間分
    compress
    delaycompress
    notifempty
    create 0644 garden garden
}
```

#### ログ監視・分析
```bash
#!/bin/bash
# log-monitor.sh

LOGDIR="/var/log/garden-dx"

# リアルタイムエラー監視
tail -f "$LOGDIR/error.log" | while read line; do
    echo "[$(date)] ERROR DETECTED: $line"
    
    # 重要なエラーの場合はアラート送信
    if echo "$line" | grep -q "CRITICAL\|database.*down\|authentication.*failed"; then
        send_alert_email "重要エラー検出" "$line"
    fi
done &

# 毎分のログ統計
while true; do
    echo "$(date) - エラー数: $(tail -100 $LOGDIR/error.log | wc -l)"
    echo "$(date) - API リクエスト数: $(tail -100 $LOGDIR/api.log | wc -l)"
    sleep 60
done
```

---

## 📞 サポート・エスカレーション

### 緊急連絡体制

#### エスカレーション手順

1. **Level 1**: 運用担当者（初期対応）
2. **Level 2**: システム管理者（技術的問題）
3. **Level 3**: 開発チーム（アプリケーション問題）
4. **Level 4**: アーキテクト（設計問題）

#### 連絡先リスト
```yaml
# contacts.yml
emergency_contacts:
  level1:
    - name: "運用担当者A"
      phone: "090-XXXX-XXXX"
      email: "ops-a@garden-dx.com"
      slack: "@ops-a"
  
  level2:
    - name: "システム管理者"
      phone: "090-YYYY-YYYY"
      email: "sysadmin@garden-dx.com"
      slack: "@sysadmin"
  
  level3:
    - name: "開発チームリード"
      phone: "090-ZZZZ-ZZZZ"
      email: "dev-lead@garden-dx.com"
      slack: "@dev-lead"

escalation_rules:
  - condition: "P1インシデント"
    immediate_notify: ["level1", "level2", "level3"]
  - condition: "P2インシデント"
    immediate_notify: ["level1", "level2"]
  - condition: "30分未解決"
    escalate_to: "level3"
```

---

## 📊 運用メトリクス・KPI

### 主要指標

| 指標 | 目標値 | 測定方法 | 頻度 |
|------|--------|----------|------|
| 稼働率 | 99.9%+ | システム監視 | 24/7 |
| 応答時間 | <2秒 | API監視 | リアルタイム |
| エラー率 | <0.1% | ログ解析 | 時間毎 |
| バックアップ成功率 | 100% | バックアップログ | 日次 |
| セキュリティイベント | 0件 | セキュリティログ | 日次 |

### ダッシュボード

**運用ダッシュボード**（Grafana）
- システム稼働状況
- パフォーマンスメトリクス
- エラー率・アラート状況
- リソース使用率
- ユーザー活動状況

---

**Garden DX システム運用マニュアル v1.0**  
**最終更新日: 2024年7月6日**  
**作成者: Garden DX 運用チーム**

© 2024 Garden DX. All rights reserved.