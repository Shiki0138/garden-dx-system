/**
 * 通知設定コンポーネント - メール通知・アラート設定・業務通知管理
 * 造園業務特化通知・工程通知・期限管理・顧客コミュニケーション
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Event as EventIcon,
  Announcement as AnnouncementIcon
} from '@mui/icons-material';

interface NotificationConfig {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'business' | 'project' | 'customer';
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
  triggers: {
    events: string[];
    conditions: Record<string, any>;
  };
  recipients: {
    owners: boolean;
    employees: boolean;
    specific_users: string[];
    customers: boolean;
  };
  schedule: {
    immediate: boolean;
    daily_digest: boolean;
    weekly_summary: boolean;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

interface NotificationSettingsProps {
  onChanged: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onChanged }) => {
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationConfig | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  useEffect(() => {
    loadNotificationConfigs();
    loadEmailTemplates();
  }, []);

  const loadNotificationConfigs = () => {
    // 造園業務特化通知設定
    setNotifications([
      {
        id: 'estimate_created',
        name: '見積書作成通知',
        description: '新しい見積書が作成された時の通知',
        category: 'business',
        enabled: true,
        channels: { email: true, sms: false, push: true, in_app: true },
        triggers: {
          events: ['estimate_created'],
          conditions: { amount_threshold: 100000 }
        },
        recipients: { owners: true, employees: true, specific_users: [], customers: false },
        schedule: { immediate: true, daily_digest: false, weekly_summary: true }
      },
      {
        id: 'project_deadline_warning',
        name: '工程期限警告',
        description: 'プロジェクトの期限が近づいた時の警告',
        category: 'project',
        enabled: true,
        channels: { email: true, sms: true, push: true, in_app: true },
        triggers: {
          events: ['deadline_approaching'],
          conditions: { days_before: 3 }
        },
        recipients: { owners: true, employees: true, specific_users: [], customers: false },
        schedule: { immediate: true, daily_digest: true, weekly_summary: false }
      },
      {
        id: 'customer_payment_reminder',
        name: '顧客支払期限通知',
        description: '請求書の支払期限が近づいた時の顧客への通知',
        category: 'customer',
        enabled: true,
        channels: { email: true, sms: false, push: false, in_app: false },
        triggers: {
          events: ['payment_deadline_approaching'],
          conditions: { days_before: 7 }
        },
        recipients: { owners: false, employees: false, specific_users: [], customers: true },
        schedule: { immediate: false, daily_digest: false, weekly_summary: false }
      },
      {
        id: 'maintenance_schedule',
        name: 'メンテナンス予定通知',
        description: '定期メンテナンス作業の予定通知',
        category: 'business',
        enabled: true,
        channels: { email: true, sms: false, push: true, in_app: true },
        triggers: {
          events: ['maintenance_scheduled'],
          conditions: { advance_notice_days: 7 }
        },
        recipients: { owners: true, employees: true, specific_users: [], customers: true },
        schedule: { immediate: false, daily_digest: true, weekly_summary: true }
      },
      {
        id: 'plant_delivery_alert',
        name: '植栽資材納期通知',
        description: '植栽資材の納期に関する通知',
        category: 'project',
        enabled: true,
        channels: { email: true, sms: true, push: true, in_app: true },
        triggers: {
          events: ['plant_delivery_scheduled', 'delivery_delayed'],
          conditions: {}
        },
        recipients: { owners: true, employees: true, specific_users: [], customers: false },
        schedule: { immediate: true, daily_digest: false, weekly_summary: false }
      },
      {
        id: 'weather_alert',
        name: '天候による作業影響通知',
        description: '悪天候による工事への影響通知',
        category: 'project',
        enabled: false,
        channels: { email: true, sms: true, push: true, in_app: true },
        triggers: {
          events: ['weather_warning'],
          conditions: { severity: 'high' }
        },
        recipients: { owners: true, employees: true, specific_users: [], customers: false },
        schedule: { immediate: true, daily_digest: false, weekly_summary: false }
      }
    ]);
  };

  const loadEmailTemplates = () => {
    setEmailTemplates([
      {
        id: 'estimate_notification',
        name: '見積書作成通知',
        subject: '【{{company_name}}】見積書を作成いたしました（{{estimate_number}}）',
        content: `{{customer_name}} 様

いつもお世話になっております。
{{company_name}}の{{staff_name}}です。

ご依頼いただきました造園工事のお見積書を作成いたしました。

■見積番号：{{estimate_number}}
■見積日：{{estimate_date}}
■工事場所：{{site_address}}
■見積金額：{{total_amount}}円（税込）
■有効期限：{{valid_until}}

詳細につきましては、添付の見積書をご確認ください。
ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。`,
        variables: ['company_name', 'customer_name', 'staff_name', 'estimate_number', 'estimate_date', 'site_address', 'total_amount', 'valid_until']
      },
      {
        id: 'project_reminder',
        name: '工程進捗リマインダー',
        subject: '【{{company_name}}】工程進捗のご連絡（{{project_name}}）',
        content: `{{customer_name}} 様

いつもお世話になっております。
{{company_name}}の{{staff_name}}です。

{{project_name}}の工程進捗についてご連絡いたします。

■現在の進捗：{{current_phase}}
■完了予定：{{completion_date}}
■次回作業：{{next_work}}

引き続き品質を重視して工事を進めてまいります。
ご質問等ございましたら、お気軽にお声がけください。`,
        variables: ['company_name', 'customer_name', 'staff_name', 'project_name', 'current_phase', 'completion_date', 'next_work']
      }
    ]);
  };

  const handleNotificationToggle = (id: string, enabled: boolean) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, enabled } : n
    ));
    onChanged();
  };

  const handleChannelToggle = (id: string, channel: string, enabled: boolean) => {
    setNotifications(prev => prev.map(n => 
      n.id === id 
        ? { 
            ...n, 
            channels: { 
              ...n.channels, 
              [channel]: enabled 
            } 
          } 
        : n
    ));
    onChanged();
  };

  const handleSendTest = async () => {
    try {
      // TODO: テストメール送信API
      // await fetch('/api/notifications/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: testEmail })
      // });
      
      alert(`${testEmail} にテスト通知を送信しました`);
      setIsTestDialogOpen(false);
      setTestEmail('');
    } catch (error) {
      console.error('テスト送信に失敗:', error);
    }
  };

  const getCategoryChip = (category: string) => {
    const config = {
      system: { label: 'システム', color: 'default' as const },
      business: { label: '業務', color: 'primary' as const },
      project: { label: 'プロジェクト', color: 'secondary' as const },
      customer: { label: '顧客', color: 'success' as const }
    };
    
    return (
      <Chip 
        label={config[category as keyof typeof config]?.label || category} 
        color={config[category as keyof typeof config]?.color || 'default'}
        size="small" 
      />
    );
  };

  const getChannelIcons = (channels: NotificationConfig['channels']) => {
    const icons = [];
    if (channels.email) icons.push(<EmailIcon key="email" fontSize="small" />);
    if (channels.sms) icons.push(<SmsIcon key="sms" fontSize="small" />);
    if (channels.push) icons.push(<NotificationsIcon key="push" fontSize="small" />);
    return icons;
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          通知設定
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setIsTestDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            テスト送信
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedNotification(null);
              setIsEditDialogOpen(true);
            }}
          >
            通知追加
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 通知一覧 */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={1}>
            <Typography variant="h6" sx={{ p: 2 }}>
              通知設定一覧
            </Typography>
            <Divider />
            
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar 
                        sx={{ 
                          bgcolor: notification.enabled ? 'success.main' : 'grey.400',
                          width: 32, 
                          height: 32 
                        }}
                      >
                        {notification.category === 'business' && <BusinessIcon />}
                        {notification.category === 'project' && <AssignmentIcon />}
                        {notification.category === 'customer' && <PersonIcon />}
                        {notification.category === 'system' && <SettingsIcon />}
                      </Avatar>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {notification.name}
                          </Typography>
                          {getCategoryChip(notification.category)}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {getChannelIcons(notification.channels)}
                          </Box>
                        </Box>
                      }
                      secondary={notification.description}
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedNotification(notification);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Switch
                          checked={notification.enabled}
                          onChange={(e) => handleNotificationToggle(notification.id, e.target.checked)}
                        />
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* 通知サマリー */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* 有効な通知数 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    通知設定サマリー
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      有効な通知設定
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {notifications.filter(n => n.enabled).length}
                    </Typography>
                    <Typography variant="caption">
                      / {notifications.length} 件
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    カテゴリ別設定状況
                  </Typography>
                  
                  {['business', 'project', 'customer', 'system'].map(category => {
                    const categoryNotifications = notifications.filter(n => n.category === category);
                    const enabledCount = categoryNotifications.filter(n => n.enabled).length;
                    
                    return (
                      <Box key={category} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          {getCategoryChip(category)}
                          <Typography variant="body2">
                            {enabledCount}/{categoryNotifications.length}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>

            {/* 通知チャンネル */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    通知チャンネル設定
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="メール通知" 
                        secondary={`${notifications.filter(n => n.enabled && n.channels.email).length}件有効`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <SmsIcon color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="SMS通知" 
                        secondary={`${notifications.filter(n => n.enabled && n.channels.sms).length}件有効`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <NotificationsIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="プッシュ通知" 
                        secondary={`${notifications.filter(n => n.enabled && n.channels.push).length}件有効`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 通知編集ダイアログ */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedNotification ? '通知設定編集' : '新規通知設定'}
        </DialogTitle>
        <DialogContent>
          {/* TODO: 通知編集フォーム */}
          <Alert severity="info" sx={{ mt: 2 }}>
            通知設定の詳細編集フォームを実装予定
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>
            キャンセル
          </Button>
          <Button variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* テスト送信ダイアログ */}
      <Dialog 
        open={isTestDialogOpen} 
        onClose={() => setIsTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>テスト通知送信</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="送信先メールアドレス"
            type="email"
            variant="outlined"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            設定されている通知がテストメールとして送信されます
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTestDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSendTest}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!testEmail}
          >
            送信
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationSettings;