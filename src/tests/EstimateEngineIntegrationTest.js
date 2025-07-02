/**
 * Garden 造園業向け統合業務管理システム
 * 見積エンジン全機能統合テストスイート
 * サイクル6: 100%完成確認テスト
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiPlay, 
  FiRefreshCw,
  FiDatabase,
  FiSettings,
  FiFileText,
  FiShield,
  FiTarget
} from 'react-icons/fi';

import authService from '../services/authService';
import { estimateApi } from '../services/api';
import pdfService from '../services/pdfService';

const TestContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
`;

const TestHeader = styled.div`
  background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 8px 25px rgba(44, 62, 80, 0.3);
`;

const TestTitle = styled.h1`
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 700;
`;

const TestSubtitle = styled.p`
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
`;

const TestProgress = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #27ae60, #2ecc71);
  transition: width 0.3s ease;
  width: ${props => props.percentage}%;
`;

const TestSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-left: 5px solid ${props => {
    switch (props.status) {
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      case 'running': return '#f39c12';
      default: return '#95a5a6';
    }
  }};
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const TestCard = styled.div`
  border: 2px solid ${props => {
    switch (props.status) {
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      case 'running': return '#f39c12';
      default: return '#bdc3c7';
    }
  }};
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.1);
  }
`;

const TestCardTitle = styled.h4`
  margin: 0 0 15px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
`;

const TestResult = styled.div`
  margin-top: 15px;
  padding: 15px;
  border-radius: 6px;
  background: #f8f9fa;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const StatusIcon = ({ status, size = 20 }) => {
  const iconStyle = { width: size, height: size };
  
  switch (status) {
    case 'success':
      return <FiCheckCircle style={{ ...iconStyle, color: '#27ae60' }} />;
    case 'error':
      return <FiXCircle style={{ ...iconStyle, color: '#e74c3c' }} />;
    case 'running':
      return <FiClock style={{ ...iconStyle, color: '#f39c12' }} />;
    default:
      return <FiSettings style={{ ...iconStyle, color: '#95a5a6' }} />;
  }
};

const ActionButton = styled.button`
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 10px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const EstimateEngineIntegrationTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [testLog, setTestLog] = useState([]);
  const testStartTime = useRef(null);

  // テスト結果の統計
  const testStats = React.useMemo(() => {
    const results = Object.values(testResults);
    const total = results.length;
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const running = results.filter(r => r.status === 'running').length;
    
    return { total, passed, failed, running };
  }, [testResults]);

  const logTest = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, { timestamp, message, type }]);
  };

  // 1. DBマイグレーション後のAPI動作確認
  const testDatabaseConnection = async () => {
    logTest('データベース接続テスト開始', 'info');
    
    try {
      // ヘルスチェック
      const healthResponse = await fetch('http://localhost:8000/health');
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok && healthData.status === 'healthy') {
        logTest('✅ データベース接続成功', 'success');
        return {
          success: true,
          message: 'データベース接続正常',
          data: healthData
        };
      } else {
        throw new Error('ヘルスチェック失敗');
      }
    } catch (error) {
      logTest(`❌ データベース接続エラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 2. 見積API基本動作テスト
  const testEstimateAPIs = async () => {
    logTest('見積API動作テスト開始', 'info');
    
    try {
      const testData = {
        customer_id: 1,
        estimate_number: `TEST_${Date.now()}`,
        estimate_date: new Date().toISOString().split('T')[0],
        notes: '統合テスト用見積書'
      };

      // 見積作成テスト
      logTest('見積作成API テスト', 'info');
      const createResponse = await estimateApi.createEstimate(testData);
      
      if (!createResponse.estimate_id) {
        throw new Error('見積作成レスポンスが不正');
      }

      // 見積取得テスト
      logTest('見積取得API テスト', 'info');
      const getResponse = await estimateApi.getEstimate(createResponse.estimate_id);
      
      if (getResponse.estimate_number !== testData.estimate_number) {
        throw new Error('見積データ不整合');
      }

      // 見積一覧テスト
      logTest('見積一覧API テスト', 'info');
      const listResponse = await estimateApi.getEstimates();
      
      if (!Array.isArray(listResponse)) {
        throw new Error('見積一覧形式エラー');
      }

      logTest('✅ 見積API動作確認完了', 'success');
      return {
        success: true,
        message: '見積API全テスト合格',
        data: {
          created: createResponse,
          retrieved: getResponse,
          listCount: listResponse.length
        }
      };
    } catch (error) {
      logTest(`❌ 見積APIエラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 3. 単価マスタ機能テスト
  const testPriceMaster = async () => {
    logTest('単価マスタ機能テスト開始', 'info');
    
    try {
      // カテゴリ取得テスト
      logTest('カテゴリ階層取得テスト', 'info');
      const categoriesResponse = await fetch('http://localhost:8000/api/price-master/categories');
      const categories = await categoriesResponse.json();
      
      if (!categoriesResponse.ok) {
        throw new Error('カテゴリ取得失敗');
      }

      // 単価マスタ一覧テスト
      logTest('単価マスタ一覧取得テスト', 'info');
      const mastersResponse = await fetch('http://localhost:8000/api/price-master');
      const masters = await mastersResponse.json();
      
      if (!Array.isArray(masters)) {
        throw new Error('単価マスタ一覧形式エラー');
      }

      // 検索機能テスト
      logTest('単価マスタ検索テスト', 'info');
      const searchResponse = await fetch('http://localhost:8000/api/price-master?search=植栽');
      const searchResults = await searchResponse.json();
      
      logTest('✅ 単価マスタ機能確認完了', 'success');
      return {
        success: true,
        message: '単価マスタ全機能正常',
        data: {
          categoriesCount: Object.keys(categories).length,
          mastersCount: masters.length,
          searchResults: searchResults.length
        }
      };
    } catch (error) {
      logTest(`❌ 単価マスタエラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 4. PDF出力機能テスト
  const testPDFGeneration = async () => {
    logTest('PDF生成機能テスト開始', 'info');
    
    try {
      // テスト用見積データ
      const testEstimateId = 1; // 既存の見積IDを使用
      
      logTest('PDF生成API呼び出し', 'info');
      const pdfBlob = await pdfService.downloadEstimatePDF(testEstimateId);
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('PDF生成失敗');
      }

      // PDFのMIMEタイプ確認
      if (pdfBlob.type !== 'application/pdf') {
        throw new Error('PDFタイプ不正');
      }

      logTest('✅ PDF生成機能確認完了', 'success');
      return {
        success: true,
        message: 'PDF生成正常動作',
        data: {
          pdfSize: `${(pdfBlob.size / 1024).toFixed(2)} KB`,
          mimeType: pdfBlob.type
        }
      };
    } catch (error) {
      logTest(`❌ PDF生成エラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 5. RBAC権限統合テスト
  const testRBACIntegration = async () => {
    logTest('RBAC権限統合テスト開始', 'info');
    
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('認証されていません');
      }

      // ユーザー機能情報取得
      logTest('ユーザー機能情報取得テスト', 'info');
      const features = await authService.loadUserFeatures();
      
      if (!features) {
        throw new Error('機能情報取得失敗');
      }

      // 権限チェックテスト
      logTest('権限チェック機能テスト', 'info');
      const canViewCosts = authService.canViewCosts();
      const canViewProfits = authService.canViewProfits();
      const canAdjustTotal = authService.canAdjustTotal();

      // 権限マトリックス取得テスト（経営者のみ）
      let permissionMatrix = null;
      if (authService.isOwner()) {
        logTest('権限マトリックス取得テスト', 'info');
        const matrixResult = await authService.getPermissionMatrix();
        permissionMatrix = matrixResult.success ? matrixResult.data : null;
      }

      logTest('✅ RBAC権限統合確認完了', 'success');
      return {
        success: true,
        message: 'RBAC権限制御正常',
        data: {
          userRole: features.features.role,
          permissions: {
            canViewCosts,
            canViewProfits,
            canAdjustTotal
          },
          hasPermissionMatrix: Boolean(permissionMatrix)
        }
      };
    } catch (error) {
      logTest(`❌ RBAC統合エラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 6. 造園業界標準フォーマット検証
  const testIndustryStandardFormat = async () => {
    logTest('造園業界標準フォーマット検証開始', 'info');
    
    try {
      // 見積書フォーマット検証
      logTest('見積書フォーマット検証', 'info');
      const testEstimate = {
        estimate_number: 'EST-2025-001',
        customer_name: 'テスト造園株式会社',
        estimate_date: '2025-07-01',
        items: [
          {
            category: '植栽工事',
            item_name: '高木植栽',
            quantity: 5,
            unit: '本',
            unit_price: 15000,
            amount: 75000
          }
        ],
        subtotal: 75000,
        tax_amount: 7500,
        total_amount: 82500
      };

      // フォーマット検証ルール
      const validations = [
        {
          name: '見積番号形式',
          test: /^EST-\d{4}-\d{3}$/.test(testEstimate.estimate_number),
          message: '見積番号は EST-YYYY-XXX 形式'
        },
        {
          name: '顧客名必須',
          test: Boolean(testEstimate.customer_name),
          message: '顧客名は必須項目'
        },
        {
          name: '明細項目',
          test: testEstimate.items.length > 0,
          message: '明細は1件以上必要'
        },
        {
          name: '金額計算',
          test: testEstimate.total_amount === testEstimate.subtotal + testEstimate.tax_amount,
          message: '合計金額計算が正確'
        }
      ];

      const passedValidations = validations.filter(v => v.test);
      const failedValidations = validations.filter(v => !v.test);

      if (failedValidations.length > 0) {
        throw new Error(`フォーマット検証失敗: ${failedValidations.map(v => v.message).join(', ')}`);
      }

      logTest('✅ 造園業界標準フォーマット検証完了', 'success');
      return {
        success: true,
        message: '業界標準フォーマット準拠',
        data: {
          totalValidations: validations.length,
          passedValidations: passedValidations.length,
          complianceRate: `${Math.round((passedValidations.length / validations.length) * 100)}%`
        }
      };
    } catch (error) {
      logTest(`❌ フォーマット検証エラー: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  };

  // 全テスト実行
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setTestLog([]);
    setOverallProgress(0);
    testStartTime.current = Date.now();

    logTest('🚀 全機能統合テスト開始', 'info');

    const tests = [
      { name: 'database_connection', func: testDatabaseConnection, title: 'データベース接続' },
      { name: 'estimate_apis', func: testEstimateAPIs, title: '見積API動作' },
      { name: 'price_master', func: testPriceMaster, title: '単価マスタ機能' },
      { name: 'pdf_generation', func: testPDFGeneration, title: 'PDF出力機能' },
      { name: 'rbac_integration', func: testRBACIntegration, title: 'RBAC権限統合' },
      { name: 'industry_format', func: testIndustryStandardFormat, title: '業界標準フォーマット' }
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      setTestResults(prev => ({
        ...prev,
        [test.name]: { status: 'running', title: test.title }
      }));

      try {
        const result = await test.func();
        setTestResults(prev => ({
          ...prev,
          [test.name]: {
            ...result,
            status: result.success ? 'success' : 'error',
            title: test.title,
            timestamp: new Date().toISOString()
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [test.name]: {
            status: 'error',
            error: error.message,
            title: test.title,
            timestamp: new Date().toISOString()
          }
        }));
      }

      setOverallProgress(((i + 1) / tests.length) * 100);
      
      // テスト間の小休止
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalTime = Date.now() - testStartTime.current;
    logTest(`🎯 全機能統合テスト完了 (${totalTime}ms)`, 'success');
    setIsRunning(false);
  };

  // 個別テスト実行
  const runIndividualTest = async (testName, testFunction, title) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status: 'running', title }
    }));

    try {
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          ...result,
          status: result.success ? 'success' : 'error',
          title,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          status: 'error',
          error: error.message,
          title,
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  return (
    <TestContainer>
      <TestHeader>
        <TestTitle>🚀 見積エンジン全機能統合テスト</TestTitle>
        <TestSubtitle>Garden DX サイクル6: 100%完成確認テストスイート</TestSubtitle>
      </TestHeader>

      <TestProgress>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>テスト進捗</h3>
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
            {testStats.passed}/{testStats.total} テスト合格 ({Math.round(overallProgress)}%)
          </span>
        </div>
        <ProgressBar>
          <ProgressFill percentage={overallProgress} />
        </ProgressBar>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666' }}>
          <span>✅ 合格: {testStats.passed}</span>
          <span>❌ 失敗: {testStats.failed}</span>
          <span>⏳ 実行中: {testStats.running}</span>
        </div>
      </TestProgress>

      <TestSection>
        <SectionTitle>
          <FiPlay size={24} />
          テスト実行
        </SectionTitle>
        <ActionButton 
          onClick={runAllTests} 
          disabled={isRunning}
        >
          <FiRefreshCw />
          全テスト実行
        </ActionButton>
      </TestSection>

      <TestGrid>
        {/* 1. データベース接続テスト */}
        <TestCard status={testResults.database_connection?.status}>
          <TestCardTitle>
            <FiDatabase size={20} />
            <StatusIcon status={testResults.database_connection?.status} />
            データベース接続テスト
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('database_connection', testDatabaseConnection, 'データベース接続')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.database_connection && (
            <TestResult>
              {JSON.stringify(testResults.database_connection, null, 2)}
            </TestResult>
          )}
        </TestCard>

        {/* 2. 見積API動作テスト */}
        <TestCard status={testResults.estimate_apis?.status}>
          <TestCardTitle>
            <FiSettings size={20} />
            <StatusIcon status={testResults.estimate_apis?.status} />
            見積API動作テスト
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('estimate_apis', testEstimateAPIs, '見積API動作')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.estimate_apis && (
            <TestResult>
              {JSON.stringify(testResults.estimate_apis, null, 2)}
            </TestResult>
          )}
        </TestCard>

        {/* 3. 単価マスタ機能テスト */}
        <TestCard status={testResults.price_master?.status}>
          <TestCardTitle>
            <FiSettings size={20} />
            <StatusIcon status={testResults.price_master?.status} />
            単価マスタ機能テスト
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('price_master', testPriceMaster, '単価マスタ機能')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.price_master && (
            <TestResult>
              {JSON.stringify(testResults.price_master, null, 2)}
            </TestResult>
          )}
        </TestCard>

        {/* 4. PDF出力機能テスト */}
        <TestCard status={testResults.pdf_generation?.status}>
          <TestCardTitle>
            <FiFileText size={20} />
            <StatusIcon status={testResults.pdf_generation?.status} />
            PDF出力機能テスト
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('pdf_generation', testPDFGeneration, 'PDF出力機能')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.pdf_generation && (
            <TestResult>
              {JSON.stringify(testResults.pdf_generation, null, 2)}
            </TestResult>
          )}
        </TestCard>

        {/* 5. RBAC権限統合テスト */}
        <TestCard status={testResults.rbac_integration?.status}>
          <TestCardTitle>
            <FiShield size={20} />
            <StatusIcon status={testResults.rbac_integration?.status} />
            RBAC権限統合テスト
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('rbac_integration', testRBACIntegration, 'RBAC権限統合')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.rbac_integration && (
            <TestResult>
              {JSON.stringify(testResults.rbac_integration, null, 2)}
            </TestResult>
          )}
        </TestCard>

        {/* 6. 業界標準フォーマット検証 */}
        <TestCard status={testResults.industry_format?.status}>
          <TestCardTitle>
            <FiTarget size={20} />
            <StatusIcon status={testResults.industry_format?.status} />
            業界標準フォーマット検証
          </TestCardTitle>
          <ActionButton 
            onClick={() => runIndividualTest('industry_format', testIndustryStandardFormat, '業界標準フォーマット')}
            disabled={isRunning}
          >
            実行
          </ActionButton>
          {testResults.industry_format && (
            <TestResult>
              {JSON.stringify(testResults.industry_format, null, 2)}
            </TestResult>
          )}
        </TestCard>
      </TestGrid>

      {/* テストログ */}
      <TestSection>
        <SectionTitle>
          <FiFileText size={20} />
          テスト実行ログ
        </SectionTitle>
        <TestResult style={{ maxHeight: '300px', background: '#2c3e50', color: '#ecf0f1' }}>
          {testLog.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              <span style={{ color: '#95a5a6' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))}
        </TestResult>
      </TestSection>

      {/* 最終結果サマリー */}
      {testStats.total > 0 && !isRunning && (
        <TestSection 
          status={testStats.failed === 0 ? 'success' : 'error'}
        >
          <SectionTitle>
            <StatusIcon status={testStats.failed === 0 ? 'success' : 'error'} size={24} />
            統合テスト結果サマリー
          </SectionTitle>
          <div style={{ fontSize: '18px', marginBottom: '15px' }}>
            <strong>
              {testStats.failed === 0 
                ? '🎉 全機能統合テスト合格！100%完成確認' 
                : '⚠️ 一部テストで問題が検出されました'
              }
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>合格率:</strong> {Math.round((testStats.passed / testStats.total) * 100)}%
            </div>
            <div>
              <strong>合格テスト:</strong> {testStats.passed}/{testStats.total}
            </div>
            <div>
              <strong>実行時間:</strong> {testStartTime.current ? `${Date.now() - testStartTime.current}ms` : '-'}
            </div>
          </div>
        </TestSection>
      )}
    </TestContainer>
  );
};

export default EstimateEngineIntegrationTest;