/**
 * App コンポーネントの包括的単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// すべての依存関係をモック
jest.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    checkAuthStatus: jest.fn(),
  }),
}));

jest.mock('../contexts/SupabaseAuthContext', () => ({
  SupabaseAuthProvider: ({ children }) => (
    <div data-testid="supabase-auth-provider">{children}</div>
  ),
}));

jest.mock('../contexts/DemoModeContext', () => ({
  DemoModeProvider: ({ children }) => <div data-testid="demo-mode-provider">{children}</div>,
  useDemoMode: () => ({
    isDemoMode: false,
    setDemoMode: jest.fn(),
  }),
}));

jest.mock('../components/ErrorBoundary', () => {
  return function ErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

jest.mock('../components/ui/ErrorBoundary', () => ({
  LandscapingErrorBoundary: ({ children }) => (
    <div data-testid="landscaping-error-boundary">{children}</div>
  ),
}));

jest.mock('../components/DemoBanner', () => {
  return function DemoBanner() {
    return <div data-testid="demo-banner">デモモードバナー</div>;
  };
});

jest.mock('../components/EstimateCreator', () => {
  return function EstimateCreator() {
    return <div data-testid="estimate-creator">見積作成</div>;
  };
});

jest.mock('../components/invoices/InvoiceForm', () => {
  return function InvoiceForm() {
    return <div data-testid="invoice-form">請求書フォーム</div>;
  };
});

jest.mock('../components/invoices/InvoiceList', () => {
  return function InvoiceList() {
    return <div data-testid="invoice-list">請求書一覧</div>;
  };
});

jest.mock('../components/DemoUITest', () => {
  return function DemoUITest() {
    return <div data-testid="demo-ui-test">デモUIテスト</div>;
  };
});

jest.mock('../components/DemoLandingPage', () => {
  return function DemoLandingPage() {
    return <div data-testid="demo-landing-page">デモランディングページ</div>;
  };
});

jest.mock('../components/EstimateWizardTest', () => {
  return function EstimateWizardTest() {
    return <div data-testid="estimate-wizard-test">見積ウィザードテスト</div>;
  };
});

jest.mock('../components/EstimateWizardPro', () => {
  return function EstimateWizardPro() {
    return <div data-testid="estimate-wizard-pro">見積ウィザードPro</div>;
  };
});

jest.mock('../components/MobileTestPage', () => {
  return function MobileTestPage() {
    return <div data-testid="mobile-test-page">モバイルテストページ</div>;
  };
});

jest.mock('../components/PDFGenerator', () => {
  return function PDFGenerator() {
    return <div data-testid="pdf-generator">PDF生成</div>;
  };
});

jest.mock('../test/PDFGeneratorTest', () => {
  return function PDFGeneratorTest() {
    return <div data-testid="pdf-generator-test">PDF生成テスト</div>;
  };
});

jest.mock('../components/auth/LoginPage', () => {
  return function LoginPage() {
    return <div data-testid="login-page">ログインページ</div>;
  };
});

jest.mock('../components/auth/ProtectedRoute', () => {
  return function ProtectedRoute({ children, requireRole }) {
    return (
      <div data-testid="protected-route" data-require-role={requireRole}>
        {children}
      </div>
    );
  };
});

jest.mock('../components/ConnectionTest', () => {
  return function ConnectionTest() {
    return <div data-testid="connection-test">接続テスト</div>;
  };
});

jest.mock('../components/ProjectManagement', () => {
  return function ProjectManagement() {
    return <div data-testid="project-management">プロジェクト管理</div>;
  };
});

jest.mock('../utils/apiErrorHandler', () => ({
  checkEnvironmentVariables: jest.fn(() => ({
    isValid: true,
    missing: [],
  })),
}));

jest.mock('../utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/notifications', () => ({
  initNotificationSystem: jest.fn(),
}));

jest.mock('../utils/monitoring', () => ({
  initMonitoring: jest.fn(),
}));

jest.mock('../components/DebugInfo', () => {
  return function DebugInfo() {
    return <div data-testid="debug-info">デバッグ情報</div>;
  };
});

// React Router モック
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数をリセット
    process.env.REACT_APP_DEMO_MODE = 'false';
    process.env.REACT_APP_PERFORMANCE_MONITORING = 'false';
    process.env.REACT_APP_ENVIRONMENT = 'development';

    // DOM要素をリセット
    document.body.className = '';
  });

  afterEach(() => {
    // DOM クリーンアップ
    document.body.className = '';
  });

  describe('初期表示', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<App />);

      // プロバイダーコンポーネントの確認
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('demo-mode-provider')).toBeInTheDocument();
      expect(screen.getByTestId('supabase-auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();

      // ナビゲーションの確認
      expect(screen.getByText('🏡 庭想システム')).toBeInTheDocument();
      expect(screen.getByText('🚀 見積ウィザード')).toBeInTheDocument();
      expect(screen.getByText('⭐ 本番ウィザード')).toBeInTheDocument();
      expect(screen.getByText('📄 PDF生成')).toBeInTheDocument();
      expect(screen.getByText('🏠 ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('🌿 プロジェクト管理')).toBeInTheDocument();
      expect(screen.getByText('🔧 接続テスト')).toBeInTheDocument();
      expect(screen.getByText('📱 モバイルテスト')).toBeInTheDocument();
      expect(screen.getByText('📄 PDF動作テスト')).toBeInTheDocument();
    });

    test('デフォルトルートでダッシュボードにリダイレクトされる', () => {
      render(<App />);

      // ダッシュボードコンポーネントが表示されることを確認
      expect(screen.getByTestId('estimate-creator')).toBeInTheDocument();
    });
  });

  describe('デモモード時の動作', () => {
    test('デモモード時にバナーが表示される', () => {
      // デモモードのモックを変更
      jest.doMock('../contexts/DemoModeContext', () => ({
        DemoModeProvider: ({ children }) => <div data-testid="demo-mode-provider">{children}</div>,
        useDemoMode: () => ({
          isDemoMode: true,
          setDemoMode: jest.fn(),
        }),
      }));

      process.env.REACT_APP_DEMO_MODE = 'true';

      // 再インポートが必要
      jest.resetModules();
      const AppComponent = require('../App').default;

      render(<AppComponent />);

      expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    });

    test('デモモード時にbodyクラスが設定される', async () => {
      // デモモードのモックを変更
      jest.doMock('../contexts/DemoModeContext', () => ({
        DemoModeProvider: ({ children }) => <div data-testid="demo-mode-provider">{children}</div>,
        useDemoMode: () => ({
          isDemoMode: true,
          setDemoMode: jest.fn(),
        }),
      }));

      jest.resetModules();
      const AppComponent = require('../App').default;

      render(<AppComponent />);

      await waitFor(() => {
        expect(document.body.classList.contains('demo-mode')).toBe(true);
      });
    });
  });

  describe('ルーティング', () => {
    test('接続テストページにアクセス可能', () => {
      // ダイレクトにルートをテスト
      window.history.pushState({}, 'Test page', '/test');
      render(<App />);

      expect(screen.getByTestId('connection-test')).toBeInTheDocument();
    });

    test('モバイルテストページにアクセス可能', () => {
      window.history.pushState({}, 'Test page', '/mobile-test');
      render(<App />);

      expect(screen.getByTestId('mobile-test-page')).toBeInTheDocument();
    });

    test('PDFテストページにアクセス可能', () => {
      window.history.pushState({}, 'Test page', '/pdf-test');
      render(<App />);

      expect(screen.getByTestId('pdf-generator-test')).toBeInTheDocument();
    });
  });

  describe('保護されたルート', () => {
    test('非デモモード時にProtectedRouteが適用される', () => {
      process.env.REACT_APP_DEMO_MODE = 'false';

      window.history.pushState({}, 'Test page', '/wizard');
      render(<App />);

      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('estimate-wizard-test')).toBeInTheDocument();
    });

    test('管理者権限が必要なルートでrequireRoleが設定される', () => {
      process.env.REACT_APP_DEMO_MODE = 'false';

      window.history.pushState({}, 'Test page', '/invoices/new');
      render(<App />);

      const protectedRoute = screen.getByTestId('protected-route');
      expect(protectedRoute).toHaveAttribute('data-require-role', 'manager');
    });
  });

  describe('システム初期化', () => {
    test('通知システムが初期化される', () => {
      const { initNotificationSystem } = require('../utils/notifications');

      render(<App />);

      expect(initNotificationSystem).toHaveBeenCalled();
    });

    test('本番環境でパフォーマンス監視が有効化される', () => {
      process.env.REACT_APP_PERFORMANCE_MONITORING = 'true';
      const { initMonitoring } = require('../utils/monitoring');

      render(<App />);

      expect(initMonitoring).toHaveBeenCalled();
    });

    test('開発環境で環境変数チェックが実行される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'development';
      const { checkEnvironmentVariables } = require('../utils/apiErrorHandler');

      render(<App />);

      expect(checkEnvironmentVariables).toHaveBeenCalled();
    });

    test('開発環境で環境変数不足時に警告ログが出力される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'development';

      const { checkEnvironmentVariables } = require('../utils/apiErrorHandler');
      const { log } = require('../utils/logger');

      checkEnvironmentVariables.mockReturnValue({
        isValid: false,
        missing: ['REACT_APP_API_URL', 'REACT_APP_SUPABASE_URL'],
      });

      render(<App />);

      expect(log.warn).toHaveBeenCalledWith('🚨 環境変数が不足しています:', [
        'REACT_APP_API_URL',
        'REACT_APP_SUPABASE_URL',
      ]);
    });

    test('本番環境でセットアップ完了ログが出力される', () => {
      process.env.REACT_APP_ENVIRONMENT = 'production';
      const { log } = require('../utils/logger');

      render(<App />);

      expect(log.info).toHaveBeenCalledWith('🚀 本番環境セットアップ完了 - Garden DX System');
    });
  });

  describe('エラーバウンダリー', () => {
    test('メインエラーバウンダリーが設定されている', () => {
      render(<App />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    test('ダッシュボードでLandscapingErrorBoundaryが設定されている', () => {
      render(<App />);

      expect(screen.getByTestId('landscaping-error-boundary')).toBeInTheDocument();
    });
  });

  describe('ナビゲーションリンク', () => {
    test('すべてのナビゲーションリンクが正しいhrefを持つ', () => {
      render(<App />);

      const wizardLink = screen.getByText('🚀 見積ウィザード').closest('a');
      expect(wizardLink).toHaveAttribute('href', '/wizard');

      const wizardProLink = screen.getByText('⭐ 本番ウィザード').closest('a');
      expect(wizardProLink).toHaveAttribute('href', '/wizard-pro');

      const pdfLink = screen.getByText('📄 PDF生成').closest('a');
      expect(pdfLink).toHaveAttribute('href', '/pdf');

      const dashboardLink = screen.getByText('🏠 ダッシュボード').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');

      const projectsLink = screen.getByText('🌿 プロジェクト管理').closest('a');
      expect(projectsLink).toHaveAttribute('href', '/projects');

      const testLink = screen.getByText('🔧 接続テスト').closest('a');
      expect(testLink).toHaveAttribute('href', '/test');

      const mobileTestLink = screen.getByText('📱 モバイルテスト').closest('a');
      expect(mobileTestLink).toHaveAttribute('href', '/mobile-test');

      const pdfTestLink = screen.getByText('📄 PDF動作テスト').closest('a');
      expect(pdfTestLink).toHaveAttribute('href', '/pdf-test');
    });

    test('ナビゲーションのスタイリングが適用されている', () => {
      render(<App />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({
        padding: '20px',
        background: '#4a7c59',
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
      });
    });
  });

  describe('条件付きレンダリング', () => {
    test('非デモモード時にログインページが表示される', () => {
      process.env.REACT_APP_DEMO_MODE = 'false';

      window.history.pushState({}, 'Test page', '/login');
      render(<App />);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    test('デモモード時にログインページが非表示になる', () => {
      process.env.REACT_APP_DEMO_MODE = 'true';

      window.history.pushState({}, 'Test page', '/login');
      render(<App />);

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('コンポーネントクリーンアップ', () => {
    test('アンマウント時にdemo-modeクラスが削除される', () => {
      // デモモードのモックを変更
      jest.doMock('../contexts/DemoModeContext', () => ({
        DemoModeProvider: ({ children }) => <div data-testid="demo-mode-provider">{children}</div>,
        useDemoMode: () => ({
          isDemoMode: true,
          setDemoMode: jest.fn(),
        }),
      }));

      jest.resetModules();
      const AppComponent = require('../App').default;

      const { unmount } = render(<AppComponent />);

      // コンポーネントをアンマウント
      unmount();

      expect(document.body.classList.contains('demo-mode')).toBe(false);
    });
  });

  describe('アクセシビリティ', () => {
    test('ナビゲーション要素にroleが設定されている', () => {
      render(<App />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    test('見出しが適切に設定されている', () => {
      render(<App />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('🏡 庭想システム');
    });

    test('リンクがアクセシブルなテキストを持つ', () => {
      render(<App />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveTextContent(/.+/); // 空でないテキストコンテンツ
      });
    });
  });

  describe('レスポンシブ動作', () => {
    test('モバイルビューポートでも基本機能が動作する', () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<App />);

      // 基本的な要素が表示されることを確認
      expect(screen.getByText('🏡 庭想システム')).toBeInTheDocument();
      expect(screen.getByTestId('estimate-creator')).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    test('コンポーネントの初期レンダリング時間', () => {
      const startTime = performance.now();

      render(<App />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(1000); // 1秒以内
    });
  });
});
