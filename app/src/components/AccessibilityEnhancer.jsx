/**
 * Garden DX - アクセシビリティ強化コンポーネント
 * WCAG 2.1準拠のアクセシブルなUIコンポーネント
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import styled, { css } from 'styled-components';

// スクリーンリーダー専用テキスト
const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// フォーカス管理フック
const useFocusManagement = () => {
  const [focusVisible, setFocusVisible] = useState(false);
  const [lastKeyDown, setLastKeyDown] = useState(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      setLastKeyDown(event.key);
      if (event.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { focusVisible, lastKeyDown };
};

// ライブリージョン（動的コンテンツの読み上げ）
const LiveRegion = memo(({ 
  children, 
  politeness = 'polite', // 'polite' | 'assertive' | 'off'
  atomic = false,
  relevant = 'additions text',
  className 
}) => (
  <div
    aria-live={politeness}
    aria-atomic={atomic}
    aria-relevant={relevant}
    className={className}
  >
    {children}
  </div>
));

// アクセシブルボタン
const AccessibleButton = memo(({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  ...props
}) => {
  const { focusVisible } = useFocusManagement();
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyDown = useCallback((event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setIsPressed(true);
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setIsPressed(false);
      if (!disabled) {
        onClick?.(event);
      }
    }
  }, [disabled, onClick]);

  const handleClick = useCallback((event) => {
    if (!disabled) {
      onClick?.(event);
    }
  }, [disabled, onClick]);

  return (
    <StyledAccessibleButton
      type={type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={isPressed}
      $variant={variant}
      $size={size}
      $focusVisible={focusVisible}
      {...props}
    >
      {children}
    </StyledAccessibleButton>
  );
});

// アクセシブル入力フィールド
const AccessibleInput = memo(({
  label,
  id,
  type = 'text',
  required = false,
  error,
  helpText,
  placeholder,
  value,
  onChange,
  autoComplete,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const { focusVisible } = useFocusManagement();

  return (
    <InputContainer>
      <InputLabel htmlFor={inputId} $required={required}>
        {label}
        {required && (
          <>
            <RequiredAsterisk aria-hidden="true">*</RequiredAsterisk>
            <ScreenReaderOnly>必須項目</ScreenReaderOnly>
          </>
        )}
      </InputLabel>
      
      <StyledInput
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim()}
        $hasError={!!error}
        $focusVisible={focusVisible}
        {...props}
      />
      
      {helpText && (
        <HelpText id={helpId} role="note">
          {helpText}
        </HelpText>
      )}
      
      {error && (
        <ErrorMessage id={errorId} role="alert" aria-live="polite">
          <span aria-hidden="true">⚠️</span> {error}
        </ErrorMessage>
      )}
    </InputContainer>
  );
});

// アクセシブルモーダル
const AccessibleModal = memo(({
  isOpen,
  onClose,
  title,
  children,
  closeOnEscape = true,
  closeOnOverlay = true,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // 前のフォーカス要素を記憶
      previousFocusRef.current = document.activeElement;
      
      // モーダル内の最初のフォーカス可能要素にフォーカス
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements?.length > 0) {
        focusableElements[0].focus();
      }
      
      // body のスクロールを無効化
      document.body.style.overflow = 'hidden';
    } else {
      // 前のフォーカス要素に戻す
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      
      // body のスクロールを有効化
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((event) => {
    if (!isOpen) return;

    if (event.key === 'Escape' && closeOnEscape) {
      onClose();
    }

    // Tab キーでのフォーカストラップ
    if (event.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements?.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = useCallback((event) => {
    if (closeOnOverlay && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnOverlay, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick} role="presentation">
      <ModalContainer
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        {...props}
      >
        <ModalHeader>
          <ModalTitle id="modal-title">{title}</ModalTitle>
          <CloseButton
            onClick={onClose}
            aria-label="モーダルを閉じる"
            type="button"
          >
            ×
          </CloseButton>
        </ModalHeader>
        <ModalContent>{children}</ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
});

// スキップリンク
const SkipLinks = memo(() => (
  <SkipLinksContainer>
    <SkipLink href="#main-content">メインコンテンツへスキップ</SkipLink>
    <SkipLink href="#navigation">ナビゲーションへスキップ</SkipLink>
  </SkipLinksContainer>
));

// アクセシブルツールチップ
const AccessibleTooltip = memo(({
  children,
  content,
  position = 'top',
  delay = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const showTooltip = useCallback(() => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  }, [timeoutId]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      hideTooltip();
    }
  }, [hideTooltip]);

  return (
    <TooltipContainer
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onKeyDown={handleKeyDown}
    >
      {React.cloneElement(children, {
        'aria-describedby': isVisible ? tooltipId : undefined
      })}
      {isVisible && (
        <TooltipContent
          id={tooltipId}
          role="tooltip"
          $position={position}
        >
          {content}
        </TooltipContent>
      )}
    </TooltipContainer>
  );
});

// 色覚テストユーティリティ
const ColorVisionSimulator = memo(({ filter, children }) => (
  <div style={{ filter: filter }}>
    {children}
  </div>
));

// アクセシビリティ設定パネル
const AccessibilitySettings = memo(() => {
  const [settings, setSettings] = useState({
    highContrast: false,
    reducedMotion: false,
    fontSize: 'normal',
    colorBlindMode: 'none'
  });

  const handleSettingChange = useCallback((setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    
    // CSSカスタムプロパティを更新
    const root = document.documentElement;
    
    switch (setting) {
      case 'highContrast':
        root.style.setProperty('--high-contrast', value ? '1' : '0');
        break;
      case 'reducedMotion':
        root.style.setProperty('--reduced-motion', value ? '1' : '0');
        break;
      case 'fontSize': {
        const sizeMap = { small: '0.875rem', normal: '1rem', large: '1.125rem' };
        root.style.setProperty('--base-font-size', sizeMap[value]);
        break;
      }
      case 'colorBlindMode': {
        const filterMap = {
          none: 'none',
          protanopia: 'url(#protanopia)',
          deuteranopia: 'url(#deuteranopia)',
          tritanopia: 'url(#tritanopia)'
        };
        root.style.setProperty('--color-filter', filterMap[value]);
        break;
      }
    }
  }, []);

  return (
    <SettingsPanel role="region" aria-label="アクセシビリティ設定">
      <SettingsTitle>アクセシビリティ設定</SettingsTitle>
      
      <SettingGroup>
        <SettingLabel>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
          />
          <SettingText>ハイコントラスト</SettingText>
        </SettingLabel>
      </SettingGroup>

      <SettingGroup>
        <SettingLabel>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
          />
          <SettingText>アニメーション削減</SettingText>
        </SettingLabel>
      </SettingGroup>

      <SettingGroup>
        <SettingLabel>
          <SettingText>文字サイズ:</SettingText>
          <select
            value={settings.fontSize}
            onChange={(e) => handleSettingChange('fontSize', e.target.value)}
          >
            <option value="small">小</option>
            <option value="normal">標準</option>
            <option value="large">大</option>
          </select>
        </SettingLabel>
      </SettingGroup>

      <SettingGroup>
        <SettingLabel>
          <SettingText>色覚モード:</SettingText>
          <select
            value={settings.colorBlindMode}
            onChange={(e) => handleSettingChange('colorBlindMode', e.target.value)}
          >
            <option value="none">通常</option>
            <option value="protanopia">1型色覚</option>
            <option value="deuteranopia">2型色覚</option>
            <option value="tritanopia">3型色覚</option>
          </select>
        </SettingLabel>
      </SettingGroup>
    </SettingsPanel>
  );
});

// スタイルコンポーネント
const StyledAccessibleButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  border-radius: 4px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* サイズ */
  ${props => {
    switch (props.$size) {
      case 'small':
        return css`
          padding: 8px 16px;
          font-size: 14px;
          min-height: 36px;
        `;
      case 'large':
        return css`
          padding: 16px 32px;
          font-size: 18px;
          min-height: 48px;
        `;
      default:
        return css`
          padding: 12px 24px;
          font-size: 16px;
          min-height: 44px;
        `;
    }
  }}
  
  /* バリエーション */
  ${props => {
    switch (props.$variant) {
      case 'secondary':
        return css`
          background: #f8fafc;
          color: #374151;
          border-color: #d1d5db;
          &:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #9ca3af;
          }
        `;
      case 'danger':
        return css`
          background: #dc2626;
          color: white;
          &:hover:not(:disabled) {
            background: #b91c1c;
          }
        `;
      default:
        return css`
          background: #3b82f6;
          color: white;
          &:hover:not(:disabled) {
            background: #2563eb;
          }
        `;
    }
  }}
  
  /* フォーカス表示 */
  ${props => props.$focusVisible && css`
    &:focus {
      outline: 3px solid #fbbf24;
      outline-offset: 2px;
    }
  `}
  
  /* 無効状態 */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* ハイコントラストモード */
  @media (prefers-contrast: high) {
    border-width: 2px;
    border-style: solid;
  }
  
  /* 動きの削減 */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const InputLabel = styled.label`
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RequiredAsterisk = styled.span`
  color: #dc2626;
  font-weight: bold;
`;

const StyledInput = styled.input`
  padding: 12px 16px;
  border: 2px solid ${props => props.$hasError ? '#dc2626' : '#d1d5db'};
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: ${props => props.$focusVisible ? '3px solid #fbbf24' : 'none'};
    outline-offset: 2px;
    border-color: ${props => props.$hasError ? '#dc2626' : '#3b82f6'};
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const HelpText = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  font-size: 14px;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 8px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  
  &:hover {
    color: #374151;
  }
  
  &:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const SkipLinksContainer = styled.div`
  position: absolute;
  top: -100px;
  left: 0;
  z-index: 10000;
  
  &:focus-within {
    top: 0;
  }
`;

const SkipLink = styled.a`
  position: absolute;
  top: 0;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 10001;
  
  &:focus {
    top: 0;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipContent = styled.div`
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 1000;
  
  ${props => {
    switch (props.$position) {
      case 'bottom':
        return css`
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
        `;
      case 'left':
        return css`
          top: 50%;
          right: 100%;
          transform: translateY(-50%);
          margin-right: 8px;
        `;
      case 'right':
        return css`
          top: 50%;
          left: 100%;
          transform: translateY(-50%);
          margin-left: 8px;
        `;
      default: // top
        return css`
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
    }
  }}
`;

const SettingsPanel = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const SettingsTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
`;

const SettingGroup = styled.div`
  margin-bottom: 16px;
`;

const SettingLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const SettingText = styled.span`
  color: #374151;
`;

export {
  ScreenReaderOnly,
  useFocusManagement,
  LiveRegion,
  AccessibleButton,
  AccessibleInput,
  AccessibleModal,
  SkipLinks,
  AccessibleTooltip,
  ColorVisionSimulator,
  AccessibilitySettings
};

export default {
  ScreenReaderOnly,
  useFocusManagement,
  LiveRegion,
  AccessibleButton,
  AccessibleInput,
  AccessibleModal,
  SkipLinks,
  AccessibleTooltip,
  ColorVisionSimulator,
  AccessibilitySettings
};