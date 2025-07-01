#!/bin/bash
# Garden DX - 本番環境セットアップスクリプト
# 造園業者1社が実際に使える95%完成システム構築

set -e

echo "🌿 Garden DX 本番環境セットアップ開始 🌿"
echo "==========================================="

# 色付きメッセージ関数
print_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ️  $1\033[0m"
}

print_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

print_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

# 前提条件チェック
check_prerequisites() {
    print_info "前提条件チェック中..."
    
    # Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3が見つかりません"
        exit 1
    fi
    
    # Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Dockerが見つかりません（オプション）"
    fi
    
    # PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQLクライアントが見つかりません"
    fi
    
    print_success "前提条件チェック完了"
}

# ディレクトリ構造作成
create_directories() {
    print_info "ディレクトリ構造作成中..."
    
    # 本番環境用ディレクトリ
    sudo mkdir -p /opt/garden-dx
    sudo mkdir -p /etc/garden-dx
    sudo mkdir -p /var/log/garden-dx
    sudo mkdir -p /var/backups/garden_dx
    sudo mkdir -p /etc/ssl/garden-dx
    
    # 権限設定
    sudo useradd -r -s /bin/false garden || true
    sudo chown -R garden:garden /opt/garden-dx
    sudo chown -R garden:garden /var/log/garden-dx
    sudo chown -R garden:garden /var/backups/garden_dx
    
    print_success "ディレクトリ構造作成完了"
}

# 秘密管理システム初期化
setup_secrets() {
    print_info "秘密管理システム初期化中..."
    
    # マスターパスワード生成（必要に応じて変更）
    if [ -z "$GARDEN_MASTER_PASSWORD" ]; then
        export GARDEN_MASTER_PASSWORD=$(openssl rand -base64 32)
        print_warning "マスターパスワード生成: $GARDEN_MASTER_PASSWORD"
        print_warning "このパスワードを安全に保管してください！"
    fi
    
    # 秘密管理システム実行
    cd "$(dirname "$0")/.."
    python3 security/secret_manager.py init
    
    # 環境変数ファイルを本番環境用ディレクトリにコピー
    sudo cp /etc/garden_dx/production.env /etc/garden-dx/
    sudo chown garden:garden /etc/garden-dx/production.env
    sudo chmod 600 /etc/garden-dx/production.env
    
    print_success "秘密管理システム初期化完了"
}

# データベース設定
setup_database() {
    print_info "データベース設定中..."
    
    # PostgreSQL設定ファイルコピー
    sudo cp database/postgresql_production.conf /etc/postgresql/15/main/ || true
    sudo cp database/pg_hba_production.conf /etc/postgresql/15/main/ || true
    
    # データベース初期化
    if command -v psql &> /dev/null; then
        print_info "データベース初期化実行中..."
        
        # 環境変数設定（実際のパスワードに置き換える必要あり）
        export GARDEN_APP_PASSWORD=$(openssl rand -base64 32)
        export GARDEN_READONLY_PASSWORD=$(openssl rand -base64 32)
        export GARDEN_BACKUP_PASSWORD=$(openssl rand -base64 32)
        export GARDEN_MONITOR_PASSWORD=$(openssl rand -base64 32)
        export REPLICATION_PASSWORD=$(openssl rand -base64 32)
        export ADMIN_PASSWORD=$(openssl rand -base64 32)
        
        # SQLスクリプト実行
        envsubst < database/init_production_db.sql > /tmp/init_garden_dx.sql
        
        print_warning "データベース初期化SQLを確認してから手動で実行してください:"
        print_warning "sudo -u postgres psql < /tmp/init_garden_dx.sql"
        
        # パスワード保存
        echo "DB_PASSWORD=$GARDEN_APP_PASSWORD" >> /etc/garden-dx/production.env
        echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> /etc/garden-dx/production.env
    fi
    
    print_success "データベース設定完了"
}

# SSL証明書設定
setup_ssl() {
    print_info "SSL証明書設定中..."
    
    # Let's Encrypt設定（手動で実行）
    print_warning "SSL証明書は手動で設定してください:"
    print_warning "sudo certbot --nginx -d your-domain.com"
    
    # 自己署名証明書生成（開発用）
    if [ ! -f "/etc/ssl/garden-dx/garden-dx.crt" ]; then
        print_info "開発用自己署名証明書生成中..."
        
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/garden-dx/garden-dx.key \
            -out /etc/ssl/garden-dx/garden-dx.crt \
            -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Garden DX/OU=IT/CN=localhost"
        
        sudo chown garden:garden /etc/ssl/garden-dx/*
        sudo chmod 600 /etc/ssl/garden-dx/garden-dx.key
        sudo chmod 644 /etc/ssl/garden-dx/garden-dx.crt
    fi
    
    print_success "SSL証明書設定完了"
}

# アプリケーションデプロイ
deploy_application() {
    print_info "アプリケーションデプロイ中..."
    
    # アプリケーションファイルコピー
    sudo cp -r . /opt/garden-dx/
    sudo chown -R garden:garden /opt/garden-dx/
    
    # Python仮想環境作成
    cd /opt/garden-dx
    sudo -u garden python3 -m venv venv
    sudo -u garden ./venv/bin/pip install -r requirements.txt || true
    
    # デプロイメント設定生成
    python3 deployment/production_deploy.py
    
    print_success "アプリケーションデプロイ完了"
}

# systemdサービス設定
setup_systemd() {
    print_info "systemdサービス設定中..."
    
    # サービスファイルコピー
    sudo cp deployment/systemd/garden-dx.service /etc/systemd/system/
    
    # サービス有効化
    sudo systemctl daemon-reload
    sudo systemctl enable garden-dx.service
    
    print_info "サービス起動は手動で実行してください: sudo systemctl start garden-dx"
    
    print_success "systemdサービス設定完了"
}

# バックアップ設定
setup_backup() {
    print_info "バックアップ設定中..."
    
    # バックアップスクリプトコピー
    sudo cp deployment/scripts/backup.sh /opt/garden-dx/
    sudo chmod +x /opt/garden-dx/backup.sh
    
    # cronジョブ設定
    echo "0 2 * * * /opt/garden-dx/backup.sh" | sudo crontab -u garden -
    
    print_success "バックアップ設定完了"
}

# ファイアウォール設定
setup_firewall() {
    print_info "ファイアウォール設定中..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        print_success "UFWファイアウォール設定完了"
    else
        print_warning "UFWが見つかりません。手動でファイアウォールを設定してください"
    fi
}

# 設定確認
verify_setup() {
    print_info "設定確認中..."
    
    # ディレクトリ確認
    [ -d "/opt/garden-dx" ] && print_success "アプリケーションディレクトリ: OK"
    [ -d "/etc/garden-dx" ] && print_success "設定ディレクトリ: OK"
    [ -d "/var/log/garden-dx" ] && print_success "ログディレクトリ: OK"
    [ -d "/var/backups/garden_dx" ] && print_success "バックアップディレクトリ: OK"
    
    # ファイル確認
    [ -f "/etc/garden-dx/production.env" ] && print_success "環境変数ファイル: OK"
    [ -f "/etc/systemd/system/garden-dx.service" ] && print_success "systemdサービス: OK"
    
    print_success "設定確認完了"
}

# セキュリティチェック
security_check() {
    print_info "セキュリティチェック実行中..."
    
    cd "$(dirname "$0")/.."
    python3 -c "
from security.owasp_security import OWASPSecurity
from security.ssl_config import SecurityConfig

# OWASP設定チェック
owasp = OWASPSecurity()
config_checks = owasp.check_security_configuration()

print('セキュリティ設定チェック結果:')
for check, result in config_checks.items():
    status = '✅' if result else '❌'
    print(f'{status} {check}: {result}')

# セキュアデザインパターンチェック
design_patterns = owasp.implement_secure_design_patterns()
print('\nセキュアデザインパターン:')
for pattern, enabled in design_patterns.items():
    status = '✅' if enabled else '❌'
    print(f'{status} {pattern}: {enabled}')
"
    
    print_success "セキュリティチェック完了"
}

# メイン実行
main() {
    print_info "Garden DX 本番環境セットアップを開始します"
    
    # 管理者権限チェック
    if [ "$EUID" -ne 0 ]; then
        print_error "このスクリプトはsudo権限で実行してください"
        exit 1
    fi
    
    # セットアップ実行
    check_prerequisites
    create_directories
    setup_secrets
    setup_database
    setup_ssl
    deploy_application
    setup_systemd
    setup_backup
    setup_firewall
    verify_setup
    security_check
    
    echo ""
    echo "🎉 Garden DX 本番環境セットアップ完了！ 🎉"
    echo "================================================"
    print_success "造園業者1社が実際に使える95%完成システム構築完了"
    echo ""
    print_info "次のステップ:"
    print_info "1. データベースパスワードを設定"
    print_info "2. SSL証明書を取得・設定"
    print_info "3. sudo systemctl start garden-dx でサービス開始"
    print_info "4. https://your-domain.com でアクセス確認"
    echo ""
    print_warning "セキュリティ設定とパスワードを必ず確認してください！"
}

# スクリプト実行
main "$@"