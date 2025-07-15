/**
 * 統一エラーハンドリングシステム
 * アプリケーション全体で一貫したエラー処理とユーザー通知を提供
 */

import { showError, showWarning, showInfo } from './notifications';
import { log } from './logger';

// エラータイプ定義
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown',
  BUSINESS: 'business',
};

// エラー重要度レベル
export const ERROR_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * エラーの分類と適切なメッセージの決定
 * @param {Error|string} error - エラーオブジェクトまたはメッセージ
 * @param {string} context - エラーが発生したコンテキスト
 * @returns {Object} 分類されたエラー情報
 */
export const classifyError = (error, context = '') => {
  let type = ERROR_TYPES.UNKNOWN;
  let level = ERROR_LEVELS.MEDIUM;
  let userMessage = '';
  let developerMessage = '';
  const shouldLog = true;
  const shouldNotify = true;

  // エラーオブジェクトの場合
  if (error && typeof error === 'object') {
    developerMessage = error.message || String(error);

    // HTTP応答エラーの場合
    if (error.response) {
      const status = error.response.status;

      if (status >= 400 && status < 500) {
        type = ERROR_TYPES.CLIENT;
        level = ERROR_LEVELS.MEDIUM;

        switch (status) {
          case 400:
            type = ERROR_TYPES.VALIDATION;
            userMessage = '入力内容に誤りがあります。確認してください。';
            break;
          case 401:
            type = ERROR_TYPES.AUTHENTICATION;
            userMessage = 'ログインが必要です。再度ログインしてください。';
            level = ERROR_LEVELS.HIGH;
            break;
          case 403:
            type = ERROR_TYPES.AUTHORIZATION;
            userMessage = 'この操作を実行する権限がありません。';
            level = ERROR_LEVELS.HIGH;
            break;
          case 404:
            type = ERROR_TYPES.NOT_FOUND;
            userMessage = '要求されたデータが見つかりません。';
            break;
          case 422:
            type = ERROR_TYPES.VALIDATION;
            userMessage = 'データの検証に失敗しました。入力内容を確認してください。';
            break;
          case 429:
            type = ERROR_TYPES.CLIENT;
            userMessage = 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください。';
            break;
          default:
            userMessage = `クライアントエラーが発生しました（${status}）`;
        }
      } else if (status >= 500) {
        type = ERROR_TYPES.SERVER;
        level = ERROR_LEVELS.HIGH;
        userMessage = 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。';
      }
    }
    // ネットワークエラーの場合
    else if (error.request) {
      type = ERROR_TYPES.NETWORK;
      level = ERROR_LEVELS.HIGH;
      userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    }
    // その他のJavaScriptエラー
    else if (error.name) {
      switch (error.name) {
        case 'ValidationError':
          type = ERROR_TYPES.VALIDATION;
          userMessage = '入力データが正しくありません。';
          break;
        case 'TypeError':
        case 'ReferenceError':
          type = ERROR_TYPES.CLIENT;
          level = ERROR_LEVELS.CRITICAL;
          userMessage = 'アプリケーションエラーが発生しました。';
          break;
        case 'TimeoutError':
          type = ERROR_TYPES.NETWORK;
          userMessage = 'リクエストがタイムアウトしました。再度お試しください。';
          break;
        default:
          userMessage = '予期しないエラーが発生しました。';
      }
    }
  }
  // 文字列エラーの場合
  else if (typeof error === 'string') {
    developerMessage = error;
    userMessage = error;
  }

  // デフォルトメッセージの設定
  if (!userMessage) {
    userMessage = '予期しないエラーが発生しました。しばらく時間をおいてから再度お試しください。';
  }

  return {
    type,
    level,
    userMessage,
    developerMessage,
    shouldLog,
    shouldNotify,
    context,
    timestamp: new Date().toISOString(),
  };
};

/**
 * エラーの統一処理
 * @param {Error|string} error - エラー
 * @param {string} context - コンテキスト
 * @param {Object} options - オプション設定
 */
export const handleError = (error, context = '', options = {}) => {
  const { showNotification = true, logError = true, fallback = null } = options;

  const errorInfo = classifyError(error, context);

  // ログ出力
  if (logError && errorInfo.shouldLog) {
    const logData = {
      context: errorInfo.context,
      type: errorInfo.type,
      level: errorInfo.level,
      message: errorInfo.developerMessage,
      timestamp: errorInfo.timestamp,
    };

    switch (errorInfo.level) {
      case ERROR_LEVELS.CRITICAL:
        log.error('CRITICAL ERROR:', logData);
        break;
      case ERROR_LEVELS.HIGH:
        log.error('HIGH ERROR:', logData);
        break;
      case ERROR_LEVELS.MEDIUM:
        log.warn('MEDIUM ERROR:', logData);
        break;
      default:
        log.info('LOW ERROR:', logData);
    }
  }

  // ユーザー通知
  if (showNotification && errorInfo.shouldNotify) {
    switch (errorInfo.level) {
      case ERROR_LEVELS.CRITICAL:
      case ERROR_LEVELS.HIGH:
        showError(errorInfo.userMessage);
        break;
      case ERROR_LEVELS.MEDIUM:
        showWarning(errorInfo.userMessage);
        break;
      default:
        showInfo(errorInfo.userMessage);
    }
  }

  // フォールバック処理
  if (fallback && typeof fallback === 'function') {
    try {
      return fallback(errorInfo);
    } catch (fallbackError) {
      log.error('Fallback function failed:', fallbackError);
    }
  }

  return errorInfo;
};

/**
 * 非同期操作のエラーハンドリング付きラッパー
 * @param {Function} asyncFunction - 非同期関数
 * @param {string} context - コンテキスト
 * @param {Object} options - オプション
 * @returns {Promise} 結果またはエラー情報
 */
export const withErrorHandling = async (asyncFunction, context = '', options = {}) => {
  try {
    const result = await asyncFunction();
    return {
      success: true,
      data: result,
      error: null,
    };
  } catch (error) {
    const errorInfo = handleError(error, context, options);
    return {
      success: false,
      data: null,
      error: errorInfo,
    };
  }
};

/**
 * React用エラーハンドリングHook
 * @param {string} context - コンテキスト
 * @returns {Function} エラーハンドラー関数
 */
export const useErrorHandler = (context = '') => {
  return (error, options = {}) => {
    return handleError(error, context, options);
  };
};

/**
 * 特定のエラータイプ用のヘルパー関数
 */
export const errorHandlers = {
  validation: (error, field = '') =>
    handleError(error, `Validation Error: ${field}`, {
      showNotification: true,
    }),

  network: error =>
    handleError(error, 'Network Error', {
      showNotification: true,
    }),

  authentication: error =>
    handleError(error, 'Authentication Error', {
      showNotification: true,
      fallback: () => {
        // 認証エラーの場合、ログインページにリダイレクト
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      },
    }),

  business: (error, operation = '') =>
    handleError(error, `Business Logic Error: ${operation}`, {
      showNotification: true,
    }),

  api: (error, endpoint = '') =>
    handleError(error, `API Error: ${endpoint}`, {
      showNotification: true,
    }),
};

export default {
  classifyError,
  handleError,
  withErrorHandling,
  useErrorHandler,
  errorHandlers,
  ERROR_TYPES,
  ERROR_LEVELS,
};
