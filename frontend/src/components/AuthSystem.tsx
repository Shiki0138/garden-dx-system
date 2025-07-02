import React, { useState, useContext, createContext, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Divider,
  Avatar
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  Business,
  Security,
  ExitToApp,
  Dashboard,
  Settings,
  Assignment,
  Receipt,
  AccountTree,
  Assessment
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// 認証コンテキスト
interface User {
  user_id: number;
  username: string;
  email: string;
  role: 'owner' | 'employee';
  company_id: number;
  full_name: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isLoading: boolean;
  refreshToken: () => Promise<boolean>;
  getSessionInfo: () => SessionInfo | null;
}

interface SessionInfo {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

const AuthContext = createContext<AuthContextType | null>(null);

// スタイル定義
const LoginContainer = styled(Container)(({ theme: _theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
}));

const LoginPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  maxWidth: 400,
  width: '100%',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
}));

const LogoBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(3),
}));

const RoleChip = styled(Chip)(({ theme: _theme, role }: { role: string }) => ({
  backgroundColor: role === 'owner' ? '#FF6B35' : '#4CAF50',
  color: 'white',
  fontWeight: 'bold',
}));

// 認証プロバイダー
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // ローカルストレージからトークン復元
    const savedToken = localStorage.getItem('garden_auth_token');
    const savedUser = localStorage.getItem('garden_user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('garden_auth_token');
        localStorage.removeItem('garden_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // 入力値検証
      if (!username.trim() || !password) {
        throw new Error('ユーザー名とパスワードを入力してください');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // レスポンスデータ検証
        if (!data.access_token || !data.user_id) {
          throw new Error('無効な認証レスポンスです');
        }
        
        const userData: User = {
          user_id: data.user_id,
          username: data.username || username.trim(),
          email: data.email || '',
          role: data.role,
          company_id: data.company_id || 1,
          full_name: data.full_name || username.trim(),
          permissions: data.permissions || []
        };

        // セッション情報設定
        const sessionData: SessionInfo = {
          sessionId: data.session_id || 'unknown',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (data.expires_in || 28800) * 1000),
          lastActivity: new Date()
        };

        setUser(userData);
        setToken(data.access_token);
        setSessionInfo(sessionData);
        setRetryCount(0);
        
        // セキュアストレージ保存
        try {
          localStorage.setItem('garden_auth_token', data.access_token);
          localStorage.setItem('garden_user', JSON.stringify(userData));
          localStorage.setItem('garden_session', JSON.stringify(sessionData));
          
          // リフレッシュトークンがある場合保存
          if (data.refresh_token) {
            localStorage.setItem('garden_refresh_token', data.refresh_token);
          }
        } catch (storageError) {
          // Storage error handled silently in production
        }
        
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.detail || `ログインに失敗しました (${response.status})`);
      }
    } catch (error) {
      // Login error handled by UI state
      
      // リトライロジック
      if (error instanceof TypeError && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        // Retry without logging
        await new Promise(resolve => setTimeout(resolve, 1000));
        return login(username, password);
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      // サーバーサイドログアウト
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(_error => {
          // Server logout error handled silently
        });
      }
    } catch (error) {
      // Logout error handled silently
    } finally {
      // クライアントサイドクリーンアップ
      setUser(null);
      setToken(null);
      setSessionInfo(null);
      setRetryCount(0);
      
      // ストレージクリーンアップ
      try {
        localStorage.removeItem('garden_auth_token');
        localStorage.removeItem('garden_user');
        localStorage.removeItem('garden_session');
        localStorage.removeItem('garden_refresh_token');
      } catch (storageError) {
        // Storage cleanup error handled silently
      }
      
      setLoading(false);
    }
  }, [token]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('garden_refresh_token');
      if (!refreshTokenValue) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue })
      });

      if (response.ok) {
        const data = await response.json();
        
        setToken(data.access_token);
        localStorage.setItem('garden_auth_token', data.access_token);
        
        // セッション情報更新
        if (sessionInfo) {
          const updatedSession = {
            ...sessionInfo,
            expiresAt: new Date(Date.now() + (data.expires_in || 28800) * 1000),
            lastActivity: new Date()
          };
          setSessionInfo(updatedSession);
          localStorage.setItem('garden_session', JSON.stringify(updatedSession));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      // Token refresh error handled by logout
      return false;
    }
  }, [sessionInfo]);

  const getSessionInfo = useCallback((): SessionInfo | null => {
    return sessionInfo;
  }, [sessionInfo]);

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const contextValue: AuthContextType = useMemo(() => ({
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    hasPermission,
    isOwner: user?.role === 'owner',
    isEmployee: user?.role === 'employee',
    isLoading: loading,
    refreshToken,
    getSessionInfo
  }), [user, token, login, logout, hasPermission, loading, refreshToken, getSessionInfo]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ログイン画面
export const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [_demoMode, _setDemoMode] = useState(false);
  
  const auth = useContext(AuthContext);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await auth?.login(username, password);
      if (!success) {
        setError('ユーザー名またはパスワードが正しくありません');
      }
    } catch (err) {
      setError('ログイン処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'owner' | 'employee') => {
    const demoCredentials = {
      owner: { username: 'owner', password: 'owner123' },
      employee: { username: 'employee1', password: 'emp123' }
    };

    setUsername(demoCredentials[role].username);
    setPassword(demoCredentials[role].password);
    
    setLoading(true);
    const success = await auth?.login(demoCredentials[role].username, demoCredentials[role].password);
    if (!success) {
      setError('デモログインに失敗しました');
    }
    setLoading(false);
  };

  return (
    <LoginContainer maxWidth={false}>
      <LoginPaper elevation={10}>
        <LogoBox>
          <Avatar sx={{ width: 80, height: 80, margin: '0 auto', bgcolor: '#2E7D32' }}>
            <Business sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mt: 2, color: '#2E7D32', fontWeight: 'bold' }}>
            Garden DX
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            造園業向け統合業務管理システム
          </Typography>
        </LogoBox>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="ユーザー名"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="パスワード"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !username || !password}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'ログイン'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>または</Divider>

        <Box>
          <Typography variant="subtitle2" align="center" gutterBottom>
            デモアカウント
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleDemoLogin('owner')}
                disabled={loading}
                startIcon={<Security />}
                sx={{ textTransform: 'none' }}
              >
                経営者デモ
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleDemoLogin('employee')}
                disabled={loading}
                startIcon={<Person />}
                sx={{ textTransform: 'none' }}
              >
                従業員デモ
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            © 2024 Garden DX. 史上最強の造園業DXシステム
          </Typography>
        </Box>
      </LoginPaper>
    </LoginContainer>
  );
};

// ユーザーメニュー
export const UserMenu: React.FC = () => {
  const [_anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [_sessionsOpen, _setSessionsOpen] = useState(false);
  
  const auth = useContext(AuthContext);
  
  if (!auth?.user) return null;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const _handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <RoleChip 
          role={auth.user.role}
          label={auth.user.role === 'owner' ? '経営者' : '従業員'}
          icon={auth.user.role === 'owner' ? <Security /> : <Person />}
        />
        
        <Button
          onClick={handleMenuClick}
          sx={{ color: 'white' }}
          startIcon={<Person />}
        >
          {auth.user.full_name || auth.user.username}
        </Button>
        
        <IconButton onClick={auth.logout} sx={{ color: 'white' }}>
          <ExitToApp />
        </IconButton>
      </Box>

      {/* プロフィールダイアログ */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ユーザープロフィール</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ユーザー名"
                  value={auth.user.username}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  value={auth.user.email}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="役割"
                  value={auth.user.role === 'owner' ? '経営者（親方）' : '従業員'}
                  disabled
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>権限一覧</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {auth.user.permissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={permission}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// 権限チェック付きコンポーネント
interface ProtectedComponentProps {
  permission?: string;
  role?: 'owner' | 'employee';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  role,
  children,
  fallback = null
}) => {
  const auth = useContext(AuthContext);

  if (!auth?.isAuthenticated) {
    return <>{fallback}</>;
  }

  if (role && auth.user?.role !== role) {
    return <>{fallback}</>;
  }

  if (permission && !auth.hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// メインレイアウト
export const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);

  if (!auth?.isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <Box sx={{ bgcolor: '#2E7D32', color: 'white', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            Garden DX
          </Typography>
          <UserMenu />
        </Box>
      </Box>

      {/* ナビゲーション */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', p: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Dashboard />}>ダッシュボード</Button>
          <Button startIcon={<Assignment />}>見積</Button>
          <Button startIcon={<Receipt />}>請求書</Button>
          <Button startIcon={<AccountTree />}>プロジェクト</Button>
          
          <ProtectedComponent permission="dashboard:profit">
            <Button startIcon={<Assessment />}>収益分析</Button>
          </ProtectedComponent>
          
          <ProtectedComponent role="owner">
            <Button startIcon={<Settings />}>設定</Button>
          </ProtectedComponent>
        </Box>
      </Box>

      {/* メインコンテンツ */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
};

// 認証フック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;