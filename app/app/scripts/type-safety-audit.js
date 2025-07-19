#!/usr/bin/env node

/**
 * TypeScript型安全性セキュリティ監査ツール
 * 型の抜け穴・any使用・型アサーション・セキュリティ関連型チェック
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class TypeSafetyAuditor {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      anyUsage: 0,
      typeAssertions: 0,
      unsafeOperations: 0,
      missingTypes: 0
    };
  }

  async auditProject() {
    console.log(chalk.blue('\n🔍 TypeScript Type Safety Security Audit\n'));

    await this.checkTSConfig();
    await this.scanSourceFiles();
    await this.checkTypeDefinitions();
    await this.runTypeChecker();
    await this.generateReport();
  }

  async checkTSConfig() {
    console.log('⚙️  Checking TypeScript configuration...');

    const tsconfigPaths = [
      'app/tsconfig.json',
      'tsconfig.json',
      'app/tsconfig.build.json',
      'app/tsconfig.performance.json'
    ];

    for (const configPath of tsconfigPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          this.auditTSConfig(configPath, config);
        } catch (error) {
          this.addIssue({
            severity: 'medium',
            category: 'Configuration',
            description: `Invalid TypeScript config: ${configPath}`,
            file: configPath,
            suggestion: 'Fix JSON syntax in TypeScript configuration'
          });
        }
      }
    }
  }

  auditTSConfig(configPath, config) {
    const compilerOptions = config.compilerOptions || {};

    // セキュリティ関連設定チェック
    const securityChecks = [
      {
        option: 'strict',
        expected: true,
        severity: 'high',
        description: 'strict mode should be enabled for maximum type safety'
      },
      {
        option: 'noImplicitAny',
        expected: true,
        severity: 'high',
        description: 'noImplicitAny prevents unsafe any types'
      },
      {
        option: 'strictNullChecks',
        expected: true,
        severity: 'medium',
        description: 'strictNullChecks prevents null/undefined errors'
      },
      {
        option: 'noImplicitReturns',
        expected: true,
        severity: 'medium',
        description: 'noImplicitReturns ensures all code paths return values'
      },
      {
        option: 'noFallthroughCasesInSwitch',
        expected: true,
        severity: 'medium',
        description: 'prevents fallthrough in switch statements'
      },
      {
        option: 'noUncheckedIndexedAccess',
        expected: true,
        severity: 'low',
        description: 'adds undefined to index signature types'
      }
    ];

    securityChecks.forEach(check => {
      const actualValue = compilerOptions[check.option];
      if (actualValue !== check.expected) {
        this.addIssue({
          severity: check.severity,
          category: 'TypeScript Config',
          description: `${check.option} should be ${check.expected}: ${check.description}`,
          file: configPath,
          suggestion: `Set "${check.option}": ${check.expected} in compiler options`
        });
      }
    });

    // 危険な設定チェック
    if (compilerOptions.suppressImplicitAnyIndexErrors) {
      this.addIssue({
        severity: 'high',
        category: 'TypeScript Config',
        description: 'suppressImplicitAnyIndexErrors disables important type checking',
        file: configPath,
        suggestion: 'Remove suppressImplicitAnyIndexErrors'
      });
    }

    if (compilerOptions.skipLibCheck) {
      this.addIssue({
        severity: 'low',
        category: 'TypeScript Config',
        description: 'skipLibCheck may hide type errors in dependencies',
        file: configPath,
        suggestion: 'Consider removing skipLibCheck for better type safety'
      });
    }
  }

  async scanSourceFiles() {
    console.log('📁 Scanning source files for type safety issues...');

    const sourceFiles = await this.findTypeScriptFiles(['app/src', 'src']);
    this.stats.totalFiles = sourceFiles.length;

    for (const file of sourceFiles) {
      await this.auditSourceFile(file);
    }

    console.log(`  Scanned ${sourceFiles.length} TypeScript files\n`);
  }

  async auditSourceFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      this.stats.totalLines += lines.length;

      lines.forEach((line, index) => {
        this.checkLineForIssues(filePath, line, index + 1);
      });

      // ファイル全体のチェック
      this.checkFileStructure(filePath, content);

    } catch (error) {
      this.addIssue({
        severity: 'low',
        category: 'File Access',
        description: `Could not read file: ${error.message}`,
        file: filePath,
        suggestion: 'Ensure file is accessible'
      });
    }
  }

  checkLineForIssues(filePath, line, lineNumber) {
    const trimmedLine = line.trim();

    // any型の使用チェック
    if (this.containsAnyType(trimmedLine)) {
      this.stats.anyUsage++;
      this.addIssue({
        severity: 'medium',
        category: 'Type Safety',
        description: 'Usage of any type reduces type safety',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Replace any with specific types'
      });
    }

    // 型アサーション (as キーワード)
    if (trimmedLine.includes(' as ') && !trimmedLine.includes('//')) {
      this.stats.typeAssertions++;
      
      // 危険な型アサーション
      if (trimmedLine.includes(' as any') || trimmedLine.includes(' as unknown')) {
        this.addIssue({
          severity: 'high',
          category: 'Type Safety',
          description: 'Dangerous type assertion to any/unknown',
          file: filePath,
          line: lineNumber,
          code: trimmedLine,
          suggestion: 'Use proper type guards instead of type assertions'
        });
      } else {
        this.addIssue({
          severity: 'low',
          category: 'Type Safety',
          description: 'Type assertion may bypass type checking',
          file: filePath,
          line: lineNumber,
          code: trimmedLine,
          suggestion: 'Consider using type guards for safer type narrowing'
        });
      }
    }

    // 非null アサーション (!)
    if (trimmedLine.includes('!') && !trimmedLine.includes('//') && !trimmedLine.includes('!=')) {
      this.addIssue({
        severity: 'medium',
        category: 'Type Safety',
        description: 'Non-null assertion operator (!) bypasses null checking',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Use proper null checks instead of non-null assertion'
      });
    }

    // eval() の使用
    if (trimmedLine.includes('eval(')) {
      this.stats.unsafeOperations++;
      this.addIssue({
        severity: 'critical',
        category: 'Security',
        description: 'eval() can execute arbitrary code',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Remove eval() and use safer alternatives'
      });
    }

    // Function constructor
    if (trimmedLine.includes('new Function(')) {
      this.stats.unsafeOperations++;
      this.addIssue({
        severity: 'high',
        category: 'Security',
        description: 'Function constructor can execute arbitrary code',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Use regular functions instead of Function constructor'
      });
    }

    // setTimeout/setInterval with string
    if ((trimmedLine.includes('setTimeout') || trimmedLine.includes('setInterval')) && 
        (trimmedLine.includes('"') || trimmedLine.includes("'"))) {
      this.addIssue({
        severity: 'medium',
        category: 'Security',
        description: 'setTimeout/setInterval with string can execute arbitrary code',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Use function references instead of strings'
      });
    }

    // innerHTML の使用
    if (trimmedLine.includes('innerHTML') && !trimmedLine.includes('//')) {
      this.addIssue({
        severity: 'medium',
        category: 'Security',
        description: 'innerHTML can lead to XSS vulnerabilities',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Use textContent or proper sanitization'
      });
    }

    // document.write の使用
    if (trimmedLine.includes('document.write')) {
      this.addIssue({
        severity: 'high',
        category: 'Security',
        description: 'document.write can lead to XSS vulnerabilities',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Use modern DOM manipulation methods'
      });
    }

    // @ts-ignore の使用
    if (trimmedLine.includes('@ts-ignore')) {
      this.addIssue({
        severity: 'medium',
        category: 'Type Safety',
        description: '@ts-ignore suppresses TypeScript errors',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Fix the underlying type issue instead of ignoring it'
      });
    }

    // @ts-expect-error の誤用
    if (trimmedLine.includes('@ts-expect-error')) {
      this.addIssue({
        severity: 'low',
        category: 'Type Safety',
        description: '@ts-expect-error should only be used for expected errors',
        file: filePath,
        line: lineNumber,
        code: trimmedLine,
        suggestion: 'Ensure this error is actually expected'
      });
    }
  }

  containsAnyType(line) {
    // any型の検出（コメント行は除外）
    if (line.includes('//')) return false;

    const anyPatterns = [
      /:\s*any\b/,
      /=\s*any\b/,
      /<any>/,
      /any\[\]/,
      /Array<any>/,
      /Promise<any>/,
      /\(.*any.*\)/
    ];

    return anyPatterns.some(pattern => pattern.test(line));
  }

  checkFileStructure(filePath, content) {
    // インポートでのany型チェック
    const importLines = content.split('\n').filter(line => 
      line.trim().startsWith('import') && line.includes('any')
    );

    if (importLines.length > 0) {
      this.addIssue({
        severity: 'medium',
        category: 'Type Safety',
        description: 'Import statement contains any type',
        file: filePath,
        suggestion: 'Import specific types instead of any'
      });
    }

    // 型定義の欠如チェック
    const functionWithoutTypes = content.match(/function\s+\w+\s*\([^)]*\)\s*{/g);
    if (functionWithoutTypes && functionWithoutTypes.length > 0) {
      functionWithoutTypes.forEach(match => {
        if (!match.includes(':')) {
          this.stats.missingTypes++;
          this.addIssue({
            severity: 'low',
            category: 'Type Safety',
            description: 'Function without type annotations',
            file: filePath,
            code: match,
            suggestion: 'Add parameter and return type annotations'
          });
        }
      });
    }
  }

  async checkTypeDefinitions() {
    console.log('📋 Checking type definition files...');

    const typeDefFiles = await this.findTypeScriptFiles(['app/src/types', 'types', 'app/types']);
    
    for (const file of typeDefFiles) {
      await this.auditTypeDefinitionFile(file);
    }

    console.log(`  Checked ${typeDefFiles.length} type definition files\n`);
  }

  async auditTypeDefinitionFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // 空のインターフェース
      const emptyInterfaces = content.match(/interface\s+\w+\s*{\s*}/g);
      if (emptyInterfaces) {
        this.addIssue({
          severity: 'low',
          category: 'Type Definition',
          description: 'Empty interface provides no type safety',
          file: filePath,
          suggestion: 'Add properties to interface or remove if unused'
        });
      }

      // インデックスシグネチャーのチェック
      const indexSignatures = content.match(/\[\w+:\s*string\]:\s*any/g);
      if (indexSignatures) {
        this.addIssue({
          severity: 'medium',
          category: 'Type Definition',
          description: 'Index signature with any type reduces type safety',
          file: filePath,
          suggestion: 'Use specific types or union types instead of any'
        });
      }

    } catch (error) {
      // ファイル読み込みエラーは既に他所で処理されている
    }
  }

  async runTypeChecker() {
    console.log('🔍 Running TypeScript compiler...');

    try {
      const result = execSync('npx tsc --noEmit --project app/tsconfig.json', {
        encoding: 'utf8',
        timeout: 60000
      });
      
      console.log('  TypeScript compilation successful\n');
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      const errors = this.parseTypeScriptErrors(errorOutput);
      
      errors.forEach(error => {
        this.addIssue({
          severity: this.classifyTypeScriptError(error.code),
          category: 'TypeScript Compiler',
          description: error.message,
          file: error.file,
          line: error.line,
          suggestion: 'Fix TypeScript compilation error'
        });
      });

      console.log(`  Found ${errors.length} TypeScript compilation errors\n`);
    }
  }

  parseTypeScriptErrors(output) {
    const errors = [];
    const lines = output.split('\n');

    lines.forEach(line => {
      const match = line.match(/^(.+)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    });

    return errors;
  }

  classifyTypeScriptError(errorCode) {
    // TypeScriptエラーコードに基づく重要度分類
    const criticalErrors = ['2322', '2339', '2345']; // Type errors
    const highErrors = ['2304', '2307', '2305']; // Module/identifier errors
    const mediumErrors = ['2531', '2532', '2533']; // Null/undefined errors

    if (criticalErrors.includes(errorCode)) return 'high';
    if (highErrors.includes(errorCode)) return 'medium';
    if (mediumErrors.includes(errorCode)) return 'low';
    
    return 'low';
  }

  async findTypeScriptFiles(directories) {
    const files = [];

    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        await this.scanDirectory(dir, files);
      }
    }

    return files;
  }

  async scanDirectory(dir, files) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await this.scanDirectory(fullPath, files);
      } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    }
  }

  addIssue(issue) {
    this.issues.push(issue);
  }

  async generateReport() {
    console.log(chalk.blue('\n📊 Type Safety Security Report\n'));

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.issues.forEach(issue => {
      severityCounts[issue.severity]++;
    });

    // 統計表示
    console.log('Code Analysis Statistics:');
    console.log(`  Files scanned: ${this.stats.totalFiles}`);
    console.log(`  Lines of code: ${this.stats.totalLines}`);
    console.log(`  Any type usage: ${this.stats.anyUsage}`);
    console.log(`  Type assertions: ${this.stats.typeAssertions}`);
    console.log(`  Unsafe operations: ${this.stats.unsafeOperations}`);
    console.log(`  Missing types: ${this.stats.missingTypes}\n`);

    // 問題サマリー
    console.log('Type Safety Issues:');
    console.log(chalk.red(`🔴 Critical: ${severityCounts.critical}`));
    console.log(chalk.red(`🔴 High: ${severityCounts.high}`));
    console.log(chalk.yellow(`🟡 Medium: ${severityCounts.medium}`));
    console.log(chalk.blue(`🔵 Low: ${severityCounts.low}`));
    console.log(`\nTotal Issues: ${this.issues.length}\n`);

    // 詳細表示（上位10件）
    if (this.issues.length > 0) {
      console.log('Top Issues:\n');

      const sortedIssues = this.issues
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 10);

      sortedIssues.forEach((issue, index) => {
        const severityColor = issue.severity === 'critical' || issue.severity === 'high' ? chalk.red :
                             issue.severity === 'medium' ? chalk.yellow : chalk.blue;
        
        console.log(`${index + 1}. ${severityColor(issue.description)} (${issue.severity.toUpperCase()})`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        if (issue.code) {
          console.log(`   Code: ${chalk.gray(issue.code)}`);
        }
        console.log(`   Fix: ${issue.suggestion}\n`);
      });

      if (this.issues.length > 10) {
        console.log(chalk.gray(`... and ${this.issues.length - 10} more issues\n`));
      }
    }

    // 型安全性スコア計算
    const maxPossibleScore = 100;
    const penalty = severityCounts.critical * 25 + 
                   severityCounts.high * 10 + 
                   severityCounts.medium * 5 + 
                   severityCounts.low * 1;
    
    const score = Math.max(0, maxPossibleScore - penalty);

    console.log(chalk.blue(`🔒 Type Safety Score: ${Math.round(score)}/100\n`));

    // 推奨事項
    console.log(chalk.blue('🛠️  Type Safety Recommendations:\n'));
    
    const recommendations = [
      '✅ Enable strict mode in TypeScript configuration',
      '✅ Avoid using any type - use specific types instead',
      '✅ Use type guards instead of type assertions',
      '✅ Add proper type annotations to all functions',
      '✅ Use readonly properties where appropriate',
      '✅ Implement proper null/undefined checking',
      '✅ Create comprehensive type definitions',
      '✅ Use utility types for type transformations',
      '✅ Implement runtime type validation for external data',
      '✅ Regular TypeScript compiler checks in CI/CD'
    ];

    recommendations.forEach(rec => console.log(rec));

    if (score >= 90) {
      console.log(chalk.green('\n🎉 Excellent type safety!'));
    } else if (score >= 70) {
      console.log(chalk.yellow('\n⚠️  Good type safety, minor improvements needed'));
    } else if (score >= 50) {
      console.log(chalk.yellow('\n🔶 Moderate type safety concerns'));
    } else {
      console.log(chalk.red('\n🚨 Critical type safety issues require immediate attention!'));
    }

    // JSON レポート出力
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        severityCounts,
        typeSafetyScore: Math.round(score),
        statistics: this.stats
      },
      issues: this.issues,
      recommendations
    };

    fs.writeFileSync('type-safety-report.json', JSON.stringify(report, null, 2));
    console.log(chalk.blue('\n📄 Detailed report saved to type-safety-report.json'));

    return report;
  }
}

// メイン実行
async function main() {
  console.log(chalk.bold.green('\n🛡️  TypeScript Type Safety Security Auditor\n'));

  const auditor = new TypeSafetyAuditor();
  const report = await auditor.auditProject();

  // 終了コード
  const exitCode = report.summary.severityCounts.critical > 0 ? 1 : 0;
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Type safety audit failed:'), error);
    process.exit(1);
  });
}

module.exports = { TypeSafetyAuditor };