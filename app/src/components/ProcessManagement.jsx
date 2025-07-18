import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Calendar, Clock, CheckCircle, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';

const ProcessManagement = ({ estimateId, projectId, onUpdateProgress }) => {
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ganttView, setGanttView] = useState(false);

  // 工程データの取得
  const fetchProcesses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/processes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setProcesses(data.processes || []);
    } catch (error) {
      console.error('工程データの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 見積書から工程表を自動生成
  const generateFromEstimate = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/estimates/${estimateId}/generate-processes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setProcesses(data.processes || []);
      alert('工程表を自動生成しました');
    } catch (error) {
      console.error('工程表の自動生成に失敗しました:', error);
      alert('工程表の自動生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [estimateId]);

  // 工程の進捗更新
  const updateProcessProgress = useCallback(
    async (processId, progress) => {
      try {
        const response = await fetch(`/api/processes/${processId}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ progress }),
        });

        if (response.ok) {
          setProcesses(prev => prev.map(p => (p.id === processId ? { ...p, progress } : p)));
          onUpdateProgress?.(processId, progress);
        }
      } catch (error) {
        console.error('進捗更新に失敗しました:', error);
      }
    },
    [onUpdateProgress]
  );

  // 工程の日程変更
  const updateProcessSchedule = useCallback(async (processId, startDate, endDate) => {
    try {
      const response = await fetch(`/api/processes/${processId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (response.ok) {
        setProcesses(prev =>
          prev.map(p => (p.id === processId ? { ...p, startDate, endDate } : p))
        );
      }
    } catch (error) {
      console.error('日程更新に失敗しました:', error);
    }
  }, []);

  // 工程の状態を計算
  const getProcessStatus = useCallback(process => {
    if (process.progress === 100) return 'completed';
    if (new Date(process.endDate) < new Date()) return 'overdue';
    if (process.progress > 0) return 'in-progress';
    return 'pending';
  }, []);

  // 全体進捗の計算
  const overallProgress = useMemo(() => {
    if (processes.length === 0) return 0;
    const totalProgress = processes.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(totalProgress / processes.length);
  }, [processes]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  if (isLoading) {
    return <LoadingContainer>工程データを読み込み中...</LoadingContainer>;
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>工程管理</Title>
          <ProgressInfo>全体進捗: {overallProgress}%</ProgressInfo>
        </div>
        <Controls>
          <ViewToggle>
            <ToggleButton active={!ganttView} onClick={() => setGanttView(false)}>
              リスト表示
            </ToggleButton>
            <ToggleButton active={ganttView} onClick={() => setGanttView(true)}>
              ガントチャート
            </ToggleButton>
          </ViewToggle>
          <ActionButton onClick={generateFromEstimate}>
            <Plus size={16} />
            見積書から生成
          </ActionButton>
        </Controls>
      </Header>

      {ganttView ? (
        <GanttChart processes={processes} onUpdateSchedule={updateProcessSchedule} />
      ) : (
        <ProcessList>
          {processes.map(process => (
            <ProcessItem key={process.id} status={getProcessStatus(process)}>
              <ProcessHeader>
                <ProcessTitle>{process.name}</ProcessTitle>
                <ProcessActions>
                  <ActionButton size="small" onClick={() => setSelectedProcess(process)}>
                    <Edit2 size={14} />
                  </ActionButton>
                </ProcessActions>
              </ProcessHeader>

              <ProcessDetails>
                <DetailItem>
                  <Calendar size={16} />
                  <span>
                    {new Date(process.startDate).toLocaleDateString()} -{' '}
                    {new Date(process.endDate).toLocaleDateString()}
                  </span>
                </DetailItem>
                <DetailItem>
                  <Clock size={16} />
                  <span>{process.duration}日間</span>
                </DetailItem>
                <DetailItem>
                  <StatusIcon status={getProcessStatus(process)} />
                  <span>{process.progress}%完了</span>
                </DetailItem>
              </ProcessDetails>

              <ProgressBar>
                <ProgressFill progress={process.progress} />
              </ProgressBar>

              <ProgressControls>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={process.progress}
                  onChange={e => updateProcessProgress(process.id, parseInt(e.target.value, 10))}
                />
                <ProgressInput
                  type="number"
                  min="0"
                  max="100"
                  value={process.progress}
                  onChange={e => updateProcessProgress(process.id, parseInt(e.target.value, 10))}
                />
              </ProgressControls>
            </ProcessItem>
          ))}
        </ProcessList>
      )}

      {selectedProcess && (
        <ProcessModal
          process={selectedProcess}
          onClose={() => setSelectedProcess(null)}
          onUpdate={updateProcessSchedule}
        />
      )}
    </Container>
  );
};

// ガントチャートコンポーネント
const GanttChart = ({ processes, onUpdateSchedule }) => {
  const [timelineStart, setTimelineStart] = useState(null);
  const [timelineEnd, setTimelineEnd] = useState(null);

  useEffect(() => {
    if (processes.length > 0) {
      const dates = processes.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
      setTimelineStart(new Date(Math.min(...dates)));
      setTimelineEnd(new Date(Math.max(...dates)));
    }
  }, [processes]);

  const getDaysDiff = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPositionFromDate = date => {
    if (!timelineStart || !timelineEnd) return 0;
    const totalDays = getDaysDiff(timelineStart, timelineEnd);
    const daysSinceStart = getDaysDiff(timelineStart, date);
    return (daysSinceStart / totalDays) * 100;
  };

  const getWidthFromDuration = (startDate, endDate) => {
    if (!timelineStart || !timelineEnd) return 0;
    const totalDays = getDaysDiff(timelineStart, timelineEnd);
    const processDays = getDaysDiff(new Date(startDate), new Date(endDate));
    return (processDays / totalDays) * 100;
  };

  return (
    <GanttContainer>
      <GanttHeader>
        <div>作業項目</div>
        <div>期間</div>
      </GanttHeader>
      {processes.map(process => (
        <GanttRow key={process.id}>
          <GanttTaskName>{process.name}</GanttTaskName>
          <GanttTimeline>
            <GanttBar
              style={{
                left: `${getPositionFromDate(new Date(process.startDate))}%`,
                width: `${getWidthFromDuration(process.startDate, process.endDate)}%`,
              }}
              progress={process.progress}
            >
              <GanttBarFill progress={process.progress} />
            </GanttBar>
          </GanttTimeline>
        </GanttRow>
      ))}
    </GanttContainer>
  );
};

// 工程編集モーダル
const ProcessModal = ({ process, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: process.name,
    startDate: process.startDate,
    endDate: process.endDate,
    duration: process.duration,
  });

  const handleSubmit = e => {
    e.preventDefault();
    onUpdate(process.id, formData.startDate, formData.endDate);
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>工程編集</ModalHeader>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label>作業名</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <label>開始日</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <label>終了日</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            />
          </FormGroup>
          <ModalActions>
            <ActionButton type="button" onClick={onClose}>
              キャンセル
            </ActionButton>
            <ActionButton type="submit" primary>
              更新
            </ActionButton>
          </ModalActions>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

// 状態アイコン
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle size={16} color="#10B981" />;
    case 'overdue':
      return <AlertCircle size={16} color="#EF4444" />;
    case 'in-progress':
      return <Clock size={16} color="#F59E0B" />;
    default:
      return <Clock size={16} color="#6B7280" />;
  }
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

const ProgressInfo = styled.div`
  font-size: 16px;
  color: #6b7280;
  margin-top: 5px;
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
`;

const ToggleButton = styled.button`
  padding: 8px 16px;
  background: ${props => (props.active ? '#3b82f6' : '#ffffff')};
  color: ${props => (props.active ? '#ffffff' : '#374151')};
  border: none;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: ${props => (props.active ? '#2563eb' : '#f3f4f6')};
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${props => (props.size === 'small' ? '6px 12px' : '10px 16px')};
  background: ${props => (props.primary ? '#3b82f6' : '#ffffff')};
  color: ${props => (props.primary ? '#ffffff' : '#374151')};
  border: 1px solid ${props => (props.primary ? '#3b82f6' : '#d1d5db')};
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: ${props => (props.primary ? '#2563eb' : '#f3f4f6')};
  }
`;

const ProcessList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProcessItem = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  ${props =>
    props.status === 'overdue' &&
    `
    border-left: 4px solid #ef4444;
  `}

  ${props =>
    props.status === 'completed' &&
    `
    border-left: 4px solid #10b981;
  `}
  
  ${props =>
    props.status === 'in-progress' &&
    `
    border-left: 4px solid #f59e0b;
  `}
`;

const ProcessHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const ProcessTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const ProcessActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ProcessDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3b82f6;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressControls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;

  input[type='range'] {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: none;
    }
  }
`;

const ProgressInput = styled.input`
  width: 60px;
  padding: 6px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
`;

const GanttContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const GanttHeader = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;

  > div {
    padding: 15px;
    font-weight: 600;
    color: #374151;
  }
`;

const GanttRow = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const GanttTaskName = styled.div`
  padding: 15px;
  border-right: 1px solid #e5e7eb;
  font-size: 14px;
  color: #374151;
`;

const GanttTimeline = styled.div`
  position: relative;
  height: 50px;
  display: flex;
  align-items: center;
  padding: 0 15px;
`;

const GanttBar = styled.div`
  position: absolute;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const GanttBarFill = styled.div`
  height: 100%;
  background: #3b82f6;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #1f2937;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
  }

  input {
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

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
`;

export default ProcessManagement;
