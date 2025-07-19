/**
 * Supabase認証コンテキスト
 * 造園業DXシステム用認証管理
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  supabaseClient,
  isSupabaseConnected,
  handleSupabaseError,
  checkSupabaseConnection,
} from '../lib/supabase';

// 認証コンテキスト作成
export const SupabaseAuthContext = createContext({});

// 認証フック
export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

// 認証プロバイダーコンポーネント
export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // 認証状態の初期化
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Supabase接続確認
        const connectionStatus = await checkSupabaseConnection();
        setIsConnected(connectionStatus.connected);

        if (!isSupabaseConnected()) {
          console.log('開発モード: Supabase未接続');
          setLoading(false);
          return;
        }

        // セッション取得
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          // console.error('セッション取得エラー:', error);
          setError(handleSupabaseError(error));
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        // console.error('認証初期化エラー:', err);
        setError('認証システムの初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 認証状態の監視
  useEffect(() => {
    if (!isSupabaseConnected()) return;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      // console.log('認証状態変更:', event, session?.user?.email);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // イベント別処理
      switch (event) {
        case 'SIGNED_IN':
          setError(null);
          // console.log('ログイン成功:', session.user.email);
          break;
        case 'SIGNED_OUT':
          setError(null);
          // console.log('ログアウト完了');
          break;
        case 'TOKEN_REFRESHED':
          // console.log('トークン更新完了');
          break;
        case 'USER_UPDATED':
          // console.log('ユーザー情報更新');
          break;
        default:
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ログイン（メール・パスワード）
  const signInWithPassword = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // 本番リリース前はログイン機能を無効化
      if (process.env.REACT_APP_DEMO_MODE === 'true') {
        const errorMessage =
          '現在デモ版のため、ログイン機能は利用できません。「デモ版を体験」ボタンをご利用ください。';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!isSupabaseConnected()) {
        // Supabase接続が必須
        const errorMessage = 'Supabaseが設定されていません。環境変数を確認してください。';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: true, data };
    } catch (err) {
      const errorMessage = 'ログイン中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // サインアップ
  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      setError(null);

      // 本番リリース前はサインアップ機能を無効化
      if (process.env.REACT_APP_DEMO_MODE === 'true') {
        return { success: false, error: '現在デモ版のため、アカウント作成機能は利用できません。' };
      }

      if (!isSupabaseConnected()) {
        return { success: false, error: '開発モードではサインアップできません' };
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: userData.companyName,
            full_name: userData.fullName,
            role: userData.role || 'employee',
          },
        },
      });

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: true, data, message: 'メールアドレスに確認リンクを送信しました' };
    } catch (err) {
      const errorMessage = 'アカウント作成中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ログアウト
  const signOut = async () => {
    try {
      setLoading(true);

      if (!isSupabaseConnected()) {
        setUser(null);
        setSession(null);
        return { success: true };
      }

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = 'ログアウト中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセット
  const resetPassword = async email => {
    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConnected()) {
        return { success: false, error: '開発モードではパスワードリセットできません' };
      }

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: true, message: 'パスワードリセットリンクを送信しました' };
    } catch (err) {
      const errorMessage = 'パスワードリセット中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ユーザープロファイル更新
  const updateProfile = async updates => {
    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConnected()) {
        return { success: false, error: '開発モードではプロファイル更新できません' };
      }

      const { error } = await supabaseClient.auth.updateUser({
        data: updates,
      });

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return { success: true, message: 'プロファイルを更新しました' };
    } catch (err) {
      const errorMessage = 'プロファイル更新中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ユーザー権限チェック
  const hasRole = requiredRole => {
    if (!user) return false;

    const userRole = user.user_metadata?.role || 'employee';

    // 権限階層: admin > manager > employee
    const roleHierarchy = {
      admin: 3,
      manager: 2,
      employee: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  // 認証状態確認
  const isAuthenticated = () => {
    return Boolean(user);
  };

  // 管理者権限確認
  const isManager = () => {
    return hasRole('manager');
  };

  // コンテキスト値
  const value = {
    // 状態
    user,
    session,
    loading,
    error,
    isConnected,

    // 認証メソッド
    signInWithPassword,
    signUp,
    signOut,
    resetPassword,
    updateProfile,

    // ユーティリティ
    hasRole,
    isAuthenticated,
    isManager,

    // エラークリア
    clearError: () => setError(null),
  };

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
};

export default SupabaseAuthProvider;
