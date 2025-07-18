# 管理者ユーザー作成手順 - ステップ1

## Supabase Dashboard での管理者ユーザー作成

### 1. Supabase Dashboard にアクセス
以下のURLからSupabase Dashboardにアクセスしてください：
https://supabase.com/dashboard/project/ppplfluvazaufassdkra

### 2. 管理者ユーザーを作成

1. 左側メニューから **Authentication** をクリック
2. **Users** タブを選択
3. **Add user** → **Create new user** をクリック
4. 以下の情報を入力：
   - **Email**: `admin@teisou.com`
   - **Password**: `Teisou2025!`
   - **Auto confirm user**: ✓ チェックを入れる
5. **Create user** をクリック

### 3. ユーザーIDをコピー
作成されたユーザーの行をクリックして、表示される **User UID** をコピーしてください。
このIDは次のステップで使用します。

例: `123e4567-e89b-12d3-a456-426614174000`

### 重要な情報
- **Supabase URL**: https://ppplfluvazaufassdkra.supabase.co
- **プロジェクトRef**: ppplfluvazaufassdkra
- **管理者Email**: admin@teisou.com
- **管理者パスワード**: Teisou2025!

ユーザー作成が完了したら、コピーしたUser UIDを教えてください。
次のステップでデータベースに管理者プロファイルを設定します。