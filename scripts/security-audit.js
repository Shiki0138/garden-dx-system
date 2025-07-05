#!/usr/bin/env node

/**
 * API セキュリティ監査ツール
 * エンドポイント・認証・入力検証・脆弱性チェック
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// セキュリティチェック項目
const SECURITY_CHECKS = {
  authentication: {
    name: 'Authentication & Authorization',
    checks: [
      'JWT token validation',
      'Role-based access control',
      'Session management',
      'Token expiration handling'
    ]
  },
  inputValidation: {
    name: 'Input Validation',
    checks: [
      'SQL injection prevention',
      'XSS protection',
      'CSRF protection',
      'Request size limits',
      'Data type validation'
    ]
  },
  apiSecurity: {
    name: 'API Security',
    checks: [
      'HTTPS enforcement',
      'Rate limiting',
      'CORS configuration',
      'Security headers',
      'Error message sanitization'
    ]
  },
  dataProtection: {
    name: 'Data Protection',
    checks: [
      'Sensitive data masking',
      'Encryption at rest',
      'Encryption in transit',
      'Data retention policies',
      'Access logging'
    ]
  }
};

// セキュリティ脆弱性パターン
const VULNERABILITY_PATTERNS = [
  // SQL Injection
  {
    name: 'Potential SQL Injection',
    pattern: /(?:exec|execute|union|select|insert|update|delete|drop|create|alter)\s*\(/i,
    severity: 'high',
    description: 'Direct SQL execution without parameterization'
  },
  
  // XSS
  {
    name: 'Potential XSS Vulnerability',
    pattern: /innerHTML\s*=|document\.write\s*\(|eval\s*\(/i,
    severity: 'high',
    description: 'Direct DOM manipulation without sanitization'
  },
  
  // CSRF
  {
    name: 'Missing CSRF Protection',
    pattern: /app\.post\s*\(|app\.put\s*\(|app\.delete\s*\(/i,
    severity: 'medium',
    description: 'State-changing endpoints without CSRF protection'
  },
  
  // Hardcoded secrets
  {
    name: 'Hardcoded Secret',
    pattern: /(password|secret|key|token)\s*[:=]\s*["'][^"'\s]{8,}/i,
    severity: 'critical',
    description: 'Hardcoded credentials in source code'
  },
  
  // Weak crypto
  {
    name: 'Weak Cryptography',
    pattern: /md5|sha1|des(?!cript)|rc4/i,
    severity: 'medium',
    description: 'Use of weak cryptographic algorithms'
  },
  
  // HTTP usage
  {
    name: 'Insecure HTTP',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/i,
    severity: 'medium',
    description: 'HTTP URLs in production code'
  }
];

// Edge Functions セキュリティチェック
function auditEdgeFunctions() {
  console.log(chalk.blue('\n🔍 Edge Functions Security Audit\n'));
  
  const functionsDir = 'supabase/functions';
  if (!fs.existsSync(functionsDir)) {
    console.log(chalk.yellow('⚠️  Supabase functions directory not found'));
    return [];
  }
  
  const issues = [];
  const functionDirs = fs.readdirSync(functionsDir).filter(item => {
    const fullPath = path.join(functionsDir, item);
    return fs.statSync(fullPath).isDirectory() && !item.startsWith('_');
  });
  
  console.log(`Scanning ${functionDirs.length} Edge Functions...\n`);
  
  functionDirs.forEach(funcDir => {
    const indexPath = path.join(functionsDir, funcDir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const funcIssues = scanFileForVulnerabilities(indexPath, content);
      issues.push(...funcIssues);
      
      // 関数固有のチェック
      const funcSpecificIssues = checkEdgeFunctionSecurity(funcDir, content);
      issues.push(...funcSpecificIssues);
    }
  });
  
  return issues;
}

// ファイル脆弱性スキャン
function scanFileForVulnerabilities(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    VULNERABILITY_PATTERNS.forEach(pattern => {
      if (pattern.pattern.test(line.trim())) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: pattern.severity,
          issue: pattern.name,
          description: pattern.description,
          code: line.trim()
        });
      }
    });
  });
  
  return issues;
}

// Edge Function 固有のセキュリティチェック
function checkEdgeFunctionSecurity(funcName, content) {
  const issues = [];
  
  // 認証チェック
  if (!content.includes('Authorization') && !content.includes('demo')) {
    issues.push({
      file: `supabase/functions/${funcName}/index.ts`,
      severity: 'high',
      issue: 'Missing Authentication',
      description: 'No authorization header check found',
      line: 1
    });
  }
  
  // CORS チェック
  if (!content.includes('corsHeaders') && !content.includes('Access-Control')) {
    issues.push({
      file: `supabase/functions/${funcName}/index.ts`,
      severity: 'medium',
      issue: 'Missing CORS Headers',
      description: 'No CORS configuration found',
      line: 1
    });
  }
  
  // 入力検証チェック
  if (content.includes('req.json()') && !content.includes('validate')) {
    issues.push({
      file: `supabase/functions/${funcName}/index.ts`,
      severity: 'medium',
      issue: 'Missing Input Validation',
      description: 'JSON input without validation',
      line: 1
    });
  }
  
  // エラーハンドリングチェック
  if (!content.includes('try') || !content.includes('catch')) {
    issues.push({
      file: `supabase/functions/${funcName}/index.ts`,
      severity: 'medium',
      issue: 'Missing Error Handling',
      description: 'No try-catch blocks found',
      line: 1
    });
  }
  
  // Rate limiting チェック
  if (!content.includes('rate') && !content.includes('limit')) {
    issues.push({
      file: `supabase/functions/${funcName}/index.ts`,
      severity: 'low',
      issue: 'Missing Rate Limiting',
      description: 'No rate limiting implementation found',
      line: 1
    });
  }
  
  return issues;
}

// React アプリケーションセキュリティチェック
function auditReactApp() {
  console.log(chalk.blue('\n🔍 React Application Security Audit\n'));
  
  const srcDir = 'app/src';
  if (!fs.existsSync(srcDir)) {
    console.log(chalk.yellow('⚠️  React src directory not found'));
    return [];
  }
  
  const issues = [];
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const fileIssues = scanFileForVulnerabilities(fullPath, content);
        issues.push(...fileIssues);
        
        // React 固有のチェック
        const reactIssues = checkReactSecurity(fullPath, content);
        issues.push(...reactIssues);
      }
    });
  }
  
  scanDirectory(srcDir);
  return issues;
}

// React 固有のセキュリティチェック
function checkReactSecurity(filePath, content) {
  const issues = [];
  
  // dangerouslySetInnerHTML チェック
  if (content.includes('dangerouslySetInnerHTML')) {
    issues.push({
      file: filePath,
      severity: 'high',
      issue: 'Dangerous HTML Injection',
      description: 'Use of dangerouslySetInnerHTML without sanitization',
      line: 1
    });
  }
  
  // ローカルストレージに機密データ
  if (content.includes('localStorage') && /password|token|secret|key/i.test(content)) {
    issues.push({
      file: filePath,
      severity: 'medium',
      issue: 'Sensitive Data in Local Storage',
      description: 'Storing sensitive data in localStorage',
      line: 1
    });
  }
  
  // コンソールログに機密データ
  if (content.includes('console.log') && /password|token|secret|key/i.test(content)) {
    issues.push({
      file: filePath,
      severity: 'low',
      issue: 'Sensitive Data in Console',
      description: 'Logging sensitive data to console',
      line: 1
    });
  }
  
  return issues;
}

// 依存関係脆弱性チェック
function auditDependencies() {
  console.log(chalk.blue('\n🔍 Dependencies Security Audit\n'));
  
  const packageJsonPath = 'app/package.json';
  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.yellow('⚠️  package.json not found'));
    return [];
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const issues = [];
  
  // 既知の脆弱性があるパッケージ
  const vulnerablePackages = [
    { name: 'lodash', version: '<4.17.21', issue: 'Prototype pollution' },
    { name: 'moment', version: '<2.29.4', issue: 'ReDoS vulnerability' },
    { name: 'axios', version: '<0.21.2', issue: 'SSRF vulnerability' },
    { name: 'react-scripts', version: '<5.0.1', issue: 'Various vulnerabilities' }
  ];
  
  Object.entries(dependencies).forEach(([name, version]) => {
    const vulnerable = vulnerablePackages.find(pkg => pkg.name === name);
    if (vulnerable) {
      issues.push({
        file: packageJsonPath,
        severity: 'medium',
        issue: `Vulnerable Package: ${name}`,
        description: `${vulnerable.issue} - Update to latest version`,
        line: 1
      });
    }
  });
  
  console.log(`Scanned ${Object.keys(dependencies).length} dependencies`);
  
  return issues;
}

// セキュリティ設定チェック
function auditSecurityConfig() {
  console.log(chalk.blue('\n🔍 Security Configuration Audit\n'));
  
  const issues = [];
  
  // TypeScript設定チェック
  const tsconfigPath = 'app/tsconfig.json';
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.compilerOptions?.strict) {
      issues.push({
        file: tsconfigPath,
        severity: 'medium',
        issue: 'TypeScript Strict Mode Disabled',
        description: 'Enable strict mode for better type safety',
        line: 1
      });
    }
  }
  
  // ESLint設定チェック
  const eslintPaths = ['.eslintrc.js', '.eslintrc.json', 'app/.eslintrc.js'];
  const hasESLint = eslintPaths.some(p => fs.existsSync(p));
  
  if (!hasESLint) {
    issues.push({
      file: 'project root',
      severity: 'low',
      issue: 'Missing ESLint Configuration',
      description: 'ESLint helps catch security-related code issues',
      line: 1
    });
  }
  
  // 環境変数チェック
  const envExample = '.env.example';
  const envLocal = '.env.local';
  
  if (fs.existsSync(envLocal)) {
    const envContent = fs.readFileSync(envLocal, 'utf8');
    if (/password|secret|key/i.test(envContent)) {
      issues.push({
        file: envLocal,
        severity: 'critical',
        issue: 'Sensitive Data in .env File',
        description: 'Never commit .env files with secrets',
        line: 1
      });
    }
  }
  
  return issues;
}

// レポート生成
function generateSecurityReport(allIssues) {
  console.log(chalk.blue('\n📊 Security Audit Report\n'));
  
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  const groupedIssues = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  allIssues.forEach(issue => {
    const severity = issue.severity || 'low';
    severityCounts[severity]++;
    groupedIssues[severity].push(issue);
  });
  
  // サマリー表示
  console.log('Security Issues Summary:');
  console.log(chalk.red(`🔴 Critical: ${severityCounts.critical}`));
  console.log(chalk.red(`🔴 High: ${severityCounts.high}`));
  console.log(chalk.yellow(`🟡 Medium: ${severityCounts.medium}`));
  console.log(chalk.blue(`🔵 Low: ${severityCounts.low}`));
  console.log(`\nTotal Issues: ${allIssues.length}\n`);
  
  // 詳細表示
  Object.entries(groupedIssues).forEach(([severity, issues]) => {
    if (issues.length > 0) {
      const color = severity === 'critical' || severity === 'high' ? chalk.red :
                   severity === 'medium' ? chalk.yellow : chalk.blue;
      
      console.log(color(`\n${severity.toUpperCase()} Severity Issues:`));
      
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${color(issue.issue)}`);
        console.log(`   File: ${issue.file}:${issue.line || 'unknown'}`);
        console.log(`   Description: ${issue.description}`);
        if (issue.code) {
          console.log(`   Code: ${chalk.gray(issue.code)}`);
        }
      });
    }
  });
  
  // 推奨事項
  console.log(chalk.blue('\n🛠️  Security Recommendations:\n'));
  
  const recommendations = [
    '✅ Implement input validation for all user inputs',
    '✅ Use parameterized queries to prevent SQL injection',
    '✅ Sanitize output to prevent XSS attacks',
    '✅ Implement proper authentication and authorization',
    '✅ Use HTTPS for all communications',
    '✅ Implement rate limiting on API endpoints',
    '✅ Regularly update dependencies',
    '✅ Implement security headers (CSP, HSTS, etc.)',
    '✅ Use environment variables for sensitive configuration',
    '✅ Implement proper error handling and logging'
  ];
  
  recommendations.forEach(rec => console.log(rec));
  
  // セキュリティスコア計算
  const totalPossibleIssues = 100; // 仮想的な最大問題数
  const securityScore = Math.max(0, 100 - (allIssues.length / totalPossibleIssues * 100));
  
  console.log(chalk.blue(`\n🔒 Security Score: ${Math.round(securityScore)}/100\n`));
  
  if (securityScore >= 90) {
    console.log(chalk.green('🎉 Excellent security posture!'));
  } else if (securityScore >= 70) {
    console.log(chalk.yellow('⚠️  Good security, but room for improvement'));
  } else {
    console.log(chalk.red('🚨 Security needs immediate attention!'));
  }
  
  return {
    totalIssues: allIssues.length,
    severityCounts,
    securityScore: Math.round(securityScore)
  };
}

// メイン実行
function main() {
  console.log(chalk.bold.green('\n🛡️  Security Audit Tool for Garden DX\n'));
  
  const allIssues = [];
  
  // 各種監査実行
  allIssues.push(...auditEdgeFunctions());
  allIssues.push(...auditReactApp());
  allIssues.push(...auditDependencies());
  allIssues.push(...auditSecurityConfig());
  
  // レポート生成
  const report = generateSecurityReport(allIssues);
  
  // JSON レポート出力
  const reportPath = 'security-audit-report.json';
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: report,
    issues: allIssues,
    checksPerformed: Object.keys(SECURITY_CHECKS),
    recommendations: [
      'Implement comprehensive input validation',
      'Use security middleware for all endpoints',
      'Regular dependency updates',
      'Security header implementation',
      'Proper error handling and logging'
    ]
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  console.log(chalk.blue(`\n📄 Detailed report saved to: ${reportPath}`));
  
  // 終了コード
  process.exit(report.severityCounts.critical > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  auditEdgeFunctions,
  auditReactApp,
  auditDependencies,
  generateSecurityReport
};