#!/bin/bash

# 👥 Boss/Workers Team Session 起動スクリプト

echo "================================================"
echo " 👥 Boss/Workers Team Session 起動"
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

TEAM_SESSION="${PROJECT_NAME}_team"

echo "👥 Team Session を起動します: $PROJECT_NAME"
echo ""

# 既存セッション確認
if tmux has-session -t "$TEAM_SESSION" 2>/dev/null; then
    echo "⚠️  Team Session は既に存在します。"
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
            tmux attach-session -t "$TEAM_SESSION"
            exit 0
            ;;
        2)
            tmux kill-session -t "$TEAM_SESSION" 2>/dev/null || true
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

# Team セッション作成（6ペイン）
echo "🏗️ Boss/Workers チームセッションを構築中..."
tmux new-session -d -s "$TEAM_SESSION" -x 240 -y 80

# ペイン分割: 2x3レイアウト
tmux split-window -h -t "$TEAM_SESSION"
tmux split-window -h -t "$TEAM_SESSION:0.1"
tmux split-window -v -t "$TEAM_SESSION:0.0"
tmux split-window -v -t "$TEAM_SESSION:0.2"
tmux split-window -v -t "$TEAM_SESSION:0.4"
tmux select-layout -t "$TEAM_SESSION" tiled

# Boss設定（ペイン0）
tmux send-keys -t "$TEAM_SESSION:0.0" "echo '🎯 BOSS1 AI'" C-m
tmux send-keys -t "$TEAM_SESSION:0.0" "echo '================'" C-m
tmux send-keys -t "$TEAM_SESSION:0.0" "echo 'プロジェクト: $PROJECT_NAME'" C-m
tmux send-keys -t "$TEAM_SESSION:0.0" "echo '役割: チーム管理・品質監督・自動再指示'" C-m
tmux send-keys -t "$TEAM_SESSION:0.0" "echo ''" C-m

# Workers設定（ペイン1-5）
for i in {1..5}; do
    tmux send-keys -t "$TEAM_SESSION:0.$i" "echo '👷 WORKER$i AI'" C-m
    tmux send-keys -t "$TEAM_SESSION:0.$i" "echo '================'" C-m
    tmux send-keys -t "$TEAM_SESSION:0.$i" "echo 'プロジェクト: $PROJECT_NAME'" C-m
    tmux send-keys -t "$TEAM_SESSION:0.$i" "echo '役割: 実装・開発・仕様書準拠作業'" C-m
    tmux send-keys -t "$TEAM_SESSION:0.$i" "echo ''" C-m
done

# AI起動
echo "🚀 Boss/Workers チームAIを起動中..."

# Boss起動
echo "🎯 BOSS1 AI 起動中..."
tmux send-keys -t "$TEAM_SESSION:0.0" "claude --dangerously-skip-permissions" C-m
sleep 2
tmux send-keys -t "$TEAM_SESSION:0.0" "あなたはboss1です。指示書に従ってチーム管理してください。

重要事項：
- development/development_rules.md を必ず確認
- specifications/project_spec.md を必ず確認
- チーム全体の品質管理責任
- 定期的なGitHubデプロイ管理
- 自動再指示システムの実行

プロジェクト名: $PROJECT_NAME
PRESIDENTからの指示を待機中です。" C-m

# Workers起動
for i in {1..5}; do
    echo "👷 WORKER$i AI 起動中..."
    tmux send-keys -t "$TEAM_SESSION:0.$i" "claude --dangerously-skip-permissions" C-m
    sleep 1
    tmux send-keys -t "$TEAM_SESSION:0.$i" "あなたはworker$iです。指示書に従って作業してください。

重要事項：
- development/development_rules.md を必ず確認
- specifications/project_spec.md を必ず確認
- ユーザ第一主義で開発する
- 史上最強のシステムを作る意識を持つ
- 全作業を開発ログに記録する

プロジェクト名: $PROJECT_NAME
boss1からの指示を待機中です。" C-m
done

# 環境変数ファイル更新
if [ -f ".env_${PROJECT_NAME}" ]; then
    echo "export TEAM_SESSION=\"${TEAM_SESSION}\"" >> ".env_${PROJECT_NAME}"
else
    cat > ".env_${PROJECT_NAME}" << EOF
export PROJECT_NAME="${PROJECT_NAME}"
export TEAM_SESSION="${TEAM_SESSION}"
EOF
fi

# 開発ログ記録
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [START] [$PROJECT_NAME] [TEAM] 
Boss/Workers Team Session を起動しました。
Boss1 + Worker1-5 の6体制で作業を開始します。" >> development/development_log.txt

echo ""
echo "✅ Boss/Workers Team Session 起動完了！"
echo ""
echo "👥 チーム構成:"
echo "  - BOSS1: チーム管理・品質監督"
echo "  - WORKER1-5: 実装・開発作業"
echo ""
echo "📡 連携方法:"
echo "  - PRESIDENTからの指示受信: 待機中"
echo "  - Worker間連携: ./agent-send.sh $PROJECT_NAME worker[番号] \"メッセージ\""
echo ""
echo "🔧 管理コマンド:"
echo "  - 状態確認: ./team-status.sh $PROJECT_NAME"
echo "  - 自動継続実行: ./auto-continue.sh $PROJECT_NAME start"
echo ""

# セッションに接続
echo "Team Session に接続します..."
sleep 1
tmux attach-session -t "$TEAM_SESSION"