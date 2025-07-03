import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import DemoBanner from './components/DemoBanner';
import EstimateCreator from './components/EstimateCreator';
import InvoiceForm from './components/invoices/InvoiceForm';
import InvoiceList from './components/invoices/InvoiceList';
import DemoUITest from './components/DemoUITest';
import DemoLandingPage from './components/DemoLandingPage';
import EstimateWizardTest from './components/EstimateWizardTest';
import EstimateWizardPro from './components/EstimateWizardPro';
import PDFGenerator from './components/PDFGenerator';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { checkEnvironmentVariables } from './utils/apiErrorHandler';
import { log } from './utils/logger';
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

  // 環境変数チェック（開発環境のみ）
  useEffect(() => {
    if (process.env.REACT_APP_ENVIRONMENT === 'development') {
      const envCheck = checkEnvironmentVariables();
      if (!envCheck.isValid) {
        log.warn('🚨 環境変数が不足しています:', envCheck.missing);
      }
    }
  }, []);

  return (
    <Router>
      <div className="App">
        {/* <DebugInfo /> */}
        <DemoBanner />
        <nav style={{ 
          padding: '20px', 
          background: '#4a7c59', 
          marginBottom: '20px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center'
        }}>
          <h2 style={{ color: 'white', margin: 0 }}>
            🏡 Garden DX システム{isDemoMode ? '（デモ版）' : '（本番版）'}
          </h2>
          <Link to="/demo" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '8px 16px',
            background: isDemoMode ? '#ff9800' : '#2d5016',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
            {isDemoMode ? '🎭 デモ体験中' : '✨ UI動作確認デモ'}
          </Link>
              <Link to="/wizard" style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 16px',
                background: '#7cb342',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                🚀 見積ウィザード
              </Link>
              <Link to="/wizard-pro" style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 16px',
                background: '#2e7d32',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                ⭐ 本番ウィザード
              </Link>
              <Link to="/pdf" style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 16px',
                background: '#1565c0',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                📄 PDF生成
              </Link>
              <Link to="/login" style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 16px',
                background: '#f57c00',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                🔐 ログイン
              </Link>
            </nav>
            
            <Routes>
              {/* パブリックルート */}
              <Route path="/demo" element={<DemoLandingPage />} />
              <Route path="/demo/ui" element={<DemoUITest />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* 保護されたルート */}
              <Route path="/wizard" element={
                <ProtectedRoute>
                  <EstimateWizardTest />
                </ProtectedRoute>
              } />
              <Route path="/wizard-pro" element={
                <ProtectedRoute>
                  <EstimateWizardPro />
                </ProtectedRoute>
              } />
              <Route path="/pdf" element={
                <ProtectedRoute>
                  <PDFGenerator />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <EstimateCreator />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <InvoiceList />
                </ProtectedRoute>
              } />
              <Route path="/invoices/new" element={
                <ProtectedRoute requireRole="manager">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="/invoices/:id/edit" element={
                <ProtectedRoute requireRole="manager">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
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