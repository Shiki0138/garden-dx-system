/**
 * ProfitabilityPanel コンポーネントのテスト
 * Worker4 - 単体テスト実装・品質保証
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfitabilityPanel from '../ProfitabilityPanel';

// モックデータ
const mockProfitabilityData = {
  cost: 80000,
  profit: 20000,
  profit_margin: 20.0,
};

const mockNegativeProfitData = {
  cost: 120000,
  profit: -20000,
  profit_margin: -16.67,
};

const mockZeroProfitData = {
  cost: 100000,
  profit: 0,
  profit_margin: 0,
};

describe('ProfitabilityPanel', () => {
  describe('初期表示テスト', () => {
    test('正常な収益データが正しく表示される', () => {
      render(<ProfitabilityPanel profitability={mockProfitabilityData} />);

      // タイトルの確認
      expect(screen.getByText('収益性分析')).toBeInTheDocument();

      // ラベルの確認
      expect(screen.getByText('原価:')).toBeInTheDocument();
      expect(screen.getByText('利益:')).toBeInTheDocument();
      expect(screen.getByText('利益率:')).toBeInTheDocument();

      // 値の確認（日本円フォーマット）
      expect(screen.getByText('￥80,000')).toBeInTheDocument();
      expect(screen.getByText('￥20,000')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    test('負の利益データが正しく表示される', () => {
      render(<ProfitabilityPanel profitability={mockNegativeProfitData} />);

      // 負の値が正しく表示されることを確認
      expect(screen.getByText('￥120,000')).toBeInTheDocument();
      expect(screen.getByText('-￥20,000')).toBeInTheDocument();
      expect(screen.getByText('-16.67%')).toBeInTheDocument();
    });

    test('ゼロ利益データが正しく表示される', () => {
      render(<ProfitabilityPanel profitability={mockZeroProfitData} />);

      expect(screen.getByText('￥100,000')).toBeInTheDocument();
      expect(screen.getByText('￥0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('profitabilityがnull/undefinedの場合のデフォルト表示', () => {
      render(<ProfitabilityPanel profitability={null} />);

      // デフォルト値（0）が表示されることを確認
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
      expect(screen.getByText('￥0')).toBeInTheDocument(); // 原価
      expect(screen.getByText('0%')).toBeInTheDocument(); // 利益率
    });

    test('profitabilityが空オブジェクトの場合', () => {
      render(<ProfitabilityPanel profitability={{}} />);

      // 空オブジェクトでもデフォルト値が表示される
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
      const zeroValues = screen.getAllByText('￥0');
      expect(zeroValues).toHaveLength(2); // 原価と利益
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('数値フォーマットテスト', () => {
    test('大きな数値のフォーマット', () => {
      const largeProfitData = {
        cost: 10000000, // 1千万円
        profit: 2500000, // 250万円
        profit_margin: 25.0,
      };

      render(<ProfitabilityPanel profitability={largeProfitData} />);

      // 大きな数値が適切にフォーマットされることを確認
      expect(screen.getByText('￥10,000,000')).toBeInTheDocument();
      expect(screen.getByText('￥2,500,000')).toBeInTheDocument();
    });

    test('小数点以下の数値の処理', () => {
      const decimalProfitData = {
        cost: 80500.75,
        profit: 19499.25,
        profit_margin: 19.5,
      };

      render(<ProfitabilityPanel profitability={decimalProfitData} />);

      // 小数点以下が切り捨てられることを確認（minimumFractionDigits: 0）
      expect(screen.getByText('￥80,501')).toBeInTheDocument(); // 四捨五入
      expect(screen.getByText('￥19,499')).toBeInTheDocument();
    });
  });

  describe('プロップのバリデーションテスト', () => {
    test('数値以外の値が渡された場合', () => {
      const invalidProfitData = {
        cost: 'invalid',
        profit: null,
        profit_margin: undefined,
      };

      render(<ProfitabilityPanel profitability={invalidProfitData} />);

      // 無効な値でもエラーを起こさずデフォルト値で表示
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
      expect(screen.getByText('￥0')).toBeInTheDocument(); // invalid -> 0
    });

    test('部分的なデータの場合', () => {
      const partialProfitData = {
        cost: 50000,
        // profit と profit_margin が欠如
      };

      render(<ProfitabilityPanel profitability={partialProfitData} />);

      expect(screen.getByText('￥50,000')).toBeInTheDocument(); // cost
      expect(screen.getByText('￥0')).toBeInTheDocument(); // profit のデフォルト
      expect(screen.getByText('0%')).toBeInTheDocument(); // profit_margin のデフォルト
    });
  });

  describe('アクセシビリティテスト', () => {
    test('ラベルと値の関係が正しく設定されている', () => {
      render(<ProfitabilityPanel profitability={mockProfitabilityData} />);

      // ラベルと値が同じ行に表示されていることを確認
      const costLabel = screen.getByText('原価:');
      const costValue = screen.getByText('￥80,000');

      expect(costLabel).toBeInTheDocument();
      expect(costValue).toBeInTheDocument();

      // DOM構造の確認（同じ親要素内にあるか）
      expect(costLabel.parentElement).toContainElement(costValue);
    });
  });

  describe('スタイルテスト', () => {
    test('コンポーネントの基本構造が正しい', () => {
      const { container } = render(<ProfitabilityPanel profitability={mockProfitabilityData} />);

      // メインコンテナの存在確認
      const panelContainer = container.firstChild;
      expect(panelContainer).toBeInTheDocument();

      // タイトルのh3要素の確認
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('収益性分析');

      // 3つのメトリック行があることを確認
      const metricRows = container.querySelectorAll('div > div');
      expect(metricRows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('エッジケーステスト', () => {
    test('非常に大きな数値の処理', () => {
      const extremelyLargeProfitData = {
        cost: Number.MAX_SAFE_INTEGER,
        profit: Number.MAX_SAFE_INTEGER,
        profit_margin: 999.99,
      };

      render(<ProfitabilityPanel profitability={extremelyLargeProfitData} />);

      // エラーを起こさずに表示されることを確認
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
    });

    test('負の無限大の数値の処理', () => {
      const negativeInfinityData = {
        cost: -Infinity,
        profit: -Infinity,
        profit_margin: -Infinity,
      };

      render(<ProfitabilityPanel profitability={negativeInfinityData} />);

      // 無限大の値でもエラーを起こさないことを確認
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
    });

    test('NaN値の処理', () => {
      const nanData = {
        cost: NaN,
        profit: NaN,
        profit_margin: NaN,
      };

      render(<ProfitabilityPanel profitability={nanData} />);

      // NaNでもエラーを起こさないことを確認
      expect(screen.getByText('収益性分析')).toBeInTheDocument();
    });
  });

  describe('パフォーマンステスト', () => {
    test('繰り返しレンダリングの性能', () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<ProfitabilityPanel profitability={mockProfitabilityData} />);
        unmount();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 100回のレンダリングが合理的な時間内で完了することを確認
      expect(totalTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('プロップの変更テスト', () => {
    test('プロップが変更されたときの再レンダリング', () => {
      const { rerender } = render(<ProfitabilityPanel profitability={mockProfitabilityData} />);

      // 初期値の確認
      expect(screen.getByText('￥80,000')).toBeInTheDocument();
      expect(screen.getByText('￥20,000')).toBeInTheDocument();

      // 新しいデータで再レンダリング
      const newProfitData = {
        cost: 90000,
        profit: 30000,
        profit_margin: 25.0,
      };

      rerender(<ProfitabilityPanel profitability={newProfitData} />);

      // 新しい値が表示されることを確認
      expect(screen.getByText('￥90,000')).toBeInTheDocument();
      expect(screen.getByText('￥30,000')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();

      // 古い値が表示されないことを確認
      expect(screen.queryByText('￥80,000')).not.toBeInTheDocument();
      expect(screen.queryByText('￥20,000')).not.toBeInTheDocument();
    });
  });
});
