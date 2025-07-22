import React, { useState } from 'react';
import styled from 'styled-components';
import { FiFileText, FiFile, FiDownload, FiEye, FiEdit2, FiPlus } from 'react-icons/fi';

const Container = styled.div`
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  color: #2d5a2d;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Subtitle = styled.p`
  color: #666;
  font-size: 16px;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
`;

const Tab = styled.button`
  padding: 12px 24px;
  background: ${props => props.active ? '#4a7c4a' : 'transparent'};
  color: ${props => props.active ? 'white' : '#666'};
  border: none;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.active ? '#2d5a2d' : '#f5f5f5'};
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const TemplateCard = styled.div`
  background: white;
  border: 2px solid #e8f5e8;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    border-color: #4a7c4a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const TemplateIcon = styled.div`
  width: 60px;
  height: 60px;
  background: #e8f5e8;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  color: #4a7c4a;
`;

const TemplateName = styled.h3`
  color: #333;
  margin-bottom: 8px;
`;

const TemplateDescription = styled.p`
  color: #666;
  font-size: 14px;
  margin-bottom: 15px;
`;

const TemplateActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover {
    background: #f5f5f5;
    border-color: #4a7c4a;
  }

  &.primary {
    background: #4a7c4a;
    color: white;
    border-color: #4a7c4a;

    &:hover {
      background: #2d5a2d;
    }
  }
`;

const CreateButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(74, 124, 74, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(74, 124, 74, 0.4);
  }
`;

const PreviewModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const PreviewContent = styled.div`
  background: white;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 12px;
  overflow: auto;
  position: relative;
`;

const PreviewHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
`;

const PreviewBody = styled.div`
  padding: 40px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const DocumentTemplates = () => {
  const [activeTab, setActiveTab] = useState('estimate');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const estimateTemplates = [
    {
      id: 1,
      name: '標準見積書',
      description: '一般的な造園工事向けの標準的な見積書テンプレート',
      icon: <FiFileText size={30} />
    },
    {
      id: 2,
      name: '詳細見積書',
      description: '工事内容を詳細に記載する大規模工事向けテンプレート',
      icon: <FiFileText size={30} />
    },
    {
      id: 3,
      name: 'シンプル見積書',
      description: '必要最小限の項目のみのシンプルなテンプレート',
      icon: <FiFileText size={30} />
    }
  ];

  const invoiceTemplates = [
    {
      id: 1,
      name: '標準請求書',
      description: '一般的な請求書フォーマット（振込先情報付き）',
      icon: <FiFile size={30} />
    },
    {
      id: 2,
      name: '明細付き請求書',
      description: '工事内容の明細を含む詳細な請求書',
      icon: <FiFile size={30} />
    },
    {
      id: 3,
      name: '分割請求書',
      description: '着手金・中間金・完成金の分割請求に対応',
      icon: <FiFile size={30} />
    }
  ];

  const templates = activeTab === 'estimate' ? estimateTemplates : invoiceTemplates;

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleDownload = (template) => {
    // テンプレートのダウンロード処理
    console.log('Download template:', template);
  };

  const handleEdit = (template) => {
    // テンプレート編集画面への遷移
    console.log('Edit template:', template);
  };

  const renderPreviewContent = () => {
    if (!selectedTemplate) return null;

    if (activeTab === 'estimate') {
      return <EstimatePreview />;
    } else {
      return <InvoicePreview />;
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <FiFileText size={32} />
          様式テンプレート
        </Title>
        <Subtitle>
          見積書と請求書のテンプレートを管理・カスタマイズできます
        </Subtitle>
      </Header>

      <TabContainer>
        <Tab 
          active={activeTab === 'estimate'} 
          onClick={() => setActiveTab('estimate')}
        >
          見積書テンプレート
        </Tab>
        <Tab 
          active={activeTab === 'invoice'} 
          onClick={() => setActiveTab('invoice')}
        >
          請求書テンプレート
        </Tab>
      </TabContainer>

      <TemplateGrid>
        {templates.map(template => (
          <TemplateCard key={template.id}>
            <TemplateIcon>{template.icon}</TemplateIcon>
            <TemplateName>{template.name}</TemplateName>
            <TemplateDescription>{template.description}</TemplateDescription>
            <TemplateActions>
              <ActionButton onClick={() => handlePreview(template)}>
                <FiEye size={16} />
                プレビュー
              </ActionButton>
              <ActionButton onClick={() => handleEdit(template)}>
                <FiEdit2 size={16} />
                編集
              </ActionButton>
              <ActionButton className="primary" onClick={() => handleDownload(template)}>
                <FiDownload size={16} />
                使用
              </ActionButton>
            </TemplateActions>
          </TemplateCard>
        ))}
      </TemplateGrid>

      <CreateButton>
        <FiPlus size={30} />
      </CreateButton>

      {showPreview && (
        <PreviewModal onClick={() => setShowPreview(false)}>
          <PreviewContent onClick={(e) => e.stopPropagation()}>
            <PreviewHeader>
              <h2>{selectedTemplate?.name}</h2>
              <CloseButton onClick={() => setShowPreview(false)}>×</CloseButton>
            </PreviewHeader>
            <PreviewBody>
              {renderPreviewContent()}
            </PreviewBody>
          </PreviewContent>
        </PreviewModal>
      )}
    </Container>
  );
};

// 見積書プレビューコンポーネント
const EstimatePreview = () => (
  <div style={{ fontFamily: 'sans-serif' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>御見積書</h1>
    
    <div style={{ marginBottom: '30px' }}>
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        見積番号: E-2024-001<br />
        見積日: 2024年1月22日<br />
        有効期限: 2024年2月21日
      </div>
      
      <div>
        〇〇様<br />
        〒123-4567<br />
        東京都〇〇区〇〇1-2-3
      </div>
    </div>

    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
      見積金額: ¥1,650,000（税込）
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #333' }}>
          <th style={{ padding: '10px', textAlign: 'left' }}>項目</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>数量</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>単位</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>単価</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px' }}>土工事</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>50</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>m³</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥8,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥400,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px' }}>植栽工事</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>10</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>本</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥30,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥300,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ textAlign: 'right' }}>
      <div>小計: ¥1,500,000</div>
      <div>消費税(10%): ¥150,000</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>合計: ¥1,650,000</div>
    </div>

    <div style={{ marginTop: '40px', textAlign: 'right' }}>
      〇〇造園<br />
      〒987-6543<br />
      東京都〇〇区〇〇4-5-6<br />
      TEL: 03-1234-5678
    </div>
  </div>
);

// 請求書プレビューコンポーネント
const InvoicePreview = () => (
  <div style={{ fontFamily: 'sans-serif' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>請求書</h1>
    
    <div style={{ marginBottom: '30px' }}>
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        請求番号: I-2024-001<br />
        請求日: 2024年1月22日<br />
        お支払期限: 2024年2月29日
      </div>
      
      <div>
        〇〇様<br />
        〒123-4567<br />
        東京都〇〇区〇〇1-2-3
      </div>
    </div>

    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', textAlign: 'center', padding: '20px', background: '#f5f5f5' }}>
      ご請求金額: ¥1,650,000（税込）
    </div>

    <div style={{ marginBottom: '30px' }}>
      <strong>件名:</strong> 〇〇邸造園工事代金
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #333', background: '#f5f5f5' }}>
          <th style={{ padding: '10px', textAlign: 'left' }}>項目</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>数量</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>単位</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>単価</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px' }}>土工事</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>50</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>m³</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥8,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥400,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px' }}>植栽工事</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>10</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>本</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥30,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥300,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ textAlign: 'right', marginBottom: '30px' }}>
      <div>小計: ¥1,500,000</div>
      <div>消費税(10%): ¥150,000</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>合計: ¥1,650,000</div>
    </div>

    <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
      <strong>お振込先</strong><br />
      〇〇銀行 〇〇支店<br />
      普通預金 1234567<br />
      口座名義: 〇〇造園
    </div>

    <div style={{ marginTop: '40px', textAlign: 'right' }}>
      〇〇造園<br />
      代表 〇〇太郎<br />
      〒987-6543<br />
      東京都〇〇区〇〇4-5-6<br />
      TEL: 03-1234-5678<br />
      FAX: 03-1234-5679
    </div>
  </div>
);

export default DocumentTemplates;