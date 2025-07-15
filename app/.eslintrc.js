module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    'react-app',
    'react-app/jest',
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  rules: {
    // React関連（React 18対応）
    'react/jsx-uses-react': 'off', // React 18では不要
    'react/react-in-jsx-scope': 'off', // React 18では不要
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/no-unused-state': 'warn',
    'react/prefer-stateless-function': 'off', // Hooks推奨のためoff
    'react/jsx-pascal-case': 'error',
    
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // コード品質（Garden DX仕様に合わせた緩和）
    'no-unused-vars': 'off', // 開発効率を重視し、未使用変数チェックを無効化
    'no-console': 'off', // 業務システムではログ出力を許可
    'no-debugger': 'warn', // 開発中はwarnに緩和
    'no-alert': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // 潜在的バグ防止（必要最小限）
    'array-callback-return': 'warn', // エラーから警告に緩和
    'no-duplicate-imports': 'error',
    'no-self-compare': 'warn',
    'no-template-curly-in-string': 'warn',
    'no-unmodified-loop-condition': 'warn',
    'no-unreachable-loop': 'warn',
    
    // ベストプラクティス（業務システム向け調整）
    'curly': 'off', // 単行ifも許可
    'default-case': 'off', // switch文のdefault必須を緩和
    'dot-notation': 'warn',
    'eqeqeq': ['warn', 'smart'], // 一部==使用を許可
    'no-floating-decimal': 'warn',
    'no-implicit-coercion': 'off', // 型変換許可
    'no-multi-spaces': 'off', // 整列のための複数スペース許可
    'no-redeclare': 'error',
    'no-return-assign': 'warn',
    'no-return-await': 'warn',
    'no-sequences': 'warn',
    'prefer-promise-reject-errors': 'warn',
    'radix': 'warn',
    'yoda': 'off', // 条件式の書き方を自由に
    
    // スタイル（開発効率重視）
    'prefer-template': 'off', // 文字列結合方法を自由に
    'object-shorthand': 'off', // オブジェクト省略記法を強制しない
    'arrow-spacing': 'warn',
    'no-multi-assign': 'warn',
    
    // セキュリティ関連（必須）
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // import/export関連
    'import/no-anonymous-default-export': 'off', // 匿名エクスポート許可
    'import/no-unresolved': 'off', // パス解決エラーを無視
    
    // JSX関連の緩和
    'jsx-a11y/anchor-is-valid': 'off', // Next.js Link対応
    'jsx-a11y/alt-text': 'warn', // 画像alt必須を警告に
    'jsx-a11y/click-events-have-key-events': 'off', // クリックイベント要件緩和
    'jsx-a11y/no-static-element-interactions': 'off', // 静的要素クリック許可
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};