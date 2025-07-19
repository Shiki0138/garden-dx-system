import React, { useState } from 'react';
import styled from 'styled-components';

// カラーパレット：日本の伝統色を基調とした落ち着いた配色
const colors = {
  primary: '#2C5530', // 深緑（松葉色）
  secondary: '#8B7355', // 焦茶（朽葉色）
  accent: '#C9171E', // 朱色（印鑑色）
  gray: {
    100: '#F5F5F5',
    200: '#E8E8E8',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  background: '#FAFAF8', // 和紙のような淡いベージュ
  text: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    light: '#6B6B6B',
  }
};

// メインコンテナ：A4サイズに最適化
const EstimateContainer = styled.div`
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: white;
  font-family: 'Noto Serif JP', 'Yu Mincho', serif;
  color: ${colors.text.primary};
  position: relative;
  
  @media print {
    margin: 0;
    page-break-inside: avoid;
  }
`;

// ページヘッダー：ブランドアイデンティティ
const PageHeader = styled.header`
  background: linear-gradient(to bottom, ${colors.primary} 0%, ${colors.primary}CC 100%);
  color: white;
  padding: 25mm 20mm 15mm;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    bottom: -50px;
    left: -50px;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -80px;
    right: -80px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
    border-radius: 50%;
  }
`;

// 会社ロゴ・名称エリア
const CompanyBrand = styled.div`
  position: relative;
  z-index: 1;
  
  .company-name {
    font-size: 28pt;
    font-weight: 300;
    letter-spacing: 0.15em;
    margin-bottom: 5mm;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .company-tagline {
    font-size: 11pt;
    font-weight: 300;
    letter-spacing: 0.1em;
    opacity: 0.9;
  }
  
  .license-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(255,255,255,0.15);
    padding: 3mm 6mm;
    border-radius: 3mm;
    font-size: 9pt;
    letter-spacing: 0.05em;
  }
`;

// ドキュメントタイトル
const DocumentTitle = styled.div`
  text-align: center;
  margin: 20mm 0 15mm;
  
  h1 {
    font-size: 32pt;
    font-weight: 300;
    letter-spacing: 0.3em;
    color: ${colors.primary};
    margin: 0;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -5mm;
      left: 50%;
      transform: translateX(-50%);
      width: 50mm;
      height: 0.5mm;
      background: ${colors.primary};
    }
  }
  
  .document-number {
    margin-top: 10mm;
    font-size: 10pt;
    color: ${colors.text.secondary};
    letter-spacing: 0.1em;
  }
`;

// クライアント情報セクション
const ClientSection = styled.section`
  margin: 0 20mm 15mm;
  
  .client-name {
    font-size: 18pt;
    font-weight: 500;
    color: ${colors.text.primary};
    margin-bottom: 8mm;
    padding-bottom: 3mm;
    border-bottom: 2px solid ${colors.primary};
    letter-spacing: 0.05em;
  }
  
  .project-info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3mm 10mm;
    font-size: 11pt;
    line-height: 1.8;
    
    .label {
      color: ${colors.text.secondary};
      font-weight: 500;
    }
    
    .value {
      color: ${colors.text.primary};
    }
  }
`;

// 金額サマリーセクション
const SummarySection = styled.section`
  margin: 0 20mm 20mm;
  background: ${colors.background};
  padding: 15mm;
  border: 1px solid ${colors.gray[200]};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    height: 4px;
    background: linear-gradient(to right, ${colors.primary} 0%, ${colors.secondary} 100%);
  }
  
  .summary-title {
    font-size: 14pt;
    font-weight: 500;
    color: ${colors.primary};
    margin-bottom: 10mm;
    letter-spacing: 0.1em;
  }
  
  .total-amount {
    text-align: center;
    
    .amount-label {
      font-size: 10pt;
      color: ${colors.text.secondary};
      margin-bottom: 3mm;
    }
    
    .amount-value {
      font-size: 28pt;
      font-weight: 500;
      color: ${colors.primary};
      letter-spacing: 0.05em;
      font-family: 'Noto Sans JP', sans-serif;
    }
    
    .tax-note {
      font-size: 9pt;
      color: ${colors.text.light};
      margin-top: 3mm;
    }
  }
`;

// 明細テーブル
const DetailTable = styled.table`
  width: calc(100% - 40mm);
  margin: 0 20mm 20mm;
  border-collapse: collapse;
  font-size: 10pt;
  
  thead {
    tr {
      border-bottom: 2px solid ${colors.primary};
      
      th {
        padding: 5mm 3mm;
        text-align: left;
        font-weight: 500;
        color: ${colors.primary};
        letter-spacing: 0.05em;
        
        &:last-child {
          text-align: right;
        }
      }
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid ${colors.gray[200]};
      
      &:hover {
        background: ${colors.background};
      }
      
      td {
        padding: 4mm 3mm;
        color: ${colors.text.primary};
        
        &.item-name {
          font-weight: 500;
          
          .description {
            font-size: 8pt;
            color: ${colors.text.light};
            margin-top: 1mm;
            font-weight: 400;
          }
        }
        
        &.quantity, &.unit-price, &.amount {
          text-align: right;
          font-family: 'Noto Sans JP', sans-serif;
        }
        
        &.amount {
          font-weight: 500;
        }
      }
    }
    
    tr.subtotal-row {
      font-weight: 500;
      background: ${colors.gray[100]};
      
      td {
        padding: 5mm 3mm;
      }
    }
    
    tr.total-row {
      font-weight: 600;
      background: ${colors.primary};
      color: white;
      
      td {
        padding: 6mm 3mm;
        font-size: 11pt;
      }
    }
  }
`;

// 条件・備考セクション
const TermsSection = styled.section`
  margin: 0 20mm 20mm;
  padding: 15mm;
  background: ${colors.background};
  border: 1px solid ${colors.gray[200]};
  
  .section-title {
    font-size: 12pt;
    font-weight: 500;
    color: ${colors.primary};
    margin-bottom: 8mm;
    letter-spacing: 0.1em;
  }
  
  .terms-content {
    font-size: 9pt;
    line-height: 1.8;
    color: ${colors.text.secondary};
    
    .term-item {
      margin-bottom: 3mm;
      padding-left: 8mm;
      position: relative;
      
      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: ${colors.secondary};
      }
    }
  }
`;

// フッター：会社情報
const PageFooter = styled.footer`
  background: ${colors.gray[100]};
  padding: 15mm 20mm;
  margin-top: auto;
  
  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    
    .company-info {
      font-size: 9pt;
      line-height: 1.6;
      color: ${colors.text.secondary};
      
      .info-item {
        margin-bottom: 2mm;
        
        &.company-name {
          font-size: 11pt;
          font-weight: 500;
          color: ${colors.primary};
          margin-bottom: 4mm;
        }
      }
    }
    
    .certification {
      text-align: right;
      font-size: 8pt;
      color: ${colors.text.light};
      
      .cert-item {
        margin-bottom: 2mm;
      }
    }
  }
  
  .footer-note {
    margin-top: 10mm;
    padding-top: 10mm;
    border-top: 1px solid ${colors.gray[300]};
    text-align: center;
    font-size: 8pt;
    color: ${colors.text.light};
    font-style: italic;
  }
`;

// 印鑑エリア
const StampArea = styled.div`
  position: absolute;
  bottom: 30mm;
  right: 20mm;
  display: flex;
  gap: 10mm;
  
  .stamp-box {
    width: 25mm;
    height: 25mm;
    border: 2px solid ${colors.accent};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    color: ${colors.accent};
    background: white;
    
    &.approved {
      background: ${colors.accent};
      color: white;
    }
  }
`;

const EstimateTemplateProfessional = ({ data = {} }) => {
  const {
    estimateNumber = 'EST-2024-001',
    issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    validityPeriod = '30日間',
    clientName = '○○○○ 様',
    projectName = '邸宅庭園整備工事',
    projectLocation = '○○県○○市',
    constructionPeriod = '約3ヶ月',
    items = [],
    companyName = '庭想人',
    companyNameEn = 'NIWAOMOBITO',
    companyTagline = '伝統と革新が織りなす、日本庭園の新境地',
    companyAddress = '奈良県葛城市太田262-1',
    companyTel = '0745-48-3057',
    companyEmail = 'info@niwaomobito.jp',
    representative = '安井利典',
    licenseNumber = '奈良県知事許可 第17752号',
    registrationNumber = 'T6150001027575',
    certifications = [
      '一級造園施工管理技士',
      '一級造園技能士',
      '樹木医'
    ],
    taxRate = 10
  } = data;

  // サンプルデータ
  const sampleItems = items.length > 0 ? items : [
    { 
      name: '基盤整備工事', 
      quantity: 1, 
      unit: '式', 
      unitPrice: 580000, 
      description: '地盤調整・排水設備・土壌改良' 
    },
    { 
      name: '石組工事', 
      quantity: 25, 
      unit: '㎡', 
      unitPrice: 48000, 
      description: '自然石による枯山水風石組' 
    },
    { 
      name: '植栽工事', 
      quantity: 1, 
      unit: '式', 
      unitPrice: 980000, 
      description: '松・紅葉・下草類一式' 
    },
    { 
      name: '園路工事', 
      quantity: 35, 
      unit: '㎡', 
      unitPrice: 28000, 
      description: '飛石・延段による回遊路' 
    },
    { 
      name: '水景工事', 
      quantity: 1, 
      unit: '式', 
      unitPrice: 650000, 
      description: 'つくばい・水琴窟設置' 
    }
  ];

  const itemsSubtotal = sampleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const designFee = Math.floor(itemsSubtotal * 0.15); // 設計監理費15%
  const beforeTax = itemsSubtotal + designFee;
  const taxAmount = Math.floor(beforeTax * taxRate / 100);
  const total = beforeTax + taxAmount;

  return (
    <EstimateContainer>
      {/* ヘッダー */}
      <PageHeader>
        <CompanyBrand>
          <div className="company-name">{companyName}</div>
          <div className="company-tagline">{companyTagline}</div>
          <div className="license-badge">{licenseNumber}</div>
        </CompanyBrand>
      </PageHeader>

      {/* ドキュメントタイトル */}
      <DocumentTitle>
        <h1>御見積書</h1>
        <div className="document-number">No. {estimateNumber}</div>
      </DocumentTitle>

      {/* クライアント情報 */}
      <ClientSection>
        <div className="client-name">{clientName}</div>
        <div className="project-info">
          <span className="label">工事名称</span>
          <span className="value">{projectName}</span>
          <span className="label">工事場所</span>
          <span className="value">{projectLocation}</span>
          <span className="label">工期予定</span>
          <span className="value">{constructionPeriod}</span>
          <span className="label">見積有効期限</span>
          <span className="value">発行日より{validityPeriod}</span>
        </div>
      </ClientSection>

      {/* 金額サマリー */}
      <SummarySection>
        <div className="summary-title">御見積金額</div>
        <div className="total-amount">
          <div className="amount-label">総額</div>
          <div className="amount-value">¥{total.toLocaleString()}</div>
          <div className="tax-note">（消費税{taxRate}%込）</div>
        </div>
      </SummarySection>

      {/* 明細 */}
      <DetailTable>
        <thead>
          <tr>
            <th style={{ width: '40%' }}>工事項目</th>
            <th style={{ width: '15%', textAlign: 'center' }}>数量</th>
            <th style={{ width: '10%', textAlign: 'center' }}>単位</th>
            <th style={{ width: '15%', textAlign: 'right' }}>単価</th>
            <th style={{ width: '20%' }}>金額</th>
          </tr>
        </thead>
        <tbody>
          {sampleItems.map((item, index) => (
            <tr key={index}>
              <td className="item-name">
                {item.name}
                {item.description && (
                  <div className="description">{item.description}</div>
                )}
              </td>
              <td className="quantity">{item.quantity.toLocaleString()}</td>
              <td style={{ textAlign: 'center' }}>{item.unit}</td>
              <td className="unit-price">¥{item.unitPrice.toLocaleString()}</td>
              <td className="amount">¥{(item.unitPrice * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
          
          <tr className="subtotal-row">
            <td colSpan="4" style={{ textAlign: 'right' }}>小計</td>
            <td className="amount">¥{itemsSubtotal.toLocaleString()}</td>
          </tr>
          
          <tr className="subtotal-row">
            <td colSpan="4" style={{ textAlign: 'right' }}>設計監理費</td>
            <td className="amount">¥{designFee.toLocaleString()}</td>
          </tr>
          
          <tr className="subtotal-row">
            <td colSpan="4" style={{ textAlign: 'right' }}>消費税（{taxRate}%）</td>
            <td className="amount">¥{taxAmount.toLocaleString()}</td>
          </tr>
          
          <tr className="total-row">
            <td colSpan="4" style={{ textAlign: 'right' }}>合計金額</td>
            <td className="amount">¥{total.toLocaleString()}</td>
          </tr>
        </tbody>
      </DetailTable>

      {/* 備考・条件 */}
      <TermsSection>
        <div className="section-title">備考事項</div>
        <div className="terms-content">
          <div className="term-item">上記金額は現地調査に基づく概算です</div>
          <div className="term-item">施工中の追加・変更については別途御見積いたします</div>
          <div className="term-item">材料の価格変動により金額が変更となる場合があります</div>
          <div className="term-item">工期は天候等により変動する場合があります</div>
        </div>
      </TermsSection>

      {/* フッター */}
      <PageFooter>
        <div className="footer-content">
          <div className="company-info">
            <div className="info-item company-name">{companyName} / {companyNameEn}</div>
            <div className="info-item">〒639-2113 {companyAddress}</div>
            <div className="info-item">TEL: {companyTel}</div>
            <div className="info-item">E-mail: {companyEmail}</div>
            <div className="info-item">代表: {representative}</div>
          </div>
          
          <div className="certification">
            <div className="cert-item">適格請求書発行事業者登録番号</div>
            <div className="cert-item">{registrationNumber}</div>
            <div className="cert-item" style={{ marginTop: '5mm' }}>保有資格</div>
            {certifications.map((cert, index) => (
              <div key={index} className="cert-item">・{cert}</div>
            ))}
          </div>
        </div>
        
        <div className="footer-note">
          伝統的な日本庭園の美を現代に継承し、新たな価値を創造します
        </div>
      </PageFooter>

      {/* 印鑑エリア */}
      <StampArea>
        <div className="stamp-box">
          <span>担当印</span>
        </div>
        <div className="stamp-box approved">
          <span>承認印</span>
        </div>
      </StampArea>
    </EstimateContainer>
  );
};

export default EstimateTemplateProfessional;