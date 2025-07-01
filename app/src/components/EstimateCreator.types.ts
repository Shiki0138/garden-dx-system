/**
 * Garden 造園業向け統合業務管理システム
 * EstimateCreator コンポーネント型定義
 * 企業級型安全性・保守性・拡張性を確保
 */

import type {
  Estimate,
  EstimateItem,
  ProfitabilityAnalysis,
  EstimateItemCreateRequest,
  ApiResponse,
  User,
} from '../types/api';

// Props型定義
export interface EstimateCreatorProps {
  /** 見積ID（編集時に指定） */
  estimateId?: number;
  /** 初期見積データ（新規作成時に指定可能） */
  initialEstimate?: Partial<Estimate>;
  /** 読み取り専用モード */
  readonly?: boolean;
  /** カスタムクラス名 */
  className?: string;
  /** 保存時のコールバック */
  onSave?: (estimate: Estimate) => void;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
  /** エラー時のコールバック */
  onError?: (error: Error) => void;
}

// 内部状態型定義
export interface EstimateCreatorState {
  /** 現在の見積データ */
  estimate: Estimate | null;
  /** 見積明細一覧 */
  items: EstimateItem[];
  /** 収益性分析データ */
  profitability: ProfitabilityAnalysis | null;
  /** 単価マスタモーダル表示状態 */
  showPriceMaster: boolean;
  /** ローディング状態 */
  loading: boolean;
  /** 変更の有無 */
  isDirty: boolean;
  /** エラー状態 */
  error: string | null;
  /** 自動保存の有効状態 */
  autoSaveEnabled: boolean;
}

// イベントハンドラ型定義
export interface EstimateCreatorHandlers {
  /** 見積データ更新 */
  handleEstimateChange: (estimate: Estimate) => void;
  /** 明細追加 */
  handleAddItem: (item: EstimateItemCreateRequest) => Promise<void>;
  /** 明細更新 */
  handleUpdateItem: (itemId: number, updateData: Partial<EstimateItem>) => Promise<void>;
  /** 明細削除 */
  handleDeleteItem: (itemId: number) => Promise<void>;
  /** 明細並び替え */
  handleReorderItems: (reorderedItems: EstimateItem[]) => Promise<void>;
  /** 調整額変更 */
  handleAdjustmentChange: (adjustmentAmount: number) => Promise<void>;
  /** 見積保存 */
  handleSave: () => Promise<void>;
  /** PDF生成 */
  handleGeneratePDF: () => Promise<void>;
  /** リフレッシュ */
  handleRefresh: () => Promise<void>;
}

// パフォーマンス最適化設定
export interface PerformanceConfig {
  /** 仮想スクロール有効化 */
  enableVirtualScroll: boolean;
  /** バッチ処理サイズ */
  batchSize: number;
  /** デバウンス遅延（ms） */
  debounceDelay: number;
  /** 自動保存間隔（ms） */
  autoSaveInterval: number;
  /** キャッシュ有効期間（ms） */
  cacheTimeout: number;
}

// アクセシビリティ設定
export interface AccessibilityConfig {
  /** スクリーンリーダー対応 */
  screenReaderSupport: boolean;
  /** キーボードナビゲーション */
  keyboardNavigation: boolean;
  /** ハイコントラストモード */
  highContrastMode: boolean;
  /** フォーカス管理 */
  focusManagement: boolean;
  /** ARIAラベル使用 */
  useAriaLabels: boolean;
}

// UI設定
export interface UIConfig {
  /** テーマ */
  theme: 'light' | 'dark' | 'auto';
  /** 言語 */
  language: 'ja' | 'en';
  /** 通貨表示形式 */
  currencyFormat: 'JPY' | 'USD' | 'EUR';
  /** 日付形式 */
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  /** 数値区切り文字 */
  numberSeparator: ',' | '.' | ' ';
}

// エラー型定義
export interface EstimateCreatorError extends Error {
  /** エラーコード */
  code: string;
  /** エラーの詳細情報 */
  details?: Record<string, unknown>;
  /** ユーザー向けメッセージ */
  userMessage?: string;
  /** 復旧可能かどうか */
  recoverable: boolean;
}

// バリデーション結果
export interface ValidationResult {
  /** バリデーション結果 */
  isValid: boolean;
  /** エラーメッセージリスト */
  errors: string[];
  /** 警告メッセージリスト */
  warnings: string[];
  /** フィールド別エラー */
  fieldErrors: Record<string, string[]>;
}

// フォーム状態
export interface FormState {
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** 変更の有無 */
  isDirty: boolean;
  /** バリデーション結果 */
  validation: ValidationResult;
  /** 最後の保存時刻 */
  lastSavedAt: Date | null;
  /** 自動保存状態 */
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// カスタムフック戻り値型
export interface UseEstimateCreator {
  /** 状態 */
  state: EstimateCreatorState;
  /** イベントハンドラ */
  handlers: EstimateCreatorHandlers;
  /** フォーム状態 */
  formState: FormState;
  /** パフォーマンス情報 */
  performance: {
    renderTime: number;
    memoryUsage: number;
    itemCount: number;
  };
}

// 権限チェック結果
export interface PermissionState {
  /** 閲覧権限 */
  canView: boolean;
  /** 編集権限 */
  canEdit: boolean;
  /** 削除権限 */
  canDelete: boolean;
  /** 原価表示権限 */
  canViewCosts: boolean;
  /** 利益表示権限 */
  canViewProfits: boolean;
  /** 調整権限 */
  canAdjustTotal: boolean;
  /** PDF生成権限 */
  canGeneratePDF: boolean;
  /** 承認権限 */
  canApprove: boolean;
}

// 履歴管理
export interface HistoryEntry {
  /** エントリID */
  id: string;
  /** タイムスタンプ */
  timestamp: Date;
  /** ユーザー */
  user: Pick<User, 'user_id' | 'username' | 'full_name'>;
  /** アクション種別 */
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  /** 変更内容 */
  changes: Record<string, { before: unknown; after: unknown }>;
  /** コメント */
  comment?: string;
}

// 自動保存設定
export interface AutoSaveConfig {
  /** 自動保存有効 */
  enabled: boolean;
  /** 保存間隔（秒） */
  interval: number;
  /** 変更後の遅延時間（秒） */
  delay: number;
  /** 最大リトライ回数 */
  maxRetries: number;
  /** オフライン時の動作 */
  offlineBehavior: 'queue' | 'disable' | 'warn';
}

// エクスポート・インポート設定
export interface ExportConfig {
  /** エクスポート形式 */
  format: 'pdf' | 'excel' | 'csv' | 'json';
  /** テンプレート */
  template: 'standard' | 'detailed' | 'summary';
  /** 原価情報含有 */
  includeCosts: boolean;
  /** 利益情報含有 */
  includeProfits: boolean;
  /** 透かし */
  watermark?: string;
  /** パスワード保護 */
  passwordProtected: boolean;
}

// 検索・フィルタ設定
export interface SearchConfig {
  /** 検索対象フィールド */
  searchFields: string[];
  /** 検索オプション */
  options: {
    /** 大文字小文字区別 */
    caseSensitive: boolean;
    /** 完全一致 */
    exactMatch: boolean;
    /** 正規表現 */
    useRegex: boolean;
  };
  /** フィルタ設定 */
  filters: Record<string, unknown>;
}

// コンポーネント設定統合
export interface EstimateCreatorConfig {
  /** パフォーマンス設定 */
  performance: PerformanceConfig;
  /** アクセシビリティ設定 */
  accessibility: AccessibilityConfig;
  /** UI設定 */
  ui: UIConfig;
  /** 自動保存設定 */
  autoSave: AutoSaveConfig;
  /** エクスポート設定 */
  export: ExportConfig;
  /** 検索設定 */
  search: SearchConfig;
}