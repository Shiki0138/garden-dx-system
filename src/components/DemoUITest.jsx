/**
 * Garden システム UI動作確認用デモページ
 * 認証不要でUIの動作を確認できるページ
 */

import React, { useState, useEffect, useMemo } from 'react';
import './DemoUITest.css';
import { log } from '../utils/logger';
import { showSuccess, showError, showInfo } from '../utils/notifications';

const DemoUITest = () => {
  const [estimates, setEstimates] = useState([]);
  const [priceMaster, setPriceMaster] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentEstimate, setCurrentEstimate] = useState({
    estimate_number: 'EST-2025-DEMO',
    customer_name: '',
    project_name: '',
    estimate_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // デモデータ（useMemoで最適化）
  const demoEstimates = useMemo(
    () => [
      {
        estimate_id: 1,
        estimate_number: 'EST-2025-001',
        estimate_date: '2025-07-01',
        customer_name: 'テスト造園株式会社',
        project_name: '庭園リフォーム工事',
        total_amount: 250000,
        status: 'draft',
      },
      {
        estimate_id: 2,
        estimate_number: 'EST-2025-002',
        estimate_date: '2025-07-01',
        customer_name: 'ABC造園設計',
        project_name: '商業施設緑化工事',
        total_amount: 580000,
        status: 'approved',
      },
    ],
    []
  );

  const demoPriceMaster = useMemo(
    () => [
      {
        item_id: 1,
        category: '植栽工事',
        sub_category: '高木',
        item_name: 'クロマツ H3.0m',
        unit: '本',
        unit_price: 26000,
      },
      {
        item_id: 2,
        category: '植栽工事',
        sub_category: '低木',
        item_name: 'ヒラドツツジ',
        unit: '本',
        unit_price: 2100,
      },
      {
        item_id: 3,
        category: '土工事',
        sub_category: '土壌改良',
        item_name: '客土・土壌改良',
        unit: 'm3',
        unit_price: 6000,
      },
      {
        item_id: 4,
        category: '外構工事',
        sub_category: '石材',
        item_name: '御影石縁石',
        unit: 'm',
        unit_price: 10000,
      },
    ],
    []
  );

  useEffect(() => {
    setEstimates(demoEstimates);
    setPriceMaster(demoPriceMaster);
  }, [demoEstimates, demoPriceMaster]);

  const addItemToEstimate = item => {
    const newItem = {
      ...item,
      quantity: 1,
      line_total: item.unit_price,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const updateQuantity = (index, quantity) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = parseInt(quantity, 10);
    updatedItems[index].line_total = updatedItems[index].unit_price * parseInt(quantity, 10);
    setSelectedItems(updatedItems);
  };

  const removeItem = index => {
    const updatedItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updatedItems);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + item.line_total, 0);
  };

  const generatePDF = () => {
    const pdfInfo = `見積書: ${currentEstimate.estimate_number}\n顧客: ${currentEstimate.customer_name}\n工事名: ${currentEstimate.project_name}\n合計金額: ¥${calculateTotal().toLocaleString()}`;
    log.info('PDF生成機能デモ実行:', { pdfInfo });
    showInfo(`PDF生成機能デモ\n\n${pdfInfo}\n\n実際の本番環境ではPDFが生成されます。`);
  };

  const saveEstimate = () => {
    const newEstimate = {
      ...currentEstimate,
      estimate_id: estimates.length + 1,
      total_amount: calculateTotal(),
      status: 'draft',
      items: selectedItems,
    };

    setEstimates([...estimates, newEstimate]);
    log.info('見積書保存:', newEstimate);
    showSuccess('見積書が保存されました！');

    // フォームリセット
    setCurrentEstimate({
      estimate_number: `EST-2025-${String(estimates.length + 2).padStart(3, '0')}`,
      customer_name: '',
      project_name: '',
      estimate_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setSelectedItems([]);
  };

  return (
    <div className="demo-ui-container">
      <header className="demo-header">
        <h1>🏡 Garden システム UI動作確認</h1>
        <p>造園業向け統合業務管理システム - デモ環境</p>
      </header>

      <div className="demo-content">
        {/* 見積一覧セクション */}
        <section className="estimates-section">
          <h2>📋 見積一覧</h2>
          <div className="estimates-grid">
            {estimates.map(estimate => (
              <div key={estimate.estimate_id} className="estimate-card">
                <div className="estimate-header">
                  <span className="estimate-number">{estimate.estimate_number}</span>
                  <span className={`status ${estimate.status}`}>
                    {estimate.status === 'draft' ? '下書き' : '承認済み'}
                  </span>
                </div>
                <div className="estimate-details">
                  <p>
                    <strong>顧客:</strong> {estimate.customer_name}
                  </p>
                  <p>
                    <strong>工事名:</strong> {estimate.project_name}
                  </p>
                  <p>
                    <strong>金額:</strong> ¥{estimate.total_amount.toLocaleString()}
                  </p>
                  <p>
                    <strong>日付:</strong> {estimate.estimate_date}
                  </p>
                </div>
                <div className="estimate-actions">
                  <button className="btn-primary">編集</button>
                  <button className="btn-secondary" onClick={generatePDF}>
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 新規見積作成セクション */}
        <section className="new-estimate-section">
          <h2>✨ 新規見積作成</h2>

          <div className="estimate-form">
            <div className="form-row">
              <div className="form-group">
                <label>見積番号:</label>
                <input
                  type="text"
                  value={currentEstimate.estimate_number}
                  onChange={e =>
                    setCurrentEstimate({ ...currentEstimate, estimate_number: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>日付:</label>
                <input
                  type="date"
                  value={currentEstimate.estimate_date}
                  onChange={e =>
                    setCurrentEstimate({ ...currentEstimate, estimate_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>顧客名:</label>
                <input
                  type="text"
                  placeholder="例: 田中造園株式会社"
                  value={currentEstimate.customer_name}
                  onChange={e =>
                    setCurrentEstimate({ ...currentEstimate, customer_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>工事名:</label>
                <input
                  type="text"
                  placeholder="例: 住宅庭園リフォーム工事"
                  value={currentEstimate.project_name}
                  onChange={e =>
                    setCurrentEstimate({ ...currentEstimate, project_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>備考:</label>
              <textarea
                placeholder="工事に関する特記事項があれば入力してください"
                value={currentEstimate.notes}
                onChange={e => setCurrentEstimate({ ...currentEstimate, notes: e.target.value })}
              />
            </div>
          </div>

          {/* 単価マスタ選択 */}
          <div className="price-master-section">
            <h3>🌿 単価マスタから選択</h3>
            <div className="price-master-grid">
              {priceMaster.map(item => (
                <div key={item.item_id} className="price-item">
                  <div className="item-info">
                    <span className="category">{item.category}</span>
                    <h4>{item.item_name}</h4>
                    <p>
                      単価: ¥{item.unit_price.toLocaleString()} / {item.unit}
                    </p>
                  </div>
                  <button className="btn-add" onClick={() => addItemToEstimate(item)}>
                    追加
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 選択された項目 */}
          {selectedItems.length > 0 && (
            <div className="selected-items-section">
              <h3>📝 見積明細</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>項目名</th>
                    <th>単価</th>
                    <th>数量</th>
                    <th>単位</th>
                    <th>金額</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name}</td>
                      <td>¥{item.unit_price.toLocaleString()}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateQuantity(index, e.target.value)}
                          className="quantity-input"
                        />
                      </td>
                      <td>{item.unit}</td>
                      <td>¥{item.line_total.toLocaleString()}</td>
                      <td>
                        <button className="btn-remove" onClick={() => removeItem(index)}>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="4">
                      <strong>合計金額</strong>
                    </td>
                    <td>
                      <strong>¥{calculateTotal().toLocaleString()}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* アクションボタン */}
          <div className="estimate-actions-section">
            <button
              className="btn-save"
              onClick={saveEstimate}
              disabled={
                !currentEstimate.customer_name ||
                !currentEstimate.project_name ||
                selectedItems.length === 0
              }
            >
              💾 見積保存
            </button>
            <button className="btn-pdf" onClick={generatePDF} disabled={selectedItems.length === 0}>
              📄 PDF生成
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DemoUITest;
