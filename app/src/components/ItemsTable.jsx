/**
 * Garden 造園業向け統合業務管理システム
 * 見積明細テーブル - 階層構造・ドラッグ&ドロップ対応
 * Excelライクな操作性を実現
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';
import { FiMenu, FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi';

const TableContainer = styled.div`
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0; /* flexbox内での高さ調整 */
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 40px 2fr 100px 80px 100px 100px 100px 50px;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
  color: #495057;
  min-width: 900px; /* 最小幅を設定 */
`;

const HeaderCell = styled.div`
  padding: 12px 8px;
  border-right: 1px solid #dee2e6;
  text-align: ${props => props.align || 'left'};
  font-size: 13px;
`;

const TableBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: auto; /* 横スクロールを追加 */
  min-height: 0; /* flexbox内での高さ調整 */
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 40px 2fr 100px 80px 100px 100px 100px 50px;
  border-bottom: 1px solid #e9ecef;
  background-color: ${props => {
    if (props.itemType === 'header') return '#f1f3f4';
    if (props.level > 0) return '#fafbfc';
    return 'white';
  }};
  opacity: ${props => (props.isDragging ? 0.5 : 1)};
  cursor: ${props => (props.isDragging ? 'grabbing' : 'default')};
  min-width: 900px; /* 最小幅を設定 */

  &:hover {
    background-color: ${props => {
      if (props.itemType === 'header') return '#e8eaed';
      return '#f8f9fa';
    }};
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #6c757d;
  padding: 8px;

  &:hover {
    color: #495057;
  }
`;

const ItemCell = styled.div`
  padding: 8px;
  border-right: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  padding-left: ${props => (props.level || 0) * 20 + 8}px;

  &.editable {
    cursor: text;
  }
`;

const EditableInput = styled.input`
  border: none;
  background: transparent;
  width: 100%;
  font-size: 14px;

  &:focus {
    outline: 2px solid #007bff;
    background: white;
    border-radius: 3px;
    padding: 2px 4px;
  }
`;

const EditableTextarea = styled.textarea`
  border: none;
  background: transparent;
  width: 100%;
  font-size: 14px;
  resize: none;
  min-height: 20px;

  &:focus {
    outline: 2px solid #007bff;
    background: white;
    border-radius: 3px;
    padding: 2px 4px;
  }
`;

const NumberInput = styled(EditableInput)`
  text-align: right;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6c757d;

  &:hover {
    color: #dc3545;
  }
`;

const TotalRow = styled.div`
  display: grid;
  grid-template-columns: 40px 2fr 100px 80px 100px 100px 100px 50px;
  background-color: #f8f9fa;
  border-top: 2px solid #dee2e6;
  font-weight: 600;
  min-width: 900px; /* 最小幅を設定 */
`;

const TotalCell = styled.div`
  padding: 12px 8px;
  border-right: 1px solid #dee2e6;
  text-align: ${props => props.align || 'left'};
`;

const ITEM_TYPE = 'ESTIMATE_ITEM';

const DraggableItemRow = ({ item, index, moveItem, onUpdateItem, onDeleteItem }) => {
  const [editingField, setEditingField] = useState(null);
  const [localValues, setLocalValues] = useState({});
  const ref = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id: item.item_id, index };
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const dragRef = drag(drop(ref));

  // 編集完了時の処理
  const handleFieldUpdate = async (field, value) => {
    if (value !== item[field]) {
      await onUpdateItem(item.item_id, { [field]: value });
    }
    setEditingField(null);
    setLocalValues({});
  };

  // キー入力処理
  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFieldUpdate(field, localValues[field] || item[field]);
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setLocalValues({});
    }
  };

  // 数値フォーマット
  const formatNumber = value => {
    if (!value && value !== 0) return '';
    return Number(value).toLocaleString();
  };

  // 金額計算
  const calculateLineTotal = () => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const adjustment = item.line_item_adjustment || 0;
    return quantity * unitPrice + adjustment;
  };

  return (
    <ItemRow
      ref={dragRef}
      isDragging={isDragging}
      itemType={item.item_type}
      level={item.level}
      data-handler-id={handlerId}
    >
      {/* ドラッグハンドル */}
      <DragHandle>
        <FiMenu />
      </DragHandle>

      {/* 品目・摘要 */}
      <ItemCell level={item.level} className="editable">
        {editingField === 'item_description' ? (
          <EditableTextarea
            value={localValues.item_description || item.item_description}
            onChange={e => setLocalValues({ ...localValues, item_description: e.target.value })}
            onBlur={() =>
              handleFieldUpdate(
                'item_description',
                localValues.item_description || item.item_description
              )
            }
            onKeyDown={e => handleKeyDown(e, 'item_description')}
            autoFocus
          />
        ) : (
          <div
            onClick={() => {
              setEditingField('item_description');
              setLocalValues({ ...localValues, item_description: item.item_description });
            }}
            style={{
              fontWeight: item.item_type === 'header' ? 'bold' : 'normal',
              color: item.item_type === 'header' ? '#495057' : 'inherit',
            }}
          >
            {item.item_description || ''}
          </div>
        )}
      </ItemCell>

      {/* 数量 */}
      <ItemCell>
        {item.item_type === 'item' &&
          (editingField === 'quantity' ? (
            <NumberInput
              type="number"
              step="0.01"
              value={
                localValues.quantity !== undefined ? localValues.quantity : item.quantity || ''
              }
              onChange={e => setLocalValues({ ...localValues, quantity: e.target.value })}
              onBlur={() => handleFieldUpdate('quantity', localValues.quantity || item.quantity)}
              onKeyDown={e => handleKeyDown(e, 'quantity')}
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditingField('quantity');
                setLocalValues({ ...localValues, quantity: item.quantity });
              }}
            >
              {item.quantity || ''}
            </div>
          ))}
      </ItemCell>

      {/* 単位 */}
      <ItemCell>
        {item.item_type === 'item' &&
          (editingField === 'unit' ? (
            <EditableInput
              value={localValues.unit !== undefined ? localValues.unit : item.unit || ''}
              onChange={e => setLocalValues({ ...localValues, unit: e.target.value })}
              onBlur={() => handleFieldUpdate('unit', localValues.unit || item.unit)}
              onKeyDown={e => handleKeyDown(e, 'unit')}
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditingField('unit');
                setLocalValues({ ...localValues, unit: item.unit });
              }}
            >
              {item.unit || ''}
            </div>
          ))}
      </ItemCell>

      {/* 単価 */}
      <ItemCell>
        {item.item_type === 'item' &&
          (editingField === 'unit_price' ? (
            <NumberInput
              type="number"
              value={
                localValues.unit_price !== undefined
                  ? localValues.unit_price
                  : item.unit_price || ''
              }
              onChange={e => setLocalValues({ ...localValues, unit_price: e.target.value })}
              onBlur={() =>
                handleFieldUpdate('unit_price', localValues.unit_price || item.unit_price)
              }
              onKeyDown={e => handleKeyDown(e, 'unit_price')}
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditingField('unit_price');
                setLocalValues({ ...localValues, unit_price: item.unit_price });
              }}
              style={{ textAlign: 'right' }}
            >
              {formatNumber(item.unit_price)}
            </div>
          ))}
      </ItemCell>

      {/* 調整額 */}
      <ItemCell>
        {item.item_type === 'item' &&
          (editingField === 'line_item_adjustment' ? (
            <NumberInput
              type="number"
              value={
                localValues.line_item_adjustment !== undefined
                  ? localValues.line_item_adjustment
                  : item.line_item_adjustment || ''
              }
              onChange={e =>
                setLocalValues({ ...localValues, line_item_adjustment: e.target.value })
              }
              onBlur={() =>
                handleFieldUpdate(
                  'line_item_adjustment',
                  localValues.line_item_adjustment || item.line_item_adjustment
                )
              }
              onKeyDown={e => handleKeyDown(e, 'line_item_adjustment')}
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditingField('line_item_adjustment');
                setLocalValues({ ...localValues, line_item_adjustment: item.line_item_adjustment });
              }}
              style={{ textAlign: 'right' }}
            >
              {formatNumber(item.line_item_adjustment)}
            </div>
          ))}
      </ItemCell>

      {/* 金額 */}
      <ItemCell style={{ textAlign: 'right' }}>
        {item.item_type === 'item' && formatNumber(calculateLineTotal())}
      </ItemCell>

      {/* アクション */}
      <ItemCell>
        <ActionButton onClick={() => onDeleteItem(item.item_id)} title="削除">
          <FiTrash2 />
        </ActionButton>
      </ItemCell>
    </ItemRow>
  );
};

const ItemsTable = ({ items = [], onUpdateItem, onDeleteItem, onReorderItems, estimate }) => {
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const moveItem = (dragIndex, hoverIndex) => {
    const newItems = [...localItems];
    const draggedItem = newItems[dragIndex];

    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);

    setLocalItems(newItems);
  };

  const handleDragEnd = () => {
    if (JSON.stringify(localItems) !== JSON.stringify(items)) {
      onReorderItems(localItems);
    }
  };

  // 合計計算
  const calculateTotals = () => {
    const subtotal = localItems
      .filter(item => item.item_type === 'item')
      .reduce((sum, item) => {
        const quantity = item.quantity || 0;
        const unitPrice = item.unit_price || 0;
        const adjustment = item.line_item_adjustment || 0;
        return sum + (quantity * unitPrice + adjustment);
      }, 0);

    return {
      subtotal,
      adjustment: estimate?.adjustment_amount || 0,
      total: subtotal + (estimate?.adjustment_amount || 0),
    };
  };

  const totals = calculateTotals();

  return (
    <TableContainer>
      {/* テーブルヘッダー */}
      <TableHeader>
        <HeaderCell></HeaderCell>
        <HeaderCell>品目・摘要</HeaderCell>
        <HeaderCell align="center">数量</HeaderCell>
        <HeaderCell align="center">単位</HeaderCell>
        <HeaderCell align="center">単価</HeaderCell>
        <HeaderCell align="center">調整額</HeaderCell>
        <HeaderCell align="center">金額</HeaderCell>
        <HeaderCell></HeaderCell>
      </TableHeader>

      {/* テーブルボディ */}
      <TableBody>
        {localItems.map((item, index) => (
          <DraggableItemRow
            key={item.item_id}
            item={item}
            index={index}
            moveItem={moveItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </TableBody>

      {/* 合計行 */}
      <TotalRow>
        <TotalCell></TotalCell>
        <TotalCell style={{ fontWeight: 'bold' }}>小計</TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell align="right">{totals.subtotal.toLocaleString()}</TotalCell>
        <TotalCell></TotalCell>
      </TotalRow>

      {totals.adjustment !== 0 && (
        <TotalRow>
          <TotalCell></TotalCell>
          <TotalCell style={{ fontWeight: 'bold' }}>調整額</TotalCell>
          <TotalCell></TotalCell>
          <TotalCell></TotalCell>
          <TotalCell></TotalCell>
          <TotalCell></TotalCell>
          <TotalCell align="right">{totals.adjustment.toLocaleString()}</TotalCell>
          <TotalCell></TotalCell>
        </TotalRow>
      )}

      <TotalRow style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
        <TotalCell></TotalCell>
        <TotalCell style={{ fontWeight: 'bold' }}>合計</TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell></TotalCell>
        <TotalCell align="right">{totals.total.toLocaleString()}</TotalCell>
        <TotalCell></TotalCell>
      </TotalRow>
    </TableContainer>
  );
};

export default ItemsTable;
