/**
 * PDFGenerator動作確認テストコンポーネント
 */
import React from 'react';
import PDFGenerator from '../components/PDFGenerator';
import styled from 'styled-components';

const TestContainer = styled.div`
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
`;

const TestHeader = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const TestSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const TestInfo = styled.div`
  background: #e3f2fd;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #2196f3;
`;

const PDFGeneratorTest = () => {
  // テスト用のサンプルデータ
  const testData = {
    invoice_number: 'TEST-2024-001',
    customer_name: 'テスト造園株式会社',
    customer_address: '東京都新宿区テスト1-1-1',
    customer_phone: '03-TEST-0000',
    customer_contact: 'テスト太郎',
    project_name: 'テスト庭園工事プロジェクト',
    site_address: '東京都工事区工事1-1-1',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'PDFGenerator動作確認テスト',
    items: [
      {
        category: '植栽工事',
        item_name: 'ソメイヨシノ H3.0',
        quantity: 5,
        unit: '本',
        unit_price: 45000,
        amount: 225000,
        notes: '根回し済み、植栽保証付き',
      },
      {
        category: '外構工事',
        item_name: '自然石積み工事',
        quantity: 25,
        unit: 'm2',
        unit_price: 35000,
        amount: 875000,
        notes: '地元産石材使用',
      },
      {
        category: '造成工事',
        item_name: '土壌改良工事',
        quantity: 150,
        unit: 'm2',
        unit_price: 2000,
        amount: 300000,
        notes: '有機質土壌改良剤使用',
      },
    ],
    subtotal: 1400000,
    tax_amount: 140000,
    total_amount: 1540000,
  };

  const handlePDFGenerated = pdf => {
    console.log('PDF生成完了:', pdf);
  };

  const handleError = error => {
    console.error('PDFエラー:', error);
  };

  return (
    <TestContainer>
      <TestHeader>
        <h1>PDFGenerator 動作確認テスト</h1>
        <p>Garden DXシステムのPDF生成機能の動作確認とスマホ対応テストを行います。</p>
      </TestHeader>

      <TestSection>
        <TestInfo>
          <h3>テスト内容</h3>
          <ul>
            <li>PDF生成機能の動作確認</li>
            <li>プレビュー機能の動作確認</li>
            <li>スマホ表示・操作の確認</li>
            <li>エラーハンドリングの確認</li>
            <li>ファイルアップロード機能の確認</li>
          </ul>
        </TestInfo>

        <h3>請求書PDFテスト</h3>
        <PDFGenerator
          documentData={testData}
          documentType="invoice"
          onGenerated={handlePDFGenerated}
          onError={handleError}
          enableOptimization={true}
          showStats={true}
        />
      </TestSection>

      <TestSection>
        <h3>見積書PDFテスト</h3>
        <PDFGenerator
          documentData={testData}
          documentType="estimate"
          onGenerated={handlePDFGenerated}
          onError={handleError}
          enableOptimization={true}
          showStats={true}
        />
      </TestSection>

      <TestSection>
        <h3>サンプルデータテスト</h3>
        <PDFGenerator
          documentData={null}
          documentType="invoice"
          onGenerated={handlePDFGenerated}
          onError={handleError}
          enableOptimization={false}
          showStats={false}
        />
      </TestSection>
    </TestContainer>
  );
};

export default PDFGeneratorTest;
