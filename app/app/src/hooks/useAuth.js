import { useState, useEffect, createContext, useContext } from 'react';

/**
 * 認証・権限管理フック（Worker4統合準備）
 * RBAC（Role-Based Access Control）対応
 */

// 権限レベル定義（造園業DXシステム標準）
export const USER_ROLES = {
  MANAGER: 'manager', // 経営者（親方）
  EMPLOYEE: 'employee', // 従業員
  VIEWER: 'viewer', // 閲覧者
};

// 権限チェック設定
export const PERMISSIONS = {
  // 請求書関連権限
  INVOICE_CREATE: 'invoice:create',
  INVOICE_EDIT: 'invoice:edit',
  INVOICE_VIEW: 'invoice:view',
  INVOICE_DELETE: 'invoice:delete',
  INVOICE_SEND: 'invoice:send',

  // 見積書関連権限
  ESTIMATE_CREATE: 'estimate:create',
  ESTIMATE_EDIT: 'estimate:edit',
  ESTIMATE_VIEW: 'estimate:view',
  ESTIMATE_PRICE_VIEW: 'estimate:price_view', // 原価表示

  // プロジェクト管理権限
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_VIEW: 'project:view',
  PROJECT_PROFIT_VIEW: 'project:profit_view', // 収益表示

  // マスタ管理権限
  MASTER_EDIT: 'master:edit',
  MASTER_VIEW: 'master:view',

  // 顧客管理権限
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_EDIT: 'customer:edit',
  CUSTOMER_VIEW: 'customer:view',

  // システム管理権限
  SYSTEM_ADMIN: 'system:admin',
  USER_MANAGE: 'user:manage',
};

// 役割別権限マッピング（造園業DXシステム標準）
export const ROLE_PERMISSIONS = {
  [USER_ROLES.MANAGER]: [
    // 経営者（親方）：全権限
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_EDIT,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_DELETE,
    PERMISSIONS.INVOICE_SEND,
    PERMISSIONS.ESTIMATE_CREATE,
    PERMISSIONS.ESTIMATE_EDIT,
    PERMISSIONS.ESTIMATE_VIEW,
    PERMISSIONS.ESTIMATE_PRICE_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_PROFIT_VIEW,
    PERMISSIONS.MASTER_EDIT,
    PERMISSIONS.MASTER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_EDIT,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.USER_MANAGE,
  ],
  [USER_ROLES.EMPLOYEE]: [
    // 従業員：制限付き権限（原価・収益情報は非表示）
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.ESTIMATE_CREATE,
    PERMISSIONS.ESTIMATE_EDIT,
    PERMISSIONS.ESTIMATE_VIEW,
    // PERMISSIONS.ESTIMATE_PRICE_VIEW, // 従業員は原価表示不可
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_VIEW,
    // PERMISSIONS.PROJECT_PROFIT_VIEW, // 従業員は収益表示不可
    PERMISSIONS.MASTER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_EDIT,
    PERMISSIONS.CUSTOMER_VIEW,
  ],
  [USER_ROLES.VIEWER]: [
    // 閲覧者：参照のみ
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.ESTIMATE_VIEW,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.MASTER_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
  ],
};

// 認証コンテキスト
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * 認証プロバイダー
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // TODO: Worker4のJWT認証APIと連携
      const mockUser = {
        id: 1,
        name: '田中太郎',
        email: 'tanaka@landscaping.co.jp',
        role: USER_ROLES.MANAGER,
        company_id: 1,
        permissions: ROLE_PERMISSIONS[USER_ROLES.MANAGER],
      };

      setUser(mockUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('認証状態確認エラー:', error);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // TODO: Worker4のログインAPIと連携
      const mockResponse = {
        token: 'mock-jwt-token',
        user: {
          id: 1,
          name: '田中太郎',
          email,
          role: USER_ROLES.MANAGER,
          company_id: 1,
          permissions: ROLE_PERMISSIONS[USER_ROLES.MANAGER],
        },
      };

      localStorage.setItem('authToken', mockResponse.token);
      setUser(mockResponse.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = permission => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = role => {
    return user?.role === role;
  };

  const hasAnyRole = roles => {
    return roles.includes(user?.role);
  };

  const isManager = () => {
    return hasRole(USER_ROLES.MANAGER);
  };

  const isEmployee = () => {
    return hasRole(USER_ROLES.EMPLOYEE);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    hasAnyRole,
    isManager,
    isEmployee,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 権限チェック用カスタムフック
 */
export const usePermission = permission => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

/**
 * 役割チェック用カスタムフック
 */
export const useRole = role => {
  const { hasRole } = useAuth();
  return hasRole(role);
};

/**
 * 経営者権限チェック用カスタムフック
 */
export const useManagerPermission = () => {
  const { isManager } = useAuth();
  return isManager();
};

/**
 * 権限保護されたコンポーネント
 */
export const ProtectedComponent = ({ permission, role, children, fallback = null }) => {
  const { hasPermission, hasRole } = useAuth();

  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  if (role && !hasRole(role)) {
    return fallback;
  }

  return children;
};

/**
 * 経営者専用コンポーネント
 */
export const ManagerOnlyComponent = ({ children, fallback = null }) => {
  const isManager = useManagerPermission();
  return isManager ? children : fallback;
};

/**
 * 請求書専用権限チェック
 */
export const useInvoicePermissions = () => {
  const { hasPermission } = useAuth();

  return {
    canCreate: hasPermission(PERMISSIONS.INVOICE_CREATE),
    canEdit: hasPermission(PERMISSIONS.INVOICE_EDIT),
    canView: hasPermission(PERMISSIONS.INVOICE_VIEW),
    canDelete: hasPermission(PERMISSIONS.INVOICE_DELETE),
    canSend: hasPermission(PERMISSIONS.INVOICE_SEND),
  };
};

/**
 * 見積書専用権限チェック
 */
export const useEstimatePermissions = () => {
  const { hasPermission } = useAuth();

  return {
    canCreate: hasPermission(PERMISSIONS.ESTIMATE_CREATE),
    canEdit: hasPermission(PERMISSIONS.ESTIMATE_EDIT),
    canView: hasPermission(PERMISSIONS.ESTIMATE_VIEW),
    canViewPrice: hasPermission(PERMISSIONS.ESTIMATE_PRICE_VIEW),
  };
};

export default useAuth;
