/**
 * TypeScript・バンドルサイズ最適化設定
 * パフォーマンス向上・高速ビルド実現
 */

const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  
  // エントリーポイント最適化
  entry: {
    main: './src/index.tsx',
    vendor: ['react', 'react-dom', 'react-router-dom']
  },
  
  // TypeScript処理最適化
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              // 高速化設定
              transpileOnly: true,
              experimentalWatchApi: true,
              configFile: 'tsconfig.build.json',
              // フォークプロセスでの型チェック
              happyPackMode: true,
              // キャッシュ使用
              getCustomTransformers: () => ({
                before: [],
                after: []
              }),
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                '@babel/plugin-proposal-class-properties'
              ],
              cacheDirectory: true,
              cacheCompression: false,
            }
          }
        ],
        exclude: /node_modules/,
      }
    ]
  },
  
  // 解決設定最適化
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    // モジュール解決キャッシュ
    cacheWithContext: false,
    // symlink解決を無効化（高速化）
    symlinks: false,
  },
  
  // 最適化設定
  optimization: {
    // コード分割
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    // 実行時チャンク最適化
    runtimeChunk: 'single',
    // Tree shaking
    usedExports: true,
    sideEffects: false,
    // ミニファイ設定
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: true,
            pure_getters: true,
            unsafe_comps: true,
            unsafe_math: true,
            passes: 2
          },
          mangle: {
            safari10: true
          },
          output: {
            comments: false,
            ascii_only: true
          }
        },
        parallel: true,
        extractComments: false
      })
    ]
  },
  
  // プラグイン設定
  plugins: [
    // 環境変数定義
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      '__DEV__': process.env.NODE_ENV !== 'production'
    }),
    
    // TypeScript型チェックを別プロセスで実行
    new (require('fork-ts-checker-webpack-plugin'))({
      async: false,
      typescript: {
        configFile: 'tsconfig.build.json',
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: 'write-references',
      },
      eslint: {
        files: './src/**/*.{ts,tsx,js,jsx}',
        options: {
          cache: true,
          cacheLocation: path.resolve(__dirname, 'node_modules/.cache/eslint'),
        }
      },
    }),
    
    // バンドル分析（開発時）
    ...(process.env.ANALYZE ? [new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin()] : [])
  ],
  
  // キャッシュ設定
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
    buildDependencies: {
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.build.json')],
    },
  },
  
  // ファイル監視最適化
  watchOptions: {
    aggregateTimeout: 300,
    poll: false,
    ignored: /node_modules/,
  },
  
  // 統計情報設定
  stats: {
    modules: false,
    chunks: false,
    chunkModules: false,
    optimizationBailout: false,
    timings: true,
    builtAt: true,
    assets: false,
    entrypoints: false,
  },
  
  // パフォーマンス警告
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 250000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  }
};