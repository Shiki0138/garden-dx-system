/**
 * Garden 造園業向け統合業務管理システム
 * 見積書作成ウィザード - 4ステップ形式
 * バージョンアップ実装: 造園事業者向け最適化UI
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiCheck,
  FiArrowRight,
  FiArrowLeft,
  FiSave,
  FiFileText,
  FiUser,
  FiClipboard,
  FiLayers,
  FiTool,
  FiTrendingUp,
  FiHome,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiEdit3,
  FiPlus,
  FiMinus,
  FiInfo,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { 
  FONT_SIZES, 
  TOUCH_SIZES, 
  SPACING, 
  MOBILE_STYLES, 
  COLORS, 
  mediaQuery 
} from '../styles/mobileConstants';

// アニメーション定義
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideInFromRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const progressAnimation = keyframes`
  0% { width: 0%; }
  100% { width: var(--progress-width); }
`;

// スタイルコンポーネント
const WizardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 50%, #e8f5e8 100%);
  padding: ${SPACING.lg};
  animation: ${fadeInUp} 0.8s ease-out;
  ${MOBILE_STYLES.safeArea}

  ${mediaQuery.mobile} {
    padding: ${SPACING.base};
    padding-top: max(${SPACING.base}, env(safe-area-inset-top));
  }
`;

const WizardHeader = styled.div`
  max-width: 1200px;
  margin: 0 auto ${SPACING['2xl']} auto;
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  border-radius: 16px;
  padding: ${SPACING['2xl']};
  color: ${COLORS.white};
  box-shadow: 0 10px 30px rgba(45, 90, 45, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '🌿';
    position: absolute;
    top: ${SPACING.lg};
    right: ${SPACING['2xl']};
    font-size: 48px;
    opacity: 0.3;
  }

  ${mediaQuery.mobile} {
    padding: ${SPACING.lg};
    margin-bottom: ${SPACING.lg};
    
    &::before {
      font-size: 36px;
      right: ${SPACING.lg};
    }
  }
`;

const WizardTitle = styled.h1`
  margin: 0 0 ${SPACING.base} 0;
  font-size: ${FONT_SIZES['3xl']};
  ${MOBILE_STYLES.preventZoom}
  
  ${mediaQuery.mobile} {
    font-size: ${FONT_SIZES['2xl']};
  }
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: ${SPACING.base};

  ${mediaQuery.mobile} {
    gap: ${SPACING.sm};
  }
`;

const WizardSubtitle = styled.p`
  margin: 0;
  font-size: ${FONT_SIZES.md};
  opacity: 0.9;
  ${MOBILE_STYLES.preventZoom}

  ${mediaQuery.mobile} {
    font-size: ${FONT_SIZES.base};
  }
`;

const ProgressContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto ${SPACING['3xl']} auto;
  background: ${COLORS.white};
  border-radius: 12px;
  padding: ${SPACING.xl};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  
  ${mediaQuery.mobile} {
    padding: ${SPACING.base};
    margin-bottom: ${SPACING.xl};
  }
`;

const StepsIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${SPACING.lg};
  position: relative;

  ${mediaQuery.mobile} {
    flex-direction: column;
    gap: ${SPACING.base};
  }
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  z-index: 2;
  ${MOBILE_STYLES.touchOptimized}

  ${mediaQuery.mobile} {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    min-height: ${TOUCH_SIZES.medium};
    padding: ${SPACING.sm};
  }
`;

const StepNumber = styled.div`
  width: ${TOUCH_SIZES.medium};
  height: ${TOUCH_SIZES.medium};
  border-radius: 50%;
  background: ${props => {
    if (props.completed) return 'linear-gradient(135deg, #4a7c4a, #2d5a2d)';
    if (props.active) return 'linear-gradient(135deg, #7cb342, #4a7c4a)';
    return COLORS.gray[200];
  }};
  color: ${props => (props.completed || props.active ? COLORS.white : COLORS.gray[600])};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: ${FONT_SIZES.base};
  transition: all 0.3s ease;
  box-shadow: ${props =>
    props.completed || props.active ? '0 4px 15px rgba(74, 124, 74, 0.3)' : 'none'};

  ${mediaQuery.mobile} {
    margin-right: ${SPACING.base};
    width: ${TOUCH_SIZES.small};
    height: ${TOUCH_SIZES.small};
  }
`;

const StepLabel = styled.span`
  margin-top: ${SPACING.sm};
  font-size: ${FONT_SIZES.sm};
  font-weight: 600;
  color: ${props => (props.completed || props.active ? '#2d5a2d' : COLORS.gray[600])};
  text-align: center;
  ${MOBILE_STYLES.preventZoom}

  ${mediaQuery.mobile} {
    margin-top: 0;
    text-align: left;
    font-size: ${FONT_SIZES.base};
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 3px;
  background: ${COLORS.gray[200]};
  border-radius: 3px;
  z-index: 1;

  ${mediaQuery.mobile} {
    display: none;
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #4a7c4a, #7cb342);
  border-radius: 3px;
  transition: width 0.5s ease;
  width: ${props => props.progress}%;
  animation: ${progressAnimation} 0.5s ease;
  --progress-width: ${props => props.progress}%;
`;

const WizardContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${COLORS.white};
  border-radius: 16px;
  padding: ${SPACING['3xl']};
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  animation: ${slideInFromRight} 0.6s ease-out;

  ${mediaQuery.mobile} {
    padding: ${SPACING.lg};
    border-radius: 12px;
  }
`;

const StepContent = styled.div`
  min-height: 400px;

  ${mediaQuery.mobile} {
    min-height: 300px;
  }
`;

const SectionTitle = styled.h2`
  color: #2d5a2d;
  font-size: ${FONT_SIZES.xl};
  margin-bottom: ${SPACING.xl};
  display: flex;
  align-items: center;
  gap: ${SPACING.md};
  ${MOBILE_STYLES.preventZoom}

  ${mediaQuery.mobile} {
    font-size: ${FONT_SIZES.lg};
    margin-bottom: ${SPACING.lg};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${SPACING.xl};
  margin-bottom: ${SPACING['2xl']};

  ${mediaQuery.mobile} {
    grid-template-columns: 1fr;
    gap: ${SPACING.lg};
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2d5a2d;
  margin-bottom: ${SPACING.sm};
  font-size: ${FONT_SIZES.base};
  ${MOBILE_STYLES.preventZoom}
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
`;

const Input = styled.input`
  ${MOBILE_STYLES.inputOptimized}
  border: 2px solid ${COLORS.gray[200]};
  background: ${COLORS.gray[50]};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: ${COLORS.white};
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
    transform: translateY(-1px);
  }

  &:hover {
    border-color: #7cb342;
  }

  &.error {
    border-color: ${COLORS.error};
    box-shadow: 0 0 0 3px ${COLORS.error}20;
  }
`;

const TextArea = styled.textarea`
  ${MOBILE_STYLES.inputOptimized}
  border: 2px solid ${COLORS.gray[200]};
  background: ${COLORS.gray[50]};
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: ${COLORS.white};
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const Select = styled.select`
  ${MOBILE_STYLES.inputOptimized}
  border: 2px solid ${COLORS.gray[200]};
  background: ${COLORS.gray[50]};
  transition: all 0.3s ease;
  cursor: pointer;
  ${MOBILE_STYLES.touchOptimized}

  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: ${COLORS.white};
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const ItemsContainer = styled.div`
  background: #f8fdf8;
  border: 2px solid #e8f5e8;
  border-radius: 12px;
  padding: ${SPACING.xl};
  margin-bottom: ${SPACING.xl};
  
  ${mediaQuery.mobile} {
    padding: ${SPACING.base};
  }
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 80px 120px 120px 140px 60px;
  gap: ${SPACING.base};
  align-items: center;
  padding: ${SPACING.base};
  background: ${COLORS.white};
  border-radius: 8px;
  margin-bottom: ${SPACING.base};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  ${mediaQuery.mobile} {
    grid-template-columns: 1fr;
    gap: ${SPACING.base};
    padding: ${SPACING.lg};
  }
`;

const ItemInput = styled(Input)`
  margin: 0;
  min-height: ${TOUCH_SIZES.small};
  ${MOBILE_STYLES.touchOptimized}

  ${mediaQuery.mobile} {
    min-height: ${TOUCH_SIZES.medium};
  }
`;

const AddItemButton = styled.button`
  background: linear-gradient(135deg, #7cb342, #4a7c4a);
  color: ${COLORS.white};
  border: none;
  padding: ${SPACING.md} ${SPACING.lg};
  border-radius: 8px;
  font-weight: 600;
  font-size: ${FONT_SIZES.base};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${SPACING.sm};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: ${TOUCH_SIZES.medium};
  ${MOBILE_STYLES.touchOptimized}

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #689f38, #2d5a2d);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(74, 124, 74, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(-1px) scale(0.98);
    box-shadow: 0 2px 8px rgba(74, 124, 74, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #4a7c4a;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  ${mediaQuery.mobile} {
    width: 100%;
    justify-content: center;
    min-height: ${TOUCH_SIZES.large};
  }
`;

const RemoveButton = styled.button`
  background: ${COLORS.error};
  color: ${COLORS.white};
  border: none;
  padding: ${SPACING.sm};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: ${TOUCH_SIZES.small};
  min-height: ${TOUCH_SIZES.small};
  ${MOBILE_STYLES.touchOptimized}

  &:hover:not(:disabled) {
    background: ${COLORS.errorDark};
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(255, 107, 107, 0.3);
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.error};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    min-width: 36px;
    min-height: 36px;
    padding: 10px;
  }
`;

const CalculationPanel = styled.div`
  background: linear-gradient(135deg, #f8fdf8 0%, #e8f5e8 100%);
  border: 2px solid #7cb342;
  border-radius: 12px;
  padding: 25px;
  margin-top: 25px;
`;

const CalculationRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 12px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #e8f5e8;
  }

  &:last-child {
    border-top: 2px solid #4a7c4a;
    padding-top: 20px;
    margin-bottom: 0;
    font-size: 18px;
    font-weight: 700;
    color: #2d5a2d;
  }
`;

const CalculationLabel = styled.span`
  font-weight: 600;
  color: #2d5a2d;
`;

const CalculationValue = styled.span`
  font-weight: 700;
  color: #2d5a2d;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: -0.5px;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  padding-top: 25px;
  border-top: 2px solid #e8f5e8;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const Button = styled.button`
  padding: 14px 28px;
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
      case 'save':
        return `
          background: linear-gradient(135deg, #17a2b8, #138496);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #138496, #0f6674);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(23, 162, 184, 0.3);
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

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 16px 28px;
  }
`;

const InfoCard = styled.div`
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-left: 4px solid #4a7c4a;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const InfoText = styled.p`
  margin: 0;
  color: #2d5a2d;
  font-size: 14px;
  line-height: 1.5;
`;

const EstimateWizard = ({ estimateId = null, onComplete, onCancel }) => {
  // テスト用モード: AuthProvider外でも動作するように条件分岐
  let user = null;
  try {
    const authResult = useAuth();
    user = authResult?.user || null;
  } catch (error) {
    // AuthProvider外で使用された場合は無視（テスト用モード）
    console.warn('AuthProvider外でuseAuthが呼ばれました。テスト用モードで動作します。');
    user = {
      id: 1,
      username: 'test_user',
      company_id: 1,
      role: 'owner',
    };
  }

  // ウィザード状態管理
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // フォームデータ状態管理
  const [formData, setFormData] = useState({
    // Step 1: 基本情報
    customer_name: '',
    customer_type: 'individual',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    site_address: '',

    // Step 2: 要望詳細
    project_name: '',
    project_type: 'renovation',
    estimate_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    budget_range: '',
    special_requirements: '',
    notes: '',

    // Step 3: カテゴリ別項目
    items: [],

    // Step 4: 調整
    subtotal: 0,
    adjustment_amount: 0,
    adjustment_reason: '',
    total_amount: 0,
    total_cost: 0,
    gross_profit: 0,
    gross_margin_rate: 0,
  });

  // 単価マスタデータ
  const [priceMasterData, setPriceMasterData] = useState([]);
  const [categories, setCategories] = useState({});

  // ステップ定義
  const steps = [
    {
      number: 1,
      title: '基本情報',
      icon: FiUser,
      description: 'お客様情報と現場情報を入力',
    },
    {
      number: 2,
      title: '要望詳細',
      icon: FiClipboard,
      description: 'プロジェクト内容と要望を詳細入力',
    },
    {
      number: 3,
      title: '項目入力',
      icon: FiLayers,
      description: '工事項目の選択と数量入力',
    },
    {
      number: 4,
      title: '金額調整',
      icon: FiTrendingUp,
      description: '仕入額・掛け率・調整額の最終確認',
    },
  ];

  // 初期データ読み込み関数
  const loadInitialData = useCallback(async () => {
    try {
      // 単価マスタデータ取得
      const response = await fetch('/api/demo/price-master');
      const priceData = await response.json();
      setPriceMasterData(priceData);

      // カテゴリ分類
      const categoryMap = {};
      priceData.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = [];
        }
        categoryMap[item.category].push(item);
      });
      setCategories(categoryMap);

      // 編集モードの場合は既存データ読み込み
      if (estimateId) {
        // TODO: 既存見積データの読み込み実装
      }

      // 見積有効期限を30日後に設定
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        valid_until: validUntil.toISOString().split('T')[0],
      }));
    } catch (error) {
      console.error('初期データの読み込みに失敗:', error);
    }
  }, [estimateId]);

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, [estimateId, loadInitialData]);

  // リアルタイム金額計算
  const calculatedAmounts = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (item.line_total || 0);
    }, 0);

    const total_cost = formData.items.reduce((sum, item) => {
      return sum + (item.line_cost || 0);
    }, 0);

    const total_amount = subtotal + (formData.adjustment_amount || 0);
    const gross_profit = total_amount - total_cost;
    const gross_margin_rate = total_amount > 0 ? (gross_profit / total_amount) * 100 : 0;

    return {
      subtotal,
      total_cost,
      total_amount,
      gross_profit,
      gross_margin_rate,
    };
  }, [formData.items, formData.adjustment_amount]);

  // 金額計算結果をフォームデータに反映
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...calculatedAmounts,
    }));
  }, [calculatedAmounts]);

  // 入力ハンドラー
  const handleInputChange = useCallback(
    (field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      // エラークリア
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: null,
        }));
      }
    },
    [errors]
  );

  // 項目追加
  const addItem = useCallback((category = '') => {
    const newItem = {
      id: Date.now(),
      category,
      item_name: '',
      quantity: 1,
      unit: '',
      purchase_price: 0,
      markup_rate: 1.3,
      unit_price: 0,
      line_total: 0,
      line_cost: 0,
      adjustment: 0,
      is_custom: true,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  // 項目更新
  const updateItem = useCallback((itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // 金額の自動計算
          if (field === 'quantity' || field === 'unit_price' || field === 'adjustment') {
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const unit_price = parseFloat(updatedItem.unit_price) || 0;
            const adjustment = parseFloat(updatedItem.adjustment) || 0;
            updatedItem.line_total = Math.round(quantity * unit_price + adjustment);
          }

          if (field === 'quantity' || field === 'purchase_price') {
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const purchase_price = parseFloat(updatedItem.purchase_price) || 0;
            updatedItem.line_cost = Math.round(quantity * purchase_price);
          }

          if (field === 'purchase_price' || field === 'markup_rate') {
            const purchase_price = parseFloat(updatedItem.purchase_price) || 0;
            const markup_rate = parseFloat(updatedItem.markup_rate) || 1.3;
            updatedItem.unit_price = Math.round(purchase_price * markup_rate);

            // 金額も再計算
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const adjustment = parseFloat(updatedItem.adjustment) || 0;
            updatedItem.line_total = Math.round(quantity * updatedItem.unit_price + adjustment);
          }

          return updatedItem;
        }
        return item;
      }),
    }));
  }, []);

  // 単価マスタから項目追加
  const addItemFromMaster = useCallback(masterItem => {
    const newItem = {
      id: Date.now(),
      category: masterItem.category,
      sub_category: masterItem.sub_category,
      item_name: masterItem.item_name,
      quantity: 1,
      unit: masterItem.unit,
      purchase_price: masterItem.purchase_price,
      markup_rate: masterItem.default_markup_rate,
      unit_price: Math.round(masterItem.purchase_price * masterItem.default_markup_rate),
      line_total: Math.round(masterItem.purchase_price * masterItem.default_markup_rate),
      line_cost: masterItem.purchase_price,
      adjustment: 0,
      is_custom: false,
      master_item_id: masterItem.item_id,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  // 項目削除
  const removeItem = useCallback(itemId => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  }, []);

  // ステップ検証
  const validateStep = useCallback(
    step => {
      const newErrors = {};

      switch (step) {
        case 1:
          if (!formData.customer_name.trim()) {
            newErrors.customer_name = '顧客名は必須です';
          }
          if (!formData.phone.trim()) {
            newErrors.phone = '電話番号は必須です';
          }
          if (!formData.address.trim()) {
            newErrors.address = '住所は必須です';
          }
          break;

        case 2:
          if (!formData.project_name.trim()) {
            newErrors.project_name = 'プロジェクト名は必須です';
          }
          if (!formData.estimate_date) {
            newErrors.estimate_date = '見積日は必須です';
          }
          if (!formData.valid_until) {
            newErrors.valid_until = '見積有効期限は必須です';
          }
          break;

        case 3:
          if (formData.items.length === 0) {
            newErrors.items = '工事項目を少なくとも1件追加してください';
          }
          break;

        case 4:
          // 最終ステップでは特に検証なし（金額は自動計算）
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  // ステップ進む
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  }, [currentStep, validateStep]);

  // ステップ戻る
  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // 一時保存
  const saveTemporary = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: API実装
      console.log('一時保存:', formData);
      alert('一時保存しました');
    } catch (error) {
      console.error('一時保存に失敗:', error);
      alert('一時保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  // 見積完成
  const completeEstimate = useCallback(async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      // TODO: API実装
      console.log('見積完成:', formData);
      alert('見積書を作成しました');
      if (onComplete) onComplete(formData);
    } catch (error) {
      console.error('見積作成に失敗:', error);
      alert('見積作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [formData, onComplete, validateStep]);

  // 通貨フォーマット
  const formatCurrency = useCallback(amount => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  // プログレス計算
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  // ステップ1: 基本情報
  const renderStep1 = () => (
    <StepContent>
      <SectionTitle>
        <FiUser />
        基本情報の入力
      </SectionTitle>

      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          お客様の基本情報と施工現場の情報を入力してください。正確な情報は見積書作成に必要です。
        </InfoText>
      </InfoCard>

      <FormGrid>
        <FormGroup>
          <Label htmlFor="customer_name">
            <FiUser />
            顧客名 *
          </Label>
          <Input
            id="customer_name"
            type="text"
            value={formData.customer_name}
            onChange={e => handleInputChange('customer_name', e.target.value)}
            placeholder="例: 田中造園株式会社"
            className={errors.customer_name ? 'error' : ''}
          />
          {errors.customer_name && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.customer_name}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="customer_type">顧客種別</Label>
          <Select
            id="customer_type"
            value={formData.customer_type}
            onChange={e => handleInputChange('customer_type', e.target.value)}
          >
            <option value="individual">個人</option>
            <option value="corporate">法人</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="contact_person">担当者名</Label>
          <Input
            id="contact_person"
            type="text"
            value={formData.contact_person}
            onChange={e => handleInputChange('contact_person', e.target.value)}
            placeholder="例: 田中太郎"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="phone">
            <FiPhone />
            電話番号 *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            placeholder="例: 03-1234-5678"
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.phone}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">
            <FiMail />
            メールアドレス
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            placeholder="例: info@example.com"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="address">
            <FiHome />
            住所 *
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={e => handleInputChange('address', e.target.value)}
            placeholder="例: 東京都渋谷区..."
            className={errors.address ? 'error' : ''}
          />
          {errors.address && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.address}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="site_address">
            <FiMapPin />
            施工現場住所
          </Label>
          <Input
            id="site_address"
            type="text"
            value={formData.site_address}
            onChange={e => handleInputChange('site_address', e.target.value)}
            placeholder="住所と異なる場合のみ入力"
          />
        </FormGroup>
      </FormGrid>
    </StepContent>
  );

  // ステップ2: 要望詳細
  const renderStep2 = () => (
    <StepContent>
      <SectionTitle>
        <FiClipboard />
        プロジェクト詳細・要望
      </SectionTitle>

      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          工事の詳細内容とお客様のご要望を詳しく入力してください。これらの情報は見積の精度向上に役立ちます。
        </InfoText>
      </InfoCard>

      <FormGrid>
        <FormGroup>
          <Label htmlFor="project_name">
            <FiFileText />
            プロジェクト名 *
          </Label>
          <Input
            id="project_name"
            type="text"
            value={formData.project_name}
            onChange={e => handleInputChange('project_name', e.target.value)}
            placeholder="例: 庭園リフォーム工事"
            className={errors.project_name ? 'error' : ''}
          />
          {errors.project_name && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.project_name}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="project_type">工事種別</Label>
          <Select
            id="project_type"
            value={formData.project_type}
            onChange={e => handleInputChange('project_type', e.target.value)}
          >
            <option value="new_construction">新築工事</option>
            <option value="renovation">リフォーム工事</option>
            <option value="maintenance">メンテナンス</option>
            <option value="design_only">設計のみ</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="estimate_date">
            <FiCalendar />
            見積日 *
          </Label>
          <Input
            id="estimate_date"
            type="date"
            value={formData.estimate_date}
            onChange={e => handleInputChange('estimate_date', e.target.value)}
            className={errors.estimate_date ? 'error' : ''}
          />
          {errors.estimate_date && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.estimate_date}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="valid_until">見積有効期限 *</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={e => handleInputChange('valid_until', e.target.value)}
            className={errors.valid_until ? 'error' : ''}
          />
          {errors.valid_until && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.valid_until}
            </span>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="budget_range">
            <FiDollarSign />
            ご予算範囲
          </Label>
          <Select
            id="budget_range"
            value={formData.budget_range}
            onChange={e => handleInputChange('budget_range', e.target.value)}
          >
            <option value="">選択してください</option>
            <option value="under_500k">50万円未満</option>
            <option value="500k_1m">50万円～100万円</option>
            <option value="1m_3m">100万円～300万円</option>
            <option value="3m_5m">300万円～500万円</option>
            <option value="over_5m">500万円以上</option>
          </Select>
        </FormGroup>
      </FormGrid>

      <FormGroup>
        <Label htmlFor="special_requirements">特別な要望・仕様</Label>
        <TextArea
          id="special_requirements"
          value={formData.special_requirements}
          onChange={e => handleInputChange('special_requirements', e.target.value)}
          placeholder="特別な植栽の要望、使用材料の指定、工期の制約など"
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="notes">その他備考</Label>
        <TextArea
          id="notes"
          value={formData.notes}
          onChange={e => handleInputChange('notes', e.target.value)}
          placeholder="その他、見積に関する備考があれば入力してください"
        />
      </FormGroup>
    </StepContent>
  );

  // ステップ3: 項目入力
  const renderStep3 = () => (
    <StepContent>
      <SectionTitle>
        <FiLayers />
        工事項目の入力
      </SectionTitle>

      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          単価マスタから項目を選択するか、カスタム項目を追加してください。数量を入力すると金額が自動計算されます。
        </InfoText>
      </InfoCard>

      {/* 単価マスタから追加 */}
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ color: '#2d5a2d', marginBottom: '15px' }}>単価マスタから選択</h3>
        {Object.entries(categories).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#4a7c4a', marginBottom: '10px' }}>{category}</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '10px',
              }}
            >
              {items.map(item => (
                <div
                  key={item.item_id}
                  style={{
                    padding: '12px',
                    border: '1px solid #e8f5e8',
                    borderRadius: '8px',
                    background: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => addItemFromMaster(item)}
                  onMouseEnter={e => {
                    e.target.style.background = '#e8f5e8';
                    e.target.style.borderColor = '#4a7c4a';
                  }}
                  onMouseLeave={e => {
                    e.target.style.background = '#fafafa';
                    e.target.style.borderColor = '#e8f5e8';
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.item_name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {formatCurrency(item.purchase_price * item.default_markup_rate)} / {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 選択された項目一覧 */}
      <ItemsContainer>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ color: '#2d5a2d', margin: 0 }}>選択された工事項目</h3>
          <AddItemButton onClick={() => addItem()}>
            <FiPlus />
            カスタム項目追加
          </AddItemButton>
        </div>

        {formData.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            項目が追加されていません。上記の単価マスタから選択するか、カスタム項目を追加してください。
          </div>
        ) : (
          <>
            {/* ヘッダー行 */}
            <ItemRow style={{ background: '#4a7c4a', color: 'white', fontWeight: '600' }}>
              <div>項目名</div>
              <div>数量</div>
              <div>単位</div>
              <div>仕入単価</div>
              <div>掛率</div>
              <div>販売単価</div>
              <div>操作</div>
            </ItemRow>

            {formData.items.map(item => (
              <ItemRow key={item.id}>
                <ItemInput
                  type="text"
                  value={item.item_name}
                  onChange={e => updateItem(item.id, 'item_name', e.target.value)}
                  placeholder="項目名"
                />
                <ItemInput
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                  min="0"
                  step="0.1"
                />
                <ItemInput
                  type="text"
                  value={item.unit}
                  onChange={e => updateItem(item.id, 'unit', e.target.value)}
                  placeholder="単位"
                />
                <ItemInput
                  type="number"
                  value={item.purchase_price}
                  onChange={e => updateItem(item.id, 'purchase_price', e.target.value)}
                  min="0"
                />
                <ItemInput
                  type="number"
                  value={item.markup_rate}
                  onChange={e => updateItem(item.id, 'markup_rate', e.target.value)}
                  min="1"
                  step="0.1"
                />
                <div style={{ padding: '10px', fontWeight: '600' }}>
                  {formatCurrency(item.unit_price)}
                </div>
                <RemoveButton onClick={() => removeItem(item.id)}>
                  <FiMinus />
                </RemoveButton>
              </ItemRow>
            ))}
          </>
        )}

        {errors.items && (
          <div style={{ color: '#e74c3c', fontSize: '14px', marginTop: '10px' }}>
            {errors.items}
          </div>
        )}
      </ItemsContainer>

      {/* 小計表示 */}
      {formData.items.length > 0 && (
        <CalculationPanel>
          <CalculationRow>
            <CalculationLabel>項目数</CalculationLabel>
            <CalculationValue>{formData.items.length} 項目</CalculationValue>
          </CalculationRow>
          <CalculationRow>
            <CalculationLabel>仕入原価合計</CalculationLabel>
            <CalculationValue>{formatCurrency(calculatedAmounts.total_cost)}</CalculationValue>
          </CalculationRow>
          <CalculationRow>
            <CalculationLabel>販売価格小計</CalculationLabel>
            <CalculationValue>{formatCurrency(calculatedAmounts.subtotal)}</CalculationValue>
          </CalculationRow>
          <CalculationRow>
            <CalculationLabel>粗利益</CalculationLabel>
            <CalculationValue>
              {formatCurrency(calculatedAmounts.gross_profit)}(
              {calculatedAmounts.gross_margin_rate.toFixed(1)}%)
            </CalculationValue>
          </CalculationRow>
        </CalculationPanel>
      )}
    </StepContent>
  );

  // ステップ4: 金額調整
  const renderStep4 = () => (
    <StepContent>
      <SectionTitle>
        <FiTrendingUp />
        最終金額調整・確認
      </SectionTitle>

      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          工事項目の内容を確認し、必要に応じて調整額を適用してください。最終的な見積金額が確定されます。
        </InfoText>
      </InfoCard>

      {/* 調整額入力 */}
      <FormGrid>
        <FormGroup>
          <Label htmlFor="adjustment_amount">
            <FiEdit3 />
            調整額（値引き・割増）
          </Label>
          <Input
            id="adjustment_amount"
            type="number"
            value={formData.adjustment_amount}
            onChange={e =>
              handleInputChange('adjustment_amount', parseInt(e.target.value, 10) || 0)
            }
            placeholder="正数で割増、負数で値引き"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="adjustment_reason">調整理由</Label>
          <Input
            id="adjustment_reason"
            type="text"
            value={formData.adjustment_reason}
            onChange={e => handleInputChange('adjustment_reason', e.target.value)}
            placeholder="調整の理由を入力"
          />
        </FormGroup>
      </FormGrid>

      {/* 最終金額計算 */}
      <CalculationPanel>
        <h3 style={{ color: '#2d5a2d', marginBottom: '20px' }}>最終見積金額</h3>

        <CalculationRow>
          <CalculationLabel>工事項目小計</CalculationLabel>
          <CalculationValue>{formatCurrency(calculatedAmounts.subtotal)}</CalculationValue>
        </CalculationRow>

        <CalculationRow>
          <CalculationLabel>調整額</CalculationLabel>
          <CalculationValue>
            {formData.adjustment_amount >= 0 ? '+' : ''}
            {formatCurrency(formData.adjustment_amount)}
          </CalculationValue>
        </CalculationRow>

        <CalculationRow>
          <CalculationLabel>見積合計金額</CalculationLabel>
          <CalculationValue>{formatCurrency(calculatedAmounts.total_amount)}</CalculationValue>
        </CalculationRow>

        <CalculationRow
          style={{ borderTop: '2px solid #4a7c4a', paddingTop: '15px', marginTop: '15px' }}
        >
          <CalculationLabel>仕入原価合計</CalculationLabel>
          <CalculationValue>{formatCurrency(calculatedAmounts.total_cost)}</CalculationValue>
        </CalculationRow>

        <CalculationRow>
          <CalculationLabel>粗利益</CalculationLabel>
          <CalculationValue>{formatCurrency(calculatedAmounts.gross_profit)}</CalculationValue>
        </CalculationRow>

        <CalculationRow>
          <CalculationLabel>粗利率</CalculationLabel>
          <CalculationValue>{calculatedAmounts.gross_margin_rate.toFixed(1)}%</CalculationValue>
        </CalculationRow>
      </CalculationPanel>

      {/* 項目確認 */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#2d5a2d', marginBottom: '15px' }}>工事項目一覧（確認）</h3>
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e8f5e8',
            borderRadius: '8px',
          }}
        >
          {formData.items.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '15px',
                borderBottom: index < formData.items.length - 1 ? '1px solid #e8f5e8' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.item_name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                </div>
              </div>
              <div style={{ fontWeight: '600', color: '#2d5a2d' }}>
                {formatCurrency(item.line_total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StepContent>
  );

  // メインレンダー
  return (
    <WizardContainer>
      <WizardHeader>
        <WizardTitle>
          <FiFileText size={32} />
          見積書作成ウィザード
        </WizardTitle>
        <WizardSubtitle>4ステップで簡単に見積書を作成できます</WizardSubtitle>
      </WizardHeader>

      <ProgressContainer>
        <StepsIndicator>
          <ProgressBar>
            <ProgressFill progress={progress} />
          </ProgressBar>
          {steps.map(step => (
            <StepItem key={step.number}>
              <StepNumber
                completed={currentStep > step.number}
                active={currentStep === step.number}
              >
                {currentStep > step.number ? <FiCheck /> : step.number}
              </StepNumber>
              <StepLabel completed={currentStep > step.number} active={currentStep === step.number}>
                {step.title}
              </StepLabel>
            </StepItem>
          ))}
        </StepsIndicator>
      </ProgressContainer>

      <WizardContent>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <NavigationButtons>
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" onClick={prevStep} disabled={isLoading}>
                <FiArrowLeft />
                前のステップ
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <Button variant="save" onClick={saveTemporary} disabled={isLoading}>
              <FiSave />
              一時保存
            </Button>

            {currentStep < 4 ? (
              <Button variant="primary" onClick={nextStep} disabled={isLoading}>
                次のステップ
                <FiArrowRight />
              </Button>
            ) : (
              <Button variant="primary" onClick={completeEstimate} disabled={isLoading}>
                <FiCheck />
                見積書完成
              </Button>
            )}
          </div>
        </NavigationButtons>
      </WizardContent>
    </WizardContainer>
  );
};

export default EstimateWizard;
