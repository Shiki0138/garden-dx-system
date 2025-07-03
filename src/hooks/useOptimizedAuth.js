/**
 * 最適化された認証フック
 * パフォーマンス最適化・セキュリティオーバーヘッド削減
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOptimizedSupabaseAuth } from '../contexts/OptimizedSupabaseAuthContext';
import { checkPermissionFast, checkMultiplePermissions } from '../utils/rbacOptimizer';
import { validateSessionFast, checkRateLimit } from '../utils/securityOptimizer';

/**
 * 最適化された認証フック
 */
export const useOptimizedAuth = () => {
  const auth = useOptimizedSupabaseAuth();
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    permissions: {},
    error: null
  });
  
  // パフォーマンス追跡
  const performanceRef = useRef({
    lastAuthCheck: 0,
    operationCount: 0
  });

  // 認証状態更新（最適化版）
  const updateAuthState = useCallback((updates) => {
    setAuthState(prev => ({ ...prev, ...updates }));
    performanceRef.current.lastAuthCheck = Date.now();
  }, []);

  // 基本認証情報（メモ化）
  const authInfo = useMemo(() => ({
    isAuthenticated: Boolean(auth.user && auth.session && validateSessionFast(auth.session)),
    user: auth.user,
    loading: auth.loading,
    error: auth.error
  }), [auth.user, auth.session, auth.loading, auth.error]);

  // ユーザーロール（メモ化）
  const userRole = useMemo(() => {
    return auth.user?.user_metadata?.role || auth.user?.role || 'viewer';
  }, [auth.user]);

  // 会社ID（メモ化）
  const companyId = useMemo(() => {
    return auth.user?.user_metadata?.company_id || auth.user?.company_id;
  }, [auth.user]);

  // 高速権限チェック
  const hasPermission = useCallback((resource, action) => {
    if (!authInfo.isAuthenticated || !authInfo.user) return false;
    
    performanceRef.current.operationCount++;
    return checkPermissionFast(authInfo.user, resource, action);
  }, [authInfo.isAuthenticated, authInfo.user]);

  // 複数権限一括チェック
  const hasPermissions = useCallback((permissionsList) => {
    if (!authInfo.isAuthenticated || !authInfo.user) return {};
    
    return checkMultiplePermissions(authInfo.user, permissionsList);
  }, [authInfo.isAuthenticated, authInfo.user]);

  // 役割レベルチェック
  const hasMinRole = useCallback((requiredRole) => {
    const roleHierarchy = {
      owner: 5, admin: 4, manager: 3, employee: 2, viewer: 1
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }, [userRole]);

  // リソース所有権チェック
  const canAccessResource = useCallback((resource) => {
    if (!authInfo.isAuthenticated || !resource) return false;
    
    // 会社レベルのアクセス制御
    return resource.company_id === companyId;
  }, [authInfo.isAuthenticated, companyId]);

  // レート制限チェック
  const checkUserRateLimit = useCallback(() => {
    if (!authInfo.user) return { allowed: false, remaining: 0 };
    
    return checkRateLimit(authInfo.user.id);
  }, [authInfo.user]);

  // 最適化されたログイン
  const signIn = useCallback(async (email, password) => {
    const startTime = performance.now();
    
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const result = await auth.signInWithPassword(email, password);
      
      if (result.success) {
        updateAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: result.data?.user || auth.user
        });
      } else {
        updateAuthState({
          isLoading: false,
          error: result.error
        });
      }
      
      console.log(`ログイン処理時間: ${performance.now() - startTime}ms`);
      return result;
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: 'ログイン中にエラーが発生しました'
      });
      return { success: false, error: error.message };
    }
  }, [auth, updateAuthState]);

  // 最適化されたログアウト
  const signOut = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true });
      
      const result = await auth.signOut();
      
      updateAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        permissions: {},
        error: null
      });
      
      return result;
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: 'ログアウト中にエラーが発生しました'
      });
      return { success: false, error: error.message };
    }
  }, [auth, updateAuthState]);

  // トークンリフレッシュ
  const refreshToken = useCallback(async () => {
    if (!auth.refreshTokenFast) return null;
    
    try {
      const newSession = await auth.refreshTokenFast();
      
      if (newSession) {
        updateAuthState({
          user: newSession.user,
          isAuthenticated: validateSessionFast(newSession)
        });
      }
      
      return newSession;
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      return null;
    }
  }, [auth, updateAuthState]);

  // セッション監視
  useEffect(() => {
    updateAuthState({
      isLoading: auth.loading,
      isAuthenticated: authInfo.isAuthenticated,
      user: auth.user,
      error: auth.error
    });
  }, [auth.loading, auth.user, auth.error, authInfo.isAuthenticated, updateAuthState]);

  // パフォーマンス統計
  const getPerformanceStats = useCallback(() => ({
    ...performanceRef.current,
    authStats: auth.getPerformanceStats?.() || {}
  }), [auth]);

  return {
    // 基本認証情報
    ...authInfo,
    userRole,
    companyId,
    
    // 認証メソッド（最適化済み）
    signIn,
    signOut,
    refreshToken,
    
    // 権限チェック（高速）
    hasPermission,
    hasPermissions,
    hasMinRole,
    canAccessResource,
    
    // セキュリティ
    checkUserRateLimit,
    
    // ユーティリティ
    getPerformanceStats,
    clearError: auth.clearError
  };
};

/**
 * 権限ベースコンポーネント表示フック
 */
export const usePermissionGate = (requiredPermissions = []) => {
  const { hasPermissions, isAuthenticated } = useOptimizedAuth();
  
  const permissions = useMemo(() => {
    if (!isAuthenticated) return {};
    return hasPermissions(requiredPermissions);
  }, [hasPermissions, isAuthenticated, requiredPermissions]);
  
  const canRender = useMemo(() => {
    if (!isAuthenticated) return false;
    return Object.values(permissions).every(Boolean);
  }, [isAuthenticated, permissions]);
  
  return { canRender, permissions };
};

/**
 * 認証ガードフック
 */
export const useAuthGuard = (options = {}) => {
  const { 
    requireAuth = true, 
    requiredRole = null, 
    requiredPermissions = [],
    redirectTo = '/login' 
  } = options;
  
  const { 
    isAuthenticated, 
    isLoading, 
    hasMinRole, 
    hasPermissions 
  } = useOptimizedAuth();
  
  const guardResult = useMemo(() => {
    if (isLoading) {
      return { allowed: false, loading: true };
    }
    
    if (requireAuth && !isAuthenticated) {
      return { allowed: false, reason: 'not_authenticated', redirectTo };
    }
    
    if (requiredRole && !hasMinRole(requiredRole)) {
      return { allowed: false, reason: 'insufficient_role' };
    }
    
    if (requiredPermissions.length > 0) {
      const permissions = hasPermissions(requiredPermissions);
      const hasAllPermissions = Object.values(permissions).every(Boolean);
      
      if (!hasAllPermissions) {
        return { allowed: false, reason: 'insufficient_permissions' };
      }
    }
    
    return { allowed: true };
  }, [
    isLoading, 
    requireAuth, 
    isAuthenticated, 
    requiredRole, 
    hasMinRole, 
    requiredPermissions, 
    hasPermissions, 
    redirectTo
  ]);
  
  return guardResult;
};

/**
 * セッション監視フック
 */
export const useSessionMonitor = (options = {}) => {
  const { 
    autoRefresh = true, 
    refreshThreshold = 5 * 60 * 1000, // 5分前
    onSessionExpired = null 
  } = options;
  
  const { user, refreshToken } = useOptimizedAuth();
  const [sessionStatus, setSessionStatus] = useState('unknown');
  
  useEffect(() => {
    if (!user) {
      setSessionStatus('none');
      return;
    }
    
    const checkSession = async () => {
      // セッション有効性チェック
      const session = user.session || {};
      const isValid = validateSessionFast(session);
      
      if (!isValid) {
        setSessionStatus('expired');
        onSessionExpired?.();
        return;
      }
      
      setSessionStatus('valid');
      
      // 自動リフレッシュ
      if (autoRefresh) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (expiresAt - now < refreshThreshold) {
          await refreshToken();
        }
      }
    };
    
    checkSession();
    const interval = setInterval(checkSession, 60000); // 1分ごと
    
    return () => clearInterval(interval);
  }, [user, refreshToken, autoRefresh, refreshThreshold, onSessionExpired]);
  
  return { sessionStatus };
};

export default useOptimizedAuth;