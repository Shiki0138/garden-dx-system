/**
 * Supabase Client Configuration
 * 造園業務管理システム - Supabase統合
 * 
 * Created by: worker2 (Supabase Auth Integration)
 * Date: 2025-07-01
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

// Supabase環境変数
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase環境変数が設定されていません');
}

// Supabaseクライアント作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // セキュリティ強化
  },
  global: {
    headers: {
      'X-Application': 'Garden-DX-System',
    },
  },
});

// 認証状態管理
export const auth = supabase.auth;

// データベースアクセス用のヘルパー関数
export const db = supabase;

// リアルタイム機能
export const realtime = supabase.realtime;

// ストレージ（ファイルアップロード）
export const storage = supabase.storage;

// 型安全なクエリヘルパー
export type SupabaseClient = typeof supabase;
export type SupabaseAuth = typeof auth;

// 現在のユーザー情報取得
export const getCurrentUser = async () => {
  const { data: { user }, error } = await auth.getUser();
  if (error) throw error;
  return user;
};

// ユーザープロフィール取得
export const getUserProfile = async (userId?: string) => {
  const user = userId || (await getCurrentUser())?.id;
  if (!user) throw new Error('ユーザーが認証されていません');

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

  if (error) throw error;
  return data;
};

// 会社情報取得
export const getCompanyInfo = async () => {
  const profile = await getUserProfile();
  return profile.companies;
};

// エラーハンドリング用のヘルパー
export const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error);
  
  if (error.code === 'PGRST301') {
    return 'データが見つかりません';
  } else if (error.code === '23505') {
    return '重複するデータが存在します';
  } else if (error.code === '42501') {
    return 'アクセス権限がありません';
  } else if (error.message) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました';
};

// クエリ実行ヘルパー（エラーハンドリング付き）
export const executeQuery = async <T>(
  queryFn: () => Promise<{ data: T; error: any }>
): Promise<T> => {
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

// ページネーション付きクエリ
export const getPaginatedData = async <T>(
  table: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending: boolean }
) => {
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
};

// リアルタイム購読ヘルパー
export const subscribeToTable = <T>(
  table: string,
  callback: (payload: any) => void,
  filters?: Record<string, any>
) => {
  let channel = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter: filters ? Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined
      },
      callback
    );

  return channel.subscribe();
};

// セッション状態監視
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return auth.onAuthStateChange(callback);
};

export default supabase;