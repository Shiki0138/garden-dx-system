/**
 * Garden Process Schedule Manager - 工程管理・工程表作成機能
 * 造園事業者向け工程表作成システム
 * 
 * Created by: worker2 (Version Up - Process Management)
 * Date: 2025-07-01
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AutorenewOutlined as AutoIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Nature as PlantIcon,
  Build as ToolIcon,
  Group as TeamIcon
} from '@mui/icons-material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { 
  Project, 
  ProcessSchedule, 
  ProcessTask, 
  ProcessTemplate,
  ProjectStatus 
} from '../../types/project.types';

// 造園業特化の工程テンプレート
const LANDSCAPING_PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: 'garden-basic',
    name: '基本造園工事',
    description: '一般的な庭園工事の標準工程',
    tasks: [
      { name: '現地調査・測量', duration: 1, dependencies: [], category: 'survey' },
      { name: '設計・プラン作成', duration: 3, dependencies: [0], category: 'design' },
      { name: '資材調達・発注', duration: 2, dependencies: [1], category: 'procurement' },
      { name: '既存撤去・整地', duration: 2, dependencies: [2], category: 'demolition' },
      { name: '基礎工事・排水', duration: 3, dependencies: [3], category: 'foundation' },
      { name: '植栽工事', duration: 4, dependencies: [4], category: 'planting' },
      { name: '外構・装飾工事', duration: 3, dependencies: [4], category: 'decoration' },
      { name: '仕上げ・清掃', duration: 1, dependencies: [5, 6], category: 'finishing' },
      { name: '検査・引き渡し', duration: 1, dependencies: [7], category: 'delivery' }
    ]
  },
  {
    id: 'maintenance',
    name: '定期メンテナンス',
    description: '庭園の定期メンテナンス工程',
    tasks: [
      { name: '現状確認・診断', duration: 0.5, dependencies: [], category: 'survey' },
      { name: '剪定・刈り込み', duration: 1, dependencies: [0], category: 'maintenance' },
      { name: '除草・施肥', duration: 1, dependencies: [0], category: 'maintenance' },
      { name: '設備点検・修理', duration: 0.5, dependencies: [0], category: 'maintenance' },
      { name: '清掃・整理', duration: 0.5, dependencies: [1, 2, 3], category: 'finishing' }
    ]
  },
  {
    id: 'large-project',
    name: '大規模造園プロジェクト',
    description: '公園・大型施設等の造園工事',
    tasks: [
      { name: '企画・基本設計', duration: 7, dependencies: [], category: 'design' },
      { name: '詳細設計・図面作成', duration: 14, dependencies: [0], category: 'design' },
      { name: '許可申請・承認', duration: 14, dependencies: [1], category: 'legal' },
      { name: '資材・重機調達', duration: 7, dependencies: [2], category: 'procurement' },
      { name: '仮設工事・安全対策', duration: 3, dependencies: [3], category: 'preparation' },
      { name: '土工・造成工事', duration: 21, dependencies: [4], category: 'foundation' },
      { name: '給排水・電気工事', duration: 14, dependencies: [5], category: 'infrastructure' },
      { name: '植栽・緑化工事', duration: 28, dependencies: [6], category: 'planting' },
      { name: '外構・景観工事', duration: 21, dependencies: [6], category: 'decoration' },
      { name: '最終仕上げ・検査', duration: 7, dependencies: [7, 8], category: 'finishing' }
    ]
  }
];

// 工程カテゴリの色分け
const PROCESS_CATEGORY_COLORS = {
  survey: '#2E7D32',      // 濃い緑
  design: '#1976D2',      // 青
  procurement: '#F57C00', // オレンジ
  demolition: '#D32F2F',  // 赤
  foundation: '#8D6E63',  // 茶色
  planting: '#4CAF50',    // 明るい緑
  decoration: '#9C27B0',  // 紫
  finishing: '#607D8B',   // 灰色
  delivery: '#689F38',    // ライムグリーン
  maintenance: '#00ACC1', // シアン
  legal: '#5D4037',       // ダークブラウン
  preparation: '#FF9800', // アンバー
  infrastructure: '#3F51B5' // インディゴ
};

interface ProcessScheduleManagerProps {
  selectedProject?: Project;
  onScheduleCreated?: (schedule: ProcessSchedule) => void;
  onScheduleUpdated?: (schedule: ProcessSchedule) => void;
}

const ProcessScheduleManager: React.FC<ProcessScheduleManagerProps> = ({
  selectedProject,
  onScheduleCreated,
  onScheduleUpdated
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    selectedProject?.project_id || null
  );
  const [currentSchedule, setCurrentSchedule] = useState<ProcessSchedule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('garden-basic');
  const [editingTask, setEditingTask] = useState<ProcessTask | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [autoGenerated, setAutoGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト一覧取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        setError('プロジェクト一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 選択されたプロジェクトの工程表を取得
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectSchedule(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjectSchedule = async (projectId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/schedule`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSchedule(data.schedule);
      } else if (response.status === 404) {
        // 工程表が存在しない場合は新規作成
        setCurrentSchedule(null);
      }
    } catch (err) {
      setError('工程表の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 自動工程表生成
  const generateAutoSchedule = useCallback(() => {
    if (!selectedProjectId) return;

    const template = LANDSCAPING_PROCESS_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const project = projects.find(p => p.project_id === selectedProjectId);
    if (!project) return;

    const startDate = new Date();
    const tasks: ProcessTask[] = template.tasks.map((task, index) => {
      // 依存関係を考慮して開始日を計算
      let taskStartDate = new Date(startDate);
      if (task.dependencies.length > 0) {
        const maxDependencyEndDate = Math.max(
          ...task.dependencies.map(depIndex => {
            const depTask = template.tasks[depIndex];
            const depStartDate = new Date(startDate);
            depStartDate.setDate(depStartDate.getDate() + depIndex);
            depStartDate.setDate(depStartDate.getDate() + depTask.duration);
            return depStartDate.getTime();
          })
        );
        taskStartDate = new Date(maxDependencyEndDate);
      } else {
        taskStartDate.setDate(taskStartDate.getDate() + index);
      }

      const endDate = new Date(taskStartDate);
      endDate.setDate(endDate.getDate() + task.duration);

      return {
        id: index + 1,
        name: task.name,
        description: `${task.name}の作業`,
        start_date: taskStartDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration: task.duration,
        progress: 0,
        category: task.category,
        dependencies: task.dependencies,
        assigned_to: '',
        status: 'planned' as const,
        priority: 'medium' as const
      };
    });

    const newSchedule: ProcessSchedule = {
      id: Date.now(),
      project_id: selectedProjectId,
      name: `${project.name} - ${template.name}`,
      description: `${template.description}（自動生成）`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: tasks[tasks.length - 1]?.end_date || startDate.toISOString().split('T')[0],
      tasks,
      template_id: template.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentSchedule(newSchedule);
    setAutoGenerated(true);
  }, [selectedProjectId, selectedTemplate, projects]);

  // 工程表保存
  const saveSchedule = async () => {
    if (!currentSchedule || !selectedProjectId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${selectedProjectId}/schedule`, {
        method: currentSchedule.id > 1000000 ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSchedule),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSchedule(data.schedule);
        setAutoGenerated(false);
        
        if (currentSchedule.id > 1000000) {
          onScheduleCreated?.(data.schedule);
        } else {
          onScheduleUpdated?.(data.schedule);
        }
      }
    } catch (err) {
      setError('工程表の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // タスク追加・編集
  const handleTaskSave = (task: ProcessTask) => {
    if (!currentSchedule) return;

    const updatedTasks = editingTask
      ? currentSchedule.tasks.map(t => t.id === task.id ? task : t)
      : [...currentSchedule.tasks, { ...task, id: Date.now() }];

    setCurrentSchedule({
      ...currentSchedule,
      tasks: updatedTasks,
      updated_at: new Date().toISOString()
    });

    setShowTaskDialog(false);
    setEditingTask(null);
  };

  // タスク削除
  const handleTaskDelete = (taskId: number) => {
    if (!currentSchedule) return;

    const updatedTasks = currentSchedule.tasks.filter(t => t.id !== taskId);
    setCurrentSchedule({
      ...currentSchedule,
      tasks: updatedTasks,
      updated_at: new Date().toISOString()
    });
  };

  // ガントチャート用のデータ計算
  const ganttData = useMemo(() => {
    if (!currentSchedule) return null;

    const tasks = currentSchedule.tasks.map(task => ({
      ...task,
      startDate: new Date(task.start_date),
      endDate: new Date(task.end_date),
      color: PROCESS_CATEGORY_COLORS[task.category] || '#757575'
    }));

    const minDate = Math.min(...tasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...tasks.map(t => t.endDate.getTime()));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    return {
      tasks,
      minDate: new Date(minDate),
      maxDate: new Date(maxDate),
      totalDays
    };
  }, [currentSchedule]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimelineIcon sx={{ fontSize: 32, color: '#4CAF50' }} />
          <Typography variant="h4" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>
            工程管理・工程表作成
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* プロジェクト選択 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlantIcon sx={{ color: '#4CAF50' }} />
              案件選択
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>工事案件を選択</InputLabel>
                  <Select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                    label="工事案件を選択"
                  >
                    {projects.map((project) => (
                      <MenuItem key={project.project_id} value={project.project_id}>
                        <Box>
                          <Typography variant="body1">{project.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {project.customer_name} - {project.status}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>工程テンプレート</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="工程テンプレート"
                  >
                    {LANDSCAPING_PROCESS_TEMPLATES.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box>
                          <Typography variant="body1">{template.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<AutoIcon />}
                onClick={generateAutoSchedule}
                disabled={!selectedProjectId}
                sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
              >
                自動工程表生成
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskDialog(true);
                }}
                disabled={!selectedProjectId}
              >
                工程追加
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 工程表表示 */}
        {currentSchedule && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: '#4CAF50' }} />
                    {currentSchedule.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {autoGenerated && (
                      <Chip
                        label="未保存"
                        color="warning"
                        size="small"
                      />
                    )}
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={saveSchedule}
                      size="small"
                      sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
                    >
                      保存
                    </Button>
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {currentSchedule.description}
                </Typography>
                <Typography variant="body2">
                  期間: {currentSchedule.start_date} ～ {currentSchedule.end_date}
                  （全{currentSchedule.tasks.length}工程）
                </Typography>
              </CardContent>
            </Card>

            {/* 視覚的工程表（ガントチャート） */}
            {ganttData && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon sx={{ color: '#4CAF50' }} />
                    視覚的工程表（ガントチャート）
                  </Typography>
                  <Box sx={{ overflowX: 'auto', mt: 2 }}>
                    <Box sx={{ minWidth: Math.max(800, ganttData.totalDays * 20), height: ganttData.tasks.length * 60 + 100, position: 'relative' }}>
                      {/* 日付ヘッダー */}
                      <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                        <Grid container>
                          <Grid item xs={3} sx={{ p: 1 }}>
                            <Typography variant="body2" fontWeight="bold">工程名</Typography>
                          </Grid>
                          <Grid item xs={9}>
                            <Box sx={{ display: 'flex', height: 40 }}>
                              {Array.from({ length: ganttData.totalDays }, (_, i) => {
                                const date = new Date(ganttData.minDate);
                                date.setDate(date.getDate() + i);
                                return (
                                  <Box
                                    key={i}
                                    sx={{
                                      width: 20,
                                      textAlign: 'center',
                                      borderRight: 1,
                                      borderColor: 'divider',
                                      fontSize: '0.7rem',
                                      p: 0.5
                                    }}
                                  >
                                    {date.getDate()}
                                  </Box>
                                );
                              })}
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* 工程バー */}
                      {ganttData.tasks.map((task, index) => {
                        const startOffset = Math.floor((task.startDate.getTime() - ganttData.minDate.getTime()) / (1000 * 60 * 60 * 24));
                        const duration = Math.floor((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        
                        return (
                          <Box
                            key={task.id}
                            sx={{
                              display: 'flex',
                              height: 50,
                              alignItems: 'center',
                              borderBottom: 1,
                              borderColor: 'divider',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <Box sx={{ width: '25%', p: 1 }}>
                              <Typography variant="body2" noWrap>
                                {task.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {task.duration}日間
                              </Typography>
                            </Box>
                            <Box sx={{ width: '75%', position: 'relative', height: 30 }}>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: startOffset * 20,
                                  width: duration * 20,
                                  height: 20,
                                  bgcolor: task.color,
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  opacity: task.status === 'completed' ? 1 : 0.8
                                }}
                              >
                                {task.progress > 0 && `${task.progress}%`}
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 工程一覧テーブル */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToolIcon sx={{ color: '#4CAF50' }} />
                  工程一覧
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>工程名</TableCell>
                        <TableCell>カテゴリ</TableCell>
                        <TableCell>開始日</TableCell>
                        <TableCell>終了日</TableCell>
                        <TableCell>期間</TableCell>
                        <TableCell>進捗</TableCell>
                        <TableCell>ステータス</TableCell>
                        <TableCell>担当者</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentSchedule.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {task.name}
                            </Typography>
                            {task.description && (
                              <Typography variant="caption" color="textSecondary">
                                {task.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.category}
                              size="small"
                              sx={{
                                bgcolor: PROCESS_CATEGORY_COLORS[task.category],
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>{task.start_date}</TableCell>
                          <TableCell>{task.end_date}</TableCell>
                          <TableCell>{task.duration}日</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={task.progress}
                                sx={{ width: 60, height: 6 }}
                              />
                              <Typography variant="caption">
                                {task.progress}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.status}
                              size="small"
                              color={
                                task.status === 'completed' ? 'success' :
                                task.status === 'in_progress' ? 'primary' :
                                task.status === 'delayed' ? 'error' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{task.assigned_to || '未割り当て'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="編集">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setShowTaskDialog(true);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="削除">
                                <IconButton
                                  size="small"
                                  onClick={() => handleTaskDelete(task.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* タスク編集ダイアログ */}
        <Dialog
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingTask ? '工程編集' : '工程追加'}
          </DialogTitle>
          <DialogContent>
            <TaskEditForm
              task={editingTask}
              onSave={handleTaskSave}
              onCancel={() => setShowTaskDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

// タスク編集フォームコンポーネント
interface TaskEditFormProps {
  task?: ProcessTask | null;
  onSave: (task: ProcessTask) => void;
  onCancel: () => void;
}

const TaskEditForm: React.FC<TaskEditFormProps> = ({ task, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<ProcessTask>>({
    name: task?.name || '',
    description: task?.description || '',
    start_date: task?.start_date || new Date().toISOString().split('T')[0],
    end_date: task?.end_date || new Date().toISOString().split('T')[0],
    duration: task?.duration || 1,
    progress: task?.progress || 0,
    category: task?.category || 'survey',
    assigned_to: task?.assigned_to || '',
    status: task?.status || 'planned',
    priority: task?.priority || 'medium'
  });

  const handleSubmit = () => {
    const newTask: ProcessTask = {
      id: task?.id || Date.now(),
      name: formData.name!,
      description: formData.description!,
      start_date: formData.start_date!,
      end_date: formData.end_date!,
      duration: formData.duration!,
      progress: formData.progress!,
      category: formData.category!,
      dependencies: task?.dependencies || [],
      assigned_to: formData.assigned_to!,
      status: formData.status!,
      priority: formData.priority!
    };
    onSave(newTask);
  };

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="工程名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="説明"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="開始日"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="終了日"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="期間（日数）"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
            inputProps={{ min: 0.5, step: 0.5 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="進捗（%）"
            type="number"
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
            inputProps={{ min: 0, max: 100 }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>カテゴリ</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              label="カテゴリ"
            >
              {Object.keys(PROCESS_CATEGORY_COLORS).map((category) => (
                <MenuItem key={category} value={category}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: PROCESS_CATEGORY_COLORS[category as keyof typeof PROCESS_CATEGORY_COLORS],
                        borderRadius: 0.5
                      }}
                    />
                    {category}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="担当者"
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              label="ステータス"
            >
              <MenuItem value="planned">計画中</MenuItem>
              <MenuItem value="in_progress">進行中</MenuItem>
              <MenuItem value="completed">完了</MenuItem>
              <MenuItem value="delayed">遅延</MenuItem>
              <MenuItem value="cancelled">中止</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>優先度</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              label="優先度"
            >
              <MenuItem value="low">低</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="critical">緊急</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!formData.name}
          sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
        >
          保存
        </Button>
      </Box>
    </Box>
  );
};

export default ProcessScheduleManager;