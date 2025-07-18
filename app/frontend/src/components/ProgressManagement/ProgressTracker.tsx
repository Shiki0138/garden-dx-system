/**
 * Garden Project Management System - Progress Tracker Component
 * 史上最強の造園業向け進捗管理コンポーネント
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Features:
 * - リアルタイム進捗更新
 * - 写真付き報告
 * - 位置情報連携
 * - 遅延アラート自動検出
 * - 予算連動進捗管理
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Badge,
  Tabs,
  Tab,
  Grid,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Schedule,
  PhotoCamera,
  LocationOn,
  TrendingUp,
  Assignment,
  Comment,
  Notification,
  Person,
  AttachMoney,
  Timeline
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Types
interface ProgressUpdate {
  task_id: number;
  progress_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'suspended';
  comment?: string;
  photos?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  reported_by: string;
  reported_at: string;
}

interface Task {
  task_id: number;
  task_name: string;
  assigned_to?: string;
  progress_percentage: number;
  status: string;
  start_date: string;
  end_date: string;
  budget_amount: number;
  actual_cost: number;
  delay_days?: number;
}

interface ProgressTrackerProps {
  projectId: number;
  tasks: Task[];
  onProgressUpdate: (update: ProgressUpdate) => void;
  currentUser: string;
  readonly?: boolean;
}

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

const StatusChip = styled(Chip)<{ status: string }>(({ theme, status }) => ({
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: 
    status === 'completed' ? theme.palette.success.main :
    status === 'in_progress' ? theme.palette.primary.main :
    status === 'delayed' ? theme.palette.error.main :
    status === 'suspended' ? theme.palette.warning.main :
    theme.palette.grey[400],
}));

const PhotoPreview = styled('img')({
  width: 60,
  height: 60,
  objectFit: 'cover',
  borderRadius: 8,
  marginRight: 8,
});

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  projectId,
  tasks,
  onProgressUpdate,
  currentUser,
  readonly = false
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // 位置情報取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.warn('位置情報取得エラー:', error)
      );
    }
  }, []);

  // 遅延タスクのアラート
  const delayedTasks = tasks.filter(task => task.delay_days && task.delay_days > 0);
  
  // 今日期限のタスク
  const todayDeadlineTasks = tasks.filter(task => {
    const today = new Date().toISOString().split('T')[0];
    return task.end_date === today && task.progress_percentage < 100;
  });

  // 進捗更新ダイアログを開く
  const handleOpenUpdateDialog = (task: Task) => {
    setSelectedTask(task);
    setProgressValue(task.progress_percentage);
    setComment('');
    setPhotos([]);
    setUpdateDialogOpen(true);
  };

  // 進捗更新処理
  const handleProgressUpdate = async () => {
    if (!selectedTask) return;

    try {
      // 写真アップロード処理（仮実装）
      const photoUrls: string[] = [];
      for (const photo of photos) {
        // TODO: 実際の写真アップロード処理
        const formData = new FormData();
        formData.append('file', photo);
        // const response = await uploadPhoto(formData);
        // photoUrls.push(response.url);
        photoUrls.push(`/tmp/photo_${Date.now()}.jpg`);
      }

      // ステータス自動判定
      let status = selectedTask.status as any;
      if (progressValue === 100) {
        status = 'completed';
      } else if (progressValue > 0) {
        status = 'in_progress';
      }

      // 位置情報付きアップデート
      const update: ProgressUpdate = {
        task_id: selectedTask.task_id,
        progress_percentage: progressValue,
        status,
        comment: comment.trim() || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: await getAddressFromCoords(location.coords.latitude, location.coords.longitude)
        } : undefined,
        reported_by: currentUser,
        reported_at: new Date().toISOString()
      };

      await onProgressUpdate(update);
      
      setUpdateDialogOpen(false);
      setSelectedTask(null);

      // 成功通知
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: `${selectedTask.task_name}の進捗を更新しました（${progressValue}%）`,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('進捗更新エラー:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: '進捗更新に失敗しました',
        timestamp: new Date()
      }]);
    }
  };

  // 写真選択
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 5)); // 最大5枚
  };

  // 住所取得（Reverse Geocoding）
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      // TODO: 実際のGeocoding API呼び出し
      return `東京都渋谷区○○${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10)}`;
    } catch {
      return `緯度:${lat.toFixed(6)}, 経度:${lng.toFixed(6)}`;
    }
  };

  // プログレスバーの色を決定
  const getProgressColor = (task: Task) => {
    if (task.delay_days && task.delay_days > 0) return 'error';
    if (task.progress_percentage === 100) return 'success';
    if (task.progress_percentage > 70) return 'primary';
    if (task.progress_percentage > 30) return 'warning';
    return 'inherit';
  };

  // タスクカードの描画
  const renderTaskCard = (task: Task) => (
    <StyledCard key={task.task_id}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h3">
            {task.task_name}
          </Typography>
          <StatusChip 
            status={task.status}
            label={task.status === 'completed' ? '完了' :
                   task.status === 'in_progress' ? '進行中' :
                   task.status === 'delayed' ? '遅延' :
                   task.status === 'suspended' ? '中断' : '未開始'}
            size="small"
          />
        </Box>

        <ProgressContainer>
          <Box flex={1}>
            <LinearProgress
              variant="determinate"
              value={task.progress_percentage}
              color={getProgressColor(task)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="body2" fontWeight="bold">
            {task.progress_percentage}%
          </Typography>
        </ProgressContainer>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            期間: {task.start_date} ～ {task.end_date}
          </Typography>
          {task.assigned_to && (
            <Chip
              avatar={<Avatar sx={{ width: 24, height: 24 }}><Person /></Avatar>}
              label={task.assigned_to}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* 予算情報 */}
        <Box display="flex" gap={2} mb={2}>
          <Box flex={1}>
            <Typography variant="caption" color="text.secondary">予算</Typography>
            <Typography variant="body2">¥{task.budget_amount.toLocaleString()}</Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="caption" color="text.secondary">実績</Typography>
            <Typography variant="body2">¥{task.actual_cost.toLocaleString()}</Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="caption" color="text.secondary">消化率</Typography>
            <Typography 
              variant="body2" 
              color={task.budget_amount > 0 && (task.actual_cost / task.budget_amount) > 1 ? 'error' : 'inherit'}
            >
              {task.budget_amount > 0 ? 
                `${((task.actual_cost / task.budget_amount) * 100).toFixed(1)}%` : 
                '-'}
            </Typography>
          </Box>
        </Box>

        {/* アラート */}
        {task.delay_days && task.delay_days > 0 && (
          <Alert severity="error" sx={{ mb: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning />
              {task.delay_days}日遅延しています
            </Box>
          </Alert>
        )}

        {/* 今日期限 */}
        {todayDeadlineTasks.some(t => t.task_id === task.task_id) && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule />
              今日が期限です
            </Box>
          </Alert>
        )}

        {/* 更新ボタン */}
        {!readonly && (task.assigned_to === currentUser || !task.assigned_to) && (
          <Button
            variant="contained"
            startIcon={<TrendingUp />}
            onClick={() => handleOpenUpdateDialog(task)}
            fullWidth
          >
            進捗更新
          </Button>
        )}
      </CardContent>
    </StyledCard>
  );

  return (
    <Box>
      {/* 通知バー */}
      {(delayedTasks.length > 0 || todayDeadlineTasks.length > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Badge badgeContent={delayedTasks.length + todayDeadlineTasks.length} color="error">
              <Notification />
            </Badge>
            <Box>
              {delayedTasks.length > 0 && (
                <Typography variant="body2">
                  {delayedTasks.length}件のタスクが遅延しています
                </Typography>
              )}
              {todayDeadlineTasks.length > 0 && (
                <Typography variant="body2">
                  {todayDeadlineTasks.length}件のタスクが今日期限です
                </Typography>
              )}
            </Box>
          </Box>
        </Alert>
      )}

      {/* タブ */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab label="全タスク" />
          <Tab label="担当タスク" />
          <Tab label="遅延・要注意" />
          <Tab label="完了済み" />
        </Tabs>
      </Paper>

      {/* タスク一覧 */}
      <Box>
        {tabValue === 0 && tasks.map(renderTaskCard)}
        {tabValue === 1 && tasks.filter(t => t.assigned_to === currentUser).map(renderTaskCard)}
        {tabValue === 2 && tasks.filter(t => 
          (t.delay_days && t.delay_days > 0) || 
          todayDeadlineTasks.some(td => td.task_id === t.task_id)
        ).map(renderTaskCard)}
        {tabValue === 3 && tasks.filter(t => t.status === 'completed').map(renderTaskCard)}
      </Box>

      {/* 進捗更新ダイアログ */}
      <Dialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          進捗更新: {selectedTask?.task_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 進捗率スライダー */}
            <Typography gutterBottom>進捗率: {progressValue}%</Typography>
            <Slider
              value={progressValue}
              onChange={(_, value) => setProgressValue(value as number)}
              min={0}
              max={100}
              step={5}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' }
              ]}
              sx={{ mb: 3 }}
            />

            {/* コメント */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="作業報告・コメント"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="今日の作業内容、気づいた点、課題などを記入してください"
              sx={{ mb: 3 }}
            />

            {/* 写真アップロード */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                現場写真（最大5枚）
              </Typography>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                style={{ marginBottom: 16 }}
              />
              {photos.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {photos.map((photo, index) => (
                    <PhotoPreview
                      key={index}
                      src={URL.createObjectURL(photo)}
                      alt={`写真 ${index + 1}`}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* 位置情報 */}
            {location && (
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocationOn color="primary" />
                <Typography variant="body2">
                  位置情報が取得されました
                </Typography>
              </Box>
            )}

            {/* 現在の予算情報 */}
            {selectedTask && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  予算情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption">予算</Typography>
                    <Typography variant="body2">
                      ¥{selectedTask.budget_amount.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption">実績</Typography>
                    <Typography variant="body2">
                      ¥{selectedTask.actual_cost.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption">残予算</Typography>
                    <Typography 
                      variant="body2" 
                      color={selectedTask.budget_amount - selectedTask.actual_cost < 0 ? 'error' : 'inherit'}
                    >
                      ¥{(selectedTask.budget_amount - selectedTask.actual_cost).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleProgressUpdate} 
            variant="contained"
            startIcon={<CheckCircle />}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgressTracker;