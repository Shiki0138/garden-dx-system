/**
 * PDF生成パフォーマンステスト
 * Garden DXプロジェクト - PDF最適化効果測定
 */

import { generateLandscapingInvoicePDF } from '../utils/landscapingInvoicePDFGenerator';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getPDFOptimizer } from '../utils/pdfOptimizer';

// テストデータ生成
function generateTestData(itemCount = 100) {
  const items = [];
  const categories = ['植栽工事', '外構工事', '造成工事', '設備工事', 'その他工事'];

  for (let i = 0; i < itemCount; i++) {
    items.push({
      category: categories[Math.floor(Math.random() * categories.length)],
      item_name: `テスト項目 ${i + 1}`,
      description: `これはテスト項目です。詳細な説明文がここに入ります。${i}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      unit: ['本', 'm2', 'm3', 'm', '式'][Math.floor(Math.random() * 5)],
      unit_price: Math.floor(Math.random() * 100000) + 1000,
      amount: 0, // 計算される
      notes: i % 3 === 0 ? `備考: これは特別な注記です ${i}` : '',
    });

    items[i].amount = items[i].quantity * items[i].unit_price;
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax_amount = Math.floor(subtotal * 0.1);
  const total_amount = subtotal + tax_amount;

  return {
    invoice_number: 'TEST-2024-001',
    customer_name: 'テスト株式会社',
    customer_address: '東京都テスト区テスト1-1-1',
    customer_phone: '03-TEST-0000',
    customer_contact: 'テスト担当者',
    project_name: '大規模テストプロジェクト',
    site_address: '東京都工事区工事1-1-1',
    invoice_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items,
    subtotal,
    tax_amount,
    total_amount,
    notes: 'パフォーマンステスト用の請求書です',
  };
}

// パフォーマンス測定ユーティリティ
class PerformanceTester {
  constructor() {
    this.results = [];
  }

  async measure(name, func) {
    const startTime = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    let result;
    let error = null;

    try {
      result = await func();
    } catch (e) {
      error = e;
    }

    const endTime = performance.now();
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    const metrics = {
      name,
      duration: endTime - startTime,
      memoryDelta: endMemory - startMemory,
      memoryUsed: endMemory,
      success: !error,
      error: error?.message || null,
      timestamp: new Date().toISOString(),
    };

    this.results.push(metrics);
    return metrics;
  }

  getReport() {
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const avgMemory = this.results.reduce((sum, r) => sum + r.memoryDelta, 0) / this.results.length;
    const successRate = this.results.filter(r => r.success).length / this.results.length;

    return {
      totalTests: this.results.length,
      avgDuration: avgDuration.toFixed(2),
      avgMemoryDelta: `${(avgMemory / 1024 / 1024).toFixed(2)} MB`,
      successRate: `${(successRate * 100).toFixed(1)}%`,
      results: this.results,
    };
  }
}

// メインテスト関数
export async function runPDFPerformanceTests() {
  console.log('🚀 PDF生成パフォーマンステスト開始...\n');

  const tester = new PerformanceTester();
  const optimizer = getPDFOptimizer();

  // テストケース定義
  const testCases = [
    { name: '小規模データ（10項目）', itemCount: 10 },
    { name: '中規模データ（50項目）', itemCount: 50 },
    { name: '大規模データ（100項目）', itemCount: 100 },
    { name: '超大規模データ（500項目）', itemCount: 500 },
  ];

  // 各テストケースを実行
  for (const testCase of testCases) {
    console.log(`\n📊 ${testCase.name} のテスト実行中...`);

    const testData = generateTestData(testCase.itemCount);
    const companyInfo = {
      name: 'テスト造園株式会社',
      address: '東京都テスト区1-1-1',
      phone: '03-0000-0000',
      email: 'test@example.com',
    };

    // 1. 通常のPDF生成
    console.log('  - 通常生成テスト...');
    const normalResult = await tester.measure(`通常生成 - ${testCase.name}`, async () => {
      return await generateLandscapingInvoicePDF(testData, companyInfo);
    });
    console.log(`    ✅ 完了: ${normalResult.duration.toFixed(2)}ms`);

    // 2. 最適化PDF生成（初回）
    console.log('  - 最適化生成テスト（初回）...');
    const optimizedFirstResult = await tester.measure(
      `最適化生成（初回） - ${testCase.name}`,
      async () => {
        return await optimizer.generateOptimizedPDF({ ...testData, companyInfo }, async data =>
          generateLandscapingInvoicePDF(data, data.companyInfo)
        );
      }
    );
    console.log(`    ✅ 完了: ${optimizedFirstResult.duration.toFixed(2)}ms`);

    // 3. 最適化PDF生成（キャッシュヒット）
    console.log('  - 最適化生成テスト（キャッシュ）...');
    const optimizedCachedResult = await tester.measure(
      `最適化生成（キャッシュ） - ${testCase.name}`,
      async () => {
        return await optimizer.generateOptimizedPDF({ ...testData, companyInfo }, async data =>
          generateLandscapingInvoicePDF(data, data.companyInfo)
        );
      }
    );
    console.log(`    ✅ 完了: ${optimizedCachedResult.duration.toFixed(2)}ms`);

    // 改善率の計算
    const improvementFirst = (
      ((normalResult.duration - optimizedFirstResult.duration) / normalResult.duration) *
      100
    ).toFixed(1);
    const improvementCached = (
      ((normalResult.duration - optimizedCachedResult.duration) / normalResult.duration) *
      100
    ).toFixed(1);

    console.log(`\n  📈 改善率:`);
    console.log(`    - 初回: ${improvementFirst}%`);
    console.log(`    - キャッシュ: ${improvementCached}%`);
  }

  // バッチ処理テスト
  console.log('\n\n📊 バッチ処理テスト実行中...');
  const batchData = Array(10)
    .fill(null)
    .map((_, i) => ({
      ...generateTestData(20),
      invoice_number: `BATCH-2024-${i + 1}`,
    }));

  const batchResult = await tester.measure('バッチ生成（10件）', async () => {
    return await optimizer.generateBatchPDFs(
      batchData,
      async data => generateLandscapingInvoicePDF(data, { name: 'バッチテスト会社' }),
      { concurrency: 3 }
    );
  });
  console.log(
    `  ✅ 完了: ${batchResult.duration.toFixed(2)}ms (${(batchResult.duration / 10).toFixed(2)}ms/件)`
  );

  // 最終レポート
  console.log('\n\n📊 テスト結果サマリー');
  console.log('='.repeat(60));

  const report = tester.getReport();
  console.log(`総テスト数: ${report.totalTests}`);
  console.log(`平均処理時間: ${report.avgDuration}ms`);
  console.log(`平均メモリ変化: ${report.avgMemoryDelta}`);
  console.log(`成功率: ${report.successRate}`);

  // 最適化統計
  const optimizerStats = optimizer.getOptimizationStats();
  console.log('\n📊 最適化統計');
  console.log('='.repeat(60));
  console.log(`キャッシュヒット率: ${(optimizerStats.cache.hitRate * 100).toFixed(1)}%`);
  console.log(
    `キャッシュサイズ: ${optimizerStats.cache.currentSize} / ${optimizerStats.cache.maxSize}`
  );
  console.log(`キャッシュエントリ数: ${optimizerStats.cache.size}`);

  // メモリ使用状況
  if (optimizerStats.memory.supported) {
    console.log('\n💾 メモリ使用状況');
    console.log('='.repeat(60));
    console.log(`使用中: ${optimizerStats.memory.usedJSHeapSize}`);
    console.log(`総容量: ${optimizerStats.memory.totalJSHeapSize}`);
    console.log(`上限: ${optimizerStats.memory.jsHeapSizeLimit}`);
  }

  // 詳細結果の表示
  console.log('\n\n📋 詳細テスト結果');
  console.log('='.repeat(60));
  console.log('テスト名                                    時間(ms)    メモリ(MB)   結果');
  console.log('-'.repeat(60));

  report.results.forEach(result => {
    const name = result.name.padEnd(40);
    const duration = result.duration.toFixed(2).padStart(10);
    const memory = (result.memoryDelta / 1024 / 1024).toFixed(2).padStart(10);
    const status = result.success ? '✅' : '❌';
    console.log(`${name} ${duration} ${memory}   ${status}`);
  });

  return report;
}

// メモリリークテスト
export async function runMemoryLeakTest(iterations = 10) {
  console.log(`\n🔍 メモリリークテスト開始 (${iterations}回繰り返し)...\n`);

  const optimizer = getPDFOptimizer();
  const memoryReadings = [];

  for (let i = 0; i < iterations; i++) {
    const testData = generateTestData(50);

    // PDF生成
    await optimizer.generateOptimizedPDF(testData, async data =>
      generateLandscapingInvoicePDF(data, { name: 'メモリテスト会社' })
    );

    // メモリ読み取り
    if (performance.memory) {
      memoryReadings.push({
        iteration: i + 1,
        usedMemory: performance.memory.usedJSHeapSize,
        totalMemory: performance.memory.totalJSHeapSize,
      });
    }

    // 進捗表示
    if ((i + 1) % 5 === 0) {
      console.log(`  ${i + 1}/${iterations} 完了...`);
    }

    // GCのヒント
    if (global.gc && i % 5 === 0) {
      global.gc();
    }
  }

  // メモリリーク分析
  if (memoryReadings.length > 0) {
    const firstReading = memoryReadings[0].usedMemory;
    const lastReading = memoryReadings[memoryReadings.length - 1].usedMemory;
    const memoryGrowth = lastReading - firstReading;
    const growthPerIteration = memoryGrowth / iterations;

    console.log('\n📊 メモリ使用量分析');
    console.log('='.repeat(60));
    console.log(`初期メモリ: ${(firstReading / 1024 / 1024).toFixed(2)} MB`);
    console.log(`最終メモリ: ${(lastReading / 1024 / 1024).toFixed(2)} MB`);
    console.log(`メモリ増加: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`);
    console.log(`1回あたり: ${(growthPerIteration / 1024).toFixed(2)} KB`);

    // リーク判定
    const leakThreshold = 100 * 1024; // 100KB/iteration
    if (growthPerIteration > leakThreshold) {
      console.log('\n⚠️  警告: メモリリークの可能性があります！');
    } else {
      console.log('\n✅ メモリ使用量は正常範囲内です。');
    }
  }

  // クリーンアップ
  optimizer.cleanup();

  return memoryReadings;
}

// デフォルトエクスポート
export default {
  runPDFPerformanceTests,
  runMemoryLeakTest,
  generateTestData,
  PerformanceTester,
};
