/**
 * Garden DX - モバイル最適化コンポーネント
 * レスポンシブデザインとタッチ操作の最適化
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { css } from 'styled-components';
import { 
  FONT_SIZES, 
  TOUCH_SIZES, 
  SPACING, 
  MOBILE_STYLES, 
  COLORS, 
  Z_INDEX,
  mediaQuery,
  BREAKPOINTS 
} from '../styles/mobileConstants';

// デバイス検出フック
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    hasTouch: false,
    os: 'unknown'
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        hasTouch: 'ontouchstart' in window,
        os: /iPhone|iPad|iPod|iOS/.test(userAgent) ? 'ios' :
            /Android/.test(userAgent) ? 'android' :
            /Windows Phone/.test(userAgent) ? 'windows' : 'unknown'
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// モバイル最適化済みボタン
const MobileOptimizedButton = memo(({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  ...props 
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const deviceInfo = useDeviceDetection();

  const handleTouchStart = useCallback(() => {
    if (!disabled) {
      setIsPressing(true);
      // ハプティックフィードバック
      if (navigator.vibrate && deviceInfo.isMobile) {
        navigator.vibrate(10);
      }
    }
  }, [disabled, deviceInfo.isMobile]);

  const handleTouchEnd = useCallback(() => {
    setIsPressing(false);
  }, []);

  const handleClick = useCallback((event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }, [disabled, onClick]);

  return (
    <MobileButton
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $isPressing={isPressing}
      $isMobile={deviceInfo.isMobile}
      {...props}
    >
      {children}
    </MobileButton>
  );
});

// モバイル最適化済みリスト
const MobileOptimizedList = memo(({ 
  items, 
  renderItem, 
  onItemClick,
  searchable = false,
  virtualScrolling = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleItems, setVisibleItems] = useState(items);
  const deviceInfo = useDeviceDetection();

  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  useEffect(() => {
    setVisibleItems(filteredItems);
  }, [filteredItems]);

  const handleItemClick = useCallback((item, index) => {
    // タッチフィードバック
    if (navigator.vibrate && deviceInfo.hasTouch) {
      navigator.vibrate(5);
    }
    onItemClick?.(item, index);
  }, [onItemClick, deviceInfo.hasTouch]);

  return (
    <MobileListContainer $isMobile={deviceInfo.isMobile}>
      {searchable && (
        <SearchInput
          type="text"
          placeholder="検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          $isMobile={deviceInfo.isMobile}
        />
      )}
      
      <ListContainer $isMobile={deviceInfo.isMobile}>
        {visibleItems.map((item, index) => (
          <ListItem
            key={item.id || index}
            onClick={() => handleItemClick(item, index)}
            $isMobile={deviceInfo.isMobile}
          >
            {renderItem(item, index)}
          </ListItem>
        ))}
      </ListContainer>
    </MobileListContainer>
  );
});

// モバイル最適化済みフォーム
const MobileOptimizedForm = memo(({ 
  children, 
  onSubmit,
  autoComplete = true 
}) => {
  const deviceInfo = useDeviceDetection();

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    
    // キーボードを閉じる（モバイル）
    if (deviceInfo.isMobile && document.activeElement) {
      document.activeElement.blur();
    }
    
    onSubmit?.(event);
  }, [onSubmit, deviceInfo.isMobile]);

  return (
    <MobileForm 
      onSubmit={handleSubmit}
      autoComplete={autoComplete ? 'on' : 'off'}
      $isMobile={deviceInfo.isMobile}
    >
      {children}
    </MobileForm>
  );
});

// モバイル最適化済み入力フィールド
const MobileOptimizedInput = memo(({
  type = 'text',
  label,
  error,
  required = false,
  ...props
}) => {
  const deviceInfo = useDeviceDetection();
  
  // モバイルでの入力タイプ最適化
  const optimizedType = React.useMemo(() => {
    if (!deviceInfo.isMobile) return type;
    
    switch (type) {
      case 'number':
        return 'tel'; // モバイルでは数字キーパッドを表示
      case 'email':
        return 'email'; // メールキーボードを表示
      case 'tel':
        return 'tel'; // 電話番号キーボードを表示
      default:
        return type;
    }
  }, [type, deviceInfo.isMobile]);

  return (
    <InputContainer $isMobile={deviceInfo.isMobile}>
      {label && (
        <InputLabel $required={required} $isMobile={deviceInfo.isMobile}>
          {label}
          {required && <RequiredMark>*</RequiredMark>}
        </InputLabel>
      )}
      <Input
        type={optimizedType}
        $isMobile={deviceInfo.isMobile}
        $hasError={!!error}
        {...props}
      />
      {error && (
        <ErrorMessage $isMobile={deviceInfo.isMobile}>
          {error}
        </ErrorMessage>
      )}
    </InputContainer>
  );
});

// モバイルナビゲーション
const MobileNavigation = memo(({ 
  items, 
  activeItem, 
  onItemClick 
}) => {
  const deviceInfo = useDeviceDetection();

  if (!deviceInfo.isMobile) {
    return null; // デスクトップでは表示しない
  }

  return (
    <MobileNav>
      {items.map((item, index) => (
        <NavItem
          key={item.id || index}
          onClick={() => onItemClick(item)}
          $active={activeItem === item.id}
        >
          {item.icon && <NavIcon>{item.icon}</NavIcon>}
          <NavLabel>{item.label}</NavLabel>
        </NavItem>
      ))}
    </MobileNav>
  );
});

// プルトゥリフレッシュ
const PullToRefresh = memo(({ onRefresh, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = useCallback((e) => {
    setStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 100));
      setIsPulling(distance > 60);
    }
  }, [startY]);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance > 60) {
      onRefresh?.();
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, onRefresh]);

  return (
    <PullRefreshContainer
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      $pullDistance={pullDistance}
    >
      <PullRefreshIndicator $visible={pullDistance > 20}>
        <PullRefreshIcon $spinning={isPulling}>
          ↻
        </PullRefreshIcon>
        <PullRefreshText>
          {isPulling ? '離してリフレッシュ' : '下にプルしてリフレッシュ'}
        </PullRefreshText>
      </PullRefreshIndicator>
      {children}
    </PullRefreshContainer>
  );
});

// レスポンシブグリッド
const ResponsiveGrid = memo(({ children, columns = { mobile: 1, tablet: 2, desktop: 3 } }) => {
  const deviceInfo = useDeviceDetection();
  
  const currentColumns = deviceInfo.isMobile ? columns.mobile :
                        deviceInfo.isTablet ? columns.tablet :
                        columns.desktop;

  return (
    <GridContainer $columns={currentColumns}>
      {children}
    </GridContainer>
  );
});

// スタイルコンポーネント

const MobileButton = styled.button`
  /* 基本スタイル */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  
  /* タッチ最適化 */
  ${MOBILE_STYLES.touchOptimized}
  
  /* サイズ設定 */
  ${props => {
    const sizeMap = {
      small: { height: TOUCH_SIZES.small, fontSize: FONT_SIZES.sm, padding: `${SPACING.sm} ${SPACING.base}` },
      medium: { height: TOUCH_SIZES.medium, fontSize: FONT_SIZES.base, padding: `${SPACING.md} ${SPACING.lg}` },
      large: { height: TOUCH_SIZES.large, fontSize: FONT_SIZES.md, padding: `${SPACING.base} ${SPACING['2xl']}` }
    };
    const size = sizeMap[props.$size] || sizeMap.medium;
    
    return `
      min-height: ${size.height};
      padding: ${size.padding};
      font-size: ${size.fontSize};
    `;
  }}
  
  ${props => props.$fullWidth && 'width: 100%;'}
  
  /* バリエーション */
  ${props => {
    switch (props.$variant) {
      case 'secondary':
        return `
          background: ${COLORS.gray[50]};
          color: ${COLORS.gray[700]};
          border: 1px solid ${COLORS.gray[300]};
          &:active:not(:disabled) { background: ${COLORS.gray[100]}; }
        `;
      case 'danger':
        return `
          background: ${COLORS.error};
          color: ${COLORS.white};
          &:active:not(:disabled) { background: ${COLORS.errorDark}; }
        `;
      default:
        return `
          background: ${COLORS.primary};
          color: ${COLORS.white};
          &:active:not(:disabled) { background: ${COLORS.primaryDark}; }
        `;
    }
  }}
  
  /* プレス状態 */
  ${props => props.$isPressing && !props.disabled && `
    transform: scale(0.98);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  `}
  
  /* 無効状態 */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* フォーカス状態 */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }
`;

const MobileListContainer = styled.div`
  width: 100%;
  ${props => props.$isMobile && `
    padding: 0 ${SPACING.base};
  `}
`;

const SearchInput = styled.input`
  width: 100%;
  ${MOBILE_STYLES.inputOptimized}
  border: 1px solid ${COLORS.gray[300]};
  margin-bottom: ${SPACING.base};
  
  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 2px ${COLORS.primary}20;
  }
  
  &::placeholder {
    color: ${COLORS.gray[400]};
  }
`;

const ListContainer = styled.div`
  ${props => props.$isMobile && `
    margin: 0 -${SPACING.base};
  `}
`;

const ListItem = styled.div`
  padding: ${SPACING.base};
  border-bottom: 1px solid ${COLORS.gray[100]};
  cursor: pointer;
  transition: background 0.15s ease;
  ${MOBILE_STYLES.touchOptimized}
  
  ${props => props.$isMobile && `
    padding: ${SPACING.lg} ${SPACING.base};
    min-height: ${TOUCH_SIZES.large};
    display: flex;
    align-items: center;
  `}
  
  &:active {
    background: ${COLORS.gray[50]};
  }
  
  ${mediaQuery.notMobile} {
    &:hover {
      background: ${COLORS.gray[50]};
    }
  }
`;

const MobileForm = styled.form`
  ${props => props.$isMobile && `
    padding: ${SPACING.base};
  `}
`;

const InputContainer = styled.div`
  margin-bottom: ${SPACING.lg};
  
  ${props => props.$isMobile && `
    margin-bottom: ${SPACING.xl};
  `}
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: ${SPACING.sm};
  font-weight: 500;
  color: ${COLORS.gray[700]};
  font-size: ${FONT_SIZES.base};
`;

const RequiredMark = styled.span`
  color: ${COLORS.error};
  margin-left: ${SPACING.xs};
`;

const Input = styled.input`
  width: 100%;
  ${MOBILE_STYLES.inputOptimized}
  border: 1px solid ${props => props.$hasError ? COLORS.error : COLORS.gray[300]};
  transition: border-color 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? COLORS.error : COLORS.primary};
    box-shadow: 0 0 0 2px ${props => props.$hasError ? `${COLORS.error}20` : `${COLORS.primary}20`};
  }
  
  &::placeholder {
    color: ${COLORS.gray[400]};
  }
`;

const ErrorMessage = styled.div`
  margin-top: ${SPACING.sm};
  color: ${COLORS.error};
  font-size: ${FONT_SIZES.sm};
`;

const MobileNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${COLORS.white};
  border-top: 1px solid ${COLORS.gray[200]};
  display: flex;
  padding: ${SPACING.sm} 0;
  padding-bottom: max(${SPACING.sm}, env(safe-area-inset-bottom));
  z-index: ${Z_INDEX.sticky};
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
`;

const NavItem = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${SPACING.sm} ${SPACING.xs};
  min-height: ${TOUCH_SIZES.medium};
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.15s ease;
  ${MOBILE_STYLES.touchOptimized}
  
  color: ${props => props.$active ? COLORS.primary : COLORS.gray[500]};
  
  &:active {
    background: ${COLORS.gray[50]};
  }
`;

const NavIcon = styled.div`
  font-size: ${FONT_SIZES.lg};
  margin-bottom: ${SPACING.xs};
`;

const NavLabel = styled.span`
  font-size: ${FONT_SIZES.xs};
  font-weight: 500;
`;

const PullRefreshContainer = styled.div`
  transform: translateY(${props => props.$pullDistance}px);
  transition: transform 0.2s ease;
`;

const PullRefreshIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;
`;

const PullRefreshIcon = styled.div`
  font-size: ${FONT_SIZES.xl};
  color: ${COLORS.gray[500]};
  animation: ${props => props.$spinning ? 'spin 1s linear infinite' : 'none'};
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const PullRefreshText = styled.div`
  margin-top: ${SPACING.sm};
  font-size: ${FONT_SIZES.sm};
  color: ${COLORS.gray[500]};
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns}, 1fr);
  gap: ${SPACING.base};
  
  ${mediaQuery.mobile} {
    gap: ${SPACING.md};
  }
`;

export {
  useDeviceDetection,
  MobileOptimizedButton,
  MobileOptimizedList,
  MobileOptimizedForm,
  MobileOptimizedInput,
  MobileNavigation,
  PullToRefresh,
  ResponsiveGrid
};

export default {
  useDeviceDetection,
  MobileOptimizedButton,
  MobileOptimizedList,
  MobileOptimizedForm,
  MobileOptimizedInput,
  MobileNavigation,
  PullToRefresh,
  ResponsiveGrid
};