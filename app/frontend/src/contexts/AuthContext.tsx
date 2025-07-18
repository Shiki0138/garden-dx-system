/**
 * Authentication Context Provider
 * Supabase Auth統合 + RBAC対応
 * 
 * Created by: worker2 (Supabase Auth Integration)
 * Date: 2025-07-01
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '../services/supabaseClient';
import type { UserProfile, Company } from '../types/supabase.types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isOwner: boolean;
  isManager: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期認証状態確認
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('認証の初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
          
          // ログイン時刻更新
          if (event === 'SIGNED_IN') {
            await updateLastLogin(session.user.id);
          }
        } else {
          setProfile(null);
          setCompany(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ユーザープロフィールと会社情報の読み込み
  const loadUserProfile = async (userId: string) => {
    try {
      const profileData = await getUserProfile(userId);
      setProfile(profileData);
      setCompany(profileData.companies);
    } catch (error) {
      console.error('Profile load error:', error);
      setError('ユーザー情報の取得に失敗しました');
    }
  };

  // 最終ログイン時刻更新
  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Last login update error:', error);
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'ログインに失敗しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Supabase Authでユーザー作成
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // ユーザープロフィール作成
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            company_id: userData.company_id,
            role: userData.role || 'employee',
            full_name: userData.full_name,
            position: userData.position,
            phone: userData.phone,
            permissions: userData.permissions || {
              view_estimates: true,
              create_estimates: false,
              view_financial: false,
            },
          });

        if (profileError) throw profileError;
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message || 'アカウント作成に失敗しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setCompany(null);
      setSession(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'ログアウトに失敗しました');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string) => {
    try {
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'パスワードリセットに失敗しました');
      throw error;
    }
  };

  // プロフィール更新
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('ユーザーがログインしていません');

    try {
      setError(null);

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // ローカル状態を更新
      if (profile) {
        setProfile({ ...profile, ...updates });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setError(error.message || 'プロフィール更新に失敗しました');
      throw error;
    }
  };

  // 役割チェック
  const hasRole = (requiredRole: string): boolean => {
    if (!profile) return false;
    
    const roleHierarchy = {
      viewer: 0,
      employee: 1,
      manager: 2,
      owner: 3,
    };

    const userRoleLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  // 権限チェック
  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    
    // オーナーとマネージャーは全権限を持つ
    if (profile.role === 'owner' || profile.role === 'manager') {
      return true;
    }

    // 個別権限をチェック
    return profile.permissions?.[permission] === true;
  };

  // 便利な役割チェック
  const isOwner = hasRole('owner');
  const isManager = hasRole('manager');

  const value: AuthContextType = {
    user,
    profile,
    company,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    hasRole,
    hasPermission,
    isOwner,
    isManager,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC: 認証が必要なコンポーネントを保護
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { user, loading } = useAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return <div>Please sign in to access this page.</div>;
    }

    return <Component {...props} />;
  };
};

// HOC: 特定の役割が必要なコンポーネントを保護
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string
) => {
  return (props: P) => {
    const { hasRole, loading } = useAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!hasRole(requiredRole)) {
      return <div>Access denied. Required role: {requiredRole}</div>;
    }

    return <Component {...props} />;
  };
};

// HOC: 特定の権限が必要なコンポーネントを保護
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) => {
  return (props: P) => {
    const { hasPermission, loading } = useAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!hasPermission(requiredPermission)) {
      return <div>Access denied. Required permission: {requiredPermission}</div>;
    }

    return <Component {...props} />;
  };
};

export default AuthContext;