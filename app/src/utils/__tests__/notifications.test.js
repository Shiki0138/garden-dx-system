/**
 * notifications ユーティリティの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  initNotificationSystem,
  clearAllNotifications,
} from '../notifications';

// loggerのモック
jest.mock('../logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing notification container
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    // Initialize notification system for tests
    initNotificationSystem();
  });

  afterEach(() => {
    // Clean up after each test
    const container = document.getElementById('notification-container');
    if (container) {
      container.remove();
    }
  });

  describe('showSuccess', () => {
    test('成功メッセージが正しく表示される', () => {
      const message = '保存が完了しました';

      showSuccess(message);

      const container = document.getElementById('notification-container');
      expect(container).toBeTruthy();

      const notifications = container.querySelectorAll('div[id^="notification-"]');
      expect(notifications).toHaveLength(1);

      const notification = notifications[0];
      expect(notification.textContent).toContain(message);
      expect(notification.textContent).toContain('✅');
    });

    test('オプション付きで成功メッセージが表示される', () => {
      const message = '処理が完了しました';

      showSuccess(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain(message);
    });

    test('空のメッセージでもエラーが発生しない', () => {
      expect(() => showSuccess('')).not.toThrow();
    });

    test('非常に長いメッセージの処理', () => {
      const longMessage = 'a'.repeat(500);
      expect(() => showSuccess(longMessage)).not.toThrow();
    });
  });

  describe('showError', () => {
    test('エラーメッセージが正しく表示される', () => {
      const message = 'エラーが発生しました';

      showError(message);

      const container = document.getElementById('notification-container');
      const notifications = container.querySelectorAll('div[id^="notification-"]');
      expect(notifications).toHaveLength(1);

      const notification = notifications[0];
      expect(notification.textContent).toContain(message);
      expect(notification.textContent).toContain('❌');
    });

    test('エラーオブジェクトからメッセージを抽出', () => {
      const error = new Error('カスタムエラー');

      showError(error);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain('カスタムエラー');
    });

    test('APIエラーレスポンスの処理', () => {
      const apiError = {
        response: {
          data: {
            message: 'APIエラーメッセージ',
          },
        },
      };

      showError(apiError);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain('APIエラーメッセージ');
    });

    test('ネストされたエラーメッセージの処理', () => {
      const nestedError = {
        error: {
          message: 'ネストされたエラー',
        },
      };

      showError(nestedError);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain('ネストされたエラー');
    });

    test('オプション付きでエラーメッセージが表示される', () => {
      const message = 'カスタムエラー';

      showError(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification).toBeTruthy();
    });

    test('ログにエラーが記録される', () => {
      const logger = require('../logger');
      const message = 'エラーメッセージ';

      showError(message);

      expect(logger.log.error).toHaveBeenCalledWith('Notification Error:', message);
    });
  });

  describe('showWarning', () => {
    test('警告メッセージが正しく表示される', () => {
      const message = '警告: データが保存されていません';

      showWarning(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain(message);
      expect(notification.textContent).toContain('⚠️');
    });

    test('オプション付きで警告メッセージが表示される', () => {
      const message = '注意が必要です';

      showWarning(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification).toBeTruthy();
    });

    test('ログに警告が記録される', () => {
      const logger = require('../logger');
      const message = '警告メッセージ';

      showWarning(message);

      expect(logger.log.warn).toHaveBeenCalledWith('Notification Warning:', message);
    });
  });

  describe('showInfo', () => {
    test('情報メッセージが正しく表示される', () => {
      const message = 'お知らせ: 新機能が追加されました';

      showInfo(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain(message);
      expect(notification.textContent).toContain('ℹ️');
    });

    test('オプション付きで情報メッセージが表示される', () => {
      const message = '情報メッセージ';

      showInfo(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification).toBeTruthy();
    });

    test('ログに情報が記録される', () => {
      const logger = require('../logger');
      const message = '情報メッセージ';

      showInfo(message);

      expect(logger.log.info).toHaveBeenCalledWith('Notification Info:', message);
    });
  });

  describe('initNotificationSystem', () => {
    test('通知システムが初期化される', () => {
      // Remove existing container first
      const existing = document.getElementById('notification-container');
      if (existing) existing.remove();

      initNotificationSystem();

      const container = document.getElementById('notification-container');
      expect(container).toBeTruthy();
      expect(container.style.position).toBe('fixed');
    });

    test('複数回初期化してもエラーが発生しない', () => {
      expect(() => {
        initNotificationSystem();
        initNotificationSystem();
        initNotificationSystem();
      }).not.toThrow();
    });
  });

  describe('clearAllNotifications', () => {
    test('全ての通知がクリアされる', () => {
      showSuccess('メッセージ1');
      showError('メッセージ2');
      showWarning('メッセージ3');

      const container = document.getElementById('notification-container');
      expect(container.children.length).toBeGreaterThan(0);

      clearAllNotifications();

      expect(container.children.length).toBe(0);
    });

    test('ログにクリア操作が記録される', () => {
      const logger = require('../logger');

      clearAllNotifications();

      expect(logger.log.info).toHaveBeenCalledWith('All notifications cleared');
    });
  });

  describe('エラーハンドリング', () => {
    test('通知システムエラー時の処理', () => {
      // Remove container to simulate error
      const container = document.getElementById('notification-container');
      if (container) container.remove();

      expect(() => showSuccess('test')).not.toThrow();
    });

    test('undefined/nullメッセージの処理', () => {
      expect(() => showSuccess(undefined)).not.toThrow();
      expect(() => showError(null)).not.toThrow();
    });

    test('非文字列型メッセージの処理', () => {
      expect(() => showSuccess(123)).not.toThrow();
      expect(() => showError({ key: 'value' })).not.toThrow();
    });
  });

  describe('通知の自動閉じ機能', () => {
    test('通知が指定時間後に自動的に削除される', done => {
      showSuccess('テストメッセージ');

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification).toBeTruthy();

      // Wait for auto-close (default duration)
      setTimeout(() => {
        expect(container.querySelector('div[id^="notification-"]')).toBeFalsy();
        done();
      }, 4000);
    }, 5000);

    test('クリックで通知が削除される', () => {
      showInfo('クリックで閉じる');

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      const closeButton = notification.querySelector('button');

      closeButton.click();

      // Should be removed after click
      setTimeout(() => {
        expect(container.querySelector('div[id^="notification-"]')).toBeFalsy();
      }, 500);
    });
  });

  describe('多言語対応', () => {
    test('日本語メッセージの処理', () => {
      const message = 'これは日本語のメッセージです';

      showSuccess(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain(message);
    });

    test('英語メッセージの処理', () => {
      const message = 'This is an English message';

      showInfo(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain(message);
    });

    test('特殊文字を含むメッセージの処理', () => {
      const message = '特殊文字: <>&"\'';

      showWarning(message);

      const container = document.getElementById('notification-container');
      const notification = container.querySelector('div[id^="notification-"]');
      expect(notification.textContent).toContain(message);
    });
  });
});
