/**
 * API関連の型定義
 * TypeScript型安全性100%実現
 */

// 基本レスポンス型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// エラーレスポンス型
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  userMessage?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

// 会社情報型
export interface Company {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  settings?: CompanySettings;
}

export interface CompanySettings {
  tax_rate: number;
  fiscal_year_start: number;
  invoice_prefix: string;
  estimate_validity_days: number;
  currency: string;
  timezone: string;
  locale: string;
  theme_color?: string;
  logo_url?: string;
  stamp_url?: string;
}

// ユーザー型
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';

// 見積型
export interface Estimate {
  id: string;
  estimate_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  project_name: string;
  site_address?: string;
  project_description?: string;
  notes?: string;
  status: EstimateStatus;
  total_amount: number;
  tax_amount: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  company_id: string;
  items?: EstimateItem[];
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface EstimateItem {
  id: string;
  estimate_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  purchase_price?: number;
  markup_rate?: number;
  adjustment_amount?: number;
  category_id?: string;
  sort_order: number;
}

// 単価マスター型
export interface PriceCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  company_id: string;
  items?: PriceItem[];
}

export interface PriceItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  unit: string;
  unit_price: number;
  purchase_price?: number;
  markup_rate?: number;
  adjustment_amount?: number;
  category_id: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// プロジェクト型
export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  site_address?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  progress: number;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  tasks?: ProjectTask[];
}

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface ProjectTask {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
  dependencies?: string[];
  created_at: string;
  updated_at?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';

// 請求書型
export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  estimate_id?: string;
  project_id?: string;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  items?: InvoiceItem[];
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial_paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  sort_order: number;
}

// 認証型
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: UserRole;
    company_id?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  profile?: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
  company_code?: string;
}

// API統計型
export interface CompanyStats {
  estimates: {
    total: number;
    draft: number;
    sent: number;
    approved: number;
    total_amount: number;
  };
  projects: {
    total: number;
    planning: number;
    in_progress: number;
    completed: number;
    average_progress: number;
  };
  users: {
    total: number;
    active: number;
  };
}

// フィルター・検索型
export interface EstimateFilter {
  status?: EstimateStatus;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface ProjectFilter {
  status?: ProjectStatus;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// デモモード型
export interface DemoMode {
  enabled: boolean;
  company_id: string;
  user_id: string;
  restrictions: {
    read_only: boolean;
    limited_data: boolean;
    watermark: boolean;
  };
}

// ファイルアップロード型
export interface FileUpload {
  file: File;
  type: 'logo' | 'stamp' | 'document' | 'image';
  max_size: number;
  allowed_types: string[];
}

export interface UploadResponse {
  url: string;
  file_name: string;
  file_size: number;
  content_type: string;
}

// Supabase Edge Functions型
export interface EdgeFunctionRequest {
  method: string;
  url: string;
  headers: Headers;
  body?: string;
}

export interface EdgeFunctionResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// 環境変数型
export interface EnvironmentVariables {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  FRONTEND_URL?: string;
  ENVIRONMENT?: 'development' | 'staging' | 'production';
  DEMO_MODE?: string;
  ALLOWED_ORIGINS?: string;
}

// バリデーション型
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}