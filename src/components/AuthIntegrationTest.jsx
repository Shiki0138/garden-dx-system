/**
 * Garden 造園業向け統合業務管理システム
 * Worker4認証システム統合テストコンポーネント
 * RBAC権限チェック・統合検証用
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiCheckCircle, FiXCircle, FiUser, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';

import authService from '../services/authService';
import { OwnerOnly, CostViewGuard, ProfitViewGuard, AdjustTotalGuard } from './PermissionGuard';

const TestContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const TestSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 15px;
`;

const TestCard = styled.div`
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  background: ${props => {
    if (props.status === 'success') return '#d4edda';
    if (props.status === 'error') return '#f8d7da';
    if (props.status === 'warning') return '#fff3cd';
    return '#f8f9fa';
  }};
`;

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'success':
      return <FiCheckCircle color="#28a745" size={20} />;
    case 'error':
      return <FiXCircle color="#dc3545" size={20} />;
    default:
      return <FiShield color="#6c757d" size={20} />;
  }
};

const AuthIntegrationTest = () => {
  const [authStatus, setAuthStatus] = useState({});
  const [permissionTests, setPermissionTests] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // 認証状態チェック
  useEffect(() => {
    checkAuthenticationStatus();
    loadUserInformation();
    runPermissionTests();
    loadDebugInfo();
  }, []);

  const checkAuthenticationStatus = () => {
    const isAuth = authService.isAuthenticated();
    const user = authService.getCurrentUser();
    const features = authService.getUserFeatures();

    setAuthStatus({
      isAuthenticated: isAuth,
      hasToken: Boolean(authService.token),
      hasUser: Boolean(user),
      hasFeatures: Boolean(features),
      status: isAuth ? 'success' : 'error',
    });
  };

  const loadUserInformation = () => {
    const user = authService.getCurrentUser();
    const features = authService.getUserFeatures();

    setUserInfo({
      user,
      features,
      roleDisplay: authService.getRoleDisplayName(),
      isOwner: authService.isOwner(),
      isEmployee: authService.isEmployee(),
    });
  };

  const runPermissionTests = () => {
    const tests = {
      canViewCosts: {
        result: authService.canViewCosts(),
        expected: authService.isOwner(),
        description: '原価情報閲覧権限',
      },
      canViewProfits: {
        result: authService.canViewProfits(),
        expected: authService.isOwner(),
        description: '利益情報閲覧権限',
      },
      canAdjustTotal: {
        result: authService.canAdjustTotal(),
        expected: authService.isOwner(),
        description: '金額調整権限',
      },
      canApproveEstimates: {
        result: authService.canApproveEstimates(),
        expected: authService.isOwner(),
        description: '見積承認権限',
      },
      canIssueInvoices: {
        result: authService.canIssueInvoices(),
        expected: authService.isOwner(),
        description: '請求書発行権限',
      },
      canManageUsers: {
        result: authService.canManageUsers(),
        expected: authService.isOwner(),
        description: 'ユーザー管理権限',
      },
      canViewDashboard: {
        result: authService.canViewDashboard(),
        expected: authService.isOwner(),
        description: 'ダッシュボード権限',
      },
    };

    // テスト結果評価
    const evaluatedTests = {};
    Object.keys(tests).forEach(key => {
      const test = tests[key];
      evaluatedTests[key] = {
        ...test,
        status: test.result === test.expected ? 'success' : 'error',
        passed: test.result === test.expected,
      };
    });

    setPermissionTests(evaluatedTests);
  };

  const loadDebugInfo = () => {
    const debug = authService.getDebugInfo();
    setDebugInfo(debug);
  };

  const testAsyncPermission = async (resource, action) => {
    try {
      const result = await authService.checkPermission(resource, action);
      return result;
    } catch (error) {
      console.error('非同期権限チェックエラー:', error);
      return false;
    }
  };

  const totalTests = Object.keys(permissionTests).length;
  const passedTests = Object.values(permissionTests).filter(test => test.passed).length;
  const integrationScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <TestContainer>
      {/* ヘッダー */}
      <TestSection>
        <h1
          style={{
            color: '#2c3e50',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <FiShield size={28} />
          Worker4 認証システム統合テスト
        </h1>
        <p style={{ color: '#6c757d', marginBottom: '15px' }}>
          RBAC権限管理システムの統合状況とPermissionGuardコンポーネントの動作確認
        </p>
        <div
          style={{
            padding: '10px 15px',
            backgroundColor: integrationScore >= 80 ? '#d4edda' : '#f8d7da',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <StatusIcon status={integrationScore >= 80 ? 'success' : 'error'} />
          <strong>
            統合スコア: {integrationScore}% ({passedTests}/{totalTests} テスト成功)
          </strong>
        </div>
      </TestSection>

      {/* 認証状態 */}
      <TestSection>
        <h3 style={{ marginBottom: '15px' }}>認証状態チェック</h3>
        <TestGrid>
          <TestCard status={authStatus.status}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <StatusIcon status={authStatus.status} />
              <strong>認証システム接続</strong>
            </div>
            <div style={{ fontSize: '14px' }}>
              <div>認証済み: {authStatus.isAuthenticated ? '✅' : '❌'}</div>
              <div>トークン: {authStatus.hasToken ? '✅' : '❌'}</div>
              <div>ユーザー情報: {authStatus.hasUser ? '✅' : '❌'}</div>
              <div>機能情報: {authStatus.hasFeatures ? '✅' : '❌'}</div>
            </div>
          </TestCard>

          {userInfo && (
            <TestCard status="success">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
              >
                <FiUser size={20} color="#28a745" />
                <strong>ユーザー情報</strong>
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>ユーザー名: {userInfo.user?.username}</div>
                <div>ロール: {userInfo.roleDisplay}</div>
                <div>会社ID: {userInfo.user?.company_id}</div>
                <div>経営者権限: {userInfo.isOwner ? '✅' : '❌'}</div>
              </div>
            </TestCard>
          )}
        </TestGrid>
      </TestSection>

      {/* 権限テスト */}
      <TestSection>
        <h3 style={{ marginBottom: '15px' }}>権限チェックテスト</h3>
        <TestGrid>
          {Object.entries(permissionTests).map(([key, test]) => (
            <TestCard key={key} status={test.status}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
              >
                <StatusIcon status={test.status} />
                <strong>{test.description}</strong>
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>結果: {test.result ? '許可' : '拒否'}</div>
                <div>期待値: {test.expected ? '許可' : '拒否'}</div>
                <div>判定: {test.passed ? '✅ 合格' : '❌ 不合格'}</div>
              </div>
            </TestCard>
          ))}
        </TestGrid>
      </TestSection>

      {/* UIコンポーネント権限テスト */}
      <TestSection>
        <h3 style={{ marginBottom: '15px' }}>UIコンポーネント権限制御テスト</h3>
        <TestGrid>
          <TestCard>
            <h4 style={{ marginBottom: '10px' }}>経営者専用コンテンツ</h4>
            <OwnerOnly
              fallback={<div style={{ color: '#dc3545' }}>❌ 経営者権限が必要です</div>}
              showFallback={true}
            >
              <div style={{ color: '#28a745' }}>✅ 経営者専用機能が表示されています</div>
            </OwnerOnly>
          </TestCard>

          <TestCard>
            <h4 style={{ marginBottom: '10px' }}>原価情報表示権限</h4>
            <CostViewGuard
              fallback={<div style={{ color: '#dc3545' }}>❌ 原価情報は非表示</div>}
              showFallback={true}
            >
              <div style={{ color: '#28a745' }}>✅ 原価: ¥150,000（表示可能）</div>
            </CostViewGuard>
          </TestCard>

          <TestCard>
            <h4 style={{ marginBottom: '10px' }}>利益情報表示権限</h4>
            <ProfitViewGuard
              fallback={<div style={{ color: '#dc3545' }}>❌ 利益情報は非表示</div>}
              showFallback={true}
            >
              <div style={{ color: '#28a745' }}>✅ 粗利: ¥50,000 (25%)（表示可能）</div>
            </ProfitViewGuard>
          </TestCard>

          <TestCard>
            <h4 style={{ marginBottom: '10px' }}>金額調整権限</h4>
            <AdjustTotalGuard
              fallback={<div style={{ color: '#dc3545' }}>❌ 金額調整は制限されています</div>}
              showFallback={true}
            >
              <div style={{ color: '#28a745' }}>✅ 金額調整コントロールが利用可能</div>
            </AdjustTotalGuard>
          </TestCard>
        </TestGrid>
      </TestSection>

      {/* デバッグ情報 */}
      <TestSection>
        <h3 style={{ marginBottom: '15px' }}>デバッグ情報</h3>
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </TestSection>

      {/* 統合ステータス */}
      <TestSection>
        <h3 style={{ marginBottom: '15px' }}>統合完了ステータス</h3>
        <div
          style={{
            padding: '20px',
            backgroundColor: integrationScore >= 95 ? '#d4edda' : '#fff3cd',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{ margin: '0 0 10px 0', color: integrationScore >= 95 ? '#155724' : '#856404' }}
          >
            {integrationScore >= 95 ? '🎉 Worker4統合完了！' : '⚠️ 統合調整が必要'}
          </h2>
          <p style={{ margin: 0, fontSize: '16px' }}>
            {integrationScore >= 95
              ? 'RBAC権限管理システムが正常に統合されています。Worker3請求書システム連携確認へ進むことができます。'
              : '一部の権限チェックが期待通りに動作していません。設定を確認してください。'}
          </p>
        </div>
      </TestSection>
    </TestContainer>
  );
};

export default AuthIntegrationTest;
