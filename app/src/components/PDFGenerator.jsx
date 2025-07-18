/**
 * PDF生成コンポーネント
 * 見積書・請求書の統合PDF出力機能（本番リリース対応）
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Stamp,
  BarChart,
  Zap,
} from 'lucide-react';

import {
  generateLandscapingInvoicePDF,
  downloadLandscapingInvoicePDF,
  LANDSCAPING_STANDARDS,
} from '../utils/landscapingInvoicePDFGenerator';
import {
  optimizePDFGeneration,
  createOptimizedPDF,
  optimizeImage,
  PDFPerformanceMonitor,
} from '../utils/pdfOptimizer';
import { generateInvoicePDF } from '../utils/pdfGenerator';

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
  textWhite: '#ffffff',
};

// メインコンテナ
const Container = styled.div`
  background: ${colors.surface};
  border-radius: 12px;
  padding: 25px;
  margin: 20px 0;
  box-shadow: 0 4px 20px rgba(26, 71, 42, 0.1);
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
  }
`;

// ヘッダーセクション
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid ${colors.border};

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 15px;
  }
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

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
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

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const SettingCard = styled.div`
  background: ${colors.background};
  border-radius: 8px;
  padding: 20px;
  border: 1px solid ${colors.border};

  @media (max-width: 768px) {
    padding: 15px;
  }
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

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 12px 14px;
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

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 12px 14px;
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

  &:active {
    transform: scale(0.98);
  }

  input[type='file'] {
    display: none;
  }

  @media (max-width: 768px) {
    padding: 15px;
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

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
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

  @media (max-width: 768px) {
    padding: 14px 24px;
    font-size: 18px;
    min-width: 160px;
    min-height: 50px;
  }

  ${props =>
    props.variant === 'primary' &&
    `
    background: ${colors.primary};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: ${colors.secondary};
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}

  ${props =>
    props.variant === 'secondary' &&
    `
    background: ${colors.surface};
    color: ${colors.primary};
    border: 2px solid ${colors.primary};
    
    &:hover:not(:disabled) {
      background: ${colors.primary};
      color: ${colors.textWhite};
    }
    
    &:active:not(:disabled) {
      transform: scale(0.95);
    }
  `}
  
  ${props =>
    props.variant === 'success' &&
    `
    background: ${colors.success};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: #047857;
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}
  
  ${props =>
    props.variant === 'warning' &&
    `
    background: ${colors.warning};
    color: ${colors.textWhite};
    
    &:hover:not(:disabled) {
      background: #c2410c;
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (hover: none) {
    &:hover {
      transform: none;
    }
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

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 14px;
  }

  ${props =>
    props.type === 'success' &&
    `
    background: rgba(5, 150, 105, 0.1);
    color: ${colors.success};
    border: 1px solid rgba(5, 150, 105, 0.3);
  `}

  ${props =>
    props.type === 'error' &&
    `
    background: rgba(220, 38, 38, 0.1);
    color: ${colors.error};
    border: 1px solid rgba(220, 38, 38, 0.3);
  `}
  
  ${props =>
    props.type === 'info' &&
    `
    background: rgba(2, 132, 199, 0.1);
    color: ${colors.info};
    border: 1px solid rgba(2, 132, 199, 0.3);
  `}
`;

// プログレスバーコンポーネント
const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${colors.border};
  border-radius: 3px;
  overflow: hidden;
  margin: 10px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

// パフォーマンス統計表示
const StatsCard = styled.div`
  background: ${colors.background};
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  border: 1px solid ${colors.border};
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 5px 0;
  font-size: 0.9rem;

  strong {
    color: ${colors.primary};
  }
`;

/**
 * PDF生成メインコンポーネント（最適化版）
 */
const PDFGenerator = ({
  documentData = null,
  documentType = 'invoice', // 'invoice' or 'estimate'
  onGenerated = () => {},
  onError = () => {},
  enableOptimization = true, // 最適化機能の有効/無効
  showStats = true, // 統計情報の表示
}) => {
  // ステート管理
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [optimizationStats, setOptimizationStats] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: '庭想人株式会社',
    catchphrase: '癒し空間に流れる風を...',
    postal_code: '639-2153',
    address: '奈良県葛城市太田262-1',
    representative: '安井利典',
    phone: '0745-48-3057',
    mobile: '090-8937-1314',
    fax: '0745-48-3057',
    email: 'info@landscaping-company.co.jp',
    business_license: '奈良県知事許可　第17752号',
    registration_number: 'TG15000102757５',
    bank_name: 'みずほ銀行 新宿支店',
    account_type: '普通預金',
    account_number: '1234567',
    account_holder: '庭想人株式会社',
    logo: null,
    company_seal: null,
  });

  const logoInputRef = useRef(null);
  const sealInputRef = useRef(null);
  const performanceMonitor = useRef(null);

  // パフォーマンスモニター初期化
  useEffect(() => {
    if (enableOptimization) {
      performanceMonitor.current = new PDFPerformanceMonitor();
    }
  }, [enableOptimization]);

  // サンプルデータ（実際の見積書に基づく）
  const sampleData = {
    documentType: 'estimate', // 'estimate' or 'invoice'
    estimate_number: 'NO.1',
    customer_name: '創建工房　緑',
    customer_address: '大阪府枚方市東香里南町20-10地内',
    customer_phone: '03-TEST-0000',
    customer_contact: 'テスト太郎',
    project_name: '山田様邸新築造園工事',
    site_address: '大阪府枚方市東香里南町20-10地内',
    estimate_date: new Date().toISOString().split('T')[0],
    validity_period: '1ヶ月',
    work_period: '180日',
    works_description: '拝啓、時下ますますご清栄のこととお喜び申し上げます。',
    notes: '造園業界標準準拠のテストPDF生成',
    items: [
      {
        content: '土工',
        category: 'NO.2',
        spec: '式',
        quantity: 1,
        unit_price: 413500,
        amount: 413500,
      },
      {
        content: '土留め石積み工',
        spec: 'm',
        quantity: 21.5,
        unit_price: 60000,
        amount: 1290000,
      },
      {
        content: 'アプローチ自然石乱張り',
        spec: 'm',
        quantity: 6,
        unit_price: 70000,
        amount: 420000,
      },
      {
        content: 'アプローチ三和土',
        spec: 'm',
        quantity: 3,
        unit_price: 22000,
        amount: 66000,
      },
      {
        content: '版築門柱（900×1500）',
        spec: '式',
        quantity: 1,
        unit_price: 150000,
        amount: 150000,
      },
      {
        content: '自然石水栓パン',
        spec: '式',
        quantity: 1,
        unit_price: 20000,
        amount: 20000,
      },
      {
        content: 'カーポート',
        category: 'NO.3',
        spec: '式',
        quantity: 1,
        unit_price: 1107948,
        amount: 1107948,
      },
      {
        content: 'テラス',
        category: 'NO.3',
        spec: '式',
        quantity: 1,
        unit_price: 396776,
        amount: 396776,
      },
      {
        content: '庭園灯等',
        category: 'NO.3',
        spec: '式',
        quantity: 1,
        unit_price: 87600,
        amount: 87600,
      },
      {
        content: 'ウッドフェンス建柱',
        spec: '式',
        quantity: 1,
        unit_price: 116170,
        amount: 116170,
      },
      {
        content: '植栽',
        spec: '式',
        quantity: 1,
        unit_price: 663450,
        amount: 663450,
      },
    ],
    design_fee: 200000,
    expenses: 641088,
    subtotal: 5572532,
    discount: 0,
    tax_amount: 557253,
    total_amount: 6129785,
  };

  // イベントハンドラー
  const handleCompanyInfoChange = useCallback((field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleFileUpload = useCallback(
    (type, event) => {
      const file = event.target.files[0];
      if (!file) {
        setStatus({
          type: 'error',
          message: 'ファイルが選択されていません',
        });
        return;
      }

      // ファイルサイズチェック（2MB制限）
      if (file.size > 2 * 1024 * 1024) {
        setStatus({
          type: 'error',
          message: 'ファイルサイズは2MB以下にしてください',
        });
        return;
      }

      // 画像ファイルタイプチェック
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setStatus({
          type: 'error',
          message: '画像ファイル（PNG, JPG, GIF）を選択してください',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        try {
          handleCompanyInfoChange(type, e.target.result);
          setStatus({
            type: 'success',
            message: `${type === 'logo' ? 'ロゴ' : '印鑑'}画像がアップロードされました（${(file.size / 1024).toFixed(1)}KB）`,
          });
        } catch (error) {
          setStatus({
            type: 'error',
            message: '画像の処理中にエラーが発生しました',
          });
        }
      };
      reader.onerror = () => {
        setStatus({
          type: 'error',
          message: 'ファイルの読み込みに失敗しました',
        });
      };
      reader.readAsDataURL(file);
    },
    [handleCompanyInfoChange]
  );

  const generatePDF = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    setProgress(0);

    try {
      // 基本データのバリデーション
      const dataToUse = documentData || sampleData;
      if (!dataToUse || !dataToUse.items || dataToUse.items.length === 0) {
        throw new Error('PDF生成に必要なデータが不足しています');
      }

      // 会社情報の基本チェック
      if (!companyInfo.name || !companyInfo.phone) {
        throw new Error('会社名と電話番号は必須項目です');
      }

      let pdf;

      if (enableOptimization && performanceMonitor.current) {
        // パフォーマンスモニター開始
        performanceMonitor.current.start();

        // プログレス更新関数
        const updateProgress = value => {
          setProgress(Math.min(value, 100));
        };

        // 最適化オプション
        const optimizationOptions = {
          quality: 'high',
          includeMetadata: true,
          optimizeForPrint: true,
          onProgress: updateProgress,
        };

        // データ前処理の進捗
        updateProgress(10);

        // 統一されたPDF生成関数を使用
        const generator =
          documentType === 'invoice' ? generateLandscapingInvoicePDF : generateInvoicePDF;

        updateProgress(20);

        // 最適化されたPDF生成
        pdf = await optimizePDFGeneration(
          async (data, options) => {
            updateProgress(50);
            const result = await generator(dataToUse, companyInfo, null, {
              ...optimizationOptions,
              ...options,
            });
            updateProgress(90);
            return result;
          },
          dataToUse,
          optimizationOptions
        );

        updateProgress(100);

        // パフォーマンス統計情報の取得
        if (showStats && pdf) {
          const pdfSize = pdf.output('blob').size;
          performanceMonitor.current.end(pdfSize);

          setOptimizationStats({
            renderTime: performanceMonitor.current.metrics.renderTime,
            memoryUsage: performanceMonitor.current.metrics.memoryUsage,
            pdfSize,
            optimizationEnabled: true,
          });
        }
      } else {
        // 通常のPDF生成
        const generator =
          documentType === 'invoice' ? generateLandscapingInvoicePDF : generateInvoicePDF;

        pdf = await generator(dataToUse, companyInfo, null, {
          quality: 'high',
          includeMetadata: true,
          optimizeForPrint: true,
        });
      }

      setStatus({
        type: 'success',
        message: 'PDF生成が完了しました',
      });

      onGenerated(pdf);
      return pdf;
    } catch (error) {
      console.error('PDF生成エラー:', error);
      let errorMessage = 'PDF生成でエラーが発生しました';

      if (error.message.includes('必要なデータが不足')) {
        errorMessage = 'PDF生成に必要なデータが不足しています';
      } else if (error.message.includes('会社名と電話番号')) {
        errorMessage = '会社名と電話番号は必須項目です';
      } else if (error.message.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';
      } else if (error.message.includes('timeout')) {
        errorMessage = '処理がタイムアウトしました。再度お試しください';
      } else if (error.message) {
        errorMessage = `エラー: ${error.message}`;
      }

      setStatus({
        type: 'error',
        message: errorMessage,
      });
      onError(error);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [
    documentData,
    sampleData,
    companyInfo,
    documentType,
    enableOptimization,
    showStats,
    onGenerated,
    onError,
  ]);

  const downloadPDF = useCallback(async () => {
    setLoading(true);

    try {
      const dataToUse = documentData || sampleData;

      await downloadLandscapingInvoicePDF(dataToUse, companyInfo, null, {
        quality: 'high',
        notifyDownload: true,
        notifySuccess: true,
      });

      setStatus({
        type: 'success',
        message: 'PDFダウンロードが完了しました',
      });
    } catch (error) {
      console.error('PDFダウンロードエラー:', error);
      setStatus({
        type: 'error',
        message: `PDFダウンロードでエラーが発生しました: ${error.message}`,
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
        message: `PDF印刷でエラーが発生しました: ${error.message}`,
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
        message: `PDFプレビューでエラーが発生しました: ${error.message}`,
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
          <HeaderTitle>{documentType === 'invoice' ? '請求書' : '見積書'}PDF生成</HeaderTitle>
          <HeaderSubtitle>造園業界標準準拠・ロゴ・印鑑対応の高品質PDF出力</HeaderSubtitle>
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
              onChange={e => handleCompanyInfoChange('name', e.target.value)}
              placeholder="造園業株式会社"
            />
          </SettingCard>

          <SettingCard>
            <SettingLabel>建設業許可番号</SettingLabel>
            <SettingInput
              type="text"
              value={companyInfo.business_license}
              onChange={e => handleCompanyInfoChange('business_license', e.target.value)}
              placeholder="東京都知事許可（般-XX）第XXXXX号"
            />
          </SettingCard>

          <SettingCard>
            <SettingLabel>電話番号</SettingLabel>
            <SettingInput
              type="text"
              value={companyInfo.phone}
              onChange={e => handleCompanyInfoChange('phone', e.target.value)}
              placeholder="03-0000-0000"
            />
          </SettingCard>

          <SettingCard>
            <SettingLabel>メールアドレス</SettingLabel>
            <SettingInput
              type="email"
              value={companyInfo.email}
              onChange={e => handleCompanyInfoChange('email', e.target.value)}
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
                onChange={e => handleFileUpload('logo', e)}
              />
              <UploadIcon>
                <Image size={24} />
              </UploadIcon>
              <div>ロゴ画像をアップロード</div>
              <div style={{ fontSize: '0.85rem', color: colors.textLight }}>PNG, JPG (最大2MB)</div>
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
                onChange={e => handleFileUpload('company_seal', e)}
              />
              <UploadIcon>
                <Stamp size={24} />
              </UploadIcon>
              <div>印鑑画像をアップロード</div>
              <div style={{ fontSize: '0.85rem', color: colors.textLight }}>PNG, JPG (最大2MB)</div>
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

      {/* プログレスバー */}
      {loading && progress > 0 && (
        <ProgressBar>
          <ProgressFill progress={progress} />
        </ProgressBar>
      )}

      {/* ステータス表示 */}
      {status && (
        <StatusMessage type={status.type}>
          {status.type === 'success' && <CheckCircle size={20} />}
          {status.type === 'error' && <AlertCircle size={20} />}
          {status.type === 'info' && <AlertCircle size={20} />}
          {status.message}
        </StatusMessage>
      )}

      {/* 最適化統計情報 */}
      {showStats && optimizationStats && (
        <StatsCard>
          <SectionTitle>
            <Zap size={20} />
            パフォーマンス統計
          </SectionTitle>
          <StatItem>
            <span>生成時間:</span>
            <strong>{optimizationStats.renderTime?.toFixed(2) || 0}ms</strong>
          </StatItem>
          <StatItem>
            <span>メモリ使用量:</span>
            <strong>{((optimizationStats.memoryUsage || 0) / 1024 / 1024).toFixed(2)}MB</strong>
          </StatItem>
          <StatItem>
            <span>PDFサイズ:</span>
            <strong>{((optimizationStats.pdfSize || 0) / 1024).toFixed(2)}KB</strong>
          </StatItem>
          <StatItem>
            <span>最適化:</span>
            <strong>{optimizationStats.optimizationEnabled ? '有効' : '無効'}</strong>
          </StatItem>
        </StatsCard>
      )}

      {/* アクションボタン */}
      <ActionsSection>
        <ActionButton variant="primary" onClick={previewPDF} disabled={loading}>
          {loading ? <Loader size={18} className="animate-spin" /> : <Eye size={18} />}
          プレビュー
        </ActionButton>

        <ActionButton variant="success" onClick={downloadPDF} disabled={loading}>
          {loading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
          ダウンロード
        </ActionButton>

        <ActionButton variant="secondary" onClick={printPDF} disabled={loading}>
          {loading ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
          印刷
        </ActionButton>

        <ActionButton variant="warning" onClick={generatePDF} disabled={loading}>
          {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
          PDF生成
        </ActionButton>
      </ActionsSection>
    </Container>
  );
};

export default PDFGenerator;
