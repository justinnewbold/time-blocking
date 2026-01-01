'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// HAPTIC FEEDBACK
// ============================================

export const Haptics = {
  // Light tap - for selections, toggles
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  // Medium tap - for button presses
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  
  // Heavy tap - for significant actions
  heavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },
  
  // Success pattern - for completions
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 50, 20]);
    }
  },
  
  // Warning pattern
  warning: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 40, 20, 40, 20]);
    }
  },
  
  // Error pattern
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  },
  
  // Selection changed
  selection: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
  },
  
  // Impact - for collisions, drops
  impact: (style = 'medium') => {
    const patterns = {
      light: 10,
      medium: 25,
      heavy: 40
    };
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(patterns[style] || 25);
    }
  }
};

// ============================================
// SPRING ANIMATIONS (CSS Variables)
// ============================================

export const SpringConfig = {
  // iOS-like bouncy spring
  bouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 1
  },
  // Gentle spring
  gentle: {
    type: 'spring', 
    stiffness: 150,
    damping: 15,
    mass: 1
  },
  // Snappy spring
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 1
  },
  // Default iOS spring
  default: {
    type: 'spring',
    stiffness: 250,
    damping: 25,
    mass: 1
  }
};

// CSS spring animation helper
export function springAnimation(from, to, config = SpringConfig.default) {
  // This creates CSS keyframes that approximate spring physics
  const { stiffness, damping, mass } = config;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  return {
    transition: `all ${0.6}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`
  };
}

// ============================================
// PULL TO REFRESH HOOK
// ============================================

export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    maxPull = 120,
    resistance = 2.5
  } = options;
  
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef(null);
  
  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      // Apply resistance
      const distance = Math.min(diff / resistance, maxPull);
      setPullDistance(distance);
      
      // Haptic feedback at threshold
      if (distance >= threshold && pullDistance < threshold) {
        Haptics.medium();
      }
    }
  }, [pulling, refreshing, threshold, maxPull, resistance, pullDistance]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      Haptics.success();
      
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);
  
  return {
    containerRef,
    pullDistance,
    refreshing,
    isPulling: pulling && pullDistance > 0,
    isReady: pullDistance >= threshold,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

// ============================================
// SWIPE GESTURE HOOK
// ============================================

export function useSwipeGesture(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 80,
    maxSwipe = 100,
    resistance = 1.5
  } = options;
  
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef(null);
  
  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!swiping) return;
    
    const diffX = e.touches[0].clientX - startX.current;
    const diffY = e.touches[0].clientY - startY.current;
    
    // Determine direction on first significant move
    if (isHorizontal.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    if (isHorizontal.current) {
      e.preventDefault();
      // Apply resistance and clamp
      const resistedDiff = diffX / resistance;
      const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, resistedDiff));
      setOffset(clampedOffset);
      
      // Haptic at thresholds
      if (Math.abs(clampedOffset) >= threshold && Math.abs(offset) < threshold) {
        Haptics.light();
      }
    }
  }, [swiping, threshold, maxSwipe, resistance, offset]);
  
  const handleTouchEnd = useCallback(() => {
    if (!swiping) return;
    
    if (offset <= -threshold) {
      Haptics.medium();
      onSwipeLeft?.();
    } else if (offset >= threshold) {
      Haptics.medium();
      onSwipeRight?.();
    }
    
    setSwiping(false);
    setOffset(0);
  }, [swiping, offset, threshold, onSwipeLeft, onSwipeRight]);
  
  return {
    offset,
    isSwiping: swiping && isHorizontal.current,
    swipeDirection: offset < 0 ? 'left' : offset > 0 ? 'right' : null,
    isTriggered: Math.abs(offset) >= threshold,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

// ============================================
// LONG PRESS HOOK
// ============================================

export function useLongPress(onLongPress, options = {}) {
  const {
    delay = 500,
    onStart,
    onCancel
  } = options;
  
  const [pressing, setPressing] = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const timeoutRef = useRef(null);
  const targetRef = useRef(null);
  
  const start = useCallback((e) => {
    targetRef.current = e.target;
    setPressing(true);
    onStart?.();
    
    timeoutRef.current = setTimeout(() => {
      Haptics.heavy();
      setLongPressed(true);
      onLongPress?.(e);
    }, delay);
  }, [delay, onLongPress, onStart]);
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPressing(false);
    setLongPressed(false);
    onCancel?.();
  }, [onCancel]);
  
  const handlers = {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: (e) => {
      // Cancel if moved too far
      const touch = e.touches[0];
      const target = targetRef.current?.getBoundingClientRect();
      if (target) {
        const isOutside = 
          touch.clientX < target.left - 10 ||
          touch.clientX > target.right + 10 ||
          touch.clientY < target.top - 10 ||
          touch.clientY > target.bottom + 10;
        if (isOutside) cancel();
      }
    },
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel
  };
  
  return {
    pressing,
    longPressed,
    handlers
  };
}

// ============================================
// RUBBER BAND SCROLL HOOK
// ============================================

export function useRubberBandScroll(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let startY = 0;
    let startScrollTop = 0;
    
    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      startScrollTop = container.scrollTop;
    };
    
    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // At top, pulling down
      if (container.scrollTop <= 0 && diff > 0) {
        container.style.transform = `translateY(${Math.min(diff * 0.3, 50)}px)`;
        container.style.transition = 'none';
      }
      // At bottom, pulling up
      else if (container.scrollTop + container.clientHeight >= container.scrollHeight && diff < 0) {
        container.style.transform = `translateY(${Math.max(diff * 0.3, -50)}px)`;
        container.style.transition = 'none';
      }
    };
    
    const handleTouchEnd = () => {
      container.style.transform = 'translateY(0)';
      container.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef]);
}

// ============================================
// iOS BUTTON PRESS ANIMATION
// ============================================

export function usePressAnimation() {
  const [pressed, setPressed] = useState(false);
  
  const handlers = {
    onTouchStart: () => {
      setPressed(true);
      Haptics.light();
    },
    onTouchEnd: () => setPressed(false),
    onTouchCancel: () => setPressed(false),
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false)
  };
  
  const style = {
    transform: pressed ? 'scale(0.97)' : 'scale(1)',
    opacity: pressed ? 0.8 : 1,
    transition: pressed 
      ? 'transform 0.1s ease-out, opacity 0.1s ease-out'
      : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.2s ease-out'
  };
  
  return { pressed, handlers, style };
}

export default Haptics;
