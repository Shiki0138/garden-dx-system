/**
 * セキュアな認証フック
 * トークンの暗号化、有効期限管理、セッション管理を提供
 */

import { useState, useEffect, useCallback } from 'react';
import { secureStorage } from '../utils/crypto';
import { csrfProtection, secureLocalStorage } from '../utils/securityUtils';

const SESSION_TIMEOUT = process.env.REACT_APP_SESSION_TIMEOUT 
  ? parseInt(process.env.REACT_APP_SESSION_TIMEOUT, 10) 
  : 1800000; // デフォルト30分

export const useSecureAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // セッション有効期限チェック
  const checkSessionValidity = useCallback(async () => {
    try {
      const storedExpiry = await secureStorage.getItem('sessionExpiry');
      if (storedExpiry && new Date(storedExpiry) < new Date()) {
        // セッション期限切れ
        await logout();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  }, []);

  // 認証状態の復元
  useEffect(() => {
    const restoreAuth = async () => {
      setIsLoading(true);
      try {
        // セッション有効性チェック
        const isValid = await checkSessionValidity();
        if (!isValid) {
          setIsLoading(false);
          return;
        }

        // 暗号化されたユーザー情報を取得
        const encryptedUser = await secureStorage.getItem('authUser');
        const encryptedToken = await secureStorage.getItem('authToken');
        
        if (encryptedUser && encryptedToken) {
          setUser(encryptedUser);
          setIsAuthenticated(true);
          
          // セッション延長
          await extendSession();
        }
      } catch (error) {
        console.error('Auth restoration error:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, [checkSessionValidity]);

  // セッションタイムアウト監視
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = setInterval(async () => {
      const isValid = await checkSessionValidity();
      if (!isValid) {
        alert('セッションがタイムアウトしました。再度ログインしてください。');
      }
    }, 60000); // 1分ごとにチェック

    return () => clearInterval(checkTimeout);
  }, [isAuthenticated, checkSessionValidity]);

  // ユーザーアクティビティ監視（セッション延長）
  useEffect(() => {
    if (!isAuthenticated) return;

    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastActivity = Date.now();

    const handleActivity = async () => {
      const now = Date.now();
      // 最後のアクティビティから5分以上経過していたらセッション延長
      if (now - lastActivity > 300000) {
        await extendSession();
        lastActivity = now;
      }
    };

    activities.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activities.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

  // セッション延長
  const extendSession = async () => {
    const newExpiry = new Date(Date.now() + SESSION_TIMEOUT);
    setSessionExpiry(newExpiry);
    await secureStorage.setItem('sessionExpiry', newExpiry.toISOString());
  };

  // ログイン
  const login = async (userData, token) => {
    try {
      // CSRFトークン生成
      const csrfToken = csrfProtection.generateToken();
      csrfProtection.sessionToken.set(csrfToken);

      // ユーザー情報とトークンを暗号化して保存
      await secureStorage.setItem('authUser', userData);
      await secureStorage.setItem('authToken', token);
      
      // セッション開始
      await extendSession();
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // セキュリティログ
      console.info('User logged in:', userData.email);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      // 暗号化データを削除
      await secureStorage.removeItem('authUser');
      await secureStorage.removeItem('authToken');
      await secureStorage.removeItem('sessionExpiry');
      
      // CSRFトークンクリア
      csrfProtection.sessionToken.clear();
      
      // 機密データクリア
      secureLocalStorage.clearSensitiveData();
      
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiry(null);
      
      console.info('User logged out');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // トークン取得（API呼び出し用）
  const getAuthToken = async () => {
    try {
      const isValid = await checkSessionValidity();
      if (!isValid) {
        throw new Error('Session expired');
      }
      
      return await secureStorage.getItem('authToken');
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  };

  // ユーザー権限チェック
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // ロール確認
  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role === role;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    sessionExpiry,
    login,
    logout,
    getAuthToken,
    hasPermission,
    hasRole,
    extendSession
  };
};

export default useSecureAuth;