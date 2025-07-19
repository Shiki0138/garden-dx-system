/**
 * ユーザー管理設定コンポーネント - 従業員アカウント・権限管理
 * RBAC統合・権限マトリックス・ユーザー招待機能
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Avatar,
  Menu,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  VpnKey as VpnKeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';

interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'owner' | 'employee';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  phone?: string;
  department?: string;
}

interface Permission {
  resource: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    admin: boolean;
  };
}

interface UserManagementSettingsProps {
  onChanged: () => void;
}

const UserManagementSettings: React.FC<UserManagementSettingsProps> = ({ onChanged }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    loadUsers();
    loadPermissions();
  }, []);

  const loadUsers = async () => {
    try {
      // TODO: API呼び出し
      // const response = await fetch('/api/users');
      // const data = await response.json();
      // setUsers(data);
      
      // デモデータ
      setUsers([
        {
          user_id: 1,
          username: 'owner',
          email: 'owner@green-garden.co.jp',
          full_name: '田中 太郎',
          role: 'owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2025-07-01T09:00:00Z',
          phone: '090-1234-5678',
          department: '経営陣'
        },
        {
          user_id: 2,
          username: 'yamada',
          email: 'yamada@green-garden.co.jp',
          full_name: '山田 花子',
          role: 'employee',
          is_active: true,
          created_at: '2024-02-01T00:00:00Z',
          last_login: '2025-06-30T17:30:00Z',
          phone: '090-2345-6789',
          department: '営業部'
        },
        {
          user_id: 3,
          username: 'suzuki',
          email: 'suzuki@green-garden.co.jp',
          full_name: '鈴木 次郎',
          role: 'employee',
          is_active: true,
          created_at: '2024-03-01T00:00:00Z',
          last_login: '2025-06-29T16:00:00Z',
          phone: '090-3456-7890',
          department: '施工部'
        }
      ]);
    } catch (error) {
      console.error('ユーザー情報の読み込みに失敗:', error);
    }
  };

  const loadPermissions = () => {
    // 造園業務システムの権限設定
    setPermissions([
      {
        resource: '見積管理',
        actions: { view: true, create: true, edit: true, delete: false, admin: false }
      },
      {
        resource: 'プロジェクト管理',
        actions: { view: true, create: true, edit: true, delete: false, admin: false }
      },
      {
        resource: '請求書管理',
        actions: { view: true, create: true, edit: false, delete: false, admin: false }
      },
      {
        resource: '顧客管理',
        actions: { view: true, create: true, edit: true, delete: false, admin: false }
      },
      {
        resource: '単価マスタ',
        actions: { view: true, create: false, edit: false, delete: false, admin: false }
      },
      {
        resource: 'レポート・分析',
        actions: { view: false, create: false, edit: false, delete: false, admin: false }
      },
      {
        resource: 'システム設定',
        actions: { view: false, create: false, edit: false, delete: false, admin: false }
      }
    ]);
  };

  const handleUserSave = async (userData: Partial<User>) => {
    try {
      // TODO: API呼び出し
      // if (selectedUser) {
      //   await fetch(`/api/users/${selectedUser.user_id}`, {
      //     method: 'PUT',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(userData)
      //   });
      // } else {
      //   await fetch('/api/users', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(userData)
      //   });
      // }

      await loadUsers();
      setIsUserDialogOpen(false);
      setSelectedUser(null);
      onChanged();
    } catch (error) {
      console.error('ユーザー保存に失敗:', error);
    }
  };

  const handleUserToggle = async (userId: number, isActive: boolean) => {
    try {
      // TODO: API呼び出し
      setUsers(prev => prev.map(user => 
        user.user_id === userId ? { ...user, is_active: isActive } : user
      ));
      onChanged();
    } catch (error) {
      console.error('ユーザーステータス変更に失敗:', error);
    }
  };

  const handleSendInvite = async () => {
    try {
      // TODO: 招待メール送信API
      // await fetch('/api/users/invite', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: inviteEmail })
      // });
      
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      alert(`${inviteEmail} に招待メールを送信しました`);
    } catch (error) {
      console.error('招待送信に失敗:', error);
    }
  };

  const getRoleChip = (role: string) => {
    if (role === 'owner') {
      return <Chip label="経営者" color="primary" size="small" />;
    }
    return <Chip label="従業員" color="default" size="small" />;
  };

  const getStatusChip = (isActive: boolean) => {
    return (
      <Chip 
        label={isActive ? '有効' : '無効'} 
        color={isActive ? 'success' : 'default'} 
        size="small" 
      />
    );
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          ユーザー管理
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setIsInviteDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            ユーザー招待
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedUser(null);
              setIsUserDialogOpen(true);
            }}
          >
            ユーザー追加
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ユーザー一覧 */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ユーザー</TableCell>
                    <TableCell>役職</TableCell>
                    <TableCell>部署</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>最終ログイン</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {user.full_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {user.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getRoleChip(user.role)}
                      </TableCell>
                      <TableCell>
                        {user.department || '-'}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={user.is_active}
                              onChange={(e) => handleUserToggle(user.user_id, e.target.checked)}
                              size="small"
                            />
                          }
                          label={getStatusChip(user.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        {user.last_login ? 
                          new Date(user.last_login).toLocaleDateString('ja-JP') : 
                          'なし'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="権限設定">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsPermissionDialogOpen(true);
                            }}
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsUserDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* 権限サマリー */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                権限設定サマリー
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  経営者権限
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="全機能アクセス" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="原価・利益情報閲覧" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="システム設定" />
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  従業員権限
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="見積・請求書作成" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CloseIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary="原価・利益情報" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CloseIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary="システム設定" />
                  </ListItem>
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ユーザー編集ダイアログ */}
      <Dialog 
        open={isUserDialogOpen} 
        onClose={() => setIsUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser ? 'ユーザー編集' : 'ユーザー追加'}
        </DialogTitle>
        <DialogContent>
          <UserEditForm 
            user={selectedUser} 
            onSave={handleUserSave}
            onCancel={() => setIsUserDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 権限設定ダイアログ */}
      <Dialog 
        open={isPermissionDialogOpen} 
        onClose={() => setIsPermissionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          権限設定 - {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent>
          <PermissionMatrix 
            permissions={permissions}
            userRole={selectedUser?.role || 'employee'}
            onChanged={onChanged}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPermissionDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 招待ダイアログ */}
      <Dialog 
        open={isInviteDialogOpen} 
        onClose={() => setIsInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ユーザー招待</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="メールアドレス"
            type="email"
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            招待メールが送信され、新規ユーザーは自分でアカウントを作成できます。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInviteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSendInvite}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!inviteEmail}
          >
            招待送信
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ユーザー編集フォーム
const UserEditForm: React.FC<{
  user: User | null;
  onSave: (data: Partial<User>) => void;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'employee',
    phone: user?.phone || '',
    department: user?.department || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ pt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="氏名"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="ユーザー名"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>役職</InputLabel>
            <Select
              value={formData.role}
              label="役職"
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'owner' | 'employee' }))}
            >
              <MenuItem value="employee">従業員</MenuItem>
              <MenuItem value="owner">経営者</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="メールアドレス"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="電話番号"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="部署"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" variant="contained">
          保存
        </Button>
      </Box>
    </Box>
  );
};

// 権限マトリックス
const PermissionMatrix: React.FC<{
  permissions: Permission[];
  userRole: string;
  onChanged: () => void;
}> = ({ permissions, userRole, onChanged }) => {
  const isOwner = userRole === 'owner';

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>機能</TableCell>
            <TableCell align="center">閲覧</TableCell>
            <TableCell align="center">作成</TableCell>
            <TableCell align="center">編集</TableCell>
            <TableCell align="center">削除</TableCell>
            <TableCell align="center">管理</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {permissions.map((permission, index) => (
            <TableRow key={index}>
              <TableCell component="th" scope="row">
                {permission.resource}
              </TableCell>
              <TableCell align="center">
                <CheckIcon color={permission.actions.view ? 'success' : 'disabled'} />
              </TableCell>
              <TableCell align="center">
                <CheckIcon color={permission.actions.create ? 'success' : 'disabled'} />
              </TableCell>
              <TableCell align="center">
                <CheckIcon color={permission.actions.edit ? 'success' : 'disabled'} />
              </TableCell>
              <TableCell align="center">
                <CheckIcon color={permission.actions.delete ? 'success' : 'disabled'} />
              </TableCell>
              <TableCell align="center">
                <CheckIcon color={permission.actions.admin ? 'success' : 'disabled'} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserManagementSettings;