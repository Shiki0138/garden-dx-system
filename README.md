# 🚀 ClaudeAuto - 完全自動システム開発AI

[![GitHub](https://img.shields.io/badge/GitHub-ClaudeAuto-blue?logo=github)](https://github.com/Shiki0138/ClaudeAuto)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-4.0-blue.svg)](CHANGELOG.md)

**PRESIDENT統括** | **自然言語指示** | **30分自動継続** | **エラー自動修正**

---

## 🎯 システム概要

ClaudeAutoは、PRESIDENTの統括の下、複数のAIエージェントが協調して**完全自動でシステム開発を行う**革新的なプラットフォームです。すべての指示は日本語の自然言語で行え、30分ごとの自動継続実行により24時間365日開発が進行します。

### ✨ 主な特徴

- 👑 **PRESIDENT中心指揮**: すべての指示はPRESIDENTから発信（一元管理）
- 💬 **自然言語指示**: 日本語で「プロジェクトを開始してください」等の直感的な指示
- 🏗️ **3層分離アーキテクチャ**: PRESIDENT、Team（Boss/Workers）、Error Fixの独立ウィンドウ
- 🔄 **30分自動継続**: 作業停滞を防ぐ自動タスク配布システム
- 🛠️ **エラー自動修正**: Claude主導のError Fixチーム（Gemini/Codex協力）
- 📊 **完全ログ管理**: すべての作業・指示・報告を記録

---

## 🚀 クイックスタート

### 📋 前提条件
- macOS または Linux
- tmux がインストール済み
- Claude Code がインストール済み

### 1️⃣ セットアップ（1分で完了）
```bash
# リポジトリをクローン
git clone https://github.com/Shiki0138/ClaudeAuto.git
cd ClaudeAuto

# セットアップ実行（プロジェクト名入力）
./setup.sh
```

### 2️⃣ システム起動（3ステップ）

```bash
# Step 1: PRESIDENT起動（統括者）
./start-president.sh myproject

# Step 2: Team起動（新しいタブで実行）
./start-team.sh myproject

# Step 3: 自動継続実行開始
./auto-continue.sh myproject start
```

### 3️⃣ 基本的な使い方

#### PRESIDENTから指示を出す
```bash
# プロジェクト開始
./president-command.sh myproject "プロジェクトを開始してください"

# 進捗確認
./president-command.sh myproject "進捗を確認してください"

# エラー対応（Error Fixチームが自動起動）
./president-command.sh myproject "エラー修正：ビルドエラーが発生"
```

---

## 🏗️ システム構成図

```
┌─────────────────┐
│   PRESIDENT     │ 👑 統括・品質管理・すべての指示元
└────────┬────────┘
         │ 指示
         ↓
┌─────────────────────────────────────────────────┐
│                 Team Window                      │
│ ┌─────────┬─────────┬─────────┬─────────┬─────┐│
│ │  Boss1  │Worker1  │Worker2  │Worker3  │ ... ││
│ │ 🎯管理  │👷実装   │👷実装   │👷実装   │     ││
│ └─────────┴─────────┴─────────┴─────────┴─────┘│
└────────┬────────────────────────────────────────┘
         │ エラー発生時
         ↓
┌─────────────────────────────────────────────────┐
│              Error Fix Window                    │
│ ┌─────────┬─────────┬─────────┐               │
│ │  Codex  │ Gemini  │ Claude  │               │
│ │⚡コード │🌟CI/CD  │🔧統括   │               │
│ └─────────┴─────────┴─────────┘               │
└─────────────────────────────────────────────────┘
```

---

## 📋 指示フロー

### 通常の開発フロー
```
PRESIDENT → Boss1 → Worker1-5 → Boss1 → PRESIDENT
   指示      分配     実行      報告    完了報告
```

### エラー対応フロー
```
PRESIDENT → Claude(リーダー) → Gemini/Codex → Claude → PRESIDENT
   指示      分析指示         分析実行      統合    完了報告
```

---

## 🔑 自然言語キーフレーズ

| カテゴリ | キーフレーズ | 動作 |
|---------|------------|------|
| 開発管理 | 開始、スタート | プロジェクト開始 |
| | 進捗、状況、確認 | 進捗確認 |
| | 品質、チェック、レビュー | 品質チェック |
| | デプロイ、リリース | デプロイ準備 |
| エラー対応 | エラー、修正、バグ | Error Fixチーム起動 |
| | 緊急、至急 | 高優先度対応 |

---

## 🎮 基本コマンド

### システム管理
```bash
# 状態確認
./team-status.sh myproject

# セッション接続
./team-status.sh myproject connect-president
./team-status.sh myproject connect-team
./team-status.sh myproject connect-errorfix

# 自動継続管理
./auto-continue.sh myproject status
./auto-continue.sh myproject stop
```

### トラブルシューティング
```bash
# セッション確認
tmux ls

# プロセス確認
ps aux | grep auto_continue

# ログ確認
tail -f development/development_log.txt
```

---

## 📁 主要ファイル

| ファイル | 説明 |
|---------|------|
| `start-president.sh` | PRESIDENT起動 |
| `start-team.sh` | Boss/Workers起動 |
| `start-errorfix.sh` | Error Fix起動 |
| `president-command.sh` | 自然言語指示システム |
| `auto-continue.sh` | 30分自動継続 |
| `team-status.sh` | 状態確認・接続 |

---

## 🚨 注意事項

- **各ウィンドウは独立して動作**します
- **30分間隔の自動実行**により、作業が停滞しません
- **エラーが発生した場合**は自動的にError Fixチームが対応します
- **PRESIDENTの承認なしに**大きな変更は行われません

---

## 📊 成果と効果

- **手動作業95%削減**: ほぼ完全自動化を実現
- **24時間365日稼働**: 作業の中断なし
- **エラー解決時間90%短縮**: 自動検出・修正
- **品質スコア35%向上**: 多層チェック体制

---

## 🌟 今すぐ体験

```bash
git clone https://github.com/Shiki0138/ClaudeAuto.git
cd ClaudeAuto
./setup.sh

# 史上最強の自動開発システムを体験してください！
```

**Welcome to the Future of Autonomous Development! 🚀**