#!/usr/bin/env node

/**
 * 最終統合テストスイート
 * 全システム機能・パフォーマンス・セキュリティ包括テスト
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class FinalIntegrationTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testSuites: {},
      overallScore: 0,
      readyForProduction: false
    };
    
    this.requirements = {
      buildSuccess: false,
      typeCheckPass: false,
      lintPass: false,
      securityPass: false,
      performancePass: false,
      functionalityPass: false,
      accessibilityPass: false
    };
  }

  async runFullTest() {
    console.log(chalk.bold.green('\n🧪 Final Integration Test Suite\n'));
    console.log('Testing all systems for production readiness...\n');

    await this.testBuildProcess();
    await this.testTypeScriptCompliance();
    await this.testCodeQuality();
    await this.testSecurity();
    await this.testPerformance();
    await this.testCoreFunctionality();
    await this.testAccessibility();
    await this.testSupabaseIntegration();
    await this.testEnvironmentConfig();
    await this.generateFinalReport();
  }

  async testBuildProcess() {
    console.log(chalk.blue('🏗️  Testing Build Process...'));
    
    try {
      // React アプリケーションビルド
      console.log('  Building React application...');
      execSync('npm run build', { 
        cwd: 'app',
        stdio: 'pipe',
        timeout: 300000 // 5分
      });
      
      // ビルド成果物確認
      const buildDir = 'app/build';
      if (fs.existsSync(buildDir)) {
        const buildFiles = fs.readdirSync(buildDir);
        const hasIndex = buildFiles.includes('index.html');
        const hasStatic = buildFiles.includes('static');
        
        if (hasIndex && hasStatic) {
          this.requirements.buildSuccess = true;
          this.addTestResult('Build Process', 'React Build', 'pass', 'Build completed successfully');
        } else {
          this.addTestResult('Build Process', 'React Build', 'fail', 'Missing required build files');
        }
      } else {
        this.addTestResult('Build Process', 'React Build', 'fail', 'Build directory not created');
      }

      // バンドルサイズチェック
      const staticDir = path.join(buildDir, 'static');
      if (fs.existsSync(staticDir)) {
        const bundleSize = this.calculateDirectorySize(staticDir);
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (bundleSize < maxSize) {
          this.addTestResult('Build Process', 'Bundle Size', 'pass', 
            `Bundle size: ${this.formatBytes(bundleSize)} (under 5MB limit)`);
        } else {
          this.addTestResult('Build Process', 'Bundle Size', 'warn', 
            `Bundle size: ${this.formatBytes(bundleSize)} (exceeds 5MB limit)`);
        }
      }

    } catch (error) {
      this.addTestResult('Build Process', 'React Build', 'fail', error.message);
    }

    console.log('  ✅ Build process test completed\n');
  }

  async testTypeScriptCompliance() {
    console.log(chalk.blue('📝 Testing TypeScript Compliance...'));

    try {
      // TypeScript 型チェック
      console.log('  Running TypeScript type checking...');
      execSync('npm run typecheck', {
        cwd: 'app',
        stdio: 'pipe',
        timeout: 120000 // 2分
      });
      
      this.requirements.typeCheckPass = true;
      this.addTestResult('TypeScript', 'Type Check', 'pass', 'No type errors found');

      // 型安全性監査
      console.log('  Running type safety audit...');
      const typeSafetyResult = execSync('node ../scripts/type-safety-audit.js', {
        cwd: 'app',
        encoding: 'utf8',
        timeout: 60000
      });

      // レポート解析
      if (fs.existsSync('type-safety-report.json')) {
        const report = JSON.parse(fs.readFileSync('type-safety-report.json', 'utf8'));
        const score = report.summary?.typeSafetyScore || 0;
        
        if (score >= 80) {
          this.addTestResult('TypeScript', 'Type Safety', 'pass', `Score: ${score}/100`);
        } else {
          this.addTestResult('TypeScript', 'Type Safety', 'warn', `Score: ${score}/100 (below 80)`);
        }
      }

    } catch (error) {
      this.addTestResult('TypeScript', 'Type Check', 'fail', error.message);
    }

    console.log('  ✅ TypeScript compliance test completed\n');
  }

  async testCodeQuality() {
    console.log(chalk.blue('🔍 Testing Code Quality...'));

    try {
      // ESLint チェック
      console.log('  Running ESLint...');
      execSync('npm run lint:check', {
        cwd: 'app',
        stdio: 'pipe',
        timeout: 60000
      });
      
      this.requirements.lintPass = true;
      this.addTestResult('Code Quality', 'ESLint', 'pass', 'No linting errors');

      // Prettier フォーマットチェック
      console.log('  Checking code formatting...');
      execSync('npm run format:check', {
        cwd: 'app',
        stdio: 'pipe',
        timeout: 30000
      });
      
      this.addTestResult('Code Quality', 'Prettier', 'pass', 'Code properly formatted');

    } catch (error) {
      const errorMsg = error.message || error.toString();
      if (errorMsg.includes('eslint')) {
        this.addTestResult('Code Quality', 'ESLint', 'fail', 'Linting errors found');
      } else if (errorMsg.includes('prettier')) {
        this.addTestResult('Code Quality', 'Prettier', 'fail', 'Code formatting issues');
      } else {
        this.addTestResult('Code Quality', 'General', 'fail', errorMsg);
      }
    }

    console.log('  ✅ Code quality test completed\n');
  }

  async testSecurity() {
    console.log(chalk.blue('🛡️  Testing Security...'));

    try {
      // セキュリティ監査実行
      console.log('  Running comprehensive security audit...');
      
      // 個別セキュリティチェック
      const securityChecks = [
        { name: 'Security Audit', command: 'node ../scripts/security-audit.js' },
        { name: 'Vulnerability Scan', command: 'node ../scripts/vulnerability-scan.js' },
        { name: 'Type Safety Security', command: 'node ../scripts/type-safety-audit.js' }
      ];

      let securityScore = 0;
      let passedChecks = 0;

      for (const check of securityChecks) {
        try {
          execSync(check.command, {
            cwd: 'app',
            stdio: 'pipe',
            timeout: 60000
          });
          
          passedChecks++;
          this.addTestResult('Security', check.name, 'pass', 'Security check passed');
        } catch (error) {
          this.addTestResult('Security', check.name, 'warn', 'Security issues found');
        }
      }

      securityScore = (passedChecks / securityChecks.length) * 100;
      
      if (securityScore >= 70) {
        this.requirements.securityPass = true;
        this.addTestResult('Security', 'Overall', 'pass', `Security score: ${Math.round(securityScore)}%`);
      } else {
        this.addTestResult('Security', 'Overall', 'fail', `Security score: ${Math.round(securityScore)}% (below 70%)`);
      }

    } catch (error) {
      this.addTestResult('Security', 'Security Audit', 'fail', error.message);
    }

    console.log('  ✅ Security test completed\n');
  }

  async testPerformance() {
    console.log(chalk.blue('⚡ Testing Performance...'));

    try {
      // バンドル分析
      console.log('  Analyzing bundle performance...');
      
      const buildDir = 'app/build';
      if (fs.existsSync(buildDir)) {
        // JavaScript バンドルサイズチェック
        const jsFiles = this.findFiles(path.join(buildDir, 'static/js'), '.js');
        const totalJSSize = jsFiles.reduce((sum, file) => {
          return sum + fs.statSync(file).size;
        }, 0);

        // CSS バンドルサイズチェック
        const cssFiles = this.findFiles(path.join(buildDir, 'static/css'), '.css');
        const totalCSSSize = cssFiles.reduce((sum, file) => {
          return sum + fs.statSync(file).size;
        }, 0);

        // パフォーマンス基準チェック
        const maxJSSize = 1 * 1024 * 1024; // 1MB
        const maxCSSSize = 500 * 1024; // 500KB

        if (totalJSSize < maxJSSize) {
          this.addTestResult('Performance', 'JS Bundle Size', 'pass', 
            `${this.formatBytes(totalJSSize)} (under 1MB)`);
        } else {
          this.addTestResult('Performance', 'JS Bundle Size', 'warn', 
            `${this.formatBytes(totalJSSize)} (exceeds 1MB)`);
        }

        if (totalCSSSize < maxCSSSize) {
          this.addTestResult('Performance', 'CSS Bundle Size', 'pass', 
            `${this.formatBytes(totalCSSSize)} (under 500KB)`);
        } else {
          this.addTestResult('Performance', 'CSS Bundle Size', 'warn', 
            `${this.formatBytes(totalCSSSize)} (exceeds 500KB)`);
        }

        // 全体的なパフォーマンススコア
        const perfScore = (totalJSSize < maxJSSize && totalCSSSize < maxCSSSize) ? 100 : 75;
        if (perfScore >= 80) {
          this.requirements.performancePass = true;
        }
      }

      // TypeScript コンパイル性能
      console.log('  Testing TypeScript compilation performance...');
      const startTime = Date.now();
      
      try {
        execSync('npm run typecheck:perf', {
          cwd: 'app',
          stdio: 'pipe',
          timeout: 30000
        });
        
        const compileTime = Date.now() - startTime;
        if (compileTime < 10000) { // 10秒以下
          this.addTestResult('Performance', 'TypeScript Compile', 'pass', 
            `Compiled in ${compileTime}ms`);
        } else {
          this.addTestResult('Performance', 'TypeScript Compile', 'warn', 
            `Compiled in ${compileTime}ms (slow)`);
        }
      } catch (error) {
        this.addTestResult('Performance', 'TypeScript Compile', 'fail', 'Compilation failed');
      }

    } catch (error) {
      this.addTestResult('Performance', 'Performance Test', 'fail', error.message);
    }

    console.log('  ✅ Performance test completed\n');
  }

  async testCoreFunctionality() {
    console.log(chalk.blue('🔧 Testing Core Functionality...'));

    try {
      // 重要ファイルの存在確認
      const criticalFiles = [
        'app/src/index.tsx',
        'app/src/App.tsx',
        'app/src/components/EstimateCreator.jsx',
        'app/src/components/auth/LoginPage.jsx',
        'app/src/contexts/SupabaseAuthContext.js',
        'supabase/functions/estimates/index.ts',
        'supabase/functions/auth/index.ts',
        'supabase/functions/_shared/security.ts'
      ];

      let missingFiles = [];
      criticalFiles.forEach(file => {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      });

      if (missingFiles.length === 0) {
        this.requirements.functionalityPass = true;
        this.addTestResult('Functionality', 'Critical Files', 'pass', 'All critical files present');
      } else {
        this.addTestResult('Functionality', 'Critical Files', 'fail', 
          `Missing files: ${missingFiles.join(', ')}`);
      }

      // 環境設定ファイル確認
      const configFiles = [
        'app/package.json',
        'app/tsconfig.json',
        'supabase/functions/deno.json'
      ];

      configFiles.forEach(file => {
        if (fs.existsSync(file)) {
          try {
            const content = fs.readFileSync(file, 'utf8');
            JSON.parse(content);
            this.addTestResult('Functionality', `Config: ${path.basename(file)}`, 'pass', 'Valid JSON');
          } catch (error) {
            this.addTestResult('Functionality', `Config: ${path.basename(file)}`, 'fail', 'Invalid JSON');
          }
        } else {
          this.addTestResult('Functionality', `Config: ${path.basename(file)}`, 'fail', 'File missing');
        }
      });

    } catch (error) {
      this.addTestResult('Functionality', 'Core Test', 'fail', error.message);
    }

    console.log('  ✅ Core functionality test completed\n');
  }

  async testAccessibility() {
    console.log(chalk.blue('♿ Testing Accessibility...'));

    try {
      // アクセシビリティ関連コードチェック
      const accessibilityChecks = [
        { file: 'app/src/components/auth/LoginPage.jsx', feature: 'ARIA labels' },
        { file: 'app/src/components/EstimateCreator.jsx', feature: 'Form accessibility' }
      ];

      let accessibilityScore = 0;
      let passedChecks = 0;

      accessibilityChecks.forEach(check => {
        if (fs.existsSync(check.file)) {
          const content = fs.readFileSync(check.file, 'utf8');
          
          // ARIA属性チェック
          const hasAriaLabels = content.includes('aria-label') || content.includes('aria-labelledby');
          // alt属性チェック
          const hasAltTags = !content.includes('<img') || content.includes('alt=');
          // フォームラベルチェック
          const hasLabels = !content.includes('<input') || content.includes('htmlFor') || content.includes('<label');

          if (hasAriaLabels && hasAltTags && hasLabels) {
            passedChecks++;
            this.addTestResult('Accessibility', check.feature, 'pass', `${check.file} is accessible`);
          } else {
            this.addTestResult('Accessibility', check.feature, 'warn', `${check.file} needs accessibility improvements`);
          }
        }
      });

      accessibilityScore = (passedChecks / accessibilityChecks.length) * 100;
      
      if (accessibilityScore >= 70) {
        this.requirements.accessibilityPass = true;
        this.addTestResult('Accessibility', 'Overall', 'pass', `Accessibility score: ${Math.round(accessibilityScore)}%`);
      } else {
        this.addTestResult('Accessibility', 'Overall', 'warn', `Accessibility score: ${Math.round(accessibilityScore)}% (needs improvement)`);
      }

    } catch (error) {
      this.addTestResult('Accessibility', 'Accessibility Test', 'fail', error.message);
    }

    console.log('  ✅ Accessibility test completed\n');
  }

  async testSupabaseIntegration() {
    console.log(chalk.blue('🗄️  Testing Supabase Integration...'));

    try {
      // Supabase設定ファイル確認
      const supabaseFiles = [
        'supabase/config.toml',
        'supabase/functions/estimates/index.ts',
        'supabase/functions/auth/index.ts',
        'supabase/functions/_shared/cors.ts',
        'supabase/functions/_shared/security.ts'
      ];

      let supabaseScore = 0;
      let validFiles = 0;

      supabaseFiles.forEach(file => {
        if (fs.existsSync(file)) {
          validFiles++;
          this.addTestResult('Supabase', `File: ${path.basename(file)}`, 'pass', 'File exists');
        } else {
          this.addTestResult('Supabase', `File: ${path.basename(file)}`, 'fail', 'File missing');
        }
      });

      // Edge Functions 構文チェック
      const functionDirs = ['estimates', 'auth', 'companies', 'projects', 'price-master'];
      functionDirs.forEach(funcName => {
        const indexFile = `supabase/functions/${funcName}/index.ts`;
        if (fs.existsSync(indexFile)) {
          const content = fs.readFileSync(indexFile, 'utf8');
          
          // 基本的な構文要素チェック
          const hasImports = content.includes('import');
          const hasServe = content.includes('serve');
          const hasCORS = content.includes('cors') || content.includes('OPTIONS');
          const hasErrorHandling = content.includes('try') && content.includes('catch');

          if (hasImports && hasServe && hasCORS && hasErrorHandling) {
            this.addTestResult('Supabase', `Function: ${funcName}`, 'pass', 'Function structure valid');
          } else {
            this.addTestResult('Supabase', `Function: ${funcName}`, 'warn', 'Function structure incomplete');
          }
        }
      });

    } catch (error) {
      this.addTestResult('Supabase', 'Integration Test', 'fail', error.message);
    }

    console.log('  ✅ Supabase integration test completed\n');
  }

  async testEnvironmentConfig() {
    console.log(chalk.blue('🌍 Testing Environment Configuration...'));

    try {
      // 環境変数設定例確認
      const envFiles = ['.env.example', 'app/.env.example'];
      
      envFiles.forEach(file => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
          
          const hasAllVars = requiredVars.every(varName => content.includes(varName));
          
          if (hasAllVars) {
            this.addTestResult('Environment', `Config: ${file}`, 'pass', 'All required variables present');
          } else {
            this.addTestResult('Environment', `Config: ${file}`, 'warn', 'Some required variables missing');
          }
        }
      });

      // デプロイ用設定ファイル確認
      const deployFiles = ['vercel.json', 'netlify.toml', 'Dockerfile'];
      const hasDeployConfig = deployFiles.some(file => fs.existsSync(file));
      
      if (hasDeployConfig) {
        this.addTestResult('Environment', 'Deploy Config', 'pass', 'Deployment configuration found');
      } else {
        this.addTestResult('Environment', 'Deploy Config', 'warn', 'No deployment configuration found');
      }

    } catch (error) {
      this.addTestResult('Environment', 'Environment Test', 'fail', error.message);
    }

    console.log('  ✅ Environment configuration test completed\n');
  }

  addTestResult(suite, test, status, message) {
    if (!this.testResults.testSuites[suite]) {
      this.testResults.testSuites[suite] = {
        tests: [],
        passed: 0,
        failed: 0,
        warned: 0
      };
    }

    this.testResults.testSuites[suite].tests.push({
      name: test,
      status,
      message,
      timestamp: new Date().toISOString()
    });

    this.testResults.totalTests++;
    
    if (status === 'pass') {
      this.testResults.passedTests++;
      this.testResults.testSuites[suite].passed++;
    } else if (status === 'fail') {
      this.testResults.failedTests++;
      this.testResults.testSuites[suite].failed++;
    } else if (status === 'warn') {
      this.testResults.testSuites[suite].warned++;
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.calculateDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      });
    }
    
    return totalSize;
  }

  findFiles(dir, extension) {
    const files = [];
    
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        } else if (stats.isDirectory()) {
          files.push(...this.findFiles(fullPath, extension));
        }
      });
    }
    
    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateFinalReport() {
    console.log(chalk.blue('\n📊 Generating Final Report...\n'));

    // 全体スコア計算
    const passRate = (this.testResults.passedTests / this.testResults.totalTests) * 100;
    this.testResults.overallScore = Math.round(passRate);

    // プロダクション準備状況
    const criticalRequirements = Object.values(this.requirements);
    const metRequirements = criticalRequirements.filter(req => req).length;
    const totalRequirements = criticalRequirements.length;
    
    this.testResults.readyForProduction = metRequirements >= Math.ceil(totalRequirements * 0.8); // 80%以上

    // コンソール出力
    console.log('📋 FINAL INTEGRATION TEST REPORT');
    console.log('=================================\n');

    console.log(`Overall Score: ${this.testResults.overallScore}/100`);
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`⚠️  Warnings: ${this.testResults.totalTests - this.testResults.passedTests - this.testResults.failedTests}\n`);

    // 要件チェック結果
    console.log('Critical Requirements:');
    Object.entries(this.requirements).forEach(([req, met]) => {
      const emoji = met ? '✅' : '❌';
      console.log(`  ${emoji} ${req}: ${met ? 'PASS' : 'FAIL'}`);
    });

    console.log(`\nProduction Ready: ${this.testResults.readyForProduction ? '✅ YES' : '❌ NO'}\n`);

    // テストスイート詳細
    console.log('Test Suite Details:');
    Object.entries(this.testResults.testSuites).forEach(([suite, results]) => {
      console.log(`\n${suite}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  ⚠️  Warnings: ${results.warned}`);
      
      // 失敗したテストの詳細
      if (results.failed > 0) {
        const failedTests = results.tests.filter(t => t.status === 'fail');
        failedTests.forEach(test => {
          console.log(`    ❌ ${test.name}: ${test.message}`);
        });
      }
    });

    // 推奨事項
    console.log(chalk.blue('\n🛠️  Recommendations:\n'));
    
    if (!this.requirements.buildSuccess) {
      console.log('🔧 Fix build process errors before deployment');
    }
    if (!this.requirements.typeCheckPass) {
      console.log('🔧 Resolve TypeScript compilation errors');
    }
    if (!this.requirements.lintPass) {
      console.log('🔧 Fix ESLint warnings and errors');
    }
    if (!this.requirements.securityPass) {
      console.log('🔧 Address security vulnerabilities');
    }
    if (!this.requirements.performancePass) {
      console.log('🔧 Optimize bundle sizes for better performance');
    }

    if (this.testResults.readyForProduction) {
      console.log(chalk.green('\n🎉 System is ready for production deployment!'));
    } else {
      console.log(chalk.red('\n🚨 System requires fixes before production deployment!'));
    }

    // JSON レポート保存
    fs.writeFileSync('final-integration-test-report.json', JSON.stringify(this.testResults, null, 2));
    console.log(chalk.blue('\n📄 Detailed report saved to: final-integration-test-report.json'));

    return this.testResults;
  }
}

// メイン実行
async function main() {
  const tester = new FinalIntegrationTest();
  const results = await tester.runFullTest();
  
  // 終了コード
  process.exit(results.readyForProduction ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Integration test failed:'), error);
    process.exit(1);
  });
}

module.exports = { FinalIntegrationTest };