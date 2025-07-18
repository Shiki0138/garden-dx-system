/**
 * Supabaseクライアント設定
 * 造園業DXシステム用データベース・認証統合
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, PROJECT_ID } from '../config/supabase.config';

// 環境変数から設定値を取得
<<<<<<< HEAD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
=======
const supabaseUrl = SUPABASE_CONFIG.url || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey || process.env.REACT_APP_SUPABASE_ANON_KEY;
>>>>>>> ba63ce0682cec08ed47488a144ebc219343e1074

// 環境変数デバッグ出力（開発環境のみ）
// if (process.env.REACT_APP_ENVIRONMENT === 'development') {
//   console.log('Supabase Environment Check:', {
//     url: supabaseUrl ? 'Set' : 'Missing',
//     key: supabaseAnonKey ? 'Set' : 'Missing',
//     env: process.env.REACT_APP_ENVIRONMENT,
//     allEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
//   });
// }

// 設定値の検証
// if (!supabaseUrl || !supabaseAnonKey) {
//   console.warn('⚠️ Supabase環境変数が設定されていません。');
//   console.warn('必要な環境変数: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY');
//   console.warn('開発モードで動作します。');
// }

// Supabaseクライアント設定オプション
const supabaseOptions = {
  auth: {
    // 認証設定
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // セッション保存設定
    storage: window.localStorage,
    storageKey: `${PROJECT_ID}-auth-token`,
    // セキュリティ設定
    flowType: 'pkce',
  },
  realtime: {
    // リアルタイム機能設定
    params: {
      eventsPerSecond: 10,
    },
  },
  // API設定
  global: {
    headers: {
      'x-client-info': 'garden-dx-system/1.0.0',
      'x-app-name': 'garden-landscaping-dx',
    },
  },
};

// Supabaseクライアント作成（エラーハンドリング強化）
export const supabase = (() => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      // console.warn('⚠️ Supabase credentials missing');
      return null;
    }

    // URL検証
    if (!supabaseUrl.startsWith('https://')) {
      // console.error('❌ Invalid Supabase URL format:', supabaseUrl);
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);
  } catch (error) {
    // console.error('❌ Failed to create Supabase client:', error);
    return null;
  }
})();

// 開発・デモ用フォールバック関数
const createMockSupabase = () => {
  const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
  const modeText = isDemoMode ? 'デモモード' : '開発モード';

  return {
    auth: {
      signInWithPassword: async () => ({
        data: isDemoMode
          ? {
              user: {
                id: 'demo-user-001',
                email: 'demo@garden-dx.com',
                user_metadata: { role: 'manager' },
              },
            }
          : null,
        error: isDemoMode ? null : new Error(modeText),
      }),
      signUp: async () => ({ data: null, error: new Error(modeText) }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({
        data: {
          session: isDemoMode
            ? {
                user: {
                  id: 'demo-user-001',
                  email: 'demo@garden-dx.com',
                },
              }
            : null,
        },
        error: null,
      }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
    },
    from: () => ({
      select: () => ({
        data: isDemoMode ? [] : [],
        error: isDemoMode ? null : new Error(modeText),
      }),
      insert: () => ({
        data: isDemoMode ? { id: 'demo-id' } : null,
        error: isDemoMode ? null : new Error(modeText),
      }),
      update: () => ({
        data: isDemoMode ? { id: 'demo-id' } : null,
        error: isDemoMode ? null : new Error(modeText),
      }),
      delete: () => ({
        data: isDemoMode ? { id: 'demo-id' } : null,
        error: isDemoMode ? null : new Error(modeText),
      }),
    }),
  };
};

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
  CATEGORIES: 'categories',
};

// RLS（Row Level Security）ヘルパー
export const withRLS = (query, userId = null) => {
  if (userId) {
    return query.eq('user_id', userId);
  }
  return query;
};

// エラーハンドリングヘルパー
export const handleSupabaseError = error => {
  if (!error) return null;

  console.error('Supabaseエラー:', error);

  // エラータイプ別メッセージ
  const errorMessages = {
    'Invalid login credentials': 'ログイン情報が正しくありません',
    'User already registered': 'このメールアドレスは既に登録済みです',
    'Email not confirmed': 'メールアドレスの確認が完了していません',
    'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
  };

  return (
    errorMessages[error.message] || 'エラーが発生しました。しばらくしてから再度お試しください。'
  );
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
      session: data.session,
    };
  } catch (error) {
    return {
      connected: false,
      message: `Supabase接続エラー: ${error.message}`,
    };
  }
};

export default supabaseClient;
