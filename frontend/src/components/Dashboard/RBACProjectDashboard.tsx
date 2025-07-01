/**
 * Garden Project Management System - RBAC Project Dashboard
 * 役割ベースアクセス制御統合プロジェクトダッシュボード
 * 
 * Created by: worker2
 * Date: 2025-06-30
 * Purpose: 経営者・従業員の権限に応じた情報表示制御
 * 
 * Features:
 * - 経営者: 全財務情報・利益率・原価データ表示
 * - 従業員: 作業進捗・スケジュール中心の表示
 * - Worker4認証システムとのRBAC連携
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
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
  LinearProgress,
  Avatar,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AttachMoney,
  Timeline,
  Assignment,
  Warning,
  TrendingUp,
  Schedule,
  Person,
  Visibility,
  VisibilityOff,
  Security,
  Business,
  Work,
  Analytics,
  Lock
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Types
interface UserRole {
  role_id: string;
  role_name: '経営者' | '従業員' | 'manager' | 'employee';
  permissions: string[];
  company_id: number;
}

interface ProjectSummary {
  project_id: number;
  project_name: string;
  customer_name: string;
  progress_percentage: number;
  total_budget: number;
  actual_cost: number;
  estimated_revenue: number;
  estimated_profit: number;
  estimated_profit_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  manager_name?: string;
  delay_days?: number;
}

interface FinancialMetrics {
  total_projects: number;
  active_projects: number;
  total_revenue: number;
  total_profit: number;
  average_profit_rate: number;
  budget_consumption_rate: number;
  overbudget_projects: number;
}

interface RBACProjectDashboardProps {
  userRole: UserRole;
  companyId: number;
  userId: number;
  userName: string;
}

// Styled Components
const RoleChip = styled(Chip)<{ role: string }>(({ theme, role }) => ({
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: 
    role === '経営者' || role === 'manager' ? theme.palette.primary.main :
    role === '従業員' || role === 'employee' ? theme.palette.secondary.main :
    theme.palette.grey[400],
}));

const FinancialCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  '& .MuiTypography-root': {
    color: 'white',
  },
}));

const RestrictedCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.grey[400]} 0%, ${theme.palette.grey[600]} 100%)`,
  color: 'white',
  position: 'relative',
  '& .MuiTypography-root': {
    color: 'white',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
}));

const ProgressCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

export const RBACProjectDashboard: React.FC<RBACProjectDashboardProps> = ({
  userRole,
  companyId,
  userId,
  userName
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showRestrictedInfo, setShowRestrictedInfo] = useState(false);

  // 権限チェック関数
  const hasPermission = (permission: string): boolean => {
    return userRole.permissions.includes(permission) || 
           userRole.role_name === '経営者' || 
           userRole.role_name === 'manager';
  };

  const isManager = (): boolean => {
    return userRole.role_name === '経営者' || userRole.role_name === 'manager';
  };

  const isEmployee = (): boolean => {
    return userRole.role_name === '従業員' || userRole.role_name === 'employee';
  };

  // データ取得
  useEffect(() => {
    fetchDashboardData();
  }, [companyId, userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // プロジェクト一覧取得（権限に応じてフィルタリング）
      const projectsEndpoint = isEmployee() 
        ? `/api/projects/my-assignments?user_id=${userId}`
        : `/api/projects?company_id=${companyId}`;
      
      const projectsResponse = await fetch(projectsEndpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-User-Role': userRole.role_name,
        }
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);
      }

      // 財務指標取得（経営者のみ）
      if (isManager() && hasPermission('view_financial_data')) {
        const metricsResponse = await fetch(`/api/analytics/financial-metrics?company_id=${companyId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-User-Role': userRole.role_name,
          }
        });

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setFinancialMetrics(metricsData);
        }
      }

    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // プロジェクト詳細表示
  const handleProjectDetail = (project: ProjectSummary) => {
    setSelectedProject(project);
    setDetailDialogOpen(true);
  };

  // 経営者向け財務カード
  const renderFinancialCards = () => {
    if (!isManager() || !financialMetrics) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FinancialCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    ¥{financialMetrics.total_revenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    総売上
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </FinancialCard>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FinancialCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    ¥{financialMetrics.total_profit.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    総利益
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </FinancialCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <FinancialCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <Analytics />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {financialMetrics.average_profit_rate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    平均利益率
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </FinancialCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <FinancialCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {financialMetrics.active_projects}
                  </Typography>
                  <Typography variant="body2">
                    進行中案件
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </FinancialCard>
        </Grid>
      </Grid>
    );
  };

  // 従業員向け制限カード
  const renderRestrictedFinancialCards = () => {
    if (isManager()) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <RestrictedCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} position="relative" zIndex={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <Lock />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    財務情報
                  </Typography>
                  <Typography variant="body2">
                    経営者のみ閲覧可能
                  </Typography>
                </Box>
                <Tooltip title="財務情報は経営者権限が必要です">
                  <IconButton 
                    onClick={() => setShowRestrictedInfo(!showRestrictedInfo)}
                    sx={{ color: 'white', ml: 'auto' }}
                  >
                    {showRestrictedInfo ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Tooltip>
              </Box>
              {showRestrictedInfo && (
                <Alert severity="info" sx={{ mt: 2, zIndex: 2, position: 'relative' }}>
                  利益率、原価情報、財務分析は経営者権限でのみ閲覧できます。
                  作業進捗と予算情報の確認は可能です。
                </Alert>
              )}
            </CardContent>
          </RestrictedCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ProgressCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Work />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {projects.filter(p => p.status === 'active').length}
                  </Typography>
                  <Typography variant="body2">
                    担当案件数
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </ProgressCard>
        </Grid>
      </Grid>
    );
  };

  // プロジェクト一覧テーブル
  const renderProjectsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>プロジェクト名</TableCell>
            <TableCell>顧客</TableCell>
            <TableCell>進捗</TableCell>
            <TableCell>期限</TableCell>
            {isManager() && <TableCell>予算</TableCell>}
            {isManager() && <TableCell>利益率</TableCell>}
            <TableCell>状態</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.project_id}>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {project.project_name}
                </Typography>
              </TableCell>
              <TableCell>{project.customer_name}</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress_percentage}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    color={project.delay_days && project.delay_days > 0 ? 'error' : 'primary'}
                  />
                  <Typography variant="caption">
                    {project.progress_percentage}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {project.end_date}
                </Typography>
                {project.delay_days && project.delay_days > 0 && (
                  <Chip 
                    label={`${project.delay_days}日遅延`} 
                    color="error" 
                    size="small" 
                  />
                )}
              </TableCell>
              {isManager() && (
                <TableCell>
                  <Typography variant="body2">
                    ¥{project.total_budget.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    実績: ¥{project.actual_cost.toLocaleString()}
                  </Typography>
                </TableCell>
              )}
              {isManager() && (
                <TableCell>
                  <Chip
                    label={`${project.estimated_profit_rate.toFixed(1)}%`}
                    color={project.estimated_profit_rate > 20 ? 'success' : project.estimated_profit_rate > 10 ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
              )}
              <TableCell>
                <Chip
                  label={project.status === 'active' ? '進行中' : project.status === 'completed' ? '完了' : '中断'}
                  color={project.status === 'active' ? 'primary' : project.status === 'completed' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleProjectDetail(project)}
                >
                  詳細
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            プロジェクトダッシュボード
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <RoleChip 
              role={userRole.role_name}
              icon={isManager() ? <Business /> : <Work />}
              label={`${userName} (${userRole.role_name})`}
            />
            <Chip
              icon={<Security />}
              label={`権限: ${userRole.permissions.length}件`}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Box>

      {/* 権限説明 */}
      <Alert 
        severity={isManager() ? "success" : "info"} 
        sx={{ mb: 3 }}
        icon={isManager() ? <Business /> : <Work />}
      >
        <Typography variant="body2">
          {isManager() 
            ? "経営者権限により、全ての財務情報・利益データにアクセスできます。"
            : "従業員権限により、作業進捗・スケジュール情報を中心に表示されます。財務詳細は経営者のみ閲覧可能です。"
          }
        </Typography>
      </Alert>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* 財務カード */}
          {renderFinancialCards()}
          {renderRestrictedFinancialCards()}

          {/* プロジェクト一覧 */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isEmployee() ? "担当プロジェクト一覧" : "全プロジェクト一覧"}
            </Typography>
            {renderProjectsTable()}
          </Paper>
        </>
      )}

      {/* プロジェクト詳細ダイアログ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          プロジェクト詳細: {selectedProject?.project_name}
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">顧客名</Typography>
                  <Typography variant="body1">{selectedProject.customer_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">進捗率</Typography>
                  <Typography variant="body1">{selectedProject.progress_percentage}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">開始日</Typography>
                  <Typography variant="body1">{selectedProject.start_date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">完了予定日</Typography>
                  <Typography variant="body1">{selectedProject.end_date}</Typography>
                </Grid>
              </Grid>

              {isManager() && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>財務情報</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">予算</Typography>
                      <Typography variant="body1">¥{selectedProject.total_budget.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">売上予定</Typography>
                      <Typography variant="body1">¥{selectedProject.estimated_revenue.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">利益予定</Typography>
                      <Typography variant="body1" color="success.main">
                        ¥{selectedProject.estimated_profit.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RBACProjectDashboard;