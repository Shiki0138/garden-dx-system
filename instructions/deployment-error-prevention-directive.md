# 🚨 デプロイエラー防止指示書

## 全エージェント必読・実行事項

### PRESIDENTへ
- チーム全体にデプロイエラー防止ルールを徹底させる
- 定期的にエラー防止策の実施状況を確認
- 本番デプロイ前に最終チェックリストを確認

### Boss1へ
- 各Workerの作業に対してエラー防止策が実施されているか確認
- コードレビュー時に以下を必ずチェック：
  - 環境変数の存在チェックが実装されているか
  - エラーハンドリングが適切か
  - ビルドエラーがないか
- デプロイ前チェックリストの実行を管理

### Worker1-5へ
- 全ての開発作業で以下を徹底：
  1. 環境変数使用時は必ず存在チェックを実装
  2. 非同期処理には必ずtry-catchを使用
  3. APIコールには適切なタイムアウトを設定
  4. コミット前に`npm run build`でビルドを確認
  5. ESLint/TypeScriptエラーを完全に解消

## 実装例

### 環境変数チェック（必須実装）
```javascript
// Supabase初期化前に必ずチェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

### エラーハンドリング（必須実装）
```javascript
// データベース操作は必ずtry-catchで包む
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
  
  if (error) {
    console.error('Supabase error:', error);
    return { error: 'データの取得に失敗しました' };
  }
  
  return { data };
} catch (err) {
  console.error('Unexpected error:', err);
  return { error: 'システムエラーが発生しました' };
}
```

## チェックリスト（デプロイ前必須）

- [ ] 環境変数の存在チェックを全箇所で実装
- [ ] `npm run build`が成功する
- [ ] `npm run lint`でエラーなし
- [ ] `npm run typecheck`でエラーなし
- [ ] Vercelの環境変数が正しく設定されている
- [ ] SupabaseのCORS設定が完了している
- [ ] エラーハンドリングが全ての非同期処理に実装されている

## 重要
**本番環境でのエラーは顧客体験を著しく損なう。**
**エラーゼロのデプロイを全員で実現する。**

---
発行日: 2025-07-02
発行者: PRESIDENT