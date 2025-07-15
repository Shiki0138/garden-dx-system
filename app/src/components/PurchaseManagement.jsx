import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Package, Truck, Calculator, TrendingUp, Plus, Search, Filter, Download } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';

const PurchaseManagement = ({ projectId, onPurchaseUpdate }) => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markupRates, setMarkupRates] = useState({});
  const [priceHistory, setPriceHistory] = useState([]);

  // 仕入れデータ取得
  const fetchPurchaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [purchasesRes, suppliersRes, categoriesRes, markupRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/purchases`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/suppliers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/purchase-categories`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/markup-rates`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const [purchasesData, suppliersData, categoriesData, markupData] = await Promise.all([
        purchasesRes.json(),
        suppliersRes.json(),
        categoriesRes.json(),
        markupRes.json()
      ]);

      setPurchases(purchasesData.purchases || []);
      setSuppliers(suppliersData.suppliers || []);
      setCategories(categoriesData.categories || []);
      setMarkupRates(markupData.rates || {});
    } catch (error) {
      console.error('仕入れデータの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 仕入れ価格履歴取得
  const fetchPriceHistory = useCallback(async (itemName) => {
    try {
      const response = await fetch(`/api/price-history/${encodeURIComponent(itemName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setPriceHistory(data.history || []);
    } catch (error) {
      console.error('価格履歴の取得に失敗しました:', error);
    }
  }, []);

  // 新しい仕入れ記録を追加
  const addPurchase = useCallback(async (purchaseData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(purchaseData)
      });

      if (response.ok) {
        const newPurchase = await response.json();
        setPurchases(prev => [...prev, newPurchase]);
        onPurchaseUpdate?.();
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('仕入れ記録の追加に失敗しました:', error);
    }
  }, [projectId, onPurchaseUpdate]);

  // 仕入れ記録を更新
  const updatePurchase = useCallback(async (purchaseId, updates) => {
    try {
      const response = await fetch(`/api/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedPurchase = await response.json();
        setPurchases(prev => prev.map(p => 
          p.id === purchaseId ? updatedPurchase : p
        ));
        onPurchaseUpdate?.();
        setEditingPurchase(null);
      }
    } catch (error) {
      console.error('仕入れ記録の更新に失敗しました:', error);
    }
  }, [onPurchaseUpdate]);

  // 掛け率を更新
  const updateMarkupRate = useCallback(async (category, rate) => {
    try {
      const response = await fetch(`/api/markup-rates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ category, rate })
      });

      if (response.ok) {
        setMarkupRates(prev => ({ ...prev, [category]: rate }));
        
        // 該当カテゴリの全ての仕入れの販売価格を再計算
        setPurchases(prev => prev.map(p => 
          p.category === category 
            ? { ...p, sellingPrice: p.purchasePrice * rate }
            : p
        ));
      }
    } catch (error) {
      console.error('掛け率の更新に失敗しました:', error);
    }
  }, []);

  // フィルタリングされた仕入れ一覧
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || purchase.category === selectedCategory;
      const matchesSupplier = !selectedSupplier || purchase.supplierId === selectedSupplier;
      
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [purchases, searchTerm, selectedCategory, selectedSupplier]);

  // 統計情報
  const statistics = useMemo(() => {
    const totalPurchases = filteredPurchases.length;
    const totalPurchaseAmount = filteredPurchases.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalSellingAmount = filteredPurchases.reduce((sum, p) => sum + p.sellingPrice, 0);
    const totalProfit = totalSellingAmount - totalPurchaseAmount;
    const profitRate = totalPurchaseAmount > 0 ? (totalProfit / totalPurchaseAmount) * 100 : 0;
    
    const categoryBreakdown = {};
    filteredPurchases.forEach(p => {
      if (!categoryBreakdown[p.category]) {
        categoryBreakdown[p.category] = { count: 0, amount: 0, profit: 0 };
      }
      categoryBreakdown[p.category].count++;
      categoryBreakdown[p.category].amount += p.purchasePrice;
      categoryBreakdown[p.category].profit += (p.sellingPrice - p.purchasePrice);
    });

    return {
      totalPurchases,
      totalPurchaseAmount,
      totalSellingAmount,
      totalProfit,
      profitRate,
      categoryBreakdown
    };
  }, [filteredPurchases]);

  useEffect(() => {
    fetchPurchaseData();
  }, [fetchPurchaseData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading) {
    return <LoadingContainer>仕入れデータを読み込み中...</LoadingContainer>;
  }

  return (
    <Container>
      <Header>
        <Title>仕入れ・掛け率管理</Title>
        <HeaderActions>
          <ActionButton onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            仕入れ追加
          </ActionButton>
        </HeaderActions>
      </Header>

      <StatisticsGrid>
        <StatCard>
          <StatIcon><Package size={24} color="#3b82f6" /></StatIcon>
          <StatContent>
            <StatLabel>仕入れ件数</StatLabel>
            <StatValue>{statistics.totalPurchases}件</StatValue>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon><Truck size={24} color="#10b981" /></StatIcon>
          <StatContent>
            <StatLabel>仕入れ総額</StatLabel>
            <StatValue>{formatCurrency(statistics.totalPurchaseAmount)}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon><Calculator size={24} color="#f59e0b" /></StatIcon>
          <StatContent>
            <StatLabel>販売総額</StatLabel>
            <StatValue>{formatCurrency(statistics.totalSellingAmount)}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon><TrendingUp size={24} color="#ef4444" /></StatIcon>
          <StatContent>
            <StatLabel>利益額</StatLabel>
            <StatValue>{formatCurrency(statistics.totalProfit)}</StatValue>
            <StatSubtext>利益率: {statistics.profitRate.toFixed(1)}%</StatSubtext>
          </StatContent>
        </StatCard>
      </StatisticsGrid>

      <FiltersContainer>
        <SearchInput>
          <Search size={16} />
          <input
            type="text"
            placeholder="品目名・仕入先で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchInput>

        <FilterSelect>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">全カテゴリ</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </FilterSelect>

        <FilterSelect>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="">全仕入先</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </FilterSelect>
      </FiltersContainer>

      <ContentTabs>
        <TabHeader>
          <TabButton active>仕入れ一覧</TabButton>
          <TabButton>掛け率設定</TabButton>
          <TabButton>価格履歴</TabButton>
        </TabHeader>

        <TabContent>
          <PurchaseTable>
            <thead>
              <tr>
                <th>品目名</th>
                <th>カテゴリ</th>
                <th>仕入先</th>
                <th>仕入価格</th>
                <th>掛け率</th>
                <th>販売価格</th>
                <th>利益額</th>
                <th>仕入日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(purchase => (
                <PurchaseRow key={purchase.id}>
                  <td>{purchase.itemName}</td>
                  <td>
                    <CategoryTag category={purchase.category}>
                      {categories.find(c => c.id === purchase.category)?.name || '-'}
                    </CategoryTag>
                  </td>
                  <td>{purchase.supplierName}</td>
                  <td>{formatCurrency(purchase.purchasePrice)}</td>
                  <td>{purchase.markupRate}倍</td>
                  <td>{formatCurrency(purchase.sellingPrice)}</td>
                  <td>
                    <ProfitAmount profit={purchase.sellingPrice - purchase.purchasePrice}>
                      {formatCurrency(purchase.sellingPrice - purchase.purchasePrice)}
                    </ProfitAmount>
                  </td>
                  <td>{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                  <td>
                    <ActionButton 
                      size="small"
                      onClick={() => setEditingPurchase(purchase)}
                    >
                      編集
                    </ActionButton>
                  </td>
                </PurchaseRow>
              ))}
            </tbody>
          </PurchaseTable>
        </TabContent>
      </ContentTabs>

      <MarkupRateSection>
        <SectionTitle>カテゴリ別掛け率設定</SectionTitle>
        <MarkupGrid>
          {categories.map(category => (
            <MarkupCard key={category.id}>
              <MarkupCardHeader>
                <h4>{category.name}</h4>
                <MarkupRateDisplay>
                  {markupRates[category.id] || 1.3}倍
                </MarkupRateDisplay>
              </MarkupCardHeader>
              <MarkupRateInput
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={markupRates[category.id] || 1.3}
                onChange={(e) => updateMarkupRate(category.id, parseFloat(e.target.value))}
              />
              <MarkupCardFooter>
                <span>適用件数: {statistics.categoryBreakdown[category.id]?.count || 0}</span>
                <span>利益: {formatCurrency(statistics.categoryBreakdown[category.id]?.profit || 0)}</span>
              </MarkupCardFooter>
            </MarkupCard>
          ))}
        </MarkupGrid>
      </MarkupRateSection>

      {showAddForm && (
        <PurchaseForm
          onSubmit={addPurchase}
          onClose={() => setShowAddForm(false)}
          suppliers={suppliers}
          categories={categories}
          markupRates={markupRates}
        />
      )}

      {editingPurchase && (
        <PurchaseForm
          purchase={editingPurchase}
          onSubmit={(data) => updatePurchase(editingPurchase.id, data)}
          onClose={() => setEditingPurchase(null)}
          suppliers={suppliers}
          categories={categories}
          markupRates={markupRates}
        />
      )}
    </Container>
  );
};

// 仕入れ追加・編集フォーム
const PurchaseForm = ({ purchase, onSubmit, onClose, suppliers, categories, markupRates }) => {
  const [formData, setFormData] = useState({
    itemName: purchase?.itemName || '',
    category: purchase?.category || '',
    supplierId: purchase?.supplierId || '',
    purchasePrice: purchase?.purchasePrice || 0,
    quantity: purchase?.quantity || 1,
    unit: purchase?.unit || '個',
    purchaseDate: purchase?.purchaseDate || new Date().toISOString().split('T')[0],
    notes: purchase?.notes || ''
  });

  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    const markupRate = markupRates[formData.category] || 1.3;
    setCalculatedPrice(formData.purchasePrice * markupRate);
  }, [formData.purchasePrice, formData.category, markupRates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const markupRate = markupRates[formData.category] || 1.3;
    
    onSubmit({
      ...formData,
      markupRate,
      sellingPrice: calculatedPrice,
      supplierName: suppliers.find(s => s.id === formData.supplierId)?.name || ''
    });
  };

  return (
    <FormOverlay onClick={onClose}>
      <FormContainer onClick={(e) => e.stopPropagation()}>
        <FormHeader>
          <h3>{purchase ? '仕入れ編集' : '仕入れ追加'}</h3>
          <button onClick={onClose}>×</button>
        </FormHeader>

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <label>品目名 *</label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                placeholder="品目名を入力"
              />
            </FormGroup>

            <FormGroup>
              <label>カテゴリ *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="">選択してください</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup>
              <label>仕入先 *</label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
              >
                <option value="">選択してください</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </FormGroup>

            <FormGroup>
              <label>仕入価格 *</label>
              <PriceInput
                type="number"
                required
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
            </FormGroup>

            <FormGroup>
              <label>数量</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              />
            </FormGroup>

            <FormGroup>
              <label>単位</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="個">個</option>
                <option value="本">本</option>
                <option value="袋">袋</option>
                <option value="kg">kg</option>
                <option value="m">m</option>
                <option value="㎡">㎡</option>
                <option value="式">式</option>
              </select>
            </FormGroup>

            <FormGroup>
              <label>仕入日</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
              />
            </FormGroup>

            <FormGroup className="full-width">
              <label>備考</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="備考を入力"
                rows="3"
              />
            </FormGroup>
          </FormGrid>

          <PriceCalculation>
            <CalculationRow>
              <span>仕入価格:</span>
              <span>{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(formData.purchasePrice)}</span>
            </CalculationRow>
            <CalculationRow>
              <span>掛け率:</span>
              <span>{markupRates[formData.category] || 1.3}倍</span>
            </CalculationRow>
            <CalculationRow className="total">
              <span>販売価格:</span>
              <span>{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(calculatedPrice)}</span>
            </CalculationRow>
          </PriceCalculation>

          <FormActions>
            <button type="button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit">
              {purchase ? '更新' : '追加'}
            </button>
          </FormActions>
        </form>
      </FormContainer>
    </FormOverlay>
  );
};

// スタイル定義
const Container = styled.div`
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${props => props.size === 'small' ? '6px 12px' : '10px 16px'};
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #2563eb;
  }
`;

const StatisticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatLabel = styled.h3`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 5px 0;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
`;

const StatSubtext = styled.div`
  font-size: 12px;
  color: #9ca3af;
  margin-top: 5px;
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchInput = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  flex: 1;
  min-width: 200px;
  
  input {
    border: none;
    outline: none;
    flex: 1;
    font-size: 14px;
  }
`;

const FilterSelect = styled.div`
  select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    min-width: 120px;
  }
`;

const ContentTabs = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 30px;
`;

const TabHeader = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
`;

const TabButton = styled.button`
  padding: 15px 20px;
  background: ${props => props.active ? '#f9fafb' : 'white'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  font-weight: 500;
  color: ${props => props.active ? '#3b82f6' : '#6b7280'};
  
  &:hover {
    background: #f9fafb;
  }
`;

const TabContent = styled.div`
  padding: 20px;
`;

const PurchaseTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const PurchaseRow = styled.tr`
  &:hover {
    background: #f9fafb;
  }
`;

const CategoryTag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: #dbeafe;
  color: #1e40af;
`;

const ProfitAmount = styled.span`
  color: ${props => props.profit >= 0 ? '#10b981' : '#ef4444'};
  font-weight: 600;
`;

const MarkupRateSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 15px 0;
`;

const MarkupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const MarkupCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
`;

const MarkupCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  
  h4 {
    margin: 0;
    color: #1f2937;
  }
`;

const MarkupRateDisplay = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
`;

const MarkupRateInput = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-bottom: 10px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const MarkupCardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const FormOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const FormContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: #1f2937;
  }
  
  button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  
  .full-width {
    grid-column: 1 / -1;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
  }
  
  input, select, textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
`;

const PriceInput = styled.input`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
`;

const PriceCalculation = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 15px;
  margin: 0 20px 20px 20px;
`;

const CalculationRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &.total {
    font-weight: 600;
    font-size: 16px;
    color: #1f2937;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
    margin-top: 8px;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    
    &[type="button"] {
      background: #f3f4f6;
      color: #374151;
    }
    
    &[type="submit"] {
      background: #3b82f6;
      color: white;
    }
    
    &:hover {
      opacity: 0.9;
    }
  }
`;

export default PurchaseManagement;