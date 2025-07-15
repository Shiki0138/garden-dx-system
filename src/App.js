import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LandscapingErrorBoundary } from './components/ui/ErrorBoundary';
import DemoBanner from './components/DemoBanner';
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
          <div style={{ display: 'flex', gap: '15px' }}>
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
          </div>
        </nav>

        <Routes>
          {/* メインルート - 造園業者向けの実用機能のみ */}
          <Route path="/wizard-pro" element={<EstimateWizardPro />} />
          <Route path="/pdf" element={<PDFGenerator />} />
          
          {/* ルート（/）は常にダッシュボードへリダイレクト */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ダッシュボード - メインの見積管理画面 */}
          <Route
            path="/dashboard"
            element={
              <LandscapingErrorBoundary>
                <EstimateCreator />
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
