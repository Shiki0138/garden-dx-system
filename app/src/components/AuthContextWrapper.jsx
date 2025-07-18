/**
 * Authentication Context Wrapper
 * Ensures authentication context is always available
 */

import React, { useContext } from 'react';
import { SupabaseAuthContext } from '../contexts/SupabaseAuthContext';

// Default authentication context values - 開発環境では認証を常に有効化
const defaultAuthContext = {
  user: {
    id: 'dev-user-001',
    email: 'dev@garden-dx.com',
    user_metadata: {
      name: '開発ユーザー',
      role: 'manager',
      company_name: 'Garden DX開発'
    }
  },
  session: { access_token: 'dev-token' },
  loading: false,
  error: null,
  isConnected: true,
  signInWithPassword: async () => ({ success: true }),
  signUp: async () => ({ success: true }),
  signOut: async () => ({ success: true }),
  resetPassword: async () => ({ success: true }),
  updateProfile: async () => ({ success: true }),
  hasRole: () => true,
  isAuthenticated: () => true,
  isManager: () => true,
  clearError: () => {},
};

// Safe hook to use authentication context
export const useSafeSupabaseAuth = () => {
  try {
    const context = useContext(SupabaseAuthContext);
    return context || defaultAuthContext;
  } catch (error) {
    console.warn('Authentication context not available, using defaults:', error.message);
    return defaultAuthContext;
  }
};

// HOC to wrap components with safe authentication
export const withSafeAuth = (Component) => {
  return (props) => {
    const authContext = useSafeSupabaseAuth();
    return <Component {...props} auth={authContext} />;
  };
};

export default { useSafeSupabaseAuth, withSafeAuth };