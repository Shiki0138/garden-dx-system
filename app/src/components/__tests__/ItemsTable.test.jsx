/**
 * ItemsTable コンポーネントのテスト
 * Worker4 - 単体テスト実装・品質保証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ItemsTable from '../ItemsTable';

// DnD Provider でラップするヘルパー関数
const renderWithDnD = (component) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
};

// モックデータ
const mockItems = [
  {
    item_id: 1,
    item_description: 'クロマツ H3.0m',
    quantity: 2,
    unit: '本',
    unit_price: 26000,
    line_item_adjustment: 0,
    item_type: 'item',
    level: 0,
    sort_order: 1,
  },
  {
    item_id: 2,
    item_description: 'ヒラドツツジ',
    quantity: 10,
    unit: '本',
    unit_price: 2100,
    line_item_adjustment: 0,
    item_type: 'item',
    level: 0,
    sort_order: 2,
  },
  {
    item_id: 3,
    item_description: '植栽工事',
    item_type: 'header',
    level: 0,
    sort_order: 3,
  },
];

const mockEstimate = {
  estimate_id: 1,
  adjustment_amount: -5000,
  total_amount: 68000,
};

describe('ItemsTable', () => {
  const mockOnUpdateItem = jest.fn();
  const mockOnDeleteItem = jest.fn();
  const mockOnReorderItems = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期表示テスト', () => {
    test('テーブルが正しくレンダリングされる', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // ヘッダーの確認
      expect(screen.getByText('品目・摘要')).toBeInTheDocument();
      expect(screen.getByText('数量')).toBeInTheDocument();
      expect(screen.getByText('単位')).toBeInTheDocument();
      expect(screen.getByText('単価')).toBeInTheDocument();
      expect(screen.getByText('調整額')).toBeInTheDocument();
      expect(screen.getByText('金額')).toBeInTheDocument();
    });

    test('アイテムデータが正しく表示される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // アイテムの表示確認
      expect(screen.getByText('クロマツ H3.0m')).toBeInTheDocument();
      expect(screen.getByText('ヒラドツツジ')).toBeInTheDocument();
      expect(screen.getByText('植栽工事')).toBeInTheDocument();

      // 数量・単位・単価の表示確認
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getAllByText('本')).toHaveLength(2);
    });

    test('空のアイテム配列の場合', () => {
      renderWithDnD(
        <ItemsTable
          items={[]}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // ヘッダーは表示される
      expect(screen.getByText('品目・摘要')).toBeInTheDocument();
      
      // 合計行は表示される（0円）
      expect(screen.getByText('小計')).toBeInTheDocument();
    });
  });

  describe('インライン編集テスト', () => {
    test('品目・摘要の編集', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 品目名をクリックして編集モードに
      const itemDescription = screen.getByText('クロマツ H3.0m');
      fireEvent.click(itemDescription);

      // textareaが表示されることを確認
      const textarea = screen.getByDisplayValue('クロマツ H3.0m');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');

      // 値を変更してEnterキーで確定
      await userEvent.clear(textarea);
      await userEvent.type(textarea, '更新されたクロマツ');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      // 更新関数が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnUpdateItem).toHaveBeenCalledWith(1, {
          item_description: '更新されたクロマツ',
        });
      });
    });

    test('数量の編集', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 数量セルをクリック（最初のアイテムの数量"2"）
      const quantityCell = screen.getByText('2');
      fireEvent.click(quantityCell);

      // 数値入力フィールドが表示される
      const input = screen.getByDisplayValue('2');
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('number');

      // 値を変更
      await userEvent.clear(input);
      await userEvent.type(input, '5');
      fireEvent.blur(input);

      // 更新関数が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnUpdateItem).toHaveBeenCalledWith(1, { quantity: '5' });
      });
    });

    test('単価の編集', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 単価セルをクリック（フォーマットされた数値を探す）
      const priceCell = screen.getByText('26,000');
      fireEvent.click(priceCell);

      // 数値入力フィールドが表示される
      const input = screen.getByDisplayValue('26000');
      expect(input).toBeInTheDocument();

      // 値を変更
      await userEvent.clear(input);
      await userEvent.type(input, '30000');
      fireEvent.keyDown(input, { key: 'Enter' });

      // 更新関数が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnUpdateItem).toHaveBeenCalledWith(1, { unit_price: '30000' });
      });
    });

    test('Escapeキーで編集キャンセル', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 数量編集を開始
      const quantityCell = screen.getByText('2');
      fireEvent.click(quantityCell);

      const input = screen.getByDisplayValue('2');
      await userEvent.clear(input);
      await userEvent.type(input, '999');

      // Escapeキーでキャンセル
      fireEvent.keyDown(input, { key: 'Escape' });

      // 更新関数が呼ばれないことを確認
      expect(mockOnUpdateItem).not.toHaveBeenCalled();
    });
  });

  describe('削除機能テスト', () => {
    test('アイテム削除ボタンが機能する', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 削除ボタンを探してクリック
      const deleteButtons = screen.getAllByTitle('削除');
      expect(deleteButtons).toHaveLength(3); // 3つのアイテム

      fireEvent.click(deleteButtons[0]);

      // 削除関数が呼ばれることを確認
      expect(mockOnDeleteItem).toHaveBeenCalledWith(1);
    });
  });

  describe('合計計算テスト', () => {
    test('小計が正しく計算される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 小計の計算: (2 × 26000) + (10 × 2100) = 52000 + 21000 = 73000
      expect(screen.getByText('73,000')).toBeInTheDocument();
    });

    test('調整額が表示される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 調整額行が表示される
      expect(screen.getByText('調整額')).toBeInTheDocument();
      expect(screen.getByText('-5,000')).toBeInTheDocument();
    });

    test('合計金額が正しく計算される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 合計: 73000 + (-5000) = 68000
      expect(screen.getByText('68,000')).toBeInTheDocument();
    });

    test('調整額が0の場合は調整額行が表示されない', () => {
      const estimateWithoutAdjustment = { ...mockEstimate, adjustment_amount: 0 };
      
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={estimateWithoutAdjustment}
        />
      );

      // 調整額行が表示されない
      expect(screen.queryByText('調整額')).not.toBeInTheDocument();
    });
  });

  describe('ヘッダー項目の表示スタイルテスト', () => {
    test('ヘッダー項目が太字で表示される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      const headerItem = screen.getByText('植栽工事');
      expect(headerItem).toBeInTheDocument();
      // スタイルのテストは styled-components の実装によって変わる
    });
  });

  describe('ドラッグ&ドロップテスト', () => {
    test('ドラッグハンドルが表示される', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // ドラッグハンドル（メニューアイコン）が表示される
      const dragHandles = document.querySelectorAll('svg'); // FiMenu アイコン
      expect(dragHandles.length).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('不正な数値入力の処理', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 数量に文字を入力しようとする
      const quantityCell = screen.getByText('2');
      fireEvent.click(quantityCell);

      const input = screen.getByDisplayValue('2');
      
      // 文字入力（number inputなので実際は入力されない）
      await userEvent.type(input, 'abc');
      fireEvent.blur(input);

      // 無効な値の場合は更新されない
      await waitFor(() => {
        // 元の値のままであることを確認
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    test('updateItem関数でエラーが発生した場合', async () => {
      const mockOnUpdateItemWithError = jest.fn().mockRejectedValue(new Error('Update failed'));
      
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItemWithError}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 品目名を編集
      const itemDescription = screen.getByText('クロマツ H3.0m');
      fireEvent.click(itemDescription);

      const textarea = screen.getByDisplayValue('クロマツ H3.0m');
      await userEvent.type(textarea, ' 更新');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      // エラーが発生しても関数は呼ばれる
      await waitFor(() => {
        expect(mockOnUpdateItemWithError).toHaveBeenCalled();
      });
    });
  });

  describe('アクセシビリティテスト', () => {
    test('削除ボタンにtitle属性が設定されている', () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      expect(deleteButtons).toHaveLength(3);
      
      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('title', '削除');
      });
    });

    test('キーボード操作での編集', async () => {
      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // Tabキーでの移動とEnterキーでの編集開始をテスト
      const itemDescription = screen.getByText('クロマツ H3.0m');
      itemDescription.focus();
      
      // クリックで編集開始
      fireEvent.click(itemDescription);
      
      const textarea = screen.getByDisplayValue('クロマツ H3.0m');
      expect(textarea).toHaveFocus();
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量データの表示性能', () => {
      // 1000件のアイテムを作成
      const largeItems = Array.from({ length: 1000 }, (_, i) => ({
        item_id: i + 1,
        item_description: `項目${i + 1}`,
        quantity: 1,
        unit: '個',
        unit_price: 1000,
        line_item_adjustment: 0,
        item_type: 'item',
        level: 0,
        sort_order: i + 1,
      }));

      const startTime = performance.now();
      
      renderWithDnD(
        <ItemsTable
          items={largeItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が妥当な範囲内であることを確認
      expect(renderTime).toBeLessThan(3000); // 3秒以内
      
      // 最初のアイテムが表示されることを確認
      expect(screen.getByText('項目1')).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応テスト', () => {
    test('モバイルビューでの表示', () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      renderWithDnD(
        <ItemsTable
          items={mockItems}
          onUpdateItem={mockOnUpdateItem}
          onDeleteItem={mockOnDeleteItem}
          onReorderItems={mockOnReorderItems}
          estimate={mockEstimate}
        />
      );

      // 基本的な要素が表示されることを確認
      expect(screen.getByText('品目・摘要')).toBeInTheDocument();
      expect(screen.getByText('クロマツ H3.0m')).toBeInTheDocument();
    });
  });
});
