/**
 * 統一エラーハンドリング・レスポンス生成
 * 本番デプロイエラー防止・標準化されたエラー処理
 */

import { corsHeaders } from './cors.ts';

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'BAD_REQUEST'
  | 'SERVICE_UNAVAILABLE';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  userMessage?: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

/**
 * エラーコード・HTTPステータスマッピング
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT_ERROR: 504
};

/**
 * ユーザー向けエラーメッセージ
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '入力内容に問題があります。確認して再度お試しください。',
  BAD_REQUEST: 'リクエストの形式が正しくありません。',
  UNAUTHORIZED: 'ログインが必要です。再度ログインしてください。',
  FORBIDDEN: 'この操作を実行する権限がありません。',
  NOT_FOUND: '要求されたリソースが見つかりません。',
  METHOD_NOT_ALLOWED: 'この操作は許可されていません。',
  CONFLICT: 'データの競合が発生しました。画面を更新して再度お試しください。',
  RATE_LIMITED: 'リクエストが多すぎます。少し時間をおいて再度お試しください。',
  INTERNAL_SERVER_ERROR: 'サーバーエラーが発生しました。管理者にお問い合わせください。',
  DATABASE_ERROR: 'データベースエラーが発生しました。再度お試しください。',
  EXTERNAL_SERVICE_ERROR: '外部サービスとの通信でエラーが発生しました。',
  SERVICE_UNAVAILABLE: 'サービスが一時的に利用できません。',
  TIMEOUT_ERROR: 'リクエストがタイムアウトしました。再度お試しください。'
};

/**
 * 標準エラーレスポンス生成
 */
export function createStandardErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, any>,
  requestId?: string
): Response {
  const statusCode = ERROR_STATUS_MAP[code];
  const userMessage = USER_FRIENDLY_MESSAGES[code];
  
  const errorDetails: ErrorDetails = {
    code,
    message: message || userMessage,
    statusCode,
    userMessage,
    details,
    timestamp: new Date().toISOString(),
    requestId
  };

  // 本番環境では技術的詳細を隠す
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  if (isProduction && code === 'INTERNAL_SERVER_ERROR') {
    delete errorDetails.details;
    errorDetails.message = userMessage;
  }

  return new Response(JSON.stringify({
    error: errorDetails,
    success: false
  }), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * バリデーションエラーレスポンス生成
 */
export function createValidationErrorResponse(
  errors: ValidationErrorDetail[],
  requestId?: string
): Response {
  return createStandardErrorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    { validationErrors: errors },
    requestId
  );
}

/**
 * データベースエラーレスポンス生成
 */
export function createDatabaseErrorResponse(
  error: { code?: string; message?: string; [key: string]: unknown },
  requestId?: string
): Response {
  console.error('Database error:', error);
  
  // PostgreSQLエラーコード別処理
  let errorCode: ErrorCode = 'DATABASE_ERROR';
  let message = 'Database operation failed';
  
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        errorCode = 'CONFLICT';
        message = 'Duplicate entry detected';
        break;
      case '23503': // foreign_key_violation
        errorCode = 'VALIDATION_ERROR';
        message = 'Referenced data not found';
        break;
      case '23514': // check_violation
        errorCode = 'VALIDATION_ERROR';
        message = 'Data constraint violation';
        break;
    }
  }

  return createStandardErrorResponse(
    errorCode,
    message,
    Deno.env.get('ENVIRONMENT') === 'development' ? { originalError: error } : undefined,
    requestId
  );
}

/**
 * 認証エラーレスポンス生成
 */
export function createAuthErrorResponse(
  message?: string,
  requestId?: string
): Response {
  return createStandardErrorResponse(
    'UNAUTHORIZED',
    message || 'Authentication required',
    undefined,
    requestId
  );
}

/**
 * 認可エラーレスポンス生成
 */
export function createForbiddenErrorResponse(
  message?: string,
  requestId?: string
): Response {
  return createStandardErrorResponse(
    'FORBIDDEN',
    message || 'Insufficient permissions',
    undefined,
    requestId
  );
}

/**
 * レート制限エラーレスポンス生成
 */
export function createRateLimitErrorResponse(
  retryAfter?: number,
  requestId?: string
): Response {
  const response = createStandardErrorResponse(
    'RATE_LIMITED',
    'Rate limit exceeded',
    { retryAfter },
    requestId
  );

  if (retryAfter) {
    const headers = new Headers(response.headers);
    headers.set('Retry-After', retryAfter.toString());
    
    return new Response(response.body, {
      status: response.status,
      headers
    });
  }

  return response;
}

/**
 * タイムアウトエラーレスポンス生成
 */
export function createTimeoutErrorResponse(
  operation?: string,
  requestId?: string
): Response {
  return createStandardErrorResponse(
    'TIMEOUT_ERROR',
    operation ? `${operation} timed out` : 'Operation timed out',
    { operation },
    requestId
  );
}

/**
 * 外部サービスエラーレスポンス生成
 */
export function createExternalServiceErrorResponse(
  service: string,
  originalError?: { message?: string; [key: string]: unknown },
  requestId?: string
): Response {
  return createStandardErrorResponse(
    'EXTERNAL_SERVICE_ERROR',
    `${service} service error`,
    { 
      service,
      originalError: Deno.env.get('ENVIRONMENT') === 'development' ? originalError : undefined
    },
    requestId
  );
}

/**
 * 汎用エラーハンドラー
 */
export function handleGenericError(
  error: { name?: string; message?: string; code?: string; [key: string]: unknown },
  context?: string,
  requestId?: string
): Response {
  console.error(`Error in ${context || 'unknown context'}:`, error);

  // 既知のエラータイプ判定
  if (error.name === 'ValidationError') {
    return createStandardErrorResponse(
      'VALIDATION_ERROR',
      error.message,
      undefined,
      requestId
    );
  }

  if (error.name === 'TimeoutError') {
    return createTimeoutErrorResponse(context, requestId);
  }

  if (error.code?.startsWith('23')) {
    return createDatabaseErrorResponse(error, requestId);
  }

  // デフォルトは内部サーバーエラー
  return createStandardErrorResponse(
    'INTERNAL_SERVER_ERROR',
    Deno.env.get('ENVIRONMENT') === 'development' ? error.message : undefined,
    Deno.env.get('ENVIRONMENT') === 'development' ? { error } : undefined,
    requestId
  );
}

/**
 * リクエストID生成
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * エラーログ記録
 */
export function logError(
  error: { name?: string; message?: string; stack?: string; code?: string; [key: string]: unknown },
  context: string,
  requestId?: string,
  userId?: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    requestId,
    userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  };

  console.error(JSON.stringify(logEntry));
}

/**
 * パフォーマンス警告ログ
 */
export function logPerformanceWarning(
  operation: string,
  duration: number,
  threshold: number = 1000,
  requestId?: string
): void {
  if (duration > threshold) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      type: 'performance',
      operation,
      duration,
      threshold,
      requestId
    };

    console.warn(JSON.stringify(logEntry));
  }
}