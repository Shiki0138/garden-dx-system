#!/bin/bash

# 🔧➡️👑 Error Fix チームから PRESIDENT への完了報告

echo "================================================"
echo " 🔧 Error Fix → PRESIDENT 完了報告"
echo "================================================"

PROJECT_NAME="$1"
REPORT_CONTENT="$2"

if [ -z "$PROJECT_NAME" ] || [ -z "$REPORT_CONTENT" ]; then
    echo "使用方法: ./errorfix-to-president.sh [プロジェクト名] \"報告内容\""
    echo ""
    echo "報告例:"
    echo "  ./errorfix-to-president.sh myproject \"エラー修正完了：npm installの依存関係を解決しました\""
    echo "  ./errorfix-to-president.sh myproject \"デプロイエラー修正完了：環境変数の設定ミスを修正\""
    exit 1
fi

PRESIDENT_SESSION="${PROJECT_NAME}_president"
ERROR_FIX_SESSION="${PROJECT_NAME}_errorfix"

# セッション存在確認
if ! tmux has-session -t "$PRESIDENT_SESSION" 2>/dev/null; then
    echo "❌ PRESIDENT Session が存在しません。"
    exit 1
fi

# タイムスタンプ
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_ID=$(date '+%Y%m%d%H%M%S')

echo "📤 PRESIDENT に完了報告を送信中..."
echo "   報告内容: $REPORT_CONTENT"

# PRESIDENTへの報告
tmux send-keys -t "$PRESIDENT_SESSION:0" "
=====================================
🔧 Error Fix チームからの完了報告
=====================================
報告ID: $REPORT_ID
時刻: $TIMESTAMP

【報告内容】
$REPORT_CONTENT

【対応詳細】
- リーダー: Claude（総合分析・解決策決定）
- 分析協力: Gemini（CI/CD観点）、Codex（コード観点）
- ステータス: 完了

次の指示をお待ちしています。
=====================================" C-m

# 報告ログ記録
mkdir -p logs/errorfix_reports
cat > "logs/errorfix_reports/${REPORT_ID}.json" << EOF
{
  "id": "$REPORT_ID",
  "timestamp": "$TIMESTAMP",
  "project": "$PROJECT_NAME",
  "report": "$REPORT_CONTENT",
  "from": "error_fix_team",
  "to": "president",
  "status": "completed"
}
EOF

# 開発ログ記録
echo "[$TIMESTAMP] [ERRORFIX_REPORT] [$PROJECT_NAME]
報告ID: $REPORT_ID
報告内容: $REPORT_CONTENT
Error FixチームからPRESIDENTへ完了報告を送信しました。" >> development/development_log.txt

echo "✅ 完了報告送信完了！"
echo ""
echo "📋 報告詳細:"
echo "   報告ID: $REPORT_ID"
echo "   ログ: logs/errorfix_reports/${REPORT_ID}.json"