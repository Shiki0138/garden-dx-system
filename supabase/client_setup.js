/**
 * Garden DX - Supabase Client Setup
 * フロントエンド用Supabaseクライアント設定（RBAC統合）
 */

import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your-project-url'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'

// Supabaseクライアント作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // セキュアなPKCE認証フロー
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'garden-dx-web',
    },
  },
})

/**
 * 認証状態管理クラス
 */
export class AuthManager {
  constructor() {
    this.currentUser = null
    this.currentCompany = null
    this.userPermissions = null
  }

  /**
   * ユーザーログイン
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // ログイン失敗記録
        await this.recordLoginFailure(email)
        throw error
      }

      // ログイン成功記録
      await this.recordLoginSuccess()
      
      // ユーザー情報取得
      await this.loadUserProfile()
      
      return { data, error: null }
    } catch (error) {
      console.error('Login error:', error)
      return { data: null, error }
    }
  }

  /**
   * ユーザーログアウト
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      this.currentUser = null
      this.currentCompany = null
      this.userPermissions = null
      return { error }
    } catch (error) {
      console.error('Logout error:', error)
      return { error }
    }
  }

  /**
   * ユーザープロフィール読み込み
   */
  async loadUserProfile() {
    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user?.user) {
        throw new Error('No authenticated user')
      }

      // ユーザープロフィール取得
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            company_name,
            subscription_plan,
            is_active
          )
        `)
        .eq('id', user.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      this.currentUser = profile
      this.currentCompany = profile.companies

      // 権限情報取得
      await this.loadUserPermissions()

      return profile
    } catch (error) {
      console.error('Error loading user profile:', error)
      throw error
    }
  }

  /**
   * ユーザー権限読み込み
   */
  async loadUserPermissions() {
    try {
      const { data: permissions, error } = await supabase
        .from('current_user_permissions')
        .select('*')

      if (error) {
        throw error
      }

      // 権限をオブジェクト形式に変換
      this.userPermissions = permissions.reduce((acc, perm) => {
        acc[perm.resource] = perm.permission_level
        return acc
      }, {})

      return this.userPermissions
    } catch (error) {
      console.error('Error loading permissions:', error)
      throw error
    }
  }

  /**
   * ログイン失敗記録
   */
  async recordLoginFailure(email) {
    try {
      await supabase.rpc('record_login_failure', { user_email: email })
    } catch (error) {
      console.error('Error recording login failure:', error)
    }
  }

  /**
   * ログイン成功記録
   */
  async recordLoginSuccess() {
    try {
      await supabase.rpc('record_login_success')
    } catch (error) {
      console.error('Error recording login success:', error)
    }
  }

  /**
   * 権限チェック
   */
  hasPermission(resource, operation = 'SELECT') {
    if (!this.userPermissions || !this.currentUser) {
      return false
    }

    const permission = this.userPermissions[resource]
    
    // オーナー権限は全て許可
    if (permission === 'owner') {
      return true
    }

    // 操作別権限チェック
    switch (operation.toLowerCase()) {
      case 'select':
      case 'read':
        return ['read', 'write', 'admin', 'owner'].includes(permission)
      
      case 'insert':
      case 'update':
      case 'delete':
      case 'write':
        return ['write', 'admin', 'owner'].includes(permission)
      
      case 'admin':
        return ['admin', 'owner'].includes(permission)
      
      default:
        return permission === 'owner'
    }
  }

  /**
   * 役割チェック
   */
  hasRole(roles) {
    if (!this.currentUser) {
      return false
    }

    const userRole = this.currentUser.role
    if (Array.isArray(roles)) {
      return roles.includes(userRole)
    }
    return userRole === roles
  }

  /**
   * 会社所有者チェック
   */
  isCompanyOwner() {
    return this.hasRole('owner')
  }

  /**
   * 管理者チェック（オーナー・マネージャー）
   */
  isAdmin() {
    return this.hasRole(['owner', 'manager'])
  }

  /**
   * 現在のユーザー情報取得
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * 現在の会社情報取得
   */
  getCurrentCompany() {
    return this.currentCompany
  }

  /**
   * 認証状態監視
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.loadUserProfile()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.currentCompany = null
        this.userPermissions = null
      }
      
      callback(event, session, this.currentUser)
    })
  }
}

/**
 * データアクセス管理クラス
 */
export class DataManager {
  constructor(authManager) {
    this.auth = authManager
  }

  /**
   * 権限チェック付きクエリ実行
   */
  async executeQuery(tableName, operation, queryBuilder) {
    // 認証チェック
    if (!this.auth.currentUser) {
      throw new Error('User not authenticated')
    }

    // 権限チェック
    if (!this.auth.hasPermission(tableName, operation)) {
      throw new Error(`Permission denied for ${operation} on ${tableName}`)
    }

    // クエリ実行
    return await queryBuilder()
  }

  /**
   * 顧客データ取得
   */
  async getCustomers(filters = {}) {
    return this.executeQuery('customers', 'SELECT', async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      // フィルター適用
      if (filters.active !== undefined) {
        query = query.eq('is_active', filters.active)
      }
      if (filters.search) {
        query = query.ilike('customer_name', `%${filters.search}%`)
      }

      return await query
    })
  }

  /**
   * 見積書データ取得
   */
  async getEstimates(filters = {}) {
    return this.executeQuery('estimates', 'SELECT', async () => {
      let query = supabase
        .from('estimates')
        .select(`
          *,
          customers (
            id,
            customer_name,
            customer_type
          ),
          estimate_items (
            id,
            line_number,
            item_name,
            quantity,
            unit_price,
            amount
          )
        `)
        .order('created_at', { ascending: false })

      // フィルター適用
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
      }
      if (filters.date_from) {
        query = query.gte('estimate_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('estimate_date', filters.date_to)
      }

      return await query
    })
  }

  /**
   * 請求書データ取得
   */
  async getInvoices(filters = {}) {
    return this.executeQuery('invoices', 'SELECT', async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (
            id,
            customer_name,
            customer_type
          ),
          invoice_items (
            id,
            line_number,
            item_name,
            quantity,
            unit_price,
            amount
          )
        `)
        .order('created_at', { ascending: false })

      // フィルター適用
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
      }
      if (filters.overdue_only) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0])
               .neq('status', 'paid')
      }

      return await query
    })
  }

  /**
   * プロジェクトデータ取得
   */
  async getProjects(filters = {}) {
    return this.executeQuery('projects', 'SELECT', async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          customers (
            id,
            customer_name
          ),
          estimates (
            id,
            estimate_number,
            total_amount
          ),
          project_manager:user_profiles!projects_project_manager_id_fkey (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      // フィルター適用
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.manager_id) {
        query = query.eq('project_manager_id', filters.manager_id)
      }

      return await query
    })
  }

  /**
   * 価格マスタ取得
   */
  async getPriceMaster(filters = {}) {
    return this.executeQuery('price_master', 'SELECT', async () => {
      let query = supabase
        .from('price_master')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })

      // フィルター適用
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.search) {
        query = query.or(
          `item_name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%`
        )
      }

      return await query
    })
  }

  /**
   * セキュリティダッシュボードデータ取得
   */
  async getSecurityDashboard() {
    if (!this.auth.isAdmin()) {
      throw new Error('Permission denied for security dashboard')
    }

    const { data, error } = await supabase
      .from('security_dashboard')
      .select('*')
      .single()

    return { data, error }
  }

  /**
   * 監査ログ取得
   */
  async getAuditLogs(filters = {}) {
    if (!this.auth.isAdmin()) {
      throw new Error('Permission denied for audit logs')
    }

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles (
          id,
          full_name,
          username
        )
      `)
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100)

    // フィルター適用
    if (filters.table_name) {
      query = query.eq('table_name', filters.table_name)
    }
    if (filters.operation) {
      query = query.eq('operation', filters.operation)
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    return await query
  }
}

// グローバルインスタンス作成
export const authManager = new AuthManager()
export const dataManager = new DataManager(authManager)

// デフォルトエクスポート
export default {
  supabase,
  authManager,
  dataManager,
}