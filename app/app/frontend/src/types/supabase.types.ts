/**
 * Supabase Database Types
 * 造園業務管理システム - 型定義
 * 
 * Created by: worker2 (Supabase Integration)
 * Date: 2025-07-01
 */

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          company_id: string;
          company_name: string;
          company_code: string;
          postal_code: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          subscription_plan: 'basic' | 'standard' | 'premium';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string;
          company_name: string;
          company_code: string;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          subscription_plan?: 'basic' | 'standard' | 'premium';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          company_name?: string;
          company_code?: string;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          subscription_plan?: 'basic' | 'standard' | 'premium';
          is_active?: boolean;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          company_id: string;
          role: 'owner' | 'manager' | 'employee' | 'viewer';
          full_name: string;
          position: string | null;
          phone: string | null;
          is_active: boolean;
          permissions: Record<string, any>;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          company_id: string;
          role: 'owner' | 'manager' | 'employee' | 'viewer';
          full_name: string;
          position?: string | null;
          phone?: string | null;
          is_active?: boolean;
          permissions?: Record<string, any>;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          role?: 'owner' | 'manager' | 'employee' | 'viewer';
          full_name?: string;
          position?: string | null;
          phone?: string | null;
          is_active?: boolean;
          permissions?: Record<string, any>;
          last_login_at?: string | null;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          customer_id: string;
          company_id: string;
          customer_name: string;
          customer_type: 'individual' | 'corporate';
          customer_code: string | null;
          postal_code: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          contact_person: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id?: string;
          company_id: string;
          customer_name: string;
          customer_type?: 'individual' | 'corporate';
          customer_code?: string | null;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_person?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_name?: string;
          customer_type?: 'individual' | 'corporate';
          customer_code?: string | null;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_person?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      price_master: {
        Row: {
          item_id: string;
          company_id: string;
          category: string;
          sub_category: string | null;
          detail_category: string | null;
          item_name: string;
          item_code: string | null;
          unit: string;
          purchase_price: number;
          default_markup_rate: number;
          current_price: number | null;
          supplier_name: string | null;
          lead_time_days: number;
          minimum_order_qty: number;
          stock_quantity: number;
          notes: string | null;
          tags: any[];
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          item_id?: string;
          company_id: string;
          category: string;
          sub_category?: string | null;
          detail_category?: string | null;
          item_name: string;
          item_code?: string | null;
          unit: string;
          purchase_price: number;
          default_markup_rate?: number;
          current_price?: number | null;
          supplier_name?: string | null;
          lead_time_days?: number;
          minimum_order_qty?: number;
          stock_quantity?: number;
          notes?: string | null;
          tags?: any[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          sub_category?: string | null;
          detail_category?: string | null;
          item_name?: string;
          item_code?: string | null;
          unit?: string;
          purchase_price?: number;
          default_markup_rate?: number;
          current_price?: number | null;
          supplier_name?: string | null;
          lead_time_days?: number;
          minimum_order_qty?: number;
          stock_quantity?: number;
          notes?: string | null;
          tags?: any[];
          is_active?: boolean;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          project_id: string;
          company_id: string;
          customer_id: string;
          project_name: string;
          project_code: string | null;
          site_address: string | null;
          status: 'planning' | 'estimating' | 'quoted' | 'contracted' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          start_date: string | null;
          end_date: string | null;
          actual_start_date: string | null;
          actual_end_date: string | null;
          total_budget: number | null;
          actual_cost: number;
          progress_percentage: number;
          project_manager_id: string | null;
          notes: string | null;
          attachments: any[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id?: string;
          company_id: string;
          customer_id: string;
          project_name: string;
          project_code?: string | null;
          site_address?: string | null;
          status?: 'planning' | 'estimating' | 'quoted' | 'contracted' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string | null;
          end_date?: string | null;
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          total_budget?: number | null;
          actual_cost?: number;
          progress_percentage?: number;
          project_manager_id?: string | null;
          notes?: string | null;
          attachments?: any[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          project_name?: string;
          project_code?: string | null;
          site_address?: string | null;
          status?: 'planning' | 'estimating' | 'quoted' | 'contracted' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string | null;
          end_date?: string | null;
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          total_budget?: number | null;
          actual_cost?: number;
          progress_percentage?: number;
          project_manager_id?: string | null;
          notes?: string | null;
          attachments?: any[];
          updated_at?: string;
        };
      };
      process_schedules: {
        Row: {
          schedule_id: string;
          company_id: string;
          project_id: string;
          schedule_name: string;
          description: string | null;
          template_id: string | null;
          start_date: string;
          end_date: string;
          status: 'draft' | 'active' | 'completed' | 'cancelled';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          schedule_id?: string;
          company_id: string;
          project_id: string;
          schedule_name: string;
          description?: string | null;
          template_id?: string | null;
          start_date: string;
          end_date: string;
          status?: 'draft' | 'active' | 'completed' | 'cancelled';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          schedule_name?: string;
          description?: string | null;
          template_id?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'draft' | 'active' | 'completed' | 'cancelled';
          updated_at?: string;
        };
      };
      process_tasks: {
        Row: {
          task_id: string;
          schedule_id: string;
          task_name: string;
          description: string | null;
          category: string;
          start_date: string;
          end_date: string;
          duration: number;
          progress: number;
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
          priority: 'low' | 'medium' | 'high' | 'critical';
          assigned_to: string | null;
          dependencies: any[];
          actual_start_date: string | null;
          actual_end_date: string | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          task_id?: string;
          schedule_id: string;
          task_name: string;
          description?: string | null;
          category: string;
          start_date: string;
          end_date: string;
          duration: number;
          progress?: number;
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          assigned_to?: string | null;
          dependencies?: any[];
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          task_name?: string;
          description?: string | null;
          category?: string;
          start_date?: string;
          end_date?: string;
          duration?: number;
          progress?: number;
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          assigned_to?: string | null;
          dependencies?: any[];
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      estimates: {
        Row: {
          estimate_id: string;
          company_id: string;
          project_id: string | null;
          customer_id: string;
          estimate_number: string;
          estimate_date: string;
          valid_until: string | null;
          revision_number: number;
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'converted';
          subtotal: number;
          discount_amount: number;
          adjustment_amount: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          total_cost: number;
          gross_profit: number;
          gross_margin_rate: number | null;
          competitor_info: string | null;
          win_probability: number | null;
          expected_order_date: string | null;
          notes: string | null;
          terms_conditions: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          estimate_id?: string;
          company_id: string;
          project_id?: string | null;
          customer_id: string;
          estimate_number: string;
          estimate_date?: string;
          valid_until?: string | null;
          revision_number?: number;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'converted';
          subtotal?: number;
          discount_amount?: number;
          adjustment_amount?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
          total_cost?: number;
          gross_profit?: number;
          gross_margin_rate?: number | null;
          competitor_info?: string | null;
          win_probability?: number | null;
          expected_order_date?: string | null;
          notes?: string | null;
          terms_conditions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          customer_id?: string;
          estimate_number?: string;
          estimate_date?: string;
          valid_until?: string | null;
          revision_number?: number;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'converted';
          subtotal?: number;
          discount_amount?: number;
          adjustment_amount?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
          total_cost?: number;
          gross_profit?: number;
          gross_margin_rate?: number | null;
          competitor_info?: string | null;
          win_probability?: number | null;
          expected_order_date?: string | null;
          notes?: string | null;
          terms_conditions?: string | null;
          updated_at?: string;
        };
      };
      estimate_items: {
        Row: {
          item_id: string;
          estimate_id: string;
          price_master_item_id: string | null;
          parent_item_id: string | null;
          level: number;
          sort_order: number;
          item_type: 'header' | 'item' | 'subtotal';
          item_description: string;
          specification: string | null;
          quantity: number | null;
          unit: string | null;
          purchase_price: number | null;
          markup_rate: number | null;
          unit_price: number | null;
          line_discount_rate: number;
          line_total: number | null;
          line_cost: number | null;
          process_task_id: string | null;
          estimated_work_hours: number | null;
          is_optional: boolean;
          is_free_entry: boolean;
          delivery_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          item_id?: string;
          estimate_id: string;
          price_master_item_id?: string | null;
          parent_item_id?: string | null;
          level?: number;
          sort_order: number;
          item_type?: 'header' | 'item' | 'subtotal';
          item_description: string;
          specification?: string | null;
          quantity?: number | null;
          unit?: string | null;
          purchase_price?: number | null;
          markup_rate?: number | null;
          unit_price?: number | null;
          line_discount_rate?: number;
          line_total?: number | null;
          line_cost?: number | null;
          process_task_id?: string | null;
          estimated_work_hours?: number | null;
          is_optional?: boolean;
          is_free_entry?: boolean;
          delivery_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          price_master_item_id?: string | null;
          parent_item_id?: string | null;
          level?: number;
          sort_order?: number;
          item_type?: 'header' | 'item' | 'subtotal';
          item_description?: string;
          specification?: string | null;
          quantity?: number | null;
          unit?: string | null;
          purchase_price?: number | null;
          markup_rate?: number | null;
          unit_price?: number | null;
          line_discount_rate?: number;
          line_total?: number | null;
          line_cost?: number | null;
          process_task_id?: string | null;
          estimated_work_hours?: number | null;
          is_optional?: boolean;
          is_free_entry?: boolean;
          delivery_date?: string | null;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          invoice_id: string;
          company_id: string;
          project_id: string;
          customer_id: string;
          estimate_id: string | null;
          invoice_number: string;
          invoice_date: string;
          due_date: string | null;
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          paid_amount: number;
          status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          payment_method: string | null;
          payment_terms: string | null;
          bank_info: Record<string, any> | null;
          payment_due_reminder_sent: boolean;
          last_reminder_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          invoice_id?: string;
          company_id: string;
          project_id: string;
          customer_id: string;
          estimate_id?: string | null;
          invoice_number: string;
          invoice_date?: string;
          due_date?: string | null;
          subtotal: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount: number;
          paid_amount?: number;
          status?: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          payment_method?: string | null;
          payment_terms?: string | null;
          bank_info?: Record<string, any> | null;
          payment_due_reminder_sent?: boolean;
          last_reminder_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          customer_id?: string;
          estimate_id?: string | null;
          invoice_number?: string;
          invoice_date?: string;
          due_date?: string | null;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          status?: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          payment_method?: string | null;
          payment_terms?: string | null;
          bank_info?: Record<string, any> | null;
          payment_due_reminder_sent?: boolean;
          last_reminder_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          setting_id: string;
          company_id: string;
          setting_key: string;
          setting_value: Record<string, any>;
          setting_type: string;
          description: string | null;
          is_system_default: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          setting_id?: string;
          company_id: string;
          setting_key: string;
          setting_value: Record<string, any>;
          setting_type?: string;
          description?: string | null;
          is_system_default?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setting_key?: string;
          setting_value?: Record<string, any>;
          setting_type?: string;
          description?: string | null;
          is_system_default?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          log_id: string;
          company_id: string;
          user_id: string | null;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          old_values: Record<string, any> | null;
          new_values: Record<string, any> | null;
          changed_fields: string[] | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          log_id?: string;
          company_id: string;
          user_id?: string | null;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          old_values?: Record<string, any> | null;
          new_values?: Record<string, any> | null;
          changed_fields?: string[] | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      file_attachments: {
        Row: {
          file_id: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          file_id?: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          entity_type?: string;
          entity_id?: string;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path?: string;
        };
      };
    };
    Views: {};
    Functions: {
      get_user_company_id: {
        Args: {};
        Returns: string;
      };
      has_role: {
        Args: { required_role: string };
        Returns: boolean;
      };
      has_permission: {
        Args: { permission_key: string };
        Returns: boolean;
      };
    };
    Enums: {};
  };
}

// ヘルパータイプ
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// 主要エンティティタイプ
export type Company = Tables<'companies'>['Row'];
export type UserProfile = Tables<'user_profiles'>['Row'];
export type Customer = Tables<'customers'>['Row'];
export type PriceMaster = Tables<'price_master'>['Row'];
export type Project = Tables<'projects'>['Row'];
export type ProcessSchedule = Tables<'process_schedules'>['Row'];
export type ProcessTask = Tables<'process_tasks'>['Row'];
export type Estimate = Tables<'estimates'>['Row'];
export type EstimateItem = Tables<'estimate_items'>['Row'];
export type Invoice = Tables<'invoices'>['Row'];
export type SystemSetting = Tables<'system_settings'>['Row'];
export type AuditLog = Tables<'audit_logs'>['Row'];
export type FileAttachment = Tables<'file_attachments'>['Row'];

// 新規作成用タイプ
export type CompanyInsert = TablesInsert<'companies'>;
export type UserProfileInsert = TablesInsert<'user_profiles'>;
export type CustomerInsert = TablesInsert<'customers'>;
export type PriceMasterInsert = TablesInsert<'price_master'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type ProcessScheduleInsert = TablesInsert<'process_schedules'>;
export type ProcessTaskInsert = TablesInsert<'process_tasks'>;
export type EstimateInsert = TablesInsert<'estimates'>;
export type EstimateItemInsert = TablesInsert<'estimate_items'>;
export type InvoiceInsert = TablesInsert<'invoices'>;

// 更新用タイプ
export type CompanyUpdate = TablesUpdate<'companies'>;
export type UserProfileUpdate = TablesUpdate<'user_profiles'>;
export type CustomerUpdate = TablesUpdate<'customers'>;
export type PriceMasterUpdate = TablesUpdate<'price_master'>;
export type ProjectUpdate = TablesUpdate<'projects'>;
export type ProcessScheduleUpdate = TablesUpdate<'process_schedules'>;
export type ProcessTaskUpdate = TablesUpdate<'process_tasks'>;
export type EstimateUpdate = TablesUpdate<'estimates'>;
export type EstimateItemUpdate = TablesUpdate<'estimate_items'>;
export type InvoiceUpdate = TablesUpdate<'invoices'>;

// 拡張型（関連データ含む）
export type ProjectWithCustomer = Project & {
  customers: Customer;
};

export type EstimateWithItems = Estimate & {
  estimate_items: EstimateItem[];
  customers: Customer;
  projects?: Project;
};

export type ProcessScheduleWithTasks = ProcessSchedule & {
  process_tasks: ProcessTask[];
  projects: Project;
};

export type UserProfileWithCompany = UserProfile & {
  companies: Company;
};

// API レスポンス型
export interface ApiResponse<T> {
  data: T;
  error?: string;
  count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// フィルター・ソート型
export interface QueryFilter {
  [key: string]: any;
}

export interface SortOptions {
  column: string;
  ascending: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}