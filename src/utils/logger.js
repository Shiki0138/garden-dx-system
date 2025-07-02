/**
 * 本番対応ロガーユーティリティ
 * console.log置換・デプロイエラー防止対策
 */

// ログレベル定義
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// 環境設定
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

/**
 * 本番対応ロガークラス
 */
class Logger {
  constructor() {
    this.isEnabled = isDevelopment || isDemoMode;
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || (isDevelopment ? 'debug' : 'error');
  }

  /**
   * ログレベルチェック
   * @param {string} level 
   * @returns {boolean}
   */
  shouldLog(level) {
    if (!this.isEnabled && isProduction) {
      return level === LOG_LEVELS.ERROR; // 本番では ERROR のみ
    }
    
    const levels = [LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const targetLevelIndex = levels.indexOf(level);
    
    return targetLevelIndex <= currentLevelIndex;
  }

  /**
   * フォーマット済みログメッセージ作成
   * @param {string} level 
   * @param {string} message 
   * @param {any} data 
   * @returns {string}
   */
  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (isDemoMode) {
      return `${prefix} [DEMO] ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * エラーログ（本番でも出力）
   * @param {string} message 
   * @param {any} data 
   */
  error(message, data) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message, data);
    
    // 本番ではconsole.errorのみ許可
    console.error(formattedMessage, data || '');
    
    // 本番環境ではエラートラッキングサービスに送信（将来実装）
    if (isProduction) {
      this.sendToErrorService(message, data);
    }
  }

  /**
   * 警告ログ
   * @param {string} message 
   * @param {any} data 
   */
  warn(message, data) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message, data);
    console.warn(formattedMessage, data || '');
  }

  /**
   * 情報ログ
   * @param {string} message 
   * @param {any} data 
   */
  info(message, data) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    
    const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message, data);
    console.info(formattedMessage, data || '');
  }

  /**
   * デバッグログ（開発環境のみ）
   * @param {string} message 
   * @param {any} data 
   */
  debug(message, data) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    const formattedMessage = this.formatMessage(LOG_LEVELS.DEBUG, message, data);
    console.log(formattedMessage, data || '');
  }

  /**
   * エラートラッキングサービスへの送信（将来実装）
   * @param {string} message 
   * @param {any} data 
   */
  sendToErrorService(message, data) {
    // 将来: Sentry, LogRocket等のサービスに送信
    // 現在は何もしない（本番エラー防止）
  }

  /**
   * パフォーマンス測定開始
   * @param {string} label 
   */
  timeStart(label) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    console.time(label);
  }

  /**
   * パフォーマンス測定終了
   * @param {string} label 
   */
  timeEnd(label) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    console.timeEnd(label);
  }

  /**
   * グループログ開始
   * @param {string} groupName 
   */
  group(groupName) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    console.group(groupName);
  }

  /**
   * グループログ終了
   */
  groupEnd() {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    console.groupEnd();
  }

  /**
   * テーブル表示（開発環境のみ）
   * @param {any} data 
   */
  table(data) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    console.table(data);
  }
}

// シングルトンインスタンス
const logger = new Logger();

// 便利関数エクスポート
export const log = {
  error: (message, data) => logger.error(message, data),
  warn: (message, data) => logger.warn(message, data),
  info: (message, data) => logger.info(message, data),
  debug: (message, data) => logger.debug(message, data),
  timeStart: (label) => logger.timeStart(label),
  timeEnd: (label) => logger.timeEnd(label),
  group: (groupName) => logger.group(groupName),
  groupEnd: () => logger.groupEnd(),
  table: (data) => logger.table(data)
};

// レガシーconsole.log置換用
export const devLog = isDevelopment || isDemoMode ? 
  (...args) => console.log('[DEV]', ...args) : 
  () => {}; // 本番では何もしない

export default logger;