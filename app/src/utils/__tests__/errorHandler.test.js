/**
 * errorHandler ユーティリティの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import {
  handleApiError,
  handleValidationError,
  handleNetworkError,
  createErrorContext,
  logError,
  ErrorBoundary,
} from '../errorHandler';

// モック設定
jest.mock('../logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../notifications', () => ({
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('handleApiError', () => {
    test('400エラーの処理', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: '入力内容に誤りがあります',
            errors: {
              email: ['メールアドレスが不正です'],
              password: ['パスワードが短すぎます'],
            },
          },
        },
      };

      const result = handleApiError(error);

      expect(result.type).toBe('validation');
      expect(result.message).toBe('入力内容に誤りがあります');
      expect(result.details.errors).toEqual(error.response.data.errors);
      expect(result.statusCode).toBe(400);
    });

    test('401認証エラーの処理', () => {
      const error = {
        response: {
          status: 401,
          data: {
            message: '認証が必要です',
          },
        },
      };

      const result = handleApiError(error);

      expect(result.type).toBe('authentication');
      expect(result.message).toBe('認証が必要です');
      expect(result.statusCode).toBe(401);
      expect(result.shouldRedirect).toBe(true);
    });

    test('403権限エラーの処理', () => {
      const error = {
        response: {
          status: 403,
          data: {
            message: 'この操作を実行する権限がありません',
          },
        },
      };

      const result = handleApiError(error);

      expect(result.type).toBe('authorization');
      expect(result.message).toBe('この操作を実行する権限がありません');
      expect(result.statusCode).toBe(403);
    });

    test('404リソース未発見エラーの処理', () => {
      const error = {
        response: {
          status: 404,
          data: {
            message: 'リソースが見つかりません',
          },
        },
      };

      const result = handleApiError(error);

      expect(result.type).toBe('not_found');
      expect(result.message).toBe('リソースが見つかりません');
      expect(result.statusCode).toBe(404);
    });

    test('500サーバーエラーの処理', () => {
      const error = {
        response: {
          status: 500,
          data: {
            message: 'サーバー内部エラー',
          },
        },
      };

      const result = handleApiError(error);

      expect(result.type).toBe('server');
      expect(result.message).toBe('サーバー内部エラー');
      expect(result.statusCode).toBe(500);
      expect(result.severity).toBe('high');
    });

    test('ネツワークエラーの処理', () => {
      const error = {
        request: {},
        message: 'Network Error',
      };

      const result = handleApiError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
      expect(result.isRetriable).toBe(true);
    });

    test('不明なエラーの処理', () => {
      const error = {
        message: 'Unknown error',
      };

      const result = handleApiError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Unknown error');
      expect(result.severity).toBe('medium');
    });

    test('エラーオブジェクトがnull/undefinedの場合', () => {
      const result1 = handleApiError(null);
      const result2 = handleApiError(undefined);

      expect(result1.type).toBe('unknown');
      expect(result1.message).toContain('不明なエラー');
      
      expect(result2.type).toBe('unknown');
      expect(result2.message).toContain('不明なエラー');
    });
  });

  describe('handleValidationError', () => {
    test('フィールドバリデーションエラー', () => {
      const errors = {
        email: ['メールアドレスが不正です'],
        password: ['パスワードが短すぎます', 'パスワードに数字が含まれていません'],
      };

      const result = handleValidationError(errors);

      expect(result.type).toBe('validation');
      expect(result.fields).toEqual(errors);
      expect(result.count).toBe(2);
      expect(result.message).toContain('2件の入力エラー');
    });

    test('単一フィールドのエラー', () => {
      const errors = {
        email: ['メールアドレスが不正です'],
      };

      const result = handleValidationError(errors);

      expect(result.count).toBe(1);
      expect(result.message).toContain('1件の入力エラー');
    });

    test('空のエラーオブジェクト', () => {
      const result = handleValidationError({});

      expect(result.count).toBe(0);
      expect(result.message).toContain('バリデーションエラー');
    });
  });

  describe('handleNetworkError', () => {
    test('タイムアウトエラー', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      const result = handleNetworkError(error);

      expect(result.type).toBe('timeout');
      expect(result.message).toContain('タイムアウト');
      expect(result.isRetriable).toBe(true);
      expect(result.retryDelay).toBe(5000);
    });

    test('接続エラー', () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8000',
      };

      const result = handleNetworkError(error);

      expect(result.type).toBe('connection');
      expect(result.message).toContain('サーバーに接続できません');
      expect(result.isRetriable).toBe(true);
    });

    test('一般的なネットワークエラー', () => {
      const error = {
        message: 'Network Error',
      };

      const result = handleNetworkError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
      expect(result.isRetriable).toBe(true);
    });
  });

  describe('createErrorContext', () => {
    test('エラーコンテキストの作成', () => {
      const context = createErrorContext({
        action: 'saveEstimate',
        component: 'EstimateCreator',
        userId: 'user-123',
        metadata: {
          estimateId: 'est-001',
          step: 'validation',
        },
      });

      expect(context.action).toBe('saveEstimate');
      expect(context.component).toBe('EstimateCreator');
      expect(context.userId).toBe('user-123');
      expect(context.metadata.estimateId).toBe('est-001');
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.sessionId).toBeDefined();
      expect(context.userAgent).toBeDefined();
      expect(context.url).toBeDefined();
    });

    test('最小限のコンテキスト', () => {
      const context = createErrorContext({
        action: 'test',
      });

      expect(context.action).toBe('test');
      expect(context.component).toBeUndefined();
      expect(context.userId).toBeUndefined();
      expect(context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('logError', () => {
    test('エラーログの出力', () => {
      const { log } = require('../logger');
      
      const error = new Error('テストエラー');
      const context = createErrorContext({ action: 'test' });

      logError(error, context);

      expect(log.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          message: 'テストエラー',
          stack: expect.any(String),
          context: expect.objectContaining({
            action: 'test',
          }),
        })
      );
    });

    test('非エラーオブジェクトのログ', () => {
      const { log } = require('../logger');
      
      const errorLikeObject = {
        message: 'カスタムエラー',
        code: 'CUSTOM_ERROR',
      };
      const context = createErrorContext({ action: 'test' });

      logError(errorLikeObject, context);

      expect(log.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: errorLikeObject,
          context: expect.objectContaining({
            action: 'test',
          }),
        })
      );
    });
  });

  describe('エラー処理の統合テスト', () => {
    test('完全なエラー処理フロー', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            message: '入力エラー',
            errors: {
              email: ['メールアドレスが不正です'],
            },
          },
        },
      };

      const errorResult = handleApiError(apiError);
      const context = createErrorContext({
        action: 'saveUser',
        component: 'UserForm',
        userId: 'user-123',
      });

      logError(apiError, context);

      expect(errorResult.type).toBe('validation');
      expect(errorResult.details.errors.email).toEqual(['メールアドレスが不正です']);

      const { log } = require('../logger');
      expect(log.error).toHaveBeenCalled();
    });

    test('リトライ可能エラーの判定', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout',
      };

      const networkResult = handleNetworkError(timeoutError);
      expect(networkResult.isRetriable).toBe(true);
      expect(networkResult.retryDelay).toBeGreaterThan(0);

      const serverError = {
        response: {
          status: 500,
          data: { message: 'サーバーエラー' },
        },
      };

      const apiResult = handleApiError(serverError);
      expect(apiResult.isRetriable).toBe(true);
    });

    test('リトライ不可エラーの判定', () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            message: 'バリデーションエラー',
            errors: {},
          },
        },
      };

      const result = handleApiError(validationError);
      expect(result.isRetriable).toBe(false);
    });
  });

  describe('エッジケース', () => {
    test('異常なレスポンスステータス', () => {
      const weirdError = {
        response: {
          status: 418, // I'm a teapot
          data: {
            message: "I'm a teapot",
          },
        },
      };

      const result = handleApiError(weirdError);
      expect(result.type).toBe('unknown');
      expect(result.statusCode).toBe(418);
    });

    test('レスポンスデータがない場合', () => {
      const emptyError = {
        response: {
          status: 500,
          data: null,
        },
      };

      const result = handleApiError(emptyError);
      expect(result.type).toBe('server');
      expect(result.message).toContain('サーバーエラー');
    });

    test('循環参照を含むエラーオブジェクト', () => {
      const circularError = {
        message: '循環参照エラー',
      };
      circularError.self = circularError; // 循環参照作成

      const context = createErrorContext({ action: 'test' });
      
      // 循環参照があってもエラーを起こさないことを確認
      expect(() => {
        logError(circularError, context);
      }).not.toThrow();
    });
  });
});
