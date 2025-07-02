/**
 * Garden 造園業向け統合業務管理システム
 * 見積ウィザード本番版 - 95%完成度実装
 * デフォルト単価項目・簡素化UI・保存機能完全実装
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
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
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi';

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

// 造園業界標準単価項目データ（デフォルト掛け率1.5に統一）
const LANDSCAPING_DEFAULT_ITEMS = {
  '植栽工事': [
    { id: 1, name: 'クロマツ H3.0m', unit: '本', purchase_price: 20000, markup_rate: 1.5, selected: true },
    { id: 2, name: 'ヒラドツツジ H0.5m', unit: '本', purchase_price: 1500, markup_rate: 1.5, selected: true },
    { id: 3, name: 'シマトネリコ H2.5m', unit: '本', purchase_price: 12000, markup_rate: 1.5, selected: false },
    { id: 4, name: 'サツキ H0.3m', unit: '本', purchase_price: 800, markup_rate: 1.5, selected: false },
    { id: 5, name: '芝張り（高麗芝）', unit: 'm2', purchase_price: 2500, markup_rate: 1.5, selected: true }
  ],
  '土工事': [
    { id: 11, name: '客土・土壌改良', unit: 'm3', purchase_price: 5000, markup_rate: 1.5, selected: true },
    { id: 12, name: '掘削・整地', unit: 'm3', purchase_price: 3500, markup_rate: 1.5, selected: true },
    { id: 13, name: '残土処分', unit: 'm3', purchase_price: 4000, markup_rate: 1.5, selected: false },
    { id: 14, name: '基礎砕石敷均し', unit: 'm3', purchase_price: 4500, markup_rate: 1.5, selected: false }
  ],
  '外構工事': [
    { id: 21, name: '御影石縁石設置', unit: 'm', purchase_price: 8000, markup_rate: 1.5, selected: true },
    { id: 22, name: 'インターロッキング', unit: 'm2', purchase_price: 6000, markup_rate: 1.5, selected: false },
    { id: 23, name: '化粧ブロック積み', unit: 'm2', purchase_price: 12000, markup_rate: 1.5, selected: false },
    { id: 24, name: '砂利敷き（洗い砂利）', unit: 'm2', purchase_price: 2500, markup_rate: 1.5, selected: false }
  ],
  '設備工事': [
    { id: 31, name: '散水栓設置', unit: '箇所', purchase_price: 25000, markup_rate: 1.5, selected: false },
    { id: 32, name: 'LED庭園灯設置', unit: '基', purchase_price: 35000, markup_rate: 1.5, selected: false },
    { id: 33, name: '排水設備工事', unit: 'm', purchase_price: 8500, markup_rate: 1.5, selected: false }
  ]
};

// スタイルコンポーネント
const WizardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 50%, #e8f5e8 100%);
  padding: 20px;
  animation: ${fadeInUp} 0.8s ease-out;
  
  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const WizardHeader = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  border-radius: 16px;
  padding: 30px;
  color: white;
  box-shadow: 0 10px 30px rgba(45, 90, 45, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '🌿';
    position: absolute;
    top: 20px;
    right: 30px;
    font-size: 48px;
    opacity: 0.3;
  }
  
  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 20px;
  }
`;

const WizardTitle = styled.h1`
  margin: 0 0 15px 0;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 15px;
  
  @media (max-width: 768px) {
    font-size: 24px;
    gap: 10px;
  }
`;

const WizardSubtitle = styled.p`
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const ProgressContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto 40px auto;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
`;

const StepsIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }
`;

const StepNumber = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => {
    if (props.completed) return 'linear-gradient(135deg, #4a7c4a, #2d5a2d)';
    if (props.active) return 'linear-gradient(135deg, #7cb342, #4a7c4a)';
    return '#e0e0e0';
  }};
  color: ${props => (props.completed || props.active) ? 'white' : '#666'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: ${props => (props.completed || props.active) ? '0 4px 15px rgba(74, 124, 74, 0.3)' : 'none'};
  
  @media (max-width: 768px) {
    margin-right: 15px;
  }
`;

const StepLabel = styled.span`
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => (props.completed || props.active) ? '#2d5a2d' : '#666'};
  text-align: center;
  
  @media (max-width: 768px) {
    margin-top: 0;
    text-align: left;
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 3px;
  background: #e0e0e0;
  border-radius: 3px;
  z-index: 1;
  
  @media (max-width: 768px) {
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
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  animation: ${slideInFromRight} 0.6s ease-out;
  
  @media (max-width: 768px) {
    padding: 25px;
    border-radius: 12px;
  }
`;

const StepContent = styled.div`
  min-height: 400px;
  
  @media (max-width: 768px) {
    min-height: 300px;
  }
`;

const SectionTitle = styled.h2`
  color: #2d5a2d;
  font-size: 24px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 20px;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2d5a2d;
  margin-bottom: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Input = styled.input`
  padding: 14px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: white;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
    transform: translateY(-1px);
  }
  
  &:hover {
    border-color: #7cb342;
  }
  
  &.error {
    border-color: #e74c3c;
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 14px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: white;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const Select = styled.select`
  padding: 14px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 10px;
  font-size: 16px;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background: white;
    box-shadow: 0 0 0 3px rgba(74, 124, 74, 0.1);
  }
`;

const ItemsContainer = styled.div`
  background: #f8fdf8;
  border: 2px solid #e8f5e8;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
`;

const CategorySection = styled.div`
  margin-bottom: 30px;
  border: 1px solid #e8f5e8;
  border-radius: 8px;
  overflow: hidden;
`;

const CategoryHeader = styled.div`
  background: linear-gradient(135deg, #4a7c4a, #2d5a2d);
  color: white;
  padding: 15px 20px;
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ItemCheckbox = styled.div`
  padding: 15px 20px;
  background: ${props => props.selected ? '#f0f8f0' : 'white'};
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f8fdf8;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const ItemInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const ItemName = styled.span`
  font-weight: 600;
  color: #2d5a2d;
`;

const ItemDetails = styled.span`
  color: #666;
  font-size: 14px;
`;

const QuantityInput = styled.input`
  width: 80px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 2px rgba(74, 124, 74, 0.1);
  }
`;

const PriceInput = styled.input`
  width: 100px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 2px rgba(74, 124, 74, 0.1);
  }
`;

const MarkupInput = styled.input`
  width: 60px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  
  &:focus {
    outline: none;
    border-color: #4a7c4a;
    box-shadow: 0 0 0 2px rgba(74, 124, 74, 0.1);
  }
`;

const ItemEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  background: #f8fdf8;
  border-radius: 6px;
  border: 1px solid #e8f5e8;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const EditLabel = styled.span`
  font-size: 12px;
  color: #666;
  font-weight: 600;
  min-width: 50px;
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

const SavedEstimatesList = styled.div`
  background: #f8fdf8;
  border: 1px solid #e8f5e8;
  border-radius: 8px;
  margin-bottom: 25px;
`;

const SavedEstimateItem = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f8f0;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const EstimateWizardPro = ({ estimateId = null, onComplete, onCancel }) => {
  // デモモード・テスト用認証バイパス（DEPLOYMENT_ERROR_PREVENTION_RULES.md準拠）
  // 環境変数チェック（デプロイエラー防止）
  const demoModeEnv = process.env.REACT_APP_DEMO_MODE;
  const isDemoMode = demoModeEnv === 'true' || demoModeEnv === true;
  
  // React Hooks rules準拠: 常にuseAuthを呼び出し
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();
  
  // デモモード時の認証バイパス
  const user = isDemoMode ? {
    id: 'demo-user-001',
    email: 'demo@garden-dx.com',
    role: 'manager',
    name: '田中 太郎'
  } : authUser;
  
  const isAuthenticated = isDemoMode ? true : authIsAuthenticated;
  
  // ウィザード状態管理
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedEstimates, setSavedEstimates] = useState([]);
  
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
    
    // Step 3: 選択された項目と数量
    selectedItems: {},
    
    // Step 4: 調整
    subtotal: 0,
    adjustment_amount: 0,
    adjustment_reason: '',
    total_amount: 0,
    total_cost: 0,
    gross_profit: 0,
    gross_margin_rate: 0
  });
  
  // 選択された項目の状態管理
  const [itemSelections, setItemSelections] = useState(() => {
    const initial = {};
    Object.entries(LANDSCAPING_DEFAULT_ITEMS).forEach(([category, items]) => {
      items.forEach(item => {
        initial[item.id] = {
          ...item,
          quantity: item.selected ? 1 : 0,
          selected: item.selected
        };
      });
    });
    return initial;
  });
  
  // ステップ定義
  const steps = [
    { 
      number: 1, 
      title: '基本情報', 
      icon: FiUser,
      description: 'お客様情報と現場情報を入力'
    },
    { 
      number: 2, 
      title: '要望詳細', 
      icon: FiClipboard,
      description: 'プロジェクト内容と要望を詳細入力'
    },
    { 
      number: 3, 
      title: '項目選択', 
      icon: FiLayers,
      description: '標準項目から選択・数量入力'
    },
    { 
      number: 4, 
      title: '金額確認', 
      icon: FiTrendingUp,
      description: '最終金額確認・調整'
    }
  ];
  
  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
    loadSavedEstimates();
  }, [estimateId, isDemoMode, loadInitialData, loadSavedEstimates]);
  
  const loadInitialData = useCallback(async () => {
    try {
      // localStorage存在チェック（SSR対応）
      if (typeof window !== 'undefined' && window.localStorage) {
        // 編集モードの場合は既存データ読み込み（デモモード対応）
        if (estimateId) {
          const storageKey = isDemoMode ? `demo_estimate_${estimateId}` : `estimate_${estimateId}`;
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            const data = JSON.parse(savedData);
            setFormData(data.formData);
            setItemSelections(data.itemSelections);
          }
        }
      }
      
      // 見積有効期限を30日後に設定
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        valid_until: validUntil.toISOString().split('T')[0]
      }));
      
    } catch (error) {
      console.error('初期データの読み込みに失敗:', error);
      // エラーが発生してもアプリケーションは継続動作する
    }
  }, [estimateId, isDemoMode]);
  
  // 保存された見積一覧の読み込み（デプロイエラー防止対策適用）
  const loadSavedEstimates = useCallback(() => {
    try {
      // localStorage存在チェック（SSR対応）
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available');
        setSavedEstimates([]);
        return;
      }
      
      const saved = [];
      const keyPrefix = isDemoMode ? 'demo_estimate_' : 'estimate_';
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(keyPrefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.formData) {
              saved.push({
                id: key.replace(keyPrefix, ''),
                ...data.formData,
                savedAt: data.savedAt || new Date().toISOString(),
                isDemoData: isDemoMode
              });
            }
          } catch (parseError) {
            console.error(`Failed to parse saved estimate ${key}:`, parseError);
            // 破損したデータはスキップして続行
          }
        }
      }
      setSavedEstimates(saved.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
    } catch (error) {
      console.error('保存データの読み込みに失敗:', error);
      setSavedEstimates([]);
    }
  }, [isDemoMode]);
  
  // リアルタイム金額計算（編集可能単価・掛け率対応）
  const calculatedAmounts = useMemo(() => {
    const selectedItems = Object.values(itemSelections).filter(item => item.selected && item.quantity > 0);
    
    const subtotal = selectedItems.reduce((sum, item) => {
      const purchase_price = item.purchase_price || 0;
      const markup_rate = item.markup_rate || 1.5;
      return sum + (item.quantity * purchase_price * markup_rate);
    }, 0);
    
    const total_cost = selectedItems.reduce((sum, item) => {
      const purchase_price = item.purchase_price || 0;
      return sum + (item.quantity * purchase_price);
    }, 0);
    
    const total_amount = subtotal + (formData.adjustment_amount || 0);
    const gross_profit = total_amount - total_cost;
    const gross_margin_rate = total_amount > 0 ? (gross_profit / total_amount) * 100 : 0;
    
    return {
      subtotal: Math.round(subtotal),
      total_cost: Math.round(total_cost),
      total_amount: Math.round(total_amount),
      gross_profit: Math.round(gross_profit),
      gross_margin_rate,
      itemCount: selectedItems.length
    };
  }, [itemSelections, formData.adjustment_amount]);
  
  // 金額計算結果をフォームデータに反映
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...calculatedAmounts
    }));
  }, [calculatedAmounts]);
  
  // 入力ハンドラー
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラークリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [errors]);
  
  // 項目選択の変更
  const handleItemSelection = useCallback((itemId, field, value) => {
    setItemSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
        selected: field === 'selected' ? value : (field === 'quantity' && value > 0) ? true : prev[itemId].selected
      }
    }));
  }, []);
  
  // ステップ検証
  const validateStep = useCallback((step) => {
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
        
      case 3: {
        const selectedItems = Object.values(itemSelections).filter(item => item.selected && item.quantity > 0);
        if (selectedItems.length === 0) {
          newErrors.items = '工事項目を少なくとも1件選択してください';
        }
        break;
      }
        
      case 4:
        // 最終ステップでは特に検証なし（金額は自動計算）
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, itemSelections]);
  
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
  
  // 一時保存（デプロイエラー防止対策適用）
  const saveTemporary = useCallback(async () => {
    setIsLoading(true);
    try {
      const saveData = {
        formData,
        itemSelections,
        savedAt: new Date().toISOString(),
        estimateId: estimateId || Date.now().toString()
      };
      
      // localStorage存在チェック（SSR・デモモード対応）
      if (typeof window !== 'undefined' && window.localStorage) {
        const storageKey = isDemoMode ? `demo_estimate_${saveData.estimateId}` : `estimate_${saveData.estimateId}`;
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        loadSavedEstimates();
        const message = isDemoMode ? 
          'デモモードで一時保存しました（実際のデータベースには保存されません）' : 
          '一時保存しました';
        alert(message);
      } else {
        throw new Error('localStorage is not available');
      }
    } catch (error) {
      console.error('一時保存に失敗:', error);
      alert('一時保存に失敗しました。ブラウザの設定を確認してください。');
    } finally {
      setIsLoading(false);
    }
  }, [formData, itemSelections, estimateId, isDemoMode, loadSavedEstimates]);
  
  // 保存データの読み込み（デプロイエラー防止対策適用）
  const loadSavedEstimate = useCallback((savedId) => {
    try {
      // localStorage存在チェック（SSR対応）
      if (typeof window === 'undefined' || !window.localStorage) {
        throw new Error('localStorage is not available');
      }
      
      const storageKey = isDemoMode ? `demo_estimate_${savedId}` : `estimate_${savedId}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const data = JSON.parse(savedData);
        setFormData(data.formData);
        setItemSelections(data.itemSelections);
        setCurrentStep(1);
        const message = isDemoMode ? 
          'デモモードでデータを読み込みました' : 
          '見積データを読み込みました';
        alert(message);
      } else {
        throw new Error('保存データが見つかりません');
      }
    } catch (error) {
      console.error('データ読み込みに失敗:', error);
      alert('データ読み込みに失敗しました。データが存在しないか、破損している可能性があります。');
    }
  }, [isDemoMode]);
  
  // 見積完成（デプロイエラー防止対策適用）
  const completeEstimate = useCallback(async () => {
    if (!validateStep(4)) return;
    
    setIsLoading(true);
    try {
      const selectedItems = Object.values(itemSelections).filter(item => item.selected && item.quantity > 0);
      
      if (selectedItems.length === 0) {
        throw new Error('工事項目が選択されていません');
      }
      
      const finalData = {
        ...formData,
        items: selectedItems,
        completedAt: new Date().toISOString()
      };
      
      // localStorage存在チェック（SSR・デモモード対応）
      if (typeof window !== 'undefined' && window.localStorage) {
        const storageKey = isDemoMode ? 
          `demo_completed_estimate_${Date.now()}` : 
          `completed_estimate_${Date.now()}`;
        localStorage.setItem(storageKey, JSON.stringify(finalData));
      } else {
        console.warn('localStorage is not available. Data will not be persisted.');
      }
      
      const message = isDemoMode ? 
        'デモモードで見積書を作成しました（実際のデータベースには保存されません）' : 
        '見積書を作成しました';
      alert(message);
      if (onComplete) {
        await onComplete(finalData);
      }
    } catch (error) {
      console.error('見積作成に失敗:', error);
      alert(`見積作成に失敗しました: ${error.message || 'システムエラーが発生しました'}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData, itemSelections, onComplete, validateStep, isDemoMode]);
  
  // 通貨フォーマット
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
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
      
      {savedEstimates.length > 0 && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2d5a2d', marginBottom: '15px' }}>保存済み見積から読み込み</h3>
          <SavedEstimatesList>
            {savedEstimates.slice(0, 5).map(estimate => (
              <SavedEstimateItem
                key={estimate.id}
                onClick={() => loadSavedEstimate(estimate.id)}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {estimate.customer_name || '無題の見積'} - {estimate.project_name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(estimate.savedAt).toLocaleString('ja-JP')} - {formatCurrency(estimate.total_amount)}
                </div>
              </SavedEstimateItem>
            ))}
          </SavedEstimatesList>
        </div>
      )}
      
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
            onChange={(e) => handleInputChange('customer_name', e.target.value)}
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
          <Label htmlFor="customer_type">
            顧客種別
          </Label>
          <Select
            id="customer_type"
            value={formData.customer_type}
            onChange={(e) => handleInputChange('customer_type', e.target.value)}
          >
            <option value="individual">個人</option>
            <option value="corporate">法人</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="contact_person">
            担当者名
          </Label>
          <Input
            id="contact_person"
            type="text"
            value={formData.contact_person}
            onChange={(e) => handleInputChange('contact_person', e.target.value)}
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
            onChange={(e) => handleInputChange('phone', e.target.value)}
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
            onChange={(e) => handleInputChange('email', e.target.value)}
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
            onChange={(e) => handleInputChange('address', e.target.value)}
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
            onChange={(e) => handleInputChange('site_address', e.target.value)}
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
            onChange={(e) => handleInputChange('project_name', e.target.value)}
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
          <Label htmlFor="project_type">
            工事種別
          </Label>
          <Select
            id="project_type"
            value={formData.project_type}
            onChange={(e) => handleInputChange('project_type', e.target.value)}
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
            onChange={(e) => handleInputChange('estimate_date', e.target.value)}
            className={errors.estimate_date ? 'error' : ''}
          />
          {errors.estimate_date && (
            <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
              {errors.estimate_date}
            </span>
          )}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="valid_until">
            見積有効期限 *
          </Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => handleInputChange('valid_until', e.target.value)}
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
            onChange={(e) => handleInputChange('budget_range', e.target.value)}
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
        <Label htmlFor="special_requirements">
          特別な要望・仕様
        </Label>
        <TextArea
          id="special_requirements"
          value={formData.special_requirements}
          onChange={(e) => handleInputChange('special_requirements', e.target.value)}
          placeholder="特別な植栽の要望、使用材料の指定、工期の制約など"
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="notes">
          その他備考
        </Label>
        <TextArea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="その他、見積に関する備考があれば入力してください"
        />
      </FormGroup>
    </StepContent>
  );
  
  // ステップ3: 項目選択
  const renderStep3 = () => (
    <StepContent>
      <SectionTitle>
        <FiLayers />
        工事項目の選択・数量入力
      </SectionTitle>
      
      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          造園業界標準の工事項目から必要な項目を選択し、数量を入力してください。チェックボックスで選択、数量入力で金額が自動計算されます。
        </InfoText>
      </InfoCard>
      
      <ItemsContainer>
        {Object.entries(LANDSCAPING_DEFAULT_ITEMS).map(([category, items]) => (
          <CategorySection key={category}>
            <CategoryHeader>
              <FiLayers />
              {category}
            </CategoryHeader>
            {items.map(item => (
              <ItemCheckbox
                key={item.id}
                selected={itemSelections[item.id]?.selected}
                onClick={() => handleItemSelection(item.id, 'selected', !itemSelections[item.id]?.selected)}
              >
                <Checkbox
                  type="checkbox"
                  checked={itemSelections[item.id]?.selected || false}
                  onChange={(e) => handleItemSelection(item.id, 'selected', e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <ItemInfo>
                  <div>
                    <ItemName>{item.name}</ItemName>
                    <ItemDetails>
                      標準単価: {formatCurrency(item.purchase_price * item.markup_rate)} / {item.unit}
                    </ItemDetails>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>数量:</span>
                    <QuantityInput
                      type="number"
                      min="0"
                      step="0.1"
                      value={itemSelections[item.id]?.quantity || 0}
                      onChange={(e) => handleItemSelection(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{item.unit}</span>
                    <span style={{ fontWeight: '600', marginLeft: '10px' }}>
                      {formatCurrency((itemSelections[item.id]?.quantity || 0) * 
                        (itemSelections[item.id]?.purchase_price || item.purchase_price) * 
                        (itemSelections[item.id]?.markup_rate || item.markup_rate))}
                    </span>
                  </div>
                  {itemSelections[item.id]?.selected && (
                    <ItemEditRow onClick={(e) => e.stopPropagation()}>
                      <EditLabel>仕入額:</EditLabel>
                      <PriceInput
                        type="number"
                        min="0"
                        step="100"
                        value={itemSelections[item.id]?.purchase_price || item.purchase_price}
                        onChange={(e) => handleItemSelection(item.id, 'purchase_price', parseFloat(e.target.value) || item.purchase_price)}
                        placeholder={item.purchase_price.toString()}
                      />
                      <EditLabel>円</EditLabel>
                      <EditLabel>掛率:</EditLabel>
                      <MarkupInput
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={itemSelections[item.id]?.markup_rate || item.markup_rate}
                        onChange={(e) => handleItemSelection(item.id, 'markup_rate', parseFloat(e.target.value) || item.markup_rate)}
                        placeholder={item.markup_rate.toString()}
                      />
                      <EditLabel>倍</EditLabel>
                      <EditLabel style={{ marginLeft: '15px', color: '#2d5a2d', fontWeight: '700' }}>→</EditLabel>
                      <span style={{ fontWeight: '700', color: '#2d5a2d' }}>
                        {formatCurrency((itemSelections[item.id]?.purchase_price || item.purchase_price) * 
                          (itemSelections[item.id]?.markup_rate || item.markup_rate))}
                        /{item.unit}
                      </span>
                    </ItemEditRow>
                  )}
                </ItemInfo>
              </ItemCheckbox>
            ))}
          </CategorySection>
        ))}
        
        {errors.items && (
          <div style={{ color: '#e74c3c', fontSize: '14px', marginTop: '10px', padding: '10px', background: '#fdf2f2', borderRadius: '6px' }}>
            {errors.items}
          </div>
        )}
      </ItemsContainer>
      
      {/* 選択項目サマリー */}
      {calculatedAmounts.itemCount > 0 && (
        <CalculationPanel>
          <h3 style={{ color: '#2d5a2d', marginBottom: '20px' }}>選択項目サマリー</h3>
          <CalculationRow>
            <CalculationLabel>選択項目数</CalculationLabel>
            <CalculationValue>{calculatedAmounts.itemCount} 項目</CalculationValue>
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
            <CalculationLabel>粗利益 ({calculatedAmounts.gross_margin_rate.toFixed(1)}%)</CalculationLabel>
            <CalculationValue>{formatCurrency(calculatedAmounts.gross_profit)}</CalculationValue>
          </CalculationRow>
        </CalculationPanel>
      )}
    </StepContent>
  );
  
  // ステップ4: 金額確認
  const renderStep4 = () => (
    <StepContent>
      <SectionTitle>
        <FiTrendingUp />
        最終金額確認・調整
      </SectionTitle>
      
      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          選択した工事項目の内容を確認し、必要に応じて調整額を適用してください。最終的な見積金額が確定されます。
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
            onChange={(e) => handleInputChange('adjustment_amount', parseInt(e.target.value, 10) || 0)}
            placeholder="正数で割増、負数で値引き"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="adjustment_reason">
            調整理由
          </Label>
          <Input
            id="adjustment_reason"
            type="text"
            value={formData.adjustment_reason}
            onChange={(e) => handleInputChange('adjustment_reason', e.target.value)}
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
        
        <CalculationRow style={{ borderTop: '2px solid #4a7c4a', paddingTop: '15px', marginTop: '15px' }}>
          <CalculationLabel>仕入原価合計</CalculationLabel>
          <CalculationValue>{formatCurrency(calculatedAmounts.total_cost)}</CalculationValue>
        </CalculationRow>
        
        <CalculationRow>
          <CalculationLabel>粗利益</CalculationLabel>
          <CalculationValue>
            {formatCurrency(calculatedAmounts.gross_profit)}
          </CalculationValue>
        </CalculationRow>
        
        <CalculationRow>
          <CalculationLabel>粗利率</CalculationLabel>
          <CalculationValue>
            {calculatedAmounts.gross_margin_rate.toFixed(1)}%
          </CalculationValue>
        </CalculationRow>
      </CalculationPanel>
      
      {/* 選択項目確認 */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#2d5a2d', marginBottom: '15px' }}>選択工事項目一覧（確認）</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e8f5e8', borderRadius: '8px' }}>
          {Object.values(itemSelections)
            .filter(item => item.selected && item.quantity > 0)
            .map((item, index, array) => (
            <div
              key={item.id}
              style={{
                padding: '15px',
                borderBottom: index < array.length - 1 ? '1px solid #e8f5e8' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.quantity} {item.unit} × {formatCurrency(item.purchase_price * item.markup_rate)}
                </div>
              </div>
              <div style={{ fontWeight: '600', color: '#2d5a2d' }}>
                {formatCurrency(item.quantity * item.purchase_price * item.markup_rate)}
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
          見積書作成ウィザード Pro
          {isDemoMode && <span style={{ 
            fontSize: '16px', 
            background: '#ff9800', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            marginLeft: '15px' 
          }}>🎭 デモモード</span>}
        </WizardTitle>
        <WizardSubtitle>
          造園業界標準項目・簡素化UI・データ保存対応
          {isDemoMode && ' - デモ環境（認証不要）'}
        </WizardSubtitle>
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
              <StepLabel
                completed={currentStep > step.number}
                active={currentStep === step.number}
              >
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

export default EstimateWizardPro;