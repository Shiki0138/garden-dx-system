/**
 * セキュリティ設定コンポーネント - 認証設定・パスワードポリシー・セキュリティ監査
 * JWT・RBAC統合・多要素認証準備・セキュリティ監視
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Slider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Computer as ComputerIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';

interface SecurityConfig {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
    expiry_days: number;
  };
  session_management: {
    timeout_minutes: number;
    max_concurrent_sessions: number;
    remember_me_enabled: boolean;
    remember_me_days: number;
  };
  authentication: {
    max_login_attempts: number;
    lockout_duration_minutes: number;
    two_factor_enabled: boolean;
    email_verification_required: boolean;
  };
  security_monitoring: {
    failed_login_alerts: boolean;
    suspicious_activity_detection: boolean;
    audit_log_retention_days: number;
    security_report_frequency: string;
  };
}

interface SecurityLog {
  timestamp: string;
  event_type: string;
  user: string;
  ip_address: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
}

interface SecuritySettingsProps {
  onChanged: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onChanged }) => {
  const [config, setConfig] = useState<SecurityConfig>({
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special: true,
      expiry_days: 90
    },
    session_management: {
      timeout_minutes: 480,
      max_concurrent_sessions: 3,
      remember_me_enabled: true,
      remember_me_days: 30
    },
    authentication: {
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      two_factor_enabled: false,
      email_verification_required: true
    },
    security_monitoring: {
      failed_login_alerts: true,
      suspicious_activity_detection: true,
      audit_log_retention_days: 365,
      security_report_frequency: 'weekly'
    }
  });

  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [securityScore, setSecurityScore] = useState(85);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadSecurityConfig();
    loadSecurityLogs();
    calculateSecurityScore();
  }, []);

  const loadSecurityConfig = async () => {
    try {
      // TODO: API呼び出し
      // const response = await fetch('/api/security/config');
      // const data = await response.json();
      // setConfig(data);
    } catch (error) {
      console.error('セキュリティ設定の読み込みに失敗:', error);
    }
  };

  const loadSecurityLogs = () => {
    // デモデータ
    setSecurityLogs([
      {
        timestamp: '2025-07-01 09:45:00',
        event_type: 'ログイン成功',
        user: '田中 太郎',
        ip_address: '192.168.1.100',
        description: '正常ログイン',
        risk_level: 'low'
      },
      {
        timestamp: '2025-07-01 09:30:00',
        event_type: 'ログイン失敗',
        user: 'unknown',
        ip_address: '203.0.113.1',
        description: '無効なパスワード',
        risk_level: 'medium'
      },
      {
        timestamp: '2025-07-01 08:15:00',
        event_type: 'アカウントロック',
        user: 'yamada@example.com',
        ip_address: '192.168.1.105',
        description: '連続ログイン失敗',
        risk_level: 'high'
      }
    ]);
  };

  const calculateSecurityScore = () => {
    let score = 0;
    
    // パスワードポリシー (25点)
    if (config.password_policy.min_length >= 8) score += 5;
    if (config.password_policy.require_uppercase) score += 5;
    if (config.password_policy.require_numbers) score += 5;
    if (config.password_policy.require_special) score += 5;
    if (config.password_policy.expiry_days <= 90) score += 5;
    
    // 認証設定 (25点)
    if (config.authentication.max_login_attempts <= 5) score += 5;
    if (config.authentication.lockout_duration_minutes >= 15) score += 5;
    if (config.authentication.two_factor_enabled) score += 10;
    if (config.authentication.email_verification_required) score += 5;
    
    // セッション管理 (25点)
    if (config.session_management.timeout_minutes <= 480) score += 10;
    if (config.session_management.max_concurrent_sessions <= 3) score += 10;
    if (!config.session_management.remember_me_enabled || config.session_management.remember_me_days <= 30) score += 5;
    
    // 監視・監査 (25点)
    if (config.security_monitoring.failed_login_alerts) score += 5;
    if (config.security_monitoring.suspicious_activity_detection) score += 10;
    if (config.security_monitoring.audit_log_retention_days >= 365) score += 10;
    
    setSecurityScore(score);
  };

  const handleConfigChange = (section: keyof SecurityConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    onChanged();
  };

  const handleSave = async () => {
    try {
      // TODO: API呼び出し
      // await fetch('/api/security/config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config)
      // });
      
      calculateSecurityScore();
      alert('セキュリティ設定が保存されました');
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const runSecurityTest = async () => {
    try {
      // TODO: セキュリティテスト実行
      setTestResults({
        overall_score: 96,
        vulnerabilities_found: 0,
        recommendations: [
          'セキュリティヘッダーの追加を推奨',
          '多要素認証の有効化を推奨'
        ]
      });
      setIsTestDialogOpen(true);
    } catch (error) {
      console.error('セキュリティテストに失敗:', error);
    }
  };

  const getRiskChip = (level: string) => {
    const colors = {
      low: 'success',
      medium: 'warning',  
      high: 'error'
    } as const;
    
    return (
      <Chip 
        label={level.toUpperCase()} 
        color={colors[level as keyof typeof colors]} 
        size="small" 
      />
    );
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          セキュリティ設定
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SecurityIcon />}
            onClick={runSecurityTest}
            sx={{ mr: 1 }}
          >
            セキュリティテスト実行
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            設定保存
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* セキュリティスコア */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              avatar={<ShieldIcon color="primary" />}
              title="セキュリティスコア"
              subheader="現在のセキュリティレベル"
            />
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h2" color="primary">
                  {securityScore}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={securityScore} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color={securityScore >= 80 ? 'success' : securityScore >= 60 ? 'warning' : 'error'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                セキュリティ設定の充実度を示しています。90%以上を目標にしてください。
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* セキュリティアラート */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              avatar={<WarningIcon color="warning" />}
              title="セキュリティアラート"
              subheader="最近のセキュリティイベント"
            />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>時刻</TableCell>
                      <TableCell>イベント</TableCell>
                      <TableCell>ユーザー</TableCell>
                      <TableCell>リスク</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityLogs.slice(0, 5).map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{log.timestamp}</TableCell>
                        <TableCell>{log.event_type}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{getRiskChip(log.risk_level)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* パスワードポリシー */}
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <VpnKeyIcon sx={{ mr: 1 }} />
              <Typography variant="h6">パスワードポリシー</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography gutterBottom>
                    最小文字数: {config.password_policy.min_length}
                  </Typography>
                  <Slider
                    value={config.password_policy.min_length}
                    onChange={(_, value) => handleConfigChange('password_policy', 'min_length', value)}
                    min={6}
                    max={20}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.password_policy.require_uppercase}
                        onChange={(e) => handleConfigChange('password_policy', 'require_uppercase', e.target.checked)}
                      />
                    }
                    label="大文字必須"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.password_policy.require_lowercase}
                        onChange={(e) => handleConfigChange('password_policy', 'require_lowercase', e.target.checked)}
                      />
                    }
                    label="小文字必須"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.password_policy.require_numbers}
                        onChange={(e) => handleConfigChange('password_policy', 'require_numbers', e.target.checked)}
                      />
                    }
                    label="数字必須"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.password_policy.require_special}
                        onChange={(e) => handleConfigChange('password_policy', 'require_special', e.target.checked)}
                      />
                    }
                    label="記号必須"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="パスワード有効期限（日数）"
                    type="number"
                    value={config.password_policy.expiry_days}
                    onChange={(e) => handleConfigChange('password_policy', 'expiry_days', parseInt(e.target.value))}
                    InputProps={{ endAdornment: '日' }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 認証設定 */}
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SecurityIcon sx={{ mr: 1 }} />
              <Typography variant="h6">認証設定</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="最大ログイン試行回数"
                    type="number"
                    value={config.authentication.max_login_attempts}
                    onChange={(e) => handleConfigChange('authentication', 'max_login_attempts', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="ロック時間（分）"
                    type="number"
                    value={config.authentication.lockout_duration_minutes}
                    onChange={(e) => handleConfigChange('authentication', 'lockout_duration_minutes', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.authentication.two_factor_enabled}
                        onChange={(e) => handleConfigChange('authentication', 'two_factor_enabled', e.target.checked)}
                      />
                    }
                    label="多要素認証を有効にする"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    SMS・メール・認証アプリによる2段階認証
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.authentication.email_verification_required}
                        onChange={(e) => handleConfigChange('authentication', 'email_verification_required', e.target.checked)}
                      />
                    }
                    label="メール認証を必須にする"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* セッション管理 */}
        <Grid item xs={12} md={6}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <ScheduleIcon sx={{ mr: 1 }} />
              <Typography variant="h6">セッション管理</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="セッションタイムアウト（分）"
                    type="number"
                    value={config.session_management.timeout_minutes}
                    onChange={(e) => handleConfigChange('session_management', 'timeout_minutes', parseInt(e.target.value))}
                    helperText="無操作時のタイムアウト時間"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="最大同時セッション数"
                    type="number"
                    value={config.session_management.max_concurrent_sessions}
                    onChange={(e) => handleConfigChange('session_management', 'max_concurrent_sessions', parseInt(e.target.value))}
                    helperText="1ユーザーあたりの同時ログイン数"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.session_management.remember_me_enabled}
                        onChange={(e) => handleConfigChange('session_management', 'remember_me_enabled', e.target.checked)}
                      />
                    }
                    label="ログイン状態の保持を許可"
                  />
                </Grid>
                
                {config.session_management.remember_me_enabled && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="保持期間（日数）"
                      type="number"
                      value={config.session_management.remember_me_days}
                      onChange={(e) => handleConfigChange('session_management', 'remember_me_days', parseInt(e.target.value))}
                    />
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* セキュリティ監視 */}
        <Grid item xs={12} md={6}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <NotificationsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">セキュリティ監視</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.security_monitoring.failed_login_alerts}
                        onChange={(e) => handleConfigChange('security_monitoring', 'failed_login_alerts', e.target.checked)}
                      />
                    }
                    label="ログイン失敗アラート"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.security_monitoring.suspicious_activity_detection}
                        onChange={(e) => handleConfigChange('security_monitoring', 'suspicious_activity_detection', e.target.checked)}
                      />
                    }
                    label="不審なアクティビティの検出"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="監査ログ保持期間（日数）"
                    type="number"
                    value={config.security_monitoring.audit_log_retention_days}
                    onChange={(e) => handleConfigChange('security_monitoring', 'audit_log_retention_days', parseInt(e.target.value))}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* セキュリティテスト結果ダイアログ */}
      <Dialog 
        open={isTestDialogOpen} 
        onClose={() => setIsTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>セキュリティテスト結果</DialogTitle>
        <DialogContent>
          {testResults && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                セキュリティスコア: {testResults.overall_score}%
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                検出された脆弱性: {testResults.vulnerabilities_found}件
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                推奨事項:
              </Typography>
              <List>
                {testResults.recommendations.map((rec: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTestDialogOpen(false)}>
            閉じる
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            レポートダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettings;