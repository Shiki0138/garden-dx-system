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

// react-toastifyのモック
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
  },
  Bounce: 'Bounce',
}));

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
  let mockToast;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast = require('react-toastify').toast;
  });

  describe('showSuccess', () => {
    test('成功メッセージが正しく表示される', () => {
      const message = '保存が完了しました';

      showSuccess(message);

      expect(mockToast.success).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('オプション付きで成功メッセージが表示される', () => {
      const message = 'カスタム成功';
      const options = {
        autoClose: 5000,
        theme: 'dark',
      };

      showSuccess(message, options);

      expect(mockToast.success).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
        transition: 'Bounce',
      });
    });

    test('空のメッセージでもエラーが発生しない', () => {
      expect(() => {
        showSuccess('');
      }).not.toThrow();

      expect(mockToast.success).toHaveBeenCalledWith('', expect.any(Object));
    });

    test('非常に長いメッセージの処理', () => {
      const longMessage = 'a'.repeat(1000);

      showSuccess(longMessage);

      expect(mockToast.success).toHaveBeenCalledWith(longMessage, expect.any(Object));
    });
  });

  describe('showError', () => {
    test('エラーメッセージが正しく表示される', () => {
      const message = 'エラーが発生しました';

      showError(message);

      expect(mockToast.error).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('エラーオブジェクトからメッセージを抽出', () => {
      const error = new Error('詳細なエラーメッセージ');

      showError(error);

      expect(mockToast.error).toHaveBeenCalledWith('詳細なエラーメッセージ', expect.any(Object));
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

      expect(mockToast.error).toHaveBeenCalledWith('APIエラーメッセージ', expect.any(Object));
    });

    test('ネストされたエラーメッセージの処理', () => {
      const complexError = {
        error: {
          details: {
            message: 'ネストされたエラー',
          },
        },
      };

      showError(complexError);

      expect(mockToast.error).toHaveBeenCalled();
    });

    test('オプション付きでエラーメッセージが表示される', () => {
      const message = 'カスタムエラー';
      const options = {
        autoClose: false,
        theme: 'colored',
      };

      showError(message, options);

      expect(mockToast.error).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'colored',
        transition: 'Bounce',
      });
    });

    test('ログにエラーが記録される', () => {
      const { log } = require('../logger');
      const message = 'ログ記録テスト';

      showError(message);

      expect(log.error).toHaveBeenCalledWith('Notification Error:', message);
    });
  });

  describe('showWarning', () => {
    test('警告メッセージが正しく表示される', () => {
      const message = 'これは警告です';

      showWarning(message);

      expect(mockToast.warn).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('オプション付きで警告メッセージが表示される', () => {
      const message = 'カスタム警告';
      const options = {
        position: 'bottom-left',
        autoClose: 6000,
      };

      showWarning(message, options);

      expect(mockToast.warn).toHaveBeenCalledWith(message, {
        position: 'bottom-left',
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('ログに警告が記録される', () => {
      const { log } = require('../logger');
      const message = '警告ログテスト';

      showWarning(message);

      expect(log.warn).toHaveBeenCalledWith('Notification Warning:', message);
    });
  });

  describe('showInfo', () => {
    test('情報メッセージが正しく表示される', () => {
      const message = '情報をお知らせします';

      showInfo(message);

      expect(mockToast.info).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('オプション付きで情報メッセージが表示される', () => {
      const message = 'カスタム情報';
      const options = {
        hideProgressBar: true,
        closeOnClick: false,
      };

      showInfo(message, options);

      expect(mockToast.info).toHaveBeenCalledWith(message, {
        position: 'top-right',
        autoClose: 3500,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      });
    });

    test('ログに情報が記録される', () => {
      const { log } = require('../logger');
      const message = '情報ログテスト';

      showInfo(message);

      expect(log.info).toHaveBeenCalledWith('Notification Info:', message);
    });
  });

  describe('initNotificationSystem', () => {
    test('通知システムが初期化される', () => {
      const { log } = require('../logger');

      initNotificationSystem();

      expect(log.info).toHaveBeenCalledWith('Notification system initialized');
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
      clearAllNotifications();

      expect(mockToast.dismiss).toHaveBeenCalled();
    });

    test('ログにクリア操作が記録される', () => {
      const { log } = require('../logger');

      clearAllNotifications();

      expect(log.debug).toHaveBeenCalledWith('All notifications cleared');
    });
  });

  describe('エラーハンドリング', () => {
    test('toastライブラリエラー時の処理', () => {
      mockToast.success.mockImplementationOnce(() => {
        throw new Error('Toast error');
      });

      expect(() => {
        showSuccess('テストメッセージ');
      }).not.toThrow();
    });

    test('undefined/nullメッセージの処理', () => {
      expect(() => {
        showSuccess(null);
        showError(undefined);
        showWarning(null);
        showInfo(undefined);
      }).not.toThrow();
    });

    test('非文字列型メッセージの処理', () => {
      expect(() => {
        showSuccess(123);
        showError(true);
        showWarning({ message: 'object' });
        showInfo(['array', 'message']);
      }).not.toThrow();
    });
  });

  describe('オプションのマージ', () => {
    test('デフォルトオプションが正しく設定される', () => {
      showSuccess('テスト');

      const expectedOptions = {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        transition: 'Bounce',
      };

      expect(mockToast.success).toHaveBeenCalledWith('テスト', expectedOptions);
    });

    test('カスタムオプションがデフォルトをオーバーライドする', () => {
      const customOptions = {
        position: 'bottom-center',
        autoClose: 10000,
        theme: 'dark',
        customProperty: 'custom',
      };

      showSuccess('テスト', customOptions);

      const expectedOptions = {
        position: 'bottom-center',
        autoClose: 10000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
        transition: 'Bounce',
        customProperty: 'custom',
      };

      expect(mockToast.success).toHaveBeenCalledWith('テスト', expectedOptions);
    });

    test('部分的なオプション指定', () => {
      const partialOptions = {
        autoClose: false,
      };

      showError('テスト', partialOptions);

      expect(mockToast.error).toHaveBeenCalledWith('テスト', expect.objectContaining({
        autoClose: false,
        position: 'top-right', // デフォルト値が保持される
      }));
    });
  });

  describe('メッセージの種類別自動閉じ時間', () => {
    test('成功メッセージのデフォルト時間', () => {
      showSuccess('成功');
      expect(mockToast.success).toHaveBeenCalledWith('成功', expect.objectContaining({
        autoClose: 3000,
      }));
    });

    test('エラーメッセージのデフォルト時間', () => {
      showError('エラー');
      expect(mockToast.error).toHaveBeenCalledWith('エラー', expect.objectContaining({
        autoClose: 5000,
      }));
    });

    test('警告メッセージのデフォルト時間', () => {
      showWarning('警告');
      expect(mockToast.warn).toHaveBeenCalledWith('警告', expect.objectContaining({
        autoClose: 4000,
      }));
    });

    test('情報メッセージのデフォルト時間', () => {
      showInfo('情報');
      expect(mockToast.info).toHaveBeenCalledWith('情報', expect.objectContaining({
        autoClose: 3500,
      }));
    });
  });

  describe('アクセシビリティ', () => {
    test('通知メッセージにaria属性が含まれる', () => {
      showError('アクセシブルエラー');

      expect(mockToast.error).toHaveBeenCalledWith(
        'アクセシブルエラー',
        expect.objectContaining({
          role: 'alert',
          'aria-live': 'assertive',
        })
      );
    });

    test('成功メッセージにaria属性が含まれる', () => {
      showSuccess('アクセシブル成功');

      expect(mockToast.success).toHaveBeenCalledWith(
        'アクセシブル成功',
        expect.objectContaining({
          role: 'status',
          'aria-live': 'polite',
        })
      );
    });
  });

  describe('多言語対応', () => {
    test('日本語メッセージの処理', () => {
      const japaneseMessage = 'これは日本語のメッセージです';
      showInfo(japaneseMessage);

      expect(mockToast.info).toHaveBeenCalledWith(japaneseMessage, expect.any(Object));
    });

    test('英語メッセージの処理', () => {
      const englishMessage = 'This is an English message';
      showInfo(englishMessage);

      expect(mockToast.info).toHaveBeenCalledWith(englishMessage, expect.any(Object));
    });

    test('特殊文字を含むメッセージの処理', () => {
      const specialMessage = '🎉 成功しました! 🚀';
      showSuccess(specialMessage);

      expect(mockToast.success).toHaveBeenCalledWith(specialMessage, expect.any(Object));
    });
  });
});