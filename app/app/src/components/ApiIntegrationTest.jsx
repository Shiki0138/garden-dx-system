/**
 * Garden DX - API統合テストコンポーネント
 * 全API連携・エラーハンドリング・UX動作確認用
 */

import React, { useState, useEffect } from 'react';
import { api, estimateApi, priceMasterApi } from '../services/enhancedApi';
import { useEstimates, useEstimate, usePriceMaster, useApiMutation } from '../hooks/useApiState';
import {
  useLoading,
  useGlobalLoading,
  useApiLoading,
  useFileLoading,
} from '../hooks/useLoadingState';
import { showSuccess, showError, showWarning, showInfo } from '../utils/notifications';
import './ApiIntegrationTest.css';

const ApiIntegrationTest = () => {
  const [selectedTab, setSelectedTab] = useState('estimates');
  const [testResults, setTestResults] = useState({});
  const [selectedEstimateId, setSelectedEstimateId] = useState(null);

  // API Hooks テスト
  const estimatesQuery = useEstimates({ page: 0, limit: 10 });
  const estimateQuery = useEstimate(selectedEstimateId);
  const priceMasterQuery = usePriceMaster({ category: '植栽工事' });

  // ローディングHooks テスト
  const loading = useLoading();
  const globalLoading = useGlobalLoading();
  const apiLoading = useApiLoading();
  const fileLoading = useFileLoading();

  // Mutation Hooks テスト
  const createEstimateMutation = useApiMutation(data => estimateApi.create(data), {
    onSuccess: data => {
      showSuccess('見積を正常に作成しました');
      setTestResults(prev => ({
        ...prev,
        createEstimate: { success: true, data },
      }));
    },
    onError: error => {
      showError(`見積作成に失敗しました: ${error.message}`);
      setTestResults(prev => ({
        ...prev,
        createEstimate: { success: false, error: error.message },
      }));
    },
  });

  const updateEstimateMutation = useApiMutation(({ id, data }) => estimateApi.update(id, data), {
    onSuccess: () => showSuccess('見積を正常に更新しました'),
    onError: error => showError(`見積更新に失敗しました: ${error.message}`),
  });

  const deleteEstimateMutation = useApiMutation(id => estimateApi.delete(id), {
    onSuccess: () => showSuccess('見積を正常に削除しました'),
    onError: error => showError(`見積削除に失敗しました: ${error.message}`),
  });

  // テスト関数群
  const runApiTests = async () => {
    const tests = [
      // 基本API呼び出しテスト
      {
        name: 'Health Check',
        test: () => api.get('/health', { silentError: true }),
      },
      {
        name: 'Estimates List',
        test: () => estimateApi.getList(),
      },
      {
        name: 'Price Master Categories',
        test: () => priceMasterApi.getCategories(),
      },
      {
        name: 'Price Master Items',
        test: () => priceMasterApi.getItems({ category: '植栽工事' }),
      },
    ];

    const results = {};

    for (const { name, test } of tests) {
      try {
        showInfo(`Testing: ${name}`, 1000);
        const result = await test();
        results[name] = {
          success: result.success,
          data: result.data,
          timestamp: new Date().toISOString(),
        };
        console.log(`✅ ${name}:`, result);
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        console.error(`❌ ${name}:`, error);
      }
    }

    setTestResults(results);
    showSuccess('API統合テストが完了しました');
  };

  // エラーハンドリングテスト
  const testErrorHandling = async () => {
    const errorTests = [
      {
        name: '404 Error Test',
        test: () => api.get('/api/nonexistent-endpoint', { silentError: false }),
      },
      {
        name: '422 Validation Error Test',
        test: () => estimateApi.create({}), // 不正なデータ
      },
      {
        name: 'Network Timeout Test',
        test: () => api.get('/api/estimates', { timeout: 1 }), // 極端に短いタイムアウト
      },
    ];

    showWarning('エラーハンドリングテストを開始します');

    for (const { name, test } of errorTests) {
      try {
        await test();
      } catch (error) {
        console.log(`✅ Error handling for ${name}:`, error.message);
      }
    }

    showSuccess('エラーハンドリングテストが完了しました');
  };

  // ローディング状態テスト
  const testLoadingStates = async () => {
    // 基本ローディングテスト
    loading.startLoading({
      message: 'ローディング状態テスト中...',
      showNotification: true,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    loading.updateProgress(50, 'テスト実行中... 50%');

    await new Promise(resolve => setTimeout(resolve, 1000));
    loading.updateProgress(100, 'テスト完了');

    await new Promise(resolve => setTimeout(resolve, 500));
    loading.stopLoading();

    // API ローディングテスト
    await apiLoading.withLoading(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true, data: 'API loading test completed' };
      },
      {
        loadingMessage: 'APIローディングテスト中...',
        showNotification: true,
      }
    );

    showSuccess('ローディング状態テストが完了しました');
  };

  // ファイル処理テスト（モック）
  const testFileHandling = async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    await fileLoading.uploadWithProgress(
      async (file, onProgress) => {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress({ loaded: i, total: 100, lengthComputable: true });
        }
        return { success: true, data: { filename: file.name } };
      },
      mockFile,
      { showNotification: true }
    );

    showSuccess('ファイル処理テストが完了しました');
  };

  // CRUD操作テスト
  const testCrudOperations = async () => {
    try {
      // Create
      const createData = {
        customer_id: 1,
        estimate_date: new Date().toISOString().split('T')[0],
        estimate_name: 'API統合テスト見積',
        site_address: 'テスト現場',
        notes: 'API統合テスト用のデータです',
      };

      await createEstimateMutation.mutate(createData);

      showSuccess('CRUD操作テストが完了しました');
    } catch (error) {
      showError(`CRUD操作テストに失敗しました: ${error.message}`);
    }
  };

  // 全テスト実行
  const runAllTests = async () => {
    showInfo('統合テストを開始します', 2000);

    try {
      await runApiTests();
      await testErrorHandling();
      await testLoadingStates();
      await testFileHandling();
      await testCrudOperations();

      showSuccess('🎉 全ての統合テストが完了しました！');
    } catch (error) {
      showError(`統合テストでエラーが発生しました: ${error.message}`);
    }
  };

  return (
    <div className="api-integration-test">
      <div className="test-header">
        <h2>🔧 API統合テストパネル</h2>
        <p>Garden DX APIの動作確認・パフォーマンステスト</p>
      </div>

      {/* テストナビゲーション */}
      <div className="test-navigation">
        <button
          className={selectedTab === 'estimates' ? 'active' : ''}
          onClick={() => setSelectedTab('estimates')}
        >
          見積API
        </button>
        <button
          className={selectedTab === 'pricemaster' ? 'active' : ''}
          onClick={() => setSelectedTab('pricemaster')}
        >
          単価マスタAPI
        </button>
        <button
          className={selectedTab === 'loading' ? 'active' : ''}
          onClick={() => setSelectedTab('loading')}
        >
          ローディング状態
        </button>
        <button
          className={selectedTab === 'errors' ? 'active' : ''}
          onClick={() => setSelectedTab('errors')}
        >
          エラーハンドリング
        </button>
      </div>

      {/* グローバルローディング状態表示 */}
      {globalLoading.hasLoading && (
        <div className="global-loading-status">
          <h4>🔄 アクティブなローディング ({globalLoading.count})</h4>
          {globalLoading.loadingStates.map((state, index) => (
            <div key={index} className="loading-item">
              <span>{state.message}</span>
              <span className="loading-duration">
                {Math.round((Date.now() - state.startTime) / 1000)}s
              </span>
            </div>
          ))}
        </div>
      )}

      {/* テストコンテンツ */}
      <div className="test-content">
        {selectedTab === 'estimates' && (
          <div className="estimates-test">
            <h3>見積API テスト</h3>

            {/* 見積一覧 */}
            <div className="test-section">
              <h4>見積一覧取得</h4>
              <div className="test-status">
                状態:{' '}
                {estimatesQuery.isLoading
                  ? '読み込み中...'
                  : estimatesQuery.isError
                    ? 'エラー'
                    : estimatesQuery.isSuccess
                      ? '成功'
                      : '待機中'}
              </div>
              {estimatesQuery.error && (
                <div className="error-message">エラー: {estimatesQuery.error}</div>
              )}
              {estimatesQuery.data && (
                <div className="data-preview">
                  取得件数: {estimatesQuery.data.length}件
                  <button onClick={() => estimatesQuery.refetch()}>再取得</button>
                </div>
              )}
            </div>

            {/* 見積詳細 */}
            <div className="test-section">
              <h4>見積詳細取得</h4>
              <input
                type="number"
                placeholder="見積ID"
                value={selectedEstimateId || ''}
                onChange={e => setSelectedEstimateId(Number(e.target.value) || null)}
              />
              <div className="test-status">
                状態:{' '}
                {estimateQuery.isLoading
                  ? '読み込み中...'
                  : estimateQuery.isError
                    ? 'エラー'
                    : estimateQuery.isSuccess
                      ? '成功'
                      : '待機中'}
              </div>
              {estimateQuery.data && (
                <div className="data-preview">見積名: {estimateQuery.data.estimate_name}</div>
              )}
            </div>

            {/* CRUD操作 */}
            <div className="test-section">
              <h4>CRUD操作テスト</h4>
              <div className="button-group">
                <button onClick={testCrudOperations} disabled={createEstimateMutation.isLoading}>
                  {createEstimateMutation.isLoading ? '作成中...' : '見積作成テスト'}
                </button>
              </div>
              {testResults.createEstimate && (
                <div
                  className={`test-result ${testResults.createEstimate.success ? 'success' : 'error'}`}
                >
                  {testResults.createEstimate.success
                    ? '✅ 作成成功'
                    : `❌ 作成失敗: ${testResults.createEstimate.error}`}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'pricemaster' && (
          <div className="pricemaster-test">
            <h3>単価マスタAPI テスト</h3>

            <div className="test-section">
              <h4>単価マスタ取得</h4>
              <div className="test-status">
                状態:{' '}
                {priceMasterQuery.isLoading
                  ? '読み込み中...'
                  : priceMasterQuery.isError
                    ? 'エラー'
                    : priceMasterQuery.isSuccess
                      ? '成功'
                      : '待機中'}
              </div>
              {priceMasterQuery.data && (
                <div className="data-preview">
                  取得件数: {priceMasterQuery.data.length}件
                  <button onClick={() => priceMasterQuery.refetch()}>再取得</button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'loading' && (
          <div className="loading-test">
            <h3>ローディング状態テスト</h3>

            <div className="test-section">
              <div className="button-group">
                <button onClick={testLoadingStates}>ローディングテスト実行</button>
                <button onClick={testFileHandling}>ファイル処理テスト</button>
              </div>

              {loading.isLoading && (
                <div className="loading-display">
                  <div>メッセージ: {loading.message}</div>
                  <div>進捗: {loading.progress}%</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${loading.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'errors' && (
          <div className="error-test">
            <h3>エラーハンドリングテスト</h3>

            <div className="test-section">
              <div className="button-group">
                <button onClick={testErrorHandling}>エラーハンドリングテスト実行</button>
              </div>
              <p>各種エラー状況でのアプリケーションの動作を確認します。</p>
            </div>
          </div>
        )}
      </div>

      {/* 統合テスト実行 */}
      <div className="test-actions">
        <button className="run-all-tests" onClick={runAllTests}>
          🚀 全統合テスト実行
        </button>
        <button onClick={runApiTests}>API基本テスト</button>
      </div>

      {/* テスト結果表示 */}
      {Object.keys(testResults).length > 0 && (
        <div className="test-results">
          <h3>テスト結果</h3>
          {Object.entries(testResults).map(([testName, result]) => (
            <div
              key={testName}
              className={`test-result-item ${result.success ? 'success' : 'error'}`}
            >
              <div className="test-name">{testName}</div>
              <div className="test-status">
                {result.success ? '✅ 成功' : `❌ 失敗: ${result.error}`}
              </div>
              {result.timestamp && (
                <div className="test-timestamp">{new Date(result.timestamp).toLocaleString()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiIntegrationTest;
