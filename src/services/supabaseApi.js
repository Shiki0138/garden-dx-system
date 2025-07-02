/**
 * Supabase API サービス
 * 造園業DXシステム用データベース操作
 */

import { supabaseClient, TABLES, withRLS, handleSupabaseError } from '../lib/supabase';
import { supabaseApiCall, handleErrorResponse } from '../utils/apiErrorHandler';

// =====================================
// 見積関連API
// =====================================

export const estimateApi = {
  // 見積一覧取得
  getEstimates: async (userId = null, filters = {}) => {
    return await supabaseApiCall(
      supabaseClient,
      (client) => {
        let query = client
          .from(TABLES.ESTIMATES)
          .select(`
            *,
            customer:customers(*),
            items:estimate_items(*)
          `)
          .order('created_at', { ascending: false });

        // RLS適用
        if (userId) {
          query = withRLS(query, userId);
        }

        // フィルター適用
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id);
        }
        if (filters.date_from) {
          query = query.gte('estimate_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('estimate_date', filters.date_to);
        }

        return query;
      },
      {
        timeout: 15000,
        mockData: [] // 開発モード用モックデータ
      }
    );
  },

  // 見積詳細取得
  getEstimate: async (id, userId = null) => {
    try {
      let query = supabaseClient
        .from(TABLES.ESTIMATES)
        .select(`
          *,
          customer:customers(*),
          items:estimate_items(*),
          project:projects(*)
        `)
        .eq('id', id)
        .single();

      if (userId) {
        query = withRLS(query, userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // 見積作成
  createEstimate: async (estimateData, userId) => {
    try {
      const { items, ...estimate } = estimateData;

      // 見積基本情報作成
      const { data: estimateResult, error: estimateError } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .insert([{ ...estimate, user_id: userId }])
        .select()
        .single();

      if (estimateError) throw estimateError;

      // 見積明細作成
      if (items && items.length > 0) {
        const estimateItems = items.map(item => ({
          ...item,
          estimate_id: estimateResult.id,
          user_id: userId
        }));

        const { error: itemsError } = await supabaseClient
          .from(TABLES.ESTIMATE_ITEMS)
          .insert(estimateItems);

        if (itemsError) throw itemsError;
      }

      return { data: estimateResult, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // 見積更新
  updateEstimate: async (id, estimateData, userId) => {
    try {
      const { items, ...estimate } = estimateData;

      // 見積基本情報更新
      let query = supabaseClient
        .from(TABLES.ESTIMATES)
        .update(estimate)
        .eq('id', id);

      if (userId) {
        query = withRLS(query, userId);
      }

      const { data: estimateResult, error: estimateError } = await query
        .select()
        .single();

      if (estimateError) throw estimateError;

      // 見積明細更新（既存削除 + 新規作成）
      if (items) {
        // 既存明細削除
        await supabaseClient
          .from(TABLES.ESTIMATE_ITEMS)
          .delete()
          .eq('estimate_id', id);

        // 新規明細作成
        if (items.length > 0) {
          const estimateItems = items.map(item => ({
            ...item,
            estimate_id: id,
            user_id: userId
          }));

          const { error: itemsError } = await supabaseClient
            .from(TABLES.ESTIMATE_ITEMS)
            .insert(estimateItems);

          if (itemsError) throw itemsError;
        }
      }

      return { data: estimateResult, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // 見積削除
  deleteEstimate: async (id, userId) => {
    try {
      let query = supabaseClient
        .from(TABLES.ESTIMATES)
        .delete()
        .eq('id', id);

      if (userId) {
        query = withRLS(query, userId);
      }

      const { error } = await query;

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// 請求書関連API
// =====================================

export const invoiceApi = {
  // 請求書一覧取得
  getInvoices: async (userId = null, filters = {}) => {
    try {
      let query = supabaseClient
        .from(TABLES.INVOICES)
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*),
          estimate:estimates(*)
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = withRLS(query, userId);
      }

      // フィルター適用
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // 請求書作成
  createInvoice: async (invoiceData, userId) => {
    try {
      const { items, ...invoice } = invoiceData;

      // 請求書基本情報作成
      const { data: invoiceResult, error: invoiceError } = await supabaseClient
        .from(TABLES.INVOICES)
        .insert([{ ...invoice, user_id: userId }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 請求書明細作成
      if (items && items.length > 0) {
        const invoiceItems = items.map(item => ({
          ...item,
          invoice_id: invoiceResult.id,
          user_id: userId
        }));

        const { error: itemsError } = await supabaseClient
          .from(TABLES.INVOICE_ITEMS)
          .insert(invoiceItems);

        if (itemsError) throw itemsError;
      }

      return { data: invoiceResult, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// 顧客関連API
// =====================================

export const customerApi = {
  // 顧客一覧取得
  getCustomers: async (userId = null) => {
    try {
      let query = supabaseClient
        .from(TABLES.CUSTOMERS)
        .select('*')
        .order('name');

      if (userId) {
        query = withRLS(query, userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // 顧客作成
  createCustomer: async (customerData, userId) => {
    try {
      const { data, error } = await supabaseClient
        .from(TABLES.CUSTOMERS)
        .insert([{ ...customerData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// 単価マスタ関連API
// =====================================

export const unitPriceApi = {
  // 単価マスタ一覧取得
  getUnitPrices: async (userId = null, categoryId = null) => {
    try {
      let query = supabaseClient
        .from(TABLES.UNIT_PRICES)
        .select(`
          *,
          category:categories(*)
        `)
        .order('category_id', { ascending: true })
        .order('sort_order', { ascending: true });

      if (userId) {
        query = withRLS(query, userId);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // カテゴリ一覧取得
  getCategories: async (userId = null) => {
    try {
      let query = supabaseClient
        .from(TABLES.CATEGORIES)
        .select('*')
        .order('sort_order');

      if (userId) {
        query = withRLS(query, userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// プロジェクト管理関連API
// =====================================

export const projectApi = {
  // プロジェクト一覧取得
  getProjects: async (userId = null) => {
    try {
      let query = supabaseClient
        .from(TABLES.PROJECTS)
        .select(`
          *,
          estimate:estimates(*),
          customer:customers(*),
          tasks:project_tasks(*)
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = withRLS(query, userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  },

  // プロジェクト作成
  createProject: async (projectData, userId) => {
    try {
      const { data, error } = await supabaseClient
        .from(TABLES.PROJECTS)
        .insert([{ ...projectData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// 統計・ダッシュボード関連API
// =====================================

export const dashboardApi = {
  // ダッシュボード統計取得
  getDashboardStats: async (userId = null) => {
    try {
      const promises = [
        estimateApi.getEstimates(userId),
        invoiceApi.getInvoices(userId),
        projectApi.getProjects(userId)
      ];

      const [estimatesResult, invoicesResult, projectsResult] = await Promise.all(promises);

      if (estimatesResult.error || invoicesResult.error || projectsResult.error) {
        throw new Error('統計データの取得に失敗しました');
      }

      const stats = {
        estimates: {
          total: estimatesResult.data?.length || 0,
          pending: estimatesResult.data?.filter(e => e.status === 'pending').length || 0,
          approved: estimatesResult.data?.filter(e => e.status === 'approved').length || 0
        },
        invoices: {
          total: invoicesResult.data?.length || 0,
          unpaid: invoicesResult.data?.filter(i => i.payment_status === 'unpaid').length || 0,
          paid: invoicesResult.data?.filter(i => i.payment_status === 'paid').length || 0
        },
        projects: {
          total: projectsResult.data?.length || 0,
          active: projectsResult.data?.filter(p => p.status === 'active').length || 0,
          completed: projectsResult.data?.filter(p => p.status === 'completed').length || 0
        }
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
  }
};

// =====================================
// ユーティリティ関数
// =====================================

// リアルタイム購読
export const subscribeToTable = (tableName, callback, filters = {}) => {
  if (!supabaseClient) return null;

  const subscription = supabaseClient
    .channel(`public:${tableName}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: tableName,
        ...filters 
      },
      callback
    );

  subscription.subscribe();
  return subscription;
};

// 購読解除
export const unsubscribeFromTable = (subscription) => {
  if (subscription) {
    subscription.unsubscribe();
  }
};

const supabaseApi = {
  estimateApi,
  invoiceApi,
  customerApi,
  unitPriceApi,
  projectApi,
  dashboardApi,
  subscribeToTable,
  unsubscribeFromTable
};

export default supabaseApi;