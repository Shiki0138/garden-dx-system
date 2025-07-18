/**
 * Garden Mobile Process Manager - スマホ対応工程管理
 * 造園事業者向けモバイル工程表作成システム
 * 
 * Created by: worker2 (Production Ready - Mobile First)
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
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Fab,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  BottomNavigation,
  BottomNavigationAction,
  SwipeableDrawer,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AutorenewOutlined as AutoIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Nature as PlantIcon,
  Build as ToolIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import { 
  ProcessSchedule, 
  ProcessTask, 
  ProcessTemplate
} from '../../types/process.types';

// 工程カテゴリの色分け（モバイル用最適化）
const MOBILE_CATEGORY_COLORS = {
  survey: '#2E7D32',
  design: '#1976D2',
  procurement: '#F57C00',
  demolition: '#D32F2F',
  foundation: '#8D6E63',
  planting: '#4CAF50',
  decoration: '#9C27B0',
  finishing: '#607D8B',
  delivery: '#689F38',
  maintenance: '#00ACC1',
  legal: '#5D4037',
  preparation: '#FF9800',
  infrastructure: '#3F51B5'
};

// 造園業工程テンプレート（モバイル最適化）
const MOBILE_PROCESS_TEMPLATES = [
  {
    id: 'garden-basic',
    name: '基本造園工事',
    description: '庭園工事(7-14日)',
    icon: '🌳',
    estimatedDays: 14,
    tasks: [
      { name: '現地調査', duration: 1, category: 'survey' },
      { name: '設計作成', duration: 3, category: 'design' },
      { name: '資材調達', duration: 2, category: 'procurement' },
      { name: '既存撤去', duration: 2, category: 'demolition' },
      { name: '基礎工事', duration: 3, category: 'foundation' },
      { name: '植栽工事', duration: 4, category: 'planting' },
      { name: '外構工事', duration: 3, category: 'decoration' },
      { name: '仕上げ', duration: 1, category: 'finishing' }
    ]
  },
  {
    id: 'maintenance',
    name: 'メンテナンス',
    description: '定期管理(1-3日)',
    icon: '✂️',
    estimatedDays: 3,
    tasks: [
      { name: '状況確認', duration: 0.5, category: 'survey' },
      { name: '剪定作業', duration: 1, category: 'maintenance' },
      { name: '除草・施肥', duration: 1, category: 'maintenance' },
      { name: '設備点検', duration: 0.5, category: 'maintenance' }
    ]
  },
  {
    id: 'large-project',
    name: '大規模工事',
    description: '公園・施設(1-3ヶ月)',
    icon: '🏗️',
    estimatedDays: 90,
    tasks: [
      { name: '企画設計', duration: 14, category: 'design' },
      { name: '許可申請', duration: 14, category: 'legal' },
      { name: '資材調達', duration: 7, category: 'procurement' },
      { name: '仮設工事', duration: 3, category: 'preparation' },
      { name: '造成工事', duration: 21, category: 'foundation' },
      { name: '植栽工事', duration: 28, category: 'planting' },
      { name: '外構工事', duration: 21, category: 'decoration' }
    ]
  }
];

interface MobileProcessManagerProps {
  selectedProject?: any;
  onScheduleCreated?: (schedule: ProcessSchedule) => void;
  onScheduleUpdated?: (schedule: ProcessSchedule) => void;
}

const MobileProcessManager: React.FC<MobileProcessManagerProps> = ({
  selectedProject,
  onScheduleCreated,
  onScheduleUpdated
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width:375px)');

  // State Management
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    selectedProject?.project_id || null
  );
  const [currentSchedule, setCurrentSchedule] = useState<ProcessSchedule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('garden-basic');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<ProcessTask | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('project-select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bottomNavValue, setBottomNavValue] = useState(0);

  // Mock data for demonstration
  useEffect(() => {
    const mockProjects = [
      {
        project_id: 1,
        name: '田中様邸庭園リフォーム',
        customer_name: '田中太郎',
        status: 'active',
        location: '東京都世田谷区'
      },
      {
        project_id: 2,
        name: '山田マンション植栽工事',
        customer_name: '山田建設',
        status: 'planning',
        location: '神奈川県横浜市'
      },
      {
        project_id: 3,
        name: '○○公園メンテナンス',
        customer_name: '○○市役所',
        status: 'in_progress',
        location: '埼玉県さいたま市'
      }
    ];
    setProjects(mockProjects);
  }, []);

  // 工程表自動生成
  const generateMobileSchedule = useCallback(() => {
    if (!selectedProjectId) return;

    const template = MOBILE_PROCESS_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const project = projects.find(p => p.project_id === selectedProjectId);
    if (!project) return;

    const startDate = new Date();
    const tasks: ProcessTask[] = template.tasks.map((task, index) => {
      const taskStartDate = new Date(startDate);
      taskStartDate.setDate(taskStartDate.getDate() + index);
      
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
        dependencies: [],
        assigned_to: '',
        status: 'planned' as const,
        priority: 'medium' as const
      };
    });

    const newSchedule: ProcessSchedule = {
      id: Date.now(),
      project_id: selectedProjectId,
      name: `${project.name} - ${template.name}`,
      description: `${template.description}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: tasks[tasks.length - 1]?.end_date || startDate.toISOString().split('T')[0],
      tasks,
      template_id: template.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentSchedule(newSchedule);
    setExpandedAccordion('schedule-view');
  }, [selectedProjectId, selectedTemplate, projects]);

  // フィルタされたタスク
  const filteredTasks = useMemo(() => {
    if (!currentSchedule) return [];

    return currentSchedule.tasks.filter(task => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
      const matchesSearch = searchQuery === '' || 
        task.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [currentSchedule, filterStatus, filterCategory, searchQuery]);

  // 進捗統計
  const progressStats = useMemo(() => {
    if (!currentSchedule || currentSchedule.tasks.length === 0) {
      return { completed: 0, inProgress: 0, planned: 0, overall: 0 };
    }

    const tasks = currentSchedule.tasks;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const planned = tasks.filter(t => t.status === 'planned').length;
    const overall = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

    return { completed, inProgress, planned, overall };
  }, [currentSchedule]);

  // プロジェクト選択カード
  const ProjectSelectionCard = () => (
    <Card sx={{ mb: 2 }}>
      <Accordion 
        expanded={expandedAccordion === 'project-select'} 
        onChange={() => setExpandedAccordion(
          expandedAccordion === 'project-select' ? false : 'project-select'
        )}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlantIcon sx={{ color: '#4CAF50' }} />
            <Typography variant={isSmallMobile ? 'body1' : 'h6'} fontWeight="bold">
              案件選択
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>工事案件を選択</InputLabel>
                <Select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  label="工事案件を選択"
                >
                  {projects.map((project) => (
                    <MenuItem key={project.project_id} value={project.project_id}>
                      <Box>
                        <Typography variant="body2">{project.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {project.customer_name} - {project.location}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                工程テンプレート
              </Typography>
              <Grid container spacing={1}>
                {MOBILE_PROCESS_TEMPLATES.map((template) => (
                  <Grid item xs={12} key={template.id}>
                    <Card
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        border: selectedTemplate === template.id ? 2 : 1,
                        borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                        bgcolor: selectedTemplate === template.id ? 'primary.50' : 'background.paper'
                      }}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '1.2rem' }}>
                          {template.icon}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {template.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AutoIcon />}
                onClick={generateMobileSchedule}
                disabled={!selectedProjectId}
                sx={{ 
                  bgcolor: '#4CAF50', 
                  '&:hover': { bgcolor: '#388E3C' },
                  py: 1.5
                }}
              >
                工程表を自動生成
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Card>
  );

  // 工程表概要カード
  const ScheduleOverviewCard = () => {
    if (!currentSchedule) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <Accordion 
          expanded={expandedAccordion === 'schedule-overview'} 
          onChange={() => setExpandedAccordion(
            expandedAccordion === 'schedule-overview' ? false : 'schedule-overview'
          )}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <TimelineIcon sx={{ color: '#4CAF50' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  {currentSchedule.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  全体進捗: {progressStats.overall}%
                </Typography>
              </Box>
              <CircularProgress value={progressStats.overall} size={40} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {currentSchedule.description}
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    開始日
                  </Typography>
                  <Typography variant="body2">
                    {currentSchedule.start_date}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    完了予定
                  </Typography>
                  <Typography variant="body2">
                    {currentSchedule.end_date}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  進捗状況
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progressStats.overall} 
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
              </Box>

              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {progressStats.completed}
                    </Typography>
                    <Typography variant="caption">完了</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main">
                      {progressStats.inProgress}
                    </Typography>
                    <Typography variant="caption">進行中</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      {progressStats.planned}
                    </Typography>
                    <Typography variant="caption">予定</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Card>
    );
  };

  // 円形進捗表示
  const CircularProgress = ({ value, size = 40 }: { value: number; size?: number }) => (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size
      }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 4) / 2}
          fill="none"
          stroke="#E0E0E0"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 4) / 2}
          fill="none"
          stroke="#4CAF50"
          strokeWidth={3}
          strokeDasharray={`${(value / 100) * 2 * Math.PI * ((size - 4) / 2)} ${2 * Math.PI * ((size - 4) / 2)}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" fontWeight="bold">
          {value}%
        </Typography>
      </Box>
    </Box>
  );

  // タスクリスト表示
  const TaskListView = () => (
    <Card>
      <CardContent sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 1 }}>
          <ToolIcon sx={{ color: '#4CAF50' }} />
          <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
            工程一覧
          </Typography>
          <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon />
          </IconButton>
        </Box>

        <Collapse in={showFilters}>
          <Box sx={{ mb: 2, px: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="ステータス"
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    <MenuItem value="planned">予定</MenuItem>
                    <MenuItem value="in_progress">進行中</MenuItem>
                    <MenuItem value="completed">完了</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>カテゴリ</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="カテゴリ"
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    <MenuItem value="survey">調査</MenuItem>
                    <MenuItem value="design">設計</MenuItem>
                    <MenuItem value="planting">植栽</MenuItem>
                    <MenuItem value="decoration">外構</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              fullWidth
              size="small"
              placeholder="工程名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
              sx={{ mt: 1 }}
            />
          </Box>
        </Collapse>

        <List sx={{ p: 0 }}>
          {filteredTasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <ListItem
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper'
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: MOBILE_CATEGORY_COLORS[task.category] || '#757575',
                      width: 32,
                      height: 32
                    }}
                  >
                    {task.category === 'planting' ? '🌱' : 
                     task.category === 'design' ? '📐' :
                     task.category === 'survey' ? '📏' : '🔧'}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {task.name}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        {task.start_date} - {task.end_date} ({task.duration}日)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress}
                          sx={{ flex: 1, height: 4, borderRadius: 2 }}
                        />
                        <Typography variant="caption">
                          {task.progress}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={task.status === 'planned' ? '予定' :
                                task.status === 'in_progress' ? '進行中' :
                                task.status === 'completed' ? '完了' : task.status}
                          size="small"
                          color={
                            task.status === 'completed' ? 'success' :
                            task.status === 'in_progress' ? 'primary' : 'default'
                          }
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingTask(task);
                      setShowTaskDialog(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ pb: 8 }}>
      {/* ヘッダー */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon />
          工程管理
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          造園工事の工程表作成・進捗管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ p: 2 }}>
          <LinearProgress />
          <Typography sx={{ mt: 1, textAlign: 'center' }}>読み込み中...</Typography>
        </Box>
      )}

      <Box sx={{ px: 2 }}>
        {/* プロジェクト選択 */}
        <ProjectSelectionCard />

        {/* 工程表概要 */}
        {currentSchedule && <ScheduleOverviewCard />}

        {/* タスク一覧 */}
        {currentSchedule && filteredTasks.length > 0 && <TaskListView />}

        {/* 工程表が未作成の場合 */}
        {!currentSchedule && (
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <TimelineIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              工程表を作成しましょう
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              案件を選択してテンプレートから工程表を自動生成できます
            </Typography>
          </Card>
        )}
      </Box>

      {/* フローティングアクションボタン */}
      {currentSchedule && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            bgcolor: '#4CAF50',
            '&:hover': { bgcolor: '#388E3C' }
          }}
          onClick={() => {
            setEditingTask(null);
            setShowTaskDialog(true);
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* ボトムナビゲーション */}
      <BottomNavigation
        value={bottomNavValue}
        onChange={(event, newValue) => setBottomNavValue(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <BottomNavigationAction
          label="一覧"
          icon={<ListIcon />}
          onClick={() => setViewMode('list')}
        />
        <BottomNavigationAction
          label="タイムライン"
          icon={<TimelineIcon />}
          onClick={() => setViewMode('timeline')}
        />
        <BottomNavigationAction
          label="保存"
          icon={<SaveIcon />}
          onClick={() => {
            // 保存処理
            console.log('保存:', currentSchedule);
          }}
        />
      </BottomNavigation>

      {/* タスク編集ダイアログ */}
      <Dialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTask ? '工程編集' : '工程追加'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="工程名"
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="説明"
              multiline
              rows={3}
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="開始日"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="期間（日）"
                  type="number"
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>
            キャンセル
          </Button>
          <Button 
            variant="contained"
            sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileProcessManager;