# CLAUDE.md - Garden DX プロジェクト開発ガイドライン

このファイルは、Claude Code（AIアシスタント）がGarden DXプロジェクトで作業する際の重要な指針とコンテキストを提供します。

## 🚨 ビルドエラー防止の最重要事項

**必ず `BUILD_ERROR_REFERENCE.md` を参照し、記載されているE01〜E120のエラーパターンを回避すること。**
特に以下の項目は徹底確認：
- E01: Node.jsバージョンの統一（開発環境とVercel環境）
- E02: パッケージマネージャの統一（npmのみ使用）
- E05: 環境変数ファイルの適切な管理
- E06: 大文字小文字の厳格な区別（ファイル名・ディレクトリ名）
- E13: .gitignoreの適切な設定（node_modules/, build/, .cache/など）

## 🎯 プロジェクト概要

**Garden DX** は造園業向けの統合業務管理システムです。見積作成から請求書発行まで、業務フロー全体をデジタル化します。

### 主要機能
- 見積エンジン（階層構造、PDF出力）
- プロジェクト管理（ガントチャート、進捗管理）
- 請求書システム（見積連携、PDF生成）
- RBAC認証（経営者/従業員の権限分離）

## 🛡️ 重要な禁止事項

### ⚠️ ファイル削除の禁止
**絶対にファイルを削除しないでください。** 以下の理由により、ファイル削除は厳格に禁止されています：

1. **プロジェクトの完全性**: すべてのファイルは相互に依存しており、一つでも欠けるとシステムが動作しなくなる可能性があります
2. **履歴の保持**: 開発ログ、仕様書、設定ファイルなどは将来の参照のために必要です
3. **マルチエージェント環境**: 他のAIエージェントが作成したファイルを削除すると、作業の継続性が失われます
4. **バックアップの重要性**: 誤って削除されたファイルの復旧は困難です

**代わりに以下を行ってください：**
- 不要と思われるファイルがある場合は、その旨をコメントに記載
- ファイルの移動が必要な場合は、`tmp/cleanup/`ディレクトリへの移動を提案
- ファイルの内容更新が必要な場合は、Editツールを使用

## 🏗️ プロジェクト構造

```
garden/
├── app/                    # React フロントエンド
├── backend/               # FastAPI バックエンド
├── database/              # データベース関連
├── specifications/        # 仕様書
├── development/          # 開発ログ・ルール
├── instructions/         # AIエージェント指示書
└── tmp/                  # 一時ファイル
```

## 💻 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **バックエンド**: FastAPI (Python 3.11+)
- **データベース**: PostgreSQL + Supabase
- **認証**: Supabase Auth + JWT
- **スタイリング**: Styled Components
- **状態管理**: React Context API

## 🔐 認証と権限

### 役割（ロール）
1. **経営者（親方）**
   - 全機能へのフルアクセス
   - 原価・利益情報の閲覧
   - 請求書発行権限

2. **従業員**
   - 見積作成（原価非表示）
   - プロジェクト進捗管理
   - 請求書作成不可

## 🚀 開発環境

### ローカル起動
```bash
# バックエンド
cd backend
python main.py

# フロントエンド
cd app
npm start
```

### 環境変数
- `/app/.env` - フロントエンド設定
- `/backend/.env` - バックエンド設定

## 📝 コーディング規約

### TypeScript/JavaScript
- ESLint + Prettierの設定に従う
- 型安全性を重視
- React Hooksのベストプラクティス

### Python
- PEP 8準拠
- 型ヒントの使用推奨
- FastAPIのベストプラクティス

## 🧪 テスト

```bash
# フロントエンドテスト
cd app && npm test

# バックエンドテスト
cd backend && pytest
```

## 📊 パフォーマンス目標

- ガントチャート描画: <50ms
- API応答時間: <2秒
- ダッシュボード表示: <1秒

## 🔍 デバッグ

### よくある問題
1. **CORS エラー**: 環境変数のCORS_ORIGINSを確認
2. **認証エラー**: JWTトークンの有効期限を確認
3. **DB接続エラー**: PostgreSQLの起動状態を確認

## 🤝 開発フロー

1. 機能実装前に既存コードを理解
2. 小さな変更から始める
3. テストを必ず実行
4. コミット前にlint/format実行

## 📚 参考資料

- `/specifications/project_spec.md` - 詳細仕様書
- `/development/development_rules.md` - 開発ルール
- `/app/README.md` - フロントエンド詳細
- `/LOCAL_TEST_GUIDE.md` - ローカルテストガイド

## ⚡ 重要コマンド

```bash
# 品質チェック
npm run quality

# セキュリティ監査
npm run security:check

# パフォーマンステスト
npm run perf:audit
```

## 🎯 現在の優先事項

1. **安定性**: 既存機能の動作を保証
2. **パフォーマンス**: 目標値の達成
3. **セキュリティ**: OWASP準拠の維持
4. **ドキュメント**: 変更内容の記録

---

**注意**: このファイルは定期的に更新されます。作業開始前に必ず最新版を確認してください。