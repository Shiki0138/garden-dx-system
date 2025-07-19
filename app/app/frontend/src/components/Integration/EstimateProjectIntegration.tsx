/**
 * Garden Project Management System - Estimate to Project Integration
 * 見積書→プロジェクト自動生成統合コンポーネント
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Features:
 * - 見積書一覧表示と選択
 * - ワンクリックプロジェクト自動生成
 * - 生成結果確認とガントチャート表示
 * - Worker1見積システムとの完全連携
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assignment,
  Timeline,
  CheckCircle,
  ArrowForward,
  Visibility,
  Person,
  AttachMoney,
  Schedule,
  Build,
  Refresh,
  Error
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Types
interface Estimate {
  estimate_id: number;
  customer_name: string;
  project_title: string;
  total_amount: number;
  total_cost: number;
  profit_rate: number;
  created_date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  items_count: number;
}

interface ProjectCreationResult {
  project_id: number;
  project_name: string;
  total_budget: number;
  estimated_revenue: number;
  estimated_profit: number;
  estimated_profit_rate: number;
  created_tasks: any[];
  message: string;
}

interface EstimateProjectIntegrationProps {
  onProjectCreated?: (projectId: number) => void;
  onViewProject?: (projectId: number) => void;
}

// Styled Components
const EstimateCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
  '&.selected': {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
    borderStyle: 'solid',
  }
}));

const StatusChip = styled(Chip)<{ status: string }>(({ theme, status }) => ({
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: 
    status === 'approved' ? theme.palette.success.main :
    status === 'submitted' ? theme.palette.primary.main :
    status === 'rejected' ? theme.palette.error.main :
    theme.palette.grey[400],
}));

const StepperContainer = styled(Box)(({ theme }) => ({
  maxWidth: 600,
  margin: '0 auto',
  padding: theme.spacing(2),
}));

export const EstimateProjectIntegration: React.FC<EstimateProjectIntegrationProps> = ({
  onProjectCreated,
  onViewProject
}) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectResult, setProjectResult] = useState<ProjectCreationResult | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 見積書一覧を取得
  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    try {
      // TODO: Worker1の見積APIと連携
      // const response = await fetch('/api/estimates/approved');
      // const data = await response.json();
      
      // 仮データ（Worker1システム完成後に実際のAPIと連携）
      const mockEstimates: Estimate[] = [
        {
          estimate_id: 1001,
          customer_name: '田中様',
          project_title: '庭園リフォーム工事',
          total_amount: 1500000,
          total_cost: 1000000,
          profit_rate: 33.3,
          created_date: '2025-06-28',
          status: 'approved',
          items_count: 4
        },
        {
          estimate_id: 1002,
          customer_name: '山田様',
          project_title: '新築外構工事',
          total_amount: 2000000,
          total_cost: 1400000,
          profit_rate: 30.0,
          created_date: '2025-06-29',
          status: 'approved',
          items_count: 6
        },
        {
          estimate_id: 1003,
          customer_name: '佐藤様',
          project_title: '和風庭園造成',
          total_amount: 2500000,
          total_cost: 1800000,
          profit_rate: 28.0,
          created_date: '2025-06-30',
          status: 'submitted',
          items_count: 8
        }
      ];
      
      setEstimates(mockEstimates);
    } catch (error) {
      console.error('見積書取得エラー:', error);
      setError('見積書の取得に失敗しました');
    }
  };

  // 見積書選択
  const handleEstimateSelect = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setProjectName(`${estimate.customer_name}邸 ${estimate.project_title}`);
    setDialogOpen(true);
    setActiveStep(0);
    setError(null);
  };

  // プロジェクト作成実行
  const handleCreateProject = async () => {
    if (!selectedEstimate) return;

    setLoading(true);
    setActiveStep(1);

    try {
      // 統合APIエンドポイントを使用してプロジェクト作成
      const response = await fetch('/api/integration/estimate-to-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimate_id: selectedEstimate.estimate_id,
          project_name: projectName,
          start_date: startDate,
          end_date: endDate || null,
          notes: notes
        })
      });

      if (!response.ok) {
        throw new Error('プロジェクト作成に失敗しました');
      }

      const result: ProjectCreationResult = await response.json();
      setProjectResult(result);
      setActiveStep(2);

      // 成功時のコールバック
      if (onProjectCreated) {
        onProjectCreated(result.project_id);
      }

    } catch (error) {
      console.error('プロジェクト作成エラー:', error);
      setError(error instanceof Error ? error.message : 'プロジェクト作成に失敗しました');
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  // ダイアログクローズ
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEstimate(null);
    setProjectResult(null);
    setActiveStep(0);
    setError(null);
  };

  // プロジェクト表示
  const handleViewProject = () => {
    if (projectResult && onViewProject) {
      onViewProject(projectResult.project_id);
    }
    handleDialogClose();
  };

  const steps = [
    {
      label: '設定確認',
      description: 'プロジェクト設定を確認してください',
    },
    {
      label: 'プロジェクト作成',
      description: 'プロジェクトとタスクを自動生成中...',
    },
    {
      label: '作成完了',
      description: 'プロジェクトが正常に作成されました',
    },
  ];

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          見積書からプロジェクト作成
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchEstimates}
          variant="outlined"
        >
          更新
        </Button>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 見積書一覧 */}
      <Typography variant="h6" gutterBottom>
        承認済み見積書一覧
      </Typography>

      {estimates.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            承認済みの見積書がありません
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {estimates.map((estimate) => (
            <Grid item xs={12} md={6} key={estimate.estimate_id}>
              <EstimateCard
                onClick={() => handleEstimateSelect(estimate)}
                className={selectedEstimate?.estimate_id === estimate.estimate_id ? 'selected' : ''}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3">
                      {estimate.project_title}
                    </Typography>
                    <StatusChip
                      status={estimate.status}
                      label={
                        estimate.status === 'approved' ? '承認済' :
                        estimate.status === 'submitted' ? '提出済' :
                        estimate.status === 'rejected' ? '却下' : '下書き'
                      }
                      size="small"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {estimate.customer_name}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <AttachMoney fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      ¥{estimate.total_amount.toLocaleString()}
                      <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                        (利益率 {estimate.profit_rate}%)
                      </Typography>
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      作成日: {estimate.created_date}
                    </Typography>
                    <Chip
                      icon={<Assignment />}
                      label={`${estimate.items_count}項目`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {estimate.status === 'approved' && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Timeline />}
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEstimateSelect(estimate);
                      }}
                    >
                      プロジェクト作成
                    </Button>
                  )}
                </CardContent>
              </EstimateCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* プロジェクト作成ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          プロジェクト作成: {selectedEstimate?.project_title}
        </DialogTitle>
        <DialogContent>
          <StepperContainer>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>
                    {step.label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {step.description}
                    </Typography>

                    {/* ステップ0: 設定確認 */}
                    {index === 0 && selectedEstimate && (
                      <Box sx={{ pt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="プロジェクト名"
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                              sx={{ mb: 2 }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              type="date"
                              label="開始日"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              type="date"
                              label="完了予定日"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="備考"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                          見積情報
                        </Typography>
                        <Box display="flex" gap={2} mb={2}>
                          <Chip
                            label={`見積金額: ¥${selectedEstimate.total_amount.toLocaleString()}`}
                            color="primary"
                          />
                          <Chip
                            label={`原価: ¥${selectedEstimate.total_cost.toLocaleString()}`}
                            color="secondary"
                          />
                          <Chip
                            label={`利益率: ${selectedEstimate.profit_rate}%`}
                            color="success"
                          />
                        </Box>
                      </Box>
                    )}

                    {/* ステップ1: 作成中 */}
                    {index === 1 && (
                      <Box sx={{ pt: 2 }}>
                        <LinearProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          見積明細からタスクを自動生成しています...
                        </Typography>
                      </Box>
                    )}

                    {/* ステップ2: 完了 */}
                    {index === 2 && projectResult && (
                      <Box sx={{ pt: 2 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          プロジェクトが正常に作成されました！
                        </Alert>

                        <Typography variant="subtitle2" gutterBottom>
                          作成結果
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <Timeline />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`プロジェクトID: ${projectResult.project_id}`}
                              secondary={projectResult.project_name}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'success.main' }}>
                                <AttachMoney />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`見積利益率: ${projectResult.estimated_profit_rate.toFixed(1)}%`}
                              secondary={`予算: ¥${projectResult.total_budget.toLocaleString()} / 売上: ¥${projectResult.estimated_revenue.toLocaleString()}`}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'warning.main' }}>
                                <Build />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`自動生成タスク: ${projectResult.created_tasks.length}件`}
                              secondary="ガントチャートで確認・調整できます"
                            />
                          </ListItem>
                        </List>
                      </Box>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </StepperContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            キャンセル
          </Button>
          {activeStep === 0 && (
            <Button
              onClick={handleCreateProject}
              variant="contained"
              startIcon={<ArrowForward />}
              disabled={!projectName.trim() || loading}
            >
              プロジェクト作成
            </Button>
          )}
          {activeStep === 2 && projectResult && (
            <Button
              onClick={handleViewProject}
              variant="contained"
              startIcon={<Visibility />}
            >
              プロジェクト表示
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimateProjectIntegration;