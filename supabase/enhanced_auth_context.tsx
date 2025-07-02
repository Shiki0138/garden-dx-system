/**
 * Garden DX - 拡張認証コンテキスト
 * デモモード対応・エラーハンドリング強化・フォールバック処理
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './client_setup'
import DemoAuthManager, { DEMO_USER, DEMO_COMPANY } from './demo_auth'
import { 
  ErrorCodes, 
  createErrorResponse, 
  createSuccessResponse, 
  withErrorHandling,
  SupabaseErrorHandler 
} from './error_handling'

/**
 * 認証状態型定義
 */
interface AuthState {
  user: User | typeof DEMO_USER | null
  company: any | null
  profile: any | null
  loading: boolean
  error: string | null
  isDemoMode: boolean
  isAuthenticated: boolean
}

/**
 * 認証コンテキスト型定義
 */
interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<{ error?: any }>
  resetPassword: (email: string) => Promise<{ error?: any }>
  updateProfile: (updates: any) => Promise<{ data?: any; error?: any }>
  hasPermission: (resource: string, action?: string) => boolean
  hasRole: (roles: string | string[]) => boolean
  refreshAuth: () => Promise<void>
  clearError: () => void
}

/**
 * デフォルト認証状態
 */
const defaultAuthState: AuthState = {
  user: null,
  company: null,
  profile: null,
  loading: true,
  error: null,
  isDemoMode: false,
  isAuthenticated: false,
}

/**
 * 認証コンテキスト作成
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 認証プロバイダー
 */
export const EnhancedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState)
  const demoAuth = DemoAuthManager.getInstance()

  /**
   * 認証状態更新
   */
  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }))
  }

  /**
   * エラー設定
   */
  const setError = (error: string | Error | null) => {
    const errorMessage = error instanceof Error ? error.message : error
    updateAuthState({ error: errorMessage, loading: false })
  }

  /**
   * エラークリア
   */
  const clearError = () => {
    updateAuthState({ error: null })
  }

  /**
   * ローディング状態設定
   */
  const setLoading = (loading: boolean) => {
    updateAuthState({ loading })
  }

  /**
   * ユーザープロフィール読み込み
   */
  const loadUserProfile = async (userId: string): Promise<any> => {
    try {
      // デモモードの場合
      if (demoAuth.isDemoModeActive()) {
        return {
          ...DEMO_USER,
          company: DEMO_COMPANY,
        }
      }

      // 通常モード
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            company_name,
            subscription_plan,
            is_active,
            logo_url
          )
        `)
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }

      return profile
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error)
      throw error
    }
  }

  /**
   * 認証状態設定
   */
  const setAuthenticatedUser = async (user: User | typeof DEMO_USER | null) => {
    try {
      if (!user) {
        updateAuthState({
          user: null,
          company: null,
          profile: null,
          isAuthenticated: false,
          loading: false,
        })
        return
      }

      setLoading(true)
      
      // プロフィール読み込み
      const profile = await loadUserProfile(user.id)
      
      updateAuthState({
        user,
        company: profile.companies || DEMO_COMPANY,
        profile,
        isAuthenticated: true,
        loading: false,
        error: null,
      })

      console.log('認証成功:', profile.full_name || user.email)
    } catch (error) {
      console.error('認証状態設定エラー:', error)
      setError('ユーザー情報の取得に失敗しました')
    }
  }

  /**
   * サインイン
   */
  const signIn = async (email: string, password: string) => {
    return withErrorHandling(async () => {
      setLoading(true)
      clearError()

      // デモモードチェック
      if (demoAuth.isDemoModeActive()) {
        console.log('🎭 デモモードでサインイン')
        const result = await demoAuth.authenticateAsDemo()
        
        if (result.error) {
          throw result.error
        }

        await setAuthenticatedUser(result.user)
        return createSuccessResponse(result.user)
      }

      // 通常認証
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        await handleAuthError(error, 'login')
        return SupabaseErrorHandler.handleAuthError(error)
      }

      if (data.user) {
        await setAuthenticatedUser(data.user)
      }

      return createSuccessResponse(data.user)
    }, 'ログインに失敗しました')
  }

  /**
   * サインアップ
   */
  const signUp = async (email: string, password: string, userData: any = {}) => {
    return withErrorHandling(async () => {
      setLoading(true)
      clearError()

      // デモモードでは新規登録不可
      if (demoAuth.isDemoModeActive()) {
        throw new Error('デモモードでは新規登録できません')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) {
        await handleAuthError(error, 'signup')
        return SupabaseErrorHandler.handleAuthError(error)
      }

      setLoading(false)
      return createSuccessResponse(data.user)
    }, '新規登録に失敗しました')
  }

  /**
   * サインアウト
   */
  const signOut = async () => {
    return withErrorHandling(async () => {
      setLoading(true)
      clearError()

      // デモモードの場合
      if (demoAuth.isDemoModeActive()) {
        await demoAuth.signOutDemo()
        updateAuthState(defaultAuthState)
        return createSuccessResponse(null)
      }

      // 通常サインアウト
      const { error } = await supabase.auth.signOut()

      if (error) {
        return SupabaseErrorHandler.handleAuthError(error)
      }

      updateAuthState({ ...defaultAuthState, loading: false })
      return createSuccessResponse(null)
    }, 'ログアウトに失敗しました')
  }

  /**
   * パスワードリセット
   */
  const resetPassword = async (email: string) => {
    return withErrorHandling(async () => {
      setLoading(true)
      clearError()

      // デモモードでは利用不可
      if (demoAuth.isDemoModeActive()) {
        throw new Error('デモモードではパスワードリセットできません')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return SupabaseErrorHandler.handleAuthError(error)
      }

      setLoading(false)
      return createSuccessResponse(null)
    }, 'パスワードリセットに失敗しました')
  }

  /**
   * プロフィール更新
   */
  const updateProfile = async (updates: any) => {
    return withErrorHandling(async () => {
      setLoading(true)
      clearError()

      // デモモードでは更新をシミュレート
      if (demoAuth.isDemoModeActive()) {
        const updatedProfile = { ...authState.profile, ...updates }
        updateAuthState({ profile: updatedProfile, loading: false })
        return createSuccessResponse(updatedProfile)
      }

      if (!authState.user) {
        throw new Error('認証されていません')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', authState.user.id)
        .select()
        .single()

      if (error) {
        return SupabaseErrorHandler.handleRLSError(error)
      }

      updateAuthState({ profile: data, loading: false })
      return createSuccessResponse(data)
    }, 'プロフィール更新に失敗しました')
  }

  /**
   * 権限チェック
   */
  const hasPermission = (resource: string, action: string = 'SELECT'): boolean => {
    try {
      if (!authState.isAuthenticated) {
        return false
      }

      // デモモードは全権限許可
      if (demoAuth.isDemoModeActive()) {
        return demoAuth.checkDemoPermission(resource, action)
      }

      const userRole = authState.profile?.role || 'viewer'

      // オーナーは全権限
      if (userRole === 'owner') {
        return true
      }

      // 権限マトリックス
      const permissions: Record<string, Record<string, string[]>> = {
        manager: {
          estimates: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          customers: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          invoices: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          projects: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
          price_master: ['SELECT', 'INSERT', 'UPDATE'],
          users: ['SELECT', 'INSERT', 'UPDATE'],
          reports: ['SELECT'],
        },
        employee: {
          estimates: ['SELECT', 'INSERT', 'UPDATE'],
          customers: ['SELECT', 'INSERT', 'UPDATE'],
          projects: ['SELECT', 'INSERT', 'UPDATE'],
          invoices: ['SELECT'],
          price_master: ['SELECT'],
        },
        viewer: {
          estimates: ['SELECT'],
          customers: ['SELECT'],
          projects: ['SELECT'],
          invoices: ['SELECT'],
          price_master: ['SELECT'],
        },
      }

      const rolePermissions = permissions[userRole]
      if (!rolePermissions) {
        return false
      }

      const resourcePermissions = rolePermissions[resource]
      if (!resourcePermissions) {
        return false
      }

      return resourcePermissions.includes(action)
    } catch (error) {
      console.error('権限チェックエラー:', error)
      return false
    }
  }

  /**
   * 役割チェック
   */
  const hasRole = (roles: string | string[]): boolean => {
    try {
      if (!authState.isAuthenticated) {
        return false
      }

      const userRole = authState.profile?.role || 'viewer'
      const roleArray = Array.isArray(roles) ? roles : [roles]
      
      return roleArray.includes(userRole)
    } catch (error) {
      console.error('役割チェックエラー:', error)
      return false
    }
  }

  /**
   * 認証状態リフレッシュ
   */
  const refreshAuth = async (): Promise<void> => {
    try {
      setLoading(true)

      // デモモードの場合
      if (demoAuth.isDemoModeActive()) {
        const currentUser = demoAuth.getCurrentDemoUser()
        await setAuthenticatedUser(currentUser)
        return
      }

      // 通常モード
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      await setAuthenticatedUser(user)
    } catch (error) {
      console.error('認証リフレッシュエラー:', error)
      setError('認証状態の更新に失敗しました')
    }
  }

  /**
   * 認証エラーハンドリング
   */
  const handleAuthError = async (error: any, context: string) => {
    console.error(`認証エラー (${context}):`, error)

    // エラーログ記録
    try {
      await supabase
        .from('security_events')
        .insert({
          event_type: `AUTH_ERROR_${context.toUpperCase()}`,
          severity: 'MEDIUM',
          description: error.message || 'Authentication error',
          metadata: { context, error: error.message },
        })
    } catch (logError) {
      console.error('セキュリティログ記録エラー:', logError)
    }
  }

  /**
   * 初期化
   */
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)

        // デモモード確認
        updateAuthState({ isDemoMode: demoAuth.isDemoModeActive() })

        if (demoAuth.isDemoModeActive()) {
          console.log('🎭 デモモードで初期化中...')
          const currentUser = demoAuth.getCurrentDemoUser()
          if (currentUser && isMounted) {
            await setAuthenticatedUser(currentUser)
          } else if (isMounted) {
            setLoading(false)
          }
          return
        }

        // 通常モード初期化
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('セッション取得エラー:', error)
          if (isMounted) {
            setError('認証システムに接続できません')
          }
          return
        }

        if (session?.user && isMounted) {
          await setAuthenticatedUser(session.user)
        } else if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('認証初期化エラー:', error)
        if (isMounted) {
          setError('認証システムの初期化に失敗しました')
        }
      }
    }

    initializeAuth()

    // 認証状態変更監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('認証状態変更:', event)

        if (event === 'SIGNED_IN' && session?.user) {
          await setAuthenticatedUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          updateAuthState({ ...defaultAuthState, loading: false })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await setAuthenticatedUser(session.user)
        }
      }
    )

    // デモモード認証状態監視
    const demoUnsubscribe = demoAuth.onAuthStateChange(async (event, user) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' && user) {
        await setAuthenticatedUser(user)
      } else if (event === 'SIGNED_OUT') {
        updateAuthState({ ...defaultAuthState, loading: false })
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      demoUnsubscribe()
    }
  }, [])

  /**
   * コンテキスト値
   */
  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    hasPermission,
    hasRole,
    refreshAuth,
    clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 認証フック
 */
export const useEnhancedAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider')
  }
  return context
}

/**
 * 認証ガード（HOC）
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean
    allowedRoles?: string[]
    fallback?: React.ComponentType
  } = {}
) {
  const { requireAuth = true, allowedRoles, fallback: Fallback } = options

  return function AuthGuardedComponent(props: P) {
    const { isAuthenticated, hasRole, loading } = useEnhancedAuth()

    if (loading) {
      return <div>読み込み中...</div>
    }

    if (requireAuth && !isAuthenticated) {
      return Fallback ? <Fallback /> : <div>認証が必要です</div>
    }

    if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
      return Fallback ? <Fallback /> : <div>権限が不足しています</div>
    }

    return <Component {...props} />
  }
}

export default EnhancedAuthProvider