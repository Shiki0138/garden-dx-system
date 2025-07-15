/**
 * エラーバウンダリーコンポーネント
 * 本番環境でのエラー処理強化
 */

import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// スタイリング
const ErrorContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  text-align: center;
`;

const ErrorCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #dc2626, #ef4444);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin: 0 auto 20px;
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 15px 0;
`;

const ErrorMessage = styled.p`
  color: #6b7280;
  margin: 0 0 30px 0;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  ${props =>
    props.variant === 'primary' &&
    `
    background: #1a472a;
    color: white;
    
    &:hover {
      background: #2d5a3d;
      transform: translateY(-2px);
    }
  `}

  ${props =>
    props.variant === 'secondary' &&
    `
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #e5e7eb;
    }
  `}
`;

const ErrorDetails = styled.details`
  margin-top: 20px;
  text-align: left;

  summary {
    cursor: pointer;
    color: #6b7280;
    margin-bottom: 10px;

    &:hover {
      color: #374151;
    }
  }

  pre {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    overflow-x: auto;
    color: #495057;
    border: 1px solid #e9ecef;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // エラーが発生した場合の状態更新
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // エラー情報の保存
    this.setState({
      error,
      errorInfo,
    });

    // エラーログ記録
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 本番環境でのエラー報告（将来実装）
    if (process.env.REACT_APP_ENVIRONMENT === 'production') {
      // エラー報告サービスに送信
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService = (error, errorInfo) => {
    // エラー報告サービス（Sentry等）への送信
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userId: this.getUserId(), // ユーザーID取得
      environment: process.env.REACT_APP_ENVIRONMENT,
    };

    // 実際のエラー報告サービスに送信
    console.log('Error Report:', errorReport);
  };

  getUserId = () => {
    // セッションからユーザーIDを取得
    try {
      const authData = localStorage.getItem('garden-dx-auth-token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id || 'anonymous';
      }
    } catch (error) {
      console.warn('Failed to get user ID:', error);
    }
    return 'anonymous';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const isDevelopment = process.env.REACT_APP_ENVIRONMENT === 'development';

      return (
        <ErrorContainer>
          <ErrorCard>
            <ErrorIcon>
              <AlertTriangle size={40} />
            </ErrorIcon>

            <ErrorTitle>システムエラーが発生しました</ErrorTitle>

            <ErrorMessage>
              申し訳ございません。予期しないエラーが発生しました。
              <br />
              ページを再読み込みするか、しばらく時間をおいてから再度お試しください。
            </ErrorMessage>

            <ButtonGroup>
              <Button variant="primary" onClick={this.handleReload}>
                <RefreshCw size={18} />
                ページを再読み込み
              </Button>
              <Button variant="secondary" onClick={this.handleGoHome}>
                <Home size={18} />
                ホームに戻る
              </Button>
            </ButtonGroup>

            {/* 開発環境のみエラー詳細表示 */}
            {isDevelopment && error && (
              <ErrorDetails>
                <summary>エラー詳細（開発者向け）</summary>
                <div>
                  <strong>エラー名:</strong> {error.name}
                  <br />
                  <strong>エラーメッセージ:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>スタックトレース:</strong>
                    <pre>{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <strong>コンポーネントスタック:</strong>
                    <pre>{errorInfo.componentStack}</pre>
                  </div>
                )}
              </ErrorDetails>
            )}
          </ErrorCard>
        </ErrorContainer>
      );
    }

    // エラーがない場合は子コンポーネントを表示
    return this.props.children;
  }
}

export default ErrorBoundary;
