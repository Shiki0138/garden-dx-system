/**
 * PDF生成コンポーネント
 * 見積書・請求書の統合PDF出力機能（本番リリース対応）
 */

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { 
  FileText, 
  Download, 
  Printer, 
  Save,
  Eye,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader,
  Image,
  Stamp
} from 'lucide-react';

import { 
  generateLandscapingInvoicePDF,
  downloadLandscapingInvoicePDF,
  LANDSCAPING_STANDARDS 
} from '../utils/landscapingInvoicePDFGenerator';

// 造園業界標準カラーパレット
const colors = {
  primary: '#1a472a',
  secondary: '#2d5a3d',
  accent: '#4a7c3c',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  background: '#fafafa',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#1f2937',
  textLight: '#6b7280',
  textWhite: '#ffffff'
};

// メインコンテナ
const Container = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  margin: 20px 0;
  box-shadow: 0 4px 20px rgba(26, 71, 42, 0.1);
  border: 1px solid ${colors.border};
`;

// ヘッダーセクション
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid ${colors.border};
`;

const HeaderIcon = styled.div`
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textWhite};
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const HeaderTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${colors.text};
  margin: 0 0 5px 0;
`;

const HeaderSubtitle = styled.p`
  font-size: 1rem;
  color: ${colors.textLight};
  margin: 0;
`;

// 設定セクション
const SettingsSection = styled.div`
  margin-bottom: 25px;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${colors.text};
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const SettingCard = styled.div`
  background: ${colors.background};
  border-radius: 8px;
  padding: 20px;
  border: 1px solid ${colors.border};
`;

const SettingLabel = styled.label`
  display: block;
  font-weight: 600;
  color: ${colors.text};
  margin-bottom: 8px;
`;

const SettingInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 2px solid ${colors.border};
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }
`;

const SettingSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 2px solid ${colors.border};
  border-radius: 6px;
  font-size: 14px;
  background: ${colors.surface};
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 71, 42, 0.1);
  }
`;

const FileUpload = styled.div`
  border: 2px dashed ${colors.border};
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${colors.primary};
    background: rgba(26, 71, 42, 0.05);
  }
  
  input[type="file"] {
    display: none;
  }
`;

const UploadIcon = styled.div`
  margin: 0 auto 10px;
  width: 48px;
  height: 48px;
  background: ${colors.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textWhite};
`;

const ImagePreview = styled.div`
  margin-top: 15px;
  
  img {
    max-width: 150px;
    max-height: 100px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid ${colors.border};
  }
`;

// プレビューセクション
const PreviewSection = styled.div`
  margin-bottom: 25px;
`;

const PreviewCard = styled.div`
  background: ${colors.background};
  border-radius: 8px;
  padding: 20px;
  border: 1px solid ${colors.border};
  text-align: center;
`;

const PreviewIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, ${colors.info}, ${colors.accent});
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textWhite};
  margin: 0 auto 15px;
`;

// アクションボタン
const ActionsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
`;

const ActionButton = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: center;
  
  ${props => props.variant === 'primary' && `
    background: ${colors.primary};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: ${colors.secondary};
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: ${colors.surface};
    color: ${colors.primary};
    border: 2px solid ${colors.primary};
    
    &:hover:not(:disabled) {
      background: ${colors.primary};
      color: ${colors.textWhite};
    }
  `}
  
  ${props => props.variant === 'success' && `
    background: ${colors.success};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: #047857;
      transform: translateY(-2px);
    }
  `}
  
  ${props => props.variant === 'warning' && `
    background: ${colors.warning};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: #c2410c;
      transform: translateY(-2px);
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// ステータス表示
const StatusMessage = styled.div`
  margin: 15px 0;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  
  ${props => props.type === 'success' && `
    background: rgba(5, 150, 105, 0.1);
    color: ${colors.success};
    border: 1px solid rgba(5, 150, 105, 0.3);
  `}
  
  ${props => props.type === 'error' && `
    background: rgba(220, 38, 38, 0.1);
    color: ${colors.error};
    border: 1px solid rgba(220, 38, 38, 0.3);
  `}
  
  ${props => props.type === 'info' && `
    background: rgba(2, 132, 199, 0.1);
    color: ${colors.info};
    border: 1px solid rgba(2, 132, 199, 0.3);
  `}
`;

/**
 * PDF生成メインコンポーネント
 */
const PDFGenerator = ({ 
  documentData = null,
  documentType = 'invoice', // 'invoice' or 'estimate'
  onGenerated = () => {},
  onError = () => {}
}) => {
  // ステート管理
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: '造園業株式会社',
    postal_code: '123-0000',
    address: '東京都新宿区○○1-1-1 ○○ビル3F',
    phone: '03-0000-0000',
    fax: '03-0000-0001',
    email: 'info@landscaping-company.co.jp',
    business_license: '東京都知事許可（般-XX）第XXXXX号',
    bank_name: 'みずほ銀行 新宿支店',
    account_type: '普通預金',
    account_number: '1234567',
    account_holder: '造園業株式会社',
    logo: null,
    company_seal: null
  });
  
  const logoInputRef = useRef(null);
  const sealInputRef = useRef(null);
  
  // サンプルデータ
  const sampleData = {
    invoice_number: 'INV-2024-001',
    customer_name: 'テスト造園株式会社',
    customer_address: '東京都世田谷区テスト1-1-1',
    customer_phone: '03-TEST-0000',
    customer_contact: 'テスト太郎',
    project_name: 'テスト庭園工事',
    site_address: '東京都工事区工事1-1-1',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '造園業界標準準拠のテストPDF生成',
    items: [
      {
        category: '植栽工事',
        item_name: 'ソメイヨシノ H3.0',
        quantity: 3,
        unit: '本',
        unit_price: 45000,
        amount: 135000,
        notes: '根回し済み'
      },
      {
        category: '外構工事', 
        item_name: '石積み工事',
        quantity: 15,
        unit: 'm2',
        unit_price: 35000,
        amount: 525000
      },
      {
        category: '造成工事',
        item_name: '土壌改良工事',
        quantity: 100,
        unit: 'm2',
        unit_price: 1500,
        amount: 150000
      }
    ],
    subtotal: 810000,
    tax_amount: 81000,
    total_amount: 891000
  };
  
  // イベントハンドラー
  const handleCompanyInfoChange = useCallback((field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  const handleFileUpload = useCallback((type, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイルサイズチェック（2MB制限）
    if (file.size > 2 * 1024 * 1024) {
      setStatus({
        type: 'error',
        message: 'ファイルサイズは2MB以下にしてください'
      });
      return;
    }
    
    // 画像ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setStatus({
        type: 'error',
        message: '画像ファイル（PNG, JPG, GIF）を選択してください'
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      handleCompanyInfoChange(type, e.target.result);
      setStatus({
        type: 'success',
        message: `${type === 'logo' ? 'ロゴ' : '印鑑'}画像がアップロードされました`
      });
    };
    reader.readAsDataURL(file);
  }, [handleCompanyInfoChange]);
  
  const generatePDF = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const dataToUse = documentData || sampleData;
      
      const pdf = await generateLandscapingInvoicePDF(
        dataToUse,
        companyInfo,
        null,
        {
          quality: 'high',
          includeMetadata: true,
          optimizeForPrint: true
        }
      );
      
      setStatus({
        type: 'success',
        message: 'PDF生成が完了しました'
      });
      
      onGenerated(pdf);
      return pdf;
      
    } catch (error) {
      console.error('PDF生成エラー:', error);
      setStatus({
        type: 'error',
        message: `PDF生成でエラーが発生しました: ${error.message}`
      });
      onError(error);
    } finally {
      setLoading(false);
    }
  }, [documentData, sampleData, companyInfo, onGenerated, onError]);
  
  const downloadPDF = useCallback(async () => {
    setLoading(true);
    
    try {
      const dataToUse = documentData || sampleData;
      
      await downloadLandscapingInvoicePDF(
        dataToUse,
        companyInfo,
        null,
        {
          quality: 'high',
          notifyDownload: true,
          notifySuccess: true
        }
      );
      
      setStatus({
        type: 'success',
        message: 'PDFダウンロードが完了しました'
      });
      
    } catch (error) {
      console.error('PDFダウンロードエラー:', error);
      setStatus({
        type: 'error',
        message: `PDFダウンロードでエラーが発生しました: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  }, [documentData, sampleData, companyInfo]);
  
  const printPDF = useCallback(async () => {
    try {
      const pdf = await generatePDF();
      if (pdf) {
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        
        // メモリクリーンアップ
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
      }
    } catch (error) {
      console.error('PDF印刷エラー:', error);
      setStatus({
        type: 'error',
        message: `PDF印刷でエラーが発生しました: ${error.message}`
      });
    }
  }, [generatePDF]);
  
  const previewPDF = useCallback(async () => {
    try {
      const pdf = await generatePDF();
      if (pdf) {
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        window.open(pdfUrl, '_blank');
        
        // メモリクリーンアップ
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 5000);
      }
    } catch (error) {
      console.error('PDFプレビューエラー:', error);
      setStatus({
        type: 'error',
        message: `PDFプレビューでエラーが発生しました: ${error.message}`
      });
    }
  }, [generatePDF]);
  
  return (
    <Container>
      {/* ヘッダー */}
      <Header>
        <HeaderIcon>
          <FileText size={24} />
        </HeaderIcon>
        <HeaderContent>
          <HeaderTitle>
            {documentType === 'invoice' ? '請求書' : '見積書'}PDF生成
          </HeaderTitle>
          <HeaderSubtitle>
            造園業界標準準拠・ロゴ・印鑑対応の高品質PDF出力
          </HeaderSubtitle>
        </HeaderContent>
      </Header>
      
      {/* 会社情報設定 */}
      <SettingsSection>
        <SectionTitle>
          <Settings size={20} />
          会社情報設定
        </SectionTitle>
        
        <SettingsGrid>
          <SettingCard>
            <SettingLabel>会社名</SettingLabel>
            <SettingInput
              type="text"
              value={companyInfo.name}
              onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
              placeholder="造園業株式会社"
            />
          </SettingCard>
          
          <SettingCard>
            <SettingLabel>建設業許可番号</SettingLabel>
            <SettingInput
              type="text"
              value={companyInfo.business_license}
              onChange={(e) => handleCompanyInfoChange('business_license', e.target.value)}
              placeholder="東京都知事許可（般-XX）第XXXXX号"
            />
          </SettingCard>
          
          <SettingCard>
            <SettingLabel>電話番号</SettingLabel>
            <SettingInput
              type="text"
              value={companyInfo.phone}
              onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
              placeholder="03-0000-0000"
            />
          </SettingCard>
          
          <SettingCard>
            <SettingLabel>メールアドレス</SettingLabel>
            <SettingInput
              type="email"
              value={companyInfo.email}
              onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
              placeholder="info@landscaping-company.co.jp"
            />
          </SettingCard>
        </SettingsGrid>
        
        {/* ロゴ・印鑑アップロード */}
        <SettingsGrid>
          <SettingCard>
            <SettingLabel>会社ロゴ</SettingLabel>
            <FileUpload onClick={() => logoInputRef.current?.click()}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('logo', e)}
              />
              <UploadIcon>
                <Image size={24} />
              </UploadIcon>
              <div>ロゴ画像をアップロード</div>
              <div style={{ fontSize: '0.85rem', color: colors.textLight }}>
                PNG, JPG (最大2MB)
              </div>
            </FileUpload>
            {companyInfo.logo && (
              <ImagePreview>
                <img src={companyInfo.logo} alt="ロゴプレビュー" />
              </ImagePreview>
            )}
          </SettingCard>
          
          <SettingCard>
            <SettingLabel>会社印鑑</SettingLabel>
            <FileUpload onClick={() => sealInputRef.current?.click()}>
              <input
                ref={sealInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('company_seal', e)}
              />
              <UploadIcon>
                <Stamp size={24} />
              </UploadIcon>
              <div>印鑑画像をアップロード</div>
              <div style={{ fontSize: '0.85rem', color: colors.textLight }}>
                PNG, JPG (最大2MB)
              </div>
            </FileUpload>
            {companyInfo.company_seal && (
              <ImagePreview>
                <img src={companyInfo.company_seal} alt="印鑑プレビュー" />
              </ImagePreview>
            )}
          </SettingCard>
        </SettingsGrid>
      </SettingsSection>
      
      {/* プレビューセクション */}
      <PreviewSection>
        <SectionTitle>
          <Eye size={20} />
          プレビュー・生成
        </SectionTitle>
        
        <PreviewCard>
          <PreviewIcon>
            <FileText size={32} />
          </PreviewIcon>
          <div style={{ marginBottom: '15px' }}>
            <strong>
              {documentType === 'invoice' ? '請求書' : '見積書'}
              {documentData ? '' : '（サンプルデータ）'}
            </strong>
          </div>
          <div style={{ color: colors.textLight, fontSize: '0.9rem' }}>
            造園業界標準準拠・A4縦・300DPI高解像度
          </div>
        </PreviewCard>
      </PreviewSection>
      
      {/* ステータス表示 */}
      {status && (
        <StatusMessage type={status.type}>
          {status.type === 'success' && <CheckCircle size={20} />}
          {status.type === 'error' && <AlertCircle size={20} />}
          {status.type === 'info' && <AlertCircle size={20} />}
          {status.message}
        </StatusMessage>
      )}
      
      {/* アクションボタン */}
      <ActionsSection>
        <ActionButton
          variant="primary"
          onClick={previewPDF}
          disabled={loading}
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Eye size={18} />}
          プレビュー
        </ActionButton>
        
        <ActionButton
          variant="success"
          onClick={downloadPDF}
          disabled={loading}
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
          ダウンロード
        </ActionButton>
        
        <ActionButton
          variant="secondary"
          onClick={printPDF}
          disabled={loading}
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
          印刷
        </ActionButton>
        
        <ActionButton
          variant="warning"
          onClick={generatePDF}
          disabled={loading}
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
          PDF生成
        </ActionButton>
      </ActionsSection>
    </Container>
  );
};

export default PDFGenerator;