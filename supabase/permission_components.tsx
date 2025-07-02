/**
 * Garden DX - 権限別アクセス制御React Components
 * 見積・請求書等の権限別アクセス制御UI実装
 */

import React, { ReactNode } from 'react'
import { useAuth, PermissionGuard } from './auth_hooks'
import { ErrorCodes, ErrorMessages } from './error_handling'
import { Alert, Button, Card, Skeleton } from '@mui/material'
import { Lock, Warning, Error as ErrorIcon } from '@mui/icons-material'

/**
 * エラー表示コンポーネント
 */
export const PermissionError: React.FC<{
  message?: string
  resource?: string
  operation?: string
}> = ({ message, resource, operation }) => {
  const defaultMessage = resource && operation
    ? `${resource}の${operation}権限がありません`
    : '権限が不足しています'
  
  return (
    <Alert 
      severity="error" 
      icon={<Lock />}
      sx={{ my: 2 }}
    >
      {message || defaultMessage}
    </Alert>
  )
}

/**
 * 権限チェックローディング
 */
export const PermissionLoading: React.FC = () => {
  return (
    <Card sx={{ p: 3, my: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
    </Card>
  )
}

/**
 * 見積書権限コンポーネント
 */
export const EstimatePermissionGuard: React.FC<{
  operation: 'view' | 'create' | 'edit' | 'delete' | 'approve'
  estimateId?: string
  children: ReactNode
  fallback?: ReactNode
}> = ({ operation, estimateId, children, fallback }) => {
  const { hasPermission, hasRole, user } = useAuth()
  
  // 操作別権限マッピング
  const operationToPermission = {
    view: 'SELECT',
    create: 'INSERT',
    edit: 'UPDATE',
    delete: 'DELETE',
    approve: 'UPDATE',
  }
  
  // 承認権限は管理者のみ
  if (operation === 'approve' && !hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="見積承認は管理者のみ実行できます" />
  }
  
  // 削除権限は管理者のみ
  if (operation === 'delete' && !hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="見積削除は管理者のみ実行できます" />
  }
  
  return (
    <PermissionGuard
      resource="estimates"
      operation={operationToPermission[operation]}
      fallback={fallback || <PermissionError resource="見積書" operation={operation} />}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 請求書権限コンポーネント
 */
export const InvoicePermissionGuard: React.FC<{
  operation: 'view' | 'create' | 'edit' | 'delete' | 'payment'
  invoiceId?: string
  children: ReactNode
  fallback?: ReactNode
}> = ({ operation, invoiceId, children, fallback }) => {
  const { hasPermission, hasRole } = useAuth()
  
  // 請求書作成・編集・削除は管理者のみ
  if (operation !== 'view' && !hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="請求書の操作は管理者のみ実行できます" />
  }
  
  const operationToPermission = {
    view: 'SELECT',
    create: 'INSERT',
    edit: 'UPDATE',
    delete: 'DELETE',
    payment: 'UPDATE',
  }
  
  return (
    <PermissionGuard
      resource="invoices"
      operation={operationToPermission[operation]}
      fallback={fallback || <PermissionError resource="請求書" operation={operation} />}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 価格マスタ権限コンポーネント
 */
export const PriceMasterPermissionGuard: React.FC<{
  operation: 'view' | 'create' | 'edit' | 'delete'
  children: ReactNode
  fallback?: ReactNode
}> = ({ operation, children, fallback }) => {
  const { hasRole } = useAuth()
  
  // 価格マスタ編集は管理者のみ
  if (operation !== 'view' && !hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="価格マスタの編集は管理者のみ実行できます" />
  }
  
  const operationToPermission = {
    view: 'SELECT',
    create: 'INSERT',
    edit: 'UPDATE',
    delete: 'DELETE',
  }
  
  return (
    <PermissionGuard
      resource="price_master"
      operation={operationToPermission[operation]}
      fallback={fallback || <PermissionError resource="価格マスタ" operation={operation} />}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * ユーザー管理権限コンポーネント
 */
export const UserManagementGuard: React.FC<{
  operation: 'view' | 'create' | 'edit' | 'delete' | 'change_role'
  userId?: string
  children: ReactNode
  fallback?: ReactNode
}> = ({ operation, userId, children, fallback }) => {
  const { hasRole, user } = useAuth()
  
  // ユーザー管理は管理者のみ
  if (!hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="ユーザー管理は管理者のみアクセスできます" />
  }
  
  // 役割変更はオーナーのみ
  if (operation === 'change_role' && !hasRole('owner')) {
    return fallback || <PermissionError message="役割変更はオーナーのみ実行できます" />
  }
  
  // 自分自身の削除は不可
  if (operation === 'delete' && userId === user?.id) {
    return fallback || <PermissionError message="自分自身のアカウントは削除できません" />
  }
  
  return <>{children}</>
}

/**
 * レポート権限コンポーネント
 */
export const ReportPermissionGuard: React.FC<{
  reportType: 'sales' | 'profit' | 'customer' | 'project'
  children: ReactNode
  fallback?: ReactNode
}> = ({ reportType, children, fallback }) => {
  const { hasRole } = useAuth()
  
  // 売上・利益レポートは管理者のみ
  if (['sales', 'profit'].includes(reportType) && !hasRole(['owner', 'manager'])) {
    return fallback || <PermissionError message="売上・利益レポートは管理者のみ閲覧できます" />
  }
  
  return (
    <PermissionGuard
      resource="reports"
      operation="SELECT"
      fallback={fallback || <PermissionError resource="レポート" operation="閲覧" />}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 権限別アクションボタン
 */
export const PermissionActionButton: React.FC<{
  resource: string
  operation: string
  onClick: () => void
  label: string
  variant?: 'text' | 'outlined' | 'contained'
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  size?: 'small' | 'medium' | 'large'
  startIcon?: ReactNode
  disabled?: boolean
}> = ({ resource, operation, onClick, label, variant = 'contained', color = 'primary', size = 'medium', startIcon, disabled }) => {
  const { hasPermission, loading } = useAuth()
  
  const canPerform = hasPermission(resource, operation)
  
  if (loading) {
    return <Skeleton variant="rectangular" width={100} height={36} />
  }
  
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      startIcon={startIcon}
      onClick={onClick}
      disabled={disabled || !canPerform}
      title={!canPerform ? '権限が不足しています' : undefined}
    >
      {label}
    </Button>
  )
}

/**
 * 権限別メニューアイテム
 */
export const PermissionMenuItem: React.FC<{
  resource: string
  operation?: string
  role?: string | string[]
  children: ReactNode
}> = ({ resource, operation = 'SELECT', role, children }) => {
  const { hasPermission, hasRole } = useAuth()
  
  // 役割チェック
  if (role && !hasRole(role)) {
    return null
  }
  
  // 権限チェック
  if (!hasPermission(resource, operation)) {
    return null
  }
  
  return <>{children}</>
}

/**
 * セキュリティ警告バナー
 */
export const SecurityWarningBanner: React.FC<{
  type: 'permission' | 'session' | 'security'
  message?: string
  onAction?: () => void
  actionLabel?: string
}> = ({ type, message, onAction, actionLabel }) => {
  const getDefaultMessage = () => {
    switch (type) {
      case 'permission':
        return '一部の機能へのアクセスが制限されています'
      case 'session':
        return 'まもなくセッションの有効期限が切れます'
      case 'security':
        return 'セキュリティ上の理由により、この操作は制限されています'
      default:
        return '注意が必要です'
    }
  }
  
  return (
    <Alert
      severity="warning"
      icon={<Warning />}
      action={
        onAction && (
          <Button color="inherit" size="small" onClick={onAction}>
            {actionLabel || '対処する'}
          </Button>
        )
      }
      sx={{ mb: 2 }}
    >
      {message || getDefaultMessage()}
    </Alert>
  )
}

/**
 * 権限エラー境界
 */
export class PermissionErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Permission Error Boundary:', error, errorInfo)
    
    // エラーログ送信
    if (error.message?.includes('Permission denied')) {
      // 権限エラーのログ
      console.error('Permission error caught:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      })
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert severity="error" icon={<ErrorIcon />}>
          権限エラーが発生しました。管理者にお問い合わせください。
        </Alert>
      )
    }
    
    return this.props.children
  }
}

/**
 * 使用例
 */
export const ExampleUsage: React.FC = () => {
  return (
    <div>
      {/* 見積書作成ボタン（権限チェック付き） */}
      <EstimatePermissionGuard operation="create">
        <Button variant="contained" color="primary">
          新規見積作成
        </Button>
      </EstimatePermissionGuard>
      
      {/* 請求書一覧（閲覧権限チェック） */}
      <InvoicePermissionGuard operation="view">
        <div>請求書一覧がここに表示されます</div>
      </InvoicePermissionGuard>
      
      {/* 管理者メニュー */}
      <PermissionMenuItem resource="users" role={['owner', 'manager']}>
        <Button>ユーザー管理</Button>
      </PermissionMenuItem>
      
      {/* 権限別アクションボタン */}
      <PermissionActionButton
        resource="estimates"
        operation="UPDATE"
        onClick={() => console.log('Edit clicked')}
        label="編集"
        startIcon={<Lock />}
      />
    </div>
  )
}