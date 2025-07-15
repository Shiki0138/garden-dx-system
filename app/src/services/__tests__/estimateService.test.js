/**
 * estimateService の単体テスト
 * Worker4 - テストカバレッジ緊急改善
 */

import {
  saveEstimate,
  loadEstimate,
  getEstimateList,
  deleteEstimate,
  getEstimateForPDF,
  uploadEstimateFile,
} from '../estimateService';

// Supabaseクライアントのモック  
jest.mock('../../lib/supabase', () => ({
  dbClient: {
    estimates: {
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
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
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(),
    })),
  },
}));

// Dateのモックで一貫したテストを実現
const mockDate = new Date('2024-07-06T10:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
Date.now = jest.fn(() => mockDate.getTime());

// Math.randomのモック
jest.spyOn(Math, 'random').mockReturnValue(0.123);

// console.errorのモック
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('estimateService', () => {
  let mockDbClient, mockStorage, mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { dbClient, storage, supabase } = require('../lib/supabase');
    mockDbClient = dbClient;
    mockStorage = storage;
    mockSupabase = supabase;
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    jest.restoreAllMocks();
  });

  describe('saveEstimate', () => {
    const mockWizardData = {
      project_name: 'テスト庭園工事',
      client_id: null,
      client_name: 'テスト造園株式会社',
      client_phone: '03-1234-5678',
      client_address: '東京都渋谷区',
      is_new_client: true,
      notes: 'テストノート',
      payment_terms: '工事完了後30日以内',
      calculatedAmounts: {
        subtotal: 100000,
        total_amount: 110000,
      },
      itemSelections: {
        '1': {
          id: '1',
          category: '植栽工事',
          name: 'クロマツ',
          unit: '本',
          quantity: 2,
          purchase_price: 20000,
          markup_rate: 1.3,
          selected: true,
        },
        '2': {
          id: '2',
          category: '植栽工事',
          name: 'ヒラドツツジ',
          unit: '本',
          quantity: 10,
          purchase_price: 1500,
          markup_rate: 1.4,
          selected: true,
        },
      },
    };

    test('正常な見積保存', async () => {
      const mockEstimate = {
        id: 1,
        estimate_number: 'EST-20240706-123',
        title: 'テスト庭園工事',
      };

      const mockClient = {
        id: 1,
        name: 'テスト造園株式会社',
      };

      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      mockDbClient.estimateItems.createMany.mockResolvedValue({
        error: null,
      });

      mockDbClient.clients.create.mockResolvedValue({
        data: mockClient,
        error: null,
      });

      mockDbClient.estimates.update.mockResolvedValue({
        error: null,
      });

      const result = await saveEstimate(mockWizardData, 1, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEstimate);

      // 見積作成の確認
      expect(mockDbClient.estimates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          title: 'テスト庭園工事',
          estimate_number: 'EST-20240706-123',
          status: 'draft',
          subtotal: 100000,
          total_amount: 110000,
          created_by: 'user-123',
        })
      );

      // 見積項目作成の確認
      expect(mockDbClient.estimateItems.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            estimate_id: 1,
            category: '植栽工事',
            name: 'クロマツ',
            quantity: 2,
            purchase_price: 20000,
            markup_rate: 1.3,
            unit_price: 26000,
            amount: 52000,
          }),
          expect.objectContaining({
            estimate_id: 1,
            category: '植栽工事',
            name: 'ヒラドツツジ',
            quantity: 10,
            purchase_price: 1500,
            markup_rate: 1.4,
            unit_price: 2100,
            amount: 21000,
          }),
        ])
      );

      // 新規顧客作成の確認
      expect(mockDbClient.clients.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'テスト造園株式会社',
          phone: '03-1234-5678',
          address: '東京都渋谷区',
        })
      );

      // 見積更新の確認
      expect(mockDbClient.estimates.update).toHaveBeenCalledWith(1, {
        client_id: 1,
      });
    });

    test('既存顧客での見積保存', async () => {
      const existingClientData = {
        ...mockWizardData,
        client_id: 5,
        is_new_client: false,
      };

      const mockEstimate = {
        id: 1,
        estimate_number: 'EST-20240706-123',
      };

      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      mockDbClient.estimateItems.createMany.mockResolvedValue({
        error: null,
      });

      const result = await saveEstimate(existingClientData, 1, 'user-123');

      expect(result.success).toBe(true);
      
      // 既存顧客の場合、顧客作成が呼ばれないことを確認
      expect(mockDbClient.clients.create).not.toHaveBeenCalled();
      expect(mockDbClient.estimates.update).not.toHaveBeenCalled();
    });

    test('項目が選択されていない場合', async () => {
      const noItemsData = {
        ...mockWizardData,
        itemSelections: {},
      };

      const mockEstimate = {
        id: 1,
        estimate_number: 'EST-20240706-123',
      };

      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const result = await saveEstimate(noItemsData, 1, 'user-123');

      expect(result.success).toBe(true);
      
      // 項目がない場合、項目作成が呼ばれないことを確認
      expect(mockDbClient.estimateItems.createMany).not.toHaveBeenCalled();
    });

    test('見積作成エラー', async () => {
      const estimateError = new Error('見積作成エラー');
      mockDbClient.estimates.create.mockResolvedValue({
        data: null,
        error: estimateError,
      });

      const result = await saveEstimate(mockWizardData, 1, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('見積作成エラー');
      expect(mockConsoleError).toHaveBeenCalledWith('見積保存エラー:', estimateError);
    });

    test('項目作成エラー', async () => {
      const mockEstimate = { id: 1 };
      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const itemsError = new Error('項目作成エラー');
      mockDbClient.estimateItems.createMany.mockResolvedValue({
        error: itemsError,
      });

      const result = await saveEstimate(mockWizardData, 1, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('項目作成エラー');
    });
  });

  describe('loadEstimate', () => {
    test('正常な見積読み込み', async () => {
      const mockEstimateData = {
        id: 1,
        title: 'テスト庭園工事',
        subtotal: 100000,
        total_amount: 110000,
        notes: 'テストノート',
        terms: '工事完了後30日以内',
        client: {
          name: 'テスト造園株式会社',
          phone: '03-1234-5678',
          address: '東京都渋谷区',
        },
        project: {
          site_address: '工事現場住所',
          start_date: '2024-07-01',
          end_date: '2024-07-31',
        },
        items: [
          {
            id: 1,
            category: '植栽工事',
            name: 'クロマツ',
            unit: '本',
            quantity: 2,
            purchase_price: 20000,
            markup_rate: 1.3,
          },
        ],
      };

      mockDbClient.estimates.get.mockResolvedValue({
        data: mockEstimateData,
        error: null,
      });

      const result = await loadEstimate(1);

      expect(result.success).toBe(true);
      expect(result.data.project_name).toBe('テスト庭園工事');
      expect(result.data.client_name).toBe('テスト造園株式会社');
      expect(result.data.calculatedAmounts.subtotal).toBe(100000);
      expect(result.data.calculatedAmounts.total_amount).toBe(110000);
      expect(result.data.itemSelections['1'].selected).toBe(true);
    });

    test('見積が見つからない場合', async () => {
      const notFoundError = new Error('見積が見つかりません');
      mockDbClient.estimates.get.mockResolvedValue({
        data: null,
        error: notFoundError,
      });

      const result = await loadEstimate(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('見積が見つかりません');
      expect(mockConsoleError).toHaveBeenCalledWith('見積読み込みエラー:', notFoundError);
    });
  });

  describe('getEstimateList', () => {
    test('正常な見積一覧取得', async () => {
      const mockEstimates = [
        { id: 1, title: '見積1' },
        { id: 2, title: '見積2' },
      ];

      mockDbClient.estimates.list.mockResolvedValue({
        data: mockEstimates,
        error: null,
      });

      const result = await getEstimateList(1, { status: 'draft' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEstimates);
      expect(mockDbClient.estimates.list).toHaveBeenCalledWith(1, { status: 'draft' });
    });

    test('一覧取得エラー', async () => {
      const listError = new Error('一覧取得エラー');
      mockDbClient.estimates.list.mockResolvedValue({
        data: null,
        error: listError,
      });

      const result = await getEstimateList(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('一覧取得エラー');
    });
  });

  describe('deleteEstimate', () => {
    test('正常な見積削除', async () => {
      mockDbClient.estimates.delete.mockResolvedValue({
        error: null,
      });

      const result = await deleteEstimate(1);

      expect(result.success).toBe(true);
      expect(mockDbClient.estimates.delete).toHaveBeenCalledWith(1);
    });

    test('削除エラー', async () => {
      const deleteError = new Error('削除エラー');
      mockDbClient.estimates.delete.mockResolvedValue({
        error: deleteError,
      });

      const result = await deleteEstimate(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('削除エラー');
    });
  });

  describe('getEstimateForPDF', () => {
    test('正常なPDF用データ取得', async () => {
      const mockEstimateData = {
        estimate_number: 'EST-2024-001',
        issue_date: '2024-07-06',
        valid_until: '2024-08-05',
        title: 'テスト庭園工事',
        subtotal: 100000,
        tax_amount: 10000,
        total_amount: 110000,
        notes: 'テストノート',
        terms: '工事完了後30日以内',
        client: {
          name: 'テスト造園株式会社',
          address: '東京都渋谷区',
          contact_person: '田中太郎',
        },
        project: {
          site_address: '工事現場住所',
          start_date: '2024-07-01',
          end_date: '2024-07-31',
        },
        items: [
          {
            category: '植栽工事',
            name: 'クロマツ',
            unit: '本',
            quantity: 2,
            unit_price: 26000,
            amount: 52000,
          },
        ],
      };

      mockDbClient.estimates.get.mockResolvedValue({
        data: mockEstimateData,
        error: null,
      });

      const result = await getEstimateForPDF(1);

      expect(result.success).toBe(true);
      expect(result.data.estimateNumber).toBe('EST-2024-001');
      expect(result.data.clientInfo.name).toBe('テスト造園株式会社');
      expect(result.data.projectInfo.name).toBe('テスト庭園工事');
      expect(result.data.items).toHaveLength(1);
      expect(result.data.summary.totalAmount).toBe(110000);
    });
  });

  describe('uploadEstimateFile', () => {
    test('正常なファイルアップロード', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });

      mockStorage.upload.mockResolvedValue({
        error: null,
      });

      mockStorage.getPublicUrl.mockResolvedValue('https://example.com/file.pdf');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await uploadEstimateFile(1, mockFile, 'pdf', 1);

      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://example.com/file.pdf');
      expect(mockStorage.upload).toHaveBeenCalledWith(
        'garden-dx-files',
        expect.stringContaining('estimates/1/pdf_'),
        mockFile
      );
    });

    test('アップロードエラー', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const uploadError = new Error('アップロードエラー');
      mockStorage.upload.mockResolvedValue({
        error: uploadError,
      });

      const result = await uploadEstimateFile(1, mockFile, 'pdf', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('アップロードエラー');
    });
  });

  describe('見積番号生成', () => {
    test('正しいフォーマットで生成される', async () => {
      const mockEstimate = { id: 1 };
      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const mockWizardData = {
        project_name: 'テスト',
        calculatedAmounts: { subtotal: 1000, total_amount: 1100 },
        itemSelections: {},
      };

      await saveEstimate(mockWizardData, 1, 'user-123');

      expect(mockDbClient.estimates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          estimate_number: 'EST-20240706-123',
        })
      );
    });
  });

  describe('エッジケース', () => {
    test('空のデータでの処理', async () => {
      const emptyData = {
        calculatedAmounts: { subtotal: 0, total_amount: 0 },
        itemSelections: {},
      };

      const mockEstimate = { id: 1 };
      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const result = await saveEstimate(emptyData, 1, 'user-123');

      expect(result.success).toBe(true);
      expect(mockDbClient.estimates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '造園工事見積書', // デフォルトタイトル
          subtotal: 0,
          total_amount: 0,
        })
      );
    });

    test('null/undefined値の適切な処理', async () => {
      const dataWithNulls = {
        project_name: null,
        notes: undefined,
        calculatedAmounts: { subtotal: 1000, total_amount: 1100 },
        itemSelections: {},
      };

      const mockEstimate = { id: 1 };
      mockDbClient.estimates.create.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const result = await saveEstimate(dataWithNulls, 1, 'user-123');

      expect(result.success).toBe(true);
      expect(mockDbClient.estimates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '造園工事見積書',
          notes: '',
          client_id: null,
          project_id: null,
        })
      );
    });
  });
});
