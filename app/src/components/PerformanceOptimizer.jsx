/**
 * Garden DX - パフォーマンス最適化コンポーネント
 * React.memo、useMemo、useCallbackを活用したパフォーマンス改善
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';

// 重いコンポーネントの最適化例
const ExpensiveListItem = memo(({ item, onUpdate, onDelete }) => {
  // 計算コストの高い処理をメモ化
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(item.price);
  }, [item.price]);

  // イベントハンドラーをメモ化
  const handleUpdate = useCallback((event) => {
    onUpdate(item.id, event.target.value);
  }, [item.id, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <ListItemContainer>
      <ItemName>{item.name}</ItemName>
      <ItemPrice>{formattedPrice}</ItemPrice>
      <input 
        value={item.quantity || 0}
        onChange={handleUpdate}
        type="number"
      />
      <button onClick={handleDelete}>削除</button>
    </ListItemContainer>
  );
});

// 大きなリストコンポーネントの最適化
const OptimizedEstimateList = memo(({ estimates, searchTerm, sortBy }) => {
  // フィルタリングとソートをメモ化
  const filteredAndSortedEstimates = useMemo(() => {
    const result = estimates.filter(estimate => 
      estimate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [estimates, searchTerm, sortBy]);

  // イベントハンドラーをメモ化
  const handleUpdateEstimate = useCallback((id, data) => {
    // API呼び出しなどの処理
    console.log('見積更新:', id, data);
  }, []);

  const handleDeleteEstimate = useCallback((id) => {
    if (window.confirm('この見積を削除しますか？')) {
      console.log('見積削除:', id);
    }
  }, []);

  return (
    <EstimateListContainer>
      <ListHeader>
        見積一覧 ({filteredAndSortedEstimates.length}件)
      </ListHeader>
      <EstimateGrid>
        {filteredAndSortedEstimates.map(estimate => (
          <OptimizedEstimateCard
            key={estimate.id}
            estimate={estimate}
            onUpdate={handleUpdateEstimate}
            onDelete={handleDeleteEstimate}
          />
        ))}
      </EstimateGrid>
    </EstimateListContainer>
  );
});

// 見積カードコンポーネントの最適化
const OptimizedEstimateCard = memo(({ estimate, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // カードの計算をメモ化
  const cardSummary = useMemo(() => ({
    totalItems: estimate.items?.length || 0,
    totalAmount: estimate.items?.reduce((sum, item) => sum + item.amount, 0) || 0,
    status: estimate.status || 'draft',
    daysAgo: Math.floor((Date.now() - new Date(estimate.date)) / (1000 * 60 * 60 * 24))
  }), [estimate]);

  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(cardSummary.totalAmount);
  }, [cardSummary.totalAmount]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    onUpdate(estimate.id, { lastEdited: new Date() });
  }, [estimate.id, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(estimate.id);
  }, [estimate.id, onDelete]);

  return (
    <EstimateCard>
      <CardHeader onClick={handleToggleExpand}>
        <EstimateName>{estimate.name}</EstimateName>
        <EstimateAmount>{formattedAmount}</EstimateAmount>
      </CardHeader>
      
      <CardMeta>
        <MetaItem>顧客: {estimate.customer}</MetaItem>
        <MetaItem>項目数: {cardSummary.totalItems}</MetaItem>
        <MetaItem>作成: {cardSummary.daysAgo}日前</MetaItem>
      </CardMeta>

      {isExpanded && (
        <CardDetails>
          <DetailsList>
            {estimate.items?.map(item => (
              <DetailsItem key={item.id}>
                {item.name}: {item.quantity} × {item.unitPrice}円
              </DetailsItem>
            ))}
          </DetailsList>
          <CardActions>
            <ActionButton onClick={handleEdit}>編集</ActionButton>
            <ActionButton variant="danger" onClick={handleDelete}>削除</ActionButton>
          </CardActions>
        </CardDetails>
      )}
    </EstimateCard>
  );
});

// Virtual Scrollingを使った大量データ表示の最適化
const VirtualizedList = memo(({ items, itemHeight = 60, containerHeight = 400 }) => {
  const [scrollTop, setScrollTop] = useState(0);

  // 表示範囲の計算をメモ化
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, items.length);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  // 表示アイテムをメモ化
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <VirtualContainer 
      height={containerHeight}
      onScroll={handleScroll}
    >
      <VirtualContent height={totalHeight}>
        <VisibleItemsContainer style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <VirtualItem 
              key={visibleRange.start + index} 
              height={itemHeight}
            >
              <ExpensiveListItem 
                item={item}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            </VirtualItem>
          ))}
        </VisibleItemsContainer>
      </VirtualContent>
    </VirtualContainer>
  );
});

// スタイルコンポーネント
const ListItemContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
`;

const ItemName = styled.span`
  flex: 1;
  font-weight: 500;
`;

const ItemPrice = styled.span`
  color: #059669;
  font-weight: 600;
`;

const EstimateListContainer = styled.div`
  padding: 20px;
`;

const ListHeader = styled.h3`
  margin: 0 0 20px 0;
  color: #374151;
`;

const EstimateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const EstimateCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  padding: 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
`;

const EstimateName = styled.h4`
  margin: 0 0 8px 0;
  color: #1f2937;
`;

const EstimateAmount = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #059669;
`;

const CardMeta = styled.div`
  padding: 12px 16px;
  background: #f9fafb;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const CardDetails = styled.div`
  padding: 16px;
  border-top: 1px solid #f3f4f6;
`;

const DetailsList = styled.div`
  margin-bottom: 16px;
`;

const DetailsItem = styled.div`
  padding: 4px 0;
  font-size: 14px;
  color: #6b7280;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
  
  ${props => props.variant === 'danger' ? `
    background: #dc2626;
    color: white;
    &:hover { background: #b91c1c; }
  ` : `
    background: #3b82f6;
    color: white;
    &:hover { background: #2563eb; }
  `}
`;

const VirtualContainer = styled.div`
  height: ${props => props.height}px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const VirtualContent = styled.div`
  height: ${props => props.height}px;
  position: relative;
`;

const VisibleItemsContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
`;

const VirtualItem = styled.div`
  height: ${props => props.height}px;
`;

export {
  ExpensiveListItem,
  OptimizedEstimateList,
  OptimizedEstimateCard,
  VirtualizedList
};

export default memo(() => (
  <div>
    <h2>パフォーマンス最適化コンポーネント</h2>
    <p>React.memo、useMemo、useCallbackを活用した高速レンダリング</p>
  </div>
));