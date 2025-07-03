#!/usr/bin/env node

/**
 * バンドル分析・サイズ最適化ツール
 * Webpack Bundle Analyzer + カスタム分析
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// サイズ計算ユーティリティ
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// パッケージサイズ分析
function analyzePackageSize() {
  console.log(chalk.blue('\n📦 Package Size Analysis\n'));
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  const packageSizes = [];
  
  Object.keys(dependencies).forEach(pkg => {
    try {
      const packagePath = path.join('node_modules', pkg, 'package.json');
      if (fs.existsSync(packagePath)) {
        const stats = getDirectorySize(path.join('node_modules', pkg));
        packageSizes.push({
          name: pkg,
          version: dependencies[pkg],
          size: stats
        });
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${pkg}: ${error.message}`);
    }
  });
  
  // サイズ順でソート
  packageSizes.sort((a, b) => b.size - a.size);
  
  console.log('Top 10 Largest Dependencies:');
  packageSizes.slice(0, 10).forEach((pkg, index) => {
    const sizeColor = pkg.size > 1024 * 1024 ? chalk.red : 
                     pkg.size > 512 * 1024 ? chalk.yellow : chalk.green;
    console.log(`${index + 1}. ${chalk.cyan(pkg.name)} - ${sizeColor(formatBytes(pkg.size))}`);
  });
  
  const totalSize = packageSizes.reduce((sum, pkg) => sum + pkg.size, 0);
  console.log(`\nTotal Dependencies Size: ${chalk.bold(formatBytes(totalSize))}\n`);
  
  return packageSizes;
}

// ディレクトリサイズ計算
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  } catch (error) {
    // ディレクトリアクセスエラーは無視
  }
  
  return totalSize;
}

// ビルドサイズ分析
function analyzeBuildSize() {
  console.log(chalk.blue('🏗️  Build Size Analysis\n'));
  
  const buildPath = 'build';
  
  if (!fs.existsSync(buildPath)) {
    console.log(chalk.yellow('⚠️  Build directory not found. Running build...'));
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red('❌ Build failed'));
      return;
    }
  }
  
  // 静的ファイル分析
  const staticPath = path.join(buildPath, 'static');
  if (fs.existsSync(staticPath)) {
    analyzeStaticFiles(staticPath);
  }
  
  // 総ビルドサイズ
  const totalBuildSize = getDirectorySize(buildPath);
  console.log(`\nTotal Build Size: ${chalk.bold(formatBytes(totalBuildSize))}`);
  
  // 推奨サイズとの比較
  const recommendedSize = 2 * 1024 * 1024; // 2MB
  if (totalBuildSize > recommendedSize) {
    console.log(chalk.red(`⚠️  Build size exceeds recommended 2MB limit`));
    console.log(chalk.yellow('💡 Consider code splitting or removing unused dependencies'));
  } else {
    console.log(chalk.green('✅ Build size is within recommended limits'));
  }
}

// 静的ファイル分析
function analyzeStaticFiles(staticPath) {
  console.log('Static Files Analysis:');
  
  const categories = {
    js: { pattern: /\.js$/, files: [], totalSize: 0 },
    css: { pattern: /\.css$/, files: [], totalSize: 0 },
    media: { pattern: /\.(png|jpg|jpeg|gif|svg|ico)$/, files: [], totalSize: 0 },
    fonts: { pattern: /\.(woff|woff2|ttf|eot)$/, files: [], totalSize: 0 },
    other: { pattern: /./, files: [], totalSize: 0 }
  };
  
  function scanDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        scanDirectory(filePath);
      } else {
        const fileInfo = {
          name: file,
          path: filePath,
          size: stats.size
        };
        
        let categorized = false;
        for (const [category, config] of Object.entries(categories)) {
          if (category !== 'other' && config.pattern.test(file)) {
            config.files.push(fileInfo);
            config.totalSize += stats.size;
            categorized = true;
            break;
          }
        }
        
        if (!categorized) {
          categories.other.files.push(fileInfo);
          categories.other.totalSize += stats.size;
        }
      }
    });
  }
  
  scanDirectory(staticPath);
  
  // カテゴリ別サイズ表示
  Object.entries(categories).forEach(([category, data]) => {
    if (data.files.length > 0) {
      console.log(`\n${category.toUpperCase()}: ${chalk.cyan(formatBytes(data.totalSize))}`);
      
      // 大きなファイルをハイライト
      const largeFiles = data.files
        .filter(file => file.size > 100 * 1024) // 100KB以上
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);
      
      largeFiles.forEach(file => {
        const sizeColor = file.size > 1024 * 1024 ? chalk.red : chalk.yellow;
        console.log(`  - ${file.name}: ${sizeColor(formatBytes(file.size))}`);
      });
    }
  });
}

// TypeScript型チェック最適化提案
function suggestTypeScriptOptimizations() {
  console.log(chalk.blue('\n🔧 TypeScript Optimization Suggestions\n'));
  
  const suggestions = [
    '1. Enable incremental compilation in tsconfig.json',
    '2. Use skipLibCheck: true for faster builds',
    '3. Enable composite projects for monorepos',
    '4. Use project references for large codebases',
    '5. Consider using Babel for transpilation with TypeScript for type checking'
  ];
  
  suggestions.forEach(suggestion => {
    console.log(chalk.green(`💡 ${suggestion}`));
  });
}

// 最適化提案
function suggestOptimizations(packageSizes) {
  console.log(chalk.blue('\n🚀 Optimization Suggestions\n'));
  
  // 大きなパッケージの代替案
  const alternatives = {
    'moment': 'date-fns (smaller alternative)',
    'lodash': 'lodash-es with tree shaking',
    'material-ui': '@mui/material with tree shaking',
    'react-router-dom': 'Consider lazy loading routes',
    'recharts': 'Consider lightweight chart alternatives'
  };
  
  packageSizes.slice(0, 5).forEach(pkg => {
    if (alternatives[pkg.name]) {
      console.log(chalk.yellow(`🔄 ${pkg.name}: ${alternatives[pkg.name]}`));
    }
  });
  
  console.log(chalk.green('\nGeneral Optimizations:'));
  console.log('✅ Enable gzip compression on server');
  console.log('✅ Use code splitting with React.lazy()');
  console.log('✅ Implement tree shaking');
  console.log('✅ Remove unused dependencies');
  console.log('✅ Use production builds');
  console.log('✅ Enable source map optimization');
}

// webpack-bundle-analyzer の実行
function runBundleAnalyzer() {
  console.log(chalk.blue('\n📊 Running Webpack Bundle Analyzer\n'));
  
  try {
    // ビルドしてアナライザーを実行
    execSync('npm run build', { stdio: 'inherit' });
    execSync('npx webpack-bundle-analyzer build/static/js/*.js', { stdio: 'inherit' });
  } catch (error) {
    console.error(chalk.red('❌ Bundle analyzer failed'), error.message);
  }
}

// メイン実行
function main() {
  console.log(chalk.bold.green('\n🎯 Bundle Size Optimization Tool\n'));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--analyzer')) {
    runBundleAnalyzer();
    return;
  }
  
  const packageSizes = analyzePackageSize();
  analyzeBuildSize();
  suggestTypeScriptOptimizations();
  suggestOptimizations(packageSizes);
  
  console.log(chalk.bold.green('\n✨ Analysis Complete! ✨\n'));
  console.log(chalk.gray('Run with --analyzer flag to open interactive bundle analyzer'));
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzePackageSize,
  analyzeBuildSize,
  formatBytes
};