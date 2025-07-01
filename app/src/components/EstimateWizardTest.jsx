/**
 * Garden 造園業向け統合業務管理システム
 * 見積ウィザードテスト・デモコンポーネント
 * バージョンアップ実装: 造園事業者向け見積作成体験
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import EstimateWizard from './EstimateWizard';
import MockAuthProvider from './MockAuthProvider';
import { 
  FiPlay, 
  FiRefreshCw, 
  FiCheck, 
  FiFileText,
  FiArrowLeft,
  FiHome 
} from 'react-icons/fi';

const TestContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
  padding: 20px;
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
`;

const TestTitle = styled.h1`
  margin: 0 0 15px 0;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
`;

const TestSubtitle = styled.p`
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
`;

const TestControls = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
`;

const ControlButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  
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
      case 'danger':
        return `
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #c0392b, #a93226);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.3);
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
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

const DemoInfo = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-left: 4px solid #4a7c4a;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const DemoText = styled.div`
  color: #2d5a2d;
  
  h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.8;
  }
`;

const ResultPanel = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  
  h3 {
    color: #2d5a2d;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const ResultContent = styled.div`
  background: #f8fdf8;
  border: 1px solid #e8f5e8;
  border-radius: 8px;
  padding: 20px;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
`;

const EstimateWizardTest = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [result, setResult] = useState(null);
  const [testMode, setTestMode] = useState('new'); // 'new', 'edit'
  
  const handleStartWizard = (mode = 'new') => {
    setTestMode(mode);
    setShowWizard(true);
    setResult(null);
  };
  
  const handleWizardComplete = (estimateData) => {
    setResult({
      success: true,
      mode: testMode,
      data: estimateData,
      timestamp: new Date().toISOString()
    });
    setShowWizard(false);
  };
  
  const handleWizardCancel = () => {
    setResult({
      success: false,
      mode: testMode,
      cancelled: true,
      timestamp: new Date().toISOString()
    });
    setShowWizard(false);
  };
  
  const resetTest = () => {
    setShowWizard(false);
    setResult(null);
  };
  
  if (showWizard) {
    return (
      <MockAuthProvider>
        <EstimateWizard
          estimateId={testMode === 'edit' ? 1 : null}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </MockAuthProvider>
    );
  }
  
  return (
    <TestContainer>
      <TestHeader>
        <TestTitle>
          <FiFileText size={32} />
          見積ウィザード テスト環境
        </TestTitle>
        <TestSubtitle>
          造園業向け見積書作成ウィザードの動作確認・デモ
        </TestSubtitle>
      </TestHeader>
      
      <DemoInfo>
        <FiPlay size={24} color="#4a7c4a" />
        <DemoText>
          <h3>🌿 見積ウィザード機能テスト</h3>
          <p>
            4ステップウィザード形式で見積書を作成できます：
            <br />
            ① 基本情報（顧客・現場情報） → ② 要望詳細（プロジェクト内容） → ③ 項目入力（工事内容・単価） → ④ 金額調整（最終確認）
            <br />
            <strong>リアルタイム金額計算・一時保存・造園事業者向けUI</strong> が体験できます。
          </p>
        </DemoText>
      </DemoInfo>
      
      <TestControls>
        <ControlButton 
          variant="primary" 
          onClick={() => handleStartWizard('new')}
        >
          <FiPlay />
          新規見積作成テスト
        </ControlButton>
        
        <ControlButton 
          variant="secondary" 
          onClick={() => handleStartWizard('edit')}
        >
          <FiFileText />
          既存見積編集テスト
        </ControlButton>
        
        <ControlButton 
          variant="danger" 
          onClick={resetTest}
        >
          <FiRefreshCw />
          テストリセット
        </ControlButton>
        
        <ControlButton 
          variant="secondary" 
          onClick={() => window.history.back()}
        >
          <FiArrowLeft />
          メニューに戻る
        </ControlButton>
      </TestControls>
      
      {result && (
        <ResultPanel>
          <h3>
            {result.success ? (
              <>
                <FiCheck color="#4a7c4a" />
                見積ウィザード完了結果
              </>
            ) : (
              <>
                <FiHome color="#e74c3c" />
                見積ウィザードキャンセル
              </>
            )}
          </h3>
          
          <ResultContent>
            {result.success ? `
見積作成成功！

【作成モード】: ${result.mode === 'new' ? '新規作成' : '編集'}
【完了時刻】: ${new Date(result.timestamp).toLocaleString('ja-JP')}

【顧客情報】
・顧客名: ${result.data.customer_name || '未入力'}
・種別: ${result.data.customer_type === 'individual' ? '個人' : '法人'}
・電話番号: ${result.data.phone || '未入力'}
・住所: ${result.data.address || '未入力'}

【プロジェクト情報】
・プロジェクト名: ${result.data.project_name || '未入力'}
・見積日: ${result.data.estimate_date || '未入力'}
・有効期限: ${result.data.valid_until || '未入力'}
・予算範囲: ${result.data.budget_range || '未選択'}

【工事項目】
・項目数: ${result.data.items?.length || 0} 件
・小計: ¥${(result.data.subtotal || 0).toLocaleString()}
・調整額: ¥${(result.data.adjustment_amount || 0).toLocaleString()}
・合計金額: ¥${(result.data.total_amount || 0).toLocaleString()}
・仕入原価: ¥${(result.data.total_cost || 0).toLocaleString()}
・粗利益: ¥${(result.data.gross_profit || 0).toLocaleString()}
・粗利率: ${(result.data.gross_margin_rate || 0).toFixed(1)}%

【特記事項】
・特別要望: ${result.data.special_requirements || 'なし'}
・備考: ${result.data.notes || 'なし'}
・調整理由: ${result.data.adjustment_reason || 'なし'}

【デバッグ情報】
完全なデータ構造:
${JSON.stringify(result.data, null, 2)}
            ` : `
見積作成をキャンセルしました

【キャンセル時刻】: ${new Date(result.timestamp).toLocaleString('ja-JP')}
【モード】: ${result.mode === 'new' ? '新規作成' : '編集'}

ユーザーによってウィザードがキャンセルされました。
            `}
          </ResultContent>
        </ResultPanel>
      )}
    </TestContainer>
  );
};

export default EstimateWizardTest;