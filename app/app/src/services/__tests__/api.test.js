/**
 * API サービスの単体テスト
 * Worker4 - 単体テスト実装・品質保証
 */

import { estimateApi, customerApi, projectApi } from '../api';

// fetch のモック
global.fetch = jest.fn();

describe('API Service Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    // デフォルトの成功レスポンス
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
  });

  describe('estimateApi', () => {
    describe('getEstimate', () => {
      test('正常なレスポンスの処理', async () => {
        const mockEstimate = {
          estimate_id: 'test-001',
          estimate_name: 'テスト見積',
          total_amount: 100000,
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockEstimate,
        });

        const result = await estimateApi.getEstimate('test-001');

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates/test-001'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );

        expect(result).toEqual({
          success: true,
          data: mockEstimate,
        });
      });

      test('404エラーの処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ detail: '見積が見つかりません' }),
        });

        const result = await estimateApi.getEstimate('nonexistent');

        expect(result).toEqual({
          success: false,
          error: '見積が見つかりません',
        });
      });

      test('ネットワークエラーの処理', async () => {
        fetch.mockRejectedValue(new Error('Network error'));

        const result = await estimateApi.getEstimate('test-001');

        expect(result).toEqual({
          success: false,
          error: 'Network error',
        });
      });

      test('認証エラー(401)の処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ detail: '認証が必要です' }),
        });

        const result = await estimateApi.getEstimate('test-001');

        expect(result).toEqual({
          success: false,
          error: '認証が必要です',
        });
      });
    });

    describe('createEstimate', () => {
      test('見積作成の正常処理', async () => {
        const newEstimate = {
          customer_id: 1,
          estimate_name: '新規見積',
          estimate_date: '2024-01-01',
        };

        const createdEstimate = {
          estimate_id: 'new-001',
          ...newEstimate,
          status: 'draft',
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => createdEstimate,
        });

        const result = await estimateApi.createEstimate(newEstimate);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(newEstimate),
          })
        );

        expect(result).toEqual({
          success: true,
          data: createdEstimate,
        });
      });

      test('バリデーションエラー(400)の処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            detail: '必須フィールドが不足しています',
            errors: ['customer_id is required'],
          }),
        });

        const result = await estimateApi.createEstimate({});

        expect(result).toEqual({
          success: false,
          error: '必須フィールドが不足しています',
        });
      });
    });

    describe('updateEstimate', () => {
      test('見積更新の正常処理', async () => {
        const updateData = {
          estimate_name: '更新された見積',
          adjustment_amount: -5000,
        };

        const updatedEstimate = {
          estimate_id: 'test-001',
          ...updateData,
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => updatedEstimate,
        });

        const result = await estimateApi.updateEstimate('test-001', updateData);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates/test-001'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateData),
          })
        );

        expect(result).toEqual({
          success: true,
          data: updatedEstimate,
        });
      });

      test('権限エラー(403)の処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ detail: '調整金額の変更は経営者権限が必要です' }),
        });

        const result = await estimateApi.updateEstimate('test-001', { adjustment_amount: -10000 });

        expect(result).toEqual({
          success: false,
          error: '調整金額の変更は経営者権限が必要です',
        });
      });
    });

    describe('deleteEstimate', () => {
      test('見積削除の正常処理', async () => {
        fetch.mockResolvedValue({
          ok: true,
          status: 204,
          json: async () => ({}),
        });

        const result = await estimateApi.deleteEstimate('test-001');

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates/test-001'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );

        expect(result).toEqual({
          success: true,
          data: {},
        });
      });
    });

    describe('getEstimateItems', () => {
      test('見積明細取得の正常処理', async () => {
        const mockItems = [
          {
            item_id: 1,
            item_description: 'テスト項目1',
            quantity: 2,
            unit_price: 5000,
          },
          {
            item_id: 2,
            item_description: 'テスト項目2',
            quantity: 1,
            unit_price: 3000,
          },
        ];

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockItems,
        });

        const result = await estimateApi.getEstimateItems('test-001');

        expect(result).toEqual({
          success: true,
          data: mockItems,
        });
      });
    });

    describe('addEstimateItem', () => {
      test('明細追加の正常処理', async () => {
        const newItem = {
          item_description: '新規項目',
          quantity: 1,
          unit_price: 2000,
          sort_order: 1,
        };

        const createdItem = {
          item_id: 3,
          estimate_id: 'test-001',
          ...newItem,
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => createdItem,
        });

        const result = await estimateApi.addEstimateItem('test-001', newItem);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates/test-001/items'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newItem),
          })
        );

        expect(result).toEqual({
          success: true,
          data: createdItem,
        });
      });
    });

    describe('generateEstimatePDF', () => {
      test('PDF生成の正常処理', async () => {
        const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          blob: async () => mockBlob,
        });

        const result = await estimateApi.generateEstimatePDF('test-001');

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/estimates/test-001/pdf'),
          expect.objectContaining({
            method: 'GET',
          })
        );

        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('application/pdf');
      });

      test('PDF生成エラーの処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ detail: 'PDF生成エラー' }),
        });

        await expect(estimateApi.generateEstimatePDF('test-001')).rejects.toThrow('PDF生成エラー');
      });
    });

    describe('getProfitabilityAnalysis', () => {
      test('収益性分析の正常処理', async () => {
        const mockAnalysis = {
          total_cost: 80000,
          total_revenue: 100000,
          gross_profit: 20000,
          gross_margin_rate: 20.0,
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockAnalysis,
        });

        const result = await estimateApi.getProfitabilityAnalysis('test-001');

        expect(result).toEqual({
          success: true,
          data: mockAnalysis,
        });
      });

      test('権限不足エラー(403)の処理', async () => {
        fetch.mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ detail: '収益性情報は経営者のみ閲覧可能です' }),
        });

        const result = await estimateApi.getProfitabilityAnalysis('test-001');

        expect(result).toEqual({
          success: false,
          error: '収益性情報は経営者のみ閲覧可能です',
        });
      });
    });
  });

  describe('customerApi', () => {
    describe('getCustomers', () => {
      test('顧客一覧取得の正常処理', async () => {
        const mockCustomers = [
          {
            customer_id: 1,
            customer_name: '顧客A',
            phone: '03-1111-1111',
          },
          {
            customer_id: 2,
            customer_name: '顧客B',
            phone: '03-2222-2222',
          },
        ];

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockCustomers,
        });

        const result = await customerApi.getCustomers();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/customers'),
          expect.objectContaining({
            method: 'GET',
          })
        );

        expect(result).toEqual({
          success: true,
          data: mockCustomers,
        });
      });

      test('検索パラメータ付きの顧客取得', async () => {
        await customerApi.getCustomers({ search: 'テスト', limit: 10 });

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/customers?search=%E3%83%86%E3%82%B9%E3%83%88&limit=10'),
          expect.any(Object)
        );
      });
    });

    describe('createCustomer', () => {
      test('顧客作成の正常処理', async () => {
        const newCustomer = {
          customer_name: '新規顧客',
          phone: '03-0000-0000',
          address: '東京都新宿区',
        };

        const createdCustomer = {
          customer_id: 3,
          ...newCustomer,
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => createdCustomer,
        });

        const result = await customerApi.createCustomer(newCustomer);

        expect(result).toEqual({
          success: true,
          data: createdCustomer,
        });
      });
    });
  });

  describe('projectApi', () => {
    describe('getProjects', () => {
      test('プロジェクト一覧取得の正常処理', async () => {
        const mockProjects = [
          {
            project_id: 1,
            project_name: 'プロジェクトA',
            status: 'in_progress',
          },
          {
            project_id: 2,
            project_name: 'プロジェクトB',
            status: 'completed',
          },
        ];

        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockProjects,
        });

        const result = await projectApi.getProjects();

        expect(result).toEqual({
          success: true,
          data: mockProjects,
        });
      });
    });

    describe('createProject', () => {
      test('プロジェクト作成の正常処理', async () => {
        const newProject = {
          project_name: '新規プロジェクト',
          customer_id: 1,
          start_date: '2024-01-01',
        };

        const createdProject = {
          project_id: 3,
          ...newProject,
          status: 'planning',
        };

        fetch.mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => createdProject,
        });

        const result = await projectApi.createProject(newProject);

        expect(result).toEqual({
          success: true,
          data: createdProject,
        });
      });
    });
  });

  describe('API共通機能', () => {
    test('認証ヘッダーの設定', async () => {
      // localStorage に認証トークンを設定
      const mockToken = 'mock-jwt-token';
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue(mockToken),
        },
      });

      await estimateApi.getEstimate('test-001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    test('リクエストタイムアウトの処理', async () => {
      // タイムアウトのシミュレート
      jest.setTimeout(100);

      fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      await expect(estimateApi.getEstimate('test-001')).rejects.toThrow();
    });

    test('リトライ機能の動作', async () => {
      // 最初の2回は失敗、3回目で成功
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await estimateApi.getEstimate('test-001');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    test('レスポンスキャッシュ機能', async () => {
      // 同じリクエストを2回実行
      await estimateApi.getEstimate('test-001');
      await estimateApi.getEstimate('test-001');

      // キャッシュが有効な場合、fetch は1回のみ呼ばれる
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('500エラーの処理', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal Server Error' }),
      });

      const result = await estimateApi.getEstimate('test-001');

      expect(result).toEqual({
        success: false,
        error: 'Internal Server Error',
      });
    });

    test('JSON パースエラーの処理', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await estimateApi.getEstimate('test-001');

      expect(result).toEqual({
        success: false,
        error: 'Invalid JSON',
      });
    });

    test('空のレスポンスボディの処理', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const result = await estimateApi.deleteEstimate('test-001');

      expect(result).toEqual({
        success: true,
        data: {},
      });
    });
  });

  describe('パフォーマンステスト', () => {
    test('並列リクエストの処理', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => estimateApi.getEstimate(`test-${i}`));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(fetch).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('大きなペイロードの処理', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          item_id: i,
          item_description: `項目${i}`,
          quantity: 1,
          unit_price: 1000,
        })),
      };

      await estimateApi.updateEstimate('test-001', largeData);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(largeData),
        })
      );
    });
  });
});
