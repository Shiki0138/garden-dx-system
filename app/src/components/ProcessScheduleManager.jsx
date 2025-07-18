/**
 * Garden DX 工程表管理システム - 高度な工程管理機能
 *
 * @features
 * - 見積書項目から工程期間の手入力
 * - 期間を踏まえた工程表案の自動生成
 * - スライドバーでの微調整機能
 * - ガントチャート形式での表示
 * - PDF出力機能
 *
 * @author Garden DX Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  CheckCircle,
  Settings,
  Download,
  Edit3,
  Save,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import InteractiveGanttChart from './InteractiveGanttChart';

const ProcessScheduleManager = ({ estimateData, onScheduleUpdate }) => {
  const [processItems, setProcessItems] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentView, setCurrentView] = useState('input'); // 'input' | 'schedule' | 'gantt' | 'interactive'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // 見積書から工程項目を抽出
  useEffect(() => {
    if (estimateData?.items) {
      const items = estimateData.items.map((item, index) => ({
        id: `item_${index}`,
        name: item.name || item.description,
        estimatedDays: 1, // デフォルト1日
        dependencies: [],
        category: item.category || '一般作業',
        quantity: item.quantity || 1,
        complexity: 'medium', // 'low' | 'medium' | 'high'
      }));
      setProcessItems(items);
    }
  }, [estimateData]);

  // 工程期間の更新
  const updateProcessDuration = useCallback((itemId, days) => {
    setProcessItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, estimatedDays: Math.max(1, parseInt(days, 10) || 1) } : item
      )
    );
  }, []);

  // 複雑度の更新
  const updateComplexity = useCallback((itemId, complexity) => {
    setProcessItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, complexity } : item))
    );
  }, []);

  // 工程表案の自動生成
  const generateSchedule = useCallback(() => {
    setIsGenerating(true);

    setTimeout(() => {
      const schedule = [];
      const baseDate = new Date(startDate);

      processItems.forEach((item, index) => {
        // 前の工程の終了日を基準に開始日を計算
        const previousItemEndDate =
          index > 0 ? new Date(schedule[index - 1].endDate) : new Date(baseDate);
        const startDateForItem =
          index > 0
            ? new Date(previousItemEndDate.getTime() + 2 * 24 * 60 * 60 * 1000) // 2日の余裕
            : new Date(baseDate);

        // 複雑度による日数調整
        const complexityMultiplier = {
          low: 0.8,
          medium: 1.0,
          high: 1.3,
        };

        const adjustedDays = Math.ceil(item.estimatedDays * complexityMultiplier[item.complexity]);
        const endDate = new Date(startDateForItem);
        endDate.setDate(endDate.getDate() + adjustedDays - 1);

        schedule.push({
          id: item.id,
          name: item.name,
          startDate: startDateForItem.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          duration: adjustedDays,
          progress: 0,
          category: item.category,
          dependencies: item.dependencies,
          status: 'pending',
        });
      });

      setScheduleData(schedule);
      setCurrentView('schedule');
      setIsGenerating(false);

      if (onScheduleUpdate) {
        onScheduleUpdate(schedule);
      }
    }, 1000);
  }, [processItems, startDate, onScheduleUpdate]);

  // スライドバーで期間調整
  const adjustScheduleItem = useCallback((itemId, newDuration) => {
    setScheduleData(prev => {
      const updatedSchedule = [...prev];
      const itemIndex = updatedSchedule.findIndex(item => item.id === itemId);

      if (itemIndex !== -1) {
        const item = updatedSchedule[itemIndex];
        const startDate = new Date(item.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + newDuration - 1);

        updatedSchedule[itemIndex] = {
          ...item,
          duration: newDuration,
          endDate: endDate.toISOString().split('T')[0],
        };

        // 後続の工程日程を調整
        for (let i = itemIndex + 1; i < updatedSchedule.length; i++) {
          const prevItem = updatedSchedule[i - 1];
          const currentItem = updatedSchedule[i];
          const newStartDate = new Date(prevItem.endDate);
          newStartDate.setDate(newStartDate.getDate() + 2);

          const newEndDate = new Date(newStartDate);
          newEndDate.setDate(newEndDate.getDate() + currentItem.duration - 1);

          updatedSchedule[i] = {
            ...currentItem,
            startDate: newStartDate.toISOString().split('T')[0],
            endDate: newEndDate.toISOString().split('T')[0],
          };
        }
      }

      return updatedSchedule;
    });
  }, []);

  // 総工期の計算
  const totalDuration = useMemo(() => {
    if (scheduleData.length === 0) return 0;
    const startDate = new Date(scheduleData[0].startDate);
    const endDate = new Date(scheduleData[scheduleData.length - 1].endDate);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }, [scheduleData]);

  // 工程期間入力ビュー
  const renderInputView = () => (
    <InputSection>
      <SectionTitle>
        <Edit3 size={24} />
        工程期間の入力
      </SectionTitle>

      <StartDateSetting>
        <label>工事開始予定日:</label>
        <DateInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </StartDateSetting>

      <ProcessItemsList>
        {processItems.map(item => (
          <ProcessItemCard key={item.id}>
            <ItemHeader>
              <ItemName>{item.name}</ItemName>
              <CategoryBadge category={item.category}>{item.category}</CategoryBadge>
            </ItemHeader>

            <ItemControls>
              <DurationControl>
                <label>作業日数:</label>
                <DurationInput
                  type="number"
                  min="1"
                  max="30"
                  value={item.estimatedDays}
                  onChange={e => updateProcessDuration(item.id, e.target.value)}
                />
                <span>日</span>
              </DurationControl>

              <ComplexityControl>
                <label>複雑度:</label>
                <ComplexitySelect
                  value={item.complexity}
                  onChange={e => updateComplexity(item.id, e.target.value)}
                >
                  <option value="low">低 (0.8倍)</option>
                  <option value="medium">中 (1.0倍)</option>
                  <option value="high">高 (1.3倍)</option>
                </ComplexitySelect>
              </ComplexityControl>
            </ItemControls>
          </ProcessItemCard>
        ))}
      </ProcessItemsList>

      <GenerateButton onClick={generateSchedule} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Clock className="spinning" size={20} />
            工程表を生成中...
          </>
        ) : (
          <>
            <Calendar size={20} />
            工程表案を生成
          </>
        )}
      </GenerateButton>
    </InputSection>
  );

  // 工程表調整ビュー
  const renderScheduleView = () => (
    <ScheduleSection>
      <SectionTitle>
        <Calendar size={24} />
        工程表の微調整
        <ScheduleInfo>総工期: {totalDuration}日間</ScheduleInfo>
      </SectionTitle>

      <ScheduleList>
        {scheduleData.map((item, index) => (
          <ScheduleItem key={item.id}>
            <ItemInfo>
              <ItemNumber>{index + 1}</ItemNumber>
              <ItemDetails>
                <ItemName>{item.name}</ItemName>
                <ItemDates>
                  {item.startDate} ～ {item.endDate} ({item.duration}日間)
                </ItemDates>
              </ItemDetails>
            </ItemInfo>

            <DurationSlider>
              <label>期間調整:</label>
              <SliderContainer>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={item.duration}
                  onChange={e => adjustScheduleItem(item.id, parseInt(e.target.value, 10))}
                />
                <SliderValue>{item.duration}日</SliderValue>
              </SliderContainer>
            </DurationSlider>
          </ScheduleItem>
        ))}
      </ScheduleList>

      <ScheduleActions>
        <ActionButton onClick={() => setCurrentView('input')} variant="secondary">
          <RotateCcw size={16} />
          期間入力に戻る
        </ActionButton>
        <ActionButton onClick={() => setCurrentView('gantt')} variant="primary">
          <Calendar size={16} />
          ガントチャート表示
        </ActionButton>
      </ScheduleActions>
    </ScheduleSection>
  );

  // ガントチャートビュー
  const renderGanttView = () => (
    <GanttSection>
      <SectionTitle>
        <Calendar size={24} />
        工程ガントチャート
        <ViewControls>
          <ActionButton onClick={() => setCurrentView('schedule')} variant="secondary">
            <Edit3 size={16} />
            調整に戻る
          </ActionButton>
          <ActionButton variant="primary">
            <Download size={16} />
            PDF出力
          </ActionButton>
        </ViewControls>
      </SectionTitle>

      <GanttChart>
        <GanttHeader>
          <TaskColumn>作業項目</TaskColumn>
          <TimelineColumn>工程表 (総工期: {totalDuration}日間)</TimelineColumn>
        </GanttHeader>

        <GanttBody>
          {scheduleData.map((item, index) => {
            const startDay = Math.ceil(
              (new Date(item.startDate) - new Date(scheduleData[0].startDate)) /
                (1000 * 60 * 60 * 24)
            );
            const widthPercent = (item.duration / totalDuration) * 100;
            const leftPercent = (startDay / totalDuration) * 100;

            return (
              <GanttRow key={item.id}>
                <TaskCell>
                  <TaskIndex>{index + 1}</TaskIndex>
                  <TaskName>{item.name}</TaskName>
                  <TaskDuration>{item.duration}日</TaskDuration>
                </TaskCell>
                <TimelineCell>
                  <GanttBar
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    category={item.category}
                  >
                    <BarLabel>{item.duration}日</BarLabel>
                  </GanttBar>
                </TimelineCell>
              </GanttRow>
            );
          })}
        </GanttBody>
      </GanttChart>
    </GanttSection>
  );

  return (
    <Container>
      <Header>
        <Title>工程表管理システム</Title>
        <ViewTabs>
          <ViewTab active={currentView === 'input'} onClick={() => setCurrentView('input')}>
            期間入力
          </ViewTab>
          <ViewTab
            active={currentView === 'schedule'}
            onClick={() => setCurrentView('schedule')}
            disabled={scheduleData.length === 0}
          >
            工程調整
          </ViewTab>
          <ViewTab
            active={currentView === 'gantt'}
            onClick={() => setCurrentView('gantt')}
            disabled={scheduleData.length === 0}
          >
            ガントチャート
          </ViewTab>
          <ViewTab
            active={currentView === 'interactive'}
            onClick={() => setCurrentView('interactive')}
            disabled={scheduleData.length === 0}
          >
            インタラクティブ
          </ViewTab>
        </ViewTabs>
      </Header>

      <Content>
        {currentView === 'input' && renderInputView()}
        {currentView === 'schedule' && renderScheduleView()}
        {currentView === 'gantt' && renderGanttView()}
        {currentView === 'interactive' && (
          <InteractiveGanttChart
            initialData={scheduleData}
            projectName={estimateData?.projectName || '工程表'}
          />
        )}
      </Content>
    </Container>
  );
};

// スタイル定義
const Container = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  color: white;
  padding: 20px;
`;

const Title = styled.h2`
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
`;

const ViewTabs = styled.div`
  display: flex;
  gap: 8px;
`;

const ViewTab = styled.button`
  padding: 8px 16px;
  background: ${props => (props.active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)')};
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 600;
  color: #2d5a2d;
`;

const ScheduleInfo = styled.span`
  margin-left: auto;
  font-size: 16px;
  color: #4a7c4a;
  background: #f0f8f0;
  padding: 4px 12px;
  border-radius: 6px;
`;

const ViewControls = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

// 期間入力セクション
const InputSection = styled.div``;

const StartDateSetting = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fdf8;
  border-radius: 8px;
  border: 1px solid #e0f0e0;

  label {
    font-weight: 600;
    color: #2d5a2d;
  }
`;

const DateInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
`;

const ProcessItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const ProcessItemCard = styled.div`
  border: 1px solid #e0f0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ItemName = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #2d5a2d;
`;

const CategoryBadge = styled.span`
  padding: 4px 8px;
  background: ${props => {
    switch (props.category) {
      case '植栽工事':
        return '#e8f5e8';
      case '土工事':
        return '#f0e8d8';
      case '設備工事':
        return '#e8f0f8';
      default:
        return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.category) {
      case '植栽工事':
        return '#2d5a2d';
      case '土工事':
        return '#8b4513';
      case '設備工事':
        return '#1e40af';
      default:
        return '#666';
    }
  }};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const ItemControls = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const DurationControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 14px;
    color: #666;
  }
`;

const DurationInput = styled.input`
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
`;

const ComplexityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 14px;
    color: #666;
  }
`;

const ComplexitySelect = styled.select`
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const GenerateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(45, 90, 45, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// 工程調整セクション
const ScheduleSection = styled.div``;

const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const ScheduleItem = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  border: 1px solid #e0f0e0;
  border-radius: 8px;
  background: white;
`;

const ItemInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const ItemNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2d5a2d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
`;

const ItemDetails = styled.div`
  flex: 1;
`;

const ItemDates = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 4px;
`;

const DurationSlider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  label {
    font-size: 14px;
    color: #666;
    white-space: nowrap;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type='range'] {
    width: 120px;
    height: 6px;
    border-radius: 3px;
    background: #e0f0e0;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2d5a2d;
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2d5a2d;
      cursor: pointer;
      border: none;
    }
  }
`;

const SliderValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #2d5a2d;
  min-width: 32px;
  text-align: center;
`;

const ScheduleActions = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid ${props => (props.variant === 'primary' ? '#2d5a2d' : '#ddd')};
  background: ${props => (props.variant === 'primary' ? '#2d5a2d' : 'white')};
  color: ${props => (props.variant === 'primary' ? 'white' : '#666')};
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.variant === 'primary' ? '#4a7c4a' : '#f5f5f5')};
  }
`;

// ガントチャートセクション
const GanttSection = styled.div``;

const GanttChart = styled.div`
  border: 1px solid #e0f0e0;
  border-radius: 8px;
  overflow: hidden;
`;

const GanttHeader = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  background: #f8fdf8;
  border-bottom: 1px solid #e0f0e0;
`;

const TaskColumn = styled.div`
  padding: 12px 16px;
  font-weight: 600;
  color: #2d5a2d;
  border-right: 1px solid #e0f0e0;
`;

const TimelineColumn = styled.div`
  padding: 12px 16px;
  font-weight: 600;
  color: #2d5a2d;
`;

const GanttBody = styled.div``;

const GanttRow = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  border-bottom: 1px solid #f0f0f0;

  &:hover {
    background: #fafffa;
  }
`;

const TaskCell = styled.div`
  padding: 12px 16px;
  border-right: 1px solid #e0f0e0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TaskIndex = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2d5a2d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
`;

const TaskName = styled.span`
  flex: 1;
  font-size: 14px;
  color: #333;
`;

const TaskDuration = styled.span`
  font-size: 12px;
  color: #666;
`;

const TimelineCell = styled.div`
  padding: 8px 16px;
  position: relative;
  height: 48px;
  display: flex;
  align-items: center;
`;

const GanttBar = styled.div`
  position: absolute;
  height: 24px;
  background: ${props => {
    switch (props.category) {
      case '植栽工事':
        return 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
      case '土工事':
        return 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)';
      case '設備工事':
        return 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
      default:
        return 'linear-gradient(135deg, #a1a1aa 0%, #71717a 100%)';
    }
  }};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const BarLabel = styled.span`
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

export default ProcessScheduleManager;
