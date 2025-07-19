/**
 * Garden Landscaping DX System - Main Entry Point
 * 造園業務管理システム メインエントリーポイント
 * 
 * Created by: worker2 (Production Ready - Mobile First)
 * Date: 2025-07-01
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import LandscapingApp from './components/LandscapingApp';

// エラーバウンダリ
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Garden System Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '20px',
          backgroundColor: '#F1F8E9',
          color: '#2E7D32',
          fontFamily: '"Noto Sans JP", sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🌳</div>
          <h2>Garden システムエラー</h2>
          <p>申し訳ございませんが、システムエラーが発生しました。</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '20px' }}>
            ブラウザを再読み込みして再試行してください。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// アプリケーション起動
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LandscapingApp />
    </ErrorBoundary>
  </React.StrictMode>
);

// サービスワーカー登録（PWA対応）
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// パフォーマンス監視（開発用）
if (process.env.NODE_ENV === 'development') {
  console.log('Garden DX System - Development Mode');
  console.log('Performance monitoring: Ready');
}