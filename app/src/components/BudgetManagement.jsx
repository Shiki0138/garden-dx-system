import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { DollarSign, TrendingUp, TrendingDown, Plus, Edit2, Save, X, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';

const BudgetManagement = ({ projectId, estimateId, onBudgetUpdate }) => {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showMobileForm, setShowMobileForm] = useState(false);

  // 予算データ取得
  const fetchBudgetData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [budgetResponse, suppliersResponse, ordersResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/budget`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/suppliers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/projects/${projectId}/purchase-orders`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const budgetData = await budgetResponse.json();
      const suppliersData = await suppliersResponse.json();
      const ordersData = await ordersResponse.json();

      setBudgetItems(budgetData.items || []);
      setSuppliers(suppliersData.suppliers || []);
      setPurchaseOrders(ordersData.orders || []);
    } catch (error) {
      console.error('予算データの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 仕入額更新
  const updatePurchaseAmount = useCallback(async (itemId, purchaseAmount, supplierId) => {
    try {
      const response = await fetch(`/api/budget-items/${itemId}/purchase`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ purchaseAmount, supplierId })
      });

      if (response.ok) {
        setBudgetItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, purchaseAmount, supplierId } : item
        ));
        onBudgetUpdate?.();
      }
    } catch (error) {
      console.error('仕入額の更新に失敗しました:', error);
    }
  }, [onBudgetUpdate]);

  // 掛け率更新
  const updateMarkupRate = useCallback(async (itemId, markupRate) => {
    try {
      const response = await fetch(`/api/budget-items/${itemId}/markup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ markupRate })
      });

      if (response.ok) {
        setBudgetItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, markupRate } : item
        ));
        onBudgetUpdate?.();
      }
    } catch (error) {
      console.error('掛け率の更新に失敗しました:', error);
    }
  }, [onBudgetUpdate]);

  // 実績額更新
  const updateActualAmount = useCallback(async (itemId, actualAmount) => {
    try {
      const response = await fetch(`/api/budget-items/${itemId}/actual`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ actualAmount })
      });

      if (response.ok) {
        setBudgetItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, actualAmount } : item
        ));
        onBudgetUpdate?.();
      }
    } catch (error) {
      console.error('実績額の更新に失敗しました:', error);
    }
  }, [onBudgetUpdate]);

  // 予算サマリー計算
  const budgetSummary = useMemo(() => {
    const totalBudget = budgetItems.reduce((sum, item) => sum + (item.budgetAmount || 0), 0);
    const totalPurchase = budgetItems.reduce((sum, item) => sum + (item.purchaseAmount || 0), 0);
    const totalActual = budgetItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
    const totalProfit = totalBudget - totalPurchase;
    const profitRate = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - totalActual;
    const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalPurchase,
      totalActual,
      totalProfit,
      profitRate,
      remainingBudget,
      budgetUtilization
    };
  }, [budgetItems]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading) {
    return <LoadingContainer>予算データを読み込み中...</LoadingContainer>;
  }

  return (
    <Container>
      <Header>
        <Title>予算管理</Title>
        <MobileButton onClick={() => setShowMobileForm(true)}>
          <Plus size={16} />
          仕入額入力
        </MobileButton>
      </Header>

      <SummaryCards>
        <SummaryCard>
          <SummaryIcon>
            <DollarSign size={24} color="#3b82f6" />
          </SummaryIcon>
          <SummaryContent>
            <SummaryTitle>予算総額</SummaryTitle>
            <SummaryAmount>{formatCurrency(budgetSummary.totalBudget)}</SummaryAmount>
          </SummaryContent>
        </SummaryCard>

        <SummaryCard>
          <SummaryIcon>
            <Calculator size={24} color="#10b981" />
          </SummaryIcon>
          <SummaryContent>
            <SummaryTitle>仕入総額</SummaryTitle>
            <SummaryAmount>{formatCurrency(budgetSummary.totalPurchase)}</SummaryAmount>
          </SummaryContent>
        </SummaryCard>

        <SummaryCard>
          <SummaryIcon>
            <TrendingUp size={24} color="#f59e0b" />
          </SummaryIcon>
          <SummaryContent>
            <SummaryTitle>利益予想</SummaryTitle>
            <SummaryAmount>{formatCurrency(budgetSummary.totalProfit)}</SummaryAmount>
            <SummarySubtext>利益率: {budgetSummary.profitRate.toFixed(1)}%</SummarySubtext>
          </SummaryContent>
        </SummaryCard>

        <SummaryCard>
          <SummaryIcon>
            <TrendingDown size={24} color="#ef4444" />
          </SummaryIcon>
          <SummaryContent>
            <SummaryTitle>実績額</SummaryTitle>
            <SummaryAmount>{formatCurrency(budgetSummary.totalActual)}</SummaryAmount>
            <SummarySubtext>使用率: {budgetSummary.budgetUtilization.toFixed(1)}%</SummarySubtext>
          </SummaryContent>
        </SummaryCard>
      </SummaryCards>

      <BudgetTable>
        <TableHeader>
          <HeaderRow>
            <HeaderCell>項目名</HeaderCell>
            <HeaderCell>予算額</HeaderCell>
            <HeaderCell>仕入額</HeaderCell>
            <HeaderCell>掛け率</HeaderCell>
            <HeaderCell>実績額</HeaderCell>
            <HeaderCell>差額</HeaderCell>
            <HeaderCell>仕入先</HeaderCell>
            <HeaderCell>操作</HeaderCell>
          </HeaderRow>
        </TableHeader>
        <TableBody>
          {budgetItems.map(item => (
            <BudgetItemRow
              key={item.id}
              item={item}
              suppliers={suppliers}
              onUpdatePurchase={updatePurchaseAmount}
              onUpdateMarkup={updateMarkupRate}
              onUpdateActual={updateActualAmount}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              formatCurrency={formatCurrency}
            />
          ))}
        </TableBody>
      </BudgetTable>

      {showMobileForm && (
        <MobileBudgetForm
          budgetItems={budgetItems}
          suppliers={suppliers}
          onUpdatePurchase={updatePurchaseAmount}
          onUpdateMarkup={updateMarkupRate}
          onUpdateActual={updateActualAmount}
          onClose={() => setShowMobileForm(false)}
          formatCurrency={formatCurrency}
        />
      )}

      <PurchaseOrderSection>
        <SectionTitle>発注管理</SectionTitle>
        <PurchaseOrderList>
          {purchaseOrders.map(order => (
            <PurchaseOrderItem key={order.id}>
              <OrderInfo>
                <OrderTitle>{order.supplierName}</OrderTitle>
                <OrderAmount>{formatCurrency(order.amount)}</OrderAmount>
              </OrderInfo>
              <OrderStatus status={order.status}>
                {order.status === 'pending' && '発注待ち'}
                {order.status === 'ordered' && '発注済み'}
                {order.status === 'delivered' && '納品済み'}
                {order.status === 'paid' && '支払済み'}
              </OrderStatus>
            </PurchaseOrderItem>
          ))}
        </PurchaseOrderList>
      </PurchaseOrderSection>
    </Container>
  );
};

// 予算項目行コンポーネント
const BudgetItemRow = ({ 
  item, 
  suppliers, 
  onUpdatePurchase, 
  onUpdateMarkup, 
  onUpdateActual,
  editingItem,
  setEditingItem,
  formatCurrency 
}) => {
  const [editValues, setEditValues] = useState({
    purchaseAmount: item.purchaseAmount || 0,
    markupRate: item.markupRate || 1.3,
    actualAmount: item.actualAmount || 0,
    supplierId: item.supplierId || ''
  });

  const handleEdit = () => {
    setEditingItem(item.id);
    setEditValues({
      purchaseAmount: item.purchaseAmount || 0,
      markupRate: item.markupRate || 1.3,
      actualAmount: item.actualAmount || 0,
      supplierId: item.supplierId || ''
    });
  };

  const handleSave = async () => {
    await onUpdatePurchase(item.id, editValues.purchaseAmount, editValues.supplierId);
    await onUpdateMarkup(item.id, editValues.markupRate);
    await onUpdateActual(item.id, editValues.actualAmount);
    setEditingItem(null);
  };

  const handleCancel = () => {
    setEditingItem(null);
  };

  const difference = (item.budgetAmount || 0) - (item.actualAmount || 0);
  const isEditing = editingItem === item.id;

  return (
    <TableRow>
      <TableCell>{item.name}</TableCell>
      <TableCell>{formatCurrency(item.budgetAmount)}</TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="number"
            value={editValues.purchaseAmount}
            onChange={(e) => setEditValues({...editValues, purchaseAmount: parseFloat(e.target.value) || 0})}
          />
        ) : (
          formatCurrency(item.purchaseAmount)
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="number"
            step="0.1"
            value={editValues.markupRate}
            onChange={(e) => setEditValues({...editValues, markupRate: parseFloat(e.target.value) || 1.0})}
          />
        ) : (
          `${item.markupRate || 1.3}倍`
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="number"
            value={editValues.actualAmount}
            onChange={(e) => setEditValues({...editValues, actualAmount: parseFloat(e.target.value) || 0})}
          />
        ) : (
          formatCurrency(item.actualAmount)
        )}
      </TableCell>
      <TableCell>
        <DifferenceAmount positive={difference >= 0}>
          {formatCurrency(difference)}
        </DifferenceAmount>
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select
            value={editValues.supplierId}
            onChange={(e) => setEditValues({...editValues, supplierId: e.target.value})}
          >
            <option value="">選択してください</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        ) : (
          suppliers.find(s => s.id === item.supplierId)?.name || '-'
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <ActionButtons>
            <ActionButton onClick={handleSave}>
              <Save size={16} />
            </ActionButton>
            <ActionButton onClick={handleCancel}>
              <X size={16} />
            </ActionButton>
          </ActionButtons>
        ) : (
          <ActionButton onClick={handleEdit}>
            <Edit2 size={16} />
          </ActionButton>
        )}
      </TableCell>
    </TableRow>
  );
};

// スマホ用予算フォーム
const MobileBudgetForm = ({ 
  budgetItems, 
  suppliers, 
  onUpdatePurchase, 
  onUpdateMarkup, 
  onUpdateActual, 
  onClose,
  formatCurrency 
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    purchaseAmount: 0,
    markupRate: 1.3,
    actualAmount: 0,
    supplierId: ''
  });

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setFormData({
      purchaseAmount: item.purchaseAmount || 0,
      markupRate: item.markupRate || 1.3,
      actualAmount: item.actualAmount || 0,
      supplierId: item.supplierId || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    await onUpdatePurchase(selectedItem.id, formData.purchaseAmount, formData.supplierId);
    await onUpdateMarkup(selectedItem.id, formData.markupRate);
    await onUpdateActual(selectedItem.id, formData.actualAmount);
    
    alert('更新しました');
    onClose();
  };

  const calculatedSellingPrice = formData.purchaseAmount * formData.markupRate;

  return (
    <MobileOverlay onClick={onClose}>
      <MobileFormContainer onClick={(e) => e.stopPropagation()}>
        <MobileFormHeader>
          <h3>仕入額・実績入力</h3>
          <button onClick={onClose}>×</button>
        </MobileFormHeader>
        
        <MobileFormContent>
          <FormGroup>
            <label>項目選択</label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => {
                const item = budgetItems.find(i => i.id === e.target.value);
                handleItemSelect(item);
              }}
            >
              <option value="">項目を選択</option>
              {budgetItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - {formatCurrency(item.budgetAmount)}
                </option>
              ))}
            </select>
          </FormGroup>

          {selectedItem && (
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <label>仕入額</label>
                <Input
                  type="number"
                  value={formData.purchaseAmount}
                  onChange={(e) => setFormData({...formData, purchaseAmount: parseFloat(e.target.value) || 0})}
                  placeholder="仕入額を入力"
                />
              </FormGroup>

              <FormGroup>
                <label>掛け率</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.markupRate}
                  onChange={(e) => setFormData({...formData, markupRate: parseFloat(e.target.value) || 1.0})}
                  placeholder="掛け率を入力"
                />
                <FormHelp>
                  販売価格: {formatCurrency(calculatedSellingPrice)}
                </FormHelp>
              </FormGroup>

              <FormGroup>
                <label>実績額</label>
                <Input
                  type="number"
                  value={formData.actualAmount}
                  onChange={(e) => setFormData({...formData, actualAmount: parseFloat(e.target.value) || 0})}
                  placeholder="実績額を入力"
                />
              </FormGroup>

              <FormGroup>
                <label>仕入先</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                >
                  <option value="">選択してください</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <MobileFormActions>
                <button type="button" onClick={onClose}>
                  キャンセル
                </button>
                <button type="submit">
                  更新
                </button>
              </MobileFormActions>
            </form>
          )}
        </MobileFormContent>
      </MobileFormContainer>
    </MobileOverlay>
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
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

const MobileButton = styled.button`
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
`;

const SummaryIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SummaryContent = styled.div`
  flex: 1;
`;

const SummaryTitle = styled.h3`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 5px 0;
`;

const SummaryAmount = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
`;

const SummarySubtext = styled.div`
  font-size: 12px;
  color: #9ca3af;
  margin-top: 5px;
`;

const BudgetTable = styled.table`
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TableHeader = styled.thead`
  background: #f9fafb;
`;

const HeaderRow = styled.tr``;

const HeaderCell = styled.th`
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  &:hover {
    background: #f9fafb;
  }
`;

const TableCell = styled.td`
  padding: 15px;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const DifferenceAmount = styled.span`
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 6px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const PurchaseOrderSection = styled.div`
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

const PurchaseOrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PurchaseOrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const OrderInfo = styled.div`
  flex: 1;
`;

const OrderTitle = styled.div`
  font-weight: 600;
  color: #1f2937;
`;

const OrderAmount = styled.div`
  color: #6b7280;
  font-size: 14px;
`;

const OrderStatus = styled.div`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch(props.status) {
      case 'pending':
        return 'background: #fef3c7; color: #92400e;';
      case 'ordered':
        return 'background: #dbeafe; color: #1e40af;';
      case 'delivered':
        return 'background: #d1fae5; color: #065f46;';
      case 'paid':
        return 'background: #f3e8ff; color: #6b21a8;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const MobileOverlay = styled.div`
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

const MobileFormContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const MobileFormHeader = styled.div`
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

const MobileFormContent = styled.div`
  padding: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
  }
  
  input, select {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
`;

const FormHelp = styled.div`
  margin-top: 6px;
  font-size: 14px;
  color: #6b7280;
`;

const MobileFormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  
  button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    
    &[type="button"] {
      background: #f3f4f6;
      color: #374151;
    }
    
    &[type="submit"] {
      background: #3b82f6;
      color: white;
    }
  }
`;

export default BudgetManagement;