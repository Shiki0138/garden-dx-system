import React from 'react';
import styled from 'styled-components';

const EstimateContainer = styled.div`
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: white;
  padding: 20mm;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #000;
  
  @media print {
    margin: 0;
    padding: 15mm;
  }
`;

const PageBreak = styled.div`
  page-break-after: always;
  margin-bottom: 20mm;
  
  @media print {
    margin-bottom: 0;
  }
`;

const Header = styled.div`
  text-align: center;
  font-size: 18pt;
  font-weight: bold;
  margin-bottom: 20mm;
`;

const ClientInfo = styled.div`
  margin-bottom: 20mm;
  
  .client-name {
    font-size: 16pt;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 5mm;
    margin-bottom: 10mm;
  }
  
  .message {
    background: #f5f5f5;
    padding: 10mm;
    border: 1px solid #ddd;
    margin-bottom: 10mm;
    white-space: pre-line;
  }
`;

const CompanyInfo = styled.div`
  position: absolute;
  right: 20mm;
  top: 50mm;
  text-align: right;
  
  .company-name {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 5mm;
  }
  
  .stamp-area {
    display: flex;
    gap: 10mm;
    justify-content: flex-end;
    margin-top: 10mm;
    
    .stamp-box {
      width: 20mm;
      height: 20mm;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12pt;
    }
  }
`;

const EstimateInfo = styled.div`
  margin-bottom: 20mm;
  
  .info-row {
    display: flex;
    margin-bottom: 3mm;
    
    .label {
      width: 40mm;
    }
    
    .value {
      flex: 1;
    }
  }
`;

const SummaryBox = styled.div`
  background: #fff3e0;
  border: 2px solid #000;
  padding: 10mm;
  margin-bottom: 20mm;
  
  .total-amount {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 5mm;
  }
  
  .tax-info {
    text-align: right;
    font-size: 9pt;
    color: #666;
  }
`;

const ItemTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20mm;
  
  th, td {
    border: 1px solid #000;
    padding: 3mm;
    text-align: center;
  }
  
  th {
    background: #f0f0f0;
    font-weight: bold;
  }
  
  .item-name {
    text-align: left;
    padding-left: 5mm;
  }
  
  .quantity, .unit-price, .amount {
    text-align: right;
    padding-right: 5mm;
  }
  
  .subtotal-row {
    font-weight: bold;
    background: #f5f5f5;
  }
  
  .total-row {
    font-weight: bold;
    font-size: 12pt;
    background: #e0e0e0;
  }
`;

const ProjectDetails = styled.div`
  margin-bottom: 20mm;
  
  h3 {
    font-size: 14pt;
    border-bottom: 2px solid #000;
    padding-bottom: 3mm;
    margin-bottom: 10mm;
  }
  
  .detail-item {
    margin-bottom: 10mm;
    
    .detail-label {
      font-weight: bold;
      margin-bottom: 3mm;
    }
    
    .detail-content {
      padding-left: 10mm;
      white-space: pre-line;
    }
  }
`;

const TermsAndConditions = styled.div`
  margin-top: 20mm;
  
  h3 {
    font-size: 14pt;
    border-bottom: 2px solid #000;
    padding-bottom: 3mm;
    margin-bottom: 10mm;
  }
  
  .terms-section {
    margin-bottom: 15mm;
    
    h4 {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5mm;
    }
    
    ul {
      list-style: none;
      padding-left: 10mm;
      
      li {
        position: relative;
        padding-left: 15mm;
        margin-bottom: 3mm;
        
        &:before {
          content: "●";
          position: absolute;
          left: 0;
        }
      }
    }
  }
  
  .highlight {
    background: #ffeb3b;
    padding: 1mm 2mm;
  }
`;

const EstimateTemplate = ({ data = {} }) => {
  const {
    estimateNumber = 'No.1',
    date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    validityPeriod = '1ヶ月',
    clientName = '創建工房 緑 様',
    projectName = '山田様邸新築造園工事',
    location = '大阪府枚方市東香里南町20-10地内',
    period = '180日',
    totalAmount = '¥6,129,785',
    taxIncluded = true,
    taxRate = 10,
    items = [],
    companyName = '庭想人株式会社',
    companyAddress = '奈良県葛城市太田262-1 安井利典',
    companyTel = '0745-48-3057',
    companyFax = '0745-48-3057',
    companyMobile = '090-8937-1314',
    registrationNumber = 'T6150001027575',
    message = '拝啓 時下ますますご清栄のこととお喜び申し上げます。\n平素は格別のご高配を賜り、厚く御礼申し上げます。\n下記内容の通りお見積りを申し上げます。\nご検討の程よろしくお願い申し上げます。'
  } = data;

  // サンプルデータ（実際のデータがない場合）
  const sampleItems = items.length > 0 ? items : [
    { name: '土工', unit: 'NO.2', quantity: 1, unitPrice: 413500, amount: 413500 },
    { name: '土留め石積み工', unit: '㎡', quantity: 21.5, unitPrice: 60000, amount: 1290000 },
    { name: 'アプローチ自然石乱張り', unit: '㎡', quantity: 6, unitPrice: 70000, amount: 420000 },
    { name: 'アプローチ三和土', unit: '㎡', quantity: 3, unitPrice: 22000, amount: 66000 },
    { name: '板塀門柱（900×1500）', unit: '式', quantity: 1, unitPrice: 150000, amount: 150000 },
    { name: '自然石水鉢パン', unit: '式', quantity: 1, unitPrice: 20000, amount: 20000 },
    { name: 'カーポート', unit: 'NO.3', quantity: 1, unitPrice: 1107948, amount: 1107948 },
    { name: 'テラス', unit: 'NO.3', quantity: 1, unitPrice: 396776, amount: 396776 },
    { name: '庭園灯等', unit: 'NO.3', quantity: 1, unitPrice: 87600, amount: 87600 },
    { name: 'ウッドフェンス建柱', unit: '式', quantity: 1, unitPrice: 116170, amount: 116170 },
    { name: '植栽', unit: '式', quantity: 1, unitPrice: 663450, amount: 663450 }
  ];

  const subtotal = sampleItems.reduce((sum, item) => sum + item.amount, 0);
  const designFee = 200000;
  const miscExpenses = 641088;
  const beforeTax = subtotal + designFee + miscExpenses;
  const taxAmount = Math.floor(beforeTax * taxRate / 100);
  const total = beforeTax + taxAmount;

  return (
    <>
      {/* 1ページ目：表紙 */}
      <EstimateContainer>
        <PageBreak>
          <Header>お見積ご提案書 {estimateNumber}</Header>
          
          <EstimateInfo>
            <div className="info-row">
              <span className="label">作成日</span>
              <span className="value">{date}</span>
            </div>
            <div className="info-row">
              <span className="label">お見積有効期限</span>
              <span className="value">{validityPeriod}</span>
            </div>
            <div className="info-row">
              <span className="label">奈良県知事許可</span>
              <span className="value">第17752号</span>
            </div>
            <div className="info-row">
              <span className="label">登録番号</span>
              <span className="value">{registrationNumber}</span>
            </div>
          </EstimateInfo>

          <ClientInfo>
            <div className="client-name">{clientName}</div>
            <div className="message">{message}</div>
          </ClientInfo>

          <CompanyInfo>
            <div className="company-name">{companyName}</div>
            <div>NIWAOMOBITO co.ltd</div>
            <div>{companyAddress}</div>
            <div>tel/fax {companyTel}</div>
            <div>携帯 {companyMobile}</div>
            <div className="stamp-area">
              <div className="stamp-box">印</div>
              <div className="stamp-box">印</div>
            </div>
          </CompanyInfo>

          <SummaryBox>
            <div className="total-amount">合計金額 ¥{total.toLocaleString()}</div>
            <div className="tax-info">
              内消費税（{taxRate}%） ¥{taxAmount.toLocaleString()}
            </div>
          </SummaryBox>

          <div style={{ marginTop: '30mm' }}>
            <h3>作業内容</h3>
            <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>{projectName}</div>
          </div>
        </PageBreak>
      </EstimateContainer>

      {/* 2ページ目：明細 */}
      <EstimateContainer>
        <PageBreak>
          <Header>お見積・ご提案書</Header>
          
          <div style={{ textAlign: 'right', marginBottom: '10mm' }}>{date}</div>
          
          <ClientInfo>
            <div className="client-name" style={{ marginBottom: '20mm' }}>{clientName}</div>
            <div>御見積、ご提案申し上げます</div>
          </ClientInfo>

          <EstimateInfo>
            <div className="info-row">
              <span className="label">御見積有効期限</span>
              <span className="value">30日間有効</span>
            </div>
          </EstimateInfo>

          <ProjectDetails>
            <div className="detail-item">
              <div className="detail-label">工事名</div>
              <div className="detail-content">{projectName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">工事場所</div>
              <div className="detail-content">{location}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">工期</div>
              <div className="detail-content">{period}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">支払時期（契約書作成）</div>
              <div className="detail-content">
                着工時　　¥1,838,935
                中間金　　（契約書に基づく）
                完成時　　追加費用を含む契約金残金
              </div>
            </div>
          </ProjectDetails>

          <ItemTable>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>内容</th>
                <th style={{ width: '10%' }}>仕様</th>
                <th style={{ width: '10%' }}>数量</th>
                <th style={{ width: '20%' }}>単価（円）</th>
                <th style={{ width: '20%' }}>金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {sampleItems.map((item, index) => (
                <tr key={index}>
                  <td className="item-name">{item.name}</td>
                  <td>{item.unit}</td>
                  <td className="quantity">{item.quantity}</td>
                  <td className="unit-price">{item.unitPrice.toLocaleString()}</td>
                  <td className="amount">{item.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="subtotal-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>設計費</td>
                <td className="amount">{designFee.toLocaleString()}</td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>諸経費（交通費込み）</td>
                <td className="amount">{miscExpenses.toLocaleString()}</td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>小計</td>
                <td className="amount">{beforeTax.toLocaleString()}</td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>出精値引き</td>
                <td className="amount">0</td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>消費税</td>
                <td className="amount">{taxAmount.toLocaleString()}</td>
              </tr>
              <tr className="total-row">
                <td colSpan="4" style={{ textAlign: 'right' }}>合計</td>
                <td className="amount">{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </ItemTable>

          <div style={{ fontSize: '9pt', color: '#ff0000' }}>
            ※ 仕様及び数量変更の場合、事前打合せのうえ、別途御見積させていただきます。
          </div>
        </PageBreak>
      </EstimateContainer>

      {/* 3ページ目：特記事項 */}
      <EstimateContainer>
        <TermsAndConditions>
          <h3>お見積り追記項目</h3>
          
          <div className="terms-section">
            <h4>材料について</h4>
            <ul>
              <li>
                <strong>石材</strong><br />
                石材は今現在の金額ですが、仕入れ状況により金額の変動も予想されます。<br />
                変更があればご報告させて頂きます。
              </li>
              <li>
                <strong>植物</strong><br />
                植物に関しましては仕入れ状況により、高さ等の変更が生じる場合があります。<br />
                それに伴い金額に変更が生じた場合は、ご報告後調整させて頂きます<br />
                高さ等はあくまで目安となります。仕入れ時の樹木の姿、形で金額は変わります<br /><br />
                植栽状況にて、特に地被植物の量が多いと判断した場合は、ご請求時にその分を調整させて頂き最終ご請求を申し上げます。
              </li>
              <li>
                <strong>枯れ木保証について</strong><br />
                <span className="highlight">植栽した植木についての枯れ保証は含まれておりません</span>
              </li>
            </ul>
          </div>

          <div className="terms-section">
            <h4>施工について</h4>
            <ul>
              <li>
                <strong>図面</strong><br />
                図面は、あくまでイメージになります。施工中に地形の変更・植栽位置の変更が生じる場合があります。全体のバランスを確認しながらの作業となります。
              </li>
              <li>
                <strong>施工</strong><br />
                施工中は、出入りが多いくなります。材料手配・材料調達等で、不在になることがあります、家の施錠は確実にお願いいたします。
              </li>
              <li>
                <strong>トイレ</strong><br />
                お手洗いはお借りすることは基本ありませんが、手持ちの簡易トイレをお庭の一部に設置させて頂きます。それが不承知の場合は<br />
                定期的に、汚水処へ処分させていただきますので、ご了承ください
              </li>
              <li>
                <strong>車輌</strong><br />
                基本的には敷地内での駐車をさせて頂ければ幸いです。<br />
                使用車両：軽トラック<br />
                　　　　　1トントラック<br />
                　　　　　移動式クレーン車<br />
                　　　　　2〜3トンダンプ車<br />
                　　　　　その他
              </li>
              <li>
                <strong>近隣住宅への配慮</strong><br />
                作業開始日決定後、近隣住宅へ弊社より直接ご挨拶をさせて頂きます<br />
                （不在の場合は、挨拶文を郵便ポストに投函させて頂きます）
              </li>
              <li>
                <strong>電気・水道</strong><br />
                作業上、電源（外部コンセント）・水道等のご支給をお願いします
              </li>
              <li>
                <strong>その他</strong><br />
                予定外の作業が発生した場合（特に埋設物の有無等によるもの）は打合せをさせて頂き、作業工程の見直し、追加費用発生時は再度御見積させて頂きます<br /><br />
                作業時間等に関しましては、打ち合わせの上進めさせて頂きます<br />
                基本作業時間：朝8時頃〜夕方5時頃まで<br />
                （作業内容により、大幅に時間が必要な場合は、その都度ご報告させて頂きます）
              </li>
            </ul>
          </div>
        </TermsAndConditions>
      </EstimateContainer>
    </>
  );
};

export default EstimateTemplate;