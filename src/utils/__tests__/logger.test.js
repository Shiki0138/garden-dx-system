/**
 * logger ユーティリティの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import { log } from '../logger';

// console メソッドのモック
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数をリセット
    process.env.REACT_APP_ENVIRONMENT = 'development';
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
  });

  describe('log.error', () => {
    test('エラーメッセージが正しくログ出力される', () => {
      const message = 'テストエラーメッセージ';
      const data = { error: 'detailed error' };

      log.error(message, data);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        data
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(message),
        data
      );
    });

    test('データなしでエラーログが出力される', () => {
      const message = 'シンプルエラー';

      log.error(message);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        ''
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(message),
        ''
      );
    });

    test('本番環境でもエラーログは出力される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      log.error('本番エラー');

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('log.warn', () => {
    test('警告メッセージが正しくログ出力される', () => {
      const message = 'テスト警告メッセージ';
      const data = { warning: 'detailed warning' };

      log.warn(message, data);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        data
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(message),
        data
      );
    });

    test('本番環境では警告ログが抑制される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      log.warn('本番警告');

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('log.info', () => {
    test('情報メッセージが正しくログ出力される', () => {
      const message = 'テスト情報メッセージ';
      const data = { info: 'detailed info' };

      log.info(message, data);

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        data
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining(message),
        data
      );
    });

    test('本番環境では情報ログが抑制される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      log.info('本番情報');

      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  describe('log.debug', () => {
    test('デバッグメッセージが正しくログ出力される', () => {
      const message = 'テストデバッグメッセージ';
      const data = { debug: 'detailed debug' };

      // eslint-disable-next-line testing-library/no-debugging-utils
      log.debug(message, data);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        data
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(message),
        data
      );
    });

    test('本番環境ではデバッグログが抑制される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      // eslint-disable-next-line testing-library/no-debugging-utils
      log.debug('本番デバッグ');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('環境依存動作', () => {
    test('開発環境では全ログが出力される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'development';
      process.env.NODE_ENV = 'development';

      // eslint-disable-next-line testing-library/no-debugging-utils
      log.debug('デバッグ');
      log.info('情報');
      log.warn('警告');
      log.error('エラー');

      expect(mockConsoleLog).toHaveBeenCalled(); // debug
      expect(mockConsoleInfo).toHaveBeenCalled(); // info
      expect(mockConsoleWarn).toHaveBeenCalled(); // warn
      expect(mockConsoleError).toHaveBeenCalled(); // error
    });

    test('本番環境ではエラーのみ出力される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';

      // eslint-disable-next-line testing-library/no-debugging-utils
      log.debug('デバッグ');
      log.info('情報');
      log.warn('警告');
      log.error('エラー');

      expect(mockConsoleLog).not.toHaveBeenCalled(); // debug
      expect(mockConsoleInfo).not.toHaveBeenCalled(); // info
      expect(mockConsoleWarn).not.toHaveBeenCalled(); // warn
      expect(mockConsoleError).toHaveBeenCalled(); // error のみ
    });
  });

  describe('ログフォーマット', () => {
    test('タイムスタンプが含まれる', () => {
      log.error('フォーマットテスト');

      const logCall = mockConsoleError.mock.calls[0][0];
      // タイムスタンプのパターンをチェック（ISO形式）
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('ログレベルが含まれる', () => {
      log.warn('レベルテスト');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        ''
      );
    });

    test('メッセージが含まれる', () => {
      const testMessage = 'カスタムメッセージ';
      log.info(testMessage);

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining(testMessage),
        ''
      );
    });
  });

  describe('データ型サポート', () => {
    test('オブジェクトデータの出力', () => {
      const data = {
        user: 'test-user',
        action: 'login',
        timestamp: new Date(),
      };

      log.info('オブジェクトテスト', data);

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.any(String),
        data
      );
    });

    test('null及びundefinedの処理', () => {
      log.info('nullテスト', null);
      log.info('undefinedテスト', undefined);

      expect(mockConsoleInfo).toHaveBeenCalledTimes(2);
    });
  });
});