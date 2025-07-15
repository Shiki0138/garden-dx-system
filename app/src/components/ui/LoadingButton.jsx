/**
 * ローディング対応ボタンコンポーネント
 * 統一的なローディング状態表示・アクセシビリティ対応
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

// ローディングアニメーション
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ローディングスピナー
const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// ローディングドット
const LoadingDots = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;

  &::before,
  &::after,
  & {
    content: '';
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
    animation: ${pulse} 1.2s ease-in-out infinite;
  }

  &::before {
    animation-delay: -0.4s;
  }

  &::after {
    animation-delay: 0.4s;
  }
`;

// ベースボタンスタイル
const StyledButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  touch-action: manipulation;
  user-select: none;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #0056b3, #004085);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
          }
        `;
      case 'secondary':
        return `
          background: #6c757d;
          color: white;
          box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);

          &:hover:not(:disabled) {
            background: #5a6268;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
          }
        `;
      case 'success':
        return `
          background: linear-gradient(135deg, #28a745, #1e7e34);
          color: white;
          box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #1e7e34, #155724);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
          }
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, #ffc107, #e0a800);
          color: #212529;
          box-shadow: 0 2px 4px rgba(255, 193, 7, 0.2);

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #e0a800, #d39e00);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
          }
        `;
      case 'danger':
        return `
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #c82333, #bd2130);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
          }
        `;
      default:
        return `
          background: #f8f9fa;
          color: #212529;
          border: 2px solid #dee2e6;

          &:hover:not(:disabled) {
            background: #e9ecef;
            border-color: #adb5bd;
          }
        `;
    }
  }}

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  ${props =>
    props.loading &&
    `
    pointer-events: none;
    opacity: 0.8;
  `}

  @media (max-width: 768px) {
    padding: 14px 20px;
    min-height: 48px;
    font-size: 16px;
  }
`;

// ローディングオーバーレイ
const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
`;

/**
 * ローディングボタンコンポーネント
 *
 * @param {Object} props - プロパティ
 * @param {React.ReactNode} props.children - ボタンの子要素
 * @param {boolean} props.loading - ローディング状態
 * @param {string} props.variant - ボタンのバリアント
 * @param {string} props.loadingType - ローディングアニメーションタイプ ('spinner' | 'dots')
 * @param {string} props.loadingText - ローディング時のテキスト
 * @param {Function} props.onClick - クリックハンドラー
 * @param {boolean} props.disabled - 無効状態
 * @param {Object} rest - その他のprops
 */
const LoadingButton = ({
  children,
  loading = false,
  variant = 'default',
  loadingType = 'spinner',
  loadingText = '処理中...',
  onClick,
  disabled = false,
  ...rest
}) => {
  const handleClick = e => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <StyledButton
      variant={variant}
      loading={loading}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-busy={loading}
      aria-label={loading ? loadingText : undefined}
      {...rest}
    >
      {loading ? (
        <>
          {loadingType === 'spinner' ? <LoadingSpinner /> : <LoadingDots />}
          {loadingText}
        </>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default LoadingButton;
