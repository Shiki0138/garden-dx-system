/**
 * Garden DX - デモモード認証システム
 * DEMO_MODE=true時の認証バイパス・セキュアなデモ環境構築
 */

import { createClient } from '@supabase/supabase-js'

/**
 * デモユーザー情報
 */
export const DEMO_USER = {
  id: 'demo-user-00000000-0000-0000-0000-000000000001',
  email: 'demo@garden-dx.com',
  full_name: 'デモユーザー（管理者）',
  role: 'owner',
  company_id: 'demo-company-0000-0000-0000-000000000001',
  company_name: 'デモ造園株式会社',
  is_active: true,
  permissions: {
    estimates: 'owner',
    customers: 'owner',
    invoices: 'owner',
    projects: 'owner',
    price_master: 'owner',
    users: 'owner',
    reports: 'owner',
    company_settings: 'owner',
  },
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
}

/**
 * デモ会社情報
 */
export const DEMO_COMPANY = {
  id: DEMO_USER.company_id,
  name: DEMO_USER.company_name,
  postal_code: '100-0001',
  address: '東京都千代田区千代田1-1-1',
  phone: '03-1234-5678',
  email: 'info@demo-garden.co.jp',
  website: 'https://demo-garden.co.jp',
  business_number: '東京都知事許可（般-1）第12345号',
  logo_url: '/demo-logo.png',
  is_active: true,
  subscription_plan: 'premium',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * デモモード認証管理クラス
 */
export class DemoAuthManager {
  private static instance: DemoAuthManager
  private isDemoMode: boolean
  private currentDemoUser: typeof DEMO_USER | null = null
  private authStateCallbacks: Set<Function> = new Set()

  private constructor() {
    this.isDemoMode = this.checkDemoMode()
    if (this.isDemoMode) {
      console.log('🎭 デモモードが有効です')
      this.currentDemoUser = DEMO_USER
    }
  }

  static getInstance(): DemoAuthManager {
    if (!DemoAuthManager.instance) {
      DemoAuthManager.instance = new DemoAuthManager()
    }
    return DemoAuthManager.instance
  }

  /**
   * デモモード確認
   */
  private checkDemoMode(): boolean {
    try {
      // 環境変数チェック
      const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
                      process.env.DEMO_MODE === 'true'
      
      // URLパラメータチェック（デバッグ用）
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('demo') === 'true') {
          return true
        }
      }
      
      return demoMode
    } catch (error) {
      console.error('Demo mode check error:', error)
      return false
    }
  }

  /**
   * デモモード状態取得
   */
  isDemoModeActive(): boolean {
    return this.isDemoMode
  }

  /**
   * デモユーザー認証（認証バイパス）
   */
  async authenticateAsDemo(): Promise<{
    user: typeof DEMO_USER | null
    company: typeof DEMO_COMPANY | null
    error: any
  }> {
    try {
      if (!this.isDemoMode) {
        throw new Error('Demo mode is not enabled')
      }

      // デモユーザー認証成功をシミュレート
      this.currentDemoUser = DEMO_USER
      
      // 認証状態変更を通知
      this.notifyAuthStateChange('SIGNED_IN', DEMO_USER)

      console.log('🎭 デモユーザーとして認証しました:', DEMO_USER.full_name)

      return {
        user: DEMO_USER,
        company: DEMO_COMPANY,
        error: null,
      }
    } catch (error) {
      console.error('Demo authentication error:', error)
      return {
        user: null,
        company: null,
        error,
      }
    }
  }

  /**
   * デモログアウト
   */
  async signOutDemo(): Promise<{ error: any }> {
    try {
      this.currentDemoUser = null
      this.notifyAuthStateChange('SIGNED_OUT', null)
      console.log('🎭 デモユーザーからログアウトしました')
      
      return { error: null }
    } catch (error) {
      console.error('Demo signout error:', error)
      return { error }
    }
  }

  /**
   * 現在のデモユーザー取得
   */
  getCurrentDemoUser(): typeof DEMO_USER | null {
    return this.isDemoMode ? this.currentDemoUser : null
  }

  /**
   * デモモード権限チェック
   */
  checkDemoPermission(_resource: string, _action: string): boolean {
    if (!this.isDemoMode || !this.currentDemoUser) {
      return false
    }

    // デモユーザーはオーナー権限で全操作可能
    return true
  }

  /**
   * 認証状態変更監視
   */
  onAuthStateChange(callback: (event: string, user: any) => void): () => void {
    this.authStateCallbacks.add(callback)
    
    // 即座に現在の状態を通知
    if (this.isDemoMode && this.currentDemoUser) {
      callback('SIGNED_IN', this.currentDemoUser)
    }

    // アンサブスクライブ関数を返す
    return () => {
      this.authStateCallbacks.delete(callback)
    }
  }

  /**
   * 認証状態変更通知
   */
  private notifyAuthStateChange(event: string, user: any): void {
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(event, user)
      } catch (error) {
        console.error('Auth state callback error:', error)
      }
    })
  }

  /**
   * デモデータ生成
   */
  generateDemoData(): {
    customers: any[]
    estimates: any[]
    invoices: any[]
    projects: any[]
    pricemaster: any[]
  } {
    const now = new Date().toISOString()
    const companyId = DEMO_COMPANY.id
    const userId = DEMO_USER.id

    return {
      customers: [
        {
          id: 'demo-customer-001',
          company_id: companyId,
          name: '田中庭園様',
          postal_code: '150-0001',
          address: '東京都渋谷区神宮前1-1-1',
          phone: '03-1111-2222',
          email: 'tanaka@example.com',
          contact_person: '田中太郎',
          notes: 'VIPのお客様です',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'demo-customer-002',
          company_id: companyId,
          name: '山田ガーデン様',
          postal_code: '160-0001',
          address: '東京都新宿区高田馬場1-1-1',
          phone: '03-3333-4444',
          email: 'yamada@example.com',
          contact_person: '山田花子',
          notes: '継続案件多数',
          created_at: now,
          updated_at: now,
        },
      ],
      estimates: [
        {
          id: 'demo-estimate-001',
          company_id: companyId,
          estimate_number: 'EST-2024-001',
          title: '庭園リノベーション工事',
          client_id: 'demo-customer-001',
          issue_date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          subtotal: 500000,
          tax_amount: 50000,
          total_amount: 550000,
          notes: '高級庭園のリノベーション',
          created_by: userId,
          created_at: now,
          updated_at: now,
        },
      ],
      invoices: [
        {
          id: 'demo-invoice-001',
          company_id: companyId,
          invoice_number: 'INV-2024-001',
          title: '庭園メンテナンス作業',
          client_id: 'demo-customer-002',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'sent',
          subtotal: 200000,
          tax_amount: 20000,
          total_amount: 220000,
          paid_amount: 0,
          payment_status: 'unpaid',
          created_by: userId,
          created_at: now,
          updated_at: now,
        },
      ],
      projects: [
        {
          id: 'demo-project-001',
          company_id: companyId,
          project_number: 'PRJ-2024-001',
          name: '和風庭園造成プロジェクト',
          client_id: 'demo-customer-001',
          description: '伝統的な和風庭園の造成工事',
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          site_address: '東京都渋谷区神宮前1-1-1',
          total_amount: 1500000,
          created_by: userId,
          created_at: now,
          updated_at: now,
        },
      ],
      pricemaster: [
        {
          id: 'demo-price-001',
          company_id: companyId,
          category: '植栽工事',
          name: '高木植栽',
          unit: '本',
          purchase_price: 5000,
          markup_rate: 2.0,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'demo-price-002',
          company_id: companyId,
          category: '造園工事',
          name: '芝生張り',
          unit: '㎡',
          purchase_price: 800,
          markup_rate: 1.8,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
    }
  }
}

/**
 * デモモード用Supabaseクライアント拡張
 */
export class DemoSupabaseClient {
  private demoAuth: DemoAuthManager
  private demoData: any

  constructor() {
    this.demoAuth = DemoAuthManager.getInstance()
    this.demoData = this.demoAuth.generateDemoData()
  }

  /**
   * デモモード用クエリ実行
   */
  async executeQuery(table: string, operation: string, params: any = {}): Promise<{
    data: any
    error: any
  }> {
    try {
      if (!this.demoAuth.isDemoModeActive()) {
        throw new Error('Demo mode is not active')
      }

      console.log(`🎭 Demo query: ${operation} on ${table}`, params)

      switch (operation) {
        case 'select':
          return this.handleDemoSelect(table, params)
        case 'insert':
          return this.handleDemoInsert(table, params)
        case 'update':
          return this.handleDemoUpdate(table, params)
        case 'delete':
          return this.handleDemoDelete(table, params)
        default:
          throw new Error(`Unsupported operation: ${operation}`)
      }
    } catch (error) {
      console.error('Demo query error:', error)
      return { data: null, error }
    }
  }

  private async handleDemoSelect(table: string, params: any): Promise<{ data: any; error: any }> {
    // デモデータから該当テーブルのデータを返す
    const tableData = this.demoData[table] || []
    
    // 簡単なフィルタリング実装
    let filteredData = tableData
    if (params.eq) {
      const [field, value] = params.eq
      filteredData = tableData.filter((item: any) => item[field] === value)
    }

    // single() の場合は最初の1件のみ
    if (params.single) {
      return {
        data: filteredData[0] || null,
        error: filteredData.length === 0 ? { message: 'No rows found' } : null,
      }
    }

    return { data: filteredData, error: null }
  }

  private async handleDemoInsert(table: string, params: any): Promise<{ data: any; error: any }> {
    // デモモードでは実際にはデータを保存せず、成功をシミュレート
    const newRecord = {
      id: `demo-${table}-${Date.now()}`,
      ...params.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // メモリ上のデモデータに追加
    if (!this.demoData[table]) {
      this.demoData[table] = []
    }
    this.demoData[table].push(newRecord)

    return { data: newRecord, error: null }
  }

  private async handleDemoUpdate(_table: string, params: any): Promise<{ data: any; error: any }> {
    // デモモードでは更新をシミュレート
    const updatedRecord = {
      ...params.data,
      updated_at: new Date().toISOString(),
    }

    return { data: updatedRecord, error: null }
  }

  private async handleDemoDelete(_table: string, params: any): Promise<{ data: any; error: any }> {
    // デモモードでは削除をシミュレート
    return { data: { id: params.id }, error: null }
  }
}

/**
 * デモモード検出とフォールバック処理
 */
export function createDemoAwareSupabaseClient() {
  const demoAuth = DemoAuthManager.getInstance()
  
  if (demoAuth.isDemoModeActive()) {
    console.log('🎭 デモモード用クライアントを使用します')
    return new DemoSupabaseClient()
  }

  // 通常のSupabaseクライアント
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase設定が見つかりません。デモモードにフォールバックします')
    return new DemoSupabaseClient()
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * デモモード初期化
 */
export async function initializeDemoMode(): Promise<void> {
  try {
    const demoAuth = DemoAuthManager.getInstance()
    
    if (demoAuth.isDemoModeActive()) {
      console.log('🎭 デモモードを初期化しています...')
      await demoAuth.authenticateAsDemo()
      console.log('✅ デモモード初期化完了')
    }
  } catch (error) {
    console.error('❌ デモモード初期化エラー:', error)
  }
}

// デフォルトエクスポート
export default DemoAuthManager.getInstance()