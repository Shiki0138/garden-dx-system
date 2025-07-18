/**
 * CORS設定 - デモモード対応
 * セキュリティ最優先・環境別オリジン管理
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * 環境別許可オリジン設定
 */
function getAllowedOrigins(): string[] {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
  
  const baseOrigins: Record<string, string[]> = {
    development: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    staging: [
      'https://garden-dx-staging.vercel.app',
      'https://*.vercel.app'
    ],
    production: [
      'https://garden-dx.vercel.app',
      'https://garden-dx.com',
      'https://www.garden-dx.com'
    ]
  };

  // デモモード対応
  const demoOrigins = [
    'https://demo.garden-dx.com',
    'https://garden-dx-demo.vercel.app',
    'https://*-demo.vercel.app'
  ];

  return [
    ...(baseOrigins[environment] || baseOrigins.development),
    ...customOrigins,
    ...demoOrigins
  ];
}

/**
 * オリジン検証（ワイルドカード対応）
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    
    // ワイルドカード対応
    if (allowed.includes('*')) {
      const regex = new RegExp(
        '^' + allowed.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
      );
      return regex.test(origin);
    }
    
    return false;
  });
}

/**
 * CORS設定取得
 */
export function getCorsConfig(): CorsConfig {
  return {
    allowedOrigins: getAllowedOrigins(),
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'X-Demo-Mode',
      'X-API-Key',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Demo-Mode',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    credentials: true,
    maxAge: 86400 // 24時間
  };
}

/**
 * リクエスト用CORSヘッダー生成
 */
export function generateCorsHeaders(request: Request): HeadersInit {
  const config = getCorsConfig();
  const origin = request.headers.get('origin');
  
  // オリジン検証
  const allowedOrigin = isOriginAllowed(origin, config.allowedOrigins) 
    ? origin 
    : config.allowedOrigins[0];

  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': config.exposedHeaders.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString(),
    'Access-Control-Allow-Credentials': config.credentials.toString()
  };

  // オリジンヘッダー追加
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  // セキュリティヘッダー追加
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['X-Frame-Options'] = 'DENY';
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  
  // デモモード検出
  const isDemo = request.headers.get('X-Demo-Mode') === 'true' ||
                 request.url.includes('demo=true') ||
                 (origin && (origin.includes('demo.') || origin.includes('-demo.')));
  
  if (isDemo) {
    headers['X-Demo-Mode'] = 'true';
  }

  // Content Security Policy（環境別）
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  if (environment === 'production') {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'"
    ].join('; ');
  }

  return headers;
}

/**
 * デフォルトCORSヘッダー（下位互換）
 */
export const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-demo-mode, accept-encoding',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Vary': 'Accept-Encoding, Origin'
};

/**
 * プリフライトレスポンス生成
 */
export function createPreflightResponse(request: Request): Response {
  const headers = generateCorsHeaders(request);
  
  return new Response(null, {
    status: 204,
    headers
  });
}

/**
 * エラーレスポンス用CORSヘッダー
 */
export function addCorsToErrorResponse(
  response: Response, 
  request: Request
): Response {
  const corsHeaders = generateCorsHeaders(request);
  
  // 既存ヘッダーとマージ
  const mergedHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    mergedHeaders.set(key, value as string);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders
  });
}