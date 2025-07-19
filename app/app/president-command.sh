#!/bin/bash

# 👑 PRESIDENT 統一指示システム - 自然言語対応

echo "================================================"
echo " 👑 PRESIDENT 指示システム"
echo "================================================"

PROJECT_NAME="$1"
COMMAND="$2"

if [ -z "$PROJECT_NAME" ] || [ -z "$COMMAND" ]; then
    echo "使用方法: ./president-command.sh [プロジェクト名] \"指示内容\""
    echo ""
    echo "🔑 キーフレーズ例:"
    echo "  【チーム管理】"
    echo "  - \"プロジェクトを開始\" → Boss/Workersに開始指示"
    echo "  - \"進捗を確認\" → チーム全体の進捗確認"
    echo "  - \"品質チェック\" → 品質確認タスク配布"
    echo "  - \"デプロイ準備\" → デプロイ準備作業指示"
    echo ""
    echo "  【エラー対応】"
    echo "  - \"エラー修正：[内容]\" → Error Fixチームに修正指示"
    echo "  - \"デプロイエラー\" → デプロイエラーの調査・修正"
    echo "  - \"緊急対応：[内容]\" → 高優先度でエラー修正"
    echo ""
    echo "  【その他】"
    echo "  - \"状態確認\" → 全チームの状態確認"
    echo "  - \"レポート作成\" → 進捗レポート作成指示"
    exit 1
fi

# セッション名
PRESIDENT_SESSION="${PROJECT_NAME}_president"
TEAM_SESSION="${PROJECT_NAME}_multiagent"
ERROR_FIX_SESSION="${PROJECT_NAME}_errorfix"

# タイムスタンプと指示ID
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
INSTRUCTION_ID=$(date '+%Y%m%d%H%M%S')

# 自然言語解析関数
analyze_command() {
    local cmd="$1"
    local cmd_lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]')
    
    # エラー関連のキーワード
    if [[ "$cmd" =~ "エラー" ]] || [[ "$cmd" =~ "修正" ]] || [[ "$cmd" =~ "デプロイエラー" ]] || [[ "$cmd" =~ "緊急" ]]; then
        echo "error_fix"
        return
    fi
    
    # プロジェクト開始
    if [[ "$cmd" =~ "開始" ]] || [[ "$cmd" =~ "スタート" ]] || [[ "$cmd" =~ "始め" ]]; then
        echo "start_project"
        return
    fi
    
    # 進捗確認
    if [[ "$cmd" =~ "進捗" ]] || [[ "$cmd" =~ "状況" ]] || [[ "$cmd" =~ "確認" ]]; then
        echo "check_progress"
        return
    fi
    
    # 品質チェック
    if [[ "$cmd" =~ "品質" ]] || [[ "$cmd" =~ "チェック" ]] || [[ "$cmd" =~ "レビュー" ]]; then
        echo "quality_check"
        return
    fi
    
    # デプロイ準備
    if [[ "$cmd" =~ "デプロイ" ]] || [[ "$cmd" =~ "リリース" ]] || [[ "$cmd" =~ "本番" ]]; then
        echo "deploy_prepare"
        return
    fi
    
    # レポート作成
    if [[ "$cmd" =~ "レポート" ]] || [[ "$cmd" =~ "報告" ]] || [[ "$cmd" =~ "まとめ" ]]; then
        echo "create_report"
        return
    fi
    
    # その他
    echo "general"
}

# 指示タイプを判定
COMMAND_TYPE=$(analyze_command "$COMMAND")

echo "📋 指示内容: $COMMAND"
echo "🔍 解析結果: $COMMAND_TYPE"
echo ""

# Boss/Workersへの指示関数
send_to_team() {
    local instruction="$1"
    local task_type="$2"
    
    if ! tmux has-session -t "$TEAM_SESSION" 2>/dev/null; then
        echo "❌ Team Session が起動していません。"
        echo "   ./start-team.sh $PROJECT_NAME を実行してください。"
        return 1
    fi
    
    echo "📤 Boss/Workers チームに指示を送信中..."
    
    # 長いメッセージは問題を引き起こす可能性があるため、シンプルな指示に変更
    tmux send-keys -t "$TEAM_SESSION:0.0" "あなたはboss1です。PRESIDENTから指示：$instruction" C-m
    
    echo "✅ Team への指示送信完了"
}

# Error Fixチームへの指示関数
send_to_errorfix() {
    local error_content="$1"
    local priority="$2"
    
    if ! tmux has-session -t "$ERROR_FIX_SESSION" 2>/dev/null; then
        echo "❌ Error Fix Session が起動していません。"
        echo "   ./start-errorfix.sh $PROJECT_NAME を実行してください。"
        return 1
    fi
    
    echo "📤 Error Fix チームに指示を送信中..."
    
    # Claude（リーダー）への指示
    tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "
=====================================
👑 PRESIDENT からの指示 [ID: $INSTRUCTION_ID]
=====================================
時刻: $TIMESTAMP
優先度: $priority
役割: エラー修正チームリーダー

【エラー内容】
$error_content

【Claudeへの指示】
あなたはError Fixチームのリーダーです。
1. エラー内容を分析
2. GeminiとCodexに適切な指示を出す
3. 両者の分析結果を統合
4. 最適な解決策を決定
5. 実装を指揮
6. PRESIDENTに完了報告

以下のフォーマットで指示してください：
- Geminiへ: 「CI/CD観点で[具体的な調査内容]を分析してください」
- Codexへ: 「コード観点で[具体的な調査内容]を分析してください」
=====================================" C-m
    
    # Geminiへの通知
    tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "
【通知】Claudeからの指示を待機してください。
エラー内容: $error_content
" C-m
    
    # Codexへの通知
    tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "
【通知】Claudeからの指示を待機してください。
エラー内容: $error_content
" C-m
    
    echo "✅ Error Fix への指示送信完了（Claude主導）"
}

# コマンドタイプに応じた処理
case $COMMAND_TYPE in
    "start_project")
        send_to_team "$COMMAND" "プロジェクト開始"
        ;;
        
    "check_progress")
        send_to_team "$COMMAND" "進捗確認"
        ;;
        
    "quality_check")
        send_to_team "$COMMAND" "品質チェック"
        ;;
        
    "deploy_prepare")
        send_to_team "$COMMAND" "デプロイ準備"
        ;;
        
    "create_report")
        send_to_team "$COMMAND" "レポート作成"
        ;;
        
    "error_fix")
        # 優先度判定
        if [[ "$COMMAND" =~ "緊急" ]] || [[ "$COMMAND" =~ "至急" ]]; then
            PRIORITY="high"
        else
            PRIORITY="medium"
        fi
        send_to_errorfix "$COMMAND" "$PRIORITY"
        ;;
        
    "general")
        # 一般的な指示はBossに送信
        send_to_team "$COMMAND" "一般指示"
        ;;
esac

# 指示ログ記録
mkdir -p logs/president_instructions
cat > "logs/president_instructions/${INSTRUCTION_ID}.json" << EOF
{
  "id": "$INSTRUCTION_ID",
  "timestamp": "$TIMESTAMP",
  "project": "$PROJECT_NAME",
  "command": "$COMMAND",
  "command_type": "$COMMAND_TYPE",
  "status": "sent"
}
EOF

# 開発ログ記録
echo "[$TIMESTAMP] [PRESIDENT_COMMAND] [$PROJECT_NAME]
指示ID: $INSTRUCTION_ID
指示内容: $COMMAND
指示タイプ: $COMMAND_TYPE
指示を送信しました。" >> development/development_log.txt

echo ""
echo "📊 指示管理:"
echo "   指示ID: $INSTRUCTION_ID"
echo "   ログ: logs/president_instructions/${INSTRUCTION_ID}.json"
echo ""
echo "💡 ヒント:"
echo "   - 進捗確認: tmux attach-session -t $TEAM_SESSION"
echo "   - エラー対応確認: tmux attach-session -t $ERROR_FIX_SESSION"