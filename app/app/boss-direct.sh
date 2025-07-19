#!/bin/bash

# Boss1への直接指示スクリプト
# Claude Codeのコメントボックス問題を回避するためのシンプルな指示送信

PROJECT_NAME="${1:-garden}"
INSTRUCTION="${2:-作業を開始してください}"

echo "🎯 Boss1への直接指示送信"
echo "プロジェクト: $PROJECT_NAME"
echo "指示内容: $INSTRUCTION"

# multiagentセッションのboss1に指示を送信
tmux send-keys -t "${PROJECT_NAME}_multiagent:0.0" "$INSTRUCTION" C-m

echo "✅ 指示送信完了"