import React, { useState } from 'react';
import styled from 'styled-components';

const EstimateContainer = styled.div`
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: white;
  padding: 15mm 20mm;
  font-family: 'Noto Sans JP', 'MS Gothic', sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: #000;
  position: relative;
  
  @media print {
    margin: 0;
    padding: 10mm 15mm;
    page-break-inside: avoid;
  }
`;

const PageBreak = styled.div`
  page-break-after: always;
  
  @media print {
    margin-bottom: 0;
  }
`;

const DocumentTitle = styled.h1`
  text-align: center;
  font-size: 24pt;
  font-weight: bold;
  margin: 10mm 0;
  text-decoration: underline;
`;

const EstimateBasicInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15mm;
  
  .left-info {
    width: 48%;
    
    .estimate-number {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5mm;
    }
    
    .issue-date, .validity-period {
      margin-bottom: 3mm;
      
      .label {
        font-weight: bold;
        margin-right: 10mm;
      }
    }
  }
  
  .right-info {
    width: 48%;
    text-align: right;
    
    .total-amount {
      font-size: 18pt;
      font-weight: bold;
      border: 2px solid #000;
      padding: 8mm;
      background: #f9f9f9;
      margin-bottom: 5mm;
    }
    
    .tax-info {
      font-size: 10pt;
      color: #666;
    }
  }
`;

const ClientSection = styled.div`
  margin-bottom: 15mm;
  
  .client-address {
    margin-bottom: 5mm;
    font-size: 11pt;
  }
  
  .client-name {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 10mm;
    padding-bottom: 2mm;
    border-bottom: 2px solid #000;
  }
`;

const CompanySection = styled.div`
  position: absolute;
  right: 20mm;
  top: 80mm;
  width: 70mm;
  text-align: right;
  border: 1px solid #000;
  padding: 5mm;
  background: #f9f9f9;
  
  .company-name {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 3mm;
  }
  
  .registration-number {
    font-size: 9pt;
    margin-bottom: 3mm;
    color: #666;
  }
  
  .contact-info {
    font-size: 9pt;
    line-height: 1.3;
    margin-bottom: 5mm;
  }
  
  .representative {
    font-size: 10pt;
    font-weight: bold;
    margin-bottom: 5mm;
  }
  
  .stamp-area {
    display: flex;
    gap: 5mm;
    justify-content: flex-end;
    
    .stamp-box {
      width: 15mm;
      height: 15mm;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      background: white;
    }
  }
`;

const ProjectInfo = styled.div`
  margin-bottom: 15mm;
  
  .project-title {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 5mm;
    border-bottom: 1px solid #000;
    padding-bottom: 2mm;
  }
  
  .info-table {
    width: 100%;
    border-collapse: collapse;
    
    tr {
      border-bottom: 1px solid #ddd;
      
      td {
        padding: 3mm 5mm;
        
        &.label {
          width: 30%;
          background: #f5f5f5;
          font-weight: bold;
          border-right: 1px solid #ddd;
        }
        
        &.value {
          width: 70%;
        }
      }
    }
  }
`;

const ItemTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15mm;
  font-size: 9pt;
  
  th, td {
    border: 1px solid #000;
    padding: 2mm;
    text-align: center;
  }
  
  th {
    background: #f0f0f0;
    font-weight: bold;
    font-size: 10pt;
  }
  
  .item-name {
    text-align: left;
    padding-left: 3mm;
  }
  
  .quantity, .unit-price, .amount {
    text-align: right;
    padding-right: 3mm;
  }
  
  .subtotal-row {
    font-weight: bold;
    background: #f5f5f5;
  }
  
  .total-row {
    font-weight: bold;
    font-size: 11pt;
    background: #e0e0e0;
  }
  
  .legal-welfare-row {
    background: #fff3cd;
    font-weight: bold;
  }
`;

const PaymentTerms = styled.div`
  margin-bottom: 15mm;
  
  .section-title {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 5mm;
    border-bottom: 1px solid #000;
    padding-bottom: 2mm;
  }
  
  .terms-content {
    font-size: 10pt;
    line-height: 1.6;
  }
`;

const TermsAndConditions = styled.div`
  margin-top: 15mm;
  
  .section-title {
    font-size: 14pt;
    font-weight: bold;
    border-bottom: 2px solid #000;
    padding-bottom: 3mm;
    margin-bottom: 10mm;
    text-align: center;
  }
  
  .terms-section {
    margin-bottom: 15mm;
    
    .category-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 8mm;
      background: #f0f0f0;
      padding: 3mm;
      border-left: 4px solid #333;
    }
    
    .terms-list {
      padding-left: 0;
      list-style: none;
      
      .term-item {
        margin-bottom: 8mm;
        padding: 5mm;
        border: 1px solid #ddd;
        background: #fafafa;
        position: relative;
        
        .item-title {
          font-weight: bold;
          margin-bottom: 3mm;
          color: #333;
        }
        
        .item-content {
          line-height: 1.6;
          font-size: 9pt;
          
          &.editable {
            min-height: 15mm;
            border: 1px dashed #ccc;
            padding: 2mm;
            background: white;
            cursor: text;
            
            &:hover {
              border-color: #999;
            }
            
            &:focus {
              outline: 2px solid #007bff;
              border-color: #007bff;
            }
          }
        }
        
        .edit-button {
          position: absolute;
          top: 2mm;
          right: 2mm;
          background: #007bff;
          color: white;
          border: none;
          padding: 1mm 3mm;
          font-size: 8pt;
          cursor: pointer;
          border-radius: 2px;
          
          &:hover {
            background: #0056b3;
          }
        }
        
        .bullet-list {
          margin: 3mm 0;
          padding-left: 8mm;
          
          li {
            position: relative;
            margin-bottom: 2mm;
            
            &:before {
              content: "•";
              position: absolute;
              left: -5mm;
              font-weight: bold;
            }
          }
        }
      }
    }
  }
  
  .highlight {
    background: #ffeb3b;
    padding: 1mm 2mm;
    font-weight: bold;
  }
  
  .important-note {
    background: #fff3cd;
    border: 1px solid #ffc107;
    padding: 5mm;
    margin: 5mm 0;
    border-radius: 2mm;
    
    .note-title {
      font-weight: bold;
      color: #856404;
      margin-bottom: 2mm;
    }
  }
`;

const PageFooter = styled.div`
  position: fixed;
  bottom: 10mm;
  right: 20mm;
  font-size: 8pt;
  color: #666;
  
  @media print {
    position: absolute;
  }
`;

const EditableContent = styled.div`
  min-height: 20mm;
  padding: 3mm;
  border: ${props => props.isEditing ? '2px solid #007bff' : '1px dashed #ccc'};
  background: ${props => props.isEditing ? '#f8f9fa' : 'white'};
  cursor: ${props => props.isEditing ? 'text' : 'pointer'};
  white-space: pre-wrap;
  line-height: 1.6;
  
  &:hover {
    border-color: ${props => props.isEditing ? '#007bff' : '#999'};
  }
`;

const EstimateTemplate = ({ data = {} }) => {
  const [editingSection, setEditingSection] = useState(null);
  const [editableTerms, setEditableTerms] = useState({
    materials: "石材は現在の金額ですが、仕入れ状況により金額の変動も予想されます。変更があればご報告させていただきます。",
    plants: "植物に関しましては仕入れ状況により、高さ等の変更が生じる場合があります。それに伴い金額に変更が生じた場合は、ご報告後調整させていただきます。",
    warranty: "植栽した植木についての枯れ保証は含まれておりません。",
    construction: "図面は、あくまでイメージになります。施工中に地形の変更・植栽位置の変更が生じる場合があります。",
    access: "施工中は、出入りが多くなります。材料手配・材料調達等で、不在になることがあります。家の施錠は確実にお願いいたします。",
    parking: "基本的には敷地内での駐車をさせていただければ幸いです。\n使用車両：\n• 軽トラック\n• 1トントラック\n• 移動式クレーン車\n• 2〜3トンダンプ車\n• その他",
    utilities: "作業上、電源（外部コンセント）・水道等のご支給をお願いします。",
    workingHours: "基本作業時間：朝8時頃〜夕方5時頃まで\n（作業内容により、大幅に時間が必要な場合は、その都度ご報告させていただきます）"
  });

  const {
    estimateNumber = 'EST-2024-001',
    issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    validityPeriod = '30日間',
    clientName = '○○○○ 様',
    clientAddress = '〒000-0000 ○○県○○市○○町○○番地',
    projectName = '新築住宅造園工事',
    projectLocation = '○○県○○市○○町○○番地地内',
    constructionPeriod = '契約締結後約180日',
    paymentTerms = '着工時30%、中間時40%、完成時30%',
    items = [],
    companyName = '庭想人株式会社',
    companyNameEn = 'NIWAOMOBITO CO., LTD.',
    companyAddress = '〒639-2113 奈良県葛城市太田262-1',
    companyTel = 'TEL: 0745-48-3057',
    companyFax = 'FAX: 0745-48-3057',
    companyMobile = '携帯: 090-8937-1314',
    representative = '代表取締役 安井利典',
    registrationNumber = 'T6150001027575',
    licenseNumber = '奈良県知事許可 第17752号',
    taxRate = 10
  } = data;

  // サンプルデータ（実際のデータがない場合）
  const sampleItems = items.length > 0 ? items : [
    { name: '仮設工事', unit: '式', quantity: 1, unitPrice: 250000, amount: 250000, description: '工事用仮設設備一式' },
    { name: '土工事', unit: '㎥', quantity: 45, unitPrice: 8500, amount: 382500, description: '掘削・残土処分' },
    { name: '土留め石積み工', unit: '㎡', quantity: 21.5, unitPrice: 60000, amount: 1290000, description: '自然石積み工事' },
    { name: 'アプローチ工事', unit: '㎡', quantity: 15, unitPrice: 45000, amount: 675000, description: '自然石乱張り・目地工事' },
    { name: '門柱・塀工事', unit: '式', quantity: 1, unitPrice: 380000, amount: 380000, description: '板塀門柱（900×1500）' },
    { name: 'カーポート設置', unit: '基', quantity: 1, unitPrice: 1107948, amount: 1107948, description: 'アルミ製カーポート' },
    { name: 'テラス工事', unit: '㎡', quantity: 12, unitPrice: 33000, amount: 396000, description: 'ウッドデッキテラス' },
    { name: '電気設備工事', unit: '式', quantity: 1, unitPrice: 180000, amount: 180000, description: '庭園灯・配線工事' },
    { name: 'ウッドフェンス', unit: 'm', quantity: 15, unitPrice: 25000, amount: 375000, description: '木製フェンス設置' },
    { name: '植栽工事', unit: '式', quantity: 1, unitPrice: 850000, amount: 850000, description: '高木・中木・低木・草花植栽一式' }
  ];

  const itemsSubtotal = sampleItems.reduce((sum, item) => sum + item.amount, 0);
  const designFee = 350000; // 設計費
  const legalWelfareFee = Math.floor(itemsSubtotal * 0.15); // 法定福利費（15%）
  const miscExpenses = 180000; // 諸経費
  const beforeTax = itemsSubtotal + designFee + legalWelfareFee + miscExpenses;
  const taxAmount = Math.floor(beforeTax * taxRate / 100);
  const total = beforeTax + taxAmount;

  const handleEditContent = (section, newContent) => {
    setEditableTerms(prev => ({
      ...prev,
      [section]: newContent
    }));
    setEditingSection(null);
  };

  const pageCount = 3;

  return (
    <>
      {/* 1ページ目：見積書表紙 */}
      <EstimateContainer>
        <PageBreak>
          <DocumentTitle>見 積 書</DocumentTitle>
          
          <EstimateBasicInfo>
            <div className="left-info">
              <div className="estimate-number">見積書番号: {estimateNumber}</div>
              <div className="issue-date">
                <span className="label">発行日:</span>
                <span className="value">{issueDate}</span>
              </div>
              <div className="validity-period">
                <span className="label">見積有効期限:</span>
                <span className="value">{validityPeriod}</span>
              </div>
            </div>
            <div className="right-info">
              <div className="total-amount">
                合計金額<br />
                ¥{total.toLocaleString()}
              </div>
              <div className="tax-info">
                （消費税 {taxRate}% 込み）
              </div>
            </div>
          </EstimateBasicInfo>

          <ClientSection>
            <div className="client-address">{clientAddress}</div>
            <div className="client-name">{clientName}</div>
          </ClientSection>

          <CompanySection>
            <div className="registration-number">
              適格請求書発行事業者登録番号<br />
              {registrationNumber}
            </div>
            <div className="company-name">{companyName}</div>
            <div style={{ fontSize: '9pt', marginBottom: '2mm' }}>{companyNameEn}</div>
            <div className="contact-info">
              {companyAddress}<br />
              {companyTel}<br />
              {companyFax}<br />
              {companyMobile}
            </div>
            <div className="representative">{representative}</div>
            <div style={{ fontSize: '8pt', marginBottom: '3mm' }}>{licenseNumber}</div>
            <div className="stamp-area">
              <div className="stamp-box">代表印</div>
              <div className="stamp-box">担当印</div>
            </div>
          </CompanySection>

          <ProjectInfo style={{ marginTop: '40mm' }}>
            <div className="project-title">工事概要</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label">工事件名</td>
                  <td className="value">{projectName}</td>
                </tr>
                <tr>
                  <td className="label">工事場所</td>
                  <td className="value">{projectLocation}</td>
                </tr>
                <tr>
                  <td className="label">工事期間</td>
                  <td className="value">{constructionPeriod}</td>
                </tr>
                <tr>
                  <td className="label">支払条件</td>
                  <td className="value">{paymentTerms}</td>
                </tr>
              </tbody>
            </table>
          </ProjectInfo>

          <div style={{ marginTop: '20mm', fontSize: '11pt', textAlign: 'center' }}>
            下記の通り、お見積もりいたします。<br />
            ご査収のほど、よろしくお願い申し上げます。
          </div>

          <PageFooter>
            1 / {pageCount}
          </PageFooter>
        </PageBreak>
      </EstimateContainer>

      {/* 2ページ目：詳細明細 */}
      <EstimateContainer>
        <PageBreak>
          <DocumentTitle style={{ fontSize: '18pt', marginBottom: '10mm' }}>見積内訳書</DocumentTitle>
          
          <div style={{ textAlign: 'right', fontSize: '10pt', marginBottom: '15mm' }}>
            見積書番号: {estimateNumber}　　発行日: {issueDate}
          </div>

          <ItemTable>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>工事項目</th>
                <th style={{ width: '15%' }}>仕様・規格</th>
                <th style={{ width: '8%' }}>数量</th>
                <th style={{ width: '10%' }}>単位</th>
                <th style={{ width: '16%' }}>単価（円）</th>
                <th style={{ width: '16%' }}>金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {sampleItems.map((item, index) => (
                <tr key={index}>
                  <td className="item-name">
                    <strong>{item.name}</strong>
                    {item.description && (
                      <div style={{ fontSize: '8pt', color: '#666', marginTop: '1mm' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td className="quantity">{item.quantity}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td className="unit-price">{item.unitPrice.toLocaleString()}</td>
                  <td className="amount">{item.amount.toLocaleString()}</td>
                </tr>
              ))}
              
              <tr className="subtotal-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>工事費小計</td>
                <td className="amount">{itemsSubtotal.toLocaleString()}</td>
              </tr>
              
              <tr className="legal-welfare-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>法定福利費（15%）</td>
                <td className="amount">{legalWelfareFee.toLocaleString()}</td>
              </tr>
              
              <tr className="subtotal-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>設計・監理費</td>
                <td className="amount">{designFee.toLocaleString()}</td>
              </tr>
              
              <tr className="subtotal-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>諸経費（現場管理費等）</td>
                <td className="amount">{miscExpenses.toLocaleString()}</td>
              </tr>
              
              <tr className="subtotal-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>税抜合計</td>
                <td className="amount">{beforeTax.toLocaleString()}</td>
              </tr>
              
              <tr className="subtotal-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>消費税（{taxRate}%）</td>
                <td className="amount">{taxAmount.toLocaleString()}</td>
              </tr>
              
              <tr className="total-row">
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12pt' }}>
                  合計金額（税込）
                </td>
                <td className="amount" style={{ fontSize: '12pt' }}>
                  ¥{total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </ItemTable>

          <div className="important-note">
            <div className="note-title">■ 重要事項</div>
            <div>• 仕様及び数量変更の場合、事前打合せのうえ、別途見積いたします</div>
            <div>• 本見積書の有効期限は発行日より{validityPeriod}です</div>
            <div>• 法定福利費は社会保険料、労働保険料等を含みます</div>
          </div>

          <PaymentTerms>
            <div className="section-title">支払条件</div>
            <div className="terms-content">
              <strong>支払条件：</strong>{paymentTerms}<br />
              <strong>支払方法：</strong>銀行振込（振込手数料はお客様負担）<br />
              <strong>その他：</strong>天災地変等による工期延長の場合は、別途協議とします
            </div>
          </PaymentTerms>

          <PageFooter>
            2 / {pageCount}
          </PageFooter>
        </PageBreak>
      </EstimateContainer>

      {/* 3ページ目：特記事項（編集可能） */}
      <EstimateContainer>
        <TermsAndConditions>
          <div className="section-title">特記事項</div>
          
          <div className="terms-section">
            <div className="category-title">■ 材料について</div>
            <ul className="terms-list">
              <li className="term-item">
                <div className="item-title">石材</div>
                <EditableContent
                  isEditing={editingSection === 'materials'}
                  onClick={() => setEditingSection('materials')}
                  onBlur={(e) => handleEditContent('materials', e.target.innerText)}
                  contentEditable={editingSection === 'materials'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.materials}
                </EditableContent>
                {editingSection !== 'materials' && (
                  <button className="edit-button" onClick={() => setEditingSection('materials')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">植物</div>
                <EditableContent
                  isEditing={editingSection === 'plants'}
                  onClick={() => setEditingSection('plants')}
                  onBlur={(e) => handleEditContent('plants', e.target.innerText)}
                  contentEditable={editingSection === 'plants'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.plants}
                </EditableContent>
                {editingSection !== 'plants' && (
                  <button className="edit-button" onClick={() => setEditingSection('plants')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">枯れ木保証について</div>
                <div className="highlight">{editableTerms.warranty}</div>
              </li>
            </ul>
          </div>

          <div className="terms-section">
            <div className="category-title">■ 施工について</div>
            <ul className="terms-list">
              <li className="term-item">
                <div className="item-title">図面・設計</div>
                <EditableContent
                  isEditing={editingSection === 'construction'}
                  onClick={() => setEditingSection('construction')}
                  onBlur={(e) => handleEditContent('construction', e.target.innerText)}
                  contentEditable={editingSection === 'construction'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.construction}
                </EditableContent>
                {editingSection !== 'construction' && (
                  <button className="edit-button" onClick={() => setEditingSection('construction')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">現場アクセス</div>
                <EditableContent
                  isEditing={editingSection === 'access'}
                  onClick={() => setEditingSection('access')}
                  onBlur={(e) => handleEditContent('access', e.target.innerText)}
                  contentEditable={editingSection === 'access'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.access}
                </EditableContent>
                {editingSection !== 'access' && (
                  <button className="edit-button" onClick={() => setEditingSection('access')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">駐車場・車両</div>
                <EditableContent
                  isEditing={editingSection === 'parking'}
                  onClick={() => setEditingSection('parking')}
                  onBlur={(e) => handleEditContent('parking', e.target.innerText)}
                  contentEditable={editingSection === 'parking'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.parking}
                </EditableContent>
                {editingSection !== 'parking' && (
                  <button className="edit-button" onClick={() => setEditingSection('parking')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">電気・水道等の設備</div>
                <EditableContent
                  isEditing={editingSection === 'utilities'}
                  onClick={() => setEditingSection('utilities')}
                  onBlur={(e) => handleEditContent('utilities', e.target.innerText)}
                  contentEditable={editingSection === 'utilities'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.utilities}
                </EditableContent>
                {editingSection !== 'utilities' && (
                  <button className="edit-button" onClick={() => setEditingSection('utilities')}>
                    編集
                  </button>
                )}
              </li>
              
              <li className="term-item">
                <div className="item-title">作業時間</div>
                <EditableContent
                  isEditing={editingSection === 'workingHours'}
                  onClick={() => setEditingSection('workingHours')}
                  onBlur={(e) => handleEditContent('workingHours', e.target.innerText)}
                  contentEditable={editingSection === 'workingHours'}
                  suppressContentEditableWarning={true}
                >
                  {editableTerms.workingHours}
                </EditableContent>
                {editingSection !== 'workingHours' && (
                  <button className="edit-button" onClick={() => setEditingSection('workingHours')}>
                    編集
                  </button>
                )}
              </li>
            </ul>
          </div>

          <div className="important-note">
            <div className="note-title">■ その他重要事項</div>
            <div>
              • 予定外の作業が発生した場合（特に埋設物の有無等によるもの）は打合せをさせていただき、作業工程の見直し、追加費用発生時は再度見積いたします<br />
              • 近隣住宅への配慮として、作業開始日決定後、弊社より直接ご挨拶をさせていただきます<br />
              • 天候・災害等による工期変更の場合は、別途協議とします
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20mm', fontSize: '10pt' }}>
            以上、ご査収のほどよろしくお願い申し上げます。
          </div>

          <PageFooter>
            3 / {pageCount}
          </PageFooter>
        </TermsAndConditions>
      </EstimateContainer>
    </>
  );
};

export default EstimateTemplate;