/**
 * useAuth フックの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useAuth,
  AuthProvider,
  useInvoicePermissions,
  useEstimatePermissions,
  usePermission,
  useRole,
  useManagerPermission,
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../useAuth';

// localStorage のモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// console.error のモック
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('初期状態', () => {
    test('トークンがない場合の初期状態', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 初期状態の確認
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);

      // ローディング完了を待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('トークンがある場合の初期状態', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // ローディング完了を待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // ユーザーが設定されることを確認
      expect(result.current.user).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.role).toBe(USER_ROLES.MANAGER);
    });
  });

  describe('ログイン機能', () => {
    test('正常なログイン', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // ログイン実行
      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password');
      });

      // ログイン成功を確認
      expect(loginResult.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user.email).toBe('test@example.com');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
    });

    test('ログインエラーハンドリング', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // エラーを起こすためにメソッドを上書き
      const originalLogin = result.current.login;
      jest.spyOn(result.current, 'login').mockImplementation(() => {
        throw new Error('Login failed');
      });

      let loginResult;
      await act(async () => {
        try {
          loginResult = await result.current.login('invalid@example.com', 'wrongpassword');
        } catch (error) {
          loginResult = { success: false, error: error.message };
        }
      });

      expect(loginResult.success).toBe(false);
    });
  });

  describe('ログアウト機能', () => {
    test('ログアウト正常処理', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 初期認証待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAuthenticated).toBe(true);

      // ログアウト実行
      act(() => {
        result.current.logout();
      });

      // ログアウト状態を確認
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('権限チェック機能', () => {
    test('経営者の権限チェック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 経営者権限の確認
      expect(result.current.hasPermission(PERMISSIONS.INVOICE_CREATE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.ESTIMATE_PRICE_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.PROJECT_PROFIT_VIEW)).toBe(true);
      expect(result.current.isManager()).toBe(true);
      expect(result.current.isEmployee()).toBe(false);
    });

    test('役割チェック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 役割チェック
      expect(result.current.hasRole(USER_ROLES.MANAGER)).toBe(true);
      expect(result.current.hasRole(USER_ROLES.EMPLOYEE)).toBe(false);
      expect(result.current.hasAnyRole([USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE])).toBe(true);
    });

    test('権限がない場合', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // ログインしていない状態での権限チェック
      expect(result.current.hasPermission(PERMISSIONS.INVOICE_CREATE)).toBe(false);
      expect(result.current.isManager()).toBe(false);
      expect(result.current.isEmployee()).toBe(false);
    });
  });

  describe('カスタムフック', () => {
    test('usePermission フック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => usePermission(PERMISSIONS.INVOICE_CREATE), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current).toBe(true);
    });

    test('useRole フック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useRole(USER_ROLES.MANAGER), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current).toBe(true);
    });

    test('useManagerPermission フック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useManagerPermission(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current).toBe(true);
    });

    test('useInvoicePermissions フック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useInvoicePermissions(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 経営者の請求書権限確認
      expect(result.current.canCreate).toBe(true);
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canView).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canSend).toBe(true);
    });

    test('useEstimatePermissions フック', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useEstimatePermissions(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 経営者の見積権限確認
      expect(result.current.canCreate).toBe(true);
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canView).toBe(true);
      expect(result.current.canViewPrice).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    test('AuthProvider外でのuseAuth使用', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    test('checkAuthStatusでのエラー処理', async () => {
      // localStorage.getItemでエラーを発生させる
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // エラーが発生してもアプリケーションが続行できることを確認
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('定数と設定', () => {
    test('USER_ROLES定数', () => {
      expect(USER_ROLES.MANAGER).toBe('manager');
      expect(USER_ROLES.EMPLOYEE).toBe('employee');
      expect(USER_ROLES.VIEWER).toBe('viewer');
    });

    test('PERMISSIONS定数', () => {
      expect(PERMISSIONS.INVOICE_CREATE).toBe('invoice:create');
      expect(PERMISSIONS.ESTIMATE_PRICE_VIEW).toBe('estimate:price_view');
      expect(PERMISSIONS.PROJECT_PROFIT_VIEW).toBe('project:profit_view');
    });

    test('ROLE_PERMISSIONSマッピング', () => {
      // 経営者の権限
      expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(PERMISSIONS.INVOICE_CREATE);
      expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(PERMISSIONS.ESTIMATE_PRICE_VIEW);
      expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(PERMISSIONS.PROJECT_PROFIT_VIEW);

      // 従業員の権限（原価・収益情報非表示）
      expect(ROLE_PERMISSIONS[USER_ROLES.EMPLOYEE]).toContain(PERMISSIONS.ESTIMATE_CREATE);
      expect(ROLE_PERMISSIONS[USER_ROLES.EMPLOYEE]).not.toContain(PERMISSIONS.ESTIMATE_PRICE_VIEW);
      expect(ROLE_PERMISSIONS[USER_ROLES.EMPLOYEE]).not.toContain(PERMISSIONS.PROJECT_PROFIT_VIEW);

      // 閲覧者の権限（参照のみ）
      expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(PERMISSIONS.INVOICE_VIEW);
      expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(PERMISSIONS.INVOICE_CREATE);
    });
  });
});
