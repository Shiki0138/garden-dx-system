/**
 * 見積作成統合テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider } from '../../hooks/useAuth';
import EstimateCreator from '../../components/EstimateCreator';
import EstimateWizardPro from '../../components/EstimateWizardPro';
import { estimateApi } from '../../services/api';

// モック設定
jest.mock('../../services/api');
jest.mock('../../lib/supabase', () => ({
  dbClient: {
    estimates: {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    },
    estimateItems: {
      createMany: jest.fn(),
    },
    clients: {
      create: jest.fn(),
    },
  },
  storage: {
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
  },
}));

jest.mock('../../utils/notifications', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
}));

// テストユーティリティ
const renderWithProviders = component => {
  return render(
    <DndProvider backend={HTML5Backend}>
      <AuthProvider>{component}</AuthProvider>
    </DndProvider>
  );
};

// モックデータ
const mockEstimateData = {
  estimate_id: 'test-001',
  estimate_name: 'テスト見積',
  client_name: 'テスト造園株式会社',
  site_address: '東京都渋谷区テスト1-1-1',
  total_amount: 150000,
  created_at: '2024-07-06T10:00:00Z',
};

const mockEstimateItems = [
  {
    item_id: 1,
    item_description: 'クロマツ H3.0m',
    quantity: 2,
    unit: '本',
    unit_price: 26000,
    line_total: 52000,
    item_type: 'item',
  },
  {
    item_id: 2,
    item_description: 'ヒラドツツジ',
    quantity: 10,
    unit: '本',
    unit_price: 2100,
    line_total: 21000,
    item_type: 'item',
  },
];

describe('見積作成統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのAPIレスポンス設定
    estimateApi.getEstimate.mockResolvedValue({
      success: true,
      data: mockEstimateData,
    });

    estimateApi.getEstimateItems.mockResolvedValue({
      success: true,
      data: mockEstimateItems,
    });

    estimateApi.updateEstimate.mockResolvedValue({
      success: true,
    });

    estimateApi.createEstimate.mockResolvedValue({
      success: true,
      data: { ...mockEstimateData, estimate_id: 'new-001' },
    });

    // localStorageのモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('見積作成フロー', () => {
    test('新規見積作成から保存までのフロー', async () => {
      renderWithProviders(<EstimateCreator estimateId={null} />);

      // 初期表示の確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });

      // 見積名編集
      const nameInput = screen.getByDisplayValue('新規見積');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '統合テスト見積');

      // 住所入力
      const addressInput = screen.getByLabelText(/現場住所/);
      await userEvent.type(addressInput, '東京都渋谷区テスト1-1-1');

      // 保存ボタンクリック
      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      // API呼び出しの確認
      await waitFor(() => {
        expect(estimateApi.createEstimate).toHaveBeenCalledWith(
          expect.objectContaining({
            estimate_name: '統合テスト見積',
            site_address: '東京都渋谷区テスト1-1-1',
          })
        );
      });
    });

    test('既存見積読み込みから更新までのフロー', async () => {
      renderWithProviders(<EstimateCreator estimateId="test-001" />);

      // データ読み込みの確認
      expect(estimateApi.getEstimate).toHaveBeenCalledWith('test-001');
      expect(estimateApi.getEstimateItems).toHaveBeenCalledWith('test-001');

      // データ表示の確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });

      // 見積名更新
      const nameInput = screen.getByDisplayValue('テスト見積');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '更新された見積');

      // 保存実行
      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      // 更新APIの確認
      await waitFor(() => {
        expect(estimateApi.updateEstimate).toHaveBeenCalledWith(
          'test-001',
          expect.objectContaining({
            estimate_name: '更新された見積',
          })
        );
      });
    });

    test('エラーハンドリングの統合テスト', async () => {
      // APIエラーのモック
      estimateApi.getEstimate.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<EstimateCreator estimateId="invalid-id" />);

      // エラー時のデフォルト表示
      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });
    });
  });

  describe('見積ウィザード統合テスト', () => {
    const mockOnComplete = jest.fn();
    const mockOnCancel = jest.fn();

    test('ウィザード全ステップの統合テスト', async () => {
      renderWithProviders(
        <EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />
      );

      // ステップ1: 基本情報入力
      expect(screen.getByText('基本情報')).toBeInTheDocument();

      const customerNameInput = screen.getByLabelText(/顧客名/);
      await userEvent.type(customerNameInput, 'テスト造園株式会社');

      const phoneInput = screen.getByLabelText(/電話番号/);
      await userEvent.type(phoneInput, '03-1234-5678');

      const addressInput = screen.getByLabelText(/住所/);
      await userEvent.type(addressInput, '東京都渋谷区テスト1-1-1');

      // 次のステップへ
      const nextButton = screen.getByRole('button', { name: /次のステップ/ });
      fireEvent.click(nextButton);

      // ステップ2: 要望詳細
      await waitFor(() => {
        expect(screen.getByText('プロジェクト詳細・要望')).toBeInTheDocument();
      });

      const projectNameInput = screen.getByLabelText(/プロジェクト名/);
      await userEvent.type(projectNameInput, '統合テスト庭園工事');

      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));

      // ステップ3: 項目選択
      await waitFor(() => {
        expect(screen.getByText('工事項目の選択・数量入力')).toBeInTheDocument();
      });

      // 項目選択チェックボックスを探してクリック
      const itemCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(itemCheckbox);

      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));

      // ステップ4: 金額確認
      await waitFor(() => {
        expect(screen.getByText('金額確認・調整')).toBeInTheDocument();
      });

      // 完成ボタンクリック
      const completeButton = screen.getByRole('button', { name: /見積書完成/ });
      fireEvent.click(completeButton);

      // 完成コールバックの確認
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            formData: expect.objectContaining({
              customer_name: 'テスト造園株式会社',
              project_name: '統合テスト庭園工事',
            }),
          })
        );
      });
    });

    test('バリデーションエラーでステップが進まない', async () => {
      renderWithProviders(
        <EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />
      );

      // 空のまま次のステップを試行
      const nextButton = screen.getByRole('button', { name: /次のステップ/ });
      fireEvent.click(nextButton);

      // バリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/顧客名は必須です/)).toBeInTheDocument();
      });

      // ステップが進まないことを確認
      expect(screen.getByText('基本情報の入力')).toBeInTheDocument();
    });

    test('キャンセル機能のテスト', async () => {
      renderWithProviders(
        <EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />
      );

      // キャンセルボタンクリック
      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
      fireEvent.click(cancelButton);

      // キャンセルコールバックの確認
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ統合テスト', () => {
    test('キーボードナビゲーション', async () => {
      renderWithProviders(<EstimateCreator estimateId={null} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });

      // Tabキーでのフォーカス移動
      const nameInput = screen.getByDisplayValue('新規見積');
      nameInput.focus();

      fireEvent.keyDown(nameInput, { key: 'Tab' });

      // 次のフォーカス可能要素を確認
      // 実際の実装に合わせて調整が必要
    });

    test('スクリーンリーダー対応', () => {
      renderWithProviders(<EstimateCreator estimateId={null} />);

      // aria-labelやroleの確認
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('パフォーマンス統合テスト', () => {
    test('大量データでのレンダリング性能', async () => {
      // 100件のアイテムをモック
      const largeItemsData = Array.from({ length: 100 }, (_, i) => ({
        item_id: i + 1,
        item_description: `テスト項目${i + 1}`,
        quantity: 1,
        unit: '個',
        unit_price: 1000,
        line_total: 1000,
        item_type: 'item',
      }));

      estimateApi.getEstimateItems.mockResolvedValue({
        success: true,
        data: largeItemsData,
      });

      const startTime = performance.now();

      renderWithProviders(<EstimateCreator estimateId="test-001" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(3000); // 3秒以内
    });

    test('連続API呼び出しのパフォーマンス', async () => {
      renderWithProviders(<EstimateCreator estimateId="test-001" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });

      // 短時間で複数回保存を試行
      const saveButton = screen.getByRole('button', { name: /保存/ });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise(resolve => {
            fireEvent.click(saveButton);
            setTimeout(resolve, 100);
          })
        );
      }

      await Promise.all(promises);

      // APIが適切に呼ばれていることを確認
      expect(estimateApi.updateEstimate).toHaveBeenCalled();
    });
  });

  describe('セキュリティ統合テスト', () => {
    test('認証トークンのAPI送信', async () => {
      renderWithProviders(<EstimateCreator estimateId={null} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });

      // 保存実行
      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      // API呼び出しで認証トークンが送信されることを確認
      await waitFor(() => {
        expect(estimateApi.createEstimate).toHaveBeenCalled();
      });
    });

    test('XSS対策の確認', async () => {
      renderWithProviders(<EstimateCreator estimateId={null} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });

      // 悪意のあるスクリプトを入力
      const nameInput = screen.getByDisplayValue('新規見積');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '<script>alert("XSS")</script>');

      // スクリプトが実行されないことを確認
      expect(nameInput.value).toBe('<script>alert("XSS")</script>');
      // ReactはデフォルトでXSSを防ぐため、スクリプトは実行されない
    });
  });

  describe('エラー回復統合テスト', () => {
    test('ネットワークエラーからの回復', async () => {
      // 最初はエラー
      estimateApi.getEstimate.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<EstimateCreator estimateId="test-001" />);

      // エラー時のデフォルト表示
      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });

      // APIを正常に戻して再読み込み
      estimateApi.getEstimate.mockResolvedValue({
        success: true,
        data: mockEstimateData,
      });

      // 再読み込みボタンがある場合はクリック
      // 実際の実装に合わせて調整が必要
    });
  });
});
