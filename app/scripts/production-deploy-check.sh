#!/bin/bash

# 🚀 本番デプロイ前最終確認スクリプト
# Worker3 Production Deploy Check

set -e

echo "🔍 本番デプロイ前チェックを開始します..."

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 現在のディレクトリをapp/に移動
cd "$(dirname "$0")/../app"

echo "📂 作業ディレクトリ: $(pwd)"

# 1. 環境変数チェック
echo "🔧 環境変数チェック..."
if [ ! -f ".env" ]; then
    log_error ".envファイルが見つかりません"
    exit 1
fi

# デモモードが無効化されているか確認
if grep -q "REACT_APP_DEMO_MODE=true" .env; then
    log_error "デモモードが有効になっています。本番では無効にしてください。"
    exit 1
fi

log_info "環境変数チェック完了"

# 2. 依存関係チェック
echo "📦 依存関係チェック..."
npm audit --audit-level high
if [ $? -ne 0 ]; then
    log_warn "セキュリティ監査で問題が見つかりました。確認してください。"
fi

log_info "依存関係チェック完了"

# 3. Lintチェック
echo "🔍 コード品質チェック..."
npm run lint:check
if [ $? -ne 0 ]; then
    log_error "Lintエラーがあります。修正してください。"
    exit 1
fi

log_info "コード品質チェック完了"

# 4. 型チェック
echo "📝 TypeScriptチェック..."
npm run typecheck
if [ $? -ne 0 ]; then
    log_error "TypeScriptエラーがあります。修正してください。"
    exit 1
fi

log_info "TypeScriptチェック完了"

# 5. ビルドテスト
echo "🏗️ 本番ビルドテスト..."
CI=false npm run build:production
if [ $? -ne 0 ]; then
    log_error "ビルドに失敗しました。"
    exit 1
fi

log_info "ビルドテスト完了"

# 6. ビルドサイズチェック
echo "📊 ビルドサイズチェック..."
BUILD_SIZE=$(du -sh build | cut -f1)
log_info "ビルドサイズ: $BUILD_SIZE"

# 7. セキュリティチェック
echo "🔒 セキュリティチェック..."
if command -v npm run security:check &> /dev/null; then
    npm run security:check
    log_info "セキュリティチェック完了"
fi

# 8. Vercel設定チェック
echo "⚡ Vercel設定チェック..."
if [ ! -f "vercel.json" ]; then
    log_error "vercel.jsonが見つかりません"
    exit 1
fi

# デモモードがvercel.jsonでも無効化されているか確認
if grep -q '"REACT_APP_DEMO_MODE": "true"' vercel.json; then
    log_error "vercel.jsonでデモモードが有効になっています。"
    exit 1
fi

log_info "Vercel設定チェック完了"

# 9. 最終確認
echo ""
echo "✅ すべてのチェックが完了しました！"
echo ""
echo "📋 本番デプロイ準備完了項目:"
echo "  ✅ 環境変数設定"
echo "  ✅ セキュリティ監査"
echo "  ✅ コード品質"
echo "  ✅ TypeScript"
echo "  ✅ ビルド成功"
echo "  ✅ Vercel設定"
echo ""
echo "🚀 本番デプロイコマンド:"
echo "  vercel --prod"
echo ""
echo "🌐 デプロイ後確認項目:"
echo "  □ HTTPSアクセス確認"
echo "  □ 機能動作確認"
echo "  □ パフォーマンステスト"
echo "  □ セキュリティヘッダー確認"
echo ""

log_info "本番デプロイの準備が整いました！"