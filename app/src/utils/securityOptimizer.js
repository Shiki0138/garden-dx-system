/**
 * セキュリティ処理最適化ユーティリティ
 * 暗号化・ハッシュ化・セキュリティオーバーヘッド削減
 */

// セキュリティキャッシュ
class SecurityCache {
  constructor() {
    this.hashCache = new Map();
    this.encryptionCache = new Map();
    this.validationCache = new Map();
    this.maxSize = 500;
    this.ttl = 10 * 60 * 1000; // 10分
  }

  set(type, key, value) {
    const cache = this.getCache(type);

    if (cache.size >= this.maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(type, key) {
    const cache = this.getCache(type);
    const item = cache.get(key);

    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      cache.delete(key);
      return null;
    }

    return item.value;
  }

  getCache(type) {
    switch (type) {
      case 'hash':
        return this.hashCache;
      case 'encryption':
        return this.encryptionCache;
      case 'validation':
        return this.validationCache;
      default:
        return new Map();
    }
  }

  clear() {
    this.hashCache.clear();
    this.encryptionCache.clear();
    this.validationCache.clear();
  }
}

const securityCache = new SecurityCache();

/**
 * 高速ハッシュ化（キャッシュ付き）
 */
export const fastHash = async (data, algorithm = 'SHA-256') => {
  if (!data) return null;

  const cacheKey = `${algorithm}:${data}`;
  const cached = securityCache.get('hash', cacheKey);
  if (cached) return cached;

  try {
    // Web Crypto API使用（ネイティブ実装で高速）
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);

    // ArrayBufferを16進文字列に変換（最適化版）
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

    securityCache.set('hash', cacheKey, hashHex);
    return hashHex;
  } catch (error) {
    console.error('ハッシュ化エラー:', error);
    return null;
  }
};

/**
 * 軽量パスワード検証
 */
export const validatePasswordFast = password => {
  if (!password) return { valid: false, errors: ['パスワードが必要です'] };

  const cacheKey = `pwd:${password}`;
  const cached = securityCache.get('validation', cacheKey);
  if (cached) return cached;

  const errors = [];

  // 基本的な検証（高速）
  if (password.length < 8) errors.push('8文字以上必要です');
  if (!/[A-Z]/.test(password)) errors.push('大文字が必要です');
  if (!/[a-z]/.test(password)) errors.push('小文字が必要です');
  if (!/\d/.test(password)) errors.push('数字が必要です');

  const result = { valid: errors.length === 0, errors };
  securityCache.set('validation', cacheKey, result);

  return result;
};

/**
 * 入力サニタイズ（最適化版）
 */
export const sanitizeInputFast = (input, type = 'text') => {
  if (typeof input !== 'string') return '';

  const cacheKey = `${type}:${input}`;
  const cached = securityCache.get('validation', cacheKey);
  if (cached) return cached;

  let sanitized = input.trim();

  // HTMLエスケープ（必要最小限）
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'/]/g, char => escapeMap[char]);

  // タイプ別追加処理
  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase();
      break;
    case 'phone':
      sanitized = sanitized.replace(/[^0-9\-+()\s]/g, '');
      break;
    case 'number':
      sanitized = sanitized.replace(/[^0-9.-]/g, '');
      break;
    default:
      break;
  }

  securityCache.set('validation', cacheKey, sanitized);
  return sanitized;
};

/**
 * JWT トークン解析（最適化版）
 */
export const parseJWTOptimized = token => {
  if (!token || typeof token !== 'string') return null;

  const cacheKey = `jwt:${token}`;
  const cached = securityCache.get('validation', cacheKey);
  if (cached) return cached;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64デコード最適化
    const payload = parts[1];
    const decoded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(decoded));

    securityCache.set('validation', cacheKey, parsed);
    return parsed;
  } catch (error) {
    return null;
  }
};

/**
 * セッション有効性チェック（高速版）
 */
export const validateSessionFast = session => {
  if (!session?.access_token) return false;

  const payload = parseJWTOptimized(session.access_token);
  if (!payload) return false;

  // 有効期限チェック（5分のバッファー）
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now + 300;
};

/**
 * セキュリティヘッダー生成（軽量版）
 */
export const generateSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
  };
};

/**
 * CSRF トークン生成（軽量版）
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * レート制限チェック（メモリベース）
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = 60 * 1000; // 1分
    this.maxRequests = 100;
  }

  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 古いエントリを削除
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier);
    const validRequests = userRequests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
    };
  }
}

const rateLimiter = new RateLimiter();

/**
 * API レート制限チェック
 */
export const checkRateLimit = userId => {
  return rateLimiter.check(userId);
};

/**
 * セキュリティイベントログ（軽量版）
 */
export const logSecurityEventLight = (event, severity, details) => {
  // 本番環境のみログ出力
  if (process.env.NODE_ENV === 'production') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
    };

    console.log('[SECURITY]', JSON.stringify(logEntry));
  }
};

/**
 * 入力値検証（バッチ処理）
 */
export const validateInputsBatch = inputs => {
  const results = {};

  Object.entries(inputs).forEach(([key, { value, type, required }]) => {
    const sanitized = sanitizeInputFast(value, type);
    const valid = required ? sanitized.length > 0 : true;

    results[key] = { sanitized, valid };
  });

  return results;
};

/**
 * 暗号化キー生成（軽量版）
 */
export const generateEncryptionKey = async () => {
  try {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);

    return key;
  } catch (error) {
    console.error('暗号化キー生成エラー:', error);
    return null;
  }
};

/**
 * データ暗号化（最適化版）
 */
export const encryptDataFast = async (data, key) => {
  if (!data || !key) return null;

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
    };
  } catch (error) {
    console.error('暗号化エラー:', error);
    return null;
  }
};

/**
 * データ復号化（最適化版）
 */
export const decryptDataFast = async (encryptedData, iv, key) => {
  if (!encryptedData || !iv || !key) return null;

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(encryptedData)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('復号化エラー:', error);
    return null;
  }
};

/**
 * セキュリティメトリクス取得
 */
export const getSecurityMetrics = () => {
  return {
    cacheStats: {
      hashCache: securityCache.hashCache.size,
      encryptionCache: securityCache.encryptionCache.size,
      validationCache: securityCache.validationCache.size,
    },
    rateLimitStats: {
      activeUsers: rateLimiter.requests.size,
    },
  };
};

/**
 * セキュリティキャッシュクリア
 */
export const clearSecurityCache = () => {
  securityCache.clear();
};

/**
 * 軽量セキュリティチェック（最適化版）
 */
export const performSecurityCheck = async request => {
  const checks = {
    rateLimit: checkRateLimit(request.userId),
    inputValidation: validateInputsBatch(request.inputs || {}),
    sessionValid: validateSessionFast(request.session),
  };

  const passed =
    checks.rateLimit.allowed &&
    checks.sessionValid &&
    Object.values(checks.inputValidation).every(r => r.valid);

  return { passed, checks };
};

const securityOptimizer = {
  fastHash,
  validatePasswordFast,
  sanitizeInputFast,
  parseJWTOptimized,
  validateSessionFast,
  performSecurityCheck,
  getSecurityMetrics
};

export default securityOptimizer;

// Legacy default export for compatibility  
export const legacyDefault = {
  fastHash,
  validatePasswordFast,
  sanitizeInputFast,
  parseJWTOptimized,
  validateSessionFast,
  generateSecurityHeaders,
  generateCSRFToken,
  checkRateLimit,
  logSecurityEventLight,
  validateInputsBatch,
  generateEncryptionKey,
  encryptDataFast,
  decryptDataFast,
  getSecurityMetrics,
  clearSecurityCache,
  performSecurityCheck,
};
