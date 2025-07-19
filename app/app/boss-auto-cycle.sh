#!/bin/bash

# 🔄 Boss自動サイクルシステム - 30秒間隔でworkerの完了をチェックし、次のタスクを自動発行

echo "================================================"
echo " 🔄 Boss自動サイクルシステム"
echo "================================================"

PROJECT_NAME="$1"

if [ -z "$PROJECT_NAME" ]; then
    echo "使用方法: ./boss-auto-cycle.sh [プロジェクト名]"
    echo "例: ./boss-auto-cycle.sh garden"
    exit 1
fi

# プロジェクト名検証
if ! [[ "$PROJECT_NAME" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "❌ エラー: プロジェクト名は英数字とアンダースコアのみ使用可能です"
    exit 1
fi

# セッション名設定
BOSS_SESSION="${PROJECT_NAME}_multiagent:0.0"
PRESIDENT_SESSION="${PROJECT_NAME}_president"

# ログファイル設定
LOG_FILE="logs/boss_auto_cycle_${PROJECT_NAME}.log"
mkdir -p logs tmp

# タスクリスト定義
TASKS=(
    "仕様書を再確認して実装計画を作成"
    "開発環境のセットアップを実施"
    "基本機能の実装を開始"
    "テストコードの作成"
    "コードレビューとリファクタリング"
    "ドキュメント作成と更新"
    "デプロイ準備と確認"
    "パフォーマンス最適化"
    "セキュリティチェック"
    "最終品質確認"
)

# ログ記録関数
log_message() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" | tee -a "$LOG_FILE"
}

# 開発ログ記録関数
dev_log() {
    local action="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$action] [$PROJECT_NAME] [boss-auto-cycle] $message" >> development/development_log.txt
}

# Worker完了チェック関数
check_workers_complete() {
    local complete_count=0
    for i in {1..5}; do
        if [ -f "./tmp/worker${i}_done.txt" ]; then
            complete_count=$((complete_count + 1))
        fi
    done
    echo $complete_count
}

# 次のタスクを送信する関数
send_next_task() {
    local cycle_num="$1"
    local task_index=$(( (cycle_num - 1) % ${#TASKS[@]} ))
    local task="${TASKS[$task_index]}"
    
    log_message "サイクル${cycle_num}: '${task}' を全workerに送信"
    dev_log "CYCLE_START" "サイクル${cycle_num}開始 - タスク: ${task}"
    
    # 完了ファイルをクリア
    rm -f ./tmp/worker*_done.txt
    
    # Boss1に自動指示を送信
    tmux send-keys -t "$BOSS_SESSION" "
# === 自動サイクル${cycle_num} ===
echo \"[自動サイクルシステム] サイクル${cycle_num}開始\"
echo \"タスク: ${task}\"

# サイクルファイル作成
touch ./tmp/cycle_${cycle_num}.txt

# 全workerに指示送信
./agent-send.sh $PROJECT_NAME worker1 \"あなたはworker1です。仕様書を確認して${task}を担当してください\"
./agent-send.sh $PROJECT_NAME worker2 \"あなたはworker2です。仕様書を確認して${task}を担当してください\"
./agent-send.sh $PROJECT_NAME worker3 \"あなたはworker3です。仕様書を確認して${task}を担当してください\"
./agent-send.sh $PROJECT_NAME worker4 \"あなたはworker4です。仕様書を確認して${task}を担当してください\"
./agent-send.sh $PROJECT_NAME worker5 \"あなたはworker5です。仕様書を確認して${task}を担当してください\"

echo \"サイクル${cycle_num}の指示を全員に送信完了\"
" C-m
    
    dev_log "TASK_SENT" "サイクル${cycle_num} - 全worker指示完了"
}

# メイン処理
main() {
    log_message "Boss自動サイクルシステム起動"
    log_message "プロジェクト: $PROJECT_NAME"
    log_message "チェック間隔: 30秒"
    log_message "最大サイクル: 10"
    dev_log "SYSTEM_START" "Boss自動サイクルシステム起動"
    
    # tmuxセッション確認
    if ! tmux has-session -t "${PROJECT_NAME}_multiagent" 2>/dev/null; then
        log_message "❌ エラー: multiagentセッションが見つかりません"
        exit 1
    fi
    
    local cycle=1
    local wait_count=0
    local max_wait=20  # 最大10分待機（30秒 × 20 = 600秒）
    
    while [ $cycle -le 10 ]; do
        log_message "=== サイクル${cycle} 監視中 ==="
        
        # Worker完了状態チェック
        local complete_workers=$(check_workers_complete)
        log_message "完了worker数: ${complete_workers}/5"
        
        # 全worker完了または待機時間超過
        if [ $complete_workers -eq 5 ] || [ $wait_count -ge $max_wait ]; then
            if [ $complete_workers -eq 5 ]; then
                log_message "✅ 全worker完了を検出"
                dev_log "ALL_COMPLETE" "サイクル${cycle} - 全worker完了"
                
                # Presidentに報告
                ./agent-send.sh "$PROJECT_NAME" president "サイクル${cycle}完了: 全員が${TASKS[$(( (cycle - 1) % ${#TASKS[@]} ))]}を完了しました"
            else
                log_message "⏱️ タイムアウト: ${wait_count}回の待機後、次のサイクルへ"
                dev_log "TIMEOUT" "サイクル${cycle} - タイムアウト (完了: ${complete_workers}/5)"
            fi
            
            # 次のサイクルへ
            cycle=$((cycle + 1))
            wait_count=0
            
            if [ $cycle -le 10 ]; then
                sleep 5  # 少し待機してから次のタスク送信
                send_next_task $cycle
            fi
        else
            # 30秒待機
            log_message "待機中... (${wait_count}/${max_wait})"
            sleep 30
            wait_count=$((wait_count + 1))
        fi
    done
    
    log_message "🏁 10サイクル完了 - システム終了"
    dev_log "SYSTEM_END" "Boss自動サイクルシステム終了 - 10サイクル完了"
    
    # 最終報告
    ./agent-send.sh "$PROJECT_NAME" president "Boss自動サイクル完了: 全10サイクルのタスクを完了しました"
}

# シグナルハンドラー設定
trap 'log_message "システム中断"; dev_log "SYSTEM_INTERRUPT" "ユーザーによる中断"; exit 1' INT TERM

# 初期メッセージ
echo ""
echo "📋 実行されるタスク:"
for i in "${!TASKS[@]}"; do
    echo "   サイクル$((i + 1)): ${TASKS[$i]}"
done
echo ""
echo "🚀 30秒ごとにworker完了状態をチェックします"
echo "   完了検出またはタイムアウト(10分)で次のタスクへ"
echo "   Ctrl+C で停止"
echo ""

# メイン処理実行
main