import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LandscapingErrorBoundary } from './components/ui/ErrorBoundary';
import DemoBanner from './components/DemoBanner';
import DemoGuide from './components/DemoGuide';
import LoginPage from './components/auth/LoginPage';
import EstimateCreator from './components/EstimateCreator';
import EstimateWizardPro from './components/EstimateWizardPro';
import PDFGenerator from './components/PDFGenerator';
import GardenDXMain from './components/GardenDXMain';
import { checkEnvironmentVariables } from './utils/apiErrorHandler';
import { log } from './utils/logger';
import { initNotificationSystem } from './utils/notifications';
import { initMonitoring } from './utils/monitoring';
import DebugInfo from './components/DebugInfo';
import { initAuthDebug } from './utils/debugAuth';

// アプリケーションコンテンツ
const AppContent = () => {
  const { isDemoMode } = useDemoMode();
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // デモモード時にbodyクラス設定
  useEffect(() => {
    if (isDemoMode) {
      document.body.classList.add('demo-mode');
    } else {
      document.body.classList.remove('demo-mode');
    }

    return () => {
      document.body.classList.remove('demo-mode');
    };
  }, [isDemoMode]);

  // システム初期化（通知、監視、環境変数チェック）
  useEffect(() => {
    // 認証デバッグ情報の出力
    initAuthDebug();

    // 通知システムの初期化
    initNotificationSystem();

    // 本番環境監視システムの初期化
    if (process.env.REACT_APP_PERFORMANCE_MONITORING === 'true') {
      initMonitoring();
    }

    // 環境変数チェック（開発環境のみ）
    if (process.env.REACT_APP_ENVIRONMENT === 'development') {
      const envCheck = checkEnvironmentVariables();
      if (!envCheck.isValid) {
        log.warn('🚨 環境変数が不足しています:', envCheck.missing);
      }
    }

    // 本番環境セットアップ完了ログ
    if (process.env.REACT_APP_ENVIRONMENT === 'production') {
      log.info('🚀 本番環境セットアップ完了 - Garden DX System');
    }
  }, []);

  // ログイン処理
  const handleLogin = userData => {
    setUser(userData);
    setShowLogin(false);
    log.info('ユーザーログイン:', userData.name, userData.role);
  };

  // ログアウト処理
  const handleLogout = () => {
    setUser(null);
    setShowLogin(false);
    log.info('ユーザーログアウト');
  };

  // デモモード時は権限チェックをスキップ（テスト用）
  const shouldShowLogin = !isDemoMode && !user && showLogin;

  // デモモード時は自動的にテスト開始
  useEffect(() => {
    if (isDemoMode && !user) {
      // URLパラメータでロールを判定
      const urlParams = new URLSearchParams(window.location.search);
      const role = urlParams.get('role') || 'manager';

      const demoUser =
        role === 'employee'
          ? {
              id: 'demo-employee-001',
              name: 'テストユーザー（従業員）',
              email: 'employee@garden-dx.example.com',
              role: 'employee',
              user_metadata: { role: 'employee' },
              permissions: ['view_schedule', 'create_report'],
            }
          : {
              id: 'demo-owner-001',
              name: 'テストユーザー（経営者）',
              email: 'demo@garden-dx.example.com',
              role: 'manager',
              user_metadata: { role: 'manager' },
              permissions: ['view_profit', 'create_invoice', 'manage_staff', 'view_all_projects'],
            };
      setUser(demoUser);

      // 初回アクセス時のみガイドを表示
      const hasSeenGuide = localStorage.getItem('demo-guide-seen');
      if (!hasSeenGuide) {
        setTimeout(() => setShowGuide(true), 2000); // 2秒後に表示
      }
    }
  }, [isDemoMode, user]);

  // ガイドを閉じる
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('demo-guide-seen', 'true');
  };

  if (shouldShowLogin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        {/* <DebugInfo /> */}
        {isDemoMode && <DemoBanner />}
        <ErrorBoundary>
          <GardenDXMain />
        </ErrorBoundary>
        {showGuide && <DemoGuide onClose={handleCloseGuide} />}
      </div>
    </Router>
  );
};

// OldNavigationコンポーネントは新しいUIでは使用されていないため削除

// メインアプリコンポーネント
function App() {
  return (
    <DemoModeProvider>
      <SupabaseAuthProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SupabaseAuthProvider>
    </DemoModeProvider>
  );
}

export default App;
