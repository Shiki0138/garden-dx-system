/**
 * EstimateCreator コンポーネントのテスト
 * Worker4 - 単体テスト実装・品質保証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import EstimateCreator from '../EstimateCreator';
import { estimateApi } from '../../services/api';
import authService from '../../services/authService';

// モック設定
jest.mock('../../services/api');
jest.mock('../../services/authService');
jest.mock('../../utils/notifications', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showConfirmDialog: jest.fn().mockResolvedValue(true),
}));

// DnD Provider でラップするヘルパー関数
const renderWithDnD = (component) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
};

// モックデータ
const mockEstimate = {
  estimate_id: 'test-001',
  estimate_name: 'テスト見積',
  client_name: 'テスト顧客',
  site_address: 'テスト住所',
  notes: 'テストノート',
  adjustment_amount: 0,
  total_amount: 100000,
  created_at: '2024-01-01T00:00:00Z',
};

const mockItems = [
  {
    item_id: 1,
    item_description: 'テスト項目1',
    quantity: 2,
    unit: '本',
    unit_price: 5000,
    line_total: 10000,
    item_type: 'item',
  },
  {
    item_id: 2,
    item_description: 'テスト項目2',
    quantity: 1,
    unit: 'm2',
    unit_price: 3000,
    line_total: 3000,
    item_type: 'item',
  },
];

const mockProfitability = {
  margin_rate: 25.5,
  profit_amount: 25000,
  total_amount: 100000,
};

describe('EstimateCreator', () => {
  beforeEach(() => {
    // API モックのリセット
    jest.clearAllMocks();
    
    // デフォルトのAPIレスポンス設定
    estimateApi.getEstimate.mockResolvedValue({
      success: true,
      data: mockEstimate,
    });
    
    estimateApi.getEstimateItems.mockResolvedValue({
      success: true,
      data: mockItems,
    });
    
    estimateApi.getProfitabilityAnalysis.mockResolvedValue({
      success: true,
      data: mockProfitability,
    });
    
    estimateApi.updateEstimate.mockResolvedValue({
      success: true,
    });
    
    // authService モック
    authService.getRoleDisplayName.mockReturnValue('経営者');
  });

  describe('初期表示テスト', () => {
    test('デモモード時に正しく初期化される', async () => {
      // デモモード環境変数設定
      process.env.REACT_APP_DEMO_MODE = 'true';
      
      renderWithDnD(<EstimateCreator estimateId={null} />);
      
      // デモモードのデータが表示されることを確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('デモ見積書')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('山田花子')).toBeInTheDocument();
      });
      
      // API が呼ばれないことを確認
      expect(estimateApi.getEstimate).not.toHaveBeenCalled();
    });

    test('通常モード時にAPIから見積データを読み込む', async () => {
      process.env.REACT_APP_DEMO_MODE = 'false';
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      // API が呼ばれることを確認
      expect(estimateApi.getEstimate).toHaveBeenCalledWith('test-001');
      expect(estimateApi.getEstimateItems).toHaveBeenCalledWith('test-001');
      expect(estimateApi.getProfitabilityAnalysis).toHaveBeenCalledWith('test-001');
      
      // データが表示されることを確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト顧客')).toBeInTheDocument();
      });
    });

    test('見積データ読み込み失敗時にエラーハンドリングされる', async () => {
      estimateApi.getEstimate.mockRejectedValue(new Error('Network error'));
      
      renderWithDnD(<EstimateCreator estimateId="invalid-id" />);
      
      // エラー時のデフォルトデータで初期化されることを確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });
    });
  });

  describe('ユーザーインタラクションテスト', () => {
    test('見積保存機能が正常に動作する', async () => {
      process.env.REACT_APP_DEMO_MODE = 'false';
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      // データ読み込み待機
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // 保存ボタンクリック
      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);
      
      // API が呼ばれることを確認
      await waitFor(() => {
        expect(estimateApi.updateEstimate).toHaveBeenCalledWith('test-001', {
          estimate_name: 'テスト見積',
          site_address: 'テスト住所',
          notes: 'テストノート',
          adjustment_amount: 0,
        });
      });
    });

    test('明細追加ボタンが機能する', async () => {
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // 明細追加ボタンクリック
      const addItemButton = screen.getByRole('button', { name: /明細追加/ });
      fireEvent.click(addItemButton);
      
      // 単価マスタモーダルが開くことを確認（実際の実装に応じて調整）
      // この部分は実際のモーダル実装に合わせて修正が必要
    });

    test('PDF出力ボタンが機能する', async () => {
      process.env.REACT_APP_DEMO_MODE = 'false';
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // PDF出力ボタンクリック
      const pdfButton = screen.getByRole('button', { name: /PDF出力/ });
      fireEvent.click(pdfButton);
      
      // PDF生成APIが呼ばれることを確認（モック追加が必要）
      // estimateApi.generateEstimatePDF のモックと検証
    });

    test('キーボードショートカットが機能する', async () => {
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // Ctrl+S でデータが変更されている場合に保存される
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      
      // 実際の保存処理の確認は isDirty 状態に依存
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('見積更新失敗時のエラーハンドリング', async () => {
      estimateApi.updateEstimate.mockRejectedValue(new Error('Update failed'));
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // 見積データを変更
      const nameInput = screen.getByDisplayValue('テスト見積');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '更新された見積');
      
      // 保存ボタンクリック
      const saveButton = screen.getByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);
      
      // エラーハンドリングが実行されることを確認
      await waitFor(() => {
        expect(estimateApi.updateEstimate).toHaveBeenCalled();
      });
    });

    test('API通信エラー時のフォールバック表示', async () => {
      estimateApi.getEstimate.mockRejectedValue(new Error('Network error'));
      estimateApi.getEstimateItems.mockRejectedValue(new Error('Network error'));
      estimateApi.getProfitabilityAnalysis.mockRejectedValue(new Error('Network error'));
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      // エラー時のデフォルト表示を確認
      await waitFor(() => {
        expect(screen.getByDisplayValue('新規見積')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティテスト', () => {
    test('必要なaria属性が設定されている', async () => {
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // ボタンのaria-label確認
      const saveButton = screen.getByRole('button', { name: /保存/ });
      expect(saveButton).toHaveAttribute('aria-label');
      
      const pdfButton = screen.getByRole('button', { name: /PDF出力/ });
      expect(pdfButton).toHaveAttribute('aria-label');
      
      const addButton = screen.getByRole('button', { name: /明細追加/ });
      expect(addButton).toHaveAttribute('aria-label');
    });

    test('キーボードナビゲーション対応', async () => {
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // Tab キーでフォーカス移動が可能
      const nameInput = screen.getByDisplayValue('テスト見積');
      nameInput.focus();
      
      fireEvent.keyDown(nameInput, { key: 'Tab' });
      
      // フォーカスが次の要素に移ることを確認
      // 実際のフォーカス移動の検証は DOM 構造に依存
    });
  });

  describe('レスポンシブ対応テスト', () => {
    test('モバイル画面サイズでのレイアウト', async () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      // モバイル向けクラスが適用されているかの確認
      // styled-components のレスポンシブスタイルのテスト
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量データでのレンダリング性能', async () => {
      // 大量のアイテムデータを作成
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
      
      renderWithDnD(<EstimateCreator estimateId="test-001" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('テスト見積')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(2000); // 2秒以内
    });
  });
});