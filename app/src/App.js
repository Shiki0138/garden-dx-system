import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import EstimateCreator from './components/EstimateCreator';
import InvoiceForm from './components/invoices/InvoiceForm';
import InvoiceList from './components/invoices/InvoiceList';
import DemoUITest from './components/DemoUITest';
import EstimateWizardTest from './components/EstimateWizardTest';
import EstimateWizardPro from './components/EstimateWizardPro';
import PDFGenerator from './components/PDFGenerator';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <SupabaseAuthProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <nav style={{ 
              padding: '20px', 
              background: '#4a7c59', 
              marginBottom: '20px',
              display: 'flex',
              gap: '20px',
              alignItems: 'center'
            }}>
              <h2 style={{ color: 'white', margin: 0 }}>🏡 Garden DX システム（本番版）</h2>
              <Link to="/demo" style={{ 
                color: 'white', 
                textDecoration: 'none', 
                padding: '8px 16px',
                background: '#2d5016',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                ✨ UI動作確認デモ
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
              <Route path="/demo" element={<DemoUITest />} />
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
      </AuthProvider>
    </SupabaseAuthProvider>
  );
}

export default App;