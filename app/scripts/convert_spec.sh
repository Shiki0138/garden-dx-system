#!/bin/bash

# 📋 仕様書変換スクリプト
# テキスト仕様書をMarkdown形式に変換

set -e

PROJECT_NAME="${PROJECT_NAME:-default}"

# 色付きログ関数
log_info() {
    echo -e "\033[1;32m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[1;34m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

echo "📋 仕様書変換システム"
echo "====================="
echo ""

# 仕様書ファイル確認
SPEC_FILE="specifications/project_spec.txt"
if [ ! -f "$SPEC_FILE" ]; then
    log_error "仕様書ファイルが見つかりません: $SPEC_FILE"
    echo "specifications/project_spec.txt を作成してください。"
    exit 1
fi

log_info "仕様書ファイル確認: $SPEC_FILE"

# 出力ファイル設定
OUTPUT_DIR="specifications"
OUTPUT_FILE="$OUTPUT_DIR/project_spec.md"

log_info "Markdown変換開始..."

# 基本的なMarkdown変換
{
    echo "# 📋 プロジェクト仕様書"
    echo ""
    echo "**変換日時**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**プロジェクト**: $PROJECT_NAME"
    echo ""
    echo "---"
    echo ""
    
    # テキストファイルの内容を処理
    while IFS= read -r line || [[ -n "$line" ]]; do
        # 空行はそのまま
        if [[ -z "$line" ]]; then
            echo ""
            continue
        fi
        
        # #で始まる行はヘッダーとして処理
        if [[ "$line" =~ ^#+ ]]; then
            echo "$line"
            continue
        fi
        
        # -で始まる行はリストとして処理
        if [[ "$line" =~ ^[[:space:]]*- ]]; then
            echo "$line"
            continue
        fi
        
        # 数字で始まる行はリストとして処理
        if [[ "$line" =~ ^[[:space:]]*[0-9]+\. ]]; then
            echo "$line"
            continue
        fi
        
        # その他の行は段落として処理
        echo "$line"
        
    done < "$SPEC_FILE"
    
    echo ""
    echo "---"
    echo ""
    echo "**注意**: この仕様書は全エージェントが参照します。変更時は必ずPRESIDENTの承認を得てください。"
    
} > "$OUTPUT_FILE"

log_success "Markdown変換完了: $OUTPUT_FILE"

# Claude Codeからの改善提案機能
echo ""
echo "🤖 Claude Code 改善提案システム"
echo "=================================="
echo ""
echo "仕様書を分析して、ユーザーエクスペリエンス向上のための改善提案を生成中..."
echo ""

# 仕様書の内容を分析
SPEC_CONTENT=$(cat "$SPEC_FILE")
WORD_COUNT=$(echo "$SPEC_CONTENT" | wc -w)
LINE_COUNT=$(echo "$SPEC_CONTENT" | wc -l)

# 改善提案を生成するスクリプトを作成
SUGGESTION_SCRIPT="tmp/generate_suggestions.py"
mkdir -p tmp

cat > "$SUGGESTION_SCRIPT" << 'EOF'
import sys
import re
from datetime import datetime

def analyze_spec_and_suggest_improvements(spec_content):
    """仕様書を分析してClaude Code視点での改善提案を生成"""
    
    improvements = []
    
    # キーワード分析
    content_lower = spec_content.lower()
    
    # ユーザビリティ改善提案
    if 'ユーザー' in spec_content or 'user' in content_lower:
        improvements.append({
            'category': '🎯 ユーザーエクスペリエンス',
            'title': 'リアルタイムフィードバック機能',
            'description': 'ユーザーの操作に対して即座に視覚的フィードバックを提供し、操作の成功/失敗を明確に伝える機能。マイクロインタラクションでユーザーの満足度を大幅向上。',
            'impact': '高',
            'effort': '中'
        })
    
    # パフォーマンス改善
    if 'api' in content_lower or 'データ' in spec_content:
        improvements.append({
            'category': '⚡ パフォーマンス',
            'title': 'プリロード・キャッシュ最適化',
            'description': 'ユーザーの行動を予測して必要なデータを事前読み込み。オフライン対応とキャッシュ戦略でストレスフリーな体験を提供。',
            'impact': '高',
            'effort': '中'
        })
    
    # アクセシビリティ
    improvements.append({
        'category': '♿ アクセシビリティ',
        'title': '全方位アクセシビリティ対応',
        'description': 'スクリーンリーダー完全対応、キーボードナビゲーション、高コントラスト表示、音声操作対応で、すべてのユーザーが快適に利用可能。',
        'impact': '高',
        'effort': '中'
    })
    
    # セキュリティ
    if 'ログイン' in spec_content or 'auth' in content_lower:
        improvements.append({
            'category': '🔒 セキュリティ',
            'title': '生体認証・多要素認証',
            'description': '指紋認証、顔認証、ワンタイムパスワードなど複数の認証方式を組み合わせ、セキュリティを高めながらユーザビリティも向上。',
            'impact': '高',
            'effort': '中'
        })
    
    # モバイル最適化
    improvements.append({
        'category': '📱 モバイル最適化',
        'title': 'ネイティブアプリ級のPWA',
        'description': 'プッシュ通知、オフライン機能、ホーム画面追加、ハードウェア加速を活用し、ネイティブアプリと見分けがつかない体験を提供。',
        'impact': '高',
        'effort': '高'
    })
    
    # AI・機械学習
    improvements.append({
        'category': '🤖 AI・パーソナライゼーション',
        'title': 'AIパーソナライゼーション',
        'description': 'ユーザーの行動パターンを学習し、個人に最適化されたインターフェース、コンテンツ、機能配置を自動提案。使うほど便利になるシステム。',
        'impact': '中',
        'effort': '高'
    })
    
    # データ分析
    improvements.append({
        'category': '📊 データドリブン改善',
        'title': 'リアルタイムユーザー行動分析',
        'description': 'ヒートマップ、ユーザーフロー分析、A/Bテスト機能を内蔵し、データに基づいた継続的な改善サイクルを自動化。',
        'impact': '中',
        'effort': '中'
    })
    
    # 協調機能
    if 'チーム' in spec_content or 'shared' in content_lower:
        improvements.append({
            'category': '👥 コラボレーション',
            'title': 'リアルタイム協調編集',
            'description': 'Google Docs風のリアルタイム協調編集、コメント機能、変更履歴、権限管理で、チームでの作業効率を劇的に向上。',
            'impact': '高',
            'effort': '高'
        })
    
    return improvements

def main():
    if len(sys.argv) < 2:
        print("使用方法: python generate_suggestions.py <spec_file>")
        return
    
    try:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            spec_content = f.read()
    except FileNotFoundError:
        print(f"ファイルが見つかりません: {sys.argv[1]}")
        return
    except Exception as e:
        print(f"ファイル読み込みエラー: {e}")
        return
    
    improvements = analyze_spec_and_suggest_improvements(spec_content)
    
    print("💡 Claude Code からの改善提案")
    print("=" * 50)
    print()
    
    for i, improvement in enumerate(improvements, 1):
        print(f"{i}. {improvement['category']}")
        print(f"   📋 {improvement['title']}")
        print(f"   📝 {improvement['description']}")
        print(f"   📈 インパクト: {improvement['impact']} | 工数: {improvement['effort']}")
        print()
    
    print("🎯 推奨実装順序:")
    print("1. 高インパクト・低工数 → 2. 高インパクト・中工数 → 3. その他")
    print()
    print("💭 これらの提案は、ユーザーの喜びを最大化し、")
    print("   史上最強のシステムを作るための追加機能です。")

if __name__ == "__main__":
    main()
EOF

# Python改善提案スクリプトを実行
if command -v python3 >/dev/null 2>&1; then
    python3 "$SUGGESTION_SCRIPT" "$SPEC_FILE"
elif command -v python >/dev/null 2>&1; then
    python "$SUGGESTION_SCRIPT" "$SPEC_FILE"
else
    # Pythonが利用できない場合のフォールバック
    echo "💡 Claude Code からの改善提案"
    echo "=" * 50
    echo ""
    echo "1. 🎯 ユーザーエクスペリエンス"
    echo "   📋 リアルタイムフィードバック機能"
    echo "   📝 ユーザーの操作に対して即座に視覚的フィードバックを提供"
    echo "   📈 インパクト: 高 | 工数: 中"
    echo ""
    echo "2. ⚡ パフォーマンス"
    echo "   📋 プリロード・キャッシュ最適化"
    echo "   📝 ユーザーの行動を予測して必要なデータを事前読み込み"
    echo "   📈 インパクト: 高 | 工数: 中"
    echo ""
    echo "3. ♿ アクセシビリティ"
    echo "   📋 全方位アクセシビリティ対応"
    echo "   📝 すべてのユーザーが快適に利用可能な機能"
    echo "   📈 インパクト: 高 | 工数: 中"
    echo ""
    echo "🎯 これらの提案は、ユーザーの喜びを最大化するための追加機能です。"
fi

# 改善提案をファイルに保存
SUGGESTION_FILE="specifications/improvement_suggestions_$(date '+%Y%m%d_%H%M%S').md"
echo "# 🤖 Claude Code 改善提案" > "$SUGGESTION_FILE"
echo "" >> "$SUGGESTION_FILE"
echo "**生成日時**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$SUGGESTION_FILE"
echo "**対象仕様書**: $SPEC_FILE" >> "$SUGGESTION_FILE"
echo "" >> "$SUGGESTION_FILE"

if command -v python3 >/dev/null 2>&1; then
    python3 "$SUGGESTION_SCRIPT" "$SPEC_FILE" >> "$SUGGESTION_FILE"
elif command -v python >/dev/null 2>&1; then
    python "$SUGGESTION_SCRIPT" "$SPEC_FILE" >> "$SUGGESTION_FILE"
else
    echo "## 基本的な改善提案" >> "$SUGGESTION_FILE"
    echo "Pythonが利用できないため、基本的な提案のみを記載しています。" >> "$SUGGESTION_FILE"
fi

echo ""
echo "💾 改善提案を保存: $SUGGESTION_FILE"

# 対話式改善提案採用システム
echo ""
echo "🤔 改善提案の採用について"
echo "========================="
echo ""
echo "上記の改善提案を仕様書に追加しますか？"
echo ""
echo "1) すべて追加する"
echo "2) 選択して追加する"
echo "3) 後で検討する（保存のみ）"
echo "4) 今回はスキップ"
echo ""
echo -n "選択してください [1-4]: "
read CHOICE

case $CHOICE in
    1)
        echo ""
        echo "✅ すべての改善提案を仕様書に追加します..."
        echo "" >> "$OUTPUT_FILE"
        echo "---" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$SUGGESTION_FILE" >> "$OUTPUT_FILE"
        echo "✅ 改善提案をすべて仕様書に追加しました"
        ;;
        
    2)
        echo ""
        echo "📋 個別選択モード（実装予定）"
        echo "現在は選択機能を開発中です。"
        echo "改善提案ファイルを確認して手動で追加してください: $SUGGESTION_FILE"
        ;;
        
    3)
        echo ""
        echo "💾 改善提案を保存しました: $SUGGESTION_FILE"
        echo "後でPRESIDENTや開発チームで検討してください。"
        ;;
        
    4)
        echo ""
        echo "⏭️  改善提案をスキップしました"
        echo "必要に応じて後で $SUGGESTION_FILE を確認してください。"
        ;;
        
    *)
        echo ""
        echo "⚠️  無効な選択です。改善提案は保存されました: $SUGGESTION_FILE"
        ;;
esac

# クリーンアップ
rm -f "$SUGGESTION_SCRIPT"

# 開発ログに記録
mkdir -p development
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PROJECT_NAME] [CONVERT_SPEC] 
仕様書をMarkdown変換しました。
変換ファイル: $OUTPUT_FILE
改善提案ファイル: $SUGGESTION_FILE
Claude Codeからの改善提案機能により、ユーザビリティ向上のための追加機能を提案しました。
これらの提案により、さらにユーザーに喜ばれるシステムを構築できます。" >> development/development_log.txt

# 変換後ファイルの確認
if [ -f "$OUTPUT_FILE" ]; then
    log_info "変換後ファイルサイズ: $(wc -l < "$OUTPUT_FILE") 行"
    log_success "✅ 仕様書変換完了"
    echo ""
    echo "📋 次のステップ:"
    echo "  1. 変換された仕様書確認: cat $OUTPUT_FILE"
    echo "  2. 全エージェントに通知: ./agent-send.sh [PROJECT_NAME] [AGENT] \"仕様書が更新されました\""
else
    log_error "変換ファイルの作成に失敗しました"
    exit 1
fi