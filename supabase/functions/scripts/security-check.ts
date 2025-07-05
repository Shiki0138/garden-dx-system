#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Deno Edge Functions セキュリティチェック
 * ランタイム権限・依存関係・コード品質監査
 */

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
}

interface SecurityReport {
  timestamp: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  issues: SecurityIssue[];
  score: number;
}

class DenoSecurityAuditor {
  private issues: SecurityIssue[] = [];

  async runFullAudit(): Promise<SecurityReport> {
    console.log('🔍 Starting Deno Security Audit...\n');

    await this.checkPermissions();
    await this.checkDependencies();
    await this.checkCodeQuality();
    await this.checkEnvironmentSecurity();
    await this.checkRuntimeSecurity();

    return this.generateReport();
  }

  private async checkPermissions(): Promise<void> {
    console.log('🔐 Checking Deno Permissions...');

    try {
      const denoConfig = await Deno.readTextFile('./deno.json');
      const config = JSON.parse(denoConfig);

      // 過度な権限チェック
      if (config.permissions?.['allow-all']) {
        this.addIssue({
          severity: 'critical',
          category: 'Permissions',
          description: 'allow-all permission grants excessive access',
          file: 'deno.json',
          suggestion: 'Use specific permissions instead of allow-all'
        });
      }

      // ネットワーク権限チェック
      const allowNet = config.permissions?.['allow-net'];
      if (Array.isArray(allowNet)) {
        allowNet.forEach(domain => {
          if (domain === '*' || domain.includes('*')) {
            this.addIssue({
              severity: 'high',
              category: 'Permissions',
              description: `Wildcard network permission: ${domain}`,
              file: 'deno.json',
              suggestion: 'Specify exact domains instead of wildcards'
            });
          }
        });
      } else if (allowNet === true) {
        this.addIssue({
          severity: 'medium',
          category: 'Permissions',
          description: 'Unrestricted network access allowed',
          file: 'deno.json',
          suggestion: 'Restrict network access to specific domains'
        });
      }

      // 書き込み権限チェック
      if (config.permissions?.['allow-write'] === true) {
        this.addIssue({
          severity: 'high',
          category: 'Permissions',
          description: 'Unrestricted write access allowed',
          file: 'deno.json',
          suggestion: 'Restrict write access to specific directories'
        });
      }

      // 実行権限チェック
      if (config.permissions?.['allow-run'] === true) {
        this.addIssue({
          severity: 'critical',
          category: 'Permissions',
          description: 'Unrestricted process execution allowed',
          file: 'deno.json',
          suggestion: 'Disable run permission unless absolutely necessary'
        });
      }

    } catch (error) {
      this.addIssue({
        severity: 'medium',
        category: 'Configuration',
        description: 'deno.json not found or invalid',
        suggestion: 'Create proper deno.json with security permissions'
      });
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking Dependencies...');

    try {
      // TypeScript/JavaScript ファイルをスキャン
      const files = await this.findTypeScriptFiles('./');
      
      for (const file of files) {
        const content = await Deno.readTextFile(file);
        await this.checkFileImports(file, content);
      }

    } catch (error) {
      console.error('Error checking dependencies:', error);
    }
  }

  private async checkFileImports(file: string, content: string): Promise<void> {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // HTTP imports without version pinning
      const httpImportMatch = line.match(/import.*from\s+['"]https?:\/\/[^'"]*['"];?/);
      if (httpImportMatch) {
        const url = httpImportMatch[0];
        
        // バージョン固定チェック
        if (!url.includes('@') || url.includes('@latest')) {
          this.addIssue({
            severity: 'medium',
            category: 'Dependencies',
            description: 'Unpinned or latest version dependency',
            file,
            line: index + 1,
            suggestion: 'Pin dependencies to specific versions'
          });
        }

        // HTTPS チェック
        if (url.startsWith('http://')) {
          this.addIssue({
            severity: 'high',
            category: 'Dependencies',
            description: 'Insecure HTTP import',
            file,
            line: index + 1,
            suggestion: 'Use HTTPS for all imports'
          });
        }

        // 信頼できないドメインチェック
        const trustedDomains = [
          'deno.land',
          'esm.sh',
          'cdn.skypack.dev',
          'unpkg.com'
        ];
        
        const domain = new URL(url.match(/https?:\/\/[^'"\/\s]+/)?.[0] || '').hostname;
        if (domain && !trustedDomains.includes(domain)) {
          this.addIssue({
            severity: 'low',
            category: 'Dependencies',
            description: `Dependency from untrusted domain: ${domain}`,
            file,
            line: index + 1,
            suggestion: 'Use well-known, trusted CDNs for dependencies'
          });
        }
      }

      // 動的インポート
      if (line.includes('import(') && !line.includes('//')) {
        this.addIssue({
          severity: 'medium',
          category: 'Dependencies',
          description: 'Dynamic import detected',
          file,
          line: index + 1,
          suggestion: 'Review dynamic imports for security implications'
        });
      }
    });
  }

  private async checkCodeQuality(): Promise<void> {
    console.log('🧹 Checking Code Quality...');

    const files = await this.findTypeScriptFiles('./');
    
    for (const file of files) {
      const content = await Deno.readTextFile(file);
      await this.checkFileQuality(file, content);
    }
  }

  private async checkFileQuality(file: string, content: string): Promise<void> {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // console.log in production
      if (trimmedLine.includes('console.log') && !trimmedLine.startsWith('//')) {
        this.addIssue({
          severity: 'low',
          category: 'Code Quality',
          description: 'console.log statement found',
          file,
          line: index + 1,
          suggestion: 'Remove console.log statements from production code'
        });
      }

      // TODO comments
      if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
        this.addIssue({
          severity: 'low',
          category: 'Code Quality',
          description: 'TODO/FIXME comment found',
          file,
          line: index + 1,
          suggestion: 'Resolve TODO/FIXME comments before deployment'
        });
      }

      // Hardcoded secrets pattern
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
        /secret\s*[:=]\s*['"][^'"]{8,}['"]/i,
        /token\s*[:=]\s*['"][^'"]{8,}['"]/i,
        /key\s*[:=]\s*['"][^'"]{8,}['"]/i
      ];

      secretPatterns.forEach(pattern => {
        if (pattern.test(trimmedLine)) {
          this.addIssue({
            severity: 'critical',
            category: 'Security',
            description: 'Potential hardcoded secret',
            file,
            line: index + 1,
            suggestion: 'Use environment variables for secrets'
          });
        }
      });

      // eval() usage
      if (trimmedLine.includes('eval(')) {
        this.addIssue({
          severity: 'high',
          category: 'Security',
          description: 'eval() function usage',
          file,
          line: index + 1,
          suggestion: 'Avoid eval() as it can execute arbitrary code'
        });
      }

      // setTimeout with string
      if (trimmedLine.includes('setTimeout') && trimmedLine.includes('"')) {
        this.addIssue({
          severity: 'medium',
          category: 'Security',
          description: 'setTimeout with string argument',
          file,
          line: index + 1,
          suggestion: 'Use function references instead of strings in setTimeout'
        });
      }
    });
  }

  private async checkEnvironmentSecurity(): Promise<void> {
    console.log('🌍 Checking Environment Security...');

    const envVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ENVIRONMENT'];
    
    for (const envVar of envVars) {
      const value = Deno.env.get(envVar);
      
      if (!value) {
        this.addIssue({
          severity: envVar.includes('KEY') ? 'high' : 'medium',
          category: 'Environment',
          description: `Missing environment variable: ${envVar}`,
          suggestion: `Set ${envVar} environment variable`
        });
      } else if (envVar.includes('KEY') && value.length < 32) {
        this.addIssue({
          severity: 'medium',
          category: 'Environment',
          description: `Weak ${envVar}: too short`,
          suggestion: 'Use a strong, long secret key'
        });
      }
    }

    // 開発環境での本番設定チェック
    const environment = Deno.env.get('ENVIRONMENT');
    if (environment === 'development') {
      const prodKeys = ['SUPABASE_SERVICE_ROLE_KEY'];
      
      for (const key of prodKeys) {
        const value = Deno.env.get(key);
        if (value && value.includes('prod')) {
          this.addIssue({
            severity: 'critical',
            category: 'Environment',
            description: `Production key in development: ${key}`,
            suggestion: 'Use development keys in development environment'
          });
        }
      }
    }
  }

  private async checkRuntimeSecurity(): Promise<void> {
    console.log('⚡ Checking Runtime Security...');

    // Deno.permissions API チェック
    try {
      const netStatus = await Deno.permissions.query({ name: 'net' });
      if (netStatus.state === 'granted') {
        // 実際に許可されているドメインを確認（可能であれば）
        this.addIssue({
          severity: 'low',
          category: 'Runtime',
          description: 'Network permissions granted',
          suggestion: 'Ensure network access is restricted to necessary domains'
        });
      }

      const writeStatus = await Deno.permissions.query({ name: 'write' });
      if (writeStatus.state === 'granted') {
        this.addIssue({
          severity: 'medium',
          category: 'Runtime',
          description: 'Write permissions granted',
          suggestion: 'Restrict write access to specific directories'
        });
      }

      const runStatus = await Deno.permissions.query({ name: 'run' });
      if (runStatus.state === 'granted') {
        this.addIssue({
          severity: 'high',
          category: 'Runtime',
          description: 'Run permissions granted',
          suggestion: 'Disable run permissions unless absolutely necessary'
        });
      }

    } catch (error) {
      // Permission API not available or restricted
      console.log('Runtime permission check skipped (restricted environment)');
    }
  }

  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        
        if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(fullPath);
        } else if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findTypeScriptFiles(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  private addIssue(issue: SecurityIssue): void {
    this.issues.push(issue);
  }

  private generateReport(): SecurityReport {
    const severityCounts = {
      critical: this.issues.filter(i => i.severity === 'critical').length,
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length
    };

    // セキュリティスコア計算 (100点満点)
    const score = Math.max(0, 100 - (
      severityCounts.critical * 25 +
      severityCounts.high * 10 +
      severityCounts.medium * 5 +
      severityCounts.low * 1
    ));

    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      criticalIssues: severityCounts.critical,
      highIssues: severityCounts.high,
      mediumIssues: severityCounts.medium,
      lowIssues: severityCounts.low,
      issues: this.issues,
      score: Math.round(score)
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: SecurityReport): void {
    console.log('\n📊 Deno Security Audit Report\n');
    console.log(`🔴 Critical: ${report.criticalIssues}`);
    console.log(`🟠 High: ${report.highIssues}`);
    console.log(`🟡 Medium: ${report.mediumIssues}`);
    console.log(`🔵 Low: ${report.lowIssues}`);
    console.log(`\nTotal Issues: ${report.totalIssues}`);
    console.log(`Security Score: ${report.score}/100\n`);

    if (report.issues.length > 0) {
      console.log('Issues Found:\n');
      
      report.issues.forEach((issue, index) => {
        const emoji = issue.severity === 'critical' ? '🚨' :
                     issue.severity === 'high' ? '⚠️' :
                     issue.severity === 'medium' ? '🔶' : '💡';
        
        console.log(`${emoji} ${index + 1}. ${issue.description}`);
        console.log(`   Category: ${issue.category}`);
        if (issue.file) {
          console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        console.log(`   Suggestion: ${issue.suggestion}\n`);
      });
    }

    if (report.score >= 90) {
      console.log('🎉 Excellent security posture!');
    } else if (report.score >= 70) {
      console.log('⚠️ Good security, but room for improvement');
    } else if (report.score >= 50) {
      console.log('🔶 Moderate security issues found');
    } else {
      console.log('🚨 Critical security issues require immediate attention!');
    }
  }
}

// メイン実行
if (import.meta.main) {
  const auditor = new DenoSecurityAuditor();
  const report = await auditor.runFullAudit();
  
  // JSON レポート出力
  await Deno.writeTextFile(
    './security-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Report saved to security-report.json');
  
  // 終了コード（Critical issues がある場合は1）
  Deno.exit(report.criticalIssues > 0 ? 1 : 0);
}