/**
 * Garden DX - Supabase認証・認可カスタムフック
 * React用RBAC統合フック
 */

import { useState, useEffect, useContext, createContext } from 'react'
import { authManager, dataManager } from './client_setup'

/**
 * 認証コンテキスト
 */
const AuthContext = createContext({
  user: null,
  company: null,
  permissions: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
  isAdmin: () => false,
  isOwner: () => false,
})

/**
 * 認証プロバイダー
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 認証状態の監視
    const { data: { subscription } } = authManager.onAuthStateChange(
      async (event, session, userProfile) => {
        setUser(userProfile)
        setCompany(authManager.getCurrentCompany())
        setPermissions(authManager.userPermissions)
        setLoading(false)
      }
    )

    // 初回読み込み
    initializeAuth()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const initializeAuth = async () => {
    try {
      await authManager.loadUserProfile()
      setUser(authManager.getCurrentUser())
      setCompany(authManager.getCurrentCompany())
      setPermissions(authManager.userPermissions)
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const result = await authManager.signIn(email, password)
      if (!result.error) {
        setUser(authManager.getCurrentUser())
        setCompany(authManager.getCurrentCompany())
        setPermissions(authManager.userPermissions)
      }
      return result
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const result = await authManager.signOut()
      setUser(null)
      setCompany(null)
      setPermissions(null)
      return result
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (resource, operation = 'SELECT') => {
    return authManager.hasPermission(resource, operation)
  }

  const hasRole = (roles) => {
    return authManager.hasRole(roles)
  }

  const isAdmin = () => {
    return authManager.isAdmin()
  }

  const isOwner = () => {
    return authManager.isCompanyOwner()
  }

  const value = {
    user,
    company,
    permissions,
    loading,
    signIn,
    signOut,
    hasPermission,
    hasRole,
    isAdmin,
    isOwner,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 認証フック
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * 権限チェックフック
 */
export const usePermission = (resource, operation = 'SELECT') => {
  const { hasPermission, loading } = useAuth()
  
  return {
    hasPermission: hasPermission(resource, operation),
    loading,
  }
}

/**
 * 役割チェックフック
 */
export const useRole = (roles) => {
  const { hasRole, loading } = useAuth()
  
  return {
    hasRole: hasRole(roles),
    loading,
  }
}

/**
 * データフェッチフック（権限チェック付き）
 */
export const useSecureData = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const result = await fetchFunction()
        if (result.error) {
          throw result.error
        }
        setData(result.data)
      } catch (err) {
        setError(err)
        console.error('Data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, ...dependencies])

  return { data, loading, error, refetch: () => fetchData() }
}

/**
 * 顧客データフック
 */
export const useCustomers = (filters = {}) => {
  const { hasPermission } = useAuth()
  
  return useSecureData(
    () => {
      if (!hasPermission('customers', 'SELECT')) {
        throw new Error('Permission denied for customers')
      }
      return dataManager.getCustomers(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * 見積書データフック
 */
export const useEstimates = (filters = {}) => {
  const { hasPermission } = useAuth()
  
  return useSecureData(
    () => {
      if (!hasPermission('estimates', 'SELECT')) {
        throw new Error('Permission denied for estimates')
      }
      return dataManager.getEstimates(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * 請求書データフック
 */
export const useInvoices = (filters = {}) => {
  const { hasPermission } = useAuth()
  
  return useSecureData(
    () => {
      if (!hasPermission('invoices', 'SELECT')) {
        throw new Error('Permission denied for invoices')
      }
      return dataManager.getInvoices(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * プロジェクトデータフック
 */
export const useProjects = (filters = {}) => {
  const { hasPermission } = useAuth()
  
  return useSecureData(
    () => {
      if (!hasPermission('projects', 'SELECT')) {
        throw new Error('Permission denied for projects')
      }
      return dataManager.getProjects(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * 価格マスタフック
 */
export const usePriceMaster = (filters = {}) => {
  const { hasPermission } = useAuth()
  
  return useSecureData(
    () => {
      if (!hasPermission('price_master', 'SELECT')) {
        throw new Error('Permission denied for price master')
      }
      return dataManager.getPriceMaster(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * セキュリティダッシュボードフック
 */
export const useSecurityDashboard = () => {
  const { isAdmin } = useAuth()
  
  return useSecureData(
    () => {
      if (!isAdmin()) {
        throw new Error('Admin permission required for security dashboard')
      }
      return dataManager.getSecurityDashboard()
    },
    []
  )
}

/**
 * 監査ログフック
 */
export const useAuditLogs = (filters = {}) => {
  const { isAdmin } = useAuth()
  
  return useSecureData(
    () => {
      if (!isAdmin()) {
        throw new Error('Admin permission required for audit logs')
      }
      return dataManager.getAuditLogs(filters)
    },
    [JSON.stringify(filters)]
  )
}

/**
 * リアルタイム購読フック（権限チェック付き）
 */
export const useRealtimeSubscription = (tableName, filters = {}) => {
  const [data, setData] = useState([])
  const { user, hasPermission } = useAuth()

  useEffect(() => {
    if (!user || !hasPermission(tableName, 'SELECT')) {
      return
    }

    // リアルタイム購読設定
    const subscription = supabase
      .channel(`realtime-${tableName}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: tableName,
          filter: `company_id=eq.${user.company_id}`
        }, 
        (payload) => {
          console.log('Realtime update:', payload)
          
          setData(currentData => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...currentData, payload.new]
              
              case 'UPDATE':
                return currentData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                )
              
              case 'DELETE':
                return currentData.filter(item => item.id !== payload.old.id)
              
              default:
                return currentData
            }
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tableName, user, JSON.stringify(filters)])

  return data
}

/**
 * 権限ベース条件分岐コンポーネント
 */
export const PermissionGuard = ({ 
  resource, 
  operation = 'SELECT', 
  role = null,
  fallback = null,
  children 
}) => {
  const { hasPermission, hasRole, loading } = useAuth()

  if (loading) {
    return fallback
  }

  // 役割チェック
  if (role && !hasRole(role)) {
    return fallback
  }

  // 権限チェック
  if (resource && !hasPermission(resource, operation)) {
    return fallback
  }

  return children
}

/**
 * 管理者専用コンポーネント
 */
export const AdminOnly = ({ fallback = null, children }) => {
  return (
    <PermissionGuard role={['owner', 'manager']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * オーナー専用コンポーネント
 */
export const OwnerOnly = ({ fallback = null, children }) => {
  return (
    <PermissionGuard role="owner" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * ローディング状態管理フック
 */
export const useLoading = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const withLoading = async (asyncFunction) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncFunction()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, withLoading }
}

/**
 * フォーム操作フック（権限チェック付き）
 */
export const useSecureForm = (resource, operation) => {
  const { hasPermission } = useAuth()
  const { loading, error, withLoading } = useLoading()

  const canPerformOperation = hasPermission(resource, operation)

  const submitForm = async (formData, submitFunction) => {
    if (!canPerformOperation) {
      throw new Error(`Permission denied for ${operation} on ${resource}`)
    }

    return withLoading(async () => {
      const result = await submitFunction(formData)
      if (result.error) {
        throw result.error
      }
      return result.data
    })
  }

  return {
    canPerformOperation,
    loading,
    error,
    submitForm,
  }
}