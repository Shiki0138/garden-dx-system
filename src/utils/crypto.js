/**
 * 暗号化ユーティリティ
 * LocalStorageに保存する機密データの暗号化・復号化
 */

/**
 * 文字列を暗号化
 * @param {string} text - 暗号化する文字列
 * @param {string} password - 暗号化キー
 * @returns {Promise<string>} 暗号化された文字列
 */
export const encrypt = async (text, password) => {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    // パスワードからキーを生成
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // ソルトを生成
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 暗号化キーを導出
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // IVを生成
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // データを暗号化
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      enc.encode(text)
    );

    // 暗号化データ、ソルト、IVを結合
    const encryptedArray = new Uint8Array(encryptedData);
    const resultArray = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    resultArray.set(salt, 0);
    resultArray.set(iv, salt.length);
    resultArray.set(encryptedArray, salt.length + iv.length);

    // Base64エンコード
    return btoa(String.fromCharCode.apply(null, resultArray));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('暗号化に失敗しました');
  }
};

/**
 * 暗号化された文字列を復号化
 * @param {string} encryptedText - 暗号化された文字列
 * @param {string} password - 復号化キー
 * @returns {Promise<string>} 復号化された文字列
 */
export const decrypt = async (encryptedText, password) => {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    // Base64デコード
    const encryptedData = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

    // ソルト、IV、暗号化データを分離
    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const data = encryptedData.slice(28);

    // パスワードからキーを生成
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // 復号化キーを導出
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // データを復号化
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    return dec.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('復号化に失敗しました');
  }
};

/**
 * 暗号化キーを環境変数から取得または生成
 * @returns {string} 暗号化キー
 */
export const getEncryptionKey = () => {
  // 本番環境では環境変数から取得
  if (process.env.REACT_APP_ENCRYPTION_KEY) {
    return process.env.REACT_APP_ENCRYPTION_KEY;
  }
  
  // 開発環境では固定キーを使用（警告付き）
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Using default encryption key for development. DO NOT use in production!');
    return 'development_key_do_not_use_in_prod';
  }
  
  throw new Error('Encryption key not configured');
};

/**
 * セキュアなLocalStorage操作
 */
export const secureStorage = {
  /**
   * 暗号化してデータを保存
   * @param {string} key - キー
   * @param {any} value - 値
   * @returns {Promise<boolean>} 成功/失敗
   */
  setItem: async (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      const encryptionKey = getEncryptionKey();
      const encrypted = await encrypt(serialized, encryptionKey);
      
      localStorage.setItem(key, encrypted);
      return true;
    } catch (error) {
      console.error('Secure storage setItem error:', error);
      return false;
    }
  },

  /**
   * 復号化してデータを取得
   * @param {string} key - キー
   * @param {any} defaultValue - デフォルト値
   * @returns {Promise<any>} 取得した値
   */
  getItem: async (key, defaultValue = null) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return defaultValue;

      const encryptionKey = getEncryptionKey();
      const decrypted = await decrypt(encrypted, encryptionKey);
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Secure storage getItem error:', error);
      return defaultValue;
    }
  },

  /**
   * データを削除
   * @param {string} key - キー
   */
  removeItem: (key) => {
    localStorage.removeItem(key);
  }
};

/**
 * パスワードのハッシュ化（bcrypt風の実装）
 * @param {string} password - パスワード
 * @returns {Promise<string>} ハッシュ化されたパスワード
 */
export const hashPassword = async (password) => {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(hashBuffer);
  const resultArray = new Uint8Array(salt.length + hashArray.length);
  resultArray.set(salt, 0);
  resultArray.set(hashArray, salt.length);

  return btoa(String.fromCharCode.apply(null, resultArray));
};

/**
 * パスワードの検証
 * @param {string} password - 検証するパスワード
 * @param {string} hash - 保存されているハッシュ
 * @returns {Promise<boolean>} 検証結果
 */
export const verifyPassword = async (password, hash) => {
  try {
    const enc = new TextEncoder();
    const hashData = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    
    const salt = hashData.slice(0, 16);
    const storedHash = hashData.slice(16);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const newHashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const newHashArray = new Uint8Array(newHashBuffer);
    
    // 定数時間比較
    let result = true;
    for (let i = 0; i < storedHash.length; i++) {
      result = result && storedHash[i] === newHashArray[i];
    }
    
    return result;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};