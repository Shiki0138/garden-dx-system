#!/bin/bash

# 👑 PRESIDENT Session 起動スクリプト

echo "================================================"
echo " 👑 PRESIDENT Session 起動"
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

PRESIDENT_SESSION="${PROJECT_NAME}_president"

echo "👑 PRESIDENT Session を起動します: $PROJECT_NAME"
echo ""

# 既存セッション確認
if tmux has-session -t "$PRESIDENT_SESSION" 2>/dev/null; then
    echo "⚠️  PRESIDENT Session は既に存在します。"
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
            tmux attach-session -t "$PRESIDENT_SESSION"
            exit 0
            ;;
        2)
            tmux kill-session -t "$PRESIDENT_SESSION" 2>/dev/null || true
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

# PRESIDENTセッション作成
echo "🏗️ PRESIDENT セッションを構築中..."
tmux new-session -d -s "$PRESIDENT_SESSION" -x 120 -y 40

# タイトル設定
tmux send-keys -t "$PRESIDENT_SESSION:0" "echo '👑 PRESIDENT AI'" C-m
tmux send-keys -t "$PRESIDENT_SESSION:0" "echo '================'" C-m
tmux send-keys -t "$PRESIDENT_SESSION:0" "echo 'プロジェクト: $PROJECT_NAME'" C-m
tmux send-keys -t "$PRESIDENT_SESSION:0" "echo '役割: 統括・意思決定・品質管理・開発ルール監査'" C-m
tmux send-keys -t "$PRESIDENT_SESSION:0" "echo ''" C-m

# Claude起動
echo "👑 PRESIDENT AI 起動中..."
tmux send-keys -t "$PRESIDENT_SESSION:0" "claude --dangerously-skip-permissions" C-m
sleep 2

# 初期プロンプト
tmux send-keys -t "$PRESIDENT_SESSION:0" "あなたはPRESIDENTです。指示書に従って行動してください。

役割と責任:
1. すべての指示の発信源（一元管理）
2. 開発ルール監査責任者（development/development_rules.md）
3. 仕様書配布管理（specifications/project_spec.md）
4. Boss/Workersチームへの開発指示
5. Error Fixチームへのエラー対応指示
6. UX/UI変更の最終承認

プロジェクト名: $PROJECT_NAME

【重要】指示の出し方:
./president-command.sh $PROJECT_NAME \"指示内容\"

例:
- プロジェクト開始: ./president-command.sh $PROJECT_NAME \"プロジェクトを開始してください\"
- エラー対応: ./president-command.sh $PROJECT_NAME \"エラー修正：ビルドエラーが発生\"
- 進捗確認: ./president-command.sh $PROJECT_NAME \"進捗を確認してください\"

すべて日本語の自然言語で指示できます。
詳細は instructions/president.md を確認してください。" C-m

# 環境変数ファイル作成/更新
cat > ".env_${PROJECT_NAME}" << EOF
export PROJECT_NAME="${PROJECT_NAME}"
export PRESIDENT_SESSION="${PRESIDENT_SESSION}"
EOF

# 開発ログ記録
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [START] [$PROJECT_NAME] [PRESIDENT] 
PRESIDENT Session を起動しました。
単独での意思決定と品質管理を開始します。" >> development/development_log.txt

echo ""
echo "✅ PRESIDENT Session 起動完了！"
echo ""
echo "📡 チームとの連携:"
echo "  - Boss/Workersへの指示: ./agent-send.sh $PROJECT_NAME boss1 \"指示内容\""
echo "  - Error Fixへの指示: ./president-to-errorfix.sh $PROJECT_NAME \"エラー内容\" \"優先度\""
echo ""
echo "🔧 管理コマンド:"
echo "  - 状態確認: ./team-status.sh $PROJECT_NAME"
echo "  - Boss/Workers起動: ./start-team.sh $PROJECT_NAME"
echo "  - Error Fix起動: ./start-errorfix.sh $PROJECT_NAME"
echo ""

# セッションに接続
echo "PRESIDENT Session に接続します..."
sleep 1
tmux attach-session -t "$PRESIDENT_SESSION"