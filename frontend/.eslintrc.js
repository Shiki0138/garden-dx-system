/**
 * Garden Project Management System - ESLint Configuration
 * 企業級コード品質管理設定
 * 
 * Created by: worker2 (Code Quality Phase)
 * Date: 2025-06-30
 */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:security/recommended',
    'prettier', // Must be last to override other configs
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
    'jsx-a11y',
    'security',
    'prefer-arrow',
    'unused-imports',
  ],
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // ========================================
    // TypeScript Rules - 型安全性強化
    // ========================================
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false,
    }],
    '@typescript-eslint/consistent-type-exports': 'error',

    // ========================================
    // React Rules - React最適化
    // ========================================
    'react/react-in-jsx-scope': 'off', // React 17+
    'react/prop-types': 'off', // TypeScriptで型チェック
    'react/display-name': 'error',
    'react/no-unescaped-entities': 'warn',
    'react/jsx-no-bind': ['error', {
      allowArrowFunctions: true,
      allowBind: false,
      ignoreRefs: true,
    }],
    'react/jsx-no-lambda': 'off',
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': ['error', {
      props: 'never',
      children: 'never',
    }],
    'react/self-closing-comp': 'error',
    'react/jsx-sort-props': ['error', {
      callbacksLast: true,
      shorthandFirst: true,
      reservedFirst: true,
    }],
    'react/no-array-index-key': 'warn',
    'react/jsx-fragments': ['error', 'syntax'],

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ========================================
    // Import/Export Rules - モジュール管理
    // ========================================
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'type',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-duplicate': 'error',
    'import/newline-after-import': 'error',
    'import/no-named-as-default': 'warn',
    'import/no-named-as-default-member': 'warn',
    'import/no-deprecated': 'warn',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test/**/*',
        '**/tests/**/*',
        '**/__tests__/**/*',
        '**/setupTests.ts',
        '**/jest.config.js',
        '**/*.stories.{ts,tsx}',
      ],
    }],

    // ========================================
    // Accessibility Rules - アクセシビリティ
    // ========================================
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',

    // ========================================
    // Security Rules - セキュリティ
    // ========================================
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // ========================================
    // Code Quality Rules - コード品質
    // ========================================
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-unused-expressions': 'error',
    'no-useless-return': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-unneeded-ternary': 'error',
    'no-nested-ternary': 'warn',
    'prefer-template': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', {
      array: false,
      object: true,
    }],

    // ========================================
    // Performance Rules - パフォーマンス
    // ========================================
    'prefer-arrow/prefer-arrow-functions': ['error', {
      disallowPrototype: true,
      singleReturnOnly: false,
      classPropertiesAllowed: false,
    }],
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['warn', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    }],

    // ========================================
    // Naming Conventions - 命名規則
    // ========================================
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],

    // ========================================
    // Complexity Rules - 複雑度制御
    // ========================================
    'complexity': ['warn', { max: 10 }],
    'max-depth': ['warn', { max: 4 }],
    'max-lines': ['warn', { max: 500, skipComments: true, skipBlankLines: true }],
    'max-lines-per-function': ['warn', { max: 100, skipComments: true, skipBlankLines: true }],
    'max-params': ['warn', { max: 5 }],

    // ========================================
    // Error Prevention - エラー防止
    // ========================================
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-implicit-coercion': 'error',
    'no-param-reassign': ['error', { props: false }],
    'no-shadow': 'off', // TypeScript版を使用
    '@typescript-eslint/no-shadow': 'error',
    'no-use-before-define': 'off', // TypeScript版を使用
    '@typescript-eslint/no-use-before-define': 'error',
    'no-redeclare': 'off', // TypeScript版を使用
    '@typescript-eslint/no-redeclare': 'error',

    // ========================================
    // Best Practices - ベストプラクティス
    // ========================================
    'curly': ['error', 'all'],
    'dot-notation': 'error',
    'guard-for-in': 'error',
    'no-caller': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-fallthrough': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-str': 'error',
    'no-new': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-proto': 'error',
    'no-return-await': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-labels': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-void': 'error',
    'radix': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',
  },

  // ========================================
  // Override Rules for Specific Files
  // ========================================
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['**/*.stories.{ts,tsx}'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['**/types/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
      },
    },
    {
      files: ['**/utils/**/*.ts', '**/helpers/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['**/*.config.{js,ts}', '**/.*rc.{js,ts}'],
      env: {
        node: true,
      },
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],

  // ========================================
  // Ignore Patterns
  // ========================================
  ignorePatterns: [
    'build/',
    'dist/',
    'node_modules/',
    'coverage/',
    '*.min.js',
    'public/',
    '**/*.d.ts',
    'vite.config.ts',
    '!.storybook',
  ],
};