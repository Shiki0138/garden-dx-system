/**
 * 見積ウィザードのモバイル対応テストページ
 * スマートフォンでの操作性確認専用
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import EstimateWizardPro from './EstimateWizardPro';
import EstimateWizardTest from './EstimateWizardTest';
import { FiSmartphone, FiMonitor, FiRefreshCw } from 'react-icons/fi';

const TestContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const TestHeader = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  border-radius: 16px;
  padding: 30px;
  color: white;
  box-shadow: 0 10px 30px rgba(45, 90, 45, 0.3);
  text-align: center;

  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 20px;
  }
`;

const TestTitle = styled.h1`
  margin: 0 0 15px 0;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  @media (max-width: 768px) {
    font-size: 24px;
    gap: 10px;
  }
`;

const TestControls = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 20px;
    gap: 15px;
  }
`;

const TestButton = styled.button`
  padding: 14px 28px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  min-height: 48px;
  touch-action: manipulation;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #7cb342, #4a7c4a);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #689f38, #2d5a2d);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(74, 124, 74, 0.3);
          }
        `;
      case 'secondary':
        return `
          background: #f8f9fa;
          color: #2d5a2d;
          border: 2px solid #e8f5e8;
          &:hover {
            background: #e8f5e8;
            border-color: #4a7c4a;
          }
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #f57c00, #e65100);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
          }
        `;
      default:
        return `
          background: #6c757d;
          color: white;
          &:hover {
            background: #5a6268;
          }
        `;
    }
  }}

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 16px 24px;
    font-size: 18px;
    min-height: 56px;
  }
`;

const InfoCard = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-left: 4px solid #4a7c4a;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    padding: 20px 15px;
    gap: 12px;
  }
`;

const MobileTestPage = () => {
  const [currentTest, setCurrentTest] = useState('menu');
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'mobile'

  const handleTestComplete = data => {
    console.log('Test completed:', data);
    alert('見積ウィザードのテストが完了しました！');
    setCurrentTest('menu');
  };

  const handleTestCancel = () => {
    console.log('Test cancelled');
    setCurrentTest('menu');
  };

  const resetTests = () => {
    setCurrentTest('menu');
    setDeviceMode('desktop');
    window.location.reload();
  };

  // デバイスモード切り替え
  const toggleDeviceMode = () => {
    setDeviceMode(prev => (prev === 'desktop' ? 'mobile' : 'desktop'));
  };

  if (currentTest === 'pro') {
    return (
      <EstimateWizardPro
        estimateId={null}
        onComplete={handleTestComplete}
        onCancel={handleTestCancel}
      />
    );
  }

  if (currentTest === 'test') {
    return <EstimateWizardTest />;
  }

  return (
    <TestContainer>
      <TestHeader>
        <TestTitle>
          <FiSmartphone size={32} />
          見積ウィザード モバイル対応テスト
        </TestTitle>
        <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
          スマートフォンでの操作性とレスポンシブデザインをテストできます
        </p>
      </TestHeader>

      <InfoCard>
        <FiMonitor size={24} color="#4a7c4a" />
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#2d5a2d' }}>📱 モバイル対応改善点</h3>
          <p style={{ margin: 0, color: '#2d5a2d', fontSize: '14px', lineHeight: 1.5 }}>
            • タッチターゲットサイズの最適化（最小48px）
            <br />
            • 入力フィールドのタッチ操作性向上
            <br />
            • ステップインジケーターのモバイル表示改善
            <br />
            • エラーメッセージの視認性向上
            <br />• iOS Safari のズーム無効化対応
          </p>
        </div>
      </InfoCard>

      <TestControls>
        <TestButton variant="primary" onClick={() => setCurrentTest('pro')}>
          <FiSmartphone />
          EstimateWizardPro テスト
        </TestButton>

        <TestButton variant="secondary" onClick={() => setCurrentTest('test')}>
          <FiMonitor />
          EstimateWizardTest テスト
        </TestButton>

        <TestButton variant="warning" onClick={toggleDeviceMode}>
          {deviceMode === 'desktop' ? <FiSmartphone /> : <FiMonitor />}
          {deviceMode === 'desktop' ? 'モバイル表示' : 'デスクトップ表示'}
        </TestButton>

        <TestButton variant="secondary" onClick={resetTests}>
          <FiRefreshCw />
          リセット
        </TestButton>
      </TestControls>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h3 style={{ color: '#2d5a2d', marginBottom: '20px' }}>✅ モバイル対応チェックリスト</h3>

        <div style={{ display: 'grid', gap: '15px' }}>
          <div
            style={{
              padding: '15px',
              background: '#f8fdf8',
              borderRadius: '8px',
              border: '1px solid #e8f5e8',
            }}
          >
            <strong style={{ color: '#2d5a2d' }}>タッチ操作性</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#666' }}>
              <li>ボタンサイズ: 最小44px（推奨48px）</li>
              <li>入力フィールド: タッチフレンドリーなサイズ</li>
              <li>タップハイライトの除去</li>
            </ul>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#f8fdf8',
              borderRadius: '8px',
              border: '1px solid #e8f5e8',
            }}
          >
            <strong style={{ color: '#2d5a2d' }}>レスポンシブレイアウト</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#666' }}>
              <li>768px以下での表示最適化</li>
              <li>グリッドレイアウトのモバイル対応</li>
              <li>フレックスボックスの適切な調整</li>
            </ul>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#f8fdf8',
              borderRadius: '8px',
              border: '1px solid #e8f5e8',
            }}
          >
            <strong style={{ color: '#2d5a2d' }}>フォームの操作性</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#666' }}>
              <li>入力フィールドのフォントサイズ: 16px以上</li>
              <li>エラーメッセージの視認性向上</li>
              <li>バリデーションのリアルタイム表示</li>
            </ul>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#f8fdf8',
              borderRadius: '8px',
              border: '1px solid #e8f5e8',
            }}
          >
            <strong style={{ color: '#2d5a2d' }}>iOS Safari 対応</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#666' }}>
              <li>ビューポート設定の最適化</li>
              <li>ズーム無効化とスケール制御</li>
              <li>Safe Area の考慮</li>
            </ul>
          </div>
        </div>
      </div>
    </TestContainer>
  );
};

export default MobileTestPage;
