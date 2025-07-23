import React, { useState } from 'react';
import styled from 'styled-components';
import { FiFileText, FiFile, FiDownload, FiEye, FiEdit2, FiPlus, FiPrinter } from 'react-icons/fi';
import jsPDF from 'jspdf';

const Container = styled.div`
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 20px;
  }
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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
  white-space: nowrap;

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
  flex-wrap: wrap;
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

  @media (max-width: 768px) {
    bottom: 20px;
    right: 20px;
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
  max-width: 900px;
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
  
  @media (max-width: 768px) {
    padding: 20px;
  }
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

const PreviewActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
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
      icon: <FiFileText size={30} />,
      type: 'standard'
    },
    {
      id: 2,
      name: '詳細見積書',
      description: '工事内容を詳細に記載する大規模工事向けテンプレート',
      icon: <FiFileText size={30} />,
      type: 'detailed'
    },
    {
      id: 3,
      name: 'シンプル見積書',
      description: '必要最小限の項目のみのシンプルなテンプレート',
      icon: <FiFileText size={30} />,
      type: 'simple'
    }
  ];

  const invoiceTemplates = [
    {
      id: 1,
      name: '標準請求書',
      description: '一般的な請求書フォーマット（振込先情報付き）',
      icon: <FiFile size={30} />,
      type: 'standard'
    },
    {
      id: 2,
      name: '明細付き請求書',
      description: '工事内容の明細を含む詳細な請求書',
      icon: <FiFile size={30} />,
      type: 'detailed'
    },
    {
      id: 3,
      name: 'シンプル請求書',
      description: '合計金額と振込先のみのシンプルな請求書',
      icon: <FiFile size={30} />,
      type: 'simple'
    }
  ];

  const templates = activeTab === 'estimate' ? estimateTemplates : invoiceTemplates;

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleDownload = async (template) => {
    // PDFを生成してダウンロード
    const doc = new jsPDF();
    
    if (activeTab === 'estimate') {
      doc.text('御見積書', 105, 20, { align: 'center' });
    } else {
      doc.text('請求書', 105, 20, { align: 'center' });
    }
    
    doc.save(`${template.name}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = (template) => {
    // テンプレート編集画面への遷移
    console.log('Edit template:', template);
  };

  const renderPreviewContent = () => {
    if (!selectedTemplate) return null;

    if (activeTab === 'estimate') {
      switch (selectedTemplate.type) {
        case 'standard':
          return <StandardEstimatePreview />;
        case 'detailed':
          return <DetailedEstimatePreview />;
        case 'simple':
          return <SimpleEstimatePreview />;
        default:
          return <StandardEstimatePreview />;
      }
    } else {
      switch (selectedTemplate.type) {
        case 'standard':
          return <StandardInvoicePreview />;
        case 'detailed':
          return <DetailedInvoicePreview />;
        case 'simple':
          return <SimpleInvoicePreview />;
        default:
          return <StandardInvoicePreview />;
      }
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
              <PreviewActions>
                <ActionButton onClick={handlePrint}>
                  <FiPrinter size={16} />
                  印刷
                </ActionButton>
                <ActionButton 
                  className="primary" 
                  onClick={() => handleDownload(selectedTemplate)}
                >
                  <FiDownload size={16} />
                  PDFダウンロード
                </ActionButton>
                <CloseButton onClick={() => setShowPreview(false)}>×</CloseButton>
              </PreviewActions>
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

// 標準見積書プレビュー
const StandardEstimatePreview = () => {
  const today = new Date();
  const validUntil = new Date(today.setMonth(today.getMonth() + 1));
  
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '28px' }}>御 見 積 書</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            〇〇建設 様
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            〒123-4567<br />
            東京都〇〇区〇〇町1-2-3<br />
            〇〇ビル 5階
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <table style={{ marginLeft: 'auto', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px', textAlign: 'right' }}>見積番号:</td>
                <td style={{ padding: '5px' }}>E-2024-0122</td>
              </tr>
              <tr>
                <td style={{ padding: '5px', textAlign: 'right' }}>見積日:</td>
                <td style={{ padding: '5px' }}>2024年1月22日</td>
              </tr>
              <tr>
                <td style={{ padding: '5px', textAlign: 'right' }}>有効期限:</td>
                <td style={{ padding: '5px' }}>2024年2月21日</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ 
        background: '#f8f8f8', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '16px', marginBottom: '10px' }}>
          件名: 〇〇邸 外構・造園工事
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d5a2d' }}>
          御見積金額: ¥1,650,000（税込）
        </div>
      </div>

      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        marginBottom: '30px',
        fontSize: '14px'
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', background: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', width: '40%' }}>工事項目</th>
            <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>数量</th>
            <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>単位</th>
            <th style={{ padding: '12px', textAlign: 'right', width: '20%' }}>単価</th>
            <th style={{ padding: '12px', textAlign: 'right', width: '20%' }}>金額</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>1. 整地工事</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>50</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>㎡</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥3,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥150,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>2. 芝生張り工事</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>30</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>㎡</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥5,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥150,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>3. 植栽工事（高木）</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>5</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>本</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥50,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥250,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>4. 植栽工事（低木）</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>20</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>本</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥8,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥160,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>5. 石積み工事</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>15</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>㎡</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥25,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥375,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>6. 諸経費</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥100,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥100,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>7. 廃材処分費</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥80,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥80,000</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '12px' }}>8. 運搬費</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥35,000</td>
            <td style={{ padding: '12px', textAlign: 'right' }}>¥35,000</td>
          </tr>
        </tbody>
      </table>

      <div style={{ 
        textAlign: 'right', 
        marginBottom: '40px',
        fontSize: '16px'
      }}>
        <table style={{ marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px', textAlign: 'right' }}>小計:</td>
              <td style={{ padding: '8px', textAlign: 'right', width: '120px' }}>¥1,500,000</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', textAlign: 'right' }}>消費税(10%):</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>¥150,000</td>
            </tr>
            <tr style={{ borderTop: '2px solid #333' }}>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>合計金額:</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>¥1,650,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ 
        borderTop: '2px solid #ddd', 
        paddingTop: '30px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <strong>備考</strong><br />
          ・上記金額には消費税が含まれております<br />
          ・天候により工期が変更になる場合があります<br />
          ・追加工事が発生した場合は別途お見積りいたします
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '10px' }}>
            <img src="/api/placeholder/150/50" alt="会社印" style={{ border: '1px solid #ddd' }} />
          </div>
          <div style={{ fontSize: '14px' }}>
            <strong>グリーンガーデン造園</strong><br />
            代表 山田 太郎<br />
            〒987-6543 東京都〇〇区緑町4-5-6<br />
            TEL: 03-1234-5678 / FAX: 03-1234-5679<br />
            Email: info@green-garden.jp
          </div>
        </div>
      </div>
    </div>
  );
};

// シンプル見積書プレビュー
const SimpleEstimatePreview = () => (
  <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>見 積 書</h1>
    
    <div style={{ marginBottom: '30px' }}>
      <div style={{ fontSize: '18px', marginBottom: '20px' }}>〇〇 様</div>
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        見積日: 2024年1月22日
      </div>
    </div>

    <div style={{ 
      fontSize: '24px', 
      fontWeight: 'bold', 
      textAlign: 'center',
      padding: '30px',
      background: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '30px'
    }}>
      見積金額: ¥1,650,000（税込）
    </div>

    <div style={{ marginBottom: '30px' }}>
      <strong>工事内容:</strong> 〇〇邸 外構・造園工事一式
    </div>

    <table style={{ width: '100%', marginBottom: '30px', fontSize: '16px' }}>
      <tbody>
        <tr>
          <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>工事費用</td>
          <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>¥1,500,000</td>
        </tr>
        <tr>
          <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>消費税(10%)</td>
          <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>¥150,000</td>
        </tr>
        <tr>
          <td style={{ padding: '10px', fontWeight: 'bold' }}>合計</td>
          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>¥1,650,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ textAlign: 'right', marginTop: '50px' }}>
      グリーンガーデン造園<br />
      TEL: 03-1234-5678
    </div>
  </div>
);

// 詳細見積書プレビュー
const DetailedEstimatePreview = () => (
  <div style={{ fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px' }}>御 見 積 書</h1>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
          〇〇建設株式会社 御中
        </div>
        <div style={{ fontSize: '14px' }}>
          プロジェクト名: 〇〇邸 新築外構工事<br />
          工事場所: 東京都〇〇区〇〇町1-2-3
        </div>
      </div>
        
      <div style={{ textAlign: 'right' }}>
        <table style={{ marginLeft: 'auto', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>見積番号:</td>
              <td style={{ padding: '5px' }}>E-2024-0122</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>見積日:</td>
              <td style={{ padding: '5px' }}>2024年1月22日</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>有効期限:</td>
              <td style={{ padding: '5px' }}>2024年2月21日</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>工期予定:</td>
              <td style={{ padding: '5px' }}>約30日間</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style={{ 
      background: 'linear-gradient(to right, #e8f5e8, #f0f8f0)', 
      padding: '25px', 
      borderRadius: '10px', 
      marginBottom: '30px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d5a2d' }}>
        御見積金額: ¥3,850,000（税込）
      </div>
    </div>

    <h3 style={{ marginBottom: '20px', color: '#2d5a2d' }}>【工事内訳明細】</h3>

    <table style={{ 
      width: '100%', 
      borderCollapse: 'collapse', 
      marginBottom: '20px',
      fontSize: '13px'
    }}>
      <thead>
        <tr style={{ background: '#2d5a2d', color: 'white' }}>
          <th style={{ padding: '10px', textAlign: 'left' }}>工事項目</th>
          <th style={{ padding: '10px', textAlign: 'left' }}>仕様・規格</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>数量</th>
          <th style={{ padding: '10px', textAlign: 'center' }}>単位</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>単価</th>
          <th style={{ padding: '10px', textAlign: 'right' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ background: '#f5f5f5' }}>
          <td colSpan="6" style={{ padding: '10px', fontWeight: 'bold' }}>1. 土工事</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>掘削工事</td>
          <td style={{ padding: '10px' }}>バックホウ0.4㎥級</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>80</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>㎥</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥3,500</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥280,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>残土処分</td>
          <td style={{ padding: '10px' }}>場外搬出・処分費込み</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>60</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>㎥</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥5,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥300,000</td>
        </tr>
        
        <tr style={{ background: '#f5f5f5' }}>
          <td colSpan="6" style={{ padding: '10px', fontWeight: 'bold' }}>2. 外構工事</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>コンクリート舗装</td>
          <td style={{ padding: '10px' }}>厚150mm、ワイヤーメッシュ入り</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>120</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>㎡</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥8,500</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥1,020,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>ブロック塀</td>
          <td style={{ padding: '10px' }}>CB120、H=1800、基礎込み</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>25</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>m</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥18,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥450,000</td>
        </tr>
        
        <tr style={{ background: '#f5f5f5' }}>
          <td colSpan="6" style={{ padding: '10px', fontWeight: 'bold' }}>3. 造園工事</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>芝生張り</td>
          <td style={{ padding: '10px' }}>高麗芝、目土・施肥込み</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>80</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>㎡</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥4,500</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥360,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>高木植栽</td>
          <td style={{ padding: '10px' }}>シマトネリコ H=3.0m</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>3</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>本</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥45,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥135,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>中木植栽</td>
          <td style={{ padding: '10px' }}>ヤマボウシ H=2.0m</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>5</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>本</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥25,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥125,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>低木植栽</td>
          <td style={{ padding: '10px' }}>ツツジ類 H=0.5m</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>50</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>本</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥3,500</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥175,000</td>
        </tr>
        
        <tr style={{ background: '#f5f5f5' }}>
          <td colSpan="6" style={{ padding: '10px', fontWeight: 'bold' }}>4. 付帯工事</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>自動散水システム</td>
          <td style={{ padding: '10px' }}>タイマー付き、配管工事込み</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥280,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥280,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>照明工事</td>
          <td style={{ padding: '10px' }}>LED庭園灯、配線工事込み</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>8</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>基</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥35,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥280,000</td>
        </tr>
        
        <tr style={{ background: '#f5f5f5' }}>
          <td colSpan="6" style={{ padding: '10px', fontWeight: 'bold' }}>5. 諸経費</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>現場管理費</td>
          <td style={{ padding: '10px' }}>安全管理・品質管理費</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥150,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥150,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '10px', paddingLeft: '20px' }}>一般管理費</td>
          <td style={{ padding: '10px' }}>事務管理費・保険料等</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '10px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥100,000</td>
          <td style={{ padding: '10px', textAlign: 'right' }}>¥100,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ 
      textAlign: 'right', 
      marginBottom: '30px',
      fontSize: '16px'
    }}>
      <table style={{ marginLeft: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>工事費計:</td>
            <td style={{ padding: '8px', textAlign: 'right', width: '150px' }}>¥3,500,000</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>消費税(10%):</td>
            <td style={{ padding: '8px', textAlign: 'right' }}>¥350,000</td>
          </tr>
          <tr style={{ borderTop: '3px double #333' }}>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px' }}>総合計:</td>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px' }}>¥3,850,000</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style={{ 
      border: '1px solid #ddd',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px'
    }}>
      <h4 style={{ marginBottom: '10px', color: '#2d5a2d' }}>【特記事項】</h4>
      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
        <li>本見積書の有効期限は発行日より30日間とさせていただきます</li>
        <li>工期は天候により変更となる場合があります</li>
        <li>地中障害物が発見された場合は、別途費用が発生する場合があります</li>
        <li>植栽の枯れ保証期間は、引き渡し後1年間とします（お客様の管理不足による枯れは除く）</li>
        <li>お支払い条件：着手時30%、中間時40%、完成時30%</li>
      </ul>
    </div>

    <div style={{ 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }}>
      <div style={{ fontSize: '13px' }}>
        <strong>【会社概要】</strong><br />
        建設業許可: 東京都知事許可（般-○）第○○○○○号<br />
        造園工事業・土木工事業・とび土工工事業
      </div>
        
      <div style={{ textAlign: 'right' }}>
        <div style={{ marginBottom: '10px' }}>
          <img src="/api/placeholder/150/60" alt="会社印" style={{ border: '1px solid #ddd' }} />
        </div>
        <div style={{ fontSize: '14px' }}>
          <strong>グリーンガーデン造園株式会社</strong><br />
          代表取締役 山田 太郎<br />
          〒987-6543 東京都〇〇区緑町4-5-6<br />
          TEL: 03-1234-5678 / FAX: 03-1234-5679<br />
          Email: info@green-garden.jp<br />
          担当: 営業部 佐藤
        </div>
      </div>
    </div>
  </div>
);

// 標準請求書プレビュー
const StandardInvoicePreview = () => (
  <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px' }}>請 求 書</h1>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          〇〇建設 御中
        </div>
      </div>
        
      <div style={{ textAlign: 'right' }}>
        <table style={{ marginLeft: 'auto', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>請求番号:</td>
              <td style={{ padding: '5px' }}>I-2024-0122</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>請求日:</td>
              <td style={{ padding: '5px' }}>2024年1月22日</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>お支払期限:</td>
              <td style={{ padding: '5px' }}>2024年2月29日</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style={{ marginBottom: '30px' }}>
      下記の通りご請求申し上げます。
    </div>

    <div style={{ 
      background: '#2d5a2d', 
      color: 'white',
      padding: '20px', 
      borderRadius: '8px', 
      marginBottom: '30px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
        ご請求金額: ¥1,650,000（税込）
      </div>
    </div>

    <div style={{ marginBottom: '30px' }}>
      <strong>件名:</strong> 〇〇邸 外構・造園工事代金
    </div>

    <table style={{ 
      width: '100%', 
      borderCollapse: 'collapse', 
      marginBottom: '30px',
      fontSize: '14px'
    }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #333', background: '#f5f5f5' }}>
          <th style={{ padding: '12px', textAlign: 'left' }}>項目</th>
          <th style={{ padding: '12px', textAlign: 'right' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>〇〇邸 外構・造園工事一式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥1,500,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ 
      textAlign: 'right', 
      marginBottom: '40px',
      fontSize: '16px'
    }}>
      <table style={{ marginLeft: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>小計:</td>
            <td style={{ padding: '8px', textAlign: 'right', width: '120px' }}>¥1,500,000</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>消費税(10%):</td>
            <td style={{ padding: '8px', textAlign: 'right' }}>¥150,000</td>
          </tr>
          <tr style={{ borderTop: '2px solid #333' }}>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>合計:</td>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>¥1,650,000</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style={{ 
      background: '#f8f8f8', 
      padding: '25px', 
      borderRadius: '8px', 
      marginBottom: '40px' 
    }}>
      <h3 style={{ marginBottom: '15px', color: '#2d5a2d' }}>【お振込先】</h3>
      <table style={{ fontSize: '15px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '5px', width: '100px' }}>銀行名:</td>
            <td style={{ padding: '5px' }}>〇〇銀行 〇〇支店</td>
          </tr>
          <tr>
            <td style={{ padding: '5px' }}>口座種別:</td>
            <td style={{ padding: '5px' }}>普通預金</td>
          </tr>
          <tr>
            <td style={{ padding: '5px' }}>口座番号:</td>
            <td style={{ padding: '5px' }}>1234567</td>
          </tr>
          <tr>
            <td style={{ padding: '5px' }}>口座名義:</td>
            <td style={{ padding: '5px' }}>グリーンガーデンゾウエン（カ</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
        ※恐れ入りますが、振込手数料はご負担願います。
      </div>
    </div>

    <div style={{ 
      borderTop: '2px solid #ddd', 
      paddingTop: '30px',
      textAlign: 'right'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <img src="/api/placeholder/150/60" alt="会社印" style={{ border: '1px solid #ddd' }} />
      </div>
      <div style={{ fontSize: '14px' }}>
        <strong>グリーンガーデン造園株式会社</strong><br />
        代表取締役 山田 太郎<br />
        〒987-6543 東京都〇〇区緑町4-5-6<br />
        TEL: 03-1234-5678 / FAX: 03-1234-5679<br />
        Email: info@green-garden.jp
      </div>
    </div>
  </div>
);

// シンプル請求書プレビュー
const SimpleInvoicePreview = () => (
  <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>請 求 書</h1>
    
    <div style={{ marginBottom: '30px' }}>
      <div style={{ fontSize: '18px', marginBottom: '20px' }}>〇〇 様</div>
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        請求日: 2024年1月22日
      </div>
    </div>

    <div style={{ 
      fontSize: '28px', 
      fontWeight: 'bold', 
      textAlign: 'center',
      padding: '30px',
      background: '#2d5a2d',
      color: 'white',
      borderRadius: '8px',
      marginBottom: '40px'
    }}>
      ご請求金額: ¥1,650,000
    </div>

    <div style={{ marginBottom: '40px' }}>
      <strong>件名:</strong> 〇〇邸 造園工事代金
    </div>

    <div style={{ 
      background: '#f5f5f5', 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '40px'
    }}>
      <strong>お振込先</strong><br />
      〇〇銀行 〇〇支店<br />
      普通 1234567<br />
      グリーンガーデンゾウエン（カ
    </div>

    <div style={{ textAlign: 'right' }}>
      グリーンガーデン造園<br />
      TEL: 03-1234-5678
    </div>
  </div>
);

// 明細付き請求書プレビュー
const DetailedInvoicePreview = () => (
  <div style={{ fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
    <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px' }}>請 求 書</h1>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
          〇〇建設株式会社 御中
        </div>
        <div style={{ fontSize: '14px' }}>
          経理部 御中
        </div>
      </div>
        
      <div style={{ textAlign: 'right' }}>
        <table style={{ marginLeft: 'auto', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>請求番号:</td>
              <td style={{ padding: '5px' }}>I-2024-0122</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>請求日:</td>
              <td style={{ padding: '5px' }}>2024年1月22日</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>工事完了日:</td>
              <td style={{ padding: '5px' }}>2024年1月20日</td>
            </tr>
            <tr>
              <td style={{ padding: '5px', textAlign: 'right' }}>お支払期限:</td>
              <td style={{ padding: '5px' }}>2024年2月29日</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style={{ marginBottom: '30px', fontSize: '16px' }}>
      下記の通りご請求申し上げます。
    </div>

    <div style={{ 
      background: 'linear-gradient(to right, #2d5a2d, #4a7c4a)', 
      color: 'white',
      padding: '25px', 
      borderRadius: '10px', 
      marginBottom: '30px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
        ご請求金額: ¥3,850,000（税込）
      </div>
    </div>

    <div style={{ marginBottom: '30px' }}>
      <table style={{ fontSize: '15px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '5px', width: '100px' }}>件名:</td>
            <td style={{ padding: '5px' }}><strong>〇〇邸 新築外構工事代金</strong></td>
          </tr>
          <tr>
            <td style={{ padding: '5px' }}>工事場所:</td>
            <td style={{ padding: '5px' }}>東京都〇〇区〇〇町1-2-3</td>
          </tr>
          <tr>
            <td style={{ padding: '5px' }}>工期:</td>
            <td style={{ padding: '5px' }}>2023年12月20日 〜 2024年1月20日</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style={{ marginBottom: '20px', color: '#2d5a2d' }}>【請求内訳明細】</h3>

    <table style={{ 
      width: '100%', 
      borderCollapse: 'collapse', 
      marginBottom: '30px',
      fontSize: '14px'
    }}>
      <thead>
        <tr style={{ background: '#2d5a2d', color: 'white' }}>
          <th style={{ padding: '12px', textAlign: 'left' }}>工事項目</th>
          <th style={{ padding: '12px', textAlign: 'center' }}>数量</th>
          <th style={{ padding: '12px', textAlign: 'center' }}>単位</th>
          <th style={{ padding: '12px', textAlign: 'right' }}>単価</th>
          <th style={{ padding: '12px', textAlign: 'right' }}>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>1. 土工事一式</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥580,000</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥580,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>2. 外構工事一式</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥1,470,000</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥1,470,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>3. 造園工事一式</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥795,000</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥795,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>4. 付帯工事一式</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥560,000</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥560,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid #ddd' }}>
          <td style={{ padding: '12px' }}>5. 諸経費一式</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>式</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥95,000</td>
          <td style={{ padding: '12px', textAlign: 'right' }}>¥95,000</td>
        </tr>
      </tbody>
    </table>

    <div style={{ 
      textAlign: 'right', 
      marginBottom: '40px',
      fontSize: '16px'
    }}>
      <table style={{ marginLeft: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>工事費計:</td>
            <td style={{ padding: '8px', textAlign: 'right', width: '150px' }}>¥3,500,000</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', textAlign: 'right' }}>消費税(10%):</td>
            <td style={{ padding: '8px', textAlign: 'right' }}>¥350,000</td>
          </tr>
          <tr style={{ borderTop: '3px double #333' }}>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px' }}>請求金額:</td>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px' }}>¥3,850,000</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style={{ 
      background: '#f8f8f8', 
      padding: '25px', 
      borderRadius: '8px', 
      marginBottom: '30px' 
    }}>
      <h3 style={{ marginBottom: '15px', color: '#2d5a2d' }}>【お振込先情報】</h3>
      <table style={{ fontSize: '15px', width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px', width: '120px', verticalAlign: 'top' }}>振込先銀行:</td>
            <td style={{ padding: '8px' }}>
              <strong>〇〇銀行 〇〇支店</strong><br />
              普通預金 1234567<br />
              口座名義: グリーンガーデンゾウエン（カ
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px', verticalAlign: 'top' }}>お支払条件:</td>
            <td style={{ padding: '8px' }}>
              月末締め翌月末払い<br />
              ※恐れ入りますが、振込手数料はご負担願います。
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style={{ 
      border: '1px solid #ddd',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px',
      fontSize: '13px'
    }}>
      <strong>【備考】</strong>
      <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
        <li>本請求書は工事完了確認書に基づいて発行しております</li>
        <li>ご不明な点がございましたら、下記担当までお問い合わせください</li>
        <li>領収書が必要な場合は、別途発行いたしますのでお申し付けください</li>
      </ul>
    </div>

    <div style={{ 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }}>
      <div style={{ fontSize: '13px' }}>
        <strong>【お問い合わせ】</strong><br />
        担当: 営業部 佐藤<br />
        直通: 03-1234-5688<br />
        Email: sato@green-garden.jp
      </div>
        
      <div style={{ textAlign: 'right' }}>
        <div style={{ marginBottom: '10px' }}>
          <img src="/api/placeholder/150/60" alt="会社印" style={{ border: '1px solid #ddd' }} />
        </div>
        <div style={{ fontSize: '14px' }}>
          <strong>グリーンガーデン造園株式会社</strong><br />
          代表取締役 山田 太郎<br />
          〒987-6543 東京都〇〇区緑町4-5-6<br />
          TEL: 03-1234-5678 / FAX: 03-1234-5679<br />
          Email: info@green-garden.jp<br />
          URL: www.green-garden.jp
        </div>
      </div>
    </div>
  </div>
);

export default DocumentTemplates;