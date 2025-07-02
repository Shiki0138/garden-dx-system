#!/bin/bash
# ============================================================
# Garden DX - デモ環境一括セットアップスクリプト
# DEPLOYMENT_ERROR_PREVENTION_RULES.md 準拠
# Created by: Claude Code (Demo Environment Automation)
# Date: 2025-07-02
# ============================================================

set -euo pipefail  # エラー時即座に終了

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# 1. 環境チェック・前提条件確認
# ============================================================

check_environment() {
    log_info "デモ環境セットアップ開始 - 環境チェック中..."
    
    # PostgreSQL/psqlコマンド確認
    if ! command -v psql &> /dev/null; then
        log_error "psqlコマンドが見つかりません。PostgreSQLクライアントをインストールしてください。"
        exit 1
    fi
    
    # 環境変数チェック
    if [[ -z "${DATABASE_URL:-}" && -z "${POSTGRES_URL:-}" ]]; then
        log_error "DATABASE_URL または POSTGRES_URL 環境変数が設定されていません。"
        log_info "以下のいずれかを設定してください："
        log_info "  export DATABASE_URL='postgresql://user:password@host:port/database'"
        log_info "  export POSTGRES_URL='postgresql://user:password@host:port/database'"
        exit 1
    fi
    
    # 使用するDB URLを決定
    DB_URL="${DATABASE_URL:-$POSTGRES_URL}"
    
    log_success "環境チェック完了"
    log_info "使用するDB URL: ${DB_URL%%\?*}?[hidden]"  # パスワード部分は隠す
}

# ============================================================
# 2. データベース接続テスト
# ============================================================

test_connection() {
    log_info "データベース接続テスト中..."
    
    if psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "データベース接続成功"
        
        # PostgreSQLバージョン確認
        PG_VERSION=$(psql "$DB_URL" -t -c "SELECT current_setting('server_version_num')::INTEGER;")
        if [[ $PG_VERSION -lt 130000 ]]; then
            log_warning "PostgreSQL 13以上を推奨します。現在のバージョン: $PG_VERSION"
        fi
    else
        log_error "データベース接続に失敗しました"
        log_error "接続設定を確認してください"
        exit 1
    fi
}

# ============================================================
# 3. 既存データのバックアップ
# ============================================================

backup_existing_data() {
    log_info "既存データのバックアップを作成中..."
    
    BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 重要テーブルのバックアップ
    TABLES=("companies" "user_profiles" "customers" "projects" "price_master")
    
    for table in "${TABLES[@]}"; do
        if psql "$DB_URL" -c "\\dt $table" | grep -q "$table"; then
            log_info "テーブル '$table' をバックアップ中..."
            psql "$DB_URL" -c "\\copy $table TO '$BACKUP_DIR/${table}.csv' WITH CSV HEADER" || true
        fi
    done
    
    log_success "バックアップ完了: $BACKUP_DIR"
}

# ============================================================
# 4. SQLスクリプト実行（エラーハンドリング付き）
# ============================================================

execute_sql_script() {
    local script_file=$1
    local description=$2
    
    log_info "$description 実行中..."
    log_info "スクリプト: $script_file"
    
    if [[ ! -f "$script_file" ]]; then
        log_error "スクリプトファイルが見つかりません: $script_file"
        return 1
    fi
    
    # SQLスクリプト実行
    if psql "$DB_URL" -f "$script_file" > "$script_file.log" 2>&1; then
        log_success "$description 完了"
        
        # 成功時のサマリー表示
        if grep -q "SUCCESS" "$script_file.log"; then
            grep "SUCCESS" "$script_file.log" | tail -5
        fi
        
        return 0
    else
        log_error "$description 失敗"
        log_error "詳細ログ: $script_file.log"
        
        # エラーの詳細表示
        echo "=== エラー詳細 ==="
        tail -20 "$script_file.log"
        echo "=================="
        
        return 1
    fi
}

# ============================================================
# 5. 段階的セットアップ実行
# ============================================================

run_demo_setup() {
    log_info "🚀 デモ環境セットアップ開始"
    
    local script_dir="$(dirname "$0")"
    local scripts=(
        "$script_dir/001_demo_complete_setup.sql:基本デモデータ作成"
        "$script_dir/002_demo_process_schedules.sql:工程表・タスクデータ作成"
        "$script_dir/003_demo_rls_policies_enhanced.sql:デモ用RLSポリシー設定"
    )
    
    local success_count=0
    local total_count=${#scripts[@]}
    
    for script_info in "${scripts[@]}"; do
        IFS=':' read -r script_file description <<< "$script_info"
        
        echo ""
        log_info "=== ステップ $((success_count + 1))/$total_count: $description ==="
        
        if execute_sql_script "$script_file" "$description"; then
            ((success_count++))
            log_success "ステップ $success_count/$total_count 完了"
        else
            log_error "ステップ $((success_count + 1))/$total_count 失敗"
            log_error "セットアップを中断します"
            
            # 失敗時のロールバック提案
            echo ""
            log_warning "ロールバックが必要な場合は以下を実行してください："
            log_warning "  psql \"\$DATABASE_URL\" -c \"ROLLBACK;\""
            
            exit 1
        fi
    done
    
    log_success "🎉 すべてのステップが正常に完了しました ($success_count/$total_count)"
}

# ============================================================
# 6. セットアップ後の検証
# ============================================================

verify_setup() {
    log_info "セットアップ結果の検証中..."
    
    # データ件数確認
    log_info "データ件数を確認中..."
    
    psql "$DB_URL" -c "
    SELECT 
        'Companies' as table_name,
        COUNT(*) as record_count
    FROM companies 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    
    UNION ALL
    
    SELECT 
        'Customers' as table_name,
        COUNT(*) as record_count
    FROM customers 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    
    UNION ALL
    
    SELECT 
        'Projects' as table_name,
        COUNT(*) as record_count
    FROM projects 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    
    UNION ALL
    
    SELECT 
        'Price Master' as table_name,
        COUNT(*) as record_count
    FROM price_master 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID
    
    UNION ALL
    
    SELECT 
        'Process Schedules' as table_name,
        COUNT(*) as record_count
    FROM process_schedules 
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;
    "
    
    # RLS有効化確認
    log_info "RLSポリシー確認中..."
    
    RLS_COUNT=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname LIKE '%demo%';
    ")
    
    log_info "デモ対応RLSポリシー数: $RLS_COUNT"
    
    # デモ関数確認
    FUNCTION_COUNT=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM pg_proc 
    WHERE proname LIKE '%demo%' OR proname LIKE '%guest%';
    ")
    
    log_info "デモ関連関数数: $FUNCTION_COUNT"
    
    log_success "検証完了"
}

# ============================================================
# 7. 使用方法の案内
# ============================================================

show_usage_guide() {
    echo ""
    echo "============================================================"
    log_success "🎉 Garden DX デモ環境セットアップ完了！"
    echo "============================================================"
    echo ""
    echo "【デモデータ詳細】"
    echo "  ▶ デモ会社ID: 00000000-0000-0000-0000-000000000001"
    echo "  ▶ デモユーザー: デモ太郎（オーナー）、デモ花子（マネージャー）"
    echo "  ▶ サンプル顧客: 5社（個人・法人含む）"
    echo "  ▶ サンプルプロジェクト: 5件（進行中・完了・計画中）"
    echo "  ▶ 単価マスタ: 15品目（植栽・土工事・設備等）"
    echo "  ▶ 工程表: 詳細タスク付きガントチャート対応"
    echo ""
    echo "【フロントエンド接続】"
    echo "  ▶ Supabaseクライアント設定済み"
    echo "  ▶ IPv6/Supavisor対応"
    echo "  ▶ エラーハンドリング強化"
    echo "  ▶ ゲストアクセス対応（読み取り専用）"
    echo ""
    echo "【確認方法】"
    echo "  ▶ デモデータ確認:"
    echo "    psql \"\$DATABASE_URL\" -c \"SELECT * FROM get_demo_statistics();\""
    echo ""
    echo "  ▶ 会社データ確認:"
    echo "    psql \"\$DATABASE_URL\" -c \"SELECT * FROM companies WHERE company_code = 'DEMO_COMPANY';\""
    echo ""
    echo "  ▶ プロジェクト確認:"
    echo "    psql \"\$DATABASE_URL\" -c \"SELECT project_name, status, progress_percentage FROM projects WHERE company_id = '00000000-0000-0000-0000-000000000001'::UUID;\""
    echo ""
    echo "============================================================"
    log_success "デモ環境の準備が完了しました。フロントエンドアプリケーションを起動してください！"
    echo "============================================================"
}

# ============================================================
# メイン実行フロー
# ============================================================

main() {
    echo "============================================================"
    echo "🌿 Garden DX - デモ環境自動セットアップスクリプト"
    echo "============================================================"
    echo ""
    
    # エラートラップ設定
    trap 'log_error "スクリプト実行中にエラーが発生しました"; exit 1' ERR
    
    # 実行ステップ
    check_environment
    test_connection
    backup_existing_data
    run_demo_setup
    verify_setup
    show_usage_guide
    
    echo ""
    log_success "🎉 デモ環境セットアップが正常に完了しました！"
}

# スクリプト引数の処理
case "${1:-}" in
    --help|-h)
        echo "使用方法: $0 [オプション]"
        echo ""
        echo "オプション:"
        echo "  --help, -h     このヘルプを表示"
        echo "  --verify-only  セットアップ結果の検証のみ実行"
        echo ""
        echo "環境変数:"
        echo "  DATABASE_URL   Supabaseデータベース接続URL"
        echo "  POSTGRES_URL   PostgreSQL接続URL（代替）"
        echo ""
        echo "例:"
        echo "  export DATABASE_URL='postgresql://postgres:password@db.supabase.co:5432/postgres'"
        echo "  $0"
        exit 0
        ;;
    --verify-only)
        check_environment
        test_connection
        verify_setup
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "不明なオプション: $1"
        log_info "ヘルプを表示するには --help を使用してください"
        exit 1
        ;;
esac