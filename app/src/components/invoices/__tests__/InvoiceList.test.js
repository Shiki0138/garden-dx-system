import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceList from '../InvoiceList';

import { invoiceApi } from '../../../api/invoiceApi';

// useAuth フックのモック
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'manager',
      user_metadata: { role: 'manager' },
    },
    isAuthenticated: true,
    loading: false,
  }),
  useInvoicePermissions: () => ({
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSend: true,
  }),
  ManagerOnlyComponent: ({ children, fallback }) => {
    return <div data-testid="manager-only-component">{children || fallback}</div>;
  },
  ProtectedComponent: ({ children, fallback }) => {
    return <div data-testid="protected-component">{children || fallback}</div>;
  },
  PERMISSIONS: {
    INVOICE_CREATE: 'invoice:create',
    INVOICE_EDIT: 'invoice:edit',
    INVOICE_DELETE: 'invoice:delete',
    INVOICE_VIEW: 'invoice:view',
  },
}));

// APIモックの設定
jest.mock('../../../api/invoiceApi', () => ({
  invoiceApi: {
    getInvoices: jest.fn(),
    updateInvoiceStatus: jest.fn(),
    downloadInvoicePDF: jest.fn(),
  },
}));

// React Router モック
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// テストデータ
const mockInvoices = [
  {
    id: 1,
    invoice_number: 'INV-2024-001',
    customer_name: '田中造園株式会社',
    project_name: '新宿オフィスビル庭園工事',
    invoice_date: '2024-06-15',
    due_date: '2024-07-15',
    total_amount: 1250000,
    status: '送付済',
    payment_status: '未払い',
  },
  {
    id: 2,
    invoice_number: 'INV-2024-002',
    customer_name: '山田工務店',
    project_name: '住宅庭園設計・施工',
    invoice_date: '2024-06-20',
    due_date: '2024-07-20',
    total_amount: 850000,
    status: '未送付',
    payment_status: '未払い',
  },
];

describe('InvoiceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invoiceApi.getInvoices.mockResolvedValue({
      items: mockInvoices,
      total: 2,
      page: 1,
      per_page: 20,
      pages: 1,
    });
  });

  test('請求書一覧が正しく表示される', async () => {
    render(<InvoiceList />);

    // ローディング表示の確認
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    // 請求書一覧の表示を待機
    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // タイトルとボタンの確認
    expect(screen.getByText('請求書管理')).toBeInTheDocument();
    expect(screen.getByText('新規請求書作成')).toBeInTheDocument();

    // 請求書データの表示確認
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
    expect(screen.getByText('田中造園株式会社')).toBeInTheDocument();
    expect(screen.getByText('新宿オフィスビル庭園工事')).toBeInTheDocument();
    expect(screen.getByText('¥1,250,000')).toBeInTheDocument();

    expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
    expect(screen.getByText('山田工務店')).toBeInTheDocument();
    expect(screen.getByText('住宅庭園設計・施工')).toBeInTheDocument();
    expect(screen.getByText('¥850,000')).toBeInTheDocument();
  });

  test('ステータスフィルタが機能する', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // ステータスフィルタの変更
    const statusFilter = screen.getByDisplayValue('すべて');
    fireEvent.change(statusFilter, { target: { value: '未送付' } });

    // APIが再呼び出しされることを確認
    await waitFor(() => {
      expect(invoiceApi.getInvoices).toHaveBeenCalledTimes(2);
    });
  });

  test('検索機能が動作する', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 検索入力
    const searchInput = screen.getByPlaceholderText('顧客名・案件名・請求書番号で検索');
    fireEvent.change(searchInput, { target: { value: '田中' } });

    // 検索結果の確認（デバウンス後）
    await waitFor(
      () => {
        expect(invoiceApi.getInvoices).toHaveBeenCalledWith(
          expect.objectContaining({
            search_term: '田中',
          })
        );
      },
      { timeout: 2000 }
    );
  });

  test('新規請求書作成ボタンクリック', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 新規作成ボタンのクリック
    const createButton = screen.getByText('新規請求書作成');
    fireEvent.click(createButton);

    // ナビゲーションの確認
    expect(mockNavigate).toHaveBeenCalledWith('/invoices/create');
  });

  test('請求書詳細ボタンクリック', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 詳細ボタンのクリック
    const detailButtons = screen.getAllByText('詳細');
    fireEvent.click(detailButtons[0]);

    // ナビゲーションの確認
    expect(mockNavigate).toHaveBeenCalledWith('/invoices/1');
  });

  test('PDFダウンロード機能', async () => {
    // PDF Blobの作成
    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    invoiceApi.downloadInvoicePDF.mockResolvedValue(mockBlob);

    // URL.createObjectURLのモック
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // PDFボタンのクリック
    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    // PDF生成APIの呼び出し確認
    await waitFor(() => {
      expect(invoiceApi.downloadInvoicePDF).toHaveBeenCalledWith(1);
    });

    // URL.createObjectURLの呼び出し確認
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
  });

  test('ステータスバッジの色が正しく表示される', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // ステータスバッジの確認
    const sentBadge = screen.getByText('送付済');
    const draftBadge = screen.getByText('未送付');

    expect(sentBadge).toHaveStyle('background: #3498db');
    expect(draftBadge).toHaveStyle('background: #f39c12');
  });

  test('エラーハンドリング', async () => {
    // APIエラーをモック
    const errorMessage = 'Network Error';
    invoiceApi.getInvoices.mockRejectedValue(new Error(errorMessage));

    // console.errorをモック
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<InvoiceList />);

    // エラーログの確認
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '請求書データの取得に失敗しました:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  test('空のデータ状態', async () => {
    // 空のデータをモック
    invoiceApi.getInvoices.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: 20,
      pages: 0,
    });

    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 空状態のメッセージ確認
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  test('通貨フォーマットが正しく動作する', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 通貨フォーマットの確認
    expect(screen.getByText('¥1,250,000')).toBeInTheDocument();
    expect(screen.getByText('¥850,000')).toBeInTheDocument();
  });

  test('日付フォーマットが正しく動作する', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('請求書管理')).toBeInTheDocument();
    });

    // 日付フォーマットの確認
    expect(screen.getByText('2024/6/15')).toBeInTheDocument();
    expect(screen.getByText('2024/7/15')).toBeInTheDocument();
    expect(screen.getByText('2024/6/20')).toBeInTheDocument();
    expect(screen.getByText('2024/7/20')).toBeInTheDocument();
  });
});
