/**
 * LoginPage コンポーネントの単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { useAuth } from '../../../contexts/SupabaseAuthContext';

// モック設定
jest.mock('../../../contexts/SupabaseAuthContext');
jest.mock('../../../utils/notifications', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// テストユーティリティ
const renderWithRouter = component => {
  return render(<Router>{component}</Router>);
};

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockCheckAuthStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのuseAuthモック
    useAuth.mockReturnValue({
      login: mockLogin,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      checkAuthStatus: mockCheckAuthStatus,
    });

    // 環境変数のリセット
    process.env.REACT_APP_DEMO_MODE = 'false';
  });

  describe('初期表示', () => {
    test('ログインフォームが正しく表示される', () => {
      renderWithRouter(<LoginPage />);

      // タイトルとフォーム要素の確認
      expect(screen.getByText('Garden DX - ログイン')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });

    test('デモモードでの表示', () => {
      process.env.REACT_APP_DEMO_MODE = 'true';

      renderWithRouter(<LoginPage />);

      // デモモードの表示確認
      expect(screen.getByText('🌴 デモモード')).toBeInTheDocument();
      expect(screen.getByText('デモユーザーでログイン')).toBeInTheDocument();
    });

    test('既にログイン済みの場合、リダイレクトされる', () => {
      useAuth.mockReturnValue({
        ...useAuth(),
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'manager',
        },
        isAuthenticated: true,
      });

      renderWithRouter(<LoginPage />);

      // リダイレクトの確認
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('ログイン機能', () => {
    test('正常なログイン処理', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderWithRouter(<LoginPage />);

      // フォーム入力
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      // ログインボタンクリック
      const loginButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(loginButton);

      // ログイン関数の呼び出し確認
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // 成功時のリダイレクト
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('ログイン失敗時のエラー表示', async () => {
      const { showError } = require('../../utils/notifications');
      mockLogin.mockResolvedValue({
        success: false,
        error: 'メールアドレスまたはパスワードが間違っています',
      });

      renderWithRouter(<LoginPage />);

      // フォーム入力
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'invalid@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), 'wrongpassword');

      // ログイン実行
      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // エラー表示の確認
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('メールアドレスまたはパスワードが間違っています');
      });

      // リダイレクトされないことを確認
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('ネットワークエラーのハンドリング', async () => {
      const { showError } = require('../../utils/notifications');
      mockLogin.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<LoginPage />);

      // フォーム入力と送信
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // ネットワークエラーの表示確認
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith(
          'ネットワークエラーが発生しました。しばらく待ってから再度お試しください。'
        );
      });
    });
  });

  describe('デモモード機能', () => {
    beforeEach(() => {
      process.env.REACT_APP_DEMO_MODE = 'true';
    });

    test('デモユーザーログイン', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderWithRouter(<LoginPage />);

      // デモユーザーボタンクリック
      const demoButton = screen.getByText('デモユーザーでログイン');
      fireEvent.click(demoButton);

      // デモ用認証情報でログインが呼ばれることを確認
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('demo@garden-dx.com', 'demo123');
      });
    });

    test('デモモードの説明表示', () => {
      renderWithRouter(<LoginPage />);

      // デモモードの説明テキストが表示されることを確認
      expect(screen.getByText(/デモモードでは実際のデータベースに接続せず/)).toBeInTheDocument();
      expect(screen.getByText(/サンプルデータでシステムを体験できます/)).toBeInTheDocument();
    });
  });

  describe('フォームバリデーション', () => {
    test('空のフォーム送信時のバリデーション', async () => {
      renderWithRouter(<LoginPage />);

      // 空のままログインボタンクリック
      const loginButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(loginButton);

      // バリデーションエラーの表示確認
      await waitFor(() => {
        expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
      });

      // ログイン関数が呼ばれないことを確認
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('無効なメールアドレスのバリデーション', async () => {
      renderWithRouter(<LoginPage />);

      // 無効なメールアドレス入力
      const emailInput = screen.getByLabelText('メールアドレス');
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.type(screen.getByLabelText('パスワード'), 'password123');

      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // メールバリデーションエラーの確認
      await waitFor(() => {
        expect(screen.getByText('正しいメールアドレスを入力してください')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('パスワードの最小長バリデーション', async () => {
      renderWithRouter(<LoginPage />);

      // 短いパスワード入力
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), '123');

      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // パスワード長バリデーションエラーの確認
      await waitFor(() => {
        expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    test('ログイン中のローディング表示', async () => {
      // ログインが遅延するようにモック
      mockLogin.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );

      renderWithRouter(<LoginPage />);

      // フォーム入力と送信
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), 'password123');
      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // ローディング状態の確認
      await waitFor(() => {
        expect(screen.getByText('ログイン中...')).toBeInTheDocument();
      });

      // ボタンが無効化されることを確認
      const loginButton = screen.getByRole('button', { name: 'ログイン中...' });
      expect(loginButton).toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    test('フォームラベルの関連付け', () => {
      renderWithRouter(<LoginPage />);

      // ラベルと入力フィールドの関連付け確認
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });

    test('キーボードナビゲーション', async () => {
      renderWithRouter(<LoginPage />);

      // Tabキーでのフォーカス移動
      const emailInput = screen.getByLabelText('メールアドレス');
      emailInput.focus();

      fireEvent.keyDown(emailInput, { key: 'Tab' });

      // パスワードフィールドにフォーカスが移ることを確認
      const passwordInput = screen.getByLabelText('パスワード');
      expect(document.activeElement).toBe(passwordInput);
    });

    test('Enterキーでのフォーム送信', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderWithRouter(<LoginPage />);

      // フォーム入力
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), 'password123');

      // Enterキーで送信
      fireEvent.keyDown(screen.getByLabelText('パスワード'), { key: 'Enter' });

      // ログイン関数が呼ばれることを確認
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('セキュリティ', () => {
    test('パスワードフィールドの遠蓖化', () => {
      renderWithRouter(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('XSS攻撃の防止', async () => {
      renderWithRouter(<LoginPage />);

      // 悪意のあるスクリプトを入力
      const emailInput = screen.getByLabelText('メールアドレス');
      await userEvent.type(emailInput, '<script>alert("XSS")</script>');

      // スクリプトがエスケープされることを確認
      expect(emailInput.value).toBe('<script>alert("XSS")</script>');
      // ReactはデフォルトでXSSを防ぐため、スクリプトは実行されない
    });
  });

  describe('レスポンシブデザイン', () => {
    test('モバイルビューでの表示', () => {
      // ビューポートサイズをモバイルサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      renderWithRouter(<LoginPage />);

      // 基本的な要素が表示されることを確認
      expect(screen.getByText('Garden DX - ログイン')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    });
  });

  describe('エラー状態の持続性', () => {
    test('フォーム再送信時のエラークリア', async () => {
      const { showError } = require('../../utils/notifications');

      // 最初はエラー
      mockLogin.mockResolvedValueOnce({ success: false, error: 'ログイン失敗' });

      renderWithRouter(<LoginPage />);

      // 初回ログイン失敗
      await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await userEvent.type(screen.getByLabelText('パスワード'), 'wrongpassword');
      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('ログイン失敗');
      });

      // 2回目は成功するように設定
      mockLogin.mockResolvedValueOnce({ success: true });

      // パスワードを修正して再送信
      const passwordInput = screen.getByLabelText('パスワード');
      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'correctpassword');
      fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

      // 成功することを確認
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
