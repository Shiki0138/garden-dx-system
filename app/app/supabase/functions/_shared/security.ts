/**
 * Edge Functions セキュリティユーティリティ
 * 認証・認可・入力検証・XSS/CSRF/SQLi対策
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// セキュリティ設定
export interface SecurityConfig {
  maxRequestSize: number;
  rateLimitRequests: number;
  rateLimitWindow: number;
  allowedOrigins: string[];
  jwtSecretKey?: string;
  requireAuth: boolean;
  csrfProtection: boolean;
  xssProtection: boolean;
}

// デフォルトセキュリティ設定
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  rateLimitRequests: 100,
  rateLimitWindow: 60 * 1000, // 1分
  allowedOrigins: [],
  requireAuth: true,
  csrfProtection: true,
  xssProtection: true
};

// 入力検証
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'uuid' | 'json' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

// XSS対策：HTML sanitization
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    })
    .trim();
}

// SQLインジェクション対策：危険な文字列検出
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--|\*\/|\/\*)/,
    /(\b(or|and)\b\s+\w+\s*=\s*\w+)/i,
    /(['"](\s*;\s*|\s*(union|select|insert|update|delete|drop|create|alter)\s+))/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// パスワード強度チェック
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;

  // 最小長チェック
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // 大文字チェック
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // 小文字チェック
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // 数字チェック
  if (!/\d/.test(password)) {
    issues.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // 特殊文字チェック
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    issues.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // 一般的なパスワードチェック
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    issues.push('Password should not contain common words');
    score = Math.max(0, score - 1);
  }

  return {
    isValid: issues.length === 0 && score >= 4,
    score,
    issues
  };
}

// 入力バリデーション
export function validateInput(data: unknown, rules: ValidationRule[]): {
  isValid: boolean;
  errors: Record<string, string[]>;
  sanitized: Record<string, unknown>;
} {
  const errors: Record<string, string[]> = {};
  const sanitized: Record<string, unknown> = {};

  if (typeof data !== 'object' || data === null) {
    return {
      isValid: false,
      errors: { _root: ['Invalid input format'] },
      sanitized: {}
    };
  }

  const inputData = data as Record<string, unknown>;

  for (const rule of rules) {
    const value = inputData[rule.field];
    const fieldErrors: string[] = [];

    // 必須チェック
    if (rule.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${rule.field} is required`);
      continue;
    }

    // 値が存在する場合のバリデーション
    if (value !== undefined && value !== null && value !== '') {
      const stringValue = String(value);

      // SQLインジェクション検出
      if (detectSqlInjection(stringValue)) {
        fieldErrors.push(`${rule.field} contains potentially dangerous content`);
        continue;
      }

      // 型チェック
      switch (rule.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
            fieldErrors.push(`${rule.field} must be a valid email address`);
          }
          break;

        case 'uuid':
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stringValue)) {
            fieldErrors.push(`${rule.field} must be a valid UUID`);
          }
          break;

        case 'url':
          try {
            new URL(stringValue);
          } catch {
            fieldErrors.push(`${rule.field} must be a valid URL`);
          }
          break;

        case 'number':
          if (isNaN(Number(stringValue))) {
            fieldErrors.push(`${rule.field} must be a number`);
          }
          break;

        case 'json':
          try {
            JSON.parse(stringValue);
          } catch {
            fieldErrors.push(`${rule.field} must be valid JSON`);
          }
          break;
      }

      // 長さチェック
      if (rule.minLength && stringValue.length < rule.minLength) {
        fieldErrors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }

      if (rule.maxLength && stringValue.length > rule.maxLength) {
        fieldErrors.push(`${rule.field} must be no more than ${rule.maxLength} characters`);
      }

      // パターンチェック
      if (rule.pattern && !rule.pattern.test(stringValue)) {
        fieldErrors.push(`${rule.field} format is invalid`);
      }

      // サニタイゼーション
      if (rule.sanitize) {
        sanitized[rule.field] = sanitizeHtml(stringValue);
      } else {
        sanitized[rule.field] = value;
      }
    } else {
      sanitized[rule.field] = value;
    }

    if (fieldErrors.length > 0) {
      errors[rule.field] = fieldErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

// JWT トークン検証
export async function verifyJwtToken(
  token: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  isValid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        isValid: false,
        error: error?.message || 'Invalid token'
      };
    }

    // トークンの有効期限チェック
    const tokenExp = user.exp;
    if (tokenExp && Date.now() / 1000 > tokenExp) {
      return {
        isValid: false,
        error: 'Token expired'
      };
    }

    return {
      isValid: true,
      user
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
}

// レート制限
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);

  // 期間リセット
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.rateLimitWindow
    });
    return {
      allowed: true,
      remaining: config.rateLimitRequests - 1,
      resetTime: now + config.rateLimitWindow
    };
  }

  // 制限チェック
  if (existing.count >= config.rateLimitRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }

  // カウント更新
  existing.count++;
  return {
    allowed: true,
    remaining: config.rateLimitRequests - existing.count,
    resetTime: existing.resetTime
  };
}

// CSRFトークン生成・検証
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function verifyCsrfToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
}

// セキュリティヘッダー生成
export function createSecurityHeaders(config: SecurityConfig = DEFAULT_SECURITY_CONFIG): Record<string, string> {
  const headers: Record<string, string> = {};

  // XSS Protection
  if (config.xssProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
  }

  // CSRF Protection
  if (config.csrfProtection) {
    headers['X-CSRF-Protection'] = 'enabled';
  }

  // Content Security Policy
  headers['Content-Security-Policy'] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  // HSTS
  headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';

  // Referrer Policy
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

  // Permissions Policy
  headers['Permissions-Policy'] = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()'
  ].join(', ');

  return headers;
}

// セキュリティミドルウェア
export async function securityMiddleware(
  request: Request,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<{
  allowed: boolean;
  response?: Response;
  user?: any;
}> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent') || '';
  const clientIp = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   'unknown';

  // Origin チェック
  if (config.allowedOrigins.length > 0 && origin) {
    const isAllowed = config.allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return allowed === origin;
    });

    if (!isAllowed) {
      return {
        allowed: false,
        response: new Response(JSON.stringify({ error: 'Origin not allowed' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...createSecurityHeaders(config)
          }
        })
      };
    }
  }

  // User-Agent チェック（ボット検出）
  const suspiciousUserAgents = [
    /bot/i, /crawler/i, /spider/i, /scanner/i, /curl/i, /wget/i
  ];
  
  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    console.warn(`🤖 Suspicious User-Agent detected: ${userAgent} from ${clientIp}`);
  }

  // レート制限チェック
  const rateLimit = checkRateLimit(clientIp, config);
  if (!rateLimit.allowed) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimit.resetTime
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          ...createSecurityHeaders(config)
        }
      })
    };
  }

  // 認証チェック
  if (config.requireAuth && request.method !== 'OPTIONS') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        allowed: false,
        response: new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...createSecurityHeaders(config)
          }
        })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const tokenVerification = await verifyJwtToken(token, supabaseUrl, supabaseKey);
    if (!tokenVerification.isValid) {
      return {
        allowed: false,
        response: new Response(JSON.stringify({ 
          error: 'Invalid token',
          details: tokenVerification.error
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...createSecurityHeaders(config)
          }
        })
      };
    }

    return {
      allowed: true,
      user: tokenVerification.user
    };
  }

  return { allowed: true };
}

// セキュリティログ
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    level,
    details,
    environment: Deno.env.get('ENVIRONMENT') || 'unknown'
  };

  const logPrefix = level === 'error' ? '🚨' : level === 'warn' ? '⚠️' : '🔒';
  console[level](`${logPrefix} Security Event: ${event}`, logEntry);
}

// 機密データマスキング
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'ssn', 'social_security', 'credit_card', 'card_number', 'cvv'
  ];

  const masked = { ...data };

  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = '*'.repeat(Math.min(value.length, 8));
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    }
  }

  return masked;
}