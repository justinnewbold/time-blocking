'use client';

import { useState, useRef, useCallback } from 'react';
import { Haptics } from './iOSUtils';

// Swipeable Task Card with iOS-style actions
export default function SwipeableTask({ 
  task, 
  category,
  children,
  onSwipeRight, // Complete
  onSwipeLeft,  // Delete
  onLongPress,  // Context menu
  disabled = false
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const [actionTriggered, setActionTriggered] = useState(null);
  
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef(null);
  const longPressTimer = useRef(null);
  const containerRef = useRef(null);
  
  const THRESHOLD = 80;
  const MAX_SWIPE = 100;
  const RESISTANCE = 1.2;
  const LONG_PRESS_DELAY = 500;
  
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
    setActionTriggered(null);
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      Haptics.heavy();
      onLongPress?.(task);
      setSwiping(false);
      setOffset(0);
    }, LONG_PRESS_DELAY);
  }, [disabled, task, onLongPress]);
  
  const handleTouchMove = useCallback((e) => {
    if (!swiping || disabled) return;
    
    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const diffX = e.touches[0].clientX - startX.current;
    const diffY = e.touches[0].clientY - startY.current;
    
    // Determine direction on first significant move
    if (isHorizontal.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    if (isHorizontal.current) {
      e.preventDefault();
      
      // Apply resistance and clamp
      let resistedDiff = diffX / RESISTANCE;
      
      // More resistance in the "wrong" direction if one action is disabled
      if (!onSwipeRight && diffX > 0) resistedDiff *= 0.3;
      if (!onSwipeLeft && diffX < 0) resistedDiff *= 0.3;
      
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, resistedDiff));
      setOffset(clampedOffset);
      
      // Show action indicators
      setShowRightAction(clampedOffset > 30);
      setShowLeftAction(clampedOffset < -30);
      
      // Haptic at thresholds
      if (clampedOffset >= THRESHOLD && !actionTriggered) {
        Haptics.medium();
        setActionTriggered('right');
      } else if (clampedOffset <= -THRESHOLD && !actionTriggered) {
        Haptics.medium();
        setActionTriggered('left');
      } else if (Math.abs(clampedOffset) < THRESHOLD && actionTriggered) {
        Haptics.light();
        setActionTriggered(null);
      }
    }
  }, [swiping, disabled, actionTriggered, onSwipeRight, onSwipeLeft]);
  
  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (!swiping || disabled) return;
    
    const triggered = Math.abs(offset) >= THRESHOLD;
    
    if (triggered) {
      if (offset >= THRESHOLD && onSwipeRight) {
        // Animate out to the right
        setOffset(300);
        Haptics.success();
        setTimeout(() => {
          onSwipeRight(task);
          setOffset(0);
        }, 200);
      } else if (offset <= -THRESHOLD && onSwipeLeft) {
        // Animate out to the left
        setOffset(-300);
        Haptics.impact('heavy');
        setTimeout(() => {
          onSwipeLeft(task);
          setOffset(0);
        }, 200);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
    
    setSwiping(false);
    setShowLeftAction(false);
    setShowRightAction(false);
    setActionTriggered(null);
  }, [swiping, disabled, offset, task, onSwipeRight, onSwipeLeft]);
  
  const isTriggeredRight = offset >= THRESHOLD;
  const isTriggeredLeft = offset <= -THRESHOLD;
  
  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left Action (Delete) - Red */}
      <div 
        className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-all duration-200 ${
          showLeftAction ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: Math.abs(Math.min(offset, 0)) + 60,
          backgroundColor: isTriggeredLeft ? '#ef4444' : '#f87171'
        }}
      >
        <div className={`flex flex-col items-center transition-transform ${isTriggeredLeft ? 'scale-125' : 'scale-100'}`}>
          <span className="text-2xl">🗑️</span>
          <span className="text-white text-xs font-medium mt-1">Delete</span>
        </div>
      </div>
      
      {/* Right Action (Complete) - Green */}
      <div 
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-all duration-200 ${
          showRightAction ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: Math.max(offset, 0) + 60,
          backgroundColor: isTriggeredRight ? '#22c55e' : '#4ade80'
        }}
      >
        <div className={`flex flex-col items-center transition-transform ${isTriggeredRight ? 'scale-125' : 'scale-100'}`}>
          <span className="text-2xl">✓</span>
          <span className="text-white text-xs font-medium mt-1">Done</span>
        </div>
      </div>
      
      {/* Task Content */}
      <div
        className="relative bg-white/5 backdrop-blur-xl"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
