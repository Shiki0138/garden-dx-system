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
import { checkEnvironmentVariables } from './utils/apiErrorHandler';
import { log } from './utils/logger';
import { initNotificationSystem } from './utils/notifications';
import { initMonitoring } from './utils/monitoring';
import DebugInfo from './components/DebugInfo';

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
        {/* <DebugInfo /> */}
        {isDemoMode && <DemoBanner />}
        <nav
          style={{
            padding: '20px',
            background: '#4a7c59',
            marginBottom: '20px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ color: 'white', margin: 0 }}>🏡 庭想システム</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Link
              to="/wizard-pro"
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                background: '#2e7d32',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              📝 見積作成
            </Link>
            <Link
              to="/pdf"
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                background: '#1565c0',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              📄 PDF出力
            </Link>
            <Link
              to="/dashboard"
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '10px 20px',
                background: '#f57c00',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              🏠 ダッシュボード
            </Link>
            
            {/* ユーザー情報とログアウト */}
            {user && (
              <>
                <span style={{ 
                  color: 'white', 
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px'
                }}>
                  👤 {user.name} ({user.role === 'owner' ? 'オーナー' : '現場監督'})
                </span>
                {!isDemoMode && (
                  <button
                    onClick={handleLogout}
                    style={{
                      color: 'white',
                      background: '#d32f2f',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ログアウト
                  </button>
                )}
              </>
            )}
            
            {/* 本番環境でのログインボタン */}
            {!isDemoMode && !user && (
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  color: 'white',
                  background: '#1976d2',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🔐 ログイン
              </button>
            )}
            
            {/* デモガイドボタン */}
            {isDemoMode && (
              <button
                onClick={() => setShowGuide(true)}
                style={{
                  color: 'white',
                  background: '#9c27b0',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📖 操作ガイド
              </button>
            )}
          </div>
        </nav>

        {/* デモガイドモーダル */}
        {showGuide && <DemoGuide onClose={handleCloseGuide} />}

        <Routes>
          {/* ログイン画面 */}
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          
          {/* メインルート - 造園業者向けの実用機能のみ */}
          <Route path="/wizard-pro" element={<EstimateWizardPro user={user} />} />
          <Route path="/pdf" element={<PDFGenerator user={user} />} />
          
          {/* ルート（/）は常にダッシュボードへリダイレクト */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ダッシュボード - メインの見積管理画面 */}
          <Route
            path="/dashboard"
            element={
              <LandscapingErrorBoundary>
                <EstimateCreator user={user} />
              </LandscapingErrorBoundary>
            }
          />
          
          {/* 404エラー対応 - 存在しないURLは全てダッシュボードへ */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

// メインアプリコンポーネント
function App() {
  return (
    <ErrorBoundary>
      <DemoModeProvider>
        <SupabaseAuthProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SupabaseAuthProvider>
      </DemoModeProvider>
    </ErrorBoundary>
  );
}

export default App;
