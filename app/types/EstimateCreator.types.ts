/**
 * 見積作成コンポーネント専用型定義
 * React・TypeScript型安全性確保
 */

import { ReactNode } from 'react';

// 見積ウィザードステップ型
export interface WizardStep {
  id: number;
  title: string;
  description: string;
  component: ReactNode;
  isCompleted: boolean;
  isActive: boolean;
  isValid: boolean;
}

// 基本情報フォーム型
export interface BasicInfoForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  siteAddress: string;
  projectDescription: string;
}

// 要望詳細フォーム型
export interface RequirementForm {
  projectDescription: string;
  budget: number;
  desiredStartDate: string;
  desiredEndDate: string;
  specialRequirements: string;
  notes: string;
}

// 項目選択フォーム型
export interface ItemSelectionForm {
  selectedCategories: string[];
  selectedItems: SelectedPriceItem[];
  customItems: CustomEstimateItem[];
}

// 選択済み単価項目型
export interface SelectedPriceItem {
  id: string;
  priceItemId: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  markupRate: number;
  adjustmentAmount: number;
  calculatedPrice: number;
  totalAmount: number;
  categoryId: string;
  categoryName: string;
  isSelected: boolean;
  isCustom?: boolean;
}

// カスタム見積項目型
export interface CustomEstimateItem {
  id: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  categoryName: string;
}

// 金額調整フォーム型
export interface AdjustmentForm {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  taxRate: number;
  additionalCharges: AdditionalCharge[];
  notes: string;
}

// 追加料金型
export interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

// 見積計算結果型
export interface EstimateCalculation {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  additionalChargesTotal: number;
  grandTotal: number;
  totalPurchaseCost: number;
  totalProfit: number;
  profitMargin: number;
}

// 見積ウィザード状態型
export interface EstimateWizardState {
  currentStep: number;
  maxCompletedStep: number;
  basicInfo: BasicInfoForm;
  requirements: RequirementForm;
  itemSelection: ItemSelectionForm;
  adjustments: AdjustmentForm;
  calculation: EstimateCalculation;
  isLoading: boolean;
  errors: WizardError[];
  isDemoMode: boolean;
}

// ウィザードエラー型
export interface WizardError {
  step: number;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// バリデーション結果型
export interface StepValidationResult {
  isValid: boolean;
  errors: FieldError[];
  warnings: FieldError[];
}

// フィールドエラー型
export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

// 単価マスターカテゴリ型
export interface PriceMasterCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  items: PriceMasterItem[];
  children?: PriceMasterCategory[];
}

// 単価マスター項目型
export interface PriceMasterItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  unit: string;
  unitPrice: number;
  purchasePrice: number;
  markupRate: number;
  adjustmentAmount: number;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  isPopular?: boolean;
  isRecommended?: boolean;
}

// 見積保存データ型
export interface EstimateSaveData {
  id?: string;
  estimateNumber?: string;
  basicInfo: BasicInfoForm;
  requirements: RequirementForm;
  selectedItems: SelectedPriceItem[];
  customItems: CustomEstimateItem[];
  adjustments: AdjustmentForm;
  calculation: EstimateCalculation;
  status: 'draft' | 'completed';
  createdAt?: string;
  updatedAt?: string;
}

// ローカルストレージデータ型
export interface LocalStorageData {
  estimates: EstimateSaveData[];
  lastSaved: string;
  version: string;
}

// PDF生成オプション型
export interface PDFGenerationOptions {
  format: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeCompanyLogo: boolean;
  includeCompanyStamp: boolean;
  includeDetailedBreakdown: boolean;
  includeTermsAndConditions: boolean;
  watermark?: string;
  customTemplate?: string;
}

// エクスポートオプション型
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeImages: boolean;
  includeCalculations: boolean;
  fileName?: string;
}

// ウィザード設定型
export interface WizardConfiguration {
  enableAutoSave: boolean;
  autoSaveInterval: number; // seconds
  enableStepValidation: boolean;
  allowSkipSteps: boolean;
  showProgressBar: boolean;
  enableKeyboardNavigation: boolean;
  defaultTaxRate: number;
  defaultMarkupRate: number;
  theme: 'light' | 'dark' | 'auto';
}

// カテゴリフィルター型
export interface CategoryFilter {
  categoryIds: string[];
  searchQuery: string;
  priceRange: {
    min: number;
    max: number;
  };
  sortBy: 'name' | 'price' | 'popularity';
  sortOrder: 'asc' | 'desc';
  showInactive: boolean;
}

// 履歴管理型
export interface WizardHistory {
  id: string;
  action: 'step_change' | 'data_update' | 'item_add' | 'item_remove' | 'calculation_update';
  timestamp: string;
  data: unknown;
  canUndo: boolean;
}

// プロップス型
export interface EstimateWizardProps {
  initialData?: Partial<EstimateWizardState>;
  onSave?: (data: EstimateSaveData) => void;
  onCancel?: () => void;
  onComplete?: (data: EstimateSaveData) => void;
  configuration?: Partial<WizardConfiguration>;
  isDemoMode?: boolean;
  readOnly?: boolean;
}

export interface StepComponentProps {
  data: EstimateWizardState;
  onChange: (updates: Partial<EstimateWizardState>) => void;
  onValidate: () => StepValidationResult;
  onNext: () => void;
  onPrevious: () => void;
  isActive: boolean;
  isCompleted: boolean;
  isDemoMode: boolean;
}

// 業界特化型
export interface LandscapingSpecialty {
  id: string;
  name: string;
  description: string;
  defaultItems: string[]; // price item IDs
  seasonalFactors: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
  difficultyMultiplier: number;
}

// 見積テンプレート型
export interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultItems: SelectedPriceItem[];
  defaultAdjustments: Partial<AdjustmentForm>;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

// 計算エンジン型
export interface CalculationEngine {
  calculateItemTotal: (item: SelectedPriceItem) => number;
  calculateSubtotal: (items: SelectedPriceItem[]) => number;
  calculateDiscount: (subtotal: number, discount: { type: 'percentage' | 'fixed'; value: number }) => number;
  calculateTax: (taxableAmount: number, taxRate: number) => number;
  calculateGrandTotal: (subtotal: number, discount: number, tax: number, additionalCharges: number) => number;
  calculateProfitMargin: (totalSales: number, totalCosts: number) => number;
}

// イベントハンドラー型
export interface WizardEventHandlers {
  onStepChange: (fromStep: number, toStep: number) => void;
  onDataChange: (field: string, value: unknown, step: number) => void;
  onValidationError: (errors: FieldError[], step: number) => void;
  onSaveAttempt: (data: EstimateSaveData) => Promise<boolean>;
  onLoadAttempt: (id: string) => Promise<EstimateSaveData | null>;
}

// レスポンシブ型
export interface ResponsiveConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  showMobileOptimizedUI: boolean;
  enableTouchGestures: boolean;
  compactMode: boolean;
}