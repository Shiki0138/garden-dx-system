/**
 * Garden 造園業向け統合業務管理システム
 * 見積書・請求書統合テストパネル
 * Worker1 ⇔ Worker3 連携機能検証用
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiCheckCircle, FiXCircle, FiClock, FiDownload, FiEye } from 'react-icons/fi';

import invoiceIntegrationService from '../services/invoiceIntegrationService';
import pdfService from '../services/pdfService';

const TestPanelContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const TestHeader = styled.div`
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const TestTitle = styled.h1`
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 28px;
`;

const TestDescription = styled.p`
  color: #6c757d;
  font-size: 16px;
  line-height: 1.6;
`;

const TestSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const TestCard = styled.div`
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  background: ${props => {
    if (props.status === 'success') return '#d4edda';
    if (props.status === 'error') return '#f8d7da';
    if (props.status === 'running') return '#fff3cd';
    return '#f8f9fa';
  }};
`;

const TestCardTitle = styled.h4`
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2c3e50;
`;

const TestResult = styled.div`
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  background: white;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
`;

const ActionButton = styled.button`
  background: ${props => (props.variant === 'primary' ? '#007bff' : '#6c757d')};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'success':
      return <FiCheckCircle color="#28a745" />;
    case 'error':
      return <FiXCircle color="#dc3545" />;
    case 'running':
      return <FiClock color="#ffc107" />;
    default:
      return null;
  }
};

const IntegrationTestPanel = () => {
  const [testEstimateId, setTestEstimateId] = useState(1);
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [integrationData, setIntegrationData] = useState(null);

  // 個別テスト実行
  const runIndividualTest = async (testName, testFunction) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status: 'running', message: 'テスト実行中...' },
    }));

    try {
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          status: result.success ? 'success' : 'error',
          message: result.message || 'テスト完了',
          data: result.data || result.error,
          details: result,
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          status: 'error',
          message: error.message,
          data: error.toString(),
        },
      }));
    }
  };

  // 見積書PDF生成テスト
  const testEstimatePDF = async () => {
    try {
      await pdfService.downloadEstimatePDF(testEstimateId);
      return { success: true, message: '見積書PDF生成成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 請求書データ生成テスト
  const testInvoiceGeneration = async () => {
    const result = await invoiceIntegrationService.createInvoiceFromEstimate(testEstimateId);
    return result;
  };

  // 統合データ取得テスト
  const testIntegrationData = async () => {
    const result = await invoiceIntegrationService.getIntegratedEstimateInvoiceData(testEstimateId);
    if (result.success) {
      setIntegrationData(result);
    }
    return result;
  };

  // 統合PDF生成テスト
  const testIntegratedPDF = async () => {
    return invoiceIntegrationService.testIntegratedPDFGeneration(testEstimateId);
  };

  // 全テスト実行
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});

    const tests = [
      { name: 'estimate_pdf', func: testEstimatePDF, title: '見積書PDF生成' },
      { name: 'invoice_generation', func: testInvoiceGeneration, title: '請求書データ生成' },
      { name: 'integration_data', func: testIntegrationData, title: '統合データ取得' },
      { name: 'integrated_pdf', func: testIntegratedPDF, title: '統合PDF生成' },
    ];

    for (const test of tests) {
      await runIndividualTest(test.name, test.func);
      // テスト間に少し間隔を開ける
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  // フォーマット検証
  const validateFormats = () => {
    if (!integrationData) return null;

    return invoiceIntegrationService.validateIndustryStandardFormat(
      integrationData.estimate,
      integrationData.invoice_preview
    );
  };

  const formatValidation = validateFormats();

  return (
    <TestPanelContainer>
      {/* ヘッダー */}
      <TestHeader>
        <TestTitle>造園業界標準 見積書・請求書統合テスト</TestTitle>
        <TestDescription>
          Worker1 (見積書システム) と Worker3 (請求書システム) の連携機能を検証します。
          造園業界標準に準拠したPDF出力とデータ変換の動作確認を行います。
        </TestDescription>
      </TestHeader>

      {/* テスト設定 */}
      <TestSection>
        <SectionTitle>テスト設定</SectionTitle>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '10px' }}>テスト用見積ID:</label>
          <input
            type="number"
            value={testEstimateId}
            onChange={e => setTestEstimateId(parseInt(e.target.value, 10))}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <ActionButton variant="primary" onClick={runAllTests} disabled={isRunning}>
          {isRunning ? <FiClock /> : <FiCheckCircle />}
          全テスト実行
        </ActionButton>
      </TestSection>

      {/* 個別テスト結果 */}
      <TestSection>
        <SectionTitle>個別機能テスト</SectionTitle>
        <TestGrid>
          {/* 見積書PDF生成テスト */}
          <TestCard status={testResults.estimate_pdf?.status}>
            <TestCardTitle>
              <StatusIcon status={testResults.estimate_pdf?.status} />
              見積書PDF生成テスト
            </TestCardTitle>
            <ActionButton onClick={() => runIndividualTest('estimate_pdf', testEstimatePDF)}>
              <FiDownload /> テスト実行
            </ActionButton>
            {testResults.estimate_pdf && (
              <TestResult>{JSON.stringify(testResults.estimate_pdf, null, 2)}</TestResult>
            )}
          </TestCard>

          {/* 請求書データ生成テスト */}
          <TestCard status={testResults.invoice_generation?.status}>
            <TestCardTitle>
              <StatusIcon status={testResults.invoice_generation?.status} />
              請求書データ生成テスト
            </TestCardTitle>
            <ActionButton
              onClick={() => runIndividualTest('invoice_generation', testInvoiceGeneration)}
            >
              <FiEye /> テスト実行
            </ActionButton>
            {testResults.invoice_generation && (
              <TestResult>{JSON.stringify(testResults.invoice_generation, null, 2)}</TestResult>
            )}
          </TestCard>

          {/* 統合データ取得テスト */}
          <TestCard status={testResults.integration_data?.status}>
            <TestCardTitle>
              <StatusIcon status={testResults.integration_data?.status} />
              統合データ取得テスト
            </TestCardTitle>
            <ActionButton
              onClick={() => runIndividualTest('integration_data', testIntegrationData)}
            >
              <FiEye /> テスト実行
            </ActionButton>
            {testResults.integration_data && (
              <TestResult>
                統合ステータス:{' '}
                {JSON.stringify(testResults.integration_data.details?.integration_status, null, 2)}
              </TestResult>
            )}
          </TestCard>

          {/* 統合PDF生成テスト */}
          <TestCard status={testResults.integrated_pdf?.status}>
            <TestCardTitle>
              <StatusIcon status={testResults.integrated_pdf?.status} />
              統合PDF生成テスト
            </TestCardTitle>
            <ActionButton onClick={() => runIndividualTest('integrated_pdf', testIntegratedPDF)}>
              <FiDownload /> テスト実行
            </ActionButton>
            {testResults.integrated_pdf && (
              <TestResult>
                {JSON.stringify(testResults.integrated_pdf.details?.summary, null, 2)}
              </TestResult>
            )}
          </TestCard>
        </TestGrid>
      </TestSection>

      {/* 業界標準フォーマット検証 */}
      {formatValidation && (
        <TestSection>
          <SectionTitle>造園業界標準フォーマット検証</SectionTitle>
          <div style={{ marginBottom: '15px' }}>
            <strong>適合率: {formatValidation.scores.percentage}%</strong>
            {formatValidation.industry_standard_compliance ? ' ✅ 合格' : ' ❌ 要改善'}
          </div>
          <TestGrid>
            <TestCard status={formatValidation.scores.estimate >= 4 ? 'success' : 'error'}>
              <TestCardTitle>見積書検証</TestCardTitle>
              <div>
                スコア: {formatValidation.scores.estimate}/
                {Object.keys(formatValidation.validations.estimate).length}
              </div>
              <TestResult>
                {JSON.stringify(formatValidation.validations.estimate, null, 2)}
              </TestResult>
            </TestCard>

            <TestCard status={formatValidation.scores.invoice >= 4 ? 'success' : 'error'}>
              <TestCardTitle>請求書検証</TestCardTitle>
              <div>
                スコア: {formatValidation.scores.invoice}/
                {Object.keys(formatValidation.validations.invoice).length}
              </div>
              <TestResult>
                {JSON.stringify(formatValidation.validations.invoice, null, 2)}
              </TestResult>
            </TestCard>

            <TestCard status={formatValidation.scores.integration >= 2 ? 'success' : 'error'}>
              <TestCardTitle>統合検証</TestCardTitle>
              <div>
                スコア: {formatValidation.scores.integration}/
                {Object.keys(formatValidation.validations.integration).length}
              </div>
              <TestResult>
                {JSON.stringify(formatValidation.validations.integration, null, 2)}
              </TestResult>
            </TestCard>
          </TestGrid>
        </TestSection>
      )}

      {/* 使用ガイド */}
      <TestSection>
        <SectionTitle>連携機能使用ガイド</SectionTitle>
        {invoiceIntegrationService.getIntegrationGuide().map((step, index) => (
          <div
            key={index}
            style={{
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
            }}
          >
            <strong>
              ステップ {step.step}: {step.title}
            </strong>
            <p>{step.description}</p>
            <div>
              <strong>実行項目:</strong> {step.actions.join(', ')}
            </div>
          </div>
        ))}
      </TestSection>
    </TestPanelContainer>
  );
};

export default IntegrationTestPanel;
