#!/bin/bash

# 🔄 自動継続実行システム - 30分間隔で作業を継続

echo "================================================"
echo " 🔄 自動継続実行システム"
echo "================================================"

PROJECT_NAME="$1"
COMMAND="$2"

if [ -z "$PROJECT_NAME" ]; then
    echo "使用方法: ./auto-continue.sh [プロジェクト名] [start|stop|status]"
    exit 1
fi

PID_FILE="tmp/auto_continue_${PROJECT_NAME}.pid"
LOG_FILE="logs/auto_continue_${PROJECT_NAME}.log"

# 自動継続実行関数
auto_continue_loop() {
    local project="$1"
    local team_session="${project}_multiagent"
    local cycle=1
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 自動継続実行システム開始" | tee -a "$LOG_FILE"
    
    while true; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] サイクル${cycle}開始" | tee -a "$LOG_FILE"
        
        # セッション存在確認
        if tmux has-session -t "$team_session" 2>/dev/null; then
            # 作業タスクリスト
            case $((cycle % 10)) in
                1) TASK="仕様書確認と実装計画更新" ;;
                2) TASK="コード品質チェックとリファクタリング" ;;
                3) TASK="テストコード作成・更新" ;;
                4) TASK="ドキュメント更新" ;;
                5) TASK="パフォーマンス最適化" ;;
                6) TASK="セキュリティチェック" ;;
                7) TASK="依存関係の更新確認" ;;
                8) TASK="コードレビューと改善" ;;
                9) TASK="デプロイ準備と検証" ;;
                0) TASK="全体進捗確認とレポート作成" ;;
            esac
            
            # Boss1に継続指示
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Boss1に指示: $TASK" | tee -a "$LOG_FILE"
            
            tmux send-keys -t "$team_session:0.0" "
[自動継続システム] サイクル${cycle}
タスク: $TASK
時刻: $(date '+%Y-%m-%d %H:%M:%S')

以下を実行してください：
1. 現在の進捗状況を確認
2. '$TASK' を Worker1-5 に適切に分配
3. 品質基準を維持しながら実行
4. 完了後、開発ログに記録

./agent-send.sh $project worker1 \"$TASK の一部を担当してください\"
./agent-send.sh $project worker2 \"$TASK の一部を担当してください\"
./agent-send.sh $project worker3 \"$TASK の一部を担当してください\"
./agent-send.sh $project worker4 \"$TASK の一部を担当してください\"
./agent-send.sh $project worker5 \"$TASK の一部を担当してください\"
" C-m
            
            # 開発ログ記録
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] [AUTO_CONTINUE] [$project] 
サイクル: $cycle
実行タスク: $TASK
自動継続システムにより新規タスクを配布しました。" >> development/development_log.txt
            
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Team Session が存在しません" | tee -a "$LOG_FILE"
        fi
        
        # 30分待機（1800秒）
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 次のサイクルまで30分待機..." | tee -a "$LOG_FILE"
        sleep 1800
        
        cycle=$((cycle + 1))
    done
}

# コマンド処理
case "$COMMAND" in
    "start")
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE")
            if kill -0 "$OLD_PID" 2>/dev/null; then
                echo "✅ 自動継続実行システムは既に稼働中です (PID: $OLD_PID)"
                exit 0
            fi
        fi
        
        echo "🚀 自動継続実行システムを起動中..."
        mkdir -p logs tmp
        
        # バックグラウンドで実行
        auto_continue_loop "$PROJECT_NAME" &
        NEW_PID=$!
        echo $NEW_PID > "$PID_FILE"
        
        echo "✅ 自動継続実行システム起動完了"
        echo "   PID: $NEW_PID"
        echo "   ログ: $LOG_FILE"
        echo "   間隔: 30分"
        echo ""
        echo "📋 実行されるタスク:"
        echo "   - 仕様書確認と実装計画"
        echo "   - コード品質チェック"
        echo "   - テスト作成"
        echo "   - ドキュメント更新"
        echo "   - パフォーマンス最適化"
        echo "   - セキュリティチェック"
        echo "   - その他保守タスク"
        ;;
        
    "stop")
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm -f "$PID_FILE"
                echo "✅ 自動継続実行システムを停止しました (PID: $PID)"
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] システム停止" >> "$LOG_FILE"
            else
                echo "⚠️ プロセスが見つかりません (PID: $PID)"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ 自動継続実行システムは稼働していません"
        fi
        ;;
        
    "status")
        echo "📊 自動継続実行システム状態"
        echo "   プロジェクト: $PROJECT_NAME"
        echo ""
        
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "   状態: ✅ 稼働中"
                echo "   PID: $PID"
                echo "   プロセス情報:"
                ps -p "$PID" -o pid,ppid,start,etime,command | tail -n +1
                
                if [ -f "$LOG_FILE" ]; then
                    echo ""
                    echo "   最新ログ (直近5件):"
                    tail -5 "$LOG_FILE" | sed 's/^/      /'
                fi
            else
                echo "   状態: ❌ 停止中（PIDファイルは存在）"
                rm -f "$PID_FILE"
            fi
        else
            echo "   状態: ❌ 停止中"
        fi
        ;;
        
    *)
        echo "使用方法: ./auto-continue.sh [プロジェクト名] [start|stop|status]"
        echo ""
        echo "コマンド:"
        echo "  start  - 自動継続実行を開始（30分間隔）"
        echo "  stop   - 自動継続実行を停止"
        echo "  status - 現在の状態を確認"
        echo ""
        echo "例:"
        echo "  ./auto-continue.sh myproject start"
        echo "  ./auto-continue.sh myproject status"
        echo "  ./auto-continue.sh myproject stop"
        ;;
esac