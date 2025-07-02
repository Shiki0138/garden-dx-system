# 🚀 Garden DX Supabase デプロイメントチェックリスト

## 📋 本番エラーゼロを実現するための最終確認

### ✅ 1. Supabase Row Level Security (RLS) 設定確認

- [ ] **RLS有効化確認**
  ```sql
  -- 全テーブルでRLSが有効になっていることを確認
  SELECT schemaname, tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' AND rowsecurity = true;
  ```

- [ ] **RLSポリシー動作確認**
  ```sql
  -- 各テーブルのポリシーが正しく設定されていることを確認
  SELECT tablename, policyname, permissive, roles, cmd, qual 
  FROM pg_policies 
  WHERE schemaname = 'public';
  ```

- [ ] **会社データ分離テスト**
  - 異なる会社のユーザーでログインして、他社データが見えないことを確認
  - 各CRUDオペレーションが適切に制限されることを確認

### ✅ 2. 認証・認可システム確認

- [ ] **認証フロー動作確認**
  - [ ] ユーザー登録が正常に動作する
  - [ ] ログインが正常に動作する
  - [ ] ログアウトが正常に動作する
  - [ ] セッション管理が適切に機能する

- [ ] **権限分離確認**
  - [ ] オーナー権限：全機能アクセス可能
  - [ ] マネージャー権限：管理機能アクセス可能、ユーザー管理制限
  - [ ]従業員権限：読み書き権限制限
  - [ ] ビューアー権限：読み取りのみ

- [ ] **エラーハンドリング確認**
  - [ ] 認証エラー時に適切なメッセージ表示
  - [ ] 権限不足時に適切なエラー処理
  - [ ] セッション期限切れ時の適切な処理

### ✅ 3. 環境変数・設定確認

- [ ] **必須環境変数設定**
  ```bash
  # Vercel環境変数
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

- [ ] **CORS設定確認**
  - [ ] Supabaseダッシュボード > Settings > API
  - [ ] Site URL: `https://your-app.vercel.app`
  - [ ] Additional redirect URLs: `https://your-app-*.vercel.app/*`

- [ ] **セキュリティ設定確認**
  - [ ] JWT設定が適切
  - [ ] SMTP設定（メール認証用）
  - [ ] ストレージ設定

### ✅ 4. データベーススキーマ確認

- [ ] **テーブル構造確認**
  ```sql
  -- 主要テーブルの存在確認
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
  ```

- [ ] **インデックス設定確認**
  ```sql
  -- パフォーマンス用インデックスの確認
  SELECT indexname, tablename, indexdef 
  FROM pg_indexes 
  WHERE schemaname = 'public';
  ```

- [ ] **制約確認**
  ```sql
  -- 外部キー制約とチェック制約の確認
  SELECT constraint_name, table_name, constraint_type 
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public';
  ```

### ✅ 5. セキュリティテスト実行

- [ ] **OWASP Top 10 テスト**
  ```typescript
  import { runSecurityAudit } from './security_tests'
  
  // セキュリティテスト実行
  const report = await runSecurityAudit()
  console.log('Security Test Results:', report)
  
  // CRITICAL/HIGHの問題がないことを確認
  if (report.criticalIssues > 0 || report.highIssues > 0) {
    throw new Error('Critical security issues found!')
  }
  ```

- [ ] **権限テスト**
  - [ ] 未認証ユーザーのアクセス制限
  - [ ] 権限昇格攻撃の防止
  - [ ] 水平アクセス制御の確認

- [ ] **入力値検証テスト**
  - [ ] SQLインジェクション防止
  - [ ] XSS攻撃防止
  - [ ] 不正なファイルアップロード防止

### ✅ 6. パフォーマンステスト

- [ ] **レスポンス時間確認**
  - [ ] 初回ロード: < 3秒
  - [ ] ページ遷移: < 1秒
  - [ ] API応答: < 500ms

- [ ] **データベースクエリ最適化**
  ```sql
  -- スロークエリの確認
  SELECT query, mean_exec_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;
  ```

- [ ] **リアルタイム機能確認**
  - [ ] データ更新の即座反映
  - [ ] 複数ユーザー同時アクセステスト

### ✅ 7. エラーハンドリング確認

- [ ] **Try-Catch実装確認**
  ```typescript
  // 全ての非同期処理でエラーハンドリング実装済み
  try {
    const result = await supabase.from('table').select('*')
    if (result.error) {
      // Supabaseエラーの適切な処理
      return handleSupabaseError(result.error)
    }
    return result.data
  } catch (error) {
    // 予期しないエラーの処理
    return handleUnexpectedError(error)
  }
  ```

- [ ] **ユーザーフレンドリーなエラーメッセージ**
  - [ ] 技術的詳細を隠蔽
  - [ ] 適切な日本語メッセージ
  - [ ] 復旧方法の提示

### ✅ 8. ビルド・デプロイ確認

- [ ] **ローカルビルド確認**
  ```bash
  npm run build
  # エラーなしでビルド完了することを確認
  ```

- [ ] **TypeScript型チェック**
  ```bash
  npm run type-check
  # 型エラーがないことを確認
  ```

- [ ] **ESLint確認**
  ```bash
  npm run lint
  # リントエラーがないことを確認
  ```

- [ ] **プレビューデプロイテスト**
  - [ ] Vercelプレビューデプロイで動作確認
  - [ ] 本番環境設定での動作確認

### ✅ 9. 監視・ログ設定

- [ ] **セキュリティログ確認**
  ```sql
  -- セキュリティイベントの記録確認
  SELECT event_type, severity, count(*) 
  FROM security_events 
  GROUP BY event_type, severity;
  ```

- [ ] **エラーログ設定**
  - [ ] Vercelダッシュボードでの確認
  - [ ] Supabaseダッシュボードでの確認

### ✅ 10. 最終動作確認

- [ ] **主要機能テスト**
  - [ ] ユーザー登録・ログイン
  - [ ] 会社作成・設定
  - [ ] 顧客管理
  - [ ] 見積書作成・編集
  - [ ] 請求書作成・編集
  - [ ] PDF出力

- [ ] **権限別動作確認**
  - [ ] オーナーとして全機能動作
  - [ ] マネージャーとして制限確認
  - [ ] 従業員として制限確認
  - [ ] ビューアーとして制限確認

### ✅ 11. セキュリティ最終チェック

- [ ] **HTTPS強制確認**
  ```typescript
  // 本番環境でHTTPS強制
  if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`)
  }
  ```

- [ ] **セキュリティヘッダー確認**
  ```bash
  # セキュリティヘッダーの確認
  curl -I https://your-app.vercel.app
  # X-Frame-Options, X-Content-Type-Options等の確認
  ```

## 🚨 デプロイ前必須チェック

### Critical Issues (デプロイ停止)
- [ ] セキュリティテストでCRITICAL問題なし
- [ ] 認証システム完全動作
- [ ] RLSポリシー適切設定
- [ ] 環境変数正しく設定

### High Priority Issues (修正推奨)
- [ ] エラーハンドリング完全実装
- [ ] パフォーマンス要件達成
- [ ] CORS設定適切
- [ ] 全機能動作確認

## 📞 緊急時連絡先

- **開発チーム**: development@garden-dx.com
- **Supabaseサポート**: support@supabase.com
- **Vercelサポート**: support@vercel.com

## 🎯 デプロイ後監視項目

- [ ] エラー率 < 1%
- [ ] レスポンス時間 < 500ms
- [ ] セキュリティイベント監視
- [ ] パフォーマンス監視

---

**✅ 全項目完了後、本番デプロイ実行**
**🔄 デプロイ後24時間監視継続**