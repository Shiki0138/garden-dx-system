/**
 * Garden Project Management System - TypeScript Type Definitions
 * プロジェクト管理システム型定義（強化版）
 * 
 * Created by: worker2 (Type Safety Enhancement Phase)
 * Date: 2025-06-30
 * Purpose: 企業級TypeScript型安全性確保
 */

// ==============================
// Base Types
// ==============================

export type UUID = string;
export type DateString = string; // ISO 8601 format
export type CurrencyAmount = number; // 円単位
export type Percentage = number; // 0-100
export type ProgressPercentage = number; // 0-100

// ==============================
// Enums
// ==============================

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  SUSPENDED = 'suspended'
}

export enum TaskType {
  WORK = 'work',
  MILESTONE = 'milestone',
  APPROVAL = 'approval',
  INSPECTION = 'inspection'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum UserRole {
  MANAGER = '経営者',
  EMPLOYEE = '従業員',
  VIEWER = '閲覧者'
}

export enum ChangeOrderStatus {
  PENDING = '申請中',
  APPROVED = '承認済',
  REJECTED = '却下',
  IMPLEMENTED = '実装済'
}

// ==============================
// Core Entity Types
// ==============================

export interface BaseEntity {
  readonly id: number;
  readonly created_at: DateString;
  readonly updated_at: DateString;
  readonly created_by?: number;
  readonly updated_by?: number;
}

export interface Company extends BaseEntity {
  company_name: string;
  tax_number?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  settings: CompanySettings;
}

export interface CompanySettings {
  timezone: string;
  currency: string;
  fiscal_year_start: string;
  default_tax_rate: Percentage;
  working_hours: {
    start: string;
    end: string;
    break_duration: number;
  };
  holidays: DateString[];
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: number;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  last_login?: DateString;
  permissions: Permission[];
}

export interface Permission {
  permission_id: string;
  permission_name: string;
  resource: string;
  action: string;
  description: string;
}

// ==============================
// Project Types
// ==============================

export interface Project extends BaseEntity {
  readonly project_id: number;
  company_id: number;
  customer_id: number;
  estimate_id?: number;
  project_name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  
  // Dates
  start_date: DateString;
  end_date?: DateString;
  planned_start_date?: DateString;
  planned_end_date?: DateString;
  actual_start_date?: DateString;
  actual_end_date?: DateString;
  
  // Financial
  total_budget: CurrencyAmount;
  estimated_revenue: CurrencyAmount;
  actual_cost: CurrencyAmount;
  estimated_profit: CurrencyAmount;
  
  // Progress
  progress_percentage: ProgressPercentage;
  
  // Team
  manager_id?: number;
  team_members: ProjectTeamMember[];
  
  // Additional
  location?: ProjectLocation;
  tags: string[];
  notes?: string;
  attachments: ProjectAttachment[];
  
  // Computed properties
  readonly estimated_profit_rate: Percentage;
  readonly budget_consumption_rate: Percentage;
  readonly schedule_variance_days: number;
  readonly cost_variance: CurrencyAmount;
  readonly is_over_budget: boolean;
  readonly is_delayed: boolean;
}

export interface ProjectTeamMember {
  user_id: number;
  user_name: string;
  role: string;
  hourly_rate?: CurrencyAmount;
  assigned_date: DateString;
  is_lead: boolean;
}

export interface ProjectLocation {
  address: string;
  latitude?: number;
  longitude?: number;
  postal_code?: string;
  city: string;
  prefecture: string;
  country: string;
}

export interface ProjectAttachment {
  attachment_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: number;
  uploaded_at: DateString;
  description?: string;
}

// ==============================
// Task Types
// ==============================

export interface ProjectTask extends BaseEntity {
  readonly task_id: number;
  project_id: number;
  parent_task_id?: number;
  task_name: string;
  task_description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: Priority;
  
  // Hierarchy
  level: number;
  sort_order: number;
  path: string; // Hierarchical path like "1.2.3"
  
  // Dates
  start_date: DateString;
  end_date: DateString;
  planned_start_date?: DateString;
  planned_end_date?: DateString;
  actual_start_date?: DateString;
  actual_end_date?: DateString;
  
  // Progress
  progress_percentage: ProgressPercentage;
  estimated_hours: number;
  actual_hours: number;
  
  // Assignment
  assigned_to?: number;
  assigned_to_name?: string;
  
  // Financial
  budget_amount: CurrencyAmount;
  actual_cost: CurrencyAmount;
  
  // Dependencies
  dependencies: number[];
  dependents: number[];
  
  // Additional
  is_milestone: boolean;
  is_critical_path: boolean;
  notes?: string;
  
  // Computed properties
  readonly duration_days: number;
  readonly delay_days: number;
  readonly completion_rate: Percentage;
  readonly cost_variance: CurrencyAmount;
  readonly schedule_variance_days: number;
}

export interface TaskProgressUpdate {
  task_id: number;
  progress_percentage: ProgressPercentage;
  status: TaskStatus;
  actual_hours?: number;
  comment?: string;
  photos?: string[];
  location?: TaskLocation;
  reported_by: number;
  reported_at: DateString;
}

export interface TaskLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

// ==============================
// Budget & Financial Types
// ==============================

export interface BudgetTracking extends BaseEntity {
  budget_id: number;
  project_id: number;
  task_id?: number;
  category: BudgetCategory;
  description: string;
  budgeted_amount: CurrencyAmount;
  actual_amount: CurrencyAmount;
  variance: CurrencyAmount;
  expense_date: DateString;
  receipt_url?: string;
  approved_by?: number;
  approved_at?: DateString;
  notes?: string;
}

export enum BudgetCategory {
  LABOR = 'labor',
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  SUBCONTRACTOR = 'subcontractor',
  PERMITS = 'permits',
  OTHER = 'other'
}

export interface ChangeOrder extends BaseEntity {
  change_order_id: number;
  project_id: number;
  change_order_number: string;
  title: string;
  description: string;
  reason: string;
  status: ChangeOrderStatus;
  
  // Financial Impact
  estimated_cost: CurrencyAmount;
  actual_cost?: CurrencyAmount;
  estimated_time_impact_days: number;
  actual_time_impact_days?: number;
  
  // Approval workflow
  requested_by: number;
  requested_at: DateString;
  approved_by?: number;
  approved_at?: DateString;
  rejected_by?: number;
  rejected_at?: DateString;
  rejection_reason?: string;
  
  // Implementation
  implemented_by?: number;
  implemented_at?: DateString;
  
  attachments: ProjectAttachment[];
  notes?: string;
}

// ==============================
// Filter & Query Types
// ==============================

export interface ProjectFilter {
  company_id?: number;
  status?: ProjectStatus[];
  priority?: Priority[];
  manager_id?: number;
  customer_id?: number;
  start_date_from?: DateString;
  start_date_to?: DateString;
  end_date_from?: DateString;
  end_date_to?: DateString;
  budget_min?: CurrencyAmount;
  budget_max?: CurrencyAmount;
  progress_min?: ProgressPercentage;
  progress_max?: ProgressPercentage;
  tags?: string[];
  search?: string;
  is_delayed?: boolean;
  is_over_budget?: boolean;
  
  // Pagination
  page?: number;
  limit?: number;
  sort_by?: keyof Project;
  sort_order?: 'asc' | 'desc';
}

export interface TaskFilter {
  project_id?: number;
  status?: TaskStatus[];
  priority?: Priority[];
  assigned_to?: number;
  task_type?: TaskType[];
  start_date_from?: DateString;
  start_date_to?: DateString;
  end_date_from?: DateString;
  end_date_to?: DateString;
  progress_min?: ProgressPercentage;
  progress_max?: ProgressPercentage;
  is_milestone?: boolean;
  is_critical_path?: boolean;
  is_delayed?: boolean;
  parent_task_id?: number;
  level?: number;
  search?: string;
  
  // Pagination
  page?: number;
  limit?: number;
  sort_by?: keyof ProjectTask;
  sort_order?: 'asc' | 'desc';
}

// ==============================
// Request/Response Types
// ==============================

export interface ProjectCreateRequest {
  company_id: number;
  customer_id: number;
  estimate_id?: number;
  project_name: string;
  description?: string;
  start_date: DateString;
  end_date?: DateString;
  total_budget: CurrencyAmount;
  estimated_revenue: CurrencyAmount;
  manager_id?: number;
  location?: Omit<ProjectLocation, 'latitude' | 'longitude'>;
  tags?: string[];
  notes?: string;
}

export interface ProjectUpdateRequest {
  project_name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: Priority;
  start_date?: DateString;
  end_date?: DateString;
  total_budget?: CurrencyAmount;
  estimated_revenue?: CurrencyAmount;
  manager_id?: number;
  location?: ProjectLocation;
  tags?: string[];
  notes?: string;
}

export interface TaskCreateRequest {
  task_name: string;
  task_description?: string;
  task_type: TaskType;
  priority?: Priority;
  parent_task_id?: number;
  start_date: DateString;
  end_date: DateString;
  estimated_hours?: number;
  budget_amount?: CurrencyAmount;
  assigned_to?: number;
  dependencies?: number[];
  is_milestone?: boolean;
  notes?: string;
}

export interface TaskUpdateRequest {
  task_name?: string;
  task_description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: Priority;
  start_date?: DateString;
  end_date?: DateString;
  progress_percentage?: ProgressPercentage;
  estimated_hours?: number;
  actual_hours?: number;
  budget_amount?: CurrencyAmount;
  actual_cost?: CurrencyAmount;
  assigned_to?: number;
  dependencies?: number[];
  is_milestone?: boolean;
  notes?: string;
}

// ==============================
// Statistics & Analytics Types
// ==============================

export interface ProjectStatistics {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delayed_projects: number;
  on_hold_projects: number;
  cancelled_projects: number;
  
  // Financial
  total_budget: CurrencyAmount;
  total_actual_cost: CurrencyAmount;
  total_estimated_revenue: CurrencyAmount;
  total_actual_revenue: CurrencyAmount;
  average_profit_margin: Percentage;
  
  // Performance
  average_completion_time_days: number;
  on_time_completion_rate: Percentage;
  budget_adherence_rate: Percentage;
  
  // Trends (last 12 months)
  monthly_project_completion: MonthlyStatistic[];
  monthly_revenue: MonthlyStatistic[];
  monthly_profit_margin: MonthlyStatistic[];
  
  // Top performers
  top_performing_managers: ManagerPerformance[];
  most_profitable_project_types: ProjectTypePerformance[];
}

export interface MonthlyStatistic {
  month: string; // YYYY-MM format
  value: number;
  change_percentage: Percentage;
}

export interface ManagerPerformance {
  manager_id: number;
  manager_name: string;
  projects_managed: number;
  average_profit_margin: Percentage;
  on_time_completion_rate: Percentage;
  customer_satisfaction_score?: number;
}

export interface ProjectTypePerformance {
  project_type: string;
  project_count: number;
  average_profit_margin: Percentage;
  total_revenue: CurrencyAmount;
}

// ==============================
// Integration Types
// ==============================

export interface EstimateToProjectRequest {
  estimate_id: number;
  project_name?: string;
  start_date?: DateString;
  end_date?: DateString;
  manager_id?: number;
  notes?: string;
}

export interface EstimateToProjectResponse {
  project_id: number;
  project_name: string;
  total_budget: CurrencyAmount;
  estimated_revenue: CurrencyAmount;
  estimated_profit: CurrencyAmount;
  estimated_profit_rate: Percentage;
  created_tasks: ProjectTask[];
  message: string;
}

export interface ProjectToInvoiceRequest {
  project_id: number;
  invoice_date?: DateString;
  payment_due_date?: DateString;
  notes?: string;
  include_change_orders?: boolean;
}

export interface ProjectToInvoiceResponse {
  invoice_id: number;
  invoice_number: string;
  invoice_amount: CurrencyAmount;
  project_name: string;
  customer_info: CustomerInfo;
  pdf_url?: string;
  message: string;
}

export interface CustomerInfo {
  customer_id: number;
  customer_name: string;
  company_name?: string;
  address: string;
  phone: string;
  email: string;
}

// ==============================
// UI/Component Types
// ==============================

export interface GanttChartTask extends ProjectTask {
  // UI-specific computed properties
  readonly barStartX: number;
  readonly barEndX: number;
  readonly barWidth: number;
  readonly yPosition: number;
  readonly isVisible: boolean;
  readonly hasConflicts: boolean;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  totalRevenue: CurrencyAmount;
  totalBudget: CurrencyAmount;
  profitRate: Percentage;
  taskCompletionRate: Percentage;
  budgetUtilizationRate: Percentage;
  averageProjectDuration: number;
  customerSatisfactionScore?: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  elementsRendered: number;
  componentsLoaded: number;
  cacheHitRate: Percentage;
  lastUpdate: number;
}

// ==============================
// Validation Types
// ==============================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ==============================
// Utility Types
// ==============================

export type ProjectKeys = keyof Project;
export type TaskKeys = keyof ProjectTask;
export type PartialProject = Partial<Project>;
export type PartialTask = Partial<ProjectTask>;

export type ProjectSortableFields = 
  | 'project_name'
  | 'start_date'
  | 'end_date'
  | 'total_budget'
  | 'progress_percentage'
  | 'created_at'
  | 'updated_at';

export type TaskSortableFields =
  | 'task_name'
  | 'start_date'
  | 'end_date'
  | 'progress_percentage'
  | 'priority'
  | 'status'
  | 'budget_amount';

// ==============================
// Event Types
// ==============================

export interface ProjectEvent {
  event_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'completed';
  project_id: number;
  user_id: number;
  timestamp: DateString;
  details: Record<string, any>;
}

export interface TaskEvent {
  event_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'progress_updated' | 'assigned';
  task_id: number;
  project_id: number;
  user_id: number;
  timestamp: DateString;
  details: Record<string, any>;
}

// ==============================
// Export All Types
// ==============================

export type {
  // Re-export all types for convenience
  BaseEntity,
  Company,
  CompanySettings,
  User,
  Permission,
  Project,
  ProjectTeamMember,
  ProjectLocation,
  ProjectAttachment,
  ProjectTask,
  TaskProgressUpdate,
  TaskLocation,
  BudgetTracking,
  ChangeOrder,
  ProjectFilter,
  TaskFilter,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  TaskCreateRequest,
  TaskUpdateRequest,
  ProjectStatistics,
  MonthlyStatistic,
  ManagerPerformance,
  ProjectTypePerformance,
  EstimateToProjectRequest,
  EstimateToProjectResponse,
  ProjectToInvoiceRequest,
  ProjectToInvoiceResponse,
  CustomerInfo,
  GanttChartTask,
  DashboardMetrics,
  PerformanceMetrics,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProjectEvent,
  TaskEvent
};