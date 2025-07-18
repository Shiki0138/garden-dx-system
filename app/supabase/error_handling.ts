/**
 * Garden DX - Supabase エラーハンドリング
 * デプロイエラー防止のための包括的エラー処理
 */

import { PostgrestError, AuthError } from '@supabase/supabase-js'

/**
 * エラーレスポンス型定義
 */
export interface ErrorResponse {
  error: boolean
  message: string
  code?: string
  details?: any
  statusCode?: number
}

/**
 * 成功レスポンス型定義
 */
export interface SuccessResponse<T = any> {
  error: false
  data: T
  message?: string
}

/**
 * API レスポンス型
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * カスタムエラークラス
 */
export class GardenDXError extends Error {
  code: string
  statusCode: number
  details?: any

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'GardenDXError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * エラーコード定義
 */
export const ErrorCodes = {
  // 認証エラー
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EXPIRED_SESSION: 'AUTH_EXPIRED_SESSION',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  
  // データベースエラー
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  DB_RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
  
  // RLSエラー
  RLS_PERMISSION_DENIED: 'RLS_PERMISSION_DENIED',
  RLS_POLICY_VIOLATION: 'RLS_POLICY_VIOLATION',
  
  // ビジネスロジックエラー
  BIZ_INVALID_INPUT: 'BIZ_INVALID_INPUT',
  BIZ_DUPLICATE_ENTRY: 'BIZ_DUPLICATE_ENTRY',
  BIZ_OPERATION_NOT_ALLOWED: 'BIZ_OPERATION_NOT_ALLOWED',
  BIZ_QUOTA_EXCEEDED: 'BIZ_QUOTA_EXCEEDED',
  
  // システムエラー
  SYS_INTERNAL_ERROR: 'SYS_INTERNAL_ERROR',
  SYS_SERVICE_UNAVAILABLE: 'SYS_SERVICE_UNAVAILABLE',
  SYS_TIMEOUT: 'SYS_TIMEOUT',
  SYS_RATE_LIMIT_EXCEEDED: 'SYS_RATE_LIMIT_EXCEEDED',
} as const

/**
 * エラーメッセージマッピング
 */
const ErrorMessages: Record<string, string> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません',
  [ErrorCodes.AUTH_EXPIRED_SESSION]: 'セッションの有効期限が切れました。再度ログインしてください',
  [ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS]: 'この操作を実行する権限がありません',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'アカウントがロックされています。管理者にお問い合わせください',
  [ErrorCodes.AUTH_USER_NOT_FOUND]: 'ユーザーが見つかりません',
  
  [ErrorCodes.DB_CONNECTION_ERROR]: 'データベースへの接続に失敗しました',
  [ErrorCodes.DB_QUERY_ERROR]: 'データの取得に失敗しました',
  [ErrorCodes.DB_CONSTRAINT_VIOLATION]: 'データの整合性エラーが発生しました',
  [ErrorCodes.DB_RECORD_NOT_FOUND]: '指定されたデータが見つかりません',
  
  [ErrorCodes.RLS_PERMISSION_DENIED]: 'このデータへのアクセス権限がありません',
  [ErrorCodes.RLS_POLICY_VIOLATION]: 'セキュリティポリシー違反です',
  
  [ErrorCodes.BIZ_INVALID_INPUT]: '入力データが正しくありません',
  [ErrorCodes.BIZ_DUPLICATE_ENTRY]: '既に同じデータが存在します',
  [ErrorCodes.BIZ_OPERATION_NOT_ALLOWED]: 'この操作は許可されていません',
  [ErrorCodes.BIZ_QUOTA_EXCEEDED]: '利用上限を超えました',
  
  [ErrorCodes.SYS_INTERNAL_ERROR]: 'システムエラーが発生しました',
  [ErrorCodes.SYS_SERVICE_UNAVAILABLE]: 'サービスが一時的に利用できません',
  [ErrorCodes.SYS_TIMEOUT]: 'リクエストがタイムアウトしました',
  [ErrorCodes.SYS_RATE_LIMIT_EXCEEDED]: 'リクエスト数が制限を超えました',
}

/**
 * PostgrestError を解析してエラーコードを取得
 */
export function parsePostgrestError(error: PostgrestError): { code: string; message: string } {
  // RLS エラー
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return { 
      code: ErrorCodes.RLS_PERMISSION_DENIED, 
      message: ErrorMessages[ErrorCodes.RLS_PERMISSION_DENIED] 
    }
  }
  
  // 外部キー制約違反
  if (error.code === '23503') {
    return { 
      code: ErrorCodes.DB_CONSTRAINT_VIOLATION, 
      message: '関連するデータが存在しません' 
    }
  }
  
  // 一意制約違反
  if (error.code === '23505') {
    return { 
      code: ErrorCodes.BIZ_DUPLICATE_ENTRY, 
      message: ErrorMessages[ErrorCodes.BIZ_DUPLICATE_ENTRY] 
    }
  }
  
  // レコードが見つからない
  if (error.details?.includes('0 rows') || error.message?.includes('No rows found')) {
    return { 
      code: ErrorCodes.DB_RECORD_NOT_FOUND, 
      message: ErrorMessages[ErrorCodes.DB_RECORD_NOT_FOUND] 
    }
  }
  
  // デフォルト
  return { 
    code: ErrorCodes.DB_QUERY_ERROR, 
    message: ErrorMessages[ErrorCodes.DB_QUERY_ERROR] 
  }
}

/**
 * Auth エラーを解析してエラーコードを取得
 */
export function parseAuthError(error: AuthError): { code: string; message: string } {
  // 無効な認証情報
  if (error.message?.includes('Invalid login credentials')) {
    return { 
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS, 
      message: ErrorMessages[ErrorCodes.AUTH_INVALID_CREDENTIALS] 
    }
  }
  
  // セッション期限切れ
  if (error.message?.includes('session expired') || error.message?.includes('refresh_token')) {
    return { 
      code: ErrorCodes.AUTH_EXPIRED_SESSION, 
      message: ErrorMessages[ErrorCodes.AUTH_EXPIRED_SESSION] 
    }
  }
  
  // ユーザーが見つからない
  if (error.message?.includes('User not found')) {
    return { 
      code: ErrorCodes.AUTH_USER_NOT_FOUND, 
      message: ErrorMessages[ErrorCodes.AUTH_USER_NOT_FOUND] 
    }
  }
  
  // デフォルト
  return { 
    code: ErrorCodes.SYS_INTERNAL_ERROR, 
    message: error.message || ErrorMessages[ErrorCodes.SYS_INTERNAL_ERROR] 
  }
}

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(
  error: any,
  defaultMessage: string = 'エラーが発生しました'
): ErrorResponse {
  // GardenDXError の場合
  if (error instanceof GardenDXError) {
    return {
      error: true,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }
  
  // PostgrestError の場合
  if (error.code && error.message && error.details) {
    const { code, message } = parsePostgrestError(error as PostgrestError)
    return {
      error: true,
      message,
      code,
      statusCode: 400,
      details: error.details,
    }
  }
  
  // AuthError の場合
  if (error.name === 'AuthError' || error.__isAuthError) {
    const { code, message } = parseAuthError(error as AuthError)
    return {
      error: true,
      message,
      code,
      statusCode: 401,
    }
  }
  
  // 通常の Error の場合
  if (error instanceof Error) {
    return {
      error: true,
      message: error.message || defaultMessage,
      code: ErrorCodes.SYS_INTERNAL_ERROR,
      statusCode: 500,
    }
  }
  
  // その他
  return {
    error: true,
    message: defaultMessage,
    code: ErrorCodes.SYS_INTERNAL_ERROR,
    statusCode: 500,
    details: error,
  }
}

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    error: false,
    data,
    message,
  }
}

/**
 * try-catch ラッパー（デプロイエラー防止）
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<ApiResponse<T>> {
  try {
    const result = await operation()
    return createSuccessResponse(result)
  } catch (error) {
    console.error(`Error in ${errorMessage}:`, error)
    return createErrorResponse(error, errorMessage)
  }
}

/**
 * 環境変数チェック（デプロイエラー防止）
 */
export function checkEnvironmentVariables(): void {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  
  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  )
  
  if (missingVars.length > 0) {
    throw new GardenDXError(
      `Missing environment variables: ${missingVars.join(', ')}`,
      ErrorCodes.SYS_INTERNAL_ERROR,
      500
    )
  }
}

/**
 * Supabase クライアントエラーハンドラー
 */
export class SupabaseErrorHandler {
  /**
   * RLS エラーのハンドリング
   */
  static handleRLSError(error: PostgrestError): ErrorResponse {
    console.error('RLS Error:', error)
    
    // 具体的なエラーメッセージを提供
    let message = ErrorMessages[ErrorCodes.RLS_PERMISSION_DENIED]
    
    if (error.message?.includes('select')) {
      message = 'このデータを閲覧する権限がありません'
    } else if (error.message?.includes('insert')) {
      message = 'データを作成する権限がありません'
    } else if (error.message?.includes('update')) {
      message = 'データを更新する権限がありません'
    } else if (error.message?.includes('delete')) {
      message = 'データを削除する権限がありません'
    }
    
    return createErrorResponse(
      new GardenDXError(message, ErrorCodes.RLS_PERMISSION_DENIED, 403)
    )
  }
  
  /**
   * 認証エラーのハンドリング
   */
  static handleAuthError(error: AuthError): ErrorResponse {
    console.error('Auth Error:', error)
    
    const { code, message } = parseAuthError(error)
    
    // アカウントロックの特別処理
    if (error.message?.includes('locked')) {
      return createErrorResponse(
        new GardenDXError(
          ErrorMessages[ErrorCodes.AUTH_ACCOUNT_LOCKED],
          ErrorCodes.AUTH_ACCOUNT_LOCKED,
          423
        )
      )
    }
    
    return createErrorResponse(
      new GardenDXError(message, code, 401, error)
    )
  }
  
  /**
   * タイムアウトエラーのハンドリング
   */
  static handleTimeoutError(): ErrorResponse {
    return createErrorResponse(
      new GardenDXError(
        ErrorMessages[ErrorCodes.SYS_TIMEOUT],
        ErrorCodes.SYS_TIMEOUT,
        504
      )
    )
  }
  
  /**
   * ネットワークエラーのハンドリング
   */
  static handleNetworkError(error: any): ErrorResponse {
    console.error('Network Error:', error)
    
    if (error.message?.includes('Failed to fetch')) {
      return createErrorResponse(
        new GardenDXError(
          'ネットワーク接続に失敗しました。インターネット接続を確認してください',
          ErrorCodes.DB_CONNECTION_ERROR,
          503
        )
      )
    }
    
    return createErrorResponse(
      new GardenDXError(
        ErrorMessages[ErrorCodes.SYS_SERVICE_UNAVAILABLE],
        ErrorCodes.SYS_SERVICE_UNAVAILABLE,
        503
      )
    )
  }
}

/**
 * API エラーレスポンスのフォーマット
 */
export function formatApiError(error: ErrorResponse): Response {
  return new Response(
    JSON.stringify(error),
    {
      status: error.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * エラーログ記録
 */
export async function logError(
  error: any,
  context: {
    userId?: string
    operation?: string
    resource?: string
    metadata?: Record<string, any>
  }
): Promise<void> {
  try {
    console.error('Error Log:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    })
    
    // TODO: Supabase のセキュリティイベントテーブルに記録
  } catch (logError) {
    console.error('Failed to log error:', logError)
  }
}