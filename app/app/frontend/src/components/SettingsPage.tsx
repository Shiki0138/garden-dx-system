/**
 * 設定画面メインページ - 造園事業者向け統合設定管理
 * 企業情報・ユーザー管理・システム設定の統合UI
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  IconButton,
  Fab,
  Tooltip,
  Alert,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Print as PrintIcon,
  CloudUpload as CloudUploadIcon,
  Notifications as NotificationsIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

// 設定コンポーネント
import CompanyInfoSettings from './settings/CompanyInfoSettings';
import UserManagementSettings from './settings/UserManagementSettings';
import SystemSettings from './settings/SystemSettings';
import SecuritySettings from './settings/SecuritySettings';
import PrintTemplateSettings from './settings/PrintTemplateSettings';
import NotificationSettings from './settings/NotificationSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        '未保存の変更があります。このタブを離れてもよろしいですか？'
      );
      if (!confirmLeave) return;
    }
    setActiveTab(newValue);
    setHasUnsavedChanges(false);
  };

  const handleSaveAll = async () => {
    try {
      // TODO: 全設定の保存API呼び出し
      setSaveStatus('success');
      setHasUnsavedChanges(false);
    } catch (error) {
      setSaveStatus('error');
    }
  };

  const settingsTabs = [
    {
      label: '会社情報',
      icon: <BusinessIcon />,
      component: <CompanyInfoSettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: '事業者基本情報・印章・ロゴ設定'
    },
    {
      label: 'ユーザー管理',
      icon: <PeopleIcon />,
      component: <UserManagementSettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: '従業員アカウント・権限管理'
    },
    {
      label: 'セキュリティ',
      icon: <SecurityIcon />,
      component: <SecuritySettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: '認証設定・パスワードポリシー'
    },
    {
      label: 'システム設定',
      icon: <SettingsIcon />,
      component: <SystemSettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: 'アプリケーション設定・データ管理'
    },
    {
      label: '帳票テンプレート',
      icon: <PrintIcon />,
      component: <PrintTemplateSettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: '見積書・請求書テンプレート設定'
    },
    {
      label: '通知設定',
      icon: <NotificationsIcon />,
      component: <NotificationSettings onChanged={() => setHasUnsavedChanges(true)} />,
      description: 'メール通知・アラート設定'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* パンくずリスト */}
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ mb: 3 }}
        separator={<NavigateNextIcon fontSize="small" />}
      >
        <Link 
          color="inherit" 
          href="/" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          ホーム
        </Link>
        <Typography 
          color="text.primary"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <SettingsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          システム設定
        </Typography>
      </Breadcrumbs>

      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          システム設定
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          造園業務に最適化された設定管理システム
        </Typography>
        
        {/* ステータス表示 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {hasUnsavedChanges && (
            <Chip 
              label="未保存の変更あり" 
              color="warning" 
              variant="outlined"
              size="small"
            />
          )}
          {saveStatus === 'success' && (
            <Alert severity="success" sx={{ py: 0 }}>
              設定が正常に保存されました
            </Alert>
          )}
          {saveStatus === 'error' && (
            <Alert severity="error" sx={{ py: 0 }}>
              設定の保存に失敗しました
            </Alert>
          )}
        </Box>
      </Box>

      {/* 設定タブ */}
      <Paper elevation={2} sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="設定タブ"
            sx={{ 
              '& .MuiTab-root': {
                minHeight: 72,
                py: 2
              }
            }}
          >
            {settingsTabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {tab.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tab.description}
                    </Typography>
                  </Box>
                }
                {...a11yProps(index)}
                sx={{ 
                  alignItems: 'flex-start',
                  textTransform: 'none',
                  '& .MuiSvgIcon-root': {
                    mb: 1
                  }
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* タブコンテンツ */}
        {settingsTabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Paper>

      {/* 保存ボタン */}
      {hasUnsavedChanges && (
        <Tooltip title="全ての変更を保存">
          <Fab
            color="primary"
            onClick={handleSaveAll}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: 'success.main',
              '&:hover': {
                bgcolor: 'success.dark'
              }
            }}
          >
            <SaveIcon />
          </Fab>
        </Tooltip>
      )}
    </Container>
  );
};

export default SettingsPage;