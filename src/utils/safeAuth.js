/**
 * 安全な認証フック
 * 認証コンテキストが存在しない場合でもエラーを発生させない
 */

import { useContext } from 'react';
import { SupabaseAuthContext } from '../contexts/SupabaseAuthContext';

// デフォルトの認証状態
const defaultAuthState = {
  user: null,
  session: null,
  loading: false,
  error: null,
  isConnected: false,
  isAuthenticated: () => false,
  signIn: async () => ({ user: null, session: null, error: new Error('Auth not initialized') }),
  signOut: async () => ({ error: new Error('Auth not initialized') }),
  signUp: async () => ({ user: null, session: null, error: new Error('Auth not initialized') }),
  checkRole: () => false,
  hasPermission: () => false,
};

// 安全な認証フック
export const useSafeAuth = () => {
  try {
    const context = useContext(SupabaseAuthContext);
    if (!context) {
      console.warn('認証コンテキストが利用できません。デフォルト状態を使用します。');
      return defaultAuthState;
    }
    return context;
  } catch (error) {
    console.warn('認証コンテキストのアクセスエラー:', error);
    return defaultAuthState;
  }
};

// Supabase認証コンテキストのエクスポート
export { SupabaseAuthContext };