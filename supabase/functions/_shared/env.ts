/**
 * 環境変数管理・検証ユーティリティ
 * デプロイエラー防止・型安全な環境変数アクセス
 */

export interface RequiredEnvVars {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  FRONTEND_URL?: string;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  DEMO_MODE?: string;
}

export interface OptionalEnvVars {
  JWT_SECRET?: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  S3_BUCKET?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  SENTRY_DSN?: string;
  LOG_LEVEL?: string;
}

export type EnvVars = RequiredEnvVars & OptionalEnvVars;

/**
 * 必須環境変数検証
 * エラー時は詳細なエラーメッセージで失敗
 */
export function validateEnvironmentVariables(): void {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    
    if (!value) {
      missingVars.push(varName);
      continue;
    }

    // 値の形式検証
    switch (varName) {
      case 'SUPABASE_URL':
        if (!value.startsWith('https://') || !value.includes('supabase.co')) {
          invalidVars.push(`${varName}: Must be a valid Supabase URL (https://xxx.supabase.co)`);
        }
        break;
      
      case 'SUPABASE_SERVICE_ROLE_KEY':
        if (value.length < 100) {
          invalidVars.push(`${varName}: Service role key appears to be too short`);
        }
        break;
    }
  }

  // エラーがある場合は詳細メッセージで失敗
  if (missingVars.length > 0 || invalidVars.length > 0) {
    const errorMessages: string[] = [];
    
    if (missingVars.length > 0) {
      errorMessages.push(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    if (invalidVars.length > 0) {
      errorMessages.push(`Invalid environment variables: ${invalidVars.join('; ')}`);
    }

    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }
}

/**
 * 型安全な環境変数取得
 */
export function getEnvVar<K extends keyof EnvVars>(
  key: K,
  defaultValue?: EnvVars[K]
): EnvVars[K] {
  const value = Deno.env.get(key);
  return (value as EnvVars[K]) || defaultValue;
}

/**
 * 必須環境変数取得（存在しない場合はエラー）
 */
export function getRequiredEnvVar<K extends keyof RequiredEnvVars>(
  key: K
): RequiredEnvVars[K] {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value as RequiredEnvVars[K];
}

/**
 * 数値型環境変数取得
 */
export function getEnvNumber(key: string, defaultValue: number = 0): number {
  const value = Deno.env.get(key);
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Boolean型環境変数取得
 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = Deno.env.get(key);
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * JSON型環境変数取得
 */
export function getEnvJSON<T = Record<string, unknown>>(key: string, defaultValue: T): T {
  const value = Deno.env.get(key);
  if (!value) return defaultValue;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    console.warn(`Failed to parse JSON environment variable ${key}, using default value`);
    return defaultValue;
  }
}

/**
 * 配列型環境変数取得（カンマ区切り）
 */
export function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = Deno.env.get(key);
  if (!value) return defaultValue;
  
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * 環境設定サマリー取得（デバッグ用）
 */
export function getEnvironmentSummary(): Record<string, unknown> {
  return {
    environment: getEnvVar('ENVIRONMENT', 'development'),
    supabaseConfigured: !!getEnvVar('SUPABASE_URL'),
    frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
    demoMode: getEnvBoolean('DEMO_MODE'),
    logLevel: getEnvVar('LOG_LEVEL', 'INFO'),
    allowedOrigins: getEnvArray('ALLOWED_ORIGINS'),
    timestamp: new Date().toISOString()
  };
}

/**
 * 開発環境検証
 */
export function isDevelopment(): boolean {
  return getEnvVar('ENVIRONMENT', 'development') === 'development';
}

/**
 * 本番環境検証
 */
export function isProduction(): boolean {
  return getEnvVar('ENVIRONMENT', 'development') === 'production';
}

/**
 * デモモード検証
 */
export function isDemoMode(): boolean {
  return getEnvBoolean('DEMO_MODE');
}

/**
 * 環境変数設定チェック（ヘルスチェック用）
 */
export function checkEnvironmentHealth(): {
  status: 'healthy' | 'warning' | 'error';
  details: Record<string, unknown>;
} {
  try {
    validateEnvironmentVariables();
    
    const warnings: string[] = [];
    
    // オプション設定のチェック
    if (!getEnvVar('FRONTEND_URL')) {
      warnings.push('FRONTEND_URL not configured');
    }
    
    if (!getEnvVar('ALLOWED_ORIGINS')) {
      warnings.push('ALLOWED_ORIGINS not explicitly configured');
    }

    if (isProduction() && isDemoMode()) {
      warnings.push('Demo mode enabled in production environment');
    }

    return {
      status: warnings.length > 0 ? 'warning' : 'healthy',
      details: {
        environment: getEnvironmentSummary(),
        warnings,
        requiredVarsPresent: true,
        checkedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    return {
      status: 'error',
      details: {
        error: error.message,
        environment: getEnvVar('ENVIRONMENT', 'unknown'),
        checkedAt: new Date().toISOString()
      }
    };
  }
}