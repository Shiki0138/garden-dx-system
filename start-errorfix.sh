#!/bin/bash

# 🛠️ Error Fix Session 起動スクリプト

echo "================================================"
echo " 🛠️ Error Fix Session 起動"
echo "================================================"

PROJECT_NAME="$1"
if [ -z "$PROJECT_NAME" ]; then
    echo "プロジェクト名を入力してください:"
    read PROJECT_NAME
    if [ -z "$PROJECT_NAME" ]; then
        echo "エラー: プロジェクト名が必要です"
        exit 1
    fi
fi

ERROR_FIX_SESSION="${PROJECT_NAME}_errorfix"

echo "🛠️ Error Fix Session を起動します: $PROJECT_NAME"
echo ""

# 既存セッション確認
if tmux has-session -t "$ERROR_FIX_SESSION" 2>/dev/null; then
    echo "⚠️  Error Fix Session は既に存在します。"
    echo ""
    echo "選択してください:"
    echo "1) 既存セッションに接続"
    echo "2) 既存セッションを削除して新規作成"
    echo "3) 終了"
    echo ""
    echo -n "選択 [1-3]: "
    read choice
    
    case $choice in
        1)
            echo "既存セッションに接続中..."
            tmux attach-session -t "$ERROR_FIX_SESSION"
            exit 0
            ;;
        2)
            tmux kill-session -t "$ERROR_FIX_SESSION" 2>/dev/null || true
            ;;
        3)
            exit 0
            ;;
        *)
            echo "無効な選択です。終了します。"
            exit 1
            ;;
    esac
fi

# 必要なディレクトリ作成
mkdir -p tmp development specifications logs

# Error Fix セッション作成（3ペイン）
echo "🏗️ エラー補正専用セッションを構築中..."
tmux new-session -d -s "$ERROR_FIX_SESSION" -x 240 -y 50

# ペイン分割: Codex | Gemini | Claude
tmux split-window -h -t "$ERROR_FIX_SESSION"
tmux split-window -h -t "$ERROR_FIX_SESSION:0.1"
tmux select-layout -t "$ERROR_FIX_SESSION" even-horizontal

# Codex設定（ペイン0）
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "echo '⚡ CODEX - Error Fix AI'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "echo '========================'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "echo 'プロジェクト: $PROJECT_NAME'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "echo '役割: コードエラー分析・修正提案'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "echo ''" C-m

# Gemini設定（ペイン1）
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "echo '🌟 GEMINI - Error Fix AI'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "echo '========================'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "echo 'プロジェクト: $PROJECT_NAME'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "echo '役割: CI/CD連携・デプロイエラー解決'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "echo ''" C-m

# Claude設定（ペイン2）
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "echo '🔧 CLAUDE - Error Fix AI'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "echo '========================'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "echo 'プロジェクト: $PROJECT_NAME'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "echo '役割: 総合エラー分析・解決策統括'" C-m
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "echo ''" C-m

# AI起動
echo "🚀 エラー補正AIを起動中..."

# Codex起動
echo "⚡ CODEX Error Fix AI 起動中..."
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "claude --dangerously-skip-permissions" C-m
sleep 2
tmux send-keys -t "$ERROR_FIX_SESSION:0.0" "あなたはCodex Error Fix AIです。

専門分野：
- コンパイルエラーの解析と修正
- 文法エラーの検出と修正提案
- 依存関係エラーの解決
- パフォーマンスボトルネックの検出
- コードレベルの問題分析

プロジェクト名: $PROJECT_NAME
PRESIDENTからの指示を待機中です。" C-m

# Gemini起動
echo "🌟 GEMINI Error Fix AI 起動中..."
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "claude --dangerously-skip-permissions" C-m
sleep 2
tmux send-keys -t "$ERROR_FIX_SESSION:0.1" "あなたはGemini Error Fix AIです。

専門分野：
- CI/CDパイプラインエラーの解決
- GitHub Actionsエラーの修正
- デプロイメントエラーの対処
- 環境設定問題の解決
- インフラレベルの問題分析

プロジェクト名: $PROJECT_NAME
PRESIDENTからの指示を待機中です。" C-m

# Claude起動（エラー修正チームリーダー）
echo "🔧 CLAUDE Error Fix AI 起動中..."
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "claude --dangerously-skip-permissions" C-m
sleep 2
tmux send-keys -t "$ERROR_FIX_SESSION:0.2" "あなたはClaude Error Fix AIです。

役割：
- エラー補正チームのリーダー
- GeminiとCodexへの指示出し
- 両者の分析結果を統合
- 最適な解決策の決定と実装指揮
- PRESIDENTへの完了報告

指示の出し方：
1. PRESIDENTからエラー修正指示を受信
2. エラー内容を分析
3. Geminiに「CI/CD観点で○○を調査してください」と指示
4. Codexに「コード観点で○○を調査してください」と指示
5. 両者の報告を統合して解決策を決定
6. 実装を指揮
7. PRESIDENTに「エラー修正完了：[詳細]」と報告

プロジェクト名: $PROJECT_NAME
PRESIDENTからの指示を待機中です。" C-m

# 環境変数ファイル更新
if [ -f ".env_${PROJECT_NAME}" ]; then
    echo "export ERROR_FIX_SESSION=\"${ERROR_FIX_SESSION}\"" >> ".env_${PROJECT_NAME}"
else
    cat > ".env_${PROJECT_NAME}" << EOF
export PROJECT_NAME="${PROJECT_NAME}"
export ERROR_FIX_SESSION="${ERROR_FIX_SESSION}"
EOF
fi

# エラー監視システム起動
echo "🔍 エラー監視システムを起動中..."
cat > "tmp/error_monitor_${PROJECT_NAME}.sh" << 'EOF'
#!/bin/bash
PROJECT_NAME="$1"
ERROR_FIX_SESSION="${PROJECT_NAME}_errorfix"

while true; do
    # エラーログ監視
    if [ -f "logs/deploy_error.log" ]; then
        NEW_ERRORS=$(tail -20 logs/deploy_error.log | grep -E "error|failed|Error|Failed" | head -5)
        if [ -n "$NEW_ERRORS" ]; then
            echo "[$(date '+%H:%M:%S')] 新規エラー検出"
            # 各AIに通知（実際のtmux send-keysはスキップ）
        fi
    fi
    sleep 60
done
EOF

chmod +x "tmp/error_monitor_${PROJECT_NAME}.sh"
nohup "./tmp/error_monitor_${PROJECT_NAME}.sh" "$PROJECT_NAME" > /dev/null 2>&1 &
MONITOR_PID=$!
echo $MONITOR_PID > "tmp/error_monitor_pid_${PROJECT_NAME}.txt"

# 開発ログ記録
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [START] [$PROJECT_NAME] [ERROR_FIX] 
Error Fix Session を起動しました。
Codex/Gemini/Claude の3AI体制でエラー補正を開始します。
エラー監視システム: PID $MONITOR_PID" >> development/development_log.txt

echo ""
echo "✅ Error Fix Session 起動完了！"
echo ""
echo "🛠️ エラー補正チーム構成:"
echo "  - CODEX: コードエラー分析・修正"
echo "  - GEMINI: CI/CD・デプロイエラー解決"
echo "  - CLAUDE: 総合分析・解決策統括"
echo ""
echo "📡 連携方法:"
echo "  - PRESIDENTからの指示: ./president-to-errorfix.sh $PROJECT_NAME \"エラー内容\" \"優先度\""
echo "  - 自動エラー監視: 60秒間隔で稼働中 (PID: $MONITOR_PID)"
echo ""
echo "🔧 管理コマンド:"
echo "  - 状態確認: ./team-status.sh $PROJECT_NAME"
echo "  - 監視停止: kill $MONITOR_PID"
echo ""

# セッションに接続
echo "Error Fix Session に接続します..."
sleep 1
tmux attach-session -t "$ERROR_FIX_SESSION"