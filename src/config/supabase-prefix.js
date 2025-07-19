/**
 * Garden DX - Supabaseテーブルプレフィックス設定
 * 複数システムが同一Supabaseプロジェクトに共存するための設定
 */

// Garden DX専用のテーブルプレフィックス
export const TABLE_PREFIX = 'garden_dx_';

// テーブル名定義
export const TABLES = {
  // 認証・ユーザー管理
  users: `${TABLE_PREFIX}users`,
  companies: `${TABLE_PREFIX}companies`,
  roles: `${TABLE_PREFIX}roles`,
  permissions: `${TABLE_PREFIX}permissions`,
  
  // 見積もり関連
  estimates: `${TABLE_PREFIX}estimates`,
  estimate_items: `${TABLE_PREFIX}estimate_items`,
  estimate_templates: `${TABLE_PREFIX}estimate_templates`,
  additional_estimates: `${TABLE_PREFIX}additional_estimates`,
  
  // 請求書関連
  invoices: `${TABLE_PREFIX}invoices`,
  invoice_items: `${TABLE_PREFIX}invoice_items`,
  
  // プロジェクト管理
  projects: `${TABLE_PREFIX}projects`,
  project_tasks: `${TABLE_PREFIX}project_tasks`,
  project_schedules: `${TABLE_PREFIX}project_schedules`,
  
  // 作業報告
  work_reports: `${TABLE_PREFIX}work_reports`,
  work_photos: `${TABLE_PREFIX}work_photos`,
  daily_reports: `${TABLE_PREFIX}daily_reports`,
  
  // マスタデータ
  price_master: `${TABLE_PREFIX}price_master`,
  categories: `${TABLE_PREFIX}categories`,
  units: `${TABLE_PREFIX}units`,
  
  // 設定
  settings: `${TABLE_PREFIX}settings`,
  company_settings: `${TABLE_PREFIX}company_settings`,
};

/**
 * ビュー名定義（将来的な拡張用）
 */
export const VIEWS = {
  active_estimates: `${TABLE_PREFIX}v_active_estimates`,
  user_permissions: `${TABLE_PREFIX}v_user_permissions`,
  project_summary: `${TABLE_PREFIX}v_project_summary`,
};

/**
 * ファンクション名定義
 */
export const FUNCTIONS = {
  get_user_permissions: `${TABLE_PREFIX}fn_get_user_permissions`,
  calculate_estimate_total: `${TABLE_PREFIX}fn_calculate_estimate_total`,
  generate_invoice_number: `${TABLE_PREFIX}fn_generate_invoice_number`,
};

/**
 * RLSポリシー名定義
 */
export const POLICIES = {
  users_select: `${TABLE_PREFIX}policy_users_select`,
  estimates_crud: `${TABLE_PREFIX}policy_estimates_crud`,
  employee_restrictions: `${TABLE_PREFIX}policy_employee_restrictions`,
};

/**
 * ストレージバケット名定義
 */
export const STORAGE_BUCKETS = {
  estimates: `${TABLE_PREFIX}estimates`,
  invoices: `${TABLE_PREFIX}invoices`,
  work_photos: `${TABLE_PREFIX}work_photos`,
  company_logos: `${TABLE_PREFIX}company_logos`,
};

/**
 * 実際のテーブル名を取得（互換性のため）
 */
export function getTableName(tableName) {
  return TABLES[tableName] || `${TABLE_PREFIX}${tableName}`;
}

/**
 * プレフィックスを除去してテーブル名を取得
 */
export function removePrefix(fullTableName) {
  if (fullTableName.startsWith(TABLE_PREFIX)) {
    return fullTableName.substring(TABLE_PREFIX.length);
  }
  return fullTableName;
}

export default {
  TABLE_PREFIX,
  TABLES,
  VIEWS,
  FUNCTIONS,
  POLICIES,
  STORAGE_BUCKETS,
  getTableName,
  removePrefix,
};