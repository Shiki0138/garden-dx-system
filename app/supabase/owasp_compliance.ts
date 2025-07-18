/**
 * Garden DX - OWASP Top 10 準拠セキュリティ対策実装
 * デプロイエラー防止・本番環境セキュリティ強化
 */

import { supabase } from './client_setup'
import { GardenDXError, ErrorCodes, logError } from './error_handling'

/**
 * OWASP Top 10 対策実装クラス
 */
export class OWASPCompliance {
  
  /**
   * A01: Broken Access Control 対策
   */
  static async enforceAccessControl(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      // 1. ユーザー認証確認
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        await logError(new GardenDXError('認証されていないユーザーのアクセス', ErrorCodes.AUTH_INVALID_CREDENTIALS), {
          userId,
          resource,
          action,
        })
        return false
      }
      
      // 2. ユーザープロフィール取得
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (profileError || !profile) {
        await logError(profileError || new Error('User profile not found'), {
          userId,
          resource,
          action,
        })
        return false
      }
      
      // 3. アカウント状態確認
      if (!profile.is_active) {
        await logError(new GardenDXError('非アクティブユーザーのアクセス', ErrorCodes.AUTH_ACCOUNT_LOCKED), {
          userId,
          resource,
          action,
        })
        return false
      }
      
      // 4. アカウントロック確認
      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        await logError(new GardenDXError('ロックされたアカウントのアクセス', ErrorCodes.AUTH_ACCOUNT_LOCKED), {
          userId,
          resource,
          action,
        })
        return false
      }
      
      // 5. 権限チェック
      const hasPermission = await this.checkPermission(profile.role, resource, action)
      if (!hasPermission) {
        await logError(new GardenDXError('権限不足', ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS), {
          userId,
          resource,
          action,
          userRole: profile.role,
        })
        return false
      }
      
      // 6. 水平アクセス制御（リソース所有者チェック）
      if (resourceId) {
        const hasResourceAccess = await this.checkResourceAccess(profile.company_id, resource, resourceId)
        if (!hasResourceAccess) {
          await logError(new GardenDXError('リソースへの不正アクセス', ErrorCodes.RLS_PERMISSION_DENIED), {
            userId,
            resource,
            action,
            resourceId,
            companyId: profile.company_id,
          })
          return false
        }
      }
      
      return true
    } catch (error) {
      await logError(error, { userId, resource, action })
      return false
    }
  }
  
  /**
   * 権限チェック
   */
  private static async checkPermission(role: string, resource: string, action: string): Promise<boolean> {
    const permissions: Record<string, Record<string, string[]>> = {
      owner: {
        '*': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      },
      manager: {
        estimates: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
        invoices: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
        customers: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
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
    
    // オーナーは全権限
    if (role === 'owner') {
      return true
    }
    
    const rolePermissions = permissions[role]
    if (!rolePermissions) {
      return false
    }
    
    const resourcePermissions = rolePermissions[resource]
    if (!resourcePermissions) {
      return false
    }
    
    return resourcePermissions.includes(action)
  }
  
  /**
   * リソースアクセス権チェック
   */
  private static async checkResourceAccess(companyId: string, resource: string, resourceId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(resource)
        .select('company_id')
        .eq('id', resourceId)
        .single()
      
      if (error || !data) {
        return false
      }
      
      return data.company_id === companyId
    } catch (error) {
      return false
    }
  }
  
  /**
   * A02: Cryptographic Failures 対策
   */
  static validateCryptographicSecurity(): void {
    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
      throw new GardenDXError(
        'Supabase URL must use HTTPS',
        ErrorCodes.SYS_INTERNAL_ERROR
      )
    }
    
    // 本番環境でのHTTPS強制
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if (window.location.protocol !== 'https:') {
        window.location.href = window.location.href.replace('http:', 'https:')
      }
    }
  }
  
  /**
   * A03: Injection 対策
   */
  static sanitizeInput(input: string, type: 'text' | 'email' | 'phone' | 'number' = 'text'): string {
    if (typeof input !== 'string') {
      throw new GardenDXError('Input must be a string', ErrorCodes.BIZ_INVALID_INPUT)
    }
    
    let sanitized = input.trim()
    
    // 基本的なHTMLエスケープ
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
    
    // タイプ別追加バリデーション
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input)) {
          throw new GardenDXError('Invalid email format', ErrorCodes.BIZ_INVALID_INPUT)
        }
        break
      
      case 'phone':
        const phoneRegex = /^[0-9\-\+\(\)\s]+$/
        if (!phoneRegex.test(input)) {
          throw new GardenDXError('Invalid phone format', ErrorCodes.BIZ_INVALID_INPUT)
        }
        break
      
      case 'number':
        const numberRegex = /^[0-9\.]+$/
        if (!numberRegex.test(input)) {
          throw new GardenDXError('Invalid number format', ErrorCodes.BIZ_INVALID_INPUT)
        }
        break
    }
    
    // 長さ制限
    if (sanitized.length > 10000) {
      throw new GardenDXError('Input too long', ErrorCodes.BIZ_INVALID_INPUT)
    }
    
    return sanitized
  }
  
  /**
   * A04: Insecure Design 対策
   */
  static async validateBusinessLogic(operation: string, data: any): Promise<boolean> {
    try {
      switch (operation) {
        case 'estimate_approval':
          return await this.validateEstimateApproval(data)
        
        case 'invoice_payment':
          return await this.validateInvoicePayment(data)
        
        case 'user_role_change':
          return await this.validateUserRoleChange(data)
        
        default:
          return true
      }
    } catch (error) {
      await logError(error, { operation, data })
      return false
    }
  }
  
  private static async validateEstimateApproval(data: any): Promise<boolean> {
    // 見積書の状態確認
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('status, created_at')
      .eq('id', data.estimateId)
      .single()
    
    if (error || !estimate) {
      return false
    }
    
    // ドラフト状態のみ承認可能
    if (estimate.status !== 'draft') {
      throw new GardenDXError('Only draft estimates can be approved', ErrorCodes.BIZ_OPERATION_NOT_ALLOWED)
    }
    
    // 作成から24時間以内は承認不可（検討期間確保）
    const createdAt = new Date(estimate.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff < 24) {
      throw new GardenDXError('Estimate must be reviewed for 24 hours before approval', ErrorCodes.BIZ_OPERATION_NOT_ALLOWED)
    }
    
    return true
  }
  
  private static async validateInvoicePayment(data: any): Promise<boolean> {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('status, total_amount, paid_amount')
      .eq('id', data.invoiceId)
      .single()
    
    if (error || !invoice) {
      return false
    }
    
    // 支払済みでない請求書のみ支払い可能
    if (invoice.status === 'paid') {
      throw new GardenDXError('Invoice is already paid', ErrorCodes.BIZ_OPERATION_NOT_ALLOWED)
    }
    
    // 支払い金額の妥当性チェック
    const newPaidAmount = (invoice.paid_amount || 0) + data.paymentAmount
    if (newPaidAmount > invoice.total_amount) {
      throw new GardenDXError('Payment amount exceeds invoice total', ErrorCodes.BIZ_INVALID_INPUT)
    }
    
    return true
  }
  
  private static async validateUserRoleChange(data: any): Promise<boolean> {
    // オーナー権限のみ役割変更可能
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser?.user) {
      return false
    }
    
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.user.id)
      .single()
    
    if (userProfile?.role !== 'owner') {
      throw new GardenDXError('Only owners can change user roles', ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS)
    }
    
    // 自分自身の役割変更は不可
    if (data.userId === currentUser.user.id) {
      throw new GardenDXError('Cannot change own role', ErrorCodes.BIZ_OPERATION_NOT_ALLOWED)
    }
    
    return true
  }
  
  /**
   * A05: Security Misconfiguration 対策
   */
  static checkSecurityConfiguration(): { passed: boolean; issues: string[] } {
    const issues: string[] = []
    
    // 環境変数チェック
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]
    
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        issues.push(`Missing environment variable: ${envVar}`)
      }
    })
    
    // デバッグモードチェック
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG === 'true') {
      issues.push('Debug mode is enabled in production')
    }
    
    // HTTPS チェック
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if (window.location.protocol !== 'https:') {
        issues.push('HTTPS is not enabled')
      }
    }
    
    return {
      passed: issues.length === 0,
      issues,
    }
  }
  
  /**
   * A07: Identification and Authentication Failures 対策
   */
  static async handleFailedLogin(email: string): Promise<void> {
    try {
      // ログイン失敗回数の記録
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('failed_login_attempts, locked_until')
        .eq('email', email)
        .single()
      
      if (error || !profile) {
        // ユーザーが存在しない場合も攻撃対策として同じ処理
        await this.logSecurityEvent('LOGIN_FAILURE', 'MEDIUM', `Failed login attempt for non-existent user: ${email}`)
        return
      }
      
      const newFailedAttempts = (profile.failed_login_attempts || 0) + 1
      const maxAttempts = 5
      
      // アカウントロック判定
      let lockedUntil = null
      if (newFailedAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30分ロック
        
        await this.logSecurityEvent(
          'ACCOUNT_LOCKED',
          'HIGH',
          `Account locked due to ${newFailedAttempts} failed login attempts: ${email}`
        )
      }
      
      // 失敗回数更新
      await supabase
        .from('user_profiles')
        .update({
          failed_login_attempts: newFailedAttempts,
          locked_until: lockedUntil,
        })
        .eq('email', email)
      
      await this.logSecurityEvent(
        'LOGIN_FAILURE',
        newFailedAttempts >= maxAttempts ? 'HIGH' : 'MEDIUM',
        `Login failure #${newFailedAttempts} for user: ${email}`
      )
    } catch (error) {
      await logError(error, { operation: 'handleFailedLogin', email })
    }
  }
  
  /**
   * ログイン成功処理
   */
  static async handleSuccessfulLogin(userId: string): Promise<void> {
    try {
      // 失敗回数リセット
      await supabase
        .from('user_profiles')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString(),
        })
        .eq('id', userId)
      
      await this.logSecurityEvent(
        'LOGIN_SUCCESS',
        'LOW',
        `Successful login for user: ${userId}`
      )
    } catch (error) {
      await logError(error, { operation: 'handleSuccessfulLogin', userId })
    }
  }
  
  /**
   * A09: Security Logging and Monitoring Failures 対策
   */
  static async logSecurityEvent(
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          severity,
          user_id: user?.id || null,
          description,
          metadata: metadata || {},
          ip_address: await this.getClientIP(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }
  
  /**
   * クライアントIP取得
   */
  private static async getClientIP(): Promise<string | null> {
    try {
      // Vercel環境での実装
      if (typeof window === 'undefined') {
        return null
      }
      
      // フロントエンドからは実際のIPは取得困難
      return 'client'
    } catch (error) {
      return null
    }
  }
  
  /**
   * A10: Server-Side Request Forgery 対策
   */
  static validateURL(url: string): boolean {
    try {
      const parsedURL = new URL(url)
      
      // プロトコルチェック
      if (!['http:', 'https:'].includes(parsedURL.protocol)) {
        return false
      }
      
      // 内部IPアドレス拒否
      const hostname = parsedURL.hostname
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
      
      if (ipv4Regex.test(hostname)) {
        const parts = hostname.split('.').map(Number)
        
        // プライベートIPアドレス範囲
        if (
          parts[0] === 10 ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168) ||
          parts[0] === 127 // localhost
        ) {
          return false
        }
      }
      
      // localhost 拒否
      if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        return false
      }
      
      return true
    } catch (error) {
      return false
    }
  }
  
  /**
   * セキュリティヘッダー設定（Next.js API Route用）
   */
  static setSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers)
    
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';")
    
    // CORS設定（Vercelドメイン対応）
    const origin = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL
    if (origin) {
      headers.set('Access-Control-Allow-Origin', `https://${origin}`)
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

/**
 * CORS設定（Vercelドメイン対応）
 */
export function setupCORS(): void {
  // Supabaseダッシュボードでの設定が必要
  console.log('CORS設定確認事項:')
  console.log('1. Supabaseダッシュボード > Settings > API')
  console.log('2. Site URL: Vercelドメインを追加')
  console.log('3. Additional redirect URLs: Vercelプレビュードメインも追加')
  console.log('4. 例: https://your-app.vercel.app, https://your-app-*.vercel.app')
}

/**
 * デプロイ前セキュリティチェック
 */
export async function preDeploymentSecurityCheck(): Promise<{
  passed: boolean
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // 環境変数チェック
  const configCheck = OWASPCompliance.checkSecurityConfiguration()
  if (!configCheck.passed) {
    issues.push(...configCheck.issues)
  }
  
  // HTTPS チェック
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
      issues.push('Supabase URL must use HTTPS in production')
    }
  }
  
  // 推奨事項
  recommendations.push('本番デプロイ前にセキュリティテストを実行してください')
  recommendations.push('Supabase RLSポリシーが適切に設定されていることを確認してください')
  recommendations.push('VercelでのCORS設定を確認してください')
  recommendations.push('セキュリティヘッダーが適切に設定されていることを確認してください')
  
  return {
    passed: issues.length === 0,
    issues,
    recommendations,
  }
}