/**
 * APIエラーハンドリングユーティリティ
 * デプロイエラー防止のための標準実装
 */

// APIタイムアウト設定（30秒）
export const API_TIMEOUT = 30000;

// エラーメッセージマッピング
const ERROR_MESSAGES = {
  'AbortError': 'リクエストがタイムアウトしました',
  'NetworkError': 'ネットワークエラーが発生しました',
  'AuthError': '認証エラーが発生しました',
  'PermissionError': 'アクセス権限がありません',
  'ValidationError': '入力内容に誤りがあります',
  'ServerError': 'サーバーエラーが発生しました',
  'UnknownError': '予期しないエラーが発生しました'
};

/**
 * タイムアウト付きAPIコール
 * @param {Function} operation - 実行するAPI操作
 * @param {Object} options - オプション設定
 * @returns {Promise} API結果
 */
export const apiCallWithTimeout = async (operation, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(), 
    options.timeout || API_TIMEOUT
  );
  
  try {
    // API実行
    const result = await operation({
      signal: controller.signal,
      ...options
    });
    
    // エラーチェック
    if (result?.error) {
      console.error('API Error:', result.error);
      throw new Error(
        result.error.message || 
        ERROR_MESSAGES.ServerError
      );
    }
    
    return result;
    
  } catch (error) {
    // タイムアウトエラー
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.AbortError);
    }
    
    // ネットワークエラー
    if (error.message === 'Failed to fetch') {
      throw new Error(ERROR_MESSAGES.NetworkError);
    }
    
    // その他のエラー
    throw error;
    
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * リトライ付きAPIコール
 * @param {Function} operation - 実行するAPI操作
 * @param {Object} options - オプション設定
 * @returns {Promise} API結果
 */
export const apiCallWithRetry = async (operation, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // API実行
      const result = await apiCallWithTimeout(operation, options);
      return result;
      
    } catch (error) {
      lastError = error;
      console.warn(`API Retry ${i + 1}/${maxRetries}:`, error.message);
      
      // 最後のリトライでない場合は待機
      if (i < maxRetries - 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * (i + 1))
        );
      }
    }
  }
  
  // 全てのリトライが失敗
  throw lastError;
};

/**
 * エラーレスポンス処理
 * @param {Error} error - エラーオブジェクト
 * @returns {Object} 標準化されたエラーレスポンス
 */
export const handleErrorResponse = (error) => {
  console.error('Error Handler:', error);
  
  // エラーコード判定
  const errorCode = error.code || error.name || 'UnknownError';
  const errorMessage = ERROR_MESSAGES[errorCode] || error.message || ERROR_MESSAGES.UnknownError;
  
  // 開発環境では詳細なエラー情報を含める
  const isDevelopment = process.env.REACT_APP_ENVIRONMENT === 'development';
  
  return {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: isDevelopment ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Supabase API呼び出しラッパー
 * @param {Object} supabaseClient - Supabaseクライアント
 * @param {Function} queryBuilder - クエリビルダー関数
 * @param {Object} options - オプション設定
 * @returns {Promise} API結果
 */
export const supabaseApiCall = async (supabaseClient, queryBuilder, options = {}) => {
  // Supabase接続チェック
  if (!supabaseClient) {
    console.warn('Supabase未接続: モックモードで動作');
    return {
      data: options.mockData || [],
      error: null
    };
  }
  
  try {
    // タイムアウト付きでAPI実行
    const result = await apiCallWithTimeout(
      async ({ signal }) => {
        const query = queryBuilder(supabaseClient);
        
        // AbortSignalサポート（Supabase v2）
        if (query.abortSignal && signal) {
          return query.abortSignal(signal);
        }
        
        return query;
      },
      options
    );
    
    return result;
    
  } catch (error) {
    return handleErrorResponse(error);
  }
};

/**
 * バッチAPI呼び出し
 * @param {Array} operations - API操作の配列
 * @param {Object} options - オプション設定
 * @returns {Promise} 全API結果
 */
export const batchApiCall = async (operations, options = {}) => {
  const results = await Promise.allSettled(
    operations.map(operation => 
      apiCallWithTimeout(operation, options)
    )
  );
  
  // 結果を整形
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Batch API Error [${index}]:`, result.reason);
      return handleErrorResponse(result.reason);
    }
  });
};

/**
 * 環境変数チェック
 * @returns {Object} 環境変数の状態
 */
export const checkEnvironmentVariables = () => {
  const requiredVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY',
    'REACT_APP_API_BASE_URL'
  ];
  
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  // デバッグ出力（開発環境のみ）
  if (process.env.REACT_APP_ENVIRONMENT === 'development') {
    console.log('Environment Variables Check:', {
      present: present.length,
      missing: missing.length,
      details: { present, missing }
    });
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    present
  };
};

// デフォルトエクスポート
export default {
  API_TIMEOUT,
  apiCallWithTimeout,
  apiCallWithRetry,
  handleErrorResponse,
  supabaseApiCall,
  batchApiCall,
  checkEnvironmentVariables
};