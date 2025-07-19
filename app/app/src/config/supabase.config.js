/**
 * Supabase設定ファイル
 *
 * このファイルではSupabaseの接続設定を一元管理します。
 * 将来的にプロジェクトを切り分ける際も、このファイルのみを変更すれば対応可能です。
 */

// プロジェクト識別子（将来の切り分け時に使用）
export const PROJECT_ID = 'garden-dx';

// テーブル名のプレフィックス（他システムとの共存用）
export const TABLE_PREFIX = 'gdx_';

// Supabase設定
export const SUPABASE_CONFIG = {
  // 環境変数から取得（.env, .env.production で管理）
  url: process.env.REACT_APP_SUPABASE_URL,
  anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,

  // オプション設定
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: `supabase.auth.token-${PROJECT_ID}`,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-project-id': PROJECT_ID,
      },
    },
  },
};

// テーブル名の取得（プレフィックス付き）
export const getTableName = tableName => {
  return `${TABLE_PREFIX}${tableName}`;
};

// テーブル名の定義
export const TABLES = {
  // 会社・ユーザー管理
  COMPANIES: getTableName('companies'),
  USERS: getTableName('users'),
  USER_PROFILES: getTableName('user_profiles'),

  // 見積管理
  ESTIMATES: getTableName('estimates'),
  ESTIMATE_ITEMS: getTableName('estimate_items'),
  ESTIMATE_TEMPLATES: getTableName('estimate_templates'),

  // 工程管理
  PROJECTS: getTableName('projects'),
  PROJECT_SCHEDULES: getTableName('project_schedules'),
  PROJECT_TASKS: getTableName('project_tasks'),

  // 予算管理
  BUDGETS: getTableName('budgets'),
  BUDGET_ITEMS: getTableName('budget_items'),
  ACTUAL_COSTS: getTableName('actual_costs'),

  // 請求管理
  INVOICES: getTableName('invoices'),
  INVOICE_ITEMS: getTableName('invoice_items'),
  PAYMENTS: getTableName('payments'),

  // マスタデータ
  PRICE_MASTER: getTableName('price_master'),
  CATEGORIES: getTableName('categories'),
  UNITS: getTableName('units'),

  // 顧客管理
  CUSTOMERS: getTableName('customers'),
  CUSTOMER_CONTACTS: getTableName('customer_contacts'),

  // その他
  NOTIFICATIONS: getTableName('notifications'),
  ACTIVITY_LOGS: getTableName('activity_logs'),
  FILE_ATTACHMENTS: getTableName('file_attachments'),
};

// ストレージバケット名（プレフィックス付き）
export const STORAGE_BUCKETS = {
  ESTIMATES: `${PROJECT_ID}-estimates`,
  INVOICES: `${PROJECT_ID}-invoices`,
  PROJECTS: `${PROJECT_ID}-projects`,
  ATTACHMENTS: `${PROJECT_ID}-attachments`,
};

// 認証設定
export const AUTH_CONFIG = {
  // ロールベースアクセス制御
  roles: {
    OWNER: 'owner',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
  },

  // 権限
  permissions: {
    VIEW_PROFIT: 'view_profit',
    CREATE_INVOICE: 'create_invoice',
    MANAGE_STAFF: 'manage_staff',
    VIEW_ALL_PROJECTS: 'view_all_projects',
  },

  // セッション設定
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7日間
    refreshThreshold: 60 * 10, // 10分前にリフレッシュ
  },
};

// API設定
export const API_CONFIG = {
  // APIベースURL
  baseUrl: process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_SUPABASE_URL,

  // タイムアウト設定
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT, 10) || 30000,

  // リトライ設定
  retry: {
    count: 3,
    delay: 1000,
  },
};

// デモモード設定
export const DEMO_CONFIG = {
  enabled: process.env.REACT_APP_DEMO_MODE === 'true',
  userPrefix: 'demo_',
  dataPrefix: 'demo_',
};

export default {
  SUPABASE_CONFIG,
  TABLES,
  STORAGE_BUCKETS,
  AUTH_CONFIG,
  API_CONFIG,
  DEMO_CONFIG,
  getTableName,
};
