/**
 * Authentication Context Wrapper
 * Ensures authentication context is always available
 */

import React, { useContext } from 'react';
import { SupabaseAuthContext } from '../contexts/SupabaseAuthContext';

// Default authentication context values
const defaultAuthContext = {
  user: null,
  session: null,
  loading: false,
  error: null,
  isConnected: false,
  signInWithPassword: async () => ({ success: false, error: 'Authentication not initialized' }),
  signUp: async () => ({ success: false, error: 'Authentication not initialized' }),
  signOut: async () => ({ success: true }),
  resetPassword: async () => ({ success: false, error: 'Authentication not initialized' }),
  updateProfile: async () => ({ success: false, error: 'Authentication not initialized' }),
  hasRole: () => false,
  isAuthenticated: () => false,
  isManager: () => false,
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