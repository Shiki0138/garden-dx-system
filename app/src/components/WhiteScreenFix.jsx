/**
 * Garden DX - 白画面問題修正コンポーネント
 * エラー境界とサスペンス機能でアプリの安定性を向上
 */

import React, { Component, Suspense, lazy, useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// エラー境界コンポーネント（白画面防止）
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // エラーログ送信
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 本番環境でのエラー報告
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // エラー報告サービス（例：Sentry）への送信
    console.log('Error reported:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  };

  handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // 3回以上失敗した場合はページリロード
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>申し訳ございません</ErrorTitle>
          <ErrorMessage>
            アプリケーションでエラーが発生しました。<br />
            しばらく時間をおいてから再度お試しください。
          </ErrorMessage>
          
          <ErrorActions>
            <RetryButton onClick={this.handleRetry}>
              再試行 ({3 - this.state.retryCount}回まで)
            </RetryButton>
            <ReloadButton onClick={this.handleReload}>
              ページを再読み込み
            </ReloadButton>
          </ErrorActions>

          {/* 開発環境でのデバッグ情報 */}
          {process.env.NODE_ENV === 'development' && (
            <DebugInfo>
              <DebugTitle>デバッグ情報:</DebugTitle>
              <DebugContent>
                <strong>エラー:</strong> {this.state.error?.message}
                <br />
                <strong>スタック:</strong>
                <pre>{this.state.error?.stack}</pre>
                <strong>コンポーネントスタック:</strong>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </DebugContent>
            </DebugInfo>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// ローディングコンポーネント（Suspense用）
const LoadingSpinner = () => (
  <LoadingContainer>
    <Spinner />
    <LoadingText>読み込み中...</LoadingText>
  </LoadingContainer>
);

// 段階的ローディングコンポーネント
const ProgressiveLoader = ({ children, fallback }) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 100); // 100ms後にローディング表示

    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={showFallback ? fallback : <div />}>
      {children}
    </Suspense>
  );
};

// ネットワーク状態監視コンポーネント
const NetworkStatus = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <OfflineContainer>
        <OfflineIcon>📡</OfflineIcon>
        <OfflineTitle>オフラインです</OfflineTitle>
        <OfflineMessage>
          インターネット接続を確認してください。<br />
          接続が復旧すると自動的に再開されます。
        </OfflineMessage>
        <ConnectivityStatus>
          <StatusDot $online={isOnline} />
          {isOnline ? '接続中' : '切断中'}
        </ConnectivityStatus>
      </OfflineContainer>
    );
  }

  return children;
};

// アプリ全体ラッパー
const AppWrapper = ({ children }) => (
  <ErrorBoundary>
    <NetworkStatus>
      <ProgressiveLoader fallback={<LoadingSpinner />}>
        {children}
      </ProgressiveLoader>
    </NetworkStatus>
  </ErrorBoundary>
);

// スタイルコンポーネント
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: #f9fafb;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 24px;
`;

const ErrorTitle = styled.h1`
  font-size: 2rem;
  color: #1f2937;
  margin: 0 0 16px 0;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0 0 32px 0;
  line-height: 1.6;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const RetryButton = styled.button`
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #2563eb;
  }
`;

const ReloadButton = styled.button`
  padding: 12px 24px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #4b5563;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 16px;
`;

const LoadingText = styled.p`
  color: #6b7280;
  font-size: 16px;
  margin: 0;
`;

const OfflineContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: #fef3c7;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const OfflineIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 24px;
`;

const OfflineTitle = styled.h1`
  font-size: 2rem;
  color: #92400e;
  margin: 0 0 16px 0;
  font-weight: 600;
`;

const OfflineMessage = styled.p`
  font-size: 1.1rem;
  color: #d97706;
  margin: 0 0 32px 0;
  line-height: 1.6;
`;

const ConnectivityStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  font-size: 14px;
  color: #374151;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$online ? '#10b981' : '#ef4444'};
`;

const DebugInfo = styled.details`
  margin-top: 32px;
  padding: 16px;
  background: #fee2e2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  text-align: left;
  max-width: 80vw;
  overflow: auto;
`;

const DebugTitle = styled.summary`
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;
  margin-bottom: 8px;
`;

const DebugContent = styled.div`
  font-size: 12px;
  color: #7f1d1d;
  
  pre {
    background: #fef2f2;
    padding: 8px;
    border-radius: 4px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

export {
  ErrorBoundary,
  LoadingSpinner,
  ProgressiveLoader,
  NetworkStatus,
  AppWrapper
};

export default AppWrapper;