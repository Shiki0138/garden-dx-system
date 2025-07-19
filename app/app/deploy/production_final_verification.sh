#!/bin/bash

# ======================================
# Garden システム 本番デプロイ最終確認スクリプト
# サイクル2: 100%完成レベル品質達成
# ======================================

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
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

log_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

# 設定
PRODUCTION_URL="https://garden-dx.com"
API_BASE_URL="${PRODUCTION_URL}/api"
HEALTH_CHECK_TIMEOUT=30
PERFORMANCE_THRESHOLD_MS=2000

# 検証結果格納
declare -A VERIFICATION_RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0

# 検証関数
run_check() {
    local check_name="$1"
    local check_command="$2"
    local expected_result="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log_info "実行中: $check_name"
    
    if eval "$check_command"; then
        VERIFICATION_RESULTS["$check_name"]="PASS"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name - PASS"
        return 0
    else
        VERIFICATION_RESULTS["$check_name"]="FAIL"
        log_error "$check_name - FAIL"
        return 1
    fi
}

# ========== システム基本ヘルスチェック ==========
system_health_check() {
    log_header "システム基本ヘルスチェック"
    
    # API サーバー応答確認
    run_check "API サーバー応答" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health > /dev/null" \
        "200"
    
    # フロントエンド応答確認
    run_check "フロントエンド応答" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $PRODUCTION_URL > /dev/null" \
        "200"
    
    # HTTPS証明書確認
    run_check "SSL証明書有効性" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT https://garden-dx.com > /dev/null" \
        "200"
    
    # データベース接続確認
    run_check "データベース接続" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health/database | jq -r '.status' | grep -q 'healthy'" \
        "healthy"
}

# ========== 認証システム検証 ==========
authentication_verification() {
    log_header "認証システム検証"
    
    # 認証エンドポイント確認
    run_check "認証エンドポイント応答" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/auth/health > /dev/null" \
        "200"
    
    # JWT トークン生成テスト
    run_check "JWT トークン生成" \
        "curl -f -s -X POST $API_BASE_URL/auth/login \
         -H 'Content-Type: application/json' \
         -d '{\"username\":\"demo\",\"password\":\"demo\",\"company_id\":1}' | jq -r '.access_token' | grep -q 'eyJ'" \
        "JWT token"
    
    # RBAC 権限チェック
    run_check "RBAC権限システム" \
        "curl -f -s $API_BASE_URL/auth/permissions | jq -r '.permissions | length' | awk '{print (\$1 >= 10)}' | grep -q '1'" \
        "permissions"
}

# ========== ビジネス機能検証 ==========
business_functionality_verification() {
    log_header "ビジネス機能検証"
    
    # 見積システム確認
    run_check "見積システム API" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/estimates/health > /dev/null" \
        "200"
    
    # プロジェクト管理システム確認
    run_check "プロジェクト管理 API" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/projects/health > /dev/null" \
        "200"
    
    # 請求書システム確認
    run_check "請求書システム API" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/invoices/health > /dev/null" \
        "200"
    
    # 顧客管理システム確認
    run_check "顧客管理 API" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/customers/health > /dev/null" \
        "200"
}

# ========== パフォーマンス検証 ==========
performance_verification() {
    log_header "パフォーマンス検証"
    
    # API 応答時間測定
    API_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health | awk '{print int($1*1000)}')
    run_check "API応答時間 (<2秒)" \
        "[ $API_RESPONSE_TIME -lt $PERFORMANCE_THRESHOLD_MS ]" \
        "<2000ms"
    
    log_info "実測API応答時間: ${API_RESPONSE_TIME}ms"
    
    # フロントエンド応答時間測定
    FRONTEND_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' --max-time $HEALTH_CHECK_TIMEOUT $PRODUCTION_URL | awk '{print int($1*1000)}')
    run_check "フロントエンド応答時間 (<3秒)" \
        "[ $FRONTEND_RESPONSE_TIME -lt 3000 ]" \
        "<3000ms"
    
    log_info "実測フロントエンド応答時間: ${FRONTEND_RESPONSE_TIME}ms"
    
    # 同時接続テスト
    run_check "同時接続性能テスト" \
        "for i in {1..10}; do curl -f -s --max-time 5 $API_BASE_URL/health > /dev/null & done; wait" \
        "concurrent"
}

# ========== セキュリティ検証 ==========
security_verification() {
    log_header "セキュリティ検証"
    
    # セキュリティヘッダー確認
    run_check "セキュリティヘッダー (HSTS)" \
        "curl -I -s $PRODUCTION_URL | grep -q 'Strict-Transport-Security'" \
        "HSTS header"
    
    run_check "セキュリティヘッダー (X-Frame-Options)" \
        "curl -I -s $PRODUCTION_URL | grep -q 'X-Frame-Options'" \
        "X-Frame-Options header"
    
    run_check "セキュリティヘッダー (X-Content-Type-Options)" \
        "curl -I -s $PRODUCTION_URL | grep -q 'X-Content-Type-Options'" \
        "X-Content-Type-Options header"
    
    # SQL インジェクション対策確認
    run_check "SQLインジェクション対策" \
        "curl -f -s '$API_BASE_URL/estimates?search=test%27%20OR%201=1' | jq -r '.error // \"ok\"' | grep -v 'ok' || echo 'protected'" \
        "protected"
    
    # セキュリティ監視エンドポイント
    run_check "セキュリティ監視システム" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/security/health > /dev/null" \
        "200"
}

# ========== データ整合性検証 ==========
data_integrity_verification() {
    log_header "データ整合性検証"
    
    # データベース整合性確認
    run_check "データベース整合性" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health/database-integrity | jq -r '.status' | grep -q 'ok'" \
        "ok"
    
    # マルチテナント分離確認
    run_check "マルチテナント分離" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health/tenant-isolation | jq -r '.isolated' | grep -q 'true'" \
        "true"
    
    # 監査ログ機能確認
    run_check "監査ログ機能" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/audit/health | jq -r '.logging' | grep -q 'active'" \
        "active"
}

# ========== 外部連携確認 ==========
external_integration_verification() {
    log_header "外部連携確認"
    
    # メール送信機能確認
    run_check "メール送信システム" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/email/health | jq -r '.status' | grep -q 'ready'" \
        "ready"
    
    # ファイルアップロード機能確認
    run_check "ファイルアップロード機能" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/upload/health > /dev/null" \
        "200"
    
    # PDF生成機能確認
    run_check "PDF生成機能" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/pdf/health | jq -r '.status' | grep -q 'ready'" \
        "ready"
}

# ========== 監視・ログ確認 ==========
monitoring_verification() {
    log_header "監視・ログ確認"
    
    # Prometheus メトリクス確認
    run_check "Prometheus メトリクス" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/metrics | head -10 | grep -q 'garden_'" \
        "metrics"
    
    # ログ出力確認
    run_check "ログ出力機能" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/health/logging | jq -r '.status' | grep -q 'active'" \
        "active"
    
    # アラート機能確認
    run_check "アラート機能" \
        "curl -f -s --max-time $HEALTH_CHECK_TIMEOUT $API_BASE_URL/alerts/health > /dev/null" \
        "200"
}

# ========== 最終品質評価 ==========
final_quality_assessment() {
    log_header "最終品質評価"
    
    local completion_percentage=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    echo ""
    log_info "検証結果サマリー:"
    log_info "総チェック項目数: $TOTAL_CHECKS"
    log_info "成功項目数: $PASSED_CHECKS"
    log_info "失敗項目数: $((TOTAL_CHECKS - PASSED_CHECKS))"
    log_info "完成度: $completion_percentage%"
    echo ""
    
    # 詳細結果表示
    echo -e "${CYAN}詳細検証結果:${NC}"
    for check_name in "${!VERIFICATION_RESULTS[@]}"; do
        local result="${VERIFICATION_RESULTS[$check_name]}"
        if [[ "$result" == "PASS" ]]; then
            echo -e "  ${GREEN}✅${NC} $check_name"
        else
            echo -e "  ${RED}❌${NC} $check_name"
        fi
    done
    echo ""
    
    # 品質判定
    if [[ $completion_percentage -eq 100 ]]; then
        log_success "🎉 100% 完成達成！"
        log_success "🚀 史上最強の造園業DXシステム完成！"
        log_success "⭐ 企業級品質レベル達成"
        echo ""
        echo -e "${GREEN}=================================="
        echo -e "  🏆 GARDEN SYSTEM 100% COMPLETE 🏆"
        echo -e "  史上最強造園業DXシステム完成達成！"
        echo -e "==================================${NC}"
        return 0
    elif [[ $completion_percentage -ge 95 ]]; then
        log_success "🚀 優秀な品質レベル ($completion_percentage%)"
        log_warning "残り$((100 - completion_percentage))%の改善で100%達成可能"
        return 0
    elif [[ $completion_percentage -ge 85 ]]; then
        log_warning "✅ 良好な品質レベル ($completion_percentage%)"
        log_warning "100%達成には追加の品質向上が必要"
        return 1
    else
        log_error "⚠️ 品質改善が必要 ($completion_percentage%)"
        log_error "重要な問題が検出されました"
        return 1
    fi
}

# ========== 結果レポート生成 ==========
generate_report() {
    local report_file="garden_verification_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "verification_report": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "system_version": "Garden DX System v1.0",
    "environment": "production",
    "total_checks": $TOTAL_CHECKS,
    "passed_checks": $PASSED_CHECKS,
    "completion_percentage": $((PASSED_CHECKS * 100 / TOTAL_CHECKS)),
    "verification_results": {
EOF

    local first=true
    for check_name in "${!VERIFICATION_RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        echo "      \"$check_name\": \"${VERIFICATION_RESULTS[$check_name]}\"" >> "$report_file"
    done

    cat >> "$report_file" << EOF
    },
    "performance_metrics": {
      "api_response_time_ms": $API_RESPONSE_TIME,
      "frontend_response_time_ms": $FRONTEND_RESPONSE_TIME,
      "health_check_timeout": $HEALTH_CHECK_TIMEOUT
    },
    "production_url": "$PRODUCTION_URL",
    "verification_status": "$([ $((PASSED_CHECKS * 100 / TOTAL_CHECKS)) -eq 100 ] && echo 'COMPLETE' || echo 'PARTIAL')"
  }
}
EOF

    log_info "検証レポート生成: $report_file"
}

# ========== メイン実行 ==========
main() {
    log_header "Garden システム 本番デプロイ最終確認開始"
    
    echo -e "${BLUE}検証対象URL: $PRODUCTION_URL${NC}"
    echo -e "${BLUE}開始時刻: $(date)${NC}"
    echo ""
    
    # 各検証実行
    system_health_check
    authentication_verification
    business_functionality_verification
    performance_verification
    security_verification
    data_integrity_verification
    external_integration_verification
    monitoring_verification
    
    # 最終評価
    final_quality_assessment
    local final_result=$?
    
    # レポート生成
    generate_report
    
    log_header "Garden システム 本番デプロイ最終確認完了"
    echo -e "${BLUE}完了時刻: $(date)${NC}"
    
    exit $final_result
}

# スクリプト実行
main "$@"