# 🚨 デプロイエラー防止開発ルール

## 重要：全開発者必読
本番環境へのデプロイ時に発生するエラーを防ぐため、以下のルールを徹底してください。

## 主要なエラー原因と対策

### 1. 環境変数の設定ミス
**原因**: SupabaseのIPv6移行（2024年1月）により、Vercelでの接続設定が変更されました。

**必須対応**:
- `POSTGRES_URL`: Supavisor URLを使用
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: 正しく設定
- `NEXT_PUBLIC_`プレフィックス: クライアント側で使用する変数に付与

### 2. CORS設定
**必須対応**:
- SupabaseダッシュボードでVercelドメイン（`*.vercel.app`）を許可
- 認証リダイレクトURIにもVercelドメインを追加

### 3. ビルドエラー対策
**必須対応**:
- デプロイ前に必ず`npm run build`でローカルビルドを確認
- TypeScriptエラー、ESLintエラーを完全に解消
- `CI=false`をビルドコマンドに追加（警告を無視）

### 4. データベース接続
**必須対応**:
- RLS（Row Level Security）ポリシーを適切に設定
- Supabase Edgeファンクションのタイムアウト設定
- 接続プーリングの設定を確認

## 開発時のチェックリスト

### コード実装時
- [ ] 環境変数を使用する際は、必ず存在チェックを実装
- [ ] エラーハンドリングを適切に実装
- [ ] 非同期処理には必ずtry-catchを使用
- [ ] APIコールには適切なタイムアウトを設定

### コミット前
- [ ] `npm run lint`でESLintエラーがないことを確認
- [ ] `npm run typecheck`でTypeScriptエラーがないことを確認
- [ ] `npm run build`でビルドが成功することを確認
- [ ] 環境変数の使用箇所を再確認

### デプロイ前
- [ ] Vercelの環境変数が正しく設定されているか確認
- [ ] SupabaseのCORS設定を確認
- [ ] データベースマイグレーションが完了しているか確認
- [ ] プレビューデプロイでテスト

## エラー防止のベストプラクティス

### 1. 環境変数の管理
```javascript
// 良い例：環境変数の存在チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
```

### 2. エラーハンドリング
```javascript
// 良い例：適切なエラーハンドリング
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
  
  if (error) {
    console.error('Supabase error:', error);
    // ユーザーフレンドリーなエラーメッセージを表示
    return { error: 'データの取得に失敗しました' };
  }
  
  return { data };
} catch (err) {
  console.error('Unexpected error:', err);
  return { error: 'システムエラーが発生しました' };
}
```

### 3. CORS対応
```javascript
// APIルートでのCORS設定例
export async function GET(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // ... 処理
  
  return new Response(JSON.stringify(data), { headers });
}
```

## 重要な注意事項

1. **開発環境と本番環境の差異を常に意識する**
   - ローカルで動作しても本番で動作しない可能性がある
   - 環境固有の設定は環境変数で管理

2. **デプロイ後の動作確認を徹底**
   - デプロイ直後に基本機能をテスト
   - エラーログを確認
   - パフォーマンスをモニタリング

3. **段階的なデプロイ**
   - 大きな変更は小さく分割してデプロイ
   - プレビューデプロイで確認してから本番へ

## チーム全体への指示

### Boss1への指示
- チーム全体にこのルールを徹底させる
- 各Workerの作業をレビューし、ルール遵守を確認
- デプロイ前に必ずチェックリストを確認

### Worker1-5への指示
- コード実装時は必ずエラーハンドリングを実装
- 環境変数使用時は存在チェックを必須とする
- デプロイ前チェックリストを必ず実行

### PRESIDENTへの報告
- エラー防止策の実施状況を定期的に報告
- 本番デプロイ前に最終確認を実施

---

**このルールは全開発者が遵守すること。エラーゼロのデプロイを目指す。**