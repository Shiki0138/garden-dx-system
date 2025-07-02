/**
 * Supabase Client Configuration - エラーハンドリング対応版
 * IPv6対応・環境変数チェック・デプロイエラー防止対応
 * 
 * Created by: worker2 (Deployment Error Prevention)
 * Date: 2025-07-01
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

// ============================================================
// 1. 環境変数チェック（デプロイエラー防止）
// ============================================================

// 環境変数の存在と形式をチェック
const validateEnvironmentVariables = () => {
  const errors: string[] = [];
  
  // Supabase URL チェック
  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not set');
  } else {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      errors.push('VITE_SUPABASE_URL format is invalid');
    }
  }
  
  // Supabase Anon Key チェック
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is not set');
  } else {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey.length < 100) {
      errors.push('VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
    }
  }
  
  return errors;
};

// ============================================================
// 2. Supavisor URL設定（IPv6対応）
// ============================================================

const getSupabaseConfig = () => {
  const errors = validateEnvironmentVariables();
  
  if (errors.length > 0) {
    const errorMessage = `Supabase configuration errors:\n${errors.join('\n')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
  
  // IPv6対応のSupavisor URL使用
  // 2024年1月以降、SupabaseはIPv6に移行
  const useSupavisor = import.meta.env.VITE_USE_SUPAVISOR !== 'false'; // デフォルトでtrue
  
  let dbUrl = supabaseUrl;
  if (useSupavisor && import.meta.env.VITE_SUPABASE_POOLER_URL) {
    dbUrl = import.meta.env.VITE_SUPABASE_POOLER_URL;
    console.log('Using Supavisor pooler URL for database connections');
  }
  
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    dbUrl
  };
};

// ============================================================
// 3. Supabaseクライアント作成（エラーハンドリング付き）
// ============================================================

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

const createSupabaseClient = () => {
  try {
    const config = getSupabaseConfig();
    
    const client = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // セッション管理のタイムアウト設定
        session: {
          expiresIn: 3600, // 1時間
        },
      },
      global: {
        headers: {
          'X-Application': 'Garden-DX-System',
          'X-Client-Version': '1.0.0',
        },
      },
      // IPv6対応・接続プール設定
      db: {
        schema: 'public',
      },
      // リアルタイム接続設定
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    console.log('✅ Supabase client initialized successfully');
    return client;
    
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
  }
};

// シングルトンパターンでクライアント作成
const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
};

// ============================================================
// 4. エクスポート（型安全・エラーハンドリング付き）
// ============================================================

export const supabase = getSupabaseClient();
export const auth = supabase.auth;
export const db = supabase;
export const realtime = supabase.realtime;
export const storage = supabase.storage;

// 型定義
export type SupabaseClient = typeof supabase;
export type SupabaseAuth = typeof auth;

// ============================================================
// 5. 接続状態監視・ヘルスチェック
// ============================================================

// 接続ヘルスチェック
export const checkSupabaseHealth = async (): Promise<{
  isHealthy: boolean;
  error?: string;
  latency?: number;
}> => {
  try {
    const startTime = Date.now();
    
    // 簡単なクエリで接続テスト
    const { error } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return {
        isHealthy: false,
        error: error.message,
        latency
      };
    }
    
    return {
      isHealthy: true,
      latency
    };
    
  } catch (error: any) {
    return {
      isHealthy: false,
      error: error.message || 'Unknown connection error'
    };
  }
};

// 接続状態監視
export const monitorConnection = () => {
  if (typeof window === 'undefined') return; // SSR対応
  
  let retryCount = 0;
  const maxRetries = 3;
  
  const checkAndRetry = async () => {
    const health = await checkSupabaseHealth();
    
    if (!health.isHealthy) {
      console.warn(`❌ Supabase connection unhealthy (attempt ${retryCount + 1}/${maxRetries}):`, health.error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkAndRetry, 1000 * retryCount); // 指数バックオフ
      } else {
        console.error('❌ Max retries reached. Supabase connection failed.');
        // 必要に応じてエラーハンドリング（通知表示など）
      }
    } else {
      console.log(`✅ Supabase connection healthy (${health.latency}ms)`);
      retryCount = 0; // リセット
    }
  };
  
  // 初回チェック
  checkAndRetry();
  
  // 定期的なヘルスチェック（5分間隔）
  setInterval(checkAndRetry, 5 * 60 * 1000);
};

// ============================================================
// 6. 現在のユーザー情報取得（エラーハンドリング付き）
// ============================================================

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await auth.getUser();
    
    if (error) {
      console.error('Get user error:', error);
      throw new Error(`認証エラー: ${error.message}`);
    }
    
    return user;
  } catch (error: any) {
    console.error('getCurrentUser failed:', error);
    throw new Error('ユーザー情報の取得に失敗しました');
  }
};

// ユーザープロフィール取得（エラーハンドリング付き）
export const getUserProfile = async (userId?: string) => {
  try {
    const user = userId || (await getCurrentUser())?.id;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        companies (
          company_id,
          company_name,
          company_code,
          subscription_plan
        )
      `)
      .eq('user_id', user)
      .single();

    if (error) {
      console.error('Get user profile error:', error);
      throw new Error(`プロフィール取得エラー: ${error.message}`);
    }
    
    return data;
  } catch (error: any) {
    console.error('getUserProfile failed:', error);
    throw new Error('ユーザープロフィールの取得に失敗しました');
  }
};

// 会社情報取得
export const getCompanyInfo = async () => {
  try {
    const profile = await getUserProfile();
    return profile.companies;
  } catch (error: any) {
    console.error('getCompanyInfo failed:', error);
    throw new Error('会社情報の取得に失敗しました');
  }
};

// ============================================================
// 7. エラーハンドリング・ユーティリティ
// ============================================================

// Supabaseエラーの統一ハンドリング
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase Error Details:', error);
  
  // PostgreSQLエラーコード対応
  if (error.code) {
    switch (error.code) {
      case 'PGRST301':
        return 'データが見つかりません';
      case '23505':
        return '重複するデータが存在します';
      case '42501':
        return 'アクセス権限がありません';
      case '23503':
        return '関連するデータが存在するため削除できません';
      case '08006':
        return 'データベース接続エラーが発生しました';
      case '42P01':
        return 'テーブルが存在しません';
      case '23502':
        return '必須項目が入力されていません';
      default:
        console.warn('Unknown error code:', error.code);
    }
  }
  
  // 認証エラー
  if (error.message?.includes('JWT')) {
    return 'セッションが期限切れです。再ログインしてください';
  }
  
  // ネットワークエラー
  if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
    return 'ネットワーク接続を確認してください';
  }
  
  // 一般的なエラーメッセージ
  if (error.message) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました';
};

// 安全なクエリ実行（エラーハンドリング付き）
export const executeQuery = async <T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  errorMessage?: string
): Promise<T> => {
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  } catch (error) {
    const message = errorMessage || handleSupabaseError(error);
    throw new Error(message);
  }
};

// ============================================================
// 8. その他のユーティリティ関数
// ============================================================

// ページネーション付きクエリ（エラーハンドリング付き）
export const getPaginatedData = async <T>(
  table: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending: boolean }
) => {
  try {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(start, end);

    // フィルター適用
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // ソート適用
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

// リアルタイム購読（エラーハンドリング付き）
export const subscribeToTable = <T>(
  table: string,
  callback: (payload: any) => void,
  filters?: Record<string, any>
) => {
  try {
    let channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table,
          filter: filters ? Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined
        },
        (payload) => {
          try {
            callback(payload);
          } catch (error) {
            console.error('Subscription callback error:', error);
          }
        }
      );

    return channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} changes`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Subscription error for ${table}`);
      }
    });
  } catch (error) {
    console.error('Failed to subscribe to table:', error);
    throw error;
  }
};

// セッション状態監視
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return auth.onAuthStateChange((event, session) => {
    try {
      callback(event, session);
    } catch (error) {
      console.error('Auth state change callback error:', error);
    }
  });
};

// 接続監視を開始
if (typeof window !== 'undefined') {
  monitorConnection();
}

export default supabase;