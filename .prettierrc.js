module.exports = {
  // 基本設定
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // JSX設定
  jsxSingleQuote: false,
  
  // 末尾設定
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // 改行設定
  endOfLine: 'lf',
  
  // HTML/JSX
  htmlWhitespaceSensitivity: 'css',
  
  // Override for specific files
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        parser: 'babel-ts',
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
};