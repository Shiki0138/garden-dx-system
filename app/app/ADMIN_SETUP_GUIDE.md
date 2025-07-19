# 庭想システム - 管理者セットアップガイド

このガイドに従って、管理者アカウントをセットアップしてください。

## 📋 準備するもの

- Supabaseプロジェクトへのアクセス権限
- 以下の認証情報：
  - **Supabase URL**: `https://ppplfluvazaufassdkra.supabase.co`
  - **管理者Email**: `admin@teisou.com`
  - **管理者パスワード**: `Teisou2025!`

## 🔧 セットアップ手順

### ステップ 1: Supabase Dashboard で管理者ユーザーを作成

1. **Supabase Dashboard にアクセス**
   ```
   https://supabase.com/dashboard/project/ppplfluvazaufassdkra
   ```

2. **管理者ユーザーを作成**
   - 左メニューから `Authentication` → `Users` を選択
   - `Add user` → `Create new user` をクリック
   - 以下を入力：
     - Email: `admin@teisou.com`
     - Password: `Teisou2025!`
     - Auto confirm user: ✓ チェック
   - `Create user` をクリック

3. **User UID をコピー**
   - 作成したユーザーの行をクリック
   - 表示される `User UID` をコピー（後で使用）

### ステップ 2: データベースに管理者プロファイルを作成

1. **Supabase SQL Editor を開く**
   - 左メニューから `SQL Editor` を選択

2. **SQLスクリプトを準備**
   - `/database/create_admin_profile.sql` の内容をコピー
   - `YOUR_USER_ID_HERE` を先ほどコピーしたUser UIDに置き換え

3. **SQLを実行**
   - SQL Editor に貼り付けて `Run` をクリック
   - 実行結果を確認

### ステップ 3: ログインテスト

1. **本番URLにアクセス**
   ```
   https://garden-dx-system.vercel.app
   ```

2. **管理者としてログイン**
   - Email: `admin@teisou.com`
   - Password: `Teisou2025!`

3. **動作確認**
   - ログイン成功後、ダッシュボードが表示されることを確認
   - 見積作成、顧客管理などの機能にアクセスできることを確認

## 🚨 トラブルシューティング

### ログインできない場合

1. **ユーザーが作成されているか確認**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'admin@teisou.com';
   ```

2. **プロファイルが作成されているか確認**
   ```sql
   SELECT * FROM user_profiles WHERE email = 'admin@teisou.com';
   ```

3. **会社データが存在するか確認**
   ```sql
   SELECT * FROM companies WHERE id = '550e8400-e29b-41d4-a716-446655440000';
   ```

### エラーメッセージ別対処法

- **「Supabaseが設定されていません」**
  → 環境変数が正しく設定されているか確認

- **「Invalid login credentials」**
  → パスワードが正しいか、ユーザーがconfirmedされているか確認

- **白い画面が表示される**
  → ブラウザのコンソールでエラーを確認

## 📝 管理者ができること

- ✅ 見積書の作成・編集・削除
- ✅ 請求書の発行
- ✅ 顧客情報の管理
- ✅ 単価マスタの設定
- ✅ プロジェクト管理
- ✅ ユーザー管理（他のユーザーの追加）
- ✅ 会社設定の変更

## 🔐 セキュリティ注意事項

1. 本番環境では必ずHTTPSを使用
2. パスワードは定期的に変更
3. 不要なユーザーアクセスは削除
4. ログイン試行の監視を行う

## 📞 サポート

問題が解決しない場合は、以下を確認してください：
- Supabase Dashboard のログ
- ブラウザのコンソールエラー
- `/database/create_admin_profile.sql` の実行結果

---

セットアップ完了後は、このファイルを安全な場所に保管し、認証情報の管理に注意してください。