/**
 * Garden Landscaping Application - 造園業務管理システム
 * メインアプリケーションコンポーネント
 * 
 * Created by: worker2 (Version Up - Process Management)
 * Date: 2025-07-01
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Tooltip,
  Snackbar,
  Alert,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';

import {
  Menu as MenuIcon,
  Notifications as NotificationIcon,
  AccountCircle as AccountIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  Nature as PlantIcon
} from '@mui/icons-material';

// コンポーネントのインポート
import LandscapingMainMenu from './TopPage/LandscapingMainMenu';
import ProcessScheduleManager from './ProcessManagement/ProcessScheduleManager';
import MobileProcessManager from './ProcessManagement/MobileProcessManager';

// 造園業向けカスタムテーマ
const landscapingTheme = createTheme({
  palette: {
    primary: {
      main: '#4CAF50', // 緑色メイン
      light: '#81C784',
      dark: '#2E7D32',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#8BC34A', // ライムグリーン
      light: '#AED581',
      dark: '#689F38',
      contrastText: '#ffffff'
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#2E7D32'
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00'
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
      dark: '#C62828'
    },
    background: {
      default: '#F1F8E9', // 薄い緑色の背景
      paper: '#FFFFFF'
    },
    text: {
      primary: '#1B5E20',
      secondary: '#2E7D32'
    }
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#1B5E20'
    },
    h2: {
      fontWeight: 600,
      color: '#1B5E20'
    },
    h3: {
      fontWeight: 600,
      color: '#1B5E20'
    },
    h4: {
      fontWeight: 500,
      color: '#2E7D32'
    },
    h5: {
      fontWeight: 500,
      color: '#2E7D32'
    },
    h6: {
      fontWeight: 500,
      color: '#2E7D32'
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(46, 125, 50, 0.1)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500
        },
        contained: {
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

// アプリケーションの状態管理
interface AppState {
  currentView: string;
  user: {
    name: string;
    role: string;
    company: string;
    avatar?: string;
  };
  notifications: number;
}

const LandscapingApp: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentView: 'main-menu',
    user: {
      name: '山田太郎',
      role: '代表取締役',
      company: '緑風造園株式会社'
    },
    notifications: 3
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // メニュー選択ハンドラー
  const handleMenuSelect = (menuId: string, route: string) => {
    setState(prev => ({ ...prev, currentView: menuId }));
    setNotificationMessage(`${getMenuTitle(menuId)}を開きました`);
    setShowNotification(true);
  };

  // ホームに戻る
  const handleGoHome = () => {
    setState(prev => ({ ...prev, currentView: 'main-menu' }));
  };

  // ユーザーメニュー
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  // メニューIDからタイトルを取得
  const getMenuTitle = (menuId: string): string => {
    const titles: { [key: string]: string } = {
      'estimate': '見積書作成',
      'price-master': '単価マスター',
      'project-history': '案件履歴',
      'settings': '設定',
      'process-management': '工程管理'
    };
    return titles[menuId] || 'メニュー';
  };

  // モバイル検出
  const isMobile = useMediaQuery(landscapingTheme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width:375px)');
  
  // モバイルドロワー状態
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileBottomNavValue, setMobileBottomNavValue] = useState(0);

  // 現在のビューに応じたコンポーネントをレンダリング
  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'main-menu':
        return (
          <LandscapingMainMenu
            onMenuSelect={handleMenuSelect}
            currentUser={state.user}
          />
        );
      
      case 'process-management':
        // モバイルでは専用コンポーネントを使用
        return isMobile ? (
          <MobileProcessManager
            onScheduleCreated={(schedule) => {
              setNotificationMessage('工程表が作成されました');
              setShowNotification(true);
            }}
            onScheduleUpdated={(schedule) => {
              setNotificationMessage('工程表が更新されました');
              setShowNotification(true);
            }}
          />
        ) : (
          <ProcessScheduleManager
            onScheduleCreated={(schedule) => {
              setNotificationMessage('工程表が作成されました');
              setShowNotification(true);
            }}
            onScheduleUpdated={(schedule) => {
              setNotificationMessage('工程表が更新されました');
              setShowNotification(true);
            }}
          />
        );
      
      case 'estimate':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              見積書作成ウィザード
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Worker1で実装中の見積書作成ウィザードがここに表示されます
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open('/wizard', '_blank')}
              sx={{ mt: 2 }}
            >
              見積ウィザードを開く
            </Button>
          </Box>
        );
      
      case 'price-master':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              単価マスター管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Worker5で実装中の単価マスター機能がここに表示されます
            </Typography>
          </Box>
        );
      
      case 'project-history':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              案件履歴管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Worker3で実装中の案件履歴機能がここに表示されます
            </Typography>
          </Box>
        );
      
      case 'settings':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              設定・事業者情報管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Worker4で実装中の設定機能がここに表示されます
            </Typography>
          </Box>
        );
      
      default:
        return (
          <LandscapingMainMenu
            onMenuSelect={handleMenuSelect}
            currentUser={state.user}
          />
        );
    }
  };

  // モバイルメニュー項目
  const mobileMenuItems = [
    { id: 'main-menu', label: 'ホーム', icon: HomeIcon },
    { id: 'estimate', label: '見積', icon: () => null },
    { id: 'process-management', label: '工程', icon: () => null },
    { id: 'settings', label: '設定', icon: () => null }
  ];

  return (
    <ThemeProvider theme={landscapingTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* アプリバー */}
        <AppBar position="static" elevation={2}>
          <Toolbar>
            {/* モバイルメニューボタン */}
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <PlantIcon sx={{ mr: 2, fontSize: isMobile ? 24 : 32 }} />
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 'bold',
                fontSize: isMobile ? '1rem' : undefined
              }}
            >
              {isMobile ? 'Garden' : 'Garden 造園業務管理システム'}
            </Typography>
            
            {/* デスクトップ用ナビゲーション */}
            {!isMobile && (
              <>
                {/* ホームボタン */}
                {state.currentView !== 'main-menu' && (
                  <Tooltip title="ホームに戻る">
                    <IconButton
                      color="inherit"
                      onClick={handleGoHome}
                      sx={{ mr: 1 }}
                    >
                      <HomeIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {/* 通知 */}
                <Tooltip title="通知">
                  <IconButton color="inherit" sx={{ mr: 1 }}>
                    <Badge badgeContent={state.notifications} color="error">
                      <NotificationIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                {/* ユーザーメニュー */}
                <Tooltip title="ユーザーメニュー">
                  <IconButton
                    color="inherit"
                    onClick={handleUserMenuOpen}
                    sx={{ ml: 1 }}
                  >
                    <Avatar
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: 'secondary.main',
                        fontSize: '0.9rem'
                      }}
                    >
                      {state.user.name.charAt(0)}
                    </Avatar>
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            {/* モバイル用ユーザーアバター */}
            {isMobile && (
              <Avatar
                sx={{ 
                  width: 28, 
                  height: 28, 
                  bgcolor: 'secondary.main',
                  fontSize: '0.8rem'
                }}
              >
                {state.user.name.charAt(0)}
              </Avatar>
            )}
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleUserMenuClose}>
                <AccountIcon sx={{ mr: 1 }} />
                プロフィール
              </MenuItem>
              <MenuItem onClick={handleUserMenuClose}>
                <LogoutIcon sx={{ mr: 1 }} />
                ログアウト
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* パンくずナビ（デスクトップのみ） */}
        {!isMobile && state.currentView !== 'main-menu' && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              px: 3,
              py: 1
            }}
          >
            <Typography variant="h6" color="primary.main">
              {getMenuTitle(state.currentView)}
            </Typography>
          </Box>
        )}

        {/* メインコンテンツエリア */}
        <Box sx={{ 
          flex: 1, 
          bgcolor: 'background.default',
          pb: isMobile ? 7 : 0 // モバイルでボトムナビ分のマージン
        }}>
          {renderCurrentView()}
        </Box>

        {/* モバイルドロワーメニュー */}
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: { width: 280 }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: 'primary.main'
                }}
              >
                {state.user.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {state.user.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {state.user.role}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </Box>
          
          <List>
            <ListItem 
              button 
              onClick={() => {
                handleGoHome();
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="ホーム" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                handleMenuSelect('estimate', '/estimate');
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <PlantIcon />
              </ListItemIcon>
              <ListItemText primary="見積書作成" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                handleMenuSelect('process-management', '/process-management');
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <TimelineIcon />
              </ListItemIcon>
              <ListItemText primary="工程管理" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                handleMenuSelect('price-master', '/price-master');
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <AccountIcon />
              </ListItemIcon>
              <ListItemText primary="単価マスター" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                handleMenuSelect('settings', '/settings');
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="設定" />
            </ListItem>
          </List>
        </Drawer>

        {/* フッター */}
        <Box
          component="footer"
          sx={{
            bgcolor: 'primary.dark',
            color: 'white',
            py: 2,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2">
            © 2025 {state.user.company} - Garden 造園業務管理システム
          </Typography>
        </Box>

        {/* モバイルボトムナビゲーション */}
        {isMobile && (
          <BottomNavigation
            value={mobileBottomNavValue}
            onChange={(event, newValue) => {
              setMobileBottomNavValue(newValue);
              switch (newValue) {
                case 0:
                  handleGoHome();
                  break;
                case 1:
                  handleMenuSelect('estimate', '/estimate');
                  break;
                case 2:
                  handleMenuSelect('process-management', '/process-management');
                  break;
                case 3:
                  setMobileDrawerOpen(true);
                  break;
              }
            }}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <BottomNavigationAction
              label="ホーム"
              icon={<HomeIcon />}
            />
            <BottomNavigationAction
              label="見積"
              icon={<CalendarIcon />}
            />
            <BottomNavigationAction
              label="工程"
              icon={<TimelineIcon />}
            />
            <BottomNavigationAction
              label="メニュー"
              icon={<MenuIcon />}
            />
          </BottomNavigation>
        )}

        {/* 通知スナックバー */}
        <Snackbar
          open={showNotification}
          autoHideDuration={3000}
          onClose={() => setShowNotification(false)}
          anchorOrigin={{ 
            vertical: isMobile ? 'top' : 'bottom', 
            horizontal: isMobile ? 'center' : 'right' 
          }}
          sx={{
            mt: isMobile ? 8 : 0,
            mb: isMobile ? 8 : 0
          }}
        >
          <Alert
            onClose={() => setShowNotification(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            {notificationMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default LandscapingApp;