/**
 * RBAC（Role-Based Access Control）最適化ユーティリティ
 * 権限判定処理の高速化・セキュリティオーバーヘッド削減
 */

// 権限キャッシュシステム
class RBACCache {
  constructor() {
    this.cache = new Map();
    this.roleCache = new Map();
    this.maxCacheSize = 1000;
    this.ttl = 5 * 60 * 1000; // 5分
  }

  // キャッシュキー生成（高速化）
  generateKey(userId, resource, action) {
    return `${userId}:${resource}:${action}`;
  }

  // 権限結果をキャッシュ
  set(userId, resource, action, result) {
    const key = this.generateKey(userId, resource, action);
    
    // キャッシュサイズ制限
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  // キャッシュから権限結果を取得
  get(userId, resource, action) {
    const key = this.generateKey(userId, resource, action);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // TTL チェック
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // アクセス回数更新
    item.accessCount++;
    return item.result;
  }

  // ユーザーロールをキャッシュ
  setUserRole(userId, role) {
    this.roleCache.set(userId, {
      role,
      timestamp: Date.now()
    });
  }

  // キャッシュからユーザーロールを取得
  getUserRole(userId) {
    const item = this.roleCache.get(userId);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.roleCache.delete(userId);
      return null;
    }
    
    return item.role;
  }

  // キャッシュクリア
  clear() {
    this.cache.clear();
    this.roleCache.clear();
  }

  // 統計情報取得
  getStats() {
    return {
      cacheSize: this.cache.size,
      roleCacheSize: this.roleCache.size,
      hitRate: this.calculateHitRate()
    };
  }

  calculateHitRate() {
    let totalAccess = 0;
    let hits = 0;
    
    for (const item of this.cache.values()) {
      totalAccess += item.accessCount;
      if (item.accessCount > 1) hits += item.accessCount - 1;
    }
    
    return totalAccess > 0 ? (hits / totalAccess * 100).toFixed(2) : 0;
  }
}

// グローバルキャッシュインスタンス
const rbacCache = new RBACCache();

// 権限マトリックス（最適化済み）
const PERMISSION_MATRIX = {
  owner: {
    estimates: ['read', 'create', 'update', 'delete', 'approve'],
    invoices: ['read', 'create', 'update', 'delete', 'send'],
    customers: ['read', 'create', 'update', 'delete'],
    projects: ['read', 'create', 'update', 'delete'],
    users: ['read', 'create', 'update', 'delete'],
    reports: ['read', 'export'],
    settings: ['read', 'update']
  },
  admin: {
    estimates: ['read', 'create', 'update', 'delete', 'approve'],
    invoices: ['read', 'create', 'update', 'delete', 'send'],
    customers: ['read', 'create', 'update', 'delete'],
    projects: ['read', 'create', 'update', 'delete'],
    users: ['read', 'create', 'update'],
    reports: ['read', 'export'],
    settings: ['read']
  },
  manager: {
    estimates: ['read', 'create', 'update', 'approve'],
    invoices: ['read', 'create', 'update', 'send'],
    customers: ['read', 'create', 'update'],
    projects: ['read', 'create', 'update'],
    users: ['read'],
    reports: ['read'],
    settings: ['read']
  },
  employee: {
    estimates: ['read', 'create', 'update'],
    invoices: ['read', 'create'],
    customers: ['read', 'create', 'update'],
    projects: ['read', 'update'],
    users: ['read'],
    reports: ['read']
  },
  viewer: {
    estimates: ['read'],
    invoices: ['read'],
    customers: ['read'],
    projects: ['read'],
    users: ['read'],
    reports: ['read']
  }
};

// 役割階層（数値で高速比較）
const ROLE_HIERARCHY = {
  owner: 5,
  admin: 4,
  manager: 3,
  employee: 2,
  viewer: 1
};

/**
 * 高速権限チェック（メインAPI）
 */
export const checkPermissionFast = (user, resource, action) => {
  if (!user || !resource || !action) return false;
  
  const userId = user.id || user.user_id;
  const userRole = user.user_metadata?.role || user.role || 'viewer';
  
  // キャッシュから確認
  const cached = rbacCache.get(userId, resource, action);
  if (cached !== null) return cached;
  
  // 権限判定実行
  const result = executePermissionCheck(userRole, resource, action);
  
  // 結果をキャッシュ
  rbacCache.set(userId, resource, action, result);
  rbacCache.setUserRole(userId, userRole);
  
  return result;
};

/**
 * 権限判定実行（最適化済み）
 */
const executePermissionCheck = (userRole, resource, action) => {
  // 無効な入力チェック
  if (!ROLE_HIERARCHY[userRole] || !PERMISSION_MATRIX[userRole]) {
    return false;
  }
  
  const rolePermissions = PERMISSION_MATRIX[userRole];
  const resourcePermissions = rolePermissions[resource];
  
  if (!resourcePermissions) return false;
  
  // 配列検索の最適化（includes より indexOf を使用）
  return resourcePermissions.indexOf(action) !== -1;
};

/**
 * 複数権限の一括チェック（バッチ処理で高速化）
 */
export const checkMultiplePermissions = (user, permissions) => {
  if (!user || !Array.isArray(permissions)) return {};
  
  const results = {};
  
  permissions.forEach(({ resource, action, key }) => {
    const permKey = key || `${resource}_${action}`;
    results[permKey] = checkPermissionFast(user, resource, action);
  });
  
  return results;
};

/**
 * 役割比較（階層チェック）
 */
export const hasRoleLevel = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * リソースアクセス権限チェック（会社レベル）
 */
export const checkResourceAccess = (user, resource, resourceData) => {
  if (!user || !resource || !resourceData) return false;
  
  const userCompanyId = user.company_id || user.user_metadata?.company_id;
  const resourceCompanyId = resourceData.company_id;
  
  // 会社レベルのアクセス制御
  if (userCompanyId !== resourceCompanyId) return false;
  
  return true;
};

/**
 * 条件付き権限チェック（ビジネスロジック）
 */
export const checkConditionalPermission = (user, resource, action, context = {}) => {
  // 基本権限チェック
  if (!checkPermissionFast(user, resource, action)) return false;
  
  // 条件別追加チェック
  switch (resource) {
    case 'estimates':
      return checkEstimatePermission(user, action, context);
    case 'invoices':
      return checkInvoicePermission(user, action, context);
    case 'projects':
      return checkProjectPermission(user, action, context);
    default:
      return true;
  }
};

/**
 * 見積書権限の条件チェック
 */
const checkEstimatePermission = (user, action, context) => {
  const { estimate, status } = context;
  
  switch (action) {
    case 'approve':
      // 承認権限: マネージャー以上 & ドラフト状態
      return hasRoleLevel(user.role, 'manager') && status === 'draft';
    case 'delete':
      // 削除権限: オーナーのみ & ドラフト状態
      return hasRoleLevel(user.role, 'owner') && status === 'draft';
    default:
      return true;
  }
};

/**
 * 請求書権限の条件チェック
 */
const checkInvoicePermission = (user, action, context) => {
  const { invoice, paymentStatus } = context;
  
  switch (action) {
    case 'send':
      // 送信権限: マネージャー以上 & 未送信状態
      return hasRoleLevel(user.role, 'manager') && paymentStatus !== 'sent';
    case 'delete':
      // 削除権限: オーナーのみ & 未払い状態
      return hasRoleLevel(user.role, 'owner') && paymentStatus === 'unpaid';
    default:
      return true;
  }
};

/**
 * プロジェクト権限の条件チェック
 */
const checkProjectPermission = (user, action, context) => {
  const { project, userId } = context;
  
  switch (action) {
    case 'update':
      // 更新権限: 担当者 または マネージャー以上
      return project.assigned_to === userId || hasRoleLevel(user.role, 'manager');
    default:
      return true;
  }
};

/**
 * セキュリティログ記録（軽量版）
 */
export const logSecurityEvent = (user, resource, action, result) => {
  // 本番環境でのみログ記録（開発時のオーバーヘッド削減）
  if (process.env.NODE_ENV === 'production') {
    console.log(`[RBAC] ${user.id} - ${resource}:${action} = ${result}`);
  }
};

/**
 * 権限キャッシュ統計
 */
export const getRBACStats = () => rbacCache.getStats();

/**
 * キャッシュクリア（セキュリティ要件）
 */
export const clearRBACCache = () => rbacCache.clear();

/**
 * React Hook: usePermissions（最適化版）
 */
export const usePermissions = (user, permissionsList) => {
  const [permissions, setPermissions] = useState({});
  
  useEffect(() => {
    if (!user || !permissionsList) return;
    
    const results = checkMultiplePermissions(user, permissionsList);
    setPermissions(results);
  }, [user, permissionsList]);
  
  return permissions;
};

export default {
  checkPermissionFast,
  checkMultiplePermissions,
  hasRoleLevel,
  checkResourceAccess,
  checkConditionalPermission,
  getRBACStats,
  clearRBACCache,
  usePermissions
};