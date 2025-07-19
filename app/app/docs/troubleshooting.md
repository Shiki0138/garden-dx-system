# Garden DX トラブルシューティングガイド
## 🔧 問題解決・診断ガイド

---

## 📋 目次

1. [概要](#概要)
2. [基本診断手順](#基本診断手順)
3. [システム起動問題](#システム起動問題)
4. [パフォーマンス問題](#パフォーマンス問題)
5. [データベース問題](#データベース問題)
6. [認証・権限問題](#認証権限問題)
7. [PDF生成問題](#pdf生成問題)
8. [ネットワーク問題](#ネットワーク問題)
9. [ストレージ問題](#ストレージ問題)
10. [セキュリティ問題](#セキュリティ問題)
11. [ユーザー操作問題](#ユーザー操作問題)
12. [診断ツール・コマンド](#診断ツールコマンド)
13. [ログ分析](#ログ分析)
14. [エラーコード一覧](#エラーコード一覧)
15. [FAQ](#faq)

---

## 概要

このガイドは Garden DX システムで発生する一般的な問題の診断と解決方法を提供します。問題の重要度に応じて適切な対応を行ってください。

### 🚨 重要度分類

| レベル | 説明 | 対応時間 | 例 |
|--------|------|----------|-----|
| **P1** | システム全停止 | 15分以内 | サービス起動不可、DB接続不可 |
| **P2** | 主要機能停止 | 1時間以内 | PDF生成不可、ログイン不可 |
| **P3** | 軽微な機能障害 | 4時間以内 | 表示崩れ、一部機能遅延 |
| **P4** | 改善要望 | 24時間以内 | 使い勝手の改善 |

### 🔍 問題診断の基本フロー

```
問題発生
    ↓
症状の確認・記録
    ↓
基本診断実行
    ↓
ログ確認
    ↓
原因特定
    ↓
解決策適用
    ↓
動作確認
    ↓
再発防止策
```

---

## 基本診断手順

### 🩺 システム健全性チェック

#### 1. サービス状態確認
```bash
#!/bin/bash
# basic-health-check.sh

echo "🔍 Garden DX 基本診断開始"
echo "実行時刻: $(date)"
echo "==============================="

# サービス状態確認
echo "📊 サービス状態:"
for service in garden-frontend garden-backend postgresql redis; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: 稼働中"
    else
        echo "❌ $service: 停止中"
        echo "   エラー詳細: $(systemctl status $service --no-pager -l | tail -3)"
    fi
done

# ポート確認
echo
echo "🔌 ポート状態:"
for port in 3000 8000 5432 6379; do
    if ss -tuln | grep -q ":$port "; then
        echo "✅ ポート $port: LISTEN中"
    else
        echo "❌ ポート $port: 未使用"
    fi
done

# API健全性確認
echo
echo "🔗 API健全性:"
API_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:8000/health -o /dev/null)
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API: 正常応答 (HTTP 200)"
else
    echo "❌ API: 異常応答 (HTTP $API_RESPONSE)"
fi

# データベース接続確認
echo
echo "🗄️ データベース接続:"
if sudo -u postgres psql -d garden_dx -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ データベース: 接続正常"
else
    echo "❌ データベース: 接続失敗"
fi

# ディスク容量確認
echo
echo "💾 ディスク使用量:"
df -h | grep -E "($|/opt/garden-dx|/var/lib/postgresql)" | while read line; do
    usage=$(echo $line | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -gt 90 ]; then
        echo "⚠️ $line - 警告: 容量不足"
    elif [ "$usage" -gt 80 ]; then
        echo "🔶 $line - 注意: 容量多め"
    else
        echo "✅ $line - 正常"
    fi
done

# メモリ使用量確認
echo
echo "🧠 メモリ使用量:"
free -h | grep Mem | awk '{
    used=$3; total=$2; 
    print "使用中:", used, "/", total
    if (used/total > 0.9) print "⚠️ メモリ不足の可能性"
    else print "✅ メモリ使用量正常"
}'

echo
echo "🏁 基本診断完了"
```

#### 2. クイック診断コマンド
```bash
# 一行でシステム状態確認
systemctl is-active garden-frontend garden-backend postgresql redis && \
curl -s http://localhost:8000/health && \
echo "✅ システム正常"

# 主要ログの最新エラー確認
tail -20 /var/log/garden-dx/error.log | grep -E "ERROR|CRITICAL"

# リソース使用量確認
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free | grep Mem | awk '{printf "%.1f%%\n", $3/$2 * 100.0}')"
echo "Disk: $(df / | tail -1 | awk '{print $5}')"
```

---

## システム起動問題

### 🚫 サービス起動失敗

#### **症状**: garden-backend が起動しない
```bash
# 診断手順
echo "🔍 Backend起動問題診断"

# 1. サービス状態詳細確認
sudo systemctl status garden-backend -l

# 2. ログ確認
sudo journalctl -u garden-backend --since "10 minutes ago" -f

# 3. 設定ファイル確認
echo "📄 設定ファイル確認:"
if [ -f /opt/garden-dx/backend/.env ]; then
    echo "✅ .env ファイル存在"
else
    echo "❌ .env ファイル不存在"
fi

# 4. Python環境確認
echo "🐍 Python環境確認:"
cd /opt/garden-dx/backend
if [ -d venv ]; then
    source venv/bin/activate
    python --version
    pip list | grep -E "(fastapi|sqlalchemy|psycopg2)"
else
    echo "❌ 仮想環境が見つかりません"
fi

# 5. ポート使用状況確認
echo "🔌 ポート8000使用状況:"
ss -tuln | grep 8000
lsof -i :8000
```

**よくある原因と解決策:**

1. **環境変数設定エラー**
```bash
# .env ファイル確認・修正
cd /opt/garden-dx/backend
cp .env.example .env
nano .env  # 適切な値を設定

# 必須環境変数例
DATABASE_URL=postgresql://user:password@localhost:5432/garden_dx
JWT_SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

2. **データベース接続エラー**
```bash
# PostgreSQL接続確認
sudo -u postgres psql -c "SELECT version();"

# データベース存在確認
sudo -u postgres psql -l | grep garden_dx

# 接続権限確認
sudo -u postgres psql -c "SELECT rolname FROM pg_roles WHERE rolcanlogin = true;"
```

3. **Python依存関係エラー**
```bash
# 仮想環境再作成
cd /opt/garden-dx/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. **ポート競合**
```bash
# ポート8000を使用しているプロセス確認
sudo fuser 8000/tcp

# プロセス強制終了
sudo kill -9 $(sudo fuser 8000/tcp 2>/dev/null)

# 代替ポート使用
export PORT=8001
python main.py
```

#### **症状**: garden-frontend が起動しない

```bash
# 診断手順
echo "🔍 Frontend起動問題診断"

# 1. Node.js環境確認
node --version
npm --version

# 2. 依存関係確認
cd /opt/garden-dx/app
npm ls | grep -E "(react|styled-components)" || echo "依存関係に問題あり"

# 3. ビルド状況確認
if [ -d build ]; then
    echo "✅ ビルドディレクトリ存在"
    ls -la build/
else
    echo "❌ ビルドディレクトリ不存在 - ビルド実行が必要"
    npm run build
fi

# 4. nginx設定確認（本番環境の場合）
sudo nginx -t
sudo systemctl status nginx
```

**解決策:**

1. **Node.js依存関係エラー**
```bash
# node_modules再インストール
cd /opt/garden-dx/app
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Node.jsバージョン確認
node --version  # 20.x 推奨
```

2. **ビルドエラー**
```bash
# メモリ不足の場合
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# TypeScriptエラーの場合
npm run typecheck
```

3. **nginx設定エラー**
```bash
# nginx設定テスト
sudo nginx -t

# 設定ファイル確認
sudo nano /etc/nginx/sites-available/garden-dx

# nginx再起動
sudo systemctl restart nginx
```

---

## パフォーマンス問題

### 🐌 応答速度低下

#### **症状**: API応答が遅い（>2秒）

```bash
#!/bin/bash
# performance-diagnosis.sh

echo "⚡ パフォーマンス診断開始"

# 1. API応答時間測定
echo "📊 API応答時間測定:"
for endpoint in "/health" "/api/estimates" "/api/price-master"; do
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:8000$endpoint")
    echo "  $endpoint: ${response_time}秒"
    
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        echo "  ⚠️ 応答時間が遅い: $endpoint"
    fi
done

# 2. データベースパフォーマンス確認
echo
echo "🗄️ データベースパフォーマンス:"
sudo -u postgres psql -d garden_dx -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE total_time > 1000 
ORDER BY total_time DESC 
LIMIT 5;"

# 3. システムリソース確認
echo
echo "🖥️ システムリソース:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "メモリ使用率: $(free | grep Mem | awk '{printf "%.1f%%\n", $3/$2 * 100.0}')"
echo "I/O待機: $(iostat -c 1 1 | tail -1 | awk '{print $4}')%"

# 4. プロセス状況確認
echo
echo "🔄 プロセス状況:"
ps aux | grep -E "(garden|gunicorn|node)" | grep -v grep

# 5. ネットワーク状況確認
echo
echo "🌐 ネットワーク状況:"
ss -tuln | grep -E "(3000|8000|5432|6379)"
```

**原因と解決策:**

1. **データベーススロークエリ**
```sql
-- スロークエリ特定
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- インデックス確認
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- VACUUM ANALYZE実行
VACUUM ANALYZE;
```

2. **メモリ不足**
```bash
# メモリ使用量詳細確認
free -h
cat /proc/meminfo | grep -E "(MemTotal|MemFree|MemAvailable|Cached)"

# スワップ使用状況
swapon --show

# メモリを多く使用しているプロセス
ps aux --sort=-%mem | head -10

# 解決策: メモリ追加またはプロセス最適化
sudo systemctl restart garden-backend  # 一時的解決
```

3. **CPU高負荷**
```bash
# CPU使用率確認
top -bn1 | head -20

# CPUを多く使用しているプロセス
ps aux --sort=-%cpu | head -10

# ロードアベレージ確認
uptime

# 解決策
sudo systemctl restart garden-backend
# または worker数調整
```

4. **I/O待機**
```bash
# ディスクI/O確認
iostat -x 1 5

# ディスク使用率確認
df -h

# ディスクI/O待機プロセス確認
iotop -o -d 1

# 解決策: ディスクキャッシュクリア
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

#### **症状**: フロントエンド表示が遅い

```bash
# フロントエンド診断
echo "🖼️ フロントエンド パフォーマンス診断"

# 1. ブラウザネットワークタブでの確認指示
echo "📋 ブラウザでの確認項目:"
echo "1. F12 → Network タブを開く"
echo "2. ページを再読み込み"
echo "3. 読み込み時間が長いリソースを確認"
echo "4. Console タブでJavaScriptエラーを確認"

# 2. 静的ファイル配信確認
echo
echo "📦 静的ファイル確認:"
if [ -d "/opt/garden-dx/app/build/static" ]; then
    echo "✅ ビルドファイル存在"
    du -sh /opt/garden-dx/app/build/static/*
else
    echo "❌ ビルドファイル不存在"
fi

# 3. nginx設定確認（gzip圧縮等）
echo
echo "🗜️ nginx圧縮設定確認:"
sudo nginx -T 2>/dev/null | grep -A 5 -B 5 gzip || echo "gzip設定を確認してください"
```

**解決策:**

1. **バンドルサイズ最適化**
```bash
# バンドル分析
cd /opt/garden-dx/app
npm run build:analyze

# 不要な依存関係削除
npm ls --depth=0
npm uninstall <unused-package>

# コード分割実装
# React.lazy() でコンポーネントの遅延読み込み
```

2. **nginx最適化**
```nginx
# /etc/nginx/sites-available/garden-dx
server {
    # gzip圧縮有効化
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # 静的ファイルキャッシュ
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 圧縮済みファイル配信
    location ~* \.(js|css)$ {
        gzip_static on;
    }
}
```

---

## データベース問題

### 🗄️ PostgreSQL 関連問題

#### **症状**: データベース接続失敗

```bash
# データベース診断
echo "🗄️ データベース診断開始"

# 1. PostgreSQL サービス状態
sudo systemctl status postgresql

# 2. 接続テスト
echo "🔌 接続テスト:"
sudo -u postgres psql -c "SELECT version();" 2>&1

# 3. 設定ファイル確認
echo
echo "⚙️ PostgreSQL設定確認:"
sudo -u postgres psql -c "SHOW config_file;"
sudo -u postgres psql -c "SHOW data_directory;"
sudo -u postgres psql -c "SHOW port;"

# 4. 接続数確認
echo
echo "📊 接続数確認:"
sudo -u postgres psql -c "
SELECT count(*) as current_connections, 
       setting as max_connections
FROM pg_stat_activity, pg_settings 
WHERE name = 'max_connections'
GROUP BY setting;"

# 5. ログ確認
echo
echo "📋 PostgreSQL ログ確認:"
sudo tail -20 /var/log/postgresql/postgresql-15-main.log
```

**よくある問題と解決策:**

1. **接続数上限超過**
```sql
-- 現在の接続確認
SELECT count(*) FROM pg_stat_activity;

-- アイドル接続の強制切断
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < now() - interval '30 minutes';

-- 設定変更（postgresql.conf）
-- max_connections = 200
```

2. **認証エラー**
```bash
# pg_hba.conf 確認
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 設定例
# local   garden_dx    garden_user                     md5
# host    garden_dx    garden_user     localhost       md5

# PostgreSQL再起動
sudo systemctl restart postgresql
```

3. **ディスク容量不足**
```bash
# データベースサイズ確認
sudo -u postgres psql -c "
SELECT pg_database.datname, 
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database;"

# 大きなテーブル確認
sudo -u postgres psql -d garden_dx -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### **症状**: データベースが重い・遅い

```bash
# データベースパフォーマンス診断
echo "⚡ データベースパフォーマンス診断"

# 1. 実行中クエリ確認
sudo -u postgres psql -d garden_dx -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state = 'active'
ORDER BY duration DESC;"

# 2. ロック確認
sudo -u postgres psql -d garden_dx -c "
SELECT blocked_locks.pid     AS blocked_pid,
       blocked_activity.usename  AS blocked_user,
       blocking_locks.pid     AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query    AS blocked_statement
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"

# 3. インデックス使用状況
sudo -u postgres psql -d garden_dx -c "
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;"
```

**解決策:**

1. **VACUUM・ANALYZE実行**
```sql
-- 統計情報更新
ANALYZE;

-- 不要領域回収
VACUUM;

-- 自動VACUUM設定確認
SHOW autovacuum;
```

2. **インデックス最適化**
```sql
-- 未使用インデックス確認
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- 必要なインデックス追加例
CREATE INDEX CONCURRENTLY idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX CONCURRENTLY idx_estimate_items_estimate_id ON estimate_items(estimate_id);
```

3. **設定最適化**
```bash
# postgresql.conf 最適化例
sudo nano /etc/postgresql/15/main/postgresql.conf

# メモリ設定
shared_buffers = 256MB          # 物理メモリの25%
effective_cache_size = 1GB      # 物理メモリの50-75%
work_mem = 4MB                  # 接続数に応じて調整

# 書き込み性能
wal_buffers = 16MB
checkpoint_completion_target = 0.7
```

---

## 認証・権限問題

### 🔐 ログイン・認証エラー

#### **症状**: ログインできない

```bash
# 認証問題診断
echo "🔐 認証問題診断開始"

# 1. JWT設定確認
echo "🔑 JWT設定確認:"
cd /opt/garden-dx/backend
if grep -q "JWT_SECRET_KEY" .env; then
    echo "✅ JWT_SECRET_KEY設定済み"
else
    echo "❌ JWT_SECRET_KEY未設定"
fi

# 2. ユーザー存在確認
echo
echo "👤 ユーザー確認 (例: test@example.com):"
sudo -u postgres psql -d garden_dx -c "
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'test@example.com';"

# 3. 認証ログ確認
echo
echo "📋 認証ログ確認:"
grep -i "authentication" /var/log/garden-dx/auth.log | tail -10

# 4. API認証テスト
echo
echo "🔍 API認証テスト:"
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' \
  -v
```

**よくある問題と解決策:**

1. **パスワード認証失敗**
```bash
# パスワードハッシュ確認
sudo -u postgres psql -d garden_dx -c "
SELECT email, password_hash 
FROM users 
WHERE email = 'test@example.com';"

# パスワードリセット
cd /opt/garden-dx/backend
python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
print(pwd_context.hash('newpassword'))
"
# 出力されたハッシュをデータベースに更新
```

2. **JWTトークンエラー**
```bash
# JWT設定確認
grep JWT_ /opt/garden-dx/backend/.env

# JWT_SECRET_KEYが未設定の場合
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)" >> /opt/garden-dx/backend/.env

# サービス再起動
sudo systemctl restart garden-backend
```

3. **CORS エラー**
```bash
# CORS設定確認
grep CORS_ORIGINS /opt/garden-dx/backend/.env

# 設定例
echo "CORS_ORIGINS=http://localhost:3000,https://yourdomain.com" >> .env
```

#### **症状**: 権限エラー（403 Forbidden）

```bash
# 権限問題診断
echo "🛡️ 権限問題診断"

# 1. ユーザー権限確認
USER_EMAIL="test@example.com"
sudo -u postgres psql -d garden_dx -c "
SELECT email, role, is_active 
FROM users 
WHERE email = '$USER_EMAIL';"

# 2. APIアクセステスト
echo
echo "🔍 権限テスト:"
# まずトークン取得
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$USER_EMAIL'","password":"password"}' \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 権限チェック
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/auth/check-permission/invoices/create
```

**解決策:**

1. **ユーザーロール変更**
```sql
-- 従業員を経営者に変更
UPDATE users 
SET role = 'owner' 
WHERE email = 'user@example.com';

-- ユーザーを有効化
UPDATE users 
SET is_active = true 
WHERE email = 'user@example.com';
```

2. **権限マトリックス確認**
```bash
# 権限設定確認
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/auth/permission-matrix
```

---

## PDF生成問題

### 📄 PDF関連エラー

#### **症状**: PDF生成に失敗する

```bash
# PDF生成問題診断
echo "📄 PDF生成問題診断"

# 1. PDFライブラリ確認
echo "📚 PDFライブラリ確認:"
cd /opt/garden-dx/backend
source venv/bin/activate
python -c "
try:
    import jspdf
    print('✅ jsPDF: OK')
except ImportError:
    print('❌ jsPDF: 未インストール')

try:
    from reportlab.pdfgen import canvas
    print('✅ ReportLab: OK')
except ImportError:
    print('❌ ReportLab: 未インストール')
"

# 2. フォント確認
echo
echo "🔤 フォント確認:"
fc-list | grep -i "noto\|dejavu" | head -5

# 3. 一時ディレクトリ確認
echo
echo "📁 一時ディレクトリ確認:"
ls -la /tmp/ | grep pdf
ls -la /opt/garden-dx/app/uploads/temp/

# 4. PDF生成テスト
echo
echo "🧪 PDF生成テスト:"
curl -X GET http://localhost:8000/api/demo/estimates/1/pdf \
  -o test.pdf -w "%{http_code}\n"

if [ -f test.pdf ]; then
    echo "✅ PDF生成成功 (サイズ: $(du -h test.pdf | cut -f1))"
    rm test.pdf
else
    echo "❌ PDF生成失敗"
fi
```

**よくある問題と解決策:**

1. **フォント不足**
```bash
# 日本語フォントインストール
sudo apt-get update
sudo apt-get install fonts-noto-cjk fonts-dejavu-core

# フォントキャッシュ更新
sudo fc-cache -fv

# フォント確認
fc-list :lang=ja | head -5
```

2. **権限エラー**
```bash
# 一時ディレクトリ作成・権限設定
sudo mkdir -p /tmp/pdf_temp
sudo chown garden:garden /tmp/pdf_temp
sudo chmod 755 /tmp/pdf_temp

# アップロードディレクトリも同様
sudo mkdir -p /opt/garden-dx/app/uploads/temp
sudo chown garden:garden /opt/garden-dx/app/uploads/temp
```

3. **メモリ不足**
```bash
# Python メモリ制限確認
python3 -c "
import resource
print('メモリ制限:', resource.getrlimit(resource.RLIMIT_AS))
"

# メモリ使用量監視しながらPDF生成
top -p $(pgrep -f "garden-backend") &
# PDF生成実行
```

4. **画像処理エラー**
```bash
# PIL/Pillow確認
python3 -c "
try:
    from PIL import Image
    print('✅ PIL: OK')
    print('対応形式:', Image.registered_extensions())
except ImportError:
    print('❌ PIL: 未インストール')
"

# 画像ライブラリインストール
pip install Pillow
```

#### **症状**: PDF出力内容が正しくない

```bash
# PDF内容問題診断
echo "🔍 PDF内容診断"

# 1. データベースデータ確認
echo "🗄️ 見積データ確認:"
sudo -u postgres psql -d garden_dx -c "
SELECT id, customer_name, project_name, total_amount 
FROM estimates 
WHERE id = 1;"

# 2. 文字化け確認
echo
echo "🔤 文字エンコーディング確認:"
python3 -c "
import locale
print('システムロケール:', locale.getlocale())
print('デフォルトエンコーディング:', locale.getpreferredencoding())
"

# 3. テンプレート確認
echo
echo "📋 PDF テンプレート確認:"
if [ -f "/opt/garden-dx/backend/templates/estimate.html" ]; then
    echo "✅ テンプレートファイル存在"
else
    echo "❌ テンプレートファイル不存在"
fi
```

**解決策:**

1. **文字化け対策**
```python
# PDF生成時のエンコーディング指定
import os
os.environ['LANG'] = 'ja_JP.UTF-8'

# フォント明示的指定
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 日本語フォント登録
pdfmetrics.registerFont(TTFont('NotoSans', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc'))
```

2. **レイアウト崩れ対策**
```javascript
// フロントエンド PDF生成時のCSS調整
const pdfOptions = {
    format: 'A4',
    margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
    },
    printBackground: true
};
```

---

## ネットワーク問題

### 🌐 接続・通信エラー

#### **症状**: API通信エラー

```bash
# ネットワーク診断
echo "🌐 ネットワーク診断開始"

# 1. ポート開放確認
echo "🔌 ポート状態確認:"
for port in 3000 8000 5432 6379; do
    if nc -z localhost $port; then
        echo "✅ ポート $port: 接続可能"
    else
        echo "❌ ポート $port: 接続不可"
    fi
done

# 2. ファイアウォール確認
echo
echo "🛡️ ファイアウォール確認:"
sudo ufw status
sudo iptables -L | grep -E "(3000|8000|5432|6379)"

# 3. DNS解決確認
echo
echo "🔍 DNS解決確認:"
nslookup localhost
ping -c 1 localhost

# 4. 外部接続確認
echo
echo "🌍 外部接続確認:"
curl -I https://www.google.com
```

**解決策:**

1. **ファイアウォール設定**
```bash
# ufw でポート開放
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# iptables でポート開放
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables-save
```

2. **nginx プロキシ設定**
```nginx
# /etc/nginx/sites-available/garden-dx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### **症状**: SSL/HTTPS エラー

```bash
# SSL診断
echo "🔒 SSL診断"

# 1. 証明書確認
echo "📜 SSL証明書確認:"
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep -E "(Issuer|Not After)"

# 2. 証明書有効期限
echo
echo "📅 証明書有効期限:"
openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/cert.pem

# 3. SSL設定テスト
echo
echo "🧪 SSL設定テスト:"
curl -I https://yourdomain.com

# 4. nginx SSL設定確認
echo
echo "⚙️ nginx SSL設定:"
sudo nginx -T | grep -A 10 -B 10 ssl
```

**解決策:**

1. **Let's Encrypt 証明書更新**
```bash
# 証明書更新
sudo certbot renew

# 強制更新
sudo certbot renew --force-renewal

# nginx再起動
sudo systemctl restart nginx
```

2. **SSL設定最適化**
```nginx
# nginx SSL設定例
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

---

## ストレージ問題

### 💾 ディスク・ファイル関連

#### **症状**: ディスク容量不足

```bash
# ストレージ診断
echo "💾 ストレージ診断"

# 1. ディスク使用量確認
echo "📊 ディスク使用量:"
df -h

# 2. 大きなファイル・ディレクトリ特定
echo
echo "📁 大きなディレクトリ TOP10:"
sudo du -sh /* 2>/dev/null | sort -hr | head -10

# 3. Garden DX 関連ファイル確認
echo
echo "🌱 Garden DX ファイルサイズ:"
du -sh /opt/garden-dx/*
du -sh /var/log/garden-dx/
du -sh /opt/garden-dx/backups/

# 4. 不要ファイル確認
echo
echo "🗑️ 削除可能ファイル:"
find /tmp -name "garden-dx-*" -mtime +1 -exec ls -lh {} \;
find /var/log/garden-dx -name "*.log.*" -mtime +30 -exec ls -lh {} \;
```

**解決策:**

1. **ログファイル整理**
```bash
# 古いログファイル削除
find /var/log/garden-dx -name "*.log.*" -mtime +30 -delete

# ログローテーション強制実行
sudo logrotate -f /etc/logrotate.d/garden-dx

# 圧縮されていないログの圧縮
find /var/log/garden-dx -name "*.log" -size +100M -exec gzip {} \;
```

2. **一時ファイル削除**
```bash
# システム一時ファイル削除
sudo find /tmp -type f -atime +7 -delete

# Garden DX 一時ファイル削除
find /opt/garden-dx/app/uploads/temp -mtime +1 -delete
find /tmp -name "garden-dx-*" -mtime +1 -delete
```

3. **バックアップファイル整理**
```bash
# 古いバックアップ削除（90日以上）
find /opt/garden-dx/backups -name "*.sql.gz" -mtime +90 -delete

# バックアップサイズ確認
ls -lah /opt/garden-dx/backups/ | tail -10
```

4. **Docker イメージ・コンテナ削除**
```bash
# 未使用Dockerイメージ削除
docker image prune -a -f

# 停止中コンテナ削除
docker container prune -f

# 未使用ボリューム削除
docker volume prune -f
```

#### **症状**: ファイル権限エラー

```bash
# ファイル権限診断
echo "🔐 ファイル権限診断"

# 1. Garden DX ファイル権限確認
echo "📁 Garden DX ディレクトリ権限:"
ls -la /opt/garden-dx/

# 2. 重要ファイルの権限確認
echo
echo "📄 重要ファイル権限:"
ls -la /opt/garden-dx/backend/.env
ls -la /opt/garden-dx/app/uploads/
ls -la /var/log/garden-dx/

# 3. プロセス実行ユーザー確認
echo
echo "👤 プロセス実行ユーザー:"
ps aux | grep -E "(garden|gunicorn|node)" | grep -v grep
```

**解決策:**

1. **適切な権限設定**
```bash
# Garden DX ディレクトリの所有者変更
sudo chown -R garden:garden /opt/garden-dx/

# 実行権限設定
sudo chmod +x /opt/garden-dx/scripts/*.sh

# 設定ファイル権限（セキュリティ）
sudo chmod 600 /opt/garden-dx/backend/.env

# ログディレクトリ権限
sudo chown -R garden:garden /var/log/garden-dx/
sudo chmod 755 /var/log/garden-dx/
```

2. **systemd サービスユーザー設定**
```ini
# /etc/systemd/system/garden-backend.service
[Service]
User=garden
Group=garden
WorkingDirectory=/opt/garden-dx/backend
```

---

## セキュリティ問題

### 🛡️ セキュリティエラー・脅威

#### **症状**: 不正アクセス検知

```bash
# セキュリティ診断
echo "🛡️ セキュリティ診断開始"

# 1. 失敗ログイン試行確認
echo "🔍 失敗ログイン試行:"
grep "authentication failed" /var/log/garden-dx/auth.log | tail -10

# 2. 異常なAPIアクセス確認
echo
echo "🚨 異常なAPIアクセス:"
awk '{print $1}' /var/log/garden-dx/api.log | sort | uniq -c | sort -nr | head -10

# 3. fail2ban状態確認
echo
echo "🚫 fail2ban状態:"
sudo fail2ban-client status
sudo fail2ban-client status garden-dx-auth

# 4. ファイアウォール状態
echo
echo "🔥 ファイアウォール状態:"
sudo ufw status numbered

# 5. 開放ポート確認
echo
echo "🔌 開放ポート確認:"
sudo ss -tuln | grep LISTEN
```

**対応策:**

1. **fail2ban 設定強化**
```bash
# fail2ban設定更新
sudo nano /etc/fail2ban/jail.d/garden-dx.conf

# より厳しい設定例
[garden-dx-auth]
enabled = true
maxretry = 3      # 3回失敗でBAN
bantime = 3600    # 1時間BAN
findtime = 300    # 5分間の監視

# fail2ban再起動
sudo systemctl restart fail2ban
```

2. **IP アドレス手動BAN**
```bash
# 特定IPを手動BAN
sudo fail2ban-client set garden-dx-auth banip 192.168.1.100

# BAN解除
sudo fail2ban-client set garden-dx-auth unbanip 192.168.1.100

# BAN一覧確認
sudo fail2ban-client status garden-dx-auth
```

3. **ログ監視強化**
```bash
# リアルタイムセキュリティ監視
tail -f /var/log/garden-dx/auth.log | while read line; do
    if echo "$line" | grep -q "authentication failed"; then
        echo "🚨 ALERT: $line"
        # Slack通知などの処理
    fi
done
```

#### **症状**: SSL/TLS 脆弱性

```bash
# SSL セキュリティ診断
echo "🔒 SSL セキュリティ診断"

# 1. SSL Labs テスト（外部）
echo "🌐 SSL Labs テスト実行:"
echo "https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com"

# 2. ローカル SSL 設定確認
echo
echo "⚙️ SSL設定確認:"
sudo nginx -T | grep -A 20 "ssl_"

# 3. 証明書チェーン確認
echo
echo "🔗 証明書チェーン確認:"
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null

# 4. 暗号化スイート確認
echo
echo "🔐 暗号化スイート確認:"
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

**強化策:**

1. **nginx SSL 設定強化**
```nginx
# 強化されたSSL設定
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# セキュリティヘッダー追加
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

2. **DH パラメータ強化**
```bash
# 強力なDHパラメータ生成
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# nginx設定に追加
ssl_dhparam /etc/nginx/dhparam.pem;
```

---

## ユーザー操作問題

### 👥 ユーザー体験関連

#### **症状**: 画面表示異常・操作不能

```bash
# フロントエンド問題診断
echo "🖼️ フロントエンド問題診断"

# 1. ブラウザ互換性確認
echo "🌐 推奨ブラウザ確認指示:"
echo "- Chrome 90+ ✅"
echo "- Firefox 88+ ✅"
echo "- Safari 14+ ✅"
echo "- Edge 90+ ✅"

# 2. JavaScript エラー確認指示
echo
echo "⚠️ ブラウザコンソール確認:"
echo "1. F12 キーを押す"
echo "2. Console タブを開く"
echo "3. エラーメッセージを確認"
echo "4. 赤いエラー行をスクリーンショット"

# 3. ネットワークエラー確認指示
echo
echo "🌐 ネットワーク確認:"
echo "1. F12 → Network タブ"
echo "2. ページリロード"
echo "3. 赤いエラー（4xx, 5xx）を確認"

# 4. ローカルストレージ確認指示
echo
echo "💾 ローカルストレージ確認:"
echo "1. F12 → Application タブ"
echo "2. Local Storage → localhost"
echo "3. 'token' キーの存在確認"
```

**解決策:**

1. **ブラウザキャッシュクリア**
```
ユーザー向け手順:
1. Ctrl + Shift + Delete（Windows）/ Cmd + Shift + Delete（Mac）
2. 「キャッシュされた画像とファイル」をチェック
3. 「削除」をクリック
4. ページを再読み込み（F5）
```

2. **JavaScript エラー対応**
```javascript
// よくあるエラーと対処法

// 1. TypeError: Cannot read property 'xxx' of undefined
// → データが未読み込みの可能性
// 対処: null/undefined チェック追加

// 2. Network Error / Failed to fetch
// → API接続エラー
// 対処: サーバー状態確認

// 3. SyntaxError: Unexpected token
// → JSONパースエラー
// 対処: APIレスポンス形式確認
```

3. **権限エラー画面対応**
```javascript
// 権限エラー時の表示改善
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div>
        <h2>権限エラーが発生しました</h2>
        <p>システム管理者にお問い合わせください</p>
        <button onClick={() => window.location.reload()}>
          ページを再読み込み
        </button>
      </div>
    );
  }
  
  return children;
};
```

#### **症状**: データ保存・更新失敗

```bash
# データ操作問題診断
echo "💾 データ操作問題診断"

# 1. API エンドポイント疎通確認
echo "🔗 API疎通確認:"
curl -X GET http://localhost:8000/api/estimates -H "Authorization: Bearer TOKEN"

# 2. データベース接続確認
echo
echo "🗄️ データベース接続確認:"
sudo -u postgres psql -d garden_dx -c "SELECT COUNT(*) FROM estimates;"

# 3. 権限確認
echo
echo "🔐 権限確認:"
# ユーザートークンでの権限テスト
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/auth/check-permission/estimates/create

# 4. バリデーションエラー確認
echo
echo "✅ バリデーション確認:"
echo "必須項目が全て入力されているか確認"
echo "文字数制限を超えていないか確認"
echo "数値項目に不正な値が入っていないか確認"
```

**解決策:**

1. **データ検証強化**
```javascript
// フロントエンド バリデーション強化
const validateEstimate = (data) => {
  const errors = {};
  
  if (!data.customer_name || data.customer_name.trim() === '') {
    errors.customer_name = '顧客名は必須です';
  }
  
  if (!data.project_name || data.project_name.trim() === '') {
    errors.project_name = 'プロジェクト名は必須です';
  }
  
  if (!data.items || data.items.length === 0) {
    errors.items = '見積項目を1つ以上追加してください';
  }
  
  return errors;
};
```

2. **エラーハンドリング改善**
```javascript
// API エラーハンドリング
const handleApiError = (error) => {
  if (error.response) {
    // サーバーエラー
    const status = error.response.status;
    const message = error.response.data?.message || 'エラーが発生しました';
    
    switch (status) {
      case 400:
        alert(`入力エラー: ${message}`);
        break;
      case 401:
        alert('認証エラー: 再ログインしてください');
        // ログイン画面へリダイレクト
        break;
      case 403:
        alert('権限エラー: この操作を実行する権限がありません');
        break;
      case 500:
        alert('サーバーエラー: システム管理者にお問い合わせください');
        break;
      default:
        alert(`エラー: ${message}`);
    }
  } else if (error.request) {
    // ネットワークエラー
    alert('ネットワークエラー: インターネット接続を確認してください');
  } else {
    // その他のエラー
    alert('予期しないエラーが発生しました');
  }
};
```

---

## 診断ツール・コマンド

### 🔧 便利な診断コマンド集

#### システム情報収集
```bash
#!/bin/bash
# system-diagnostic.sh - 総合診断スクリプト

echo "🔍 Garden DX 総合診断開始"
echo "======================================="

# 基本情報
echo "📋 基本システム情報:"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
echo "カーネル: $(uname -r)"
echo "アップタイム: $(uptime -p)"
echo "現在時刻: $(date)"

# ハードウェア情報
echo
echo "🖥️ ハードウェア情報:"
echo "CPU: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs)"
echo "CPUコア数: $(nproc)"
echo "メモリ総容量: $(free -h | grep Mem | awk '{print $2}')"
echo "ディスク容量: $(df -h / | tail -1 | awk '{print $2}')"

# サービス状態
echo
echo "🔄 サービス状態:"
services=("garden-frontend" "garden-backend" "postgresql" "redis" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        echo "✅ $service: 稼働中"
    else
        echo "❌ $service: 停止中または未インストール"
    fi
done

# ポート状態
echo
echo "🔌 ポート状態:"
ports=(22 80 443 3000 8000 5432 6379)
for port in "${ports[@]}"; do
    if ss -tuln | grep -q ":$port "; then
        echo "✅ ポート $port: LISTEN中"
    else
        echo "⚪ ポート $port: 未使用"
    fi
done

# リソース使用状況
echo
echo "📊 リソース使用状況:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "メモリ使用率: $(free | grep Mem | awk '{printf "%.1f%%\n", $3/$2 * 100.0}')"
echo "ディスク使用率: $(df / | tail -1 | awk '{print $5}')"
echo "ロードアベレージ: $(uptime | awk -F'load average:' '{print $2}')"

# ネットワーク情報
echo
echo "🌐 ネットワーク情報:"
echo "IPアドレス: $(hostname -I | awk '{print $1}')"
echo "ホスト名: $(hostname)"
echo "DNS: $(cat /etc/resolv.conf | grep nameserver | head -1 | awk '{print $2}')"

# Garden DX 固有情報
echo
echo "🌱 Garden DX 情報:"
if [ -d "/opt/garden-dx" ]; then
    echo "インストールディレクトリ: ✅ 存在"
    cd /opt/garden-dx 2>/dev/null
    if [ -d ".git" ]; then
        echo "バージョン: $(git describe --tags --always 2>/dev/null || echo '不明')"
        echo "最終コミット: $(git log -1 --format='%h %s' 2>/dev/null || echo '不明')"
    fi
else
    echo "インストールディレクトリ: ❌ 不存在"
fi

# データベース情報
echo
echo "🗄️ データベース情報:"
if sudo -u postgres psql -d garden_dx -c "SELECT version();" > /dev/null 2>&1; then
    echo "PostgreSQL接続: ✅ 正常"
    DB_SIZE=$(sudo -u postgres psql -d garden_dx -t -c "SELECT pg_size_pretty(pg_database_size('garden_dx'));" 2>/dev/null | xargs)
    echo "データベースサイズ: $DB_SIZE"
    USER_COUNT=$(sudo -u postgres psql -d garden_dx -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    echo "ユーザー数: $USER_COUNT人"
    ESTIMATE_COUNT=$(sudo -u postgres psql -d garden_dx -t -c "SELECT COUNT(*) FROM estimates;" 2>/dev/null | xargs)
    echo "見積数: $ESTIMATE_COUNT件"
else
    echo "PostgreSQL接続: ❌ 失敗"
fi

# API健全性
echo
echo "🔗 API健全性:"
API_STATUS=$(curl -s -w "%{http_code}" http://localhost:8000/health -o /dev/null 2>/dev/null)
if [ "$API_STATUS" = "200" ]; then
    echo "API応答: ✅ 正常 (HTTP 200)"
    API_RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/health 2>/dev/null)
    echo "API応答時間: ${API_RESPONSE_TIME}秒"
else
    echo "API応答: ❌ 異常 (HTTP $API_STATUS)"
fi

echo
echo "🏁 診断完了"
echo "======================================="
```

#### ログ解析ツール
```bash
#!/bin/bash
# log-analyzer.sh - ログ分析ツール

DAYS=${1:-1}
echo "📋 Garden DX ログ分析（過去 $DAYS 日間）"

# エラー統計
echo "❌ エラー統計:"
find /var/log/garden-dx -name "*.log" -mtime -$DAYS -exec \
    grep -h "ERROR\|CRITICAL\|FATAL" {} \; 2>/dev/null | \
    wc -l | awk '{print "総エラー数: " $1 "件"}'

# エラータイプ別集計
echo
echo "📊 エラータイプ別:"
find /var/log/garden-dx -name "*.log" -mtime -$DAYS -exec \
    grep -h "ERROR\|CRITICAL\|FATAL" {} \; 2>/dev/null | \
    awk '{print $3}' | sort | uniq -c | sort -nr

# API アクセス統計
echo
echo "🔗 API アクセス統計:"
if [ -f "/var/log/garden-dx/api.log" ]; then
    echo "総リクエスト数: $(wc -l < /var/log/garden-dx/api.log)件"
    echo "ユニークIP数: $(awk '{print $1}' /var/log/garden-dx/api.log | sort -u | wc -l)個"
    
    echo
    echo "人気エンドポイント TOP5:"
    grep -o '"[A-Z]* /[^"]*"' /var/log/garden-dx/api.log 2>/dev/null | \
        sort | uniq -c | sort -nr | head -5
fi

# 認証統計
echo
echo "🔐 認証統計:"
if [ -f "/var/log/garden-dx/auth.log" ]; then
    echo "ログイン成功: $(grep -c "login success" /var/log/garden-dx/auth.log 2>/dev/null)件"
    echo "ログイン失敗: $(grep -c "authentication failed" /var/log/garden-dx/auth.log 2>/dev/null)件"
fi

# パフォーマンス統計
echo
echo "⚡ パフォーマンス統計:"
if [ -f "/var/log/garden-dx/performance.log" ]; then
    echo "平均応答時間: $(awk '{sum+=$NF; count++} END {printf "%.2fms\n", sum/count}' /var/log/garden-dx/performance.log 2>/dev/null)"
fi
```

#### パフォーマンス測定
```bash
#!/bin/bash
# performance-test.sh - パフォーマンステスト

echo "⚡ Garden DX パフォーマンステスト"

# API 応答時間測定
echo "🔗 API応答時間測定:"
endpoints=(
    "/health"
    "/api/auth/user-features" 
    "/api/estimates?limit=10"
    "/api/price-master?limit=10"
)

for endpoint in "${endpoints[@]}"; do
    echo -n "  $endpoint: "
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:8000$endpoint" 2>/dev/null)
    http_code=$(curl -o /dev/null -s -w "%{http_code}" "http://localhost:8000$endpoint" 2>/dev/null)
    
    if [ "$http_code" = "200" ]; then
        echo "${response_time}秒 ✅"
    else
        echo "HTTP $http_code ❌"
    fi
done

# データベース応答時間
echo
echo "🗄️ データベース応答時間:"
if sudo -u postgres psql -d garden_dx -c "SELECT 1;" > /dev/null 2>&1; then
    db_time=$(time (sudo -u postgres psql -d garden_dx -c "SELECT COUNT(*) FROM estimates;" > /dev/null) 2>&1 | grep real | awk '{print $2}')
    echo "  SELECT COUNT(*): $db_time ✅"
else
    echo "  データベース接続: 失敗 ❌"
fi

# メモリ・CPU使用率
echo
echo "🖥️ リソース使用率:"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  メモリ: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "  ディスク: $(df / | tail -1 | awk '{print $5}')"
```

---

## ログ分析

### 📋 ログファイル構成

```
/var/log/garden-dx/
├── app.log           # アプリケーション全般ログ
├── error.log         # エラー専用ログ
├── auth.log          # 認証関連ログ
├── api.log           # API アクセスログ
├── performance.log   # パフォーマンスログ
├── security.log      # セキュリティイベントログ
└── debug.log         # デバッグ情報（開発時のみ）
```

### 🔍 ログ分析コマンド

#### エラー分析
```bash
# 直近のエラー確認
tail -20 /var/log/garden-dx/error.log

# 特定期間のエラー件数
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H:')" /var/log/garden-dx/error.log | wc -l

# エラータイプ別集計
grep "ERROR\|CRITICAL" /var/log/garden-dx/error.log | \
  awk '{print $4}' | sort | uniq -c | sort -nr

# 特定エラーの詳細
grep -A 5 -B 5 "database connection" /var/log/garden-dx/error.log
```

#### API アクセス分析
```bash
# リクエスト数集計
awk '{print $1}' /var/log/garden-dx/api.log | sort | uniq -c | sort -nr | head -10

# エンドポイント利用統計
grep -o '"[A-Z]* /[^"]*"' /var/log/garden-dx/api.log | \
  sort | uniq -c | sort -nr | head -10

# 応答コード別統計
awk '{print $9}' /var/log/garden-dx/api.log | sort | uniq -c | sort -nr

# 時間別アクセス数
awk '{print $4}' /var/log/garden-dx/api.log | \
  cut -d: -f2 | sort | uniq -c
```

#### 認証ログ分析
```bash
# ログイン成功・失敗統計
echo "ログイン成功: $(grep -c "login success" /var/log/garden-dx/auth.log)件"
echo "ログイン失敗: $(grep -c "authentication failed" /var/log/garden-dx/auth.log)件"

# 失敗ログイン試行の詳細
grep "authentication failed" /var/log/garden-dx/auth.log | \
  awk '{print $1}' | sort | uniq -c | sort -nr

# 新規ユーザー登録
grep "user created" /var/log/garden-dx/auth.log | tail -10
```

---

## エラーコード一覧

### 🔢 HTTP ステータスコード

| コード | 意味 | よくある原因 | 対処法 |
|--------|------|-------------|---------|
| **400** | Bad Request | リクエスト形式エラー | 入力データ検証 |
| **401** | Unauthorized | 認証失敗 | ログイン・トークン確認 |
| **403** | Forbidden | 権限不足 | ユーザー権限確認 |
| **404** | Not Found | リソース不存在 | URL・データ存在確認 |
| **422** | Unprocessable Entity | バリデーションエラー | 入力値検証 |
| **500** | Internal Server Error | サーバー内部エラー | ログ確認・再起動 |
| **502** | Bad Gateway | プロキシエラー | nginx設定確認 |
| **503** | Service Unavailable | サービス停止 | サービス状態確認 |
| **504** | Gateway Timeout | タイムアウト | 処理時間・負荷確認 |

### 🚨 アプリケーション固有エラー

| エラーコード | 説明 | 対処法 |
|-------------|------|---------|
| **AUTH_001** | JWT トークン無効 | 再ログイン |
| **AUTH_002** | パスワード認証失敗 | パスワード確認 |
| **AUTH_003** | アカウント無効化 | 管理者に連絡 |
| **DATA_001** | データベース接続エラー | DB状態確認 |
| **DATA_002** | 必須項目未入力 | 入力項目確認 |
| **DATA_003** | データ重複エラー | 既存データ確認 |
| **PDF_001** | PDF生成失敗 | フォント・権限確認 |
| **PDF_002** | テンプレート不正 | テンプレート修正 |
| **FILE_001** | ファイルアップロード失敗 | サイズ・形式確認 |
| **PERM_001** | 権限不足（経営者機能） | ユーザーロール確認 |

---

## FAQ

### ❓ よくある質問と回答

#### Q1: システムが重く感じるのですが？
**A**: 以下を確認してください：
1. メモリ使用率が90%未満か確認
2. ディスク使用率が85%未満か確認  
3. ブラウザのキャッシュをクリア
4. 同時実行中のアプリケーションを確認

```bash
# 簡易パフォーマンスチェック
free -h && df -h && top -bn1 | head -5
```

#### Q2: PDFが生成されないのですが？
**A**: 以下の順序で確認してください：
1. 日本語フォントがインストールされているか
2. 一時ディレクトリの権限が正しいか
3. メモリ不足ではないか
4. 見積データに問題がないか

```bash
# PDF生成診断
fc-list | grep -i noto
ls -la /tmp/pdf_temp/
curl http://localhost:8000/api/demo/estimates/1/pdf -o test.pdf
```

#### Q3: ログインできないのですが？
**A**: 以下を確認してください：
1. ユーザーアカウントが有効か
2. パスワードが正しいか（大文字・小文字区別）
3. ブラウザのCookieが有効か
4. JWTトークンの設定が正しいか

```bash
# ユーザー状態確認
sudo -u postgres psql -d garden_dx -c "
SELECT email, is_active, role FROM users WHERE email = 'your@email.com';"
```

#### Q4: データが保存されないのですが？
**A**: 以下をチェックしてください：
1. 必須項目がすべて入力されているか
2. データベース接続が正常か
3. ユーザーに保存権限があるか
4. ディスク容量が十分か

```bash
# データベース接続確認
sudo -u postgres psql -d garden_dx -c "SELECT 1;"
```

#### Q5: サービスが起動しないのですが？
**A**: 以下の順序で確認：
1. 依存サービス（PostgreSQL、Redis）が起動しているか
2. 環境変数が正しく設定されているか
3. ポートが他のプロセスに使用されていないか
4. ログファイルでエラーメッセージを確認

```bash
# サービス起動診断
systemctl status garden-backend
journalctl -u garden-backend --since "5 minutes ago"
ss -tuln | grep -E "(3000|8000)"
```

#### Q6: バックアップはどう確認すればよいですか？
**A**: 以下で確認できます：
```bash
# バックアップファイル確認
ls -la /opt/garden-dx/backups/ | head -10

# 最新バックアップのサイズ確認
ls -lah /opt/garden-dx/backups/*.sql.gz | tail -1

# バックアップの整合性テスト
sudo -u postgres pg_restore --list /opt/garden-dx/backups/latest.sql.gz
```

#### Q7: メンテナンス時にユーザーに通知する方法は？
**A**: メンテナンス通知の方法：
```bash
# メンテナンスモード有効化
touch /opt/garden-dx/maintenance.flag

# nginx でメンテナンス画面表示
# location / {
#     if (-f /opt/garden-dx/maintenance.flag) {
#         return 503;
#     }
# }
```

#### Q8: セキュリティアラートが頻発するのですが？
**A**: セキュリティ設定を確認：
```bash
# fail2ban 状態確認
sudo fail2ban-client status garden-dx-auth

# 最近のセキュリティイベント確認
tail -20 /var/log/garden-dx/security.log

# ファイアウォール設定確認
sudo ufw status numbered
```

---

**Garden DX トラブルシューティングガイド v1.0**  
**最終更新日: 2024年7月6日**  
**作成者: Garden DX テクニカルサポートチーム**

© 2024 Garden DX. All rights reserved.

---

### 📞 サポート連絡先

**緊急時連絡先:**
- 📧 Email: support@garden-dx.com
- 📱 電話: 0120-XXX-XXX（24時間対応）
- 💬 Slack: #garden-dx-support

**エスカレーション:**
- Level 1: 一般的な問題
- Level 2: 技術的問題  
- Level 3: 緊急システム障害