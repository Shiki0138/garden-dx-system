/**
 * Garden Project Management System - Prettier Configuration
 * 企業級コードフォーマット設定
 * 
 * Created by: worker2 (Code Quality Phase)
 * Date: 2025-06-30
 */

module.exports = {
  // Basic Formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // JSX Formatting
  jsxSingleQuote: false,
  jsxBracketSameLine: false,
  
  // Trailing Commas
  trailingComma: 'es5',
  
  // Spacing
  bracketSpacing: true,
  arrowParens: 'always',
  
  // Range Formatting
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // File Path and Parser
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  
  // Vue Support (if needed in future)
  vueIndentScriptAndStyle: false,
  
  // End of Line
  endOfLine: 'lf',
  
  // Embedded Language Formatting
  embeddedLanguageFormatting: 'auto',
  
  // Override specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 2,
        parser: 'json',
      },
    },
    {
      files: '*.md',
      options: {
        tabWidth: 2,
        proseWrap: 'always',
        parser: 'markdown',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        parser: 'yaml',
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        parser: 'yaml',
      },
    },
    {
      files: '*.css',
      options: {
        parser: 'css',
      },
    },
    {
      files: '*.scss',
      options: {
        parser: 'scss',
      },
    },
    {
      files: '*.less',
      options: {
        parser: 'less',
      },
    },
    {
      files: '*.html',
      options: {
        parser: 'html',
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        parser: 'babel',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
      },
    },
    {
      files: '*.graphql',
      options: {
        parser: 'graphql',
      },
    },
  ],
};