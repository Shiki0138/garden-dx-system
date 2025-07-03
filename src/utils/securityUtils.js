/**
 * セキュリティユーティリティ関数
 * XSS・CSRF・データ入力検証・localStorage安全性確保
 */

/**
 * XSS攻撃防止：HTML文字列のサニタイズ
 * @param {string} input - サニタイズ対象の文字列
 * @returns {string} サニタイズされた文字列
 */
export const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return input;
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * XSS攻撃防止：HTMLタグとスクリプトの除去
 * @param {string} input - 入力文字列
 * @returns {string} 安全な文字列
 */
export const stripHTML = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * SQL Injection防止：危険な文字のエスケープ
 * @param {string} input - エスケープ対象の文字列
 * @returns {string} エスケープされた文字列
 */
export const escapeSQLChars = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/;/g, '\\;')
    .replace(/--/g, '\\--')
    .replace(/\/\*/g, '\\/\\*')
    .replace(/\*\//g, '\\*\\/');
};

/**
 * データ入力検証：造園業界フィールド専用バリデーション
 */
export const validateLandscapingInput = {
  /**
   * 顧客名検証
   * @param {string} name - 顧客名
   * @returns {Object} 検証結果
   */
  customerName: (name) => {
    const sanitized = stripHTML(name?.trim() || '');
    const errors = [];
    
    if (!sanitized) {
      errors.push('顧客名は必須です');
    } else if (sanitized.length > 100) {
      errors.push('顧客名は100文字以内で入力してください');
    } else if (!/^[a-zA-Z0-9ぁ-んァ-ヶ一-龯\s\-_()（）株式会社有限会社合同会社]+$/.test(sanitized)) {
      errors.push('顧客名に使用できない文字が含まれています');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  },

  /**
   * 電話番号検証
   * @param {string} phone - 電話番号
   * @returns {Object} 検証結果
   */
  phoneNumber: (phone) => {
    const sanitized = stripHTML(phone?.trim() || '');
    const errors = [];
    
    if (!sanitized) {
      errors.push('電話番号は必須です');
    } else if (!/^[0-9\-+()\\s]+$/.test(sanitized)) {
      errors.push('電話番号は数字、ハイフン、括弧のみ使用可能です');
    } else if (sanitized.replace(/[^0-9]/g, '').length < 10) {
      errors.push('電話番号は10桁以上で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  },

  /**
   * メールアドレス検証
   * @param {string} email - メールアドレス
   * @returns {Object} 検証結果
   */
  email: (email) => {
    const sanitized = stripHTML(email?.trim() || '');
    const errors = [];
    
    if (sanitized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      errors.push('正しいメールアドレス形式で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  },

  /**
   * 住所検証
   * @param {string} address - 住所
   * @returns {Object} 検証結果
   */
  address: (address) => {
    const sanitized = stripHTML(address?.trim() || '');
    const errors = [];
    
    if (!sanitized) {
      errors.push('住所は必須です');
    } else if (sanitized.length > 200) {
      errors.push('住所は200文字以内で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  },

  /**
   * プロジェクト名検証
   * @param {string} projectName - プロジェクト名
   * @returns {Object} 検証結果
   */
  projectName: (projectName) => {
    const sanitized = stripHTML(projectName?.trim() || '');
    const errors = [];
    
    if (!sanitized) {
      errors.push('プロジェクト名は必須です');
    } else if (sanitized.length > 150) {
      errors.push('プロジェクト名は150文字以内で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  },

  /**
   * 数値検証（数量・金額等）
   * @param {string|number} value - 数値
   * @param {Object} options - 検証オプション
   * @returns {Object} 検証結果
   */
  numericValue: (value, options = {}) => {
    const { min = 0, max = 999999999, allowDecimal = false } = options;
    const sanitized = stripHTML(String(value || '').trim());
    const errors = [];
    
    if (!sanitized) {
      errors.push('数値は必須です');
    } else {
      const numValue = parseFloat(sanitized);
      
      if (isNaN(numValue)) {
        errors.push('有効な数値を入力してください');
      } else if (numValue < min) {
        errors.push(`${min}以上の値を入力してください`);
      } else if (numValue > max) {
        errors.push(`${max}以下の値を入力してください`);
      } else if (!allowDecimal && numValue % 1 !== 0) {
        errors.push('整数で入力してください');
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      numericValue: errors.length === 0 ? parseFloat(sanitized) : null,
      errors
    };
  }
};

/**
 * localStorage操作の安全性確保
 */
export const secureLocalStorage = {
  /**
   * 安全なデータ設定
   * @param {string} key - キー
   * @param {any} value - 値
   * @param {Object} options - オプション
   * @returns {boolean} 成功/失敗
   */
  setItem: (key, value, options = {}) => {
    try {
      const { encrypt = false, compress = false } = options;
      
      // キーの検証
      if (!key || typeof key !== 'string') {
        console.error('🔒 localStorage key must be a non-empty string');
        return false;
      }
      
      // 危険なキーパターンをチェック
      if (/[<>"'&]/g.test(key)) {
        console.error('🔒 localStorage key contains unsafe characters');
        return false;
      }
      
      // 値のサニタイズ
      let sanitizedValue = value;
      if (typeof value === 'string') {
        sanitizedValue = stripHTML(value);
      } else if (typeof value === 'object') {
        sanitizedValue = JSON.stringify(value);
      }
      
      // サイズ制限チェック（5MB）
      const serialized = JSON.stringify(sanitizedValue);
      if (serialized.length > 5 * 1024 * 1024) {
        console.error('🔒 localStorage data too large (>5MB)');
        return false;
      }
      
      // localStorage存在チェック
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('🔒 localStorage not available');
        return false;
      }
      
      window.localStorage.setItem(key, serialized);
      return true;
      
    } catch (error) {
      console.error('🔒 localStorage setItem failed:', error);
      return false;
    }
  },

  /**
   * 安全なデータ取得
   * @param {string} key - キー
   * @param {any} defaultValue - デフォルト値
   * @returns {any} 取得した値
   */
  getItem: (key, defaultValue = null) => {
    try {
      // キーの検証
      if (!key || typeof key !== 'string') {
        console.error('🔒 localStorage key must be a non-empty string');
        return defaultValue;
      }
      
      // localStorage存在チェック
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('🔒 localStorage not available');
        return defaultValue;
      }
      
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      
      const parsed = JSON.parse(item);
      
      // データの整合性チェック
      if (typeof parsed === 'string') {
        return stripHTML(parsed);
      }
      
      return parsed;
      
    } catch (error) {
      console.error('🔒 localStorage getItem failed:', error);
      return defaultValue;
    }
  },

  /**
   * 安全なデータ削除
   * @param {string} key - キー
   * @returns {boolean} 成功/失敗
   */
  removeItem: (key) => {
    try {
      if (!key || typeof key !== 'string') {
        console.error('🔒 localStorage key must be a non-empty string');
        return false;
      }
      
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('🔒 localStorage not available');
        return false;
      }
      
      window.localStorage.removeItem(key);
      return true;
      
    } catch (error) {
      console.error('🔒 localStorage removeItem failed:', error);
      return false;
    }
  },

  /**
   * 機密データのクリア（セッション終了時等）
   * @param {string[]} keyPatterns - 削除対象のキーパターン
   */
  clearSensitiveData: (keyPatterns = ['estimate_', 'demo_estimate_', 'user_', 'auth_']) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const keysToRemove = [];
      
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && keyPatterns.some(pattern => key.startsWith(pattern))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
      
      console.info(`🔒 Cleared ${keysToRemove.length} sensitive localStorage items`);
      
    } catch (error) {
      console.error('🔒 Failed to clear sensitive localStorage data:', error);
    }
  }
};

/**
 * CSRF攻撃防止：トークン生成・検証
 */
export const csrfProtection = {
  /**
   * CSRFトークン生成
   * @returns {string} CSRFトークン
   */
  generateToken: () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * CSRFトークン検証
   * @param {string} token - 検証対象トークン
   * @param {string} storedToken - 保存されたトークン
   * @returns {boolean} 検証結果
   */
  validateToken: (token, storedToken) => {
    if (!token || !storedToken) return false;
    return token === storedToken;
  },

  /**
   * セッション用CSRFトークン管理
   */
  sessionToken: {
    set: (token) => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('csrf_token', token);
      }
    },
    
    get: () => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem('csrf_token');
      }
      return null;
    },
    
    clear: () => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('csrf_token');
      }
    }
  }
};

/**
 * セキュリティ監査ログ
 */
export const securityLogger = {
  /**
   * セキュリティイベントログ
   * @param {string} event - イベント名
   * @param {Object} details - 詳細情報
   */
  log: (event, details = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
    
    // 開発環境でのみコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.info('🔒 Security Event:', logEntry);
    }
    
    // 本番環境では外部ログ収集サービスに送信（実装時）
    // sendToSecurityService(logEntry);
  },

  /**
   * セキュリティ警告
   * @param {string} warning - 警告メッセージ
   * @param {Object} context - コンテキスト情報
   */
  warn: (warning, context = {}) => {
    console.warn('🚨 Security Warning:', warning, context);
    securityLogger.log('security_warning', { warning, context });
  },

  /**
   * セキュリティエラー
   * @param {string} error - エラーメッセージ
   * @param {Object} context - コンテキスト情報
   */
  error: (error, context = {}) => {
    console.error('🚨 Security Error:', error, context);
    securityLogger.log('security_error', { error, context });
  }
};

export default {
  sanitizeHTML,
  stripHTML,
  escapeSQLChars,
  validateLandscapingInput,
  secureLocalStorage,
  csrfProtection,
  securityLogger
};