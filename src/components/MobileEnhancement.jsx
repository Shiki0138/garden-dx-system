import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { breakpoints, touchTarget, spacing } from '../styles/breakpoints';

/**
 * モバイル用タッチイベントとスワイプジェスチャーを提供するコンポーネント
 * 使用例：
 * <SwipeableContainer onSwipeLeft={handleNext} onSwipeRight={handlePrev}>
 *   <content />
 * </SwipeableContainer>
 */

export const SwipeableContainer = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  className 
}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    setIsScrolling(false);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    
    const deltaX = Math.abs(currentTouch.x - touchStart.x);
    const deltaY = Math.abs(currentTouch.y - touchStart.y);
    
    // 縦スクロールの場合はスワイプを無効化
    if (deltaY > deltaX) {
      setIsScrolling(true);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isScrolling) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    } else if (isUpSwipe && onSwipeUp) {
      onSwipeUp();
    } else if (isDownSwipe && onSwipeDown) {
      onSwipeDown();
    }
  };

  const handleTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    onTouchMove(e);
  };

  return (
    <SwipeContainer
      ref={containerRef}
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </SwipeContainer>
  );
};

/**
 * タッチフィードバック付きボタン
 */
export const TouchButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  ripple = true,
  haptic = true,
  className,
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [rippleEffect, setRippleEffect] = useState(null);
  const buttonRef = useRef(null);

  const handleTouchStart = (e) => {
    setIsPressed(true);
    
    // ハプティックフィードバック
    if (haptic && navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // リップル効果
    if (ripple) {
      const rect = buttonRef.current.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.touches[0].clientX - rect.left - size / 2;
      const y = e.touches[0].clientY - rect.top - size / 2;
      
      setRippleEffect({ x, y, size });
      
      setTimeout(() => setRippleEffect(null), 600);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = (e) => {
    if (disabled || loading) return;
    onClick?.(e);
  };

  return (
    <TouchButtonContainer
      ref={buttonRef}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      isPressed={isPressed}
      className={className}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {rippleEffect && (
        <RippleEffect
          x={rippleEffect.x}
          y={rippleEffect.y}
          size={rippleEffect.size}
        />
      )}
      {loading ? (
        <LoadingSpinner size={size} />
      ) : (
        children
      )}
    </TouchButtonContainer>
  );
};

/**
 * プルトゥリフレッシュ機能
 */
export const PullToRefresh = ({ onRefresh, children, threshold = 80 }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh?.().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  };

  return (
    <PullToRefreshContainer
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <PullIndicator
        pullDistance={pullDistance}
        threshold={threshold}
        isRefreshing={isRefreshing}
      >
        {isRefreshing ? (
          <LoadingSpinner size="small" />
        ) : (
          pullDistance >= threshold ? '離してリフレッシュ' : 'プルしてリフレッシュ'
        )}
      </PullIndicator>
      {children}
    </PullToRefreshContainer>
  );
};

/**
 * スワイプ可能なタブ
 */
export const SwipeableTabs = ({ tabs, activeTab, onTabChange, children }) => {
  const [currentIndex, setCurrentIndex] = useState(
    tabs.findIndex(tab => tab.id === activeTab)
  );

  const handleSwipeLeft = () => {
    const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
      onTabChange(tabs[nextIndex].id);
    }
  };

  const handleSwipeRight = () => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    if (prevIndex !== currentIndex) {
      setCurrentIndex(prevIndex);
      onTabChange(tabs[prevIndex].id);
    }
  };

  return (
    <SwipeableTabsContainer>
      <TabsHeader>
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            active={index === currentIndex}
            onClick={() => {
              setCurrentIndex(index);
              onTabChange(tab.id);
            }}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabsHeader>
      <SwipeableContainer
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
      >
        <TabContent>{children}</TabContent>
      </SwipeableContainer>
    </SwipeableTabsContainer>
  );
};

// スタイルコンポーネント
const SwipeContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: pan-y;
`;

const TouchButtonContainer = styled.button`
  position: relative;
  overflow: hidden;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  touch-action: manipulation;
  
  /* サイズ設定 */
  ${props => {
    switch (props.size) {
      case 'small':
        return `
          padding: 8px 16px;
          font-size: 14px;
          min-height: ${touchTarget.min};
        `;
      case 'large':
        return `
          padding: 16px 32px;
          font-size: 18px;
          min-height: ${touchTarget.comfortable};
        `;
      default:
        return `
          padding: 12px 24px;
          font-size: 16px;
          min-height: ${touchTarget.mobile};
        `;
    }
  }}
  
  /* バリエーション */
  ${props => {
    switch (props.variant) {
      case 'secondary':
        return `
          background: #6c757d;
          color: white;
          &:hover:not(:disabled) {
            background: #5a6268;
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: #007bff;
          border: 2px solid #007bff;
          &:hover:not(:disabled) {
            background: #007bff;
            color: white;
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #0056b3, #004085);
          }
        `;
    }
  }}
  
  /* 状態 */
  ${props => props.isPressed && `
    transform: scale(0.95);
    opacity: 0.8;
  `}
  
  ${props => props.disabled && `
    opacity: 0.6;
    cursor: not-allowed;
  `}
  
  ${props => props.loading && `
    pointer-events: none;
  `}
  
  /* レスポンシブ */
  ${breakpoints.tablet} {
    min-height: ${touchTarget.mobile};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
`;

const RippleEffect = styled.div`
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  pointer-events: none;
  animation: ripple 0.6s ease-out;
  
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  
  @keyframes ripple {
    0% {
      opacity: 1;
      transform: scale(0);
    }
    100% {
      opacity: 0;
      transform: scale(4);
    }
  }
`;

const LoadingSpinner = styled.div`
  width: ${props => props.size === 'small' ? '16px' : '20px'};
  height: ${props => props.size === 'small' ? '16px' : '20px'};
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const PullToRefreshContainer = styled.div`
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const PullIndicator = styled.div`
  text-align: center;
  padding: ${spacing.sm};
  color: #666;
  font-size: 14px;
  transform: translateY(${props => props.pullDistance - 50}px);
  transition: transform 0.3s ease;
  opacity: ${props => Math.min(props.pullDistance / props.threshold, 1)};
`;

const SwipeableTabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TabsHeader = styled.div`
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 ${spacing.sm};
`;

const TabButton = styled.button`
  flex: 1;
  padding: ${spacing.md};
  border: none;
  background: none;
  font-weight: 600;
  color: ${props => props.active ? '#007bff' : '#666'};
  border-bottom: 2px solid ${props => props.active ? '#007bff' : 'transparent'};
  transition: all 0.2s ease;
  min-height: ${touchTarget.mobile};
  touch-action: manipulation;
  
  &:focus {
    outline: none;
    background: rgba(0, 123, 255, 0.1);
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

export default {
  SwipeableContainer,
  TouchButton,
  PullToRefresh,
  SwipeableTabs
};