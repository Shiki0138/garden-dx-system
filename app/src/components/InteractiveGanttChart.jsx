import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import {
  Calendar,
  Download,
  Edit3,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react';
import { generateProcessPDF } from '../utils/processPDFGenerator';

/**
 * インタラクティブガントチャート
 * - 開始日の入力
 * - バーのドラッグ＆ドロップで日程変更
 * - バーの端をドラッグでリサイズ
 * - 工程のソート機能
 */
const InteractiveGanttChart = ({ initialData = [], projectName = '' }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleData, setScheduleData] = useState([]);
  const [sortOrder, setSortOrder] = useState('default'); // default, name, duration, startDate
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedOverItem, setDraggedOverItem] = useState(null);
  const [resizeItem, setResizeItem] = useState(null);
  const [resizeType, setResizeType] = useState(null); // 'start' or 'end'
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  // 初期データから日付を設定
  useEffect(() => {
    if (initialData.length > 0) {
      const dataWithOrder = initialData.map((item, index) => ({
        ...item,
        order: item.order !== undefined ? item.order : index + 1,
        startTime: item.startTime || 'AM',
        endTime: item.endTime || 'PM',
      }));
      const dataWithDates = calculateScheduleDates(dataWithOrder, startDate);
      setScheduleData(dataWithDates);
    }
  }, [initialData, startDate]);

  // チャート幅の監視
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 日付からスケジュールを計算
  const calculateScheduleDates = (data, baseStartDate) => {
    const currentDate = new Date(baseStartDate);
    return data.map((item, index) => {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + item.duration - 1);
      currentDate.setDate(currentDate.getDate() + item.duration);

      return {
        ...item,
        id: item.id || index,
        order: item.order || index + 1,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startDay: Math.ceil((startDate - new Date(baseStartDate)) / (1000 * 60 * 60 * 24)),
        startTime: item.startTime || 'AM',
        endTime: item.endTime || 'PM',
      };
    });
  };

  // 総工期を計算
  const totalDuration = scheduleData.reduce((sum, item) => sum + item.duration, 0);

  // ソート処理
  const handleSort = type => {
    setSortOrder(type);
    const sorted = [...scheduleData];

    switch (type) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'duration':
        sorted.sort((a, b) => b.duration - a.duration);
        break;
      case 'startDate':
        sorted.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      default:
        return;
    }

    // ソート後にorder番号を更新
    const sortedWithOrder = sorted.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setScheduleData(sortedWithOrder);
  };

  // ドラッグ開始（バーのドラッグ）
  const handleBarDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('dragType', 'bar');
  };

  // ドラッグ開始（行の並び替え）
  const handleRowDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('dragType', 'row');
  };

  // 行のドラッグオーバー
  const handleRowDragOver = (e, item) => {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== item.id) {
      setDraggedOverItem(item);
    }
  };

  // 行のドラッグ終了
  const handleRowDragLeave = () => {
    setDraggedOverItem(null);
  };

  // 行のドロップ処理
  const handleRowDrop = (e, targetItem) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData('dragType');

    if (dragType === 'row' && draggedItem && targetItem.id !== draggedItem.id) {
      const newData = [...scheduleData];
      const draggedIndex = newData.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newData.findIndex(item => item.id === targetItem.id);

      // 要素を削除して挿入
      const [removed] = newData.splice(draggedIndex, 1);
      newData.splice(targetIndex, 0, removed);

      // order番号を更新
      const updatedData = newData.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      setScheduleData(updatedData);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  // ドラッグオーバー
  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ドロップ処理（チャートエリア）
  const handleChartDrop = e => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData('dragType');

    if (dragType === 'bar' && draggedItem && chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const dayWidth = chartWidth / totalDuration;
      const newStartDay = Math.round(x / dayWidth);

      // 新しい開始日を計算
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() + newStartDay);

      const updatedData = scheduleData.map(item => {
        if (item.id === draggedItem.id) {
          const endDate = new Date(newStartDate);
          endDate.setDate(endDate.getDate() + item.duration - 1);

          return {
            ...item,
            startDate: newStartDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            startDay: newStartDay,
          };
        }
        return item;
      });
      setScheduleData(updatedData);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  // リサイズ開始
  const handleResizeStart = (e, item, type) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeItem(item);
    setResizeType(type);
  };

  // リサイズ処理
  const handleMouseMove = useCallback(
    e => {
      if (!resizeItem || !chartRef.current) return;

      const rect = chartRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const dayWidth = chartWidth / totalDuration;
      const currentDay = Math.round(x / dayWidth);

      const updatedData = scheduleData.map(item => {
        if (item.id === resizeItem.id) {
          if (resizeType === 'start') {
            const newStartDay = Math.max(0, currentDay);
            const newDuration = item.startDay + item.duration - newStartDay;

            if (newDuration >= 1) {
              const newStartDate = new Date(startDate);
              newStartDate.setDate(newStartDate.getDate() + newStartDay);

              return {
                ...item,
                startDate: newStartDate.toISOString().split('T')[0],
                startDay: newStartDay,
                duration: newDuration,
              };
            }
          } else if (resizeType === 'end') {
            const endDay = currentDay;
            const newDuration = Math.max(1, endDay - item.startDay + 1);

            const endDate = new Date(item.startDate);
            endDate.setDate(endDate.getDate() + newDuration - 1);

            return {
              ...item,
              duration: newDuration,
              endDate: endDate.toISOString().split('T')[0],
            };
          }
        }
        return item;
      });

      setScheduleData(updatedData);
    },
    [resizeItem, resizeType, scheduleData, chartWidth, totalDuration, startDate]
  );

  // リサイズ終了
  const handleMouseUp = () => {
    setResizeItem(null);
    setResizeType(null);
  };

  // マウスイベントの登録
  useEffect(() => {
    if (resizeItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeItem, resizeType, handleMouseMove]);

  // 並び替え機能の更新
  const updateItemOrder = (itemId, newOrder) => {
    const parsedOrder = parseInt(newOrder, 10);
    if (isNaN(parsedOrder) || parsedOrder < 1) return;

    const updatedData = [...scheduleData];
    const itemIndex = updatedData.findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    // 現在のアイテムを削除
    const [movedItem] = updatedData.splice(itemIndex, 1);

    // 新しい位置に挿入
    const newIndex = Math.min(parsedOrder - 1, updatedData.length);
    updatedData.splice(newIndex, 0, movedItem);

    // order番号を更新
    const reorderedData = updatedData.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setScheduleData(reorderedData);
  };

  // 日付と時間の更新
  const updateItemDateTime = (itemId, field, value) => {
    const updatedData = scheduleData.map(item => {
      if (item.id === itemId) {
        const updated = { ...item };

        if (field === 'startDate' || field === 'startTime') {
          updated[field] = value;
          // 開始日が変更された場合、終了日も再計算
          if (field === 'startDate') {
            const newStartDate = new Date(value);
            const newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + item.duration - 1);
            updated.endDate = newEndDate.toISOString().split('T')[0];

            // startDayも更新
            updated.startDay = Math.ceil(
              (newStartDate - new Date(startDate)) / (1000 * 60 * 60 * 24)
            );
          }
        } else if (field === 'endDate' || field === 'endTime') {
          updated[field] = value;
          // 終了日が変更された場合、期間を再計算
          if (field === 'endDate') {
            const start = new Date(item.startDate);
            const end = new Date(value);
            const newDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            updated.duration = Math.max(1, newDuration);
          }
        }

        return updated;
      }
      return item;
    });

    setScheduleData(updatedData);
  };

  // PDF出力
  const handlePDFExport = async () => {
    try {
      await generateProcessPDF(scheduleData, projectName);
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成に失敗しました');
    }
  };

  // 日付ヘッダーを生成
  const generateDateHeaders = () => {
    const headers = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDuration);

    const currentDate = new Date(startDate);
    const endTime = endDate.getTime();

    while (currentDate.getTime() <= endTime) {
      headers.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return headers;
  };

  const dateHeaders = generateDateHeaders();

  return (
    <Container>
      <Header>
        <Title>
          <Calendar size={24} />
          インタラクティブ工程ガントチャート
        </Title>
        <Controls>
          <DateInputWrapper>
            <label>開始日：</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </DateInputWrapper>

          <SortDropdown>
            <label>並び替え：</label>
            <select value={sortOrder} onChange={e => handleSort(e.target.value)}>
              <option value="default">デフォルト</option>
              <option value="name">作業名順</option>
              <option value="duration">期間順</option>
              <option value="startDate">開始日順</option>
            </select>
          </SortDropdown>

          <ActionButton onClick={handlePDFExport}>
            <Download size={16} />
            PDF出力
          </ActionButton>
        </Controls>
      </Header>

      <ChartContainer>
        <TaskList>
          <TaskHeader>
            <TaskHeaderCell style={{ width: '40%' }}>作業項目</TaskHeaderCell>
            <TaskHeaderCell style={{ width: '60%' }}>期間</TaskHeaderCell>
          </TaskHeader>
          {scheduleData.map((item, index) => (
            <TaskRow
              key={item.id}
              draggable
              onDragStart={e => handleRowDragStart(e, item)}
              onDragOver={e => handleRowDragOver(e, item)}
              onDragLeave={handleRowDragLeave}
              onDrop={e => handleRowDrop(e, item)}
              isDragging={draggedItem?.id === item.id}
              isDraggedOver={draggedOverItem?.id === item.id}
            >
              <DragHandle>
                <GripVertical size={14} />
              </DragHandle>
              <TaskIndex>
                <OrderInput
                  type="number"
                  min="1"
                  value={item.order || index + 1}
                  onChange={e => updateItemOrder(item.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </TaskIndex>
              <TaskName>{item.name}</TaskName>
              <TaskDateTimeContainer>
                <DateTimeGroup>
                  <DateTimeLabel>開始:</DateTimeLabel>
                  <DateInput
                    type="date"
                    value={item.startDate}
                    onChange={e => updateItemDateTime(item.id, 'startDate', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  <TimeSelect
                    value={item.startTime}
                    onChange={e => updateItemDateTime(item.id, 'startTime', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="AM">午前</option>
                    <option value="PM">午後</option>
                  </TimeSelect>
                </DateTimeGroup>
                <DateTimeGroup>
                  <DateTimeLabel>終了:</DateTimeLabel>
                  <DateInput
                    type="date"
                    value={item.endDate}
                    onChange={e => updateItemDateTime(item.id, 'endDate', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  <TimeSelect
                    value={item.endTime}
                    onChange={e => updateItemDateTime(item.id, 'endTime', e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="AM">午前</option>
                    <option value="PM">午後</option>
                  </TimeSelect>
                </DateTimeGroup>
                <DurationDisplay>{item.duration}日間</DurationDisplay>
              </TaskDateTimeContainer>
            </TaskRow>
          ))}
        </TaskList>

        <TimelineContainer>
          <DateHeader>
            {dateHeaders.map((header, index) => (
              <DateCell key={index}>
                <DateMonth>{header.month}月</DateMonth>
                <DateDay>{header.day}</DateDay>
              </DateCell>
            ))}
          </DateHeader>

          <ChartArea ref={chartRef} onDragOver={handleDragOver} onDrop={handleChartDrop}>
            {scheduleData.map((item, index) => {
              const leftPercent = (item.startDay / totalDuration) * 100;
              const widthPercent = (item.duration / totalDuration) * 100;
              // orderを使用して実際の表示順序と一致させる
              const position = (item.order - 1) || index;

              return (
                <GanttBar
                  key={item.id}
                  index={index}
                  draggable
                  onDragStart={e => handleBarDragStart(e, item)}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: `${position * 80 + 20}px`, // TaskRowの高さ（80px）と一致させる
                  }}
                  category={item.category}
                  isDragging={draggedItem?.id === item.id}
                >
                  <ResizeHandle
                    position="left"
                    onMouseDown={e => handleResizeStart(e, item, 'start')}
                  />
                  <BarContent>
                    <BarLabel>{item.name}</BarLabel>
                    <BarDuration>{item.duration}日</BarDuration>
                  </BarContent>
                  <ResizeHandle
                    position="right"
                    onMouseDown={e => handleResizeStart(e, item, 'end')}
                  />
                </GanttBar>
              );
            })}
          </ChartArea>
        </TimelineContainer>
      </ChartContainer>

      <Summary>
        総工期: {totalDuration}日間 ({startDate} 〜 {scheduleData[scheduleData.length - 1]?.endDate}
        )
      </Summary>
    </Container>
  );
};

// スタイル定義
const Container = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const DateInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-weight: 600;
    color: #666;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #2d5016;
    }
  }
`;

const SortDropdown = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-weight: 600;
    color: #666;
  }

  select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #2d5016;
    }
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2d5016;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1e3410;
    transform: translateY(-1px);
  }
`;

const ChartContainer = styled.div`
  display: flex;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
`;

const TaskList = styled.div`
  width: 500px;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
`;

const TaskHeader = styled.div`
  display: flex;
  padding: 12px 16px;
  background: #e8f0e8;
  border-bottom: 1px solid #d0d0d0;
  font-weight: 600;
`;

const TaskHeaderCell = styled.div`
  flex: 1;
  color: #2d5016;
`;

const TaskRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  cursor: move;
  transition: all 0.2s;
  min-height: 80px;

  ${props =>
    props.isDragging &&
    `
    opacity: 0.5;
    background: #f0f0f0;
  `}

  ${props =>
    props.isDraggedOver &&
    `
    border-top: 2px solid #2d5016;
  `}
  
  &:hover {
    background: #f8f9fa;
  }
`;

const TaskIndex = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f0e8;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #2d5016;
  margin-right: 12px;
`;

const TaskName = styled.div`
  flex: 0 0 140px;
  font-weight: 500;
  padding-right: 12px;
`;

const TaskDateTimeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const DateTimeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DateTimeLabel = styled.span`
  font-size: 12px;
  color: #666;
  min-width: 32px;
`;

const DateInput = styled.input`
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  width: 110px;

  &:focus {
    outline: none;
    border-color: #2d5016;
  }
`;

const TimeSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  width: 60px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #2d5016;
  }
`;

const DurationDisplay = styled.div`
  font-size: 12px;
  color: #2d5016;
  font-weight: 600;
  text-align: right;
  padding-right: 8px;
`;

const TimelineContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const DateHeader = styled.div`
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #d0d0d0;
  min-height: 48px;
`;

const DateCell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e0e0e0;
  padding: 4px;
  min-width: 40px;
`;

const DateMonth = styled.div`
  font-size: 10px;
  color: #666;
`;

const DateDay = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

const ChartArea = styled.div`
  position: relative;
  flex: 1;
  background: white;
  min-height: 400px;
`;

const GanttBar = styled.div`
  position: absolute;
  height: 40px;
  border-radius: 6px;
  cursor: move;
  transition: all 0.15s ease-out;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  ${props =>
    props.category === '植栽工事' &&
    `
    background: linear-gradient(135deg, #4caf50, #45a049);
  `}

  ${props =>
    props.category === '土工事' &&
    `
    background: linear-gradient(135deg, #ff9800, #f57c00);
  `}
  
  ${props =>
    props.category === '設備工事' &&
    `
    background: linear-gradient(135deg, #2196f3, #1976d2);
  `}
  
  ${props =>
    props.category === '仕上げ工事' &&
    `
    background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  `}
  
  ${props =>
    props.isDragging &&
    `
    opacity: 0.6;
  `}
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10;
    transform: translateY(-2px);
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.3);

  ${props => (props.position === 'left' ? 'left: 0;' : 'right: 0;')}

  &:hover {
    background: rgba(255, 255, 255, 0.5);
  }
`;

const BarContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
  color: white;
`;

const BarLabel = styled.div`
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BarDuration = styled.div`
  font-size: 12px;
  opacity: 0.9;
  margin-left: 8px;
`;

const Summary = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #2d5016;
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  color: #999;
  cursor: grab;

  &:hover {
    color: #666;
  }

  &:active {
    cursor: grabbing;
  }
`;

const OrderInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #2d5016;

  &:focus {
    outline: none;
    background: white;
    border: 1px solid #2d5016;
    border-radius: 2px;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export default InteractiveGanttChart;
