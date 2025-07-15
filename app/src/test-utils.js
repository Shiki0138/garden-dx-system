import React from 'react';
import { render } from '@testing-library/react';

// モックAuth Context を作成
const AuthContext = React.createContext();

// モックAuth Provider
const MockAuthProvider = ({ children }) => {
  const mockAuthValue = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'manager',
      user_metadata: {
        role: 'manager',
      },
    },
    isAuthenticated: true,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  };

  return <AuthContext.Provider value={mockAuthValue}>{children}</AuthContext.Provider>;
};

// カスタムrender関数
const customRender = (ui, options) => render(ui, { wrapper: MockAuthProvider, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
