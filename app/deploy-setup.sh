#!/bin/bash

# Garden DX System - Deployment Setup Script
# 本番環境デプロイ準備スクリプト

echo "🏡 Garden DX System - 本番環境デプロイ準備"
echo "=========================================="

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# プロジェクトディレクトリ確認
if [ ! -f "app/package.json" ]; then
    echo -e "${RED}エラー: appディレクトリが見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}1. 環境設定ファイルの準備${NC}"
# .env.productionファイルの作成
if [ ! -f "app/.env.production" ]; then
    cat > app/.env.production << EOF
# Production Environment Variables for Garden DX System
# Vercel + Supabase Configuration

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
REACT_APP_ENV=production
REACT_APP_API_BASE_URL=your_supabase_project_url
REACT_APP_SITE_NAME=Garden DX System
REACT_APP_COMPANY_NAME=造園業DXシステム

# Storage Configuration (Supabase Storage)
REACT_APP_STORAGE_BUCKET=garden-dx-files

# Authentication Settings
REACT_APP_AUTH_REDIRECT_URL=https://your-vercel-app.vercel.app

# Feature Flags
REACT_APP_ENABLE_PDF_EXPORT=true
REACT_APP_ENABLE_FILE_UPLOAD=true
REACT_APP_ENABLE_ANALYTICS=false
EOF
    echo "✅ .env.productionファイルを作成しました"
else
    echo "⚠️  .env.productionファイルは既に存在します"
fi

echo -e "\n${GREEN}2. Supabaseデータベーススキーマの準備${NC}"
if [ ! -d "supabase" ]; then
    mkdir -p supabase
fi

if [ ! -f "supabase/schema.sql" ]; then
    echo "✅ supabase/schema.sqlファイルを作成してください"
    echo "   deployment-guide.mdのスキーマをコピーしてください"
fi

echo -e "\n${GREEN}3. 依存関係の確認${NC}"
cd app
echo "📦 パッケージのインストール..."
npm install

echo -e "\n${GREEN}4. ビルドテスト${NC}"
echo "🔨 本番環境ビルドのテスト..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ビルド成功！${NC}"
else
    echo -e "${RED}❌ ビルドエラーが発生しました${NC}"
    exit 1
fi

cd ..

echo -e "\n${GREEN}5. Gitリポジトリの準備${NC}"
if [ ! -d ".git" ]; then
    git init
    echo "✅ Gitリポジトリを初期化しました"
fi

# .gitignoreの確認
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.log

# IDE
.vscode/
.idea/

# Agent system
tmp/
logs/
.env_*

# Supabase
supabase/.branches
supabase/.temp
EOF
    echo "✅ .gitignoreファイルを作成しました"
fi

echo -e "\n${YELLOW}📋 次のステップ:${NC}"
echo "1. Supabaseでプロジェクトを作成"
echo "   - https://app.supabase.com/ にアクセス"
echo "   - 新規プロジェクト作成（Tokyo リージョン推奨）"
echo ""
echo "2. 環境変数を設定"
echo "   - app/.env.productionファイルを編集"
echo "   - Supabase URLとキーを入力"
echo ""
echo "3. データベーススキーマを適用"
echo "   - Supabase SQL Editorでsupabase/schema.sqlを実行"
echo ""
echo "4. Vercelでデプロイ"
echo "   - GitHubにプッシュ"
echo "   - Vercelでインポート"
echo "   - 環境変数を設定"
echo ""
echo "5. 初期データ投入"
echo "   - deployment-guide.mdの手順に従って実施"
echo ""
echo -e "${GREEN}詳細は deployment-guide.md を参照してください${NC}"
echo ""
echo "🚀 準備完了！本番環境へのデプロイを開始できます。"