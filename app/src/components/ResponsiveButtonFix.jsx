/**
 * Garden DX - レスポンシブボタン修正コンポーネント
 * ボタンの反応しない問題を解決する統一ボタンコンポーネント
 */

import React, { useState, useCallback, memo } from 'react';
import styled from 'styled-components';

// 高パフォーマンスボタンコンポーネント
const ResponsiveButton = memo(
  ({
    children,
    onClick,
    disabled = false,
    type = 'button',
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    loading = false,
    className = '',
    ...props
  }) => {
    const [isPressed, setIsPressed] = useState(false);

    const handleMouseDown = useCallback(() => {
      if (!disabled && !loading) {
        setIsPressed(true);
      }
    }, [disabled, loading]);

    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    const handleClick = useCallback(
      event => {
        if (disabled || loading) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // ハプティックフィードバック（iOS/Android対応）
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }

        if (onClick) {
          onClick(event);
        }
      },
      [disabled, loading, onClick]
    );

    const handleKeyDown = useCallback(
      event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick(event);
        }
      },
      [handleClick]
    );

    return (
      <StyledButton
        type={type}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        $variant={variant}
        $size={size}
        $fullWidth={fullWidth}
        $isPressed={isPressed}
        $loading={loading}
        className={className}
        aria-disabled={disabled || loading}
        role="button"
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        {loading && <LoadingSpinner />}
        <ButtonContent $loading={loading}>{children}</ButtonContent>
      </StyledButton>
    );
  }
);

const StyledButton = styled.button`
  /* 基本レイアウト */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  text-decoration: none;
  outline: none;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  /* フォーカス管理 */
  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  /* タッチ対応 */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;

  /* サイズバリエーション */
  ${props => {
    switch (props.$size) {
      case 'small':
        return `
          padding: 8px 16px;
          font-size: 14px;
          min-height: 36px;
        `;
      case 'large':
        return `
          padding: 16px 32px;
          font-size: 18px;
          min-height: 56px;
        `;
      default:
        return `
          padding: 12px 24px;
          font-size: 16px;
          min-height: 44px;
        `;
    }
  }}

  /* 全幅対応 */
  ${props =>
    props.$fullWidth &&
    `
    width: 100%;
  `}
  
  /* バリエーション */
  ${props => {
    switch (props.$variant) {
      case 'secondary':
        return `
          background: #f8fafc;
          color: #374151;
          border: 1px solid #d1d5db;
          
          &:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #9ca3af;
          }
        `;
      case 'danger':
        return `
          background: #dc2626;
          color: white;
          
          &:hover:not(:disabled) {
            background: #b91c1c;
          }
        `;
      case 'success':
        return `
          background: #16a34a;
          color: white;
          
          &:hover:not(:disabled) {
            background: #15803d;
          }
        `;
      default:
        return `
          background: #3b82f6;
          color: white;
          
          &:hover:not(:disabled) {
            background: #2563eb;
          }
        `;
    }
  }}
  
  /* プレス状態 */
  ${props =>
    props.$isPressed &&
    !props.disabled &&
    `
    transform: scale(0.98);
  `}
  
  /* 無効状態 */
  &:disabled {
    opacity: 0.6;
    transform: none !important;
  }

  /* ローディング状態 */
  ${props =>
    props.$loading &&
    `
    pointer-events: none;
  `}

  /* モバイル最適化 */
  @media (max-width: 768px) {
    min-height: 48px; /* タッチターゲットサイズ確保 */
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${props => (props.$loading ? 0.5 : 1)};
  transition: opacity 0.2s ease;
`;

// 特化ボタンコンポーネント
export const PrimaryButton = memo(props => <ResponsiveButton variant="primary" {...props} />);

export const SecondaryButton = memo(props => <ResponsiveButton variant="secondary" {...props} />);

export const DangerButton = memo(props => <ResponsiveButton variant="danger" {...props} />);

export const SuccessButton = memo(props => <ResponsiveButton variant="success" {...props} />);

export default ResponsiveButton;
