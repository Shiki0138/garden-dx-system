/**
 * Supabaseクライアント設定
 * 造園業DXシステム用データベース・認証統合
 */

import { createClient } from '@supabase/supabase-js';

// 環境変数から設定値を取得
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// 設定値の検証
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。ローカル開発モードで動作します。');
}

// Supabaseクライアント設定オプション
const supabaseOptions = {
  auth: {
    // 認証設定
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // セッション保存設定
    storage: window.localStorage,
    storageKey: 'garden-dx-auth-token',
    // セキュリティ設定
    flowType: 'pkce'
  },
  realtime: {
    // リアルタイム機能設定
    params: {
      eventsPerSecond: 10
    }
  },
  // API設定
  global: {
    headers: {
      'x-client-info': 'garden-dx-system/1.0.0',
      'x-app-name': 'garden-landscaping-dx'
    }
  }
};

// Supabaseクライアント作成
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)
  : null;

// 開発用フォールバック関数
const createMockSupabase = () => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: new Error('開発モード') }),
    signUp: async () => ({ data: null, error: new Error('開発モード') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: null } })
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: new Error('開発モード') }),
    update: () => ({ data: null, error: new Error('開発モード') }),
    delete: () => ({ data: null, error: new Error('開発モード') })
  })
});

// エクスポート用クライアント（フォールバック対応）
export const supabaseClient = supabase || createMockSupabase();

// ヘルパー関数
export const isSupabaseConnected = () => {
  return supabase !== null;
};

// データベーステーブル名定数
export const TABLES = {
  COMPANIES: 'companies',
  USERS: 'users',
  ESTIMATES: 'estimates',
  ESTIMATE_ITEMS: 'estimate_items',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  PROJECTS: 'projects',
  PROJECT_TASKS: 'project_tasks',
  CUSTOMERS: 'customers',
  UNIT_PRICES: 'unit_prices',
  CATEGORIES: 'categories'
};

// RLS（Row Level Security）ヘルパー
export const withRLS = (query, userId = null) => {
  if (userId) {
    return query.eq('user_id', userId);
  }
  return query;
};

// エラーハンドリングヘルパー
export const handleSupabaseError = (error) => {
  if (!error) return null;
  
  console.error('Supabaseエラー:', error);
  
  // エラータイプ別メッセージ
  const errorMessages = {
    'Invalid login credentials': 'ログイン情報が正しくありません',
    'User already registered': 'このメールアドレスは既に登録済みです',
    'Email not confirmed': 'メールアドレスの確認が完了していません',
    'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください'
  };
  
  return errorMessages[error.message] || 'エラーが発生しました。しばらくしてから再度お試しください。';
};

// 接続状態の確認
export const checkSupabaseConnection = async () => {
  if (!supabase) {
    return { connected: false, message: '開発モード（Supabase未接続）' };
  }
  
  try {
    const { data, error } = await supabase.auth.getSession();
    return { 
      connected: true, 
      message: 'Supabase接続成功',
      session: data.session 
    };
  } catch (error) {
    return { 
      connected: false, 
      message: `Supabase接続エラー: ${error.message}` 
    };
  }
};

export default supabaseClient;