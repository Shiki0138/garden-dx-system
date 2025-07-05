/**
 * 本番対応通知システム
 * alert置換・ユーザーフレンドリーUI対応
 */

// 通知タイプ定義
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// グローバル通知状態管理
let notificationContainer = null;
const notificationQueue = [];
let isInitialized = false;

/**
 * 通知システム初期化
 */
export const initNotificationSystem = () => {
  if (isInitialized || typeof document === 'undefined') return;

  // 通知コンテナ作成
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  notificationContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
    max-width: 400px;
  `;

  document.body.appendChild(notificationContainer);
  isInitialized = true;
};

/**
 * 通知要素作成
 * @param {string} message
 * @param {string} type
 * @param {number} duration
 * @returns {HTMLElement}
 */
const createNotificationElement = (message, type, duration) => {
  const notification = document.createElement('div');
  const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  notification.id = id;

  // タイプ別スタイル
  const typeStyles = {
    success: 'background: linear-gradient(135deg, #10b981, #059669); color: white;',
    error: 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;',
    warning: 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;',
    info: 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;',
  };

  // アイコン
  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  notification.style.cssText = `
    ${typeStyles[type] || typeStyles.info}
    padding: 16px 20px;
    margin-bottom: 12px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    pointer-events: auto;
    cursor: pointer;
    transition: all 0.3s ease;
    transform: translateX(100%);
    opacity: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 380px;
    word-wrap: break-word;
  `;

  // 内容設定
  notification.innerHTML = `
    <span style="font-size: 18px; flex-shrink: 0;">${typeIcons[type] || typeIcons.info}</span>
    <span style="flex: 1;">${message}</span>
    <button style="
      background: none;
      border: none;
      color: inherit;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
      opacity: 0.7;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
    " onclick="this.parentElement.remove()">✕</button>
  `;

  // クリックで閉じる
  notification.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') {
      notification.remove();
    }
  });

  // ホバー効果
  notification.addEventListener('mouseenter', () => {
    notification.style.transform = 'translateX(0) scale(1.02)';
    notification.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
  });

  notification.addEventListener('mouseleave', () => {
    notification.style.transform = 'translateX(0) scale(1)';
    notification.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
  });

  return notification;
};

/**
 * 通知表示
 * @param {string} message
 * @param {string} type
 * @param {number} duration
 * @returns {string} notification ID
 */
export const showNotification = (message, type = NOTIFICATION_TYPES.INFO, duration = 5000) => {
  // 初期化チェック
  if (!isInitialized) {
    initNotificationSystem();
  }

  if (!notificationContainer) {
    // フォールバック: コンソールログ
    console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
    return null;
  }

  const notification = createNotificationElement(message, type, duration);
  notificationContainer.appendChild(notification);

  // アニメーション: 表示
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  });

  // 自動削除
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentElement) {
        // アニメーション: 非表示
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, duration);
  }

  return notification.id;
};

/**
 * 成功通知
 * @param {string} message
 * @param {number} duration
 */
export const showSuccess = (message, duration = 4000) => {
  return showNotification(message, NOTIFICATION_TYPES.SUCCESS, duration);
};

/**
 * エラー通知
 * @param {string} message
 * @param {number} duration
 */
export const showError = (message, duration = 6000) => {
  return showNotification(message, NOTIFICATION_TYPES.ERROR, duration);
};

/**
 * 警告通知
 * @param {string} message
 * @param {number} duration
 */
export const showWarning = (message, duration = 5000) => {
  return showNotification(message, NOTIFICATION_TYPES.WARNING, duration);
};

/**
 * 情報通知
 * @param {string} message
 * @param {number} duration
 */
export const showInfo = (message, duration = 4000) => {
  return showNotification(message, NOTIFICATION_TYPES.INFO, duration);
};

/**
 * 確認ダイアログ（alert置換）
 * @param {string} message
 * @param {Function} onConfirm
 * @param {Function} onCancel
 */
export const showConfirm = (message, onConfirm, onCancel) => {
  // モーダル確認ダイアログ作成
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    backdrop-filter: blur(4px);
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;

  dialog.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">❓</div>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #374151;">${message}</p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="confirm-btn" style="
        background: #1f2937;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s ease;
      ">確認</button>
      <button id="cancel-btn" style="
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
      ">キャンセル</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // イベントリスナー
  const confirmBtn = dialog.querySelector('#confirm-btn');
  const cancelBtn = dialog.querySelector('#cancel-btn');

  const cleanup = () => {
    modal.remove();
  };

  confirmBtn.addEventListener('click', () => {
    cleanup();
    if (onConfirm) onConfirm();
  });

  cancelBtn.addEventListener('click', () => {
    cleanup();
    if (onCancel) onCancel();
  });

  // 背景クリックで閉じる
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      cleanup();
      if (onCancel) onCancel();
    }
  });

  // ESCキーで閉じる
  const handleEscape = e => {
    if (e.key === 'Escape') {
      cleanup();
      if (onCancel) onCancel();
      document.removeEventListener('keydown', handleEscape);
    }
  };

  document.addEventListener('keydown', handleEscape);
};

/**
 * レガシーalert置換
 * @param {string} message
 */
export const showAlert = message => {
  showInfo(message, 5000);
};

/**
 * レガシーconfirm置換
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export const showConfirmDialog = message => {
  return new Promise(resolve => {
    showConfirm(
      message,
      () => resolve(true),
      () => resolve(false)
    );
  });
};

// DOM読み込み完了時に初期化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationSystem);
  } else {
    initNotificationSystem();
  }
}

export default {
  show: showNotification,
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  confirm: showConfirm,
  alert: showAlert,
  confirmDialog: showConfirmDialog,
  init: initNotificationSystem,
};
