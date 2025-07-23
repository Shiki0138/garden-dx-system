import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiCheck, FiPlus, FiInfo } from 'react-icons/fi';

const Container = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  color: #2d5a2d;
  margin: 0;
`;

const InfoCard = styled.div`
  background: #e8f5e8;
  border: 1px solid #4a7c4a;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const InfoText = styled.p`
  color: #2d5a2d;
  margin: 0;
  flex: 1;
  font-size: 14px;
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
`;

const SelectAllButton = styled.button`
  background: transparent;
  color: #4a7c4a;
  border: 2px solid #4a7c4a;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #e8f5e8;
  }
`;

const AddCustomButton = styled.button`
  background: linear-gradient(135deg, #7cb342, #4a7c4a);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const CategorySection = styled.div`
  margin-bottom: 30px;
`;

const CategoryTitle = styled.h3`
  color: #4a7c4a;
  margin-bottom: 15px;
  font-size: 18px;
`;

const ItemsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 12px;
`;

const ItemCard = styled.div`
  background: ${props => props.checked ? '#f0f8f0' : '#fafafa'};
  border: 2px solid ${props => props.checked ? '#4a7c4a' : '#e0e0e0'};
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;

  &:hover {
    border-color: #4a7c4a;
    background: ${props => props.checked ? '#e8f5e8' : '#f5f5f5'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const Checkbox = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.checked ? '#4a7c4a' : '#ccc'};
  border-radius: 4px;
  background: ${props => props.checked ? '#4a7c4a' : 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
`;

const ItemContent = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const ItemDetails = styled.div`
  font-size: 12px;
  color: #666;
  display: flex;
  justify-content: space-between;
`;

const ItemPrice = styled.span`
  color: #4a7c4a;
  font-weight: 500;
`;

const ItemQuantity = styled.input`
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  margin-left: 8px;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
  }
`;

const Summary = styled.div`
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 2px solid #e8f5e8;
  padding: 20px;
  margin: 0 -20px -20px;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 16px;
`;

const SummaryLabel = styled.span`
  color: #666;
`;

const SummaryValue = styled.span`
  font-weight: 600;
  color: #2d5a2d;
`;

const PriceMasterSelection = ({ categories, markupRate, onItemsChange, onAddCustom }) => {
  // 全項目を初期状態でチェック済みとして設定
  const [checkedItems, setCheckedItems] = useState(new Map());
  const [quantities, setQuantities] = useState(new Map());

  console.log('PriceMasterSelection - categories:', categories);
  console.log('PriceMasterSelection - markupRate:', markupRate);

  // 初期化：全項目をチェック済みに
  useEffect(() => {
    const initialChecked = new Map();
    const initialQuantities = new Map();
    
    Object.values(categories).forEach(items => {
      items.forEach(item => {
        initialChecked.set(item.item_id, true);
        initialQuantities.set(item.item_id, 1);
      });
    });
    
    setCheckedItems(initialChecked);
    setQuantities(initialQuantities);
  }, [categories]);

  // チェック状態の切り替え
  const toggleItem = useCallback((itemId) => {
    setCheckedItems(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, !newMap.get(itemId));
      return newMap;
    });
  }, []);

  // 数量の変更
  const updateQuantity = useCallback((itemId, quantity) => {
    const numQuantity = parseFloat(quantity) || 0;
    if (numQuantity >= 0) {
      setQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(itemId, numQuantity);
        return newMap;
      });
    }
  }, []);

  // 全選択/全解除
  const toggleAll = useCallback(() => {
    const allChecked = Array.from(checkedItems.values()).every(v => v);
    const newCheckedState = !allChecked;
    
    const newMap = new Map();
    checkedItems.forEach((_, itemId) => {
      newMap.set(itemId, newCheckedState);
    });
    setCheckedItems(newMap);
  }, [checkedItems]);

  // チェックされた項目を親コンポーネントに通知
  useEffect(() => {
    const selectedItems = [];
    
    Object.entries(categories).forEach(([category, items]) => {
      items.forEach(item => {
        if (checkedItems.get(item.item_id)) {
          const quantity = quantities.get(item.item_id) || 1;
          selectedItems.push({
            id: item.item_id,
            category: item.category,
            sub_category: item.sub_category,
            item_name: item.item_name,
            quantity: quantity,
            unit: item.unit,
            purchase_price: item.purchase_price,
            markup_rate: markupRate,
            unit_price: Math.round(item.purchase_price * markupRate),
            line_total: Math.round(item.purchase_price * markupRate * quantity),
            line_cost: Math.round(item.purchase_price * quantity),
            adjustment: 0,
            is_custom: false,
            master_item_id: item.item_id,
          });
        }
      });
    });
    
    onItemsChange(selectedItems);
  }, [checkedItems, quantities, categories, markupRate, onItemsChange]);

  // 選択中のアイテム数と合計金額を計算
  const summary = React.useMemo(() => {
    let count = 0;
    let total = 0;
    
    checkedItems.forEach((checked, itemId) => {
      if (checked) {
        count++;
        const item = Object.values(categories).flat().find(i => i.item_id === itemId);
        if (item) {
          const quantity = quantities.get(itemId) || 1;
          total += Math.round(item.purchase_price * markupRate * quantity);
        }
      }
    });
    
    return { count, total };
  }, [checkedItems, quantities, categories, markupRate]);

  const allChecked = Array.from(checkedItems.values()).every(v => v);

  return (
    <Container>
      <Header>
        <Title>工事項目の選択</Title>
      </Header>

      <InfoCard>
        <FiInfo size={20} color="#4a7c4a" />
        <InfoText>
          必要な工事項目にチェックを入れてください。チェックを外した項目は見積から除外されます。
          数量は項目ごとに調整できます。
        </InfoText>
      </InfoCard>

      <ControlsRow>
        <SelectAllButton onClick={toggleAll}>
          {allChecked ? '全て解除' : '全て選択'}
        </SelectAllButton>
        <AddCustomButton onClick={onAddCustom}>
          <FiPlus />
          カスタム項目を追加
        </AddCustomButton>
      </ControlsRow>

      {Object.entries(categories).map(([category, items]) => (
        <CategorySection key={category}>
          <CategoryTitle>{category}</CategoryTitle>
          <ItemsGrid>
            {items.map(item => {
              const isChecked = checkedItems.get(item.item_id) || false;
              const quantity = quantities.get(item.item_id) || 1;
              const unitPrice = Math.round(item.purchase_price * markupRate);
              
              return (
                <ItemCard 
                  key={item.item_id}
                  checked={isChecked}
                  onClick={() => toggleItem(item.item_id)}
                >
                  <Checkbox checked={isChecked}>
                    {isChecked && <FiCheck color="white" size={16} />}
                  </Checkbox>
                  <ItemContent>
                    <ItemName>{item.item_name}</ItemName>
                    <ItemDetails>
                      <ItemPrice>
                        ¥{unitPrice.toLocaleString()} / {item.unit}
                      </ItemPrice>
                      <div onClick={(e) => e.stopPropagation()}>
                        数量:
                        <ItemQuantity
                          type="number"
                          value={quantity}
                          onChange={(e) => updateQuantity(item.item_id, e.target.value)}
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </ItemDetails>
                  </ItemContent>
                </ItemCard>
              );
            })}
          </ItemsGrid>
        </CategorySection>
      ))}

      <Summary>
        <SummaryRow>
          <SummaryLabel>選択中の項目数</SummaryLabel>
          <SummaryValue>{summary.count} 項目</SummaryValue>
        </SummaryRow>
        <SummaryRow>
          <SummaryLabel>小計（税抜）</SummaryLabel>
          <SummaryValue>¥{summary.total.toLocaleString()}</SummaryValue>
        </SummaryRow>
      </Summary>
    </Container>
  );
};

export default PriceMasterSelection;