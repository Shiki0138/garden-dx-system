/**
 * システム設定コンポーネント - アプリケーション設定・データ管理・バックアップ
 * 造園業務システム最適化・データベース管理・パフォーマンス設定
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  IconButton
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
  Speed as SpeedIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Computer as ComputerIcon,
  Memory as MemoryIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

interface SystemConfig {
  general: {
    app_name: string;
    app_version: string;
    timezone: string;
    date_format: string;
    currency: string;
    language: string;
    theme_mode: 'light' | 'dark' | 'auto';
  };
  performance: {
    enable_caching: boolean;
    cache_duration_hours: number;
    max_concurrent_users: number;
    page_size_default: number;
    api_timeout_seconds: number;
  };
  data_management: {
    auto_backup_enabled: boolean;
    backup_frequency: string;
    backup_retention_days: number;
    data_compression: boolean;
    cleanup_old_data: boolean;
    cleanup_threshold_days: number;
  };
  business_settings: {
    default_tax_rate: number;
    default_markup_rate: number;
    auto_estimate_numbering: boolean;
    estimate_valid_days: number;
    invoice_payment_terms: number;
    show_cost_to_employees: boolean;
  };
}

interface SystemStatus {
  database_size: string;
  total_users: number;
  total_estimates: number;
  total_invoices: number;
  last_backup: string;
  disk_usage: number;
  memory_usage: number;
  cpu_usage: number;
}

interface SystemSettingsProps {
  onChanged: () => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ onChanged }) => {
  const [config, setConfig] = useState<SystemConfig>({
    general: {
      app_name: 'Garden DX',
      app_version: '1.0.0',
      timezone: 'Asia/Tokyo',
      date_format: 'YYYY/MM/DD',
      currency: 'JPY',
      language: 'ja',
      theme_mode: 'light'
    },
    performance: {
      enable_caching: true,
      cache_duration_hours: 24,
      max_concurrent_users: 50,
      page_size_default: 20,
      api_timeout_seconds: 30
    },
    data_management: {
      auto_backup_enabled: true,
      backup_frequency: 'daily',
      backup_retention_days: 30,
      data_compression: true,
      cleanup_old_data: true,
      cleanup_threshold_days: 365
    },
    business_settings: {
      default_tax_rate: 10.0,
      default_markup_rate: 1.3,
      auto_estimate_numbering: true,
      estimate_valid_days: 30,
      invoice_payment_terms: 30,
      show_cost_to_employees: false
    }
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database_size: '245 MB',
    total_users: 15,
    total_estimates: 1284,
    total_invoices: 856,
    last_backup: '2025-07-01 03:00:00',
    disk_usage: 45,
    memory_usage: 32,
    cpu_usage: 18
  });

  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    loadSystemConfig();
    loadSystemStatus();
  }, []);

  const loadSystemConfig = async () => {
    try {
      // TODO: API呼び出し
      // const response = await fetch('/api/system/config');
      // const data = await response.json();
      // setConfig(data);
    } catch (error) {
      console.error('システム設定の読み込みに失敗:', error);
    }
  };

  const loadSystemStatus = () => {
    // デモデータは既に設定済み
  };

  const handleConfigChange = (section: keyof SystemConfig, field: string, value: any) => {
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
      // await fetch('/api/system/config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config)
      // });
      
      alert('システム設定が保存されました');
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleBackupNow = async () => {
    try {
      // TODO: バックアップ実行API
      // await fetch('/api/system/backup', { method: 'POST' });
      alert('バックアップを開始しました');
      setIsBackupDialogOpen(false);
    } catch (error) {
      console.error('バックアップに失敗:', error);
    }
  };

  const handleDataCleanup = async () => {
    if (window.confirm('古いデータを削除しますか？この操作は取り消せません。')) {
      try {
        // TODO: データクリーンアップAPI
        alert('データクリーンアップが完了しました');
      } catch (error) {
        console.error('データクリーンアップに失敗:', error);
      }
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'error';
    if (usage >= 60) return 'warning';
    return 'success';
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          システム設定
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BackupIcon />}
            onClick={() => setIsBackupDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            バックアップ実行
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
        {/* システム状態 */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader
              avatar={<ComputerIcon color="primary" />}
              title="システム状態"
              subheader="現在のシステム使用状況"
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="データベースサイズ" 
                    secondary={systemStatus.database_size}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="登録データ" 
                    secondary={`見積: ${systemStatus.total_estimates}件, 請求書: ${systemStatus.total_invoices}件`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <BackupIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="最終バックアップ" 
                    secondary={systemStatus.last_backup}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              {/* リソース使用状況 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  ディスク使用量: {systemStatus.disk_usage}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStatus.disk_usage} 
                  color={getUsageColor(systemStatus.disk_usage)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  メモリ使用量: {systemStatus.memory_usage}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStatus.memory_usage} 
                  color={getUsageColor(systemStatus.memory_usage)}
                />
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  CPU使用量: {systemStatus.cpu_usage}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStatus.cpu_usage} 
                  color={getUsageColor(systemStatus.cpu_usage)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 設定項目 */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={2}>
            {/* 一般設定 */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <SettingsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">一般設定</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="アプリケーション名"
                        value={config.general.app_name}
                        onChange={(e) => handleConfigChange('general', 'app_name', e.target.value)}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>タイムゾーン</InputLabel>
                        <Select
                          value={config.general.timezone}
                          label="タイムゾーン"
                          onChange={(e) => handleConfigChange('general', 'timezone', e.target.value)}
                        >
                          <MenuItem value="Asia/Tokyo">Asia/Tokyo (JST)</MenuItem>
                          <MenuItem value="UTC">UTC</MenuItem>
                          <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>日付形式</InputLabel>
                        <Select
                          value={config.general.date_format}
                          label="日付形式"
                          onChange={(e) => handleConfigChange('general', 'date_format', e.target.value)}
                        >
                          <MenuItem value="YYYY/MM/DD">YYYY/MM/DD</MenuItem>
                          <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                          <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>通貨</InputLabel>
                        <Select
                          value={config.general.currency}
                          label="通貨"
                          onChange={(e) => handleConfigChange('general', 'currency', e.target.value)}
                        >
                          <MenuItem value="JPY">JPY (¥)</MenuItem>
                          <MenuItem value="USD">USD ($)</MenuItem>
                          <MenuItem value="EUR">EUR (€)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>テーマ</InputLabel>
                        <Select
                          value={config.general.theme_mode}
                          label="テーマ"
                          onChange={(e) => handleConfigChange('general', 'theme_mode', e.target.value)}
                        >
                          <MenuItem value="light">ライト</MenuItem>
                          <MenuItem value="dark">ダーク</MenuItem>
                          <MenuItem value="auto">自動</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* パフォーマンス設定 */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <SpeedIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">パフォーマンス設定</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.performance.enable_caching}
                            onChange={(e) => handleConfigChange('performance', 'enable_caching', e.target.checked)}
                          />
                        }
                        label="キャッシュを有効にする"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="キャッシュ有効期間（時間）"
                        type="number"
                        value={config.performance.cache_duration_hours}
                        onChange={(e) => handleConfigChange('performance', 'cache_duration_hours', parseInt(e.target.value))}
                        disabled={!config.performance.enable_caching}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="最大同時ユーザー数"
                        type="number"
                        value={config.performance.max_concurrent_users}
                        onChange={(e) => handleConfigChange('performance', 'max_concurrent_users', parseInt(e.target.value))}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="デフォルトページサイズ"
                        type="number"
                        value={config.performance.page_size_default}
                        onChange={(e) => handleConfigChange('performance', 'page_size_default', parseInt(e.target.value))}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="APIタイムアウト（秒）"
                        type="number"
                        value={config.performance.api_timeout_seconds}
                        onChange={(e) => handleConfigChange('performance', 'api_timeout_seconds', parseInt(e.target.value))}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* データ管理設定 */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">データ管理</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.data_management.auto_backup_enabled}
                            onChange={(e) => handleConfigChange('data_management', 'auto_backup_enabled', e.target.checked)}
                          />
                        }
                        label="自動バックアップを有効にする"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <FormControl fullWidth disabled={!config.data_management.auto_backup_enabled}>
                        <InputLabel>バックアップ頻度</InputLabel>
                        <Select
                          value={config.data_management.backup_frequency}
                          label="バックアップ頻度"
                          onChange={(e) => handleConfigChange('data_management', 'backup_frequency', e.target.value)}
                        >
                          <MenuItem value="hourly">毎時</MenuItem>
                          <MenuItem value="daily">毎日</MenuItem>
                          <MenuItem value="weekly">毎週</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="バックアップ保持日数"
                        type="number"
                        value={config.data_management.backup_retention_days}
                        onChange={(e) => handleConfigChange('data_management', 'backup_retention_days', parseInt(e.target.value))}
                        disabled={!config.data_management.auto_backup_enabled}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.data_management.cleanup_old_data}
                            onChange={(e) => handleConfigChange('data_management', 'cleanup_old_data', e.target.checked)}
                          />
                        }
                        label="古いデータの自動削除を有効にする"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="データ保持期間（日数）"
                        type="number"
                        value={config.data_management.cleanup_threshold_days}
                        onChange={(e) => handleConfigChange('data_management', 'cleanup_threshold_days', parseInt(e.target.value))}
                        disabled={!config.data_management.cleanup_old_data}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleDataCleanup}
                        startIcon={<DeleteIcon />}
                      >
                        今すぐクリーンアップ
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* 業務設定 */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">業務設定</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="デフォルト税率（%）"
                        type="number"
                        value={config.business_settings.default_tax_rate}
                        onChange={(e) => handleConfigChange('business_settings', 'default_tax_rate', parseFloat(e.target.value))}
                        InputProps={{ endAdornment: '%' }}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="デフォルト掛け率"
                        type="number"
                        step="0.1"
                        value={config.business_settings.default_markup_rate}
                        onChange={(e) => handleConfigChange('business_settings', 'default_markup_rate', parseFloat(e.target.value))}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="見積有効期間（日数）"
                        type="number"
                        value={config.business_settings.estimate_valid_days}
                        onChange={(e) => handleConfigChange('business_settings', 'estimate_valid_days', parseInt(e.target.value))}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="請求書支払期限（日数）"
                        type="number"
                        value={config.business_settings.invoice_payment_terms}
                        onChange={(e) => handleConfigChange('business_settings', 'invoice_payment_terms', parseInt(e.target.value))}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.business_settings.auto_estimate_numbering}
                            onChange={(e) => handleConfigChange('business_settings', 'auto_estimate_numbering', e.target.checked)}
                          />
                        }
                        label="見積番号の自動採番"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.business_settings.show_cost_to_employees}
                            onChange={(e) => handleConfigChange('business_settings', 'show_cost_to_employees', e.target.checked)}
                          />
                        }
                        label="従業員に原価情報を表示する"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        ※ セキュリティ設定により、この設定は経営者権限でのみ変更可能です
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* バックアップダイアログ */}
      <Dialog 
        open={isBackupDialogOpen} 
        onClose={() => setIsBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>データベースバックアップ</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            システム全体のデータをバックアップします。処理中はシステムが一時的に重くなる場合があります。
          </Alert>
          
          <Typography variant="body2" gutterBottom>
            バックアップ対象:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="見積・請求書データ" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="顧客・単価マスタ" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="ユーザー・権限設定" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="システム設定" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsBackupDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleBackupNow}
            variant="contained"
            startIcon={<BackupIcon />}
          >
            バックアップ実行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemSettings;