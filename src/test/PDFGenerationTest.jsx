/**
 * PDF生成機能テストコンポーネント
 * 実際のPDF生成をテストして問題を特定
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  FileText, 
  Download,
  Bug,
  RotateCcw
} from 'lucide-react';

import PDFGenerator from '../components/PDFGenerator';
import PDFDebugger from '../components/PDFDebugger';
import { validateJapaneseFont } from '../utils/pdfFontManager';
import { safePDFGeneration, getUserFriendlyErrorMessage } from '../utils/pdfErrorHandler';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const TestContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const TestHeader = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const TestTitle = styled.h1`
  margin: 0 0 8px 0;
  color: #1a472a;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TestDescription = styled.p`
  color: #666;
  margin: 0;
  line-height: 1.6;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TestCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const CardTitle = styled.h3`
  margin: 0 0 16px 0;
  color: #1a472a;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TestButton = styled.button`
  background: #1a472a;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
  
  &:hover {
    background: #2d5a3d;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const TestResult = styled.div`
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  
  &.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }
  
  &.error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
  
  &.warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
  }
`;

const TestResultIcon = styled.div`
  margin-right: 8px;
  display: inline-block;
`;

const TestDetails = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const DebugToggle = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #1a472a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(26, 71, 42, 0.3);
  z-index: 1000;
  
  &:hover {
    background: #2d5a3d;
  }
`;

// テスト用サンプルデータ
const TEST_DATA = {
  simple: {
    id: 'test-001',
    type: 'estimate',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer: {
      name: '田中太郎',
      company: '株式会社テスト',
      address: '東京都新宿区テスト1-2-3',
      phone: '03-1234-5678',
      email: 'test@example.com'
    },
    items: [
      {
        id: 1,
        category: '植栽工事',
        description: '芝張り工事（高麗芝）',
        unit: 'm²',
        quantity: 50,
        unitPrice: 2500,
        amount: 125000
      },
      {
        id: 2,
        category: '造園工事',
        description: '庭石配置工事',
        unit: '式',
        quantity: 1,
        unitPrice: 80000,
        amount: 80000
      }
    ],
    subtotal: 205000,
    tax: 20500,
    total: 225500,
    notes: 'テスト用の見積書です。日本語フォント表示のテストを行います。'
  },
  
  complex: {
    id: 'test-002',
    type: 'invoice',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer: {
      name: '山田花子',
      company: '有限会社複雑テスト',
      address: '大阪府大阪市複雑区複雑町123-456-789',
      phone: '06-9876-5432',
      email: 'complex.test@example.com'
    },
    items: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      category: ['植栽工事', '造園工事', '土木工事', '維持管理'][i % 4],
      description: `テスト項目 ${i + 1} - 日本語長文説明テキスト。この項目は複雑なPDF生成のテストのために作成されました。`,
      unit: ['m²', '式', '本', 'kg'][i % 4],
      quantity: Math.floor(Math.random() * 100) + 1,
      unitPrice: Math.floor(Math.random() * 10000) + 1000,
      amount: 0
    })).map(item => ({ ...item, amount: item.quantity * item.unitPrice })),
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '複雑なテスト用データです。多数の項目、長い日本語テキスト、計算処理などを含んでいます。メモリ使用量とパフォーマンスのテストを目的としています。'
  }
};

// 合計金額を計算
TEST_DATA.complex.subtotal = TEST_DATA.complex.items.reduce((sum, item) => sum + item.amount, 0);
TEST_DATA.complex.tax = Math.floor(TEST_DATA.complex.subtotal * 0.1);
TEST_DATA.complex.total = TEST_DATA.complex.subtotal + TEST_DATA.complex.tax;

const PDFGenerationTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunningTest, setIsRunningTest] = useState(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const [debuggerData, setDebuggerData] = useState({});

  // 基本テスト実行
  const runBasicTest = async () => {
    setIsRunningTest('basic');
    const startTime = performance.now();
    
    try {
      // フォント検証
      const fontResult = validateJapaneseFont();
      
      // 簡単なPDF生成テスト
      const pdfResult = await safePDFGeneration(async () => {
        return await generateInvoicePDF(TEST_DATA.simple, {
          name: '庭想人株式会社',
          phone: '0745-48-3057',
          address: '奈良県葛城市太田262-1'
        });
      }, { testType: 'basic' });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => ({
        ...prev,
        basic: {
          success: pdfResult.success,
          font: fontResult,
          duration,
          error: pdfResult.error,
          timestamp: new Date().toISOString()
        }
      }));
      
      setDebuggerData(prev => ({
        ...prev,
        basicTest: pdfResult
      }));
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        basic: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setIsRunningTest(null);
    }
  };

  // パフォーマンステスト実行
  const runPerformanceTest = async () => {
    setIsRunningTest('performance');
    const startTime = performance.now();
    
    try {
      // メモリ使用量の記録
      const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // 複雑なデータでのPDF生成
      const pdfResult = await safePDFGeneration(async () => {
        return await generateInvoicePDF(TEST_DATA.complex, {
          name: '庭想人株式会社',
          phone: '0745-48-3057',
          address: '奈良県葛城市太田262-1'
        });
      }, { testType: 'performance' });
      
      const endTime = performance.now();
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      setTestResults(prev => ({
        ...prev,
        performance: {
          success: pdfResult.success,
          duration,
          memoryUsed,
          itemCount: TEST_DATA.complex.items.length,
          error: pdfResult.error,
          timestamp: new Date().toISOString()
        }
      }));
      
      setDebuggerData(prev => ({
        ...prev,
        performanceTest: pdfResult
      }));
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        performance: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setIsRunningTest(null);
    }
  };

  // エラーハンドリングテスト
  const runErrorTest = async () => {
    setIsRunningTest('error');
    
    try {
      // 意図的にエラーを発生させるテスト
      const pdfResult = await safePDFGeneration(async () => {
        // 不正なデータでPDF生成
        const invalidData = { ...TEST_DATA.simple };
        delete invalidData.customer;
        invalidData.items = null;
        
        return await generateInvoicePDF(invalidData, {});
      }, { testType: 'error' });
      
      setTestResults(prev => ({
        ...prev,
        error: {
          success: pdfResult.success,
          errorHandled: !pdfResult.success,
          error: pdfResult.error,
          userMessage: pdfResult.error ? getUserFriendlyErrorMessage(pdfResult.error) : null,
          timestamp: new Date().toISOString()
        }
      }));
      
      setDebuggerData(prev => ({
        ...prev,
        errorTest: pdfResult
      }));
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        error: {
          success: false,
          errorHandled: true,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setIsRunningTest(null);
    }
  };

  // すべてのテストをクリア
  const clearAllTests = () => {
    setTestResults({});
    setDebuggerData({});
  };

  const renderTestResult = (testName, result) => {
    if (!result) return null;

    const getResultClass = () => {
      if (testName === 'error') {
        return result.errorHandled ? 'success' : 'error';
      }
      return result.success ? 'success' : 'error';
    };

    const getResultIcon = () => {
      const className = getResultClass();
      if (className === 'success') return <CheckCircle size={16} />;
      if (className === 'error') return <X size={16} />;
      return <AlertTriangle size={16} />;
    };

    return (
      <TestResult className={getResultClass()}>
        <TestResultIcon>
          {getResultIcon()}
        </TestResultIcon>
        <strong>
          {getResultClass() === 'success' ? '成功' : '失敗'}
        </strong>
        
        {result.duration && (
          <TestDetails>
            実行時間: {result.duration.toFixed(2)}ms
          </TestDetails>
        )}
        
        {result.memoryUsed && (
          <TestDetails>
            メモリ使用量: {(result.memoryUsed / 1024 / 1024).toFixed(2)}MB
          </TestDetails>
        )}
        
        {result.font && (
          <TestDetails>
            日本語フォント: {result.font.isValid ? '利用可能' : '利用不可'}
          </TestDetails>
        )}
        
        {result.error && (
          <TestDetails>
            エラー: {result.error.message || result.error}
          </TestDetails>
        )}
        
        {result.userMessage && (
          <TestDetails>
            ユーザーメッセージ: {result.userMessage}
          </TestDetails>
        )}
      </TestResult>
    );
  };

  return (
    <>
      <TestContainer>
        <TestHeader>
          <TestTitle>
            <FileText size={24} />
            PDF生成機能テスト
          </TestTitle>
          <TestDescription>
            PDF生成機能の動作確認とデバッグを行います。各テストを実行して問題を特定し、修正に役立ててください。
          </TestDescription>
        </TestHeader>

        <TestGrid>
          {/* 基本テスト */}
          <TestCard>
            <CardTitle>
              <CheckCircle size={20} />
              基本機能テスト
            </CardTitle>
            <TestButton 
              onClick={runBasicTest} 
              disabled={isRunningTest === 'basic'}
            >
              <Play size={16} />
              {isRunningTest === 'basic' ? 'テスト実行中...' : 'テスト実行'}
            </TestButton>
            {renderTestResult('basic', testResults.basic)}
            <p style={{ color: '#666', fontSize: '14px' }}>
              シンプルなデータでPDF生成をテストします。日本語フォントの動作確認も含まれます。
            </p>
          </TestCard>

          {/* パフォーマンステスト */}
          <TestCard>
            <CardTitle>
              <AlertTriangle size={20} />
              パフォーマンステスト
            </CardTitle>
            <TestButton 
              onClick={runPerformanceTest} 
              disabled={isRunningTest === 'performance'}
            >
              <Play size={16} />
              {isRunningTest === 'performance' ? 'テスト実行中...' : 'テスト実行'}
            </TestButton>
            {renderTestResult('performance', testResults.performance)}
            <p style={{ color: '#666', fontSize: '14px' }}>
              大量データでのメモリ使用量と処理時間を測定します。
            </p>
          </TestCard>

          {/* エラーハンドリングテスト */}
          <TestCard>
            <CardTitle>
              <X size={20} />
              エラーハンドリングテスト
            </CardTitle>
            <TestButton 
              onClick={runErrorTest} 
              disabled={isRunningTest === 'error'}
            >
              <Play size={16} />
              {isRunningTest === 'error' ? 'テスト実行中...' : 'テスト実行'}
            </TestButton>
            {renderTestResult('error', testResults.error)}
            <p style={{ color: '#666', fontSize: '14px' }}>
              意図的にエラーを発生させてエラーハンドリング機能をテストします。
            </p>
          </TestCard>

          {/* PDF生成コンポーネントテスト */}
          <TestCard>
            <CardTitle>
              <FileText size={20} />
              統合コンポーネントテスト
            </CardTitle>
            <PDFGenerator 
              documentData={TEST_DATA.simple}
              documentType="invoice"
              enableOptimization={true}
              showStats={true}
              onGenerated={(pdf) => {
                console.log('PDF生成完了:', pdf);
              }}
              onError={(error) => {
                console.error('PDF生成エラー:', error);
              }}
            />
            <p style={{ color: '#666', fontSize: '14px' }}>
              実際のPDFGeneratorコンポーネントをテストします。
            </p>
          </TestCard>
        </TestGrid>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <TestButton onClick={clearAllTests}>
            <RotateCcw size={16} />
            全テスト結果をクリア
          </TestButton>
        </div>
      </TestContainer>

      <DebugToggle onClick={() => setShowDebugger(!showDebugger)}>
        <Bug size={20} />
      </DebugToggle>

      <PDFDebugger 
        isVisible={showDebugger}
        onClose={() => setShowDebugger(false)}
        pdfData={TEST_DATA.simple}
        generationResult={debuggerData.basicTest || debuggerData.performanceTest || debuggerData.errorTest}
      />
    </>
  );
};

export default PDFGenerationTest;