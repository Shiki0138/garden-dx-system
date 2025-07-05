#!/bin/bash

# Garden DX システム包括的セキュリティ監査スクリプト
# 全セキュリティチェックツールを統合実行

set -e

echo "🛡️  Garden DX System - Comprehensive Security Audit"
echo "=================================================="
echo

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログディレクトリ作成
AUDIT_DIR="security-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$AUDIT_DIR"

echo -e "${BLUE}📂 Audit results will be saved to: $AUDIT_DIR${NC}"
echo

# 1. TypeScript型安全性監査
echo -e "${BLUE}🔍 1. Running TypeScript Type Safety Audit...${NC}"
if node scripts/type-safety-audit.js > "$AUDIT_DIR/type-safety-audit.log" 2>&1; then
    echo -e "${GREEN}✅ Type safety audit completed${NC}"
else
    echo -e "${YELLOW}⚠️  Type safety issues found (see log)${NC}"
fi
mv type-safety-report.json "$AUDIT_DIR/" 2>/dev/null || true
echo

# 2. 依存関係脆弱性スキャン
echo -e "${BLUE}🔍 2. Running Dependency Vulnerability Scan...${NC}"
if node scripts/vulnerability-scan.js > "$AUDIT_DIR/vulnerability-scan.log" 2>&1; then
    echo -e "${GREEN}✅ Vulnerability scan completed${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities found (see log)${NC}"
fi
mv vulnerability-report.json "$AUDIT_DIR/" 2>/dev/null || true
echo

# 3. 一般的なセキュリティ監査
echo -e "${BLUE}🔍 3. Running General Security Audit...${NC}"
if node scripts/security-audit.js > "$AUDIT_DIR/security-audit.log" 2>&1; then
    echo -e "${GREEN}✅ Security audit completed${NC}"
else
    echo -e "${YELLOW}⚠️  Security issues found (see log)${NC}"
fi
mv security-audit-report.json "$AUDIT_DIR/" 2>/dev/null || true
echo

# 4. Deno Edge Functions セキュリティチェック
echo -e "${BLUE}🔍 4. Running Deno Edge Functions Security Check...${NC}"
cd supabase/functions
if deno run --allow-read --allow-write --allow-env scripts/security-check.ts > "../../$AUDIT_DIR/deno-security.log" 2>&1; then
    echo -e "${GREEN}✅ Deno security check completed${NC}"
else
    echo -e "${YELLOW}⚠️  Deno security issues found (see log)${NC}"
fi
mv security-report.json "../../$AUDIT_DIR/deno-security-report.json" 2>/dev/null || true
cd ../..
echo

# 5. npm audit実行
echo -e "${BLUE}🔍 5. Running npm audit...${NC}"
cd app
if npm audit --json > "../$AUDIT_DIR/npm-audit.json" 2>&1; then
    echo -e "${GREEN}✅ npm audit completed - no vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️  npm audit found vulnerabilities${NC}"
fi
cd ..
echo

# 6. ESLint セキュリティルール実行
echo -e "${BLUE}🔍 6. Running ESLint Security Rules...${NC}"
cd app
if npx eslint src --ext .js,.jsx,.ts,.tsx --format json > "../$AUDIT_DIR/eslint-security.json" 2>&1; then
    echo -e "${GREEN}✅ ESLint security check completed${NC}"
else
    echo -e "${YELLOW}⚠️  ESLint found security-related issues${NC}"
fi
cd ..
echo

# 7. バンドルセキュリティ分析
echo -e "${BLUE}🔍 7. Running Bundle Security Analysis...${NC}"
if node scripts/bundle-analyzer.js > "$AUDIT_DIR/bundle-analysis.log" 2>&1; then
    echo -e "${GREEN}✅ Bundle analysis completed${NC}"
else
    echo -e "${YELLOW}⚠️  Bundle analysis issues found${NC}"
fi
echo

# 統合レポート生成
echo -e "${BLUE}📊 Generating Integrated Security Report...${NC}"

# レポート統合スクリプト
cat > "$AUDIT_DIR/generate-summary.js" << 'EOF'
const fs = require('fs');
const path = require('path');

function loadJSONSafely(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.warn(`Could not load ${filePath}:`, error.message);
    }
    return null;
}

function generateSummary() {
    const reports = {
        typeSafety: loadJSONSafely('./type-safety-report.json'),
        vulnerabilities: loadJSONSafely('./vulnerability-report.json'),
        security: loadJSONSafely('./security-audit-report.json'),
        denoSecurity: loadJSONSafely('./deno-security-report.json'),
        npmAudit: loadJSONSafely('./npm-audit.json')
    };

    const summary = {
        timestamp: new Date().toISOString(),
        overallScore: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        categories: {},
        recommendations: []
    };

    // 各レポートからデータを集約
    Object.entries(reports).forEach(([category, report]) => {
        if (report) {
            const categoryData = {
                score: report.summary?.securityScore || report.summary?.typeSafetyScore || 0,
                issues: report.issues?.length || 0,
                critical: report.summary?.severityCounts?.critical || 0,
                high: report.summary?.severityCounts?.high || 0,
                medium: report.summary?.severityCounts?.medium || 0,
                low: report.summary?.severityCounts?.low || 0
            };

            summary.categories[category] = categoryData;
            summary.criticalIssues += categoryData.critical;
            summary.highIssues += categoryData.high;
            summary.mediumIssues += categoryData.medium;
            summary.lowIssues += categoryData.low;

            if (report.recommendations) {
                summary.recommendations.push(...report.recommendations);
            }
        }
    });

    // 全体スコア計算
    const scores = Object.values(summary.categories).map(cat => cat.score).filter(s => s > 0);
    summary.overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // レポート出力
    fs.writeFileSync('./security-summary.json', JSON.stringify(summary, null, 2));

    // コンソール出力
    console.log('\n🛡️  SECURITY AUDIT SUMMARY');
    console.log('=========================');
    console.log(`Overall Security Score: ${summary.overallScore}/100`);
    console.log(`Critical Issues: ${summary.criticalIssues}`);
    console.log(`High Issues: ${summary.highIssues}`);
    console.log(`Medium Issues: ${summary.mediumIssues}`);
    console.log(`Low Issues: ${summary.lowIssues}`);
    console.log(`Total Issues: ${summary.criticalIssues + summary.highIssues + summary.mediumIssues + summary.lowIssues}`);
    
    console.log('\nCategory Breakdown:');
    Object.entries(summary.categories).forEach(([category, data]) => {
        console.log(`  ${category}: ${data.score}/100 (${data.issues} issues)`);
    });

    if (summary.overallScore >= 80) {
        console.log('\n🎉 Excellent security posture!');
    } else if (summary.overallScore >= 60) {
        console.log('\n⚠️  Good security, some improvements needed');
    } else {
        console.log('\n🚨 Critical security issues require immediate attention!');
    }

    return summary.criticalIssues + summary.highIssues > 0 ? 1 : 0;
}

process.exit(generateSummary());
EOF

# 統合レポート実行
cd "$AUDIT_DIR"
node generate-summary.js
EXIT_CODE=$?
cd ..

# 結果表示
echo
echo -e "${BLUE}📄 Security audit completed!${NC}"
echo -e "${BLUE}📂 All reports saved to: $AUDIT_DIR${NC}"
echo
echo "Individual reports:"
echo "  - Type Safety: $AUDIT_DIR/type-safety-report.json"
echo "  - Vulnerabilities: $AUDIT_DIR/vulnerability-report.json"
echo "  - General Security: $AUDIT_DIR/security-audit-report.json"
echo "  - Deno Security: $AUDIT_DIR/deno-security-report.json"
echo "  - Summary: $AUDIT_DIR/security-summary.json"
echo

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Security audit passed!${NC}"
else
    echo -e "${RED}❌ Security audit found critical issues!${NC}"
fi

echo
echo "🔧 To view detailed reports:"
echo "  cat $AUDIT_DIR/security-summary.json"
echo "  cat $AUDIT_DIR/*.log"

exit $EXIT_CODE