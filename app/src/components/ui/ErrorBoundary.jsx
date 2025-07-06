/**
 * エラーバウンダリー・エラー表示コンポーネント
 * 造園業務システム向け統合エラーハンドリング
 */

import React, { Component } from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';

// エラーレベル定義
export const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// エラータイプ定義
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  SYSTEM: 'system',
  BUSINESS: 'business',
};

// スタイルコンポーネント
const ErrorContainer = styled.div`
  padding: 24px;
  border-radius: 12px;
  margin: 16px 0;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  ${props => {
    switch (props.level) {
      case ERROR_LEVELS.INFO:
        return `
          background: #e3f2fd;
          border-color: #2196f3;
          color: #1565c0;
        `;
      case ERROR_LEVELS.WARNING:
        return `
          background: #fff3e0;
          border-color: #ff9800;
          color: #e65100;
        `;
      case ERROR_LEVELS.ERROR:
        return `
          background: #ffebee;
          border-color: #f44336;
          color: #c62828;
        `;
      case ERROR_LEVELS.CRITICAL:
        return `
          background: #fce4ec;
          border-color: #e91e63;
          color: #ad1457;
        `;
      default:
        return `
          background: #f5f5f5;
          border-color: #bdbdbd;
          color: #424242;
        `;
    }
  }}
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  font-size: 16px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: 8px;
  cursor: pointer;

  summary {
    font-weight: 600;
    margin-bottom: 8px;
    cursor: pointer;
    user-select: none;

    &:hover {
      opacity: 0.8;
    }
  }
`;

const ErrorCode = styled.code`
  background: rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  display: block;
  white-space: pre-wrap;
  overflow-x: auto;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const ErrorButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #2196f3;
          color: white;
          &:hover { background: #1976d2; }
        `;
      case 'secondary':
        return `
          background: #f5f5f5;
          color: #424242;
          border: 1px solid #bdbdbd;
          &:hover { background: #eeeeee; }
        `;
      default:
        return `
          background: transparent;
          color: currentColor;
          border: 1px solid currentColor;
          &:hover { background: rgba(0, 0, 0, 0.1); }
        `;
    }
  }}
`;

/**
 * エラー表示コンポーネント
 */
const ErrorDisplay = ({
  error,
  level = ERROR_LEVELS.ERROR,
  type = ERROR_TYPES.SYSTEM,
  title,
  message,
  showDetails = false,
  onRetry,
  onDismiss,
  onReport,
  children,
}) => {
  const getErrorIcon = () => {
    switch (level) {
      case ERROR_LEVELS.CRITICAL:
        return <Bug size={24} />;
      case ERROR_LEVELS.ERROR:
        return <AlertTriangle size={24} />;
      case ERROR_LEVELS.WARNING:
        return <AlertTriangle size={24} />;
      default:
        return <AlertTriangle size={24} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return 'ネットワークエラー';
      case ERROR_TYPES.VALIDATION:
        return '入力エラー';
      case ERROR_TYPES.AUTHENTICATION:
        return '認証エラー';
      case ERROR_TYPES.PERMISSION:
        return '権限エラー';
      case ERROR_TYPES.BUSINESS:
        return '業務エラー';
      default:
        return 'システムエラー';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return 'インターネット接続を確認し、再度お試しください。';
      case ERROR_TYPES.VALIDATION:
        return '入力内容を確認してください。';
      case ERROR_TYPES.AUTHENTICATION:
        return 'ログインし直してください。';
      case ERROR_TYPES.PERMISSION:
        return 'この操作を実行する権限がありません。';
      case ERROR_TYPES.BUSINESS:
        return '業務処理でエラーが発生しました。';
      default:
        return '予期しないエラーが発生しました。';
    }
  };

  const errorTitle = title || getDefaultTitle();
  const errorMessage = message || error?.message || getDefaultMessage();

  return (
    <ErrorContainer level={level}>
      <ErrorHeader>
        {getErrorIcon()}
        {errorTitle}
      </ErrorHeader>

      <ErrorMessage>{errorMessage}</ErrorMessage>

      {children}

      {showDetails && error && (
        <ErrorDetails>
          <summary>技術的な詳細を表示</summary>
          <ErrorCode>
            {JSON.stringify(
              {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5).join('\n'),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )}
          </ErrorCode>
        </ErrorDetails>
      )}

      <ErrorActions>
        {onRetry && (
          <ErrorButton variant="primary" onClick={onRetry}>
            <RefreshCw size={16} />
            再試行
          </ErrorButton>
        )}
        
        {onDismiss && (
          <ErrorButton variant="secondary" onClick={onDismiss}>
            閉じる
          </ErrorButton>
        )}

        {onReport && (
          <ErrorButton onClick={onReport}>
            <Mail size={16} />
            問題を報告
          </ErrorButton>
        )}

        <ErrorButton
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          <Home size={16} />
          ページを再読み込み
        </ErrorButton>
      </ErrorActions>
    </ErrorContainer>
  );
};

/**
 * エラーバウンダリーコンポーネント
 */
class LandscapingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // エラー報告（本番環境）
    if (process.env.NODE_ENV === 'production') {
      // 外部エラー監視サービスに送信
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // エラー報告の実装
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // ここで外部サービス（Sentry、Bugsnagなど）に送信
    console.log('Error Report:', errorReport);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
          />
        );
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          level={ERROR_LEVELS.CRITICAL}
          title="アプリケーションエラー"
          message="アプリケーションで予期しないエラーが発生しました。"
          showDetails={process.env.NODE_ENV === 'development'}
          onRetry={this.handleRetry}
          onReport={() => this.reportError(this.state.error, this.state.errorInfo)}
        />
      );
    }

    return this.props.children;
  }
}

export { ErrorDisplay, LandscapingErrorBoundary };
export default LandscapingErrorBoundary;