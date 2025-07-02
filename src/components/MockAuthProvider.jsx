/**
 * Garden 造園業向け統合業務管理システム
 * テスト用AuthProviderモック
 * 開発・テスト環境での認証機能モック実装
 */

import React, { createContext, useContext } from 'react';

// テスト用AuthContext
const MockAuthContext = createContext(null);

// テスト用useAuth Hook
export const useMockAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
};

// テスト用AuthProvider
export const MockAuthProvider = ({ children }) => {
  // テスト用のダミーユーザー情報
  const mockUser = {
    id: 1,
    username: 'test_user',
    email: 'test@garden-dx.com',
    company_id: 1,
    role: 'owner',
    full_name: 'テストユーザー',
    is_active: true
  };

  // テスト用の認証状態
  const mockAuthState = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null
  };

  // テスト用の認証メソッド
  const mockAuthMethods = {
    login: async (credentials) => {
      console.log('Mock login:', credentials);
      return { success: true, user: mockUser };
    },
    logout: async () => {
      console.log('Mock logout');
      return { success: true };
    },
    register: async (userData) => {
      console.log('Mock register:', userData);
      return { success: true, user: mockUser };
    },
    refreshToken: async () => {
      console.log('Mock refresh token');
      return { success: true };
    },
    updateUser: async (updates) => {
      console.log('Mock update user:', updates);
      return { success: true, user: { ...mockUser, ...updates } };
    }
  };

  // 完全なAuthコンテキスト値
  const authContextValue = {
    ...mockAuthState,
    ...mockAuthMethods
  };

  return (
    <MockAuthContext.Provider value={authContextValue}>
      {children}
    </MockAuthContext.Provider>
  );
};

export default MockAuthProvider;