# 🚨 ビルドエラー対策ガイド - Garden DX システム

## 📋 概要
このガイドは GitHub Actions でのビルド失敗（Exit Code 1）の原因と対策をまとめています。

## ⚠️ 主要なエラー原因と対策

### 1. **テスト失敗による Exit Code 1** （最重要）

#### **原因**
- `useAuth must be used within an AuthProvider` エラー
- テストでコンポーネントを適切なProvider でラップしていない
- 11/11のテストが全て失敗

#### **対策**
```javascript
// ❌ 問題のあるテスト
render(<InvoiceList />);

// ✅ 修正版
render(
  <AuthProvider>
    <InvoiceList />
  </AuthProvider>
);
```

#### **具体的な修正手順**
1. `src/components/invoices/__tests__/InvoiceList.test.js` を修正
2. MockAuthProvider を作成・使用
3. 各テストケースでProvider を適用

### 2. **ESLint 警告の厳格化**

#### **原因**
- CI環境で ESLint 警告がエラーとして扱われる
- 365件の警告が存在

#### **対策**
```json
// package.json のスクリプト修正
{
  "scripts": {
    "lint:ci": "eslint src --ext .js,.jsx,.ts,.tsx --max-warnings 0",
    "lint:dev": "eslint src --ext .js,.jsx,.ts,.tsx"
  }
}
```

### 3. **Node.js バージョン不整合**

#### **原因**
- package.json: Node 20.x
- GitHub Actions: Node 18.x

#### **対策**
```yaml
# .github/workflows/deploy.yml
- uses: actions/setup-node@v3
  with:
    node-version: '20.x'  # package.json と一致させる
```

### 4. **TypeScript コンパイルエラー**

#### **原因**
- rbacOptimizer.js で React import エラー
- securityOptimizer.js で関数未定義エラー

#### **対策**
```javascript
// ✅ 修正済み: 適切なReact import
import React from 'react';

// ✅ 修正済み: 関数エクスポートの修正
const securityOptimizer = {
  fastHash,
  validatePasswordFast,
  // ...
};
```

## 🔧 予防策の実装

### 1. **テスト環境の標準化**

#### **テストユーティリティの作成**
```javascript
// src/test-utils.js
import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './contexts/SupabaseAuthContext';

const AllTheProviders = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 2. **CI/CD パイプラインの改善**

#### **GitHub Actions ワークフロー最適化**
```yaml
name: Build and Deploy
on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint:check
      
      - name: Run type checking
        run: npm run typecheck
      
      - name: Run tests
        run: npm test -- --coverage --watchAll=false
        env:
          CI: true
      
      - name: Build production
        run: npm run build
        env:
          CI: false
          GENERATE_SOURCEMAP: false
```

### 3. **品質チェックの自動化**

#### **Pre-commit フック設定**
```json
// package.json
{
  "scripts": {
    "pre-commit": "npm run quality && npm test -- --watchAll=false",
    "quality": "npm run format && npm run lint && npm run typecheck"
  }
}
```

## 📊 エラー監視とアラート

### **ビルド失敗の早期検出**
1. GitHub Actions の通知設定
2. Slack/Discord 連携
3. ビルドステータスバッジの設置

### **ログ分析のポイント**
- テスト失敗の詳細ログ確認
- ESLint エラーの特定
- TypeScript コンパイルエラーの追跡
- 依存関係の競合チェック

## 🚀 ベストプラクティス

### **1. 開発時の確認事項**
- [ ] ローカルで `npm run quality` が成功する
- [ ] 全テストが通る (`npm test`)
- [ ] ビルドが成功する (`npm run build`)
- [ ] TypeScript エラーがない (`npm run typecheck`)

### **2. プルリクエスト時の確認**
- [ ] CI チェックが全て緑
- [ ] テストカバレッジが低下していない
- [ ] 新しい ESLint 警告を追加していない

### **3. デプロイ前の最終確認**
- [ ] 本番ビルドが成功する
- [ ] 環境変数が正しく設定されている
- [ ] セキュリティ監査をパスしている

## 📝 トラブルシューティング

### **Exit Code 1 が発生した場合の調査手順**

1. **GitHub Actions ログの確認**
   ```bash
   # 失敗したステップを特定
   - Step: Run tests ❌
   - Exit code: 1
   ```

2. **ローカル環境での再現**
   ```bash
   npm ci
   npm run lint:check
   npm run typecheck  
   npm test -- --watchAll=false
   npm run build
   ```

3. **エラーの分類**
   - テスト失敗 → テストコードの修正
   - Lint エラー → コードの修正
   - Type エラー → 型定義の修正
   - ビルドエラー → 設定の確認

## 🔄 継続的な改善

### **月次レビュー項目**
- [ ] 依存関係の更新とセキュリティ監査
- [ ] ESLint ルールの見直し
- [ ] テストカバレッジの改善
- [ ] CI/CD パフォーマンスの最適化

---

**作成日**: 2025-07-05  
**最終更新**: 2025-07-05  
**作成者**: Claude Code Assistant  

**📞 サポート**: このガイドで解決しない問題は、開発チームまでお問い合わせください。