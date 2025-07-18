/**
 * apiErrorHandler ユーティリティの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import { checkEnvironmentVariables } from '../apiErrorHandler';

describe('apiErrorHandler', () => {
  let originalEnv;

  beforeEach(() => {
    // 元の環境変数を保存
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('checkEnvironmentVariables', () => {
    test('すべての必要な環境変数が設定されている場合', () => {
      // 必要な環境変数を設定
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test('一部の環境変数が不足している場合', () => {
      // 一部の環境変数のみ設定
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      delete process.env.REACT_APP_SUPABASE_URL;
      delete process.env.REACT_APP_SUPABASE_ANON_KEY;

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('REACT_APP_SUPABASE_URL');
      expect(result.missing).toContain('REACT_APP_SUPABASE_ANON_KEY');
    });

    test('すべての環境変数が不足している場合', () => {
      // 必要な環境変数をすべて削除
      delete process.env.REACT_APP_API_URL;
      delete process.env.REACT_APP_SUPABASE_URL;
      delete process.env.REACT_APP_SUPABASE_ANON_KEY;
      delete process.env.REACT_APP_ENVIRONMENT;

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('REACT_APP_API_URL');
      expect(result.missing).toContain('REACT_APP_SUPABASE_URL');
      expect(result.missing).toContain('REACT_APP_SUPABASE_ANON_KEY');
      expect(result.missing).toContain('REACT_APP_ENVIRONMENT');
    });

    test('オプション環境変数の警告', () => {
      // 必須環境変数は設定、オプションは未設定
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.REACT_APP_ENVIRONMENT = 'development';
      delete process.env.REACT_APP_DEMO_MODE;
      delete process.env.REACT_APP_PERFORMANCE_MONITORING;

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('本番環境での設定チェック', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.REACT_APP_API_URL = 'https://api.garden-dx.com';
      process.env.REACT_APP_SUPABASE_URL = 'https://prod.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'prod-anon-key';
      process.env.REACT_APP_PERFORMANCE_MONITORING = 'true';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('production');
    });

    test('開発環境での設定チェック', () => {
      process.env.REACT_APP_ENVIRONMENT = 'development';
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://dev.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'dev-anon-key';
      process.env.REACT_APP_DEMO_MODE = 'true';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('development');
    });

    test('環境変数の値の妥当性チェック', () => {
      // 不正な値を設定
      process.env.REACT_APP_API_URL = 'invalid-url';
      process.env.REACT_APP_SUPABASE_URL = 'not-a-url';
      process.env.REACT_APP_SUPABASE_ANON_KEY = '';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('REACT_APP_API_URL is not a valid URL');
      expect(result.errors).toContain('REACT_APP_SUPABASE_URL is not a valid URL');
    });

    test('デモモードの環境変数チェック', () => {
      process.env.REACT_APP_DEMO_MODE = 'true';
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://demo.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'demo-key';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.demoMode).toBe(true);
    });

    test('Supabase設定の詳細チェック', () => {
      process.env.REACT_APP_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.key';
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.supabaseConfig.url).toBe('https://abcdefghijklmnop.supabase.co');
      expect(result.supabaseConfig.hasValidAnonKey).toBe(true);
    });

    test('空文字列の環境変数の処理', () => {
      process.env.REACT_APP_API_URL = '';
      process.env.REACT_APP_SUPABASE_URL = '';
      process.env.REACT_APP_SUPABASE_ANON_KEY = '';
      process.env.REACT_APP_ENVIRONMENT = '';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    test('設定の詳細情報が含まれる', () => {
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result).toHaveProperty('config');
      expect(result.config).toHaveProperty('apiUrl');
      expect(result.config).toHaveProperty('supabaseUrl');
      expect(result.config).toHaveProperty('environment');
    });

    test('セキュリティチェック', () => {
      // 本番環境でlocalhost URLを使用
      process.env.REACT_APP_ENVIRONMENT = 'production';
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'http://localhost:54321';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';

      const result = checkEnvironmentVariables();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Using localhost URLs in production environment');
    });

    test('パフォーマンス監視設定のチェック', () => {
      process.env.REACT_APP_PERFORMANCE_MONITORING = 'true';
      process.env.REACT_APP_API_URL = 'https://api.garden-dx.com';
      process.env.REACT_APP_SUPABASE_URL = 'https://prod.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'prod-key';
      process.env.REACT_APP_ENVIRONMENT = 'production';

      const result = checkEnvironmentVariables();

      expect(result.features.performanceMonitoring).toBe(true);
    });

    test('デフォルト値の適用', () => {
      // 一部の環境変数のみ設定
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
      delete process.env.REACT_APP_API_URL;
      delete process.env.REACT_APP_ENVIRONMENT;

      const result = checkEnvironmentVariables();

      expect(result.config.apiUrl).toBe('http://localhost:8000'); // デフォルト値
      expect(result.config.environment).toBe('development'); // デフォルト値
    });

    test('すべての環境変数タイプのチェック', () => {
      // すべてのタイプの環境変数を設定
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
      process.env.REACT_APP_ENVIRONMENT = 'development';
      process.env.REACT_APP_DEMO_MODE = 'true';
      process.env.REACT_APP_PERFORMANCE_MONITORING = 'false';
      process.env.REACT_APP_LOG_LEVEL = 'debug';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.config).toHaveProperty('logLevel');
      expect(result.features).toHaveProperty('demoMode');
      expect(result.features).toHaveProperty('performanceMonitoring');
    });
  });

  describe('エラー処理', () => {
    test('環境変数アクセスエラーの処理', () => {
      // process.envを一時的に無効化
      const originalProcessEnv = process.env;
      delete global.process.env;

      expect(() => {
        checkEnvironmentVariables();
      }).not.toThrow();

      // 復元
      global.process.env = originalProcessEnv;
    });

    test('不正な環境変数値の処理', () => {
      // eslint-disable-next-line no-script-url
      process.env.REACT_APP_API_URL = 'javascript:alert("xss")';
      process.env.REACT_APP_SUPABASE_URL = 'ftp://invalid-protocol.com';
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const result = checkEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('環境別設定', () => {
    test('テスト環境の設定', () => {
      process.env.REACT_APP_ENVIRONMENT = 'test';
      process.env.REACT_APP_API_URL = 'http://localhost:8000';
      process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';

      const result = checkEnvironmentVariables();

      expect(result.environment).toBe('test');
      expect(result.isValid).toBe(true);
    });

    test('ステージング環境の設定', () => {
      process.env.REACT_APP_ENVIRONMENT = 'staging';
      process.env.REACT_APP_API_URL = 'https://staging-api.garden-dx.com';
      process.env.REACT_APP_SUPABASE_URL = 'https://staging.supabase.co';
      process.env.REACT_APP_SUPABASE_ANON_KEY = 'staging-key';

      const result = checkEnvironmentVariables();

      expect(result.environment).toBe('staging');
      expect(result.isValid).toBe(true);
    });
  });
});
