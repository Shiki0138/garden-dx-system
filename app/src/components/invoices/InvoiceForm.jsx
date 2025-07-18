import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { downloadLandscapingInvoicePDF } from '../../utils/landscapingInvoicePDFGenerator';
import {
  useAuth,
  useInvoicePermissions,
  ManagerOnlyComponent,
  ProtectedComponent,
  PERMISSIONS,
} from '../../hooks/useAuth';
import { log } from '../../utils/logger';
import { showError, showSuccess, showWarning, showConfirmDialog } from '../../utils/notifications';
import { useErrorHandler, withErrorHandling } from '../../utils/errorHandler';
import {
  FONT_SIZES,
  TOUCH_SIZES,
  SPACING,
  MOBILE_STYLES,
  COLORS,
  mediaQuery,
} from '../../styles/mobileConstants';

// アニメーション定義（UX向上）
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const Container = styled.div`
  padding: ${SPACING.lg};
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  animation: ${fadeInUp} 0.6s ease-out;
  ${MOBILE_STYLES.safeArea}

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    padding: ${SPACING.base};
    padding-top: max(${SPACING.base}, env(safe-area-inset-top));
  }

  /* アクセシビリティ: 動きを制限したユーザー向け */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING['2xl']};
  padding: ${SPACING.lg};
  background: linear-gradient(135deg, ${COLORS.white} 0%, ${COLORS.gray[50]} 100%);
  border-radius: 12px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  animation: ${slideIn} 0.5s ease-out;

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    flex-direction: column;
    gap: ${SPACING.base};
    padding: ${SPACING.base};
  }

  /* ホバー効果 */
  &:hover {
    box-shadow:
      0 8px 15px rgba(0, 0, 0, 0.12),
      0 2px 4px rgba(0, 0, 0, 0.08);
    transition: box-shadow 0.3s ease;
  }
`;

const Title = styled.h1`
  color: ${COLORS.gray[800]};
  margin: 0;
  font-size: ${FONT_SIZES['2xl']};
  font-weight: 600;
  ${MOBILE_STYLES.preventZoom}

  ${mediaQuery.mobile} {
    font-size: ${FONT_SIZES.xl};
  }
`;

const BackButton = styled.button`
  background: ${COLORS.gray[500]};
  color: ${COLORS.white};
  min-height: ${TOUCH_SIZES.medium};
  min-width: ${TOUCH_SIZES.medium};
  padding: ${SPACING.md} ${SPACING.lg};
  ${MOBILE_STYLES.touchOptimized}
  ${MOBILE_STYLES.buttonOptimized}
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-right: ${SPACING.base};
  font-weight: 600;
  transition: all 0.3s ease;

  &:active {
    background: ${COLORS.gray[600]};
    transform: scale(0.98);
  }

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    width: 100%;
    margin-right: 0;
    margin-bottom: ${SPACING.sm};
  }
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successDark} 100%);
  color: ${COLORS.white};
  border: none;
  ${MOBILE_STYLES.buttonOptimized}
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(39, 174, 96, 0.3);
  ${MOBILE_STYLES.touchOptimized}

  /* フォーカス状態（アクセシビリティ）*/
  &:focus-visible {
    outline: 2px solid ${COLORS.success};
    outline-offset: 2px;
  }

  /* アクティブ状態 */
  &:active {
    transform: scale(0.98);
    animation: ${pulse} 0.2s ease;
  }

  /* 無効状態 */
  &:disabled {
    background: ${COLORS.gray[400]};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    width: 100%;
    min-height: ${TOUCH_SIZES.large};
  }
`;

const FormSection = styled.div`
  background: linear-gradient(135deg, ${COLORS.white} 0%, ${COLORS.gray[50]} 100%);
  border-radius: 12px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.8);
  margin-bottom: ${SPACING.lg};
  padding: ${SPACING.xl};
  animation: ${fadeInUp} 0.6s ease-out;
  transition: all 0.3s ease;

  /* ホバー効果 */
  &:hover {
    box-shadow:
      0 8px 15px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    padding: ${SPACING.base};
    margin-bottom: ${SPACING.base};
  }

  /* 動きを制限したユーザー向け */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover {
      transform: none;
    }
  }
`;

const SectionTitle = styled.h2`
  color: ${COLORS.gray[800]};
  font-size: ${FONT_SIZES.md};
  margin-bottom: ${SPACING.lg};
  border-bottom: 2px solid ${COLORS.primary};
  padding-bottom: ${SPACING.sm};
  ${MOBILE_STYLES.preventZoom}
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${SPACING.lg};
  margin-bottom: ${SPACING.lg};

  /* レスポンシブ対応 */
  ${mediaQuery.mobile} {
    grid-template-columns: 1fr;
    gap: ${SPACING.base};
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${COLORS.gray[800]};
  margin-bottom: ${SPACING.xs};
  font-size: ${FONT_SIZES.base};
  ${MOBILE_STYLES.preventZoom}
`;

const Input = styled.input`
  ${MOBILE_STYLES.inputOptimized}
  border: 2px solid ${COLORS.gray[300]};
  background: ${COLORS.white};
  transition: all 0.3s ease;

  /* フォーカス状態（アクセシビリティ強化）*/
  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 3px ${COLORS.primary}20;
    background: ${COLORS.gray[50]};
  }

  /* ホバー状態 */
  &:hover {
    border-color: ${COLORS.gray[400]};
  }

  /* エラー状態 */
  &.error {
    border-color: ${COLORS.error};
    box-shadow: 0 0 0 3px ${COLORS.error}20;
  }

  /* 無効状態 */
  &:disabled {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[500]};
    cursor: not-allowed;
  }

  /* 必須フィールド */
  &[required] {
    border-left: 4px solid ${COLORS.warning};
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px; /* iOS Safari のズーム防止 */
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    background: #2c3e50;
    color: #ecf0f1;
    border-color: #34495e;
  }
`;

const Select = styled.select`
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  min-height: 44px; /* タッチ操作のための最小サイズ */

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
    background: #fafbfc;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px; /* iOS Safari のズーム防止 */
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
    background: #fafbfc;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px; /* iOS Safari のズーム防止 */
    min-height: 100px;
  }
`;

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const TableHeader = styled.th`
  background: #34495e;
  color: white;
  padding: 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
`;

const TableCell = styled.td`
  padding: 10px;
  border-bottom: 1px solid #eee;
`;

const ItemInput = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-height: 36px; /* タッチ操作のための最小サイズ */

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 16px; /* iOS Safari のズーム防止 */
  }
`;

const AddItemButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-height: 44px; /* タッチ操作のための最小サイズ */

  &:hover {
    background: #2980b9;
    transform: translateY(-1px);
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    width: 100%;
    padding: 14px 24px;
    font-size: 16px;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: 1px solid #3498db;
  color: #3498db;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;

  &:hover {
    background: #3498db;
    color: white;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 14px;
  }
`;

const TotalSection = styled.div`
  background: linear-gradient(135deg, #ecf0f1 0%, #d5dbdb 100%);
  padding: 24px;
  border-radius: 12px;
  margin-top: 20px;
  border: 2px solid rgba(52, 152, 219, 0.1);
  animation: ${fadeInUp} 0.8s ease-out;
  position: relative;

  /* 装飾的なボーダー */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #3498db, #2ecc71, #f39c12);
    border-radius: 12px 12px 0 0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 16px;
`;

const TotalLabel = styled.span`
  font-weight: 600;
  color: #2c3e50;
`;

const TotalValue = styled.span`
  font-weight: 700;
  color: #2c3e50;
  font-size: 18px;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: -0.5px;

  /* アニメーション */
  animation: ${slideIn} 0.5s ease-out;

  /* 大きな金額の場合 */
  &.large-amount {
    font-size: 24px;
    color: #27ae60;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
`;

const InvoiceForm = ({ invoiceId = null, estimateId = null }) => {
  // 権限チェック（最適化）
  const { user, isManager } = useAuth();
  const invoicePermissions = useInvoicePermissions();

  // エラーハンドリング
  const handleError = useErrorHandler('InvoiceForm');

  // パフォーマンス状態管理
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // メモ化されたフォーム初期値
  const initialFormData = useMemo(
    () => ({
      invoice_number: '',
      customer_id: '',
      project_id: '',
      estimate_id: estimateId || '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
      status: '未送付',
    }),
    [estimateId]
  );

  const [formData, setFormData] = useState(initialFormData);

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  // メモ化された計算値
  const calculatedTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax_rate = 0.1; // 10%
    const tax_amount = Math.floor(subtotal * tax_rate);
    const total_amount = subtotal + tax_amount;

    return {
      subtotal,
      tax_amount,
      total_amount,
    };
  }, [items]);

  // 初期データ読み込み関数
  const loadInitialData = useCallback(async () => {
    try {
      // 仮データ
      setCustomers([
        { id: 1, name: '田中造園株式会社', contact_person: '田中太郎' },
        { id: 2, name: '山田工務店', contact_person: '山田花子' },
      ]);

      setProjects([
        { id: 1, name: '新宿オフィスビル庭園工事', customer_id: 1 },
        { id: 2, name: '住宅庭園設計・施工', customer_id: 2 },
      ]);

      setEstimates([
        { id: 1, project_id: 1, estimate_number: 'EST-2024-001', total_amount: 1250000 },
        { id: 2, project_id: 2, estimate_number: 'EST-2024-002', total_amount: 850000 },
      ]);

      // 見積IDが指定されている場合は自動生成
      if (estimateId) {
        await generateFromEstimate(estimateId);
      }

      // 請求書番号を自動生成
      if (!invoiceId) {
        generateInvoiceNumber();
      }
    } catch (error) {
      handleError(error, { context: 'loadInitialData' });
    }
  }, [estimateId, invoiceId, generateFromEstimate, handleError, generateInvoiceNumber]);

  useEffect(() => {
    // TODO: 顧客・プロジェクト・見積データの取得
    loadInitialData();
  }, [invoiceId, estimateId, loadInitialData]);

  // 計算値の更新（最適化）
  useEffect(() => {
    setTotals(calculatedTotals);
  }, [calculatedTotals]);

  const generateInvoiceNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const number = `INV-${year}${month}${day}-001`; // TODO: 連番管理

    setFormData(prev => ({
      ...prev,
      invoice_number: number,
    }));
  }, []);

  const generateFromEstimate = async estimateId => {
    try {
      // TODO: 実際のAPI呼び出し
      const estimate = estimates.find(e => e.id === parseInt(estimateId, 10));
      if (estimate) {
        const project = projects.find(p => p.id === estimate.project_id);

        setFormData(prev => ({
          ...prev,
          estimate_id: estimateId,
          project_id: estimate.project_id,
          customer_id: project?.customer_id || '',
        }));

        // 見積明細から請求書明細を生成
        const mockItems = [
          {
            category: '植栽工事',
            item_name: 'マツ H3.0 植栽工事',
            quantity: 10,
            unit: '本',
            unit_price: 45000,
            amount: 450000,
          },
          {
            category: '外構工事',
            item_name: '石積み工事',
            quantity: 15,
            unit: 'm2',
            unit_price: 35000,
            amount: 525000,
          },
        ];
        setItems(mockItems);
      }
    } catch (error) {
      handleError(error, { context: 'generateFromEstimate' });
    }
  };

  // フォーム検証関数
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.invoice_number.trim()) {
      errors.invoice_number = '請求書番号は必須です';
    }

    if (!formData.customer_id) {
      errors.customer_id = '顧客の選択は必須です';
    }

    if (!formData.invoice_date) {
      errors.invoice_date = '請求日は必須です';
    }

    if (!formData.due_date) {
      errors.due_date = '支払期限は必須です';
    }

    if (items.length === 0) {
      errors.items = '請求明細を少なくとも1件入力してください';
    }

    return errors;
  }, [formData, items]);

  // アクセシビリティ: キーボードナビゲーション
  const handleKeyDown = useCallback(
    e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'p':
            e.preventDefault();
            handlePreviewPDF();
            break;
        }
      }
    },
    [handlePreviewPDF, handleSave]
  );

  // キーボードイベントの設定
  useEffect(() => {
    const keydownHandler = e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'p':
            e.preventDefault();
            handlePreviewPDF();
            break;
        }
      }
    };

    document.addEventListener('keydown', keydownHandler);
    return () => {
      document.removeEventListener('keydown', keydownHandler);
    };
  }, [handleSave, handlePreviewPDF]);

  // メモ化されたイベントハンドラー
  const handleInputChange = useCallback(
    e => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
      setIsDirty(true);

      // エラークリア
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: null,
        }));
      }
    },
    [errors]
  );

  const handleItemChange = useCallback((index, field, value) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };

      // 金額の自動計算（最適化）
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = parseFloat(newItems[index].quantity) || 0;
        const unit_price = parseFloat(newItems[index].unit_price) || 0;
        newItems[index].amount = quantity * unit_price;
      }

      return newItems;
    });
    setIsDirty(true);
  }, []);

  const addItem = useCallback(() => {
    setItems(prevItems => [
      ...prevItems,
      {
        category: '',
        item_name: '',
        quantity: 0,
        unit: '',
        unit_price: 0,
        amount: 0,
      },
    ]);
    setIsDirty(true);
  }, []);

  const removeItem = useCallback(index => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    // 権限チェック：経営者のみ請求書保存可能
    if (!invoicePermissions.canCreate && !invoicePermissions.canEdit) {
      showError('請求書の保存権限がありません。経営者にお問い合わせください。');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // フォーム検証
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const invoiceData = {
        ...formData,
        items,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        created_by: user?.id,
        updated_by: user?.id,
      };

      // TODO: API呼び出し
      log.info('請求書保存:', invoiceData);

      // 成功時の処理
      showSuccess('請求書を保存しました');
      setIsDirty(false);
    } catch (error) {
      handleError(error, { context: 'saveInvoice' });
      setErrors({ general: '保存に失敗しました。再度お試しください。' });
    } finally {
      setIsLoading(false);
    }
  }, [formData, items, totals, user, invoicePermissions, validateForm, handleError]);

  const handlePreviewPDF = useCallback(async () => {
    setIsLoading(true);

    try {
      const invoiceData = {
        ...formData,
        items,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        customer_name: customers.find(c => c.id === parseInt(formData.customer_id, 10))?.name || '',
        project_name: projects.find(p => p.id === parseInt(formData.project_id, 10))?.name || '',
      };

      // 会社情報（実際の設定から取得）
      const companyInfo = {
        name: '造園業株式会社',
        address: '東京都○○区○○1-1-1',
        phone: '03-0000-0000',
        email: 'info@landscaping.co.jp',
        bank_name: '○○銀行 ○○支店',
        account_type: '普通預金',
        account_number: '1234567',
        account_holder: '造園業株式会社',
      };

      // 見積書データ（連携情報）
      const estimateData = estimates.find(e => e.id === parseInt(formData.estimate_id, 10)) || null;

      // 造園業界標準PDFを生成・ダウンロード（最適化版）
      await downloadLandscapingInvoicePDF(invoiceData, companyInfo, null, {
        notifyDownload: true,
        notifySuccess: true,
      });
    } catch (error) {
      handleError(error, { context: 'generatePDF' });
    } finally {
      setIsLoading(false);
    }
  }, [formData, items, totals, customers, projects, estimates, handleError]);

  // メモ化された通貨フォーマット関数
  const formatCurrency = useCallback(amount => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // ページ離脱警告（未保存の変更がある場合）
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。ページを離れますか？';
        log.warn('ページ離脱警告: 未保存の変更があります');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  return (
    <Container>
      <Header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <BackButton onClick={() => window.history.back()}>戻る</BackButton>
          <Title>{invoiceId ? '請求書編集' : '請求書作成'}</Title>
        </div>
        <ManagerOnlyComponent
          fallback={
            <div
              style={{
                color: '#e74c3c',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: '8px 12px',
                backgroundColor: '#fdf2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
              }}
              role="alert"
              aria-live="polite"
            >
              ※請求書の作成・編集は経営者のみ可能です
            </div>
          }
        >
          <SaveButton
            onClick={handleSave}
            disabled={isLoading}
            aria-label="請求書を保存 (Ctrl+S)"
            title="請求書を保存 (Ctrl+S)"
          >
            {isLoading ? '保存中...' : '保存'}
          </SaveButton>
        </ManagerOnlyComponent>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <SaveButton
            onClick={handlePreviewPDF}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)',
            }}
            aria-label="PDFを出力 (Ctrl+P)"
            title="PDFを出力 (Ctrl+P)"
          >
            {isLoading ? 'PDF生成中...' : 'PDF出力'}
          </SaveButton>
        </div>
      </Header>

      <FormSection>
        <SectionTitle>基本情報</SectionTitle>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="invoice_number">請求書番号 *</Label>
            <Input
              id="invoice_number"
              type="text"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleInputChange}
              readOnly
              required
              aria-describedby={errors.invoice_number ? 'invoice_number_error' : undefined}
              className={errors.invoice_number ? 'error' : ''}
            />
            {errors.invoice_number && (
              <div
                id="invoice_number_error"
                role="alert"
                style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}
              >
                {errors.invoice_number}
              </div>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="customer_id">顧客 *</Label>
            <Select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange}
              required
              aria-describedby={errors.customer_id ? 'customer_id_error' : undefined}
              className={errors.customer_id ? 'error' : ''}
            >
              <option value="">顧客を選択してください</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            {errors.customer_id && (
              <div
                id="customer_id_error"
                role="alert"
                style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}
              >
                {errors.customer_id}
              </div>
            )}
          </FormGroup>

          <FormGroup>
            <Label>プロジェクト</Label>
            <Select name="project_id" value={formData.project_id} onChange={handleInputChange}>
              <option value="">プロジェクトを選択</option>
              {projects
                .filter(p => p.customer_id === parseInt(formData.customer_id, 10))
                .map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>見積書</Label>
            <Select name="estimate_id" value={formData.estimate_id} onChange={handleInputChange}>
              <option value="">見積書を選択</option>
              {estimates
                .filter(e => e.project_id === parseInt(formData.project_id, 10))
                .map(estimate => (
                  <option key={estimate.id} value={estimate.id}>
                    {estimate.estimate_number}
                  </option>
                ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="invoice_date">請求日 *</Label>
            <Input
              id="invoice_date"
              type="date"
              name="invoice_date"
              value={formData.invoice_date}
              onChange={handleInputChange}
              required
              aria-describedby={errors.invoice_date ? 'invoice_date_error' : undefined}
              className={errors.invoice_date ? 'error' : ''}
            />
            {errors.invoice_date && (
              <div
                id="invoice_date_error"
                role="alert"
                style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}
              >
                {errors.invoice_date}
              </div>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="due_date">支払期限 *</Label>
            <Input
              id="due_date"
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              required
              aria-describedby={errors.due_date ? 'due_date_error' : undefined}
              className={errors.due_date ? 'error' : ''}
            />
            {errors.due_date && (
              <div
                id="due_date_error"
                role="alert"
                style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}
              >
                {errors.due_date}
              </div>
            )}
          </FormGroup>
        </FormGrid>

        <FormGroup>
          <Label htmlFor="notes">備考</Label>
          <TextArea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="請求に関する備考があれば入力してください"
            aria-describedby="notes_help"
            rows={4}
          />
          <div id="notes_help" style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
            工事条件や特記事項など、請求に関する補足情報を入力できます
          </div>
        </FormGroup>
      </FormSection>

      <FormSection>
        <SectionTitle>請求明細</SectionTitle>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <ItemsTable>
            <thead>
              <tr>
                <TableHeader>カテゴリ</TableHeader>
                <TableHeader>品目・摘要</TableHeader>
                <TableHeader>数量</TableHeader>
                <TableHeader>単位</TableHeader>
                <TableHeader>単価</TableHeader>
                <TableHeader>金額</TableHeader>
                <TableHeader>操作</TableHeader>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <TableCell>
                    <ItemInput
                      type="text"
                      value={item.category}
                      onChange={e => handleItemChange(index, 'category', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <ItemInput
                      type="text"
                      value={item.item_name}
                      onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <ItemInput
                      type="number"
                      value={item.quantity}
                      onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <ItemInput
                      type="text"
                      value={item.unit}
                      onChange={e => handleItemChange(index, 'unit', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <ItemInput
                      type="number"
                      value={item.unit_price}
                      onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>
                    <ActionButton
                      onClick={() => removeItem(index)}
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        minHeight: '36px',
                        padding: '8px 12px',
                      }}
                      aria-label={`明細行 ${index + 1} を削除`}
                    >
                      削除
                    </ActionButton>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </ItemsTable>
        </div>

        <AddItemButton onClick={addItem}>明細追加</AddItemButton>

        <TotalSection>
          <TotalRow>
            <TotalLabel>小計:</TotalLabel>
            <TotalValue aria-label={`小計 ${formatCurrency(totals.subtotal)}`}>
              {formatCurrency(totals.subtotal)}
            </TotalValue>
          </TotalRow>
          <TotalRow>
            <TotalLabel>消費税 (10%):</TotalLabel>
            <TotalValue aria-label={`消費税 ${formatCurrency(totals.tax_amount)}`}>
              {formatCurrency(totals.tax_amount)}
            </TotalValue>
          </TotalRow>
          <TotalRow style={{ borderTop: '2px solid #34495e', paddingTop: '10px' }}>
            <TotalLabel>請求合計:</TotalLabel>
            <TotalValue
              className={totals.total_amount > 1000000 ? 'large-amount' : ''}
              style={{ fontSize: '24px', color: '#e74c3c' }}
              aria-label={`請求合計 ${formatCurrency(totals.total_amount)}`}
              role="status"
              aria-live="polite"
            >
              {formatCurrency(totals.total_amount)}
            </TotalValue>
          </TotalRow>
        </TotalSection>
      </FormSection>
    </Container>
  );
};

export default InvoiceForm;
