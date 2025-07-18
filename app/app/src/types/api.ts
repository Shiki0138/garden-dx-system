/**
 * Garden 造園業向け統合業務管理システム
 * API型定義 - 企業級型安全性を実現
 */

// ベース型定義
export interface BaseEntity {
  readonly id: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ユーザー・認証関連
export interface User extends BaseEntity {
  user_id: number;
  company_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'owner' | 'employee';
  is_active: boolean;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse
  extends ApiResponse<{
    access_token: string;
    token_type: string;
    user: User;
  }> {}

export interface UserFeatures {
  can_view_costs: boolean;
  can_view_profits: boolean;
  can_adjust_total: boolean;
  can_approve_estimates: boolean;
  can_issue_invoices: boolean;
  can_manage_users: boolean;
  can_view_dashboard: boolean;
  role: string;
  role_display: string;
}

// 会社情報
export interface Company extends BaseEntity {
  company_id: number;
  company_name: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// 顧客情報
export interface Customer extends BaseEntity {
  customer_id: number;
  company_id: number;
  customer_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  notes?: string;
}

// 単価マスタ
export interface PriceMaster extends BaseEntity {
  item_id: number;
  company_id: number;
  category: string;
  sub_category?: string;
  item_name: string;
  item_code?: string;
  unit: string;
  purchase_price: number;
  default_markup_rate: number;
  is_active: boolean;
  notes?: string;
}

export interface PriceMasterCreateRequest {
  category: string;
  sub_category?: string;
  item_name: string;
  item_code?: string;
  unit: string;
  purchase_price: number;
  default_markup_rate?: number;
  notes?: string;
}

// 見積関連
export type EstimateStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed';
export type ItemType = 'item' | 'header' | 'separator' | 'note';

export interface EstimateItem extends BaseEntity {
  item_id: number;
  estimate_id: number;
  price_master_item_id?: number;
  parent_item_id?: number;
  item_description: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  markup_rate?: number;
  unit_price?: number;
  line_total?: number;
  line_cost?: number;
  line_item_adjustment: number;
  level: number;
  sort_order: number;
  item_type: ItemType;
  is_free_entry: boolean;
  is_visible_to_customer: boolean;
}

export interface Estimate extends BaseEntity {
  estimate_id: number;
  company_id: number;
  customer_id: number;
  project_id?: number;
  estimate_number: string;
  estimate_date: string;
  valid_until?: string;
  status: EstimateStatus;
  subtotal: number;
  adjustment_amount: number;
  total_amount: number;
  total_cost: number;
  gross_profit: number;
  gross_margin_rate?: number;
  notes?: string;
  items: EstimateItem[];
  customer?: Customer;
  project?: Project;
}

export interface EstimateCreateRequest {
  customer_id: number;
  project_id?: number;
  estimate_number: string;
  estimate_date: string;
  valid_until?: string;
  notes?: string;
}

export interface EstimateUpdateRequest {
  adjustment_amount?: number;
  notes?: string;
  status?: EstimateStatus;
}

export interface EstimateItemCreateRequest {
  price_master_item_id?: number;
  parent_item_id?: number;
  item_description: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  markup_rate?: number;
  unit_price?: number;
  line_item_adjustment?: number;
  level?: number;
  sort_order: number;
  item_type?: ItemType;
  is_free_entry?: boolean;
  is_visible_to_customer?: boolean;
}

// 収益性分析
export interface ProfitabilityAnalysis {
  total_cost: number;
  total_revenue: number;
  gross_profit: number;
  gross_margin_rate: number;
  adjusted_total: number;
  final_profit: number;
  final_margin_rate: number;
}

// プロジェクト関連
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project extends BaseEntity {
  project_id: number;
  company_id: number;
  customer_id: number;
  project_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  budget_amount?: number;
  actual_amount?: number;
  progress_percentage: number;
  notes?: string;
  customer?: Customer;
}

// 請求書関連
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice extends BaseEntity {
  invoice_id: number;
  company_id: number;
  customer_id: number;
  estimate_id?: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_terms?: string;
  notes?: string;
  sent_at?: string;
  paid_at?: string;
  customer?: Customer;
  estimate?: Estimate;
}

// PDF出力関連
export interface PDFGenerationRequest {
  estimate_id: number;
  template?: 'standard' | 'landscape';
  include_costs?: boolean;
  watermark?: string;
}

export interface PDFResponse extends ApiResponse<Blob> {
  filename?: string;
  content_type?: string;
}

// エラー関連
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  field_errors: Record<string, string[]>;
}

// 権限関連
export type ResourceType =
  | 'estimates'
  | 'customers'
  | 'price_master'
  | 'invoices'
  | 'projects'
  | 'dashboard'
  | 'system';
export type ActionType =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'view_cost'
  | 'view_profit'
  | 'adjust_total'
  | 'approve'
  | 'pdf_generate'
  | 'issue';

export interface PermissionCheck {
  resource: ResourceType;
  action: ActionType;
  has_permission: boolean;
}

export interface PermissionMatrix {
  [role: string]: {
    [resource in ResourceType]?: {
      [action in ActionType]?: boolean;
    };
  };
}

// 統合テスト関連
export interface IntegrationTestResult {
  test_name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: unknown;
  executed_at: string;
}

export interface SystemHealthCheck {
  database: boolean;
  authentication: boolean;
  file_system: boolean;
  external_apis: boolean;
  overall_status: 'healthy' | 'degraded' | 'down';
  details: Record<string, unknown>;
}

// フォーム関連
export interface FormErrors {
  [field: string]: string | string[];
}

export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// フィルタリング・検索関連
export interface EstimateFilters {
  status?: EstimateStatus[];
  customer_id?: number[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
}

export interface SearchParams {
  q?: string;
  filters?: Record<string, unknown>;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 設定関連
export interface SystemSettings {
  company_info: Company;
  default_markup_rate: number;
  tax_rate: number;
  currency: string;
  date_format: string;
  pdf_template: string;
  notification_enabled: boolean;
}

// ダッシュボード関連
export interface DashboardMetrics {
  total_estimates: number;
  pending_estimates: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  active_projects: number;
  overdue_invoices: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  type:
    | 'estimate_created'
    | 'estimate_approved'
    | 'invoice_sent'
    | 'payment_received'
    | 'project_completed';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

// Utility types for better type safety
export type EntityId<T extends BaseEntity> = T['id'];

export type CreateRequest<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

export type UpdateRequest<T extends BaseEntity> = Partial<Omit<T, keyof BaseEntity | 'id'>>;

export type WithoutTimestamps<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at'>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type guards for runtime type checking
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' && response !== null && 'code' in response && 'message' in response
  );
}

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

export function isErrorResponse(
  response: ApiResponse<unknown>
): response is ApiResponse<never> & { success: false; error: string } {
  return response.success === false && typeof response.error === 'string';
}

// Constants for better type safety
export const ESTIMATE_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'completed',
] as const;
export const PROJECT_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
] as const;
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
export const ITEM_TYPES = ['item', 'header', 'separator', 'note'] as const;
export const USER_ROLES = ['owner', 'employee'] as const;

// Branded types for better type safety
export type EstimateId = number & { readonly __brand: 'EstimateId' };
export type CustomerId = number & { readonly __brand: 'CustomerId' };
export type ProjectId = number & { readonly __brand: 'ProjectId' };
export type InvoiceId = number & { readonly __brand: 'InvoiceId' };
export type UserId = number & { readonly __brand: 'UserId' };
export type CompanyId = number & { readonly __brand: 'CompanyId' };

// Helper functions for branded types
export function createEstimateId(id: number): EstimateId {
  return id as EstimateId;
}

export function createCustomerId(id: number): CustomerId {
  return id as CustomerId;
}

export function createProjectId(id: number): ProjectId {
  return id as ProjectId;
}

export function createInvoiceId(id: number): InvoiceId {
  return id as InvoiceId;
}

export function createUserId(id: number): UserId {
  return id as UserId;
}

export function createCompanyId(id: number): CompanyId {
  return id as CompanyId;
}
