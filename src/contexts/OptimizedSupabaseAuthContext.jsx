/**
 * 最適化されたSupabase認証コンテキスト
 * パフォーマンス最適化版 - セキュリティ処理の高速化
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  supabaseClient,
  isSupabaseConnected,
  handleSupabaseError,
  checkSupabaseConnection,
} from '../lib/supabase';

// パフォーマンス最適化のためのキャッシュ
const AuthCache = {
  userCache: new Map(),
  permissionCache: new Map(),
  sessionCache: null,
  cacheExpiry: 5 * 60 * 1000, // 5分

  set(key, value, type = 'user') {
    const cache = type === 'user' ? this.userCache : this.permissionCache;
    cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  },

  get(key, type = 'user') {
    const cache = type === 'user' ? this.userCache : this.permissionCache;
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.cacheExpiry) {
      cache.delete(key);
      return null;
    }

    return item.value;
  },

  clear() {
    this.userCache.clear();
    this.permissionCache.clear();
    this.sessionCache = null;
  },
};

// 認証コンテキスト作成
const OptimizedSupabaseAuthContext = createContext({});

// 認証フック
export const useOptimizedSupabaseAuth = () => {
  const context = useContext(OptimizedSupabaseAuthContext);
  if (!context) {
    throw new Error(
      'useOptimizedSupabaseAuth must be used within an OptimizedSupabaseAuthProvider'
    );
  }
  return context;
};

// 最適化された認証プロバイダー
export const OptimizedSupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // パフォーマンス監視用ref
  const performanceRef = useRef({
    authStartTime: 0,
    lastTokenRefresh: 0,
    operationCount: 0,
  });

  // 権限階層をメモ化（パフォーマンス最適化）
  const roleHierarchy = useMemo(
    () => ({
      owner: 4,
      admin: 3,
      manager: 2,
      employee: 1,
      viewer: 0,
    }),
    []
  );

  // JWT解析の最適化
  const parseJWTFast = useCallback(token => {
    if (!token) return null;

    try {
      // Base64デコードを最適化
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWT解析エラー:', error);
      return null;
    }
  }, []);

  // セッション検証の最適化
  const validateSessionFast = useCallback(
    session => {
      if (!session?.access_token) return false;

      const payload = parseJWTFast(session.access_token);
      if (!payload) return false;

      // トークン有効期限チェック（5分のバッファー）
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now + 300;
    },
    [parseJWTFast]
  );

  // 高速権限チェック（キャッシュ利用）
  const hasRole = useCallback(
    requiredRole => {
      if (!user || !requiredRole) return false;

      const cacheKey = `${user.id}-${requiredRole}`;
      const cached = AuthCache.get(cacheKey, 'permission');
      if (cached !== null) return cached;

      const userRole = user.user_metadata?.role || 'employee';
      const result = roleHierarchy[userRole] >= (roleHierarchy[requiredRole] || 0);

      AuthCache.set(cacheKey, result, 'permission');
      return result;
    },
    [user, roleHierarchy]
  );

  // 高速認証状態確認（メモ化）
  const isAuthenticated = useMemo(() => {
    return Boolean(user && session && validateSessionFast(session));
  }, [user, session, validateSessionFast]);

  // 高速管理者権限確認（メモ化）
  const isManager = useMemo(() => {
    if (!user) return false;
    const userRole = user.user_metadata?.role || 'employee';
    return roleHierarchy[userRole] >= roleHierarchy.manager;
  }, [user, roleHierarchy]);

  // 最適化されたログイン処理
  const signInWithPassword = useCallback(async (email, password) => {
    const startTime = performance.now();
    performanceRef.current.authStartTime = startTime;

    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConnected()) {
        // 開発モード用高速フォールバック
        const devUser = { id: 'dev-user', email, role: 'manager' };
        setUser(devUser);
        setSession({ user: devUser, access_token: 'dev-token' });
        AuthCache.set(email, devUser);
        return { success: true, message: '開発モードでログイン' };
      }

      // Supabase認証（最適化済み）
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = handleSupabaseError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // ユーザー情報をキャッシュ
      if (data.user) {
        AuthCache.set(data.user.id, data.user);
      }

      performanceRef.current.operationCount++;
      console.log(`認証処理時間: ${performance.now() - startTime}ms`);

      return { success: true, data };
    } catch (err) {
      const errorMessage = 'ログイン中にエラーが発生しました';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // 最適化されたログアウト処理
  const signOut = useCallback(async () => {
    try {
      setLoading(true);

      // キャッシュクリア（高速）
      AuthCache.clear();

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
  }, []);

  // 高速トークンリフレッシュ
  const refreshTokenFast = useCallback(async () => {
    const now = Date.now();

    // 1分以内の重複リフレッシュを防止
    if (now - performanceRef.current.lastTokenRefresh < 60000) {
      return session;
    }

    try {
      const { data, error } = await supabaseClient.auth.refreshSession();

      if (!error && data.session) {
        performanceRef.current.lastTokenRefresh = now;
        setSession(data.session);
        return data.session;
      }

      return null;
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      return null;
    }
  }, [session]);

  // 認証状態の初期化（最適化版）
  useEffect(() => {
    const initAuthOptimized = async () => {
      const startTime = performance.now();

      try {
        // 接続確認（キャッシュ利用）
        const connectionStatus = await checkSupabaseConnection();
        setIsConnected(connectionStatus.connected);

        if (!isSupabaseConnected()) {
          console.log('開発モード: Supabase未接続');
          setLoading(false);
          return;
        }

        // セッション取得（キャッシュ確認）
        if (AuthCache.sessionCache && validateSessionFast(AuthCache.sessionCache)) {
          setSession(AuthCache.sessionCache);
          setUser(AuthCache.sessionCache.user);
          setLoading(false);
          return;
        }

        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('セッション取得エラー:', error);
          setError(handleSupabaseError(error));
        } else if (session) {
          AuthCache.sessionCache = session;
          setSession(session);
          setUser(session.user);
        }

        console.log(`認証初期化時間: ${performance.now() - startTime}ms`);
      } catch (err) {
        console.error('認証初期化エラー:', err);
        setError('認証システムの初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initAuthOptimized();
  }, [validateSessionFast]);

  // 認証状態監視（最適化版）
  useEffect(() => {
    if (!isSupabaseConnected()) return;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更:', event);

      // セッションキャッシュ更新
      AuthCache.sessionCache = session;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // イベント別最適化処理
      switch (event) {
        case 'SIGNED_IN':
          setError(null);
          if (session?.user) {
            AuthCache.set(session.user.id, session.user);
          }
          break;
        case 'SIGNED_OUT':
          setError(null);
          AuthCache.clear();
          break;
        case 'TOKEN_REFRESHED':
          performanceRef.current.lastTokenRefresh = Date.now();
          break;
        default:
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // パフォーマンス統計取得
  const getPerformanceStats = useCallback(
    () => ({
      operationCount: performanceRef.current.operationCount,
      lastAuthTime: performanceRef.current.authStartTime,
      lastTokenRefresh: performanceRef.current.lastTokenRefresh,
      cacheSize: {
        users: AuthCache.userCache.size,
        permissions: AuthCache.permissionCache.size,
      },
    }),
    []
  );

  // コンテキスト値（メモ化でパフォーマンス最適化）
  const value = useMemo(
    () => ({
      // 状態
      user,
      session,
      loading,
      error,
      isConnected,

      // 認証メソッド（最適化済み）
      signInWithPassword,
      signOut,
      refreshTokenFast,

      // ユーティリティ（高速版）
      hasRole,
      isAuthenticated,
      isManager,
      validateSessionFast,

      // パフォーマンス監視
      getPerformanceStats,

      // エラークリア
      clearError: () => setError(null),
    }),
    [
      user,
      session,
      loading,
      error,
      isConnected,
      signInWithPassword,
      signOut,
      refreshTokenFast,
      hasRole,
      isAuthenticated,
      isManager,
      validateSessionFast,
      getPerformanceStats,
    ]
  );

  return (
    <OptimizedSupabaseAuthContext.Provider value={value}>
      {children}
    </OptimizedSupabaseAuthContext.Provider>
  );
};

export default OptimizedSupabaseAuthProvider;
