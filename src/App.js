import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LandscapingErrorBoundary } from './components/ui/ErrorBoundary';
import DemoBanner from './components/DemoBanner';
import DemoGuide from './components/DemoGuide';
import LoginPage from './components/auth/LoginPage';
import GardenDXMain from './components/GardenDXMain';
import { checkEnvironmentVariables } from './utils/apiErrorHandler';
import { log } from './utils/logger';
import { initNotificationSystem } from './utils/notifications';
import { initMonitoring } from './utils/monitoring';

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
  }, [isDemoMode]);

  // アプリケーション初期化
  useEffect(() => {
    // 通知システムの初期化
    initNotificationSystem();
    
    // 監視システムの初期化
    initMonitoring();
    
    // セキュリティヘッダー設定
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
    
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
  const handleLogin = (userData) => {
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
      // デモモード時は自動でオーナー権限でログイン
      const demoUser = {
        id: 'demo-owner-001',
        name: 'テストユーザー（オーナー）',
        email: 'demo@garden-dx.example.com',
        role: 'owner',
        permissions: ['view_profit', 'create_invoice', 'manage_staff', 'view_all_projects']
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
        {isDemoMode && <DemoBanner />}
        <GardenDXMain />
        {showGuide && <DemoGuide onClose={handleCloseGuide} />}
      </div>
    </Router>
  );
};

// メインアプリケーション
function App() {
  return (
    <DemoModeProvider>
      <AuthProvider>
        <SupabaseAuthProvider>
          <ErrorBoundary>
            <LandscapingErrorBoundary>
              <AppContent />
            </LandscapingErrorBoundary>
          </ErrorBoundary>
        </SupabaseAuthProvider>
      </AuthProvider>
    </DemoModeProvider>
  );
}

export default App;