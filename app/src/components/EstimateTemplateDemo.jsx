import React, { useState } from 'react';
import styled from 'styled-components';
import EstimateTemplate from './EstimateTemplate';
import EstimateTemplateProfessional from './EstimateTemplateProfessional';

const DemoContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  h1 {
    margin: 0;
    color: #2d5a3d;
    font-size: 24px;
  }
  
  p {
    margin: 10px 0 0 0;
    color: #666;
  }
`;

const ControlPanel = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const PrintButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 20px;
  transition: background-color 0.3s;
  
  &:hover {
    background: #45a049;
  }
  
  @media print {
    display: none;
  }
`;

const PreviewContainer = styled.div`
  background: #e0e0e0;
  padding: 20px;
  border-radius: 8px;
  overflow: auto;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
  
  @media print {
    background: white;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
  }
`;

const FormSection = styled.div`
  margin-bottom: 20px;
  
  h3 {
    margin: 0 0 15px 0;
    color: #2d5a3d;
    font-size: 18px;
    border-bottom: 2px solid #2d5a3d;
    padding-bottom: 5px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  
  label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    color: #333;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s;
    
    &:focus {
      outline: none;
      border-color: #4CAF50;
    }
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
    font-family: inherit;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Toggle = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  
  @media print {
    display: none;
  }
`;

const ToggleButton = styled.button`
  padding: 10px 20px;
  border: 2px solid #2d5a3d;
  background: ${props => props.active ? '#2d5a3d' : 'white'};
  color: ${props => props.active ? 'white' : '#2d5a3d'};
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
  
  &:hover {
    background: ${props => props.active ? '#245a32' : '#f0f8f0'};
  }
`;

const EstimateTemplateDemo = () => {
  const [showForm, setShowForm] = useState(true);
  const [templateType, setTemplateType] = useState('professional'); // 'standard' or 'professional'
  const [estimateData, setEstimateData] = useState({
    estimateNumber: 'No.1',
    date: new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    validityPeriod: '1ヶ月',
    clientName: '創建工房 緑 様',
    projectName: '山田様邸新築造園工事',
    location: '大阪府枚方市東香里南町20-10地内',
    period: '180日',
    taxRate: 10,
    companyName: '庭想人株式会社',
    companyAddress: '奈良県葛城市太田262-1 安井利典',
    companyTel: '0745-48-3057',
    companyMobile: '090-8937-1314',
    registrationNumber: 'T6150001027575',
    message: '拝啓 時下ますますご清栄のこととお喜び申し上げます。\n平素は格別のご高配を賜り、厚く御礼申し上げます。\n下記内容の通りお見積りを申し上げます。\nご検討の程よろしくお願い申し上げます。'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleInputChange = (field, value) => {
    setEstimateData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <DemoContainer>
      <Header>
        <h1>📄 見積書テンプレート</h1>
        <p>提供いただいた見積書を忠実に再現したテンプレートです。内容を編集して印刷プレビューで確認できます。</p>
      </Header>
      
      <Toggle>
        <ToggleButton 
          active={showForm} 
          onClick={() => setShowForm(true)}
        >
          編集モード
        </ToggleButton>
        <ToggleButton 
          active={!showForm} 
          onClick={() => setShowForm(false)}
        >
          プレビューのみ
        </ToggleButton>
        <PrintButton onClick={handlePrint}>
          🖨️ 印刷プレビュー
        </PrintButton>
      </Toggle>
      
      {showForm && (
        <ControlPanel>
          <FormSection>
            <h3>テンプレートスタイル</h3>
            <FormRow>
              <ToggleButton
                active={templateType === 'standard'}
                onClick={() => setTemplateType('standard')}
                style={{ flex: 1 }}
              >
                標準テンプレート
              </ToggleButton>
              <ToggleButton
                active={templateType === 'professional'}
                onClick={() => setTemplateType('professional')}
                style={{ flex: 1 }}
              >
                プロフェッショナル
              </ToggleButton>
            </FormRow>
          </FormSection>

          <FormSection>
            <h3>基本情報</h3>
            <FormRow>
              <FormGroup>
                <label>見積番号</label>
                <input
                  type="text"
                  value={estimateData.estimateNumber}
                  onChange={(e) => handleInputChange('estimateNumber', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <label>作成日</label>
                <input
                  type="text"
                  value={estimateData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <label>有効期限</label>
                <input
                  type="text"
                  value={estimateData.validityPeriod}
                  onChange={(e) => handleInputChange('validityPeriod', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <label>消費税率（%）</label>
                <input
                  type="number"
                  value={estimateData.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                />
              </FormGroup>
            </FormRow>
          </FormSection>

          <FormSection>
            <h3>お客様情報</h3>
            <FormGroup>
              <label>お客様名</label>
              <input
                type="text"
                value={estimateData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
              />
            </FormGroup>
            
            <FormGroup>
              <label>挨拶文</label>
              <textarea
                value={estimateData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="挨拶文を入力してください"
              />
            </FormGroup>
          </FormSection>

          <FormSection>
            <h3>工事情報</h3>
            <FormGroup>
              <label>工事名</label>
              <input
                type="text"
                value={estimateData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
              />
            </FormGroup>
            
            <FormGroup>
              <label>工事場所</label>
              <input
                type="text"
                value={estimateData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </FormGroup>
            
            <FormGroup>
              <label>工期</label>
              <input
                type="text"
                value={estimateData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
              />
            </FormGroup>
          </FormSection>
          
          <FormSection>
            <h3>会社情報</h3>
            <FormRow>
              <FormGroup>
                <label>会社名</label>
                <input
                  type="text"
                  value={estimateData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <label>登録番号</label>
                <input
                  type="text"
                  value={estimateData.registrationNumber}
                  onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                />
              </FormGroup>
            </FormRow>
            
            <FormGroup>
              <label>住所</label>
              <input
                type="text"
                value={estimateData.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
              />
            </FormGroup>
            
            <FormRow>
              <FormGroup>
                <label>電話/FAX</label>
                <input
                  type="text"
                  value={estimateData.companyTel}
                  onChange={(e) => handleInputChange('companyTel', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <label>携帯</label>
                <input
                  type="text"
                  value={estimateData.companyMobile}
                  onChange={(e) => handleInputChange('companyMobile', e.target.value)}
                />
              </FormGroup>
            </FormRow>
          </FormSection>
        </ControlPanel>
      )}
      
      <PreviewContainer>
        {templateType === 'professional' ? (
          <EstimateTemplateProfessional data={estimateData} />
        ) : (
          <EstimateTemplate data={estimateData} />
        )}
      </PreviewContainer>
    </DemoContainer>
  );
};

export default EstimateTemplateDemo;