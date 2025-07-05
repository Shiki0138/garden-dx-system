/**
 * 保護されたルートコンポーネント
 * 認証・権限チェック
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { Loader, Shield, AlertCircle } from 'lucide-react';

// スタイリング
const LoadingContainer = styled.div`
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const UnauthorizedContainer = styled.div`
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px;
  text-align: center;

  .icon {
    color: #dc2626;
  }

  h2 {
    color: #1f2937;
    margin: 0;
  }

  p {
    color: #6b7280;
    margin: 0;
    max-width: 500px;
  }
`;

const BackButton = styled.button`
  padding: 12px 24px;
  background: #1a472a;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #2d5a3d;
    transform: translateY(-2px);
  }
`;

const ProtectedRoute = ({ children, requireRole = null, requirePermission = null }) => {
  const location = useLocation();
  const { loading, isAuthenticated, hasRole, user, isConnected } = useSupabaseAuth();
  const { isDemoMode, demoUser } = useDemoMode();

  // デモモードの場合はローディングをスキップして即座に表示
  if (isDemoMode) {
    // デモモードでは権限チェックのみ実施
    if (requireRole && demoUser && demoUser.role !== requireRole && requireRole !== 'employee') {
      return (
        <UnauthorizedContainer>
          <Shield size={60} className="icon" />
          <h2>アクセス権限がありません（デモモード）</h2>
          <p>
            このページにアクセスするには「{requireRole}」権限が必要です。
            <br />
            現在のデモユーザー権限: {demoUser?.role || 'employee'}
          </p>
          <BackButton onClick={() => window.history.back()}>前のページに戻る</BackButton>
        </UnauthorizedContainer>
      );
    }
    // デモモードでは認証チェックをスキップ
    return children;
  }

  // ローディング中
  if (loading) {
    return (
      <LoadingContainer>
        <Loader size={40} className="spinner" />
        <p>認証状態を確認中...</p>
      </LoadingContainer>
    );
  }

  // 未認証の場合
  if (!isAuthenticated()) {
    // 本番環境では必ず認証を要求
    // ログインページにリダイレクト
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 権限チェック
  if (requireRole && !hasRole(requireRole)) {
    return (
      <UnauthorizedContainer>
        <Shield size={60} className="icon" />
        <h2>アクセス権限がありません</h2>
        <p>
          このページにアクセスするには「{requireRole}」権限が必要です。
          <br />
          現在のユーザー権限: {user?.user_metadata?.role || 'employee'}
        </p>
        <BackButton onClick={() => window.history.back()}>前のページに戻る</BackButton>
      </UnauthorizedContainer>
    );
  }

  // 特定の権限チェック（将来拡張用）
  if (requirePermission) {
    // TODO: 詳細な権限チェックロジックを実装
    const hasPermission = true; // プレースホルダー

    if (!hasPermission) {
      return (
        <UnauthorizedContainer>
          <AlertCircle size={60} className="icon" />
          <h2>機能へのアクセスが制限されています</h2>
          <p>
            この機能を使用するには追加の権限が必要です。
            <br />
            管理者にお問い合わせください。
          </p>
          <BackButton onClick={() => window.history.back()}>前のページに戻る</BackButton>
        </UnauthorizedContainer>
      );
    }
  }

  // 認証・権限チェック通過
  return children;
};

export default ProtectedRoute;
