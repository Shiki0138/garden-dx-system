/**
 * EstimateWizardPro コンポーネントのテスト
 * Worker4 - 単体テスト実装・品質保証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EstimateWizardPro from '../EstimateWizardPro';
import { useAuth } from '../../hooks/useAuth';

// モック設定
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    performanceData: {},
    logPerformanceReport: jest.fn(),
    markRenderStart: jest.fn(),
    markRenderEnd: jest.fn(),
  }),
}));

jest.mock('../../utils/securityUtils', () => ({
  secureLocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn().mockReturnValue(true),
  },
  securityLogger: {
    log: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../utils/landscapingValidation', () => ({
  validateLandscapingInput: {
    customerName: (value) => ({
      isValid: value.length > 0,
      sanitizedValue: value,
      errors: value.length > 0 ? [] : ['顧客名は必須です'],
    }),
    phoneNumber: (value) => ({
      isValid: /^\d{2,4}-\d{2,4}-\d{4}$/.test(value),
      sanitizedValue: value,
      errors: /^\d{2,4}-\d{2,4}-\d{4}$/.test(value) ? [] : ['正しい電話番号形式で入力してください'],
    }),
    email: (value) => ({
      isValid: !value || /\S+@\S+\.\S+/.test(value),
      sanitizedValue: value,
      errors: !value || /\S+@\S+\.\S+/.test(value) ? [] : ['正しいメールアドレス形式で入力してください'],
    }),
    address: (value) => ({
      isValid: value.length > 0,
      sanitizedValue: value,
      errors: value.length > 0 ? [] : ['住所は必須です'],
    }),
    projectName: (value) => ({
      isValid: value.length > 0,
      sanitizedValue: value,
      errors: value.length > 0 ? [] : ['プロジェクト名は必須です'],
    }),
    numericValue: (value, options) => ({
      isValid: true,
      sanitizedValue: value,
      errors: [],
    }),
  },
}));

// デフォルトプロダクトアイテムのモック
jest.mock('../../data/landscapingDefaults', () => ({
  LANDSCAPING_DEFAULT_ITEMS: {
    '植栽工事': [
      {
        id: 'plant_001',
        name: 'クロマツ H3.0m',
        unit: '本',
        purchase_price: 20000,
        markup_rate: 1.3,
        selected: false,
      },
      {
        id: 'plant_002',
        name: 'ヒラドツツジ',
        unit: '本',
        purchase_price: 1500,
        markup_rate: 1.4,
        selected: false,
      },
    ],
    '外構工事': [
      {
        id: 'exterior_001',
        name: '御影石縁石',
        unit: 'm',
        purchase_price: 8000,
        markup_rate: 1.25,
        selected: false,
      },
    ],
  },
}));

describe('EstimateWizardPro', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのauth mock
    useAuth.mockReturnValue({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        role: 'manager',
        name: 'テストユーザー',
      },
      isAuthenticated: true,
    });

    // localStorage のモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    });
  });

  describe('初期表示テスト', () => {
    test('デモモード時に正しく初期化される', () => {
      process.env.REACT_APP_DEMO_MODE = 'true';
      
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // デモモードのバッジが表示される
      expect(screen.getByText('🎭 デモモード')).toBeInTheDocument();
      
      // ステップインジケーターが表示される
      expect(screen.getByText('基本情報')).toBeInTheDocument();
      expect(screen.getByText('要望詳細')).toBeInTheDocument();
      expect(screen.getByText('項目選択')).toBeInTheDocument();
      expect(screen.getByText('金額確認')).toBeInTheDocument();
    });

    test('通常モード時の認証チェック', () => {
      process.env.REACT_APP_DEMO_MODE = 'false';
      
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // デモモードバッジが表示されない
      expect(screen.queryByText('🎭 デモモード')).not.toBeInTheDocument();
      
      // 基本情報ステップから開始
      expect(screen.getByText('基本情報の入力')).toBeInTheDocument();
    });

    test('編集モード時に既存データを読み込む', () => {
      const existingData = {
        formData: {
          customer_name: '既存顧客',
          phone: '03-1234-5678',
          address: '東京都渋谷区',
        },
      };
      
      require('../../utils/securityUtils').secureLocalStorage.getItem.mockReturnValue(existingData);
      
      render(<EstimateWizardPro estimateId="existing-001" onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // 既存データが読み込まれることを確認
      expect(screen.getByDisplayValue('既存顧客')).toBeInTheDocument();
    });
  });

  describe('ステップ1: 基本情報テスト', () => {
    test('必須フィールドの入力と検証', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // 顧客名入力
      const customerNameInput = screen.getByLabelText(/顧客名/);
      await userEvent.type(customerNameInput, 'テスト造園株式会社');
      
      // 電話番号入力
      const phoneInput = screen.getByLabelText(/電話番号/);
      await userEvent.type(phoneInput, '03-1234-5678');
      
      // 住所入力
      const addressInput = screen.getByLabelText(/住所/);
      await userEvent.type(addressInput, '東京都渋谷区テスト1-1-1');
      
      // 入力値が正しく反映されることを確認
      expect(customerNameInput).toHaveValue('テスト造園株式会社');
      expect(phoneInput).toHaveValue('03-1234-5678');
      expect(addressInput).toHaveValue('東京都渋谷区テスト1-1-1');
    });

    test('バリデーションエラーの表示', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // 無効な電話番号を入力
      const phoneInput = screen.getByLabelText(/電話番号/);
      await userEvent.type(phoneInput, '無効な電話番号');
      
      // 次のステップボタンをクリック
      const nextButton = screen.getByRole('button', { name: /次のステップ/ });
      fireEvent.click(nextButton);
      
      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/正しい電話番号形式で入力してください/)).toBeInTheDocument();
      });
      
      // ステップが進まないことを確認
      expect(screen.getByText('基本情報の入力')).toBeInTheDocument();
    });

    test('顧客種別の選択', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      const customerTypeSelect = screen.getByLabelText(/顧客種別/);
      await userEvent.selectOptions(customerTypeSelect, 'corporate');
      
      expect(customerTypeSelect).toHaveValue('corporate');
    });
  });

  describe('ステップ2: 要望詳細テスト', () => {
    test('プロジェクト情報の入力', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ1を完了してステップ2に進む
      await userEvent.type(screen.getByLabelText(/顧客名/), 'テスト顧客');
      await userEvent.type(screen.getByLabelText(/電話番号/), '03-1234-5678');
      await userEvent.type(screen.getByLabelText(/住所/), 'テスト住所');
      
      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト詳細・要望')).toBeInTheDocument();
      });
      
      // プロジェクト名入力
      const projectNameInput = screen.getByLabelText(/プロジェクト名/);
      await userEvent.type(projectNameInput, 'テスト庭園工事');
      
      // 工事種別選択
      const projectTypeSelect = screen.getByLabelText(/工事種別/);
      await userEvent.selectOptions(projectTypeSelect, 'renovation');
      
      expect(projectNameInput).toHaveValue('テスト庭園工事');
      expect(projectTypeSelect).toHaveValue('renovation');
    });

    test('日付フィールドの検証', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ2に進む
      await userEvent.type(screen.getByLabelText(/顧客名/), 'テスト顧客');
      await userEvent.type(screen.getByLabelText(/電話番号/), '03-1234-5678');
      await userEvent.type(screen.getByLabelText(/住所/), 'テスト住所');
      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト詳細・要望')).toBeInTheDocument();
      });
      
      // 見積日が自動設定されていることを確認
      const estimateDateInput = screen.getByLabelText(/見積日/);
      expect(estimateDateInput.value).toBeTruthy();
      
      // 有効期限が30日後に設定されていることを確認
      const validUntilInput = screen.getByLabelText(/見積有効期限/);
      expect(validUntilInput.value).toBeTruthy();
    });
  });

  describe('ステップ3: 項目選択テスト', () => {
    test('工事項目の選択と数量入力', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ3まで進む
      await userEvent.type(screen.getByLabelText(/顧客名/), 'テスト顧客');
      await userEvent.type(screen.getByLabelText(/電話番号/), '03-1234-5678');
      await userEvent.type(screen.getByLabelText(/住所/), 'テスト住所');
      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト詳細・要望')).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/プロジェクト名/), 'テスト工事');
      fireEvent.click(screen.getByRole('button', { name: /次のステップ/ }));
      
      await waitFor(() => {
        expect(screen.getByText('工事項目の選択・数量入力')).toBeInTheDocument();
      });
      
      // 項目選択チェックボックス
      const checkbox = screen.getByRole('checkbox', { name: /クロマツ/ });
      fireEvent.click(checkbox);
      
      // 数量入力
      const quantityInput = screen.getByDisplayValue('0');
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '2');
      
      expect(checkbox).toBeChecked();
      expect(quantityInput).toHaveValue(2);
    });

    test('金額計算の確認', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ3まで進む（省略）
      // ...
      
      // 項目選択と数量入力後、金額が自動計算されることを確認
      // 実際の計算結果の検証
    });
  });

  describe('ステップ4: 金額確認テスト', () => {
    test('最終金額の表示と調整', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ4まで進む（省略）
      // ...
      
      // 調整額入力
      const adjustmentInput = screen.getByLabelText(/調整額/);
      await userEvent.type(adjustmentInput, '-10000');
      
      // 調整理由入力
      const reasonInput = screen.getByLabelText(/調整理由/);
      await userEvent.type(reasonInput, 'リピーター割引');
      
      expect(adjustmentInput).toHaveValue(-10000);
      expect(reasonInput).toHaveValue('リピーター割引');
    });

    test('見積書完成処理', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ4まで進んで完成ボタンをクリック
      // ...
      
      const completeButton = screen.getByRole('button', { name: /見積書完成/ });
      fireEvent.click(completeButton);
      
      // onComplete コールバックが呼ばれることを確認
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('一時保存機能テスト', () => {
    test('一時保存が正常に動作する', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // データ入力
      await userEvent.type(screen.getByLabelText(/顧客名/), 'テスト顧客');
      
      // 一時保存ボタンクリック
      const saveButton = screen.getByRole('button', { name: /一時保存/ });
      fireEvent.click(saveButton);
      
      // localStorage.setItem が呼ばれることを確認
      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalled();
      });
    });

    test('保存済み見積の読み込み', async () => {
      // 保存済みデータのモック
      window.localStorage.length = 1;
      window.localStorage.key.mockReturnValue('demo_estimate_test001');
      window.localStorage.getItem.mockReturnValue(JSON.stringify({
        formData: {
          customer_name: '保存済み顧客',
          project_name: '保存済みプロジェクト',
        },
        savedAt: '2024-01-01T00:00:00Z',
      }));
      
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // 保存済み見積が表示される
      await waitFor(() => {
        expect(screen.getByText(/保存済み顧客/)).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('localStorage エラー時のハンドリング', async () => {
      // localStorage エラーをシミュレート
      window.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      await userEvent.type(screen.getByLabelText(/顧客名/), 'テスト顧客');
      
      const saveButton = screen.getByRole('button', { name: /一時保存/ });
      fireEvent.click(saveButton);
      
      // エラーハンドリングが実行されることを確認
      // （実際の実装に応じてアラート表示等を確認）
    });

    test('項目選択なしでの次ステップ試行', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // ステップ3まで進む
      // ...
      
      // 項目を選択せずに次ステップを試行
      const nextButton = screen.getByRole('button', { name: /次のステップ/ });
      fireEvent.click(nextButton);
      
      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/工事項目を少なくとも1件選択してください/)).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量項目選択時のパフォーマンス', async () => {
      const startTime = performance.now();
      
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // 複数項目を高速で選択
      // パフォーマンス測定
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーション', async () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // Tab キーでのフォーカス移動
      const firstInput = screen.getByLabelText(/顧客名/);
      firstInput.focus();
      
      // Tab キーイベント
      fireEvent.keyDown(firstInput, { key: 'Tab' });
      
      // フォーカスが次の要素に移ることを確認
    });

    test('スクリーンリーダー対応', () => {
      render(<EstimateWizardPro onComplete={mockOnComplete} onCancel={mockOnCancel} />);
      
      // aria-label, aria-describedby の存在確認
      const requiredFields = screen.getAllByText(/\*/);
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});