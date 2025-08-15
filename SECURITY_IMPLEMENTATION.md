# セキュリティ実装ガイド

## 概要
Garden DXプロジェクトのセキュリティ強化実装の詳細です。

## 実装済みセキュリティ機能

### 1. 認証システムの強化

#### AdminLogin.jsx
- **セキュアな認証フック**: `useSecureAuth`を使用した暗号化されたセッション管理
- **CSRF保護**: トークンベースのCSRF攻撃対策
- **入力検証**: メールアドレスの形式検証とサニタイゼーション
- **パスワード保護**: bcrypt風のハッシュ化とソルト付き保存
- **環境変数管理**: ハードコードされた認証情報の削除

#### EmployeeLogin.jsx
- **同様のセキュリティ機能**: 管理者ログインと同等のセキュリティレベル
- **開発環境の分離**: プレフィックスベースの開発用認証

### 2. データ保護

#### 暗号化 (crypto.js)
- **AES-GCM暗号化**: Web Crypto APIを使用した強力な暗号化
- **PBKDF2キー導出**: 100,000回のイテレーションによる強力なキー生成
- **セキュアストレージ**: LocalStorage保存時の自動暗号化

### 3. API通信のセキュリティ

#### APIクライアント (apiClient.js)
- **認証トークン管理**: Bearer tokenの自動付与
- **CSRFトークン**: すべてのリクエストにCSRFトークンを付与
- **トークンリフレッシュ**: 期限切れトークンの自動更新
- **エラーハンドリング**: セキュリティエラーの適切な処理

### 4. セッション管理

#### useSecureAuth.js
- **セッションタイムアウト**: デフォルト30分（環境変数で設定可能）
- **アクティビティ監視**: ユーザーアクティビティによるセッション延長
- **自動ログアウト**: セッション期限切れ時の自動ログアウト
- **暗号化されたセッション**: すべてのセッションデータを暗号化

### 5. ファイルアップロードセキュリティ

#### EmployeeProjectDashboard.jsx
- **ファイルタイプ検証**: MIMEタイプと拡張子の二重チェック
- **ファイルサイズ制限**: 環境変数による制限（デフォルト5MB）
- **アップロード枚数制限**: 最大アップロード数の制限

### 6. セキュリティヘッダー

#### securityHeaders.js
- **X-Content-Type-Options**: MIMEタイプスニッフィング防止
- **X-Frame-Options**: クリックジャッキング防止
- **Content-Security-Policy**: XSS攻撃防止
- **Strict-Transport-Security**: HTTPS強制
- **CORS設定**: 適切なオリジン制御

## 環境変数設定

`.env`ファイルに以下の設定を追加してください：

```env
# セキュリティ設定
REACT_APP_ENCRYPTION_KEY=your-32-character-or-longer-encryption-key
REACT_APP_SESSION_TIMEOUT=1800000  # 30分
REACT_APP_CSRF_TOKEN_LENGTH=32
REACT_APP_ALLOWED_ORIGINS=https://your-domain.com

# 開発環境認証（本番では削除）
REACT_APP_DEV_ADMIN_EMAIL=admin@dev.local
REACT_APP_DEV_ADMIN_PASSWORD_HASH=your-hashed-password
REACT_APP_DEV_EMPLOYEE_PREFIX=DEV-EMP

# ファイルアップロード
REACT_APP_MAX_FILE_SIZE=5242880  # 5MB
REACT_APP_MAX_PHOTOS=5
REACT_APP_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

## パスワードハッシュの生成方法

開発環境用のパスワードハッシュを生成する場合：

```bash
node -e "
const crypto = require('./src/utils/crypto');
crypto.hashPassword('your-password').then(hash => {
  console.log('Hashed password:', hash);
});
"
```

## セキュリティベストプラクティス

1. **本番環境では開発用認証を無効化**
   - `REACT_APP_DEV_*`環境変数を削除

2. **強力な暗号化キーを使用**
   - 最低32文字以上のランダムな文字列

3. **HTTPS必須**
   - すべての通信をHTTPS経由で行う

4. **定期的なセキュリティ監査**
   - `npm audit`の定期実行
   - 依存関係の更新

5. **CSPの強化**
   - 本番環境では`unsafe-inline`と`unsafe-eval`を削除

## 今後の推奨事項

1. **二要素認証（2FA）の実装**
2. **レート制限の実装**
3. **IPアドレスベースのアクセス制御**
4. **セキュリティログの強化**
5. **定期的なペネトレーションテスト**