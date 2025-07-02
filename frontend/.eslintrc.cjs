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
  },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'react-hooks',
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
  },
  rules: {
    // TypeScript Rules
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-unused-vars': 'off', // Use TypeScript version

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Code Quality Rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
  },

  ignorePatterns: [
    'build/',
    'dist/',
    'node_modules/',
    'coverage/',
    '*.min.js',
    'public/',
    '**/*.d.ts',
    'vite.config.ts',
  ],
};