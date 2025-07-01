# 🚀 ClaudeAuto ユーザーガイド

## 📌 はじめに
ClaudeAutoは、複数のAIエージェントが協調して作業を行う、史上最強の開発システムです。
ユーザー第一主義で、最高品質のシステム開発を実現します。

## 🎯 クイックスタート

### 1️⃣ 初回セットアップ
```bash
# プロジェクトを開始（自動的に進捗監視システムも起動）
./setup.sh

# プロンプトが表示されたらプロジェクト名を入力
# 例: myproject

# ✅ 進捗監視システムが自動的に起動します
# - 5分間隔で作業停滞を自動検出・対処
# - テキストボックス滞留も自動修復
```

### 2️⃣ 作業の再開（シャットダウン後）
```bash
# 作業を再開
./resume-work.sh [プロジェクト名]

# メニューから選択:
# 1) PRESIDENTに作業継続を指示（推奨）
# 2) boss1に現在の状況確認を指示
# 3) 全workerに状態確認を指示
```

### 3️⃣ 監視システムの管理
```bash
# 状況確認
./check-monitoring.sh [プロジェクト名]

# 手動で起動（通常は自動起動されます）
./start-monitoring.sh [プロジェクト名]

# 停止
./stop-monitoring.sh [プロジェクト名]

# ログ確認
tail -f tmp/progress-monitor_[プロジェクト名].log
```

### 4️⃣ tmuxセッションの確認
```bash
# セッションに接続
tmux attach -t [プロジェクト名]

# ペイン間の移動
Ctrl+b → 矢印キー
```

## 👥 エージェントの役割

### 🏛️ PRESIDENT（統括責任者）
- **場所**: tmuxセッション ペイン0
- **役割**: 
  - プロジェクト全体の統括
  - 開発ルールの管理・監査
  - UX/UI変更の最終承認
  - 仕様書の管理・配布

### 👔 boss1（チームリーダー）
- **場所**: tmuxセッション ペイン1
- **役割**:
  - worker管理と指示
  - 品質管理
  - 自動再指示システム
  - 定期的なGitHubデプロイ

### 👷 worker1-5（実行担当）
- **場所**: tmuxセッション ペイン2-6
- **役割**:
  - 具体的な作業実行
  - 仕様書準拠の開発
  - worker間連携
  - 開発ログ記録

## 📝 重要なファイル

### 開発ルール
```bash
# 必ず遵守すべきルール
cat development/development_rules.md
```

### プロジェクト仕様書
```bash
# プロジェクトの詳細仕様
cat specifications/project_spec.md

# 仕様書を編集した場合の変換
./scripts/convert_spec.sh
```

### 開発ログ
```bash
# 全ての作業履歴
cat development/development_log.txt

# リアルタイムで監視
tail -f development/development_log.txt
```

## 💬 エージェント間通信

### 基本的な送信
```bash
./agent-send.sh [プロジェクト名] [送信先] "[メッセージ]"

# 例
./agent-send.sh myproject boss1 "状況を報告してください"
./agent-send.sh myproject worker1 "テストを実行してください"
```

### 一斉送信
```bash
# 全workerに送信
for i in {1..5}; do
  ./agent-send.sh myproject worker$i "仕様書を確認してください"
done
```

## 🔄 自動システム

### 自動サイクルシステム
```bash
# バックグラウンドで実行
./boss-auto-cycle.sh [プロジェクト名] &

# 別ターミナルで実行（推奨）
./boss-auto-cycle.sh myproject
```

### 進捗監視システム（新機能）
```bash
# 5分間隔で進捗監視・自動再開
./progress-monitor.sh [プロジェクト名] &

# カスタム間隔（例：3分）
./progress-monitor.sh [プロジェクト名] 180 &
```

進捗監視システムの機能：
- **5分間隔で全エージェントの状態をチェック**
- **停滞を検出したら自動的に作業再開指示**
- **テキストボックスで止まっている場合も検出**
- **開発ログに詳細な監視記録を保存**

### 自動サイクルの停止
```bash
# プロセスを確認
ps aux | grep -E "boss-auto-cycle|progress-monitor"

# 停止
kill [プロセスID]
```

## 🛠️ トラブルシューティング

### Q: エージェントが応答しない
```bash
# 1. tmuxセッションを確認
tmux list-sessions

# 2. セッションに接続して状態確認
tmux attach -t [プロジェクト名]

# 3. 必要に応じて再開
./resume-work.sh [プロジェクト名]

# 4. 進捗監視システムを起動
./progress-monitor.sh [プロジェクト名] &
```

### Q: 仕様書が反映されない
```bash
# 仕様書を再変換・配布
./scripts/convert_spec.sh

# 全エージェントに通知
./agent-send.sh [プロジェクト名] boss1 "仕様書を確認してください"
```

### Q: 開発が停滞している
```bash
# 開発ログを確認
tail -50 development/development_log.txt

# PRESIDENTに状況確認を指示
./resume-work.sh [プロジェクト名]
# → オプション1を選択

# 進捗監視システムを起動（まだ起動していない場合）
./progress-monitor.sh [プロジェクト名] &
```

### Q: テキストボックスで止まっている
進捗監視システムが自動的に検出・修復しますが、手動で対処する場合：
```bash
# 該当エージェントのペインに移動
tmux attach -t [プロジェクト名]
# Ctrl+b → 矢印キーでペイン移動

# Enterキーを押して送信
# または Ctrl+C で中断して再入力
```

## 🎨 Claude Codeモード切り替え

### 軽微な開発（Sonnet 4）
```bash
./switch-mode.sh sonnet
```

### 深い思考が必要な開発（Opus 4）
```bash
./switch-mode.sh opus
```

### 自動切り替え（推奨）
開発タスクの複雑度に応じて自動的に切り替わります。

## 📊 プロジェクト管理

### 複数プロジェクトの管理
```bash
# プロジェクト一覧
ls .env_* | sed 's/.env_//'

# 別プロジェクトを開始
./setup.sh another_project
```

### プロジェクトの切り替え
```bash
# 環境変数を読み込み
source .env_[プロジェクト名]

# tmuxセッションに接続
tmux attach -t [プロジェクト名]
```

## 🏆 ベストプラクティス

### 1. 初回起動時の推奨手順
```bash
# 1. プロジェクト開始
./setup.sh myproject

# 2. 進捗監視システムを起動
./progress-monitor.sh myproject &

# 3. PRESIDENTに開始指示
tmux attach -t myproject
# ペイン0で: あなたはPRESIDENTです。指示書に従って
```

### 2. 定期的な状況確認
```bash
# 開発ログを定期的に確認
tail -f development/development_log.txt

# 進捗監視ログを確認
grep "PROGRESS_CHECK" development/development_log.txt | tail -20
```

### 3. 仕様書の更新
```bash
# 仕様書を編集
vim specifications/project_spec.txt

# 変換・配布
./scripts/convert_spec.sh

# 全員に通知
./resume-work.sh [プロジェクト名]
# → オプション5を選択
```

### 4. 品質管理
- 開発ルールの遵守を徹底
- UX/UI変更時はPRESIDENTの承認を得る
- 定期的なGitHubデプロイを実施
- 進捗監視システムで作業の停滞を防ぐ

## 🆘 ヘルプ・サポート

### コマンドヘルプ
```bash
# 各スクリプトのヘルプ
./setup.sh --help
./agent-send.sh --help
./resume-work.sh --help
./progress-monitor.sh --help
```

### 問題報告
開発中に問題が発生した場合は、以下の情報を含めて報告してください：
1. 開発ログの最新20行
2. エラーメッセージ
3. 実行したコマンド
4. 進捗監視ログ（該当する場合）

## 🎯 目標
- **ユーザー第一主義**での開発
- **史上最強のシステム**を作る
- **継続的な改善**と学習
- **作業の停滞を防ぐ**自動化

---
💡 **ヒント**: 
- 迷ったら `./resume-work.sh` を実行してPRESIDENTに指示を仰ぎましょう！
- 作業が停滞しがちな場合は `./progress-monitor.sh` を常時起動しておきましょう！