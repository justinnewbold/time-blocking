'use client';

import { useState, useRef, useCallback } from 'react';
import { Haptics } from './iOSUtils';

// iOS-style pull to refresh
export default function PullToRefresh({ 
  children, 
  onRefresh,
  className = ''
}) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  
  const THRESHOLD = 70;
  const MAX_PULL = 100;
  const RESISTANCE = 2.5;
  
  const handleTouchStart = useCallback((e) => {
    if (containerRef.current) {
      scrollTop.current = containerRef.current.scrollTop;
      if (scrollTop.current <= 0) {
        startY.current = e.touches[0].clientY;
        setPulling(true);
      }
    }
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    if (scrollTop.current > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff / RESISTANCE, MAX_PULL);
      setPullDistance(distance);
      
      // Haptic at threshold
      if (distance >= THRESHOLD && pullDistance < THRESHOLD) {
        Haptics.medium();
      }
    }
  }, [pulling, refreshing, pullDistance]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.7); // Show spinner at reduced height
      Haptics.success();
      
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    setPulling(false);
  }, [pulling, pullDistance, refreshing, onRefresh]);
  
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 180;
  const scale = 0.5 + progress * 0.5;
  
  return (
    <div className={`relative ${className}`}>
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-10"
        style={{
          top: 0,
          height: pullDistance,
          opacity: progress,
          transition: pulling ? 'none' : 'all 0.3s ease-out'
        }}
      >
        <div 
          className="relative"
          style={{
            transform: `scale(${scale})`,
            transition: pulling ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {refreshing ? (
            // Spinning loader
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          ) : (
            // Pull arrow
            <div 
              className="w-8 h-8 flex items-center justify-center"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: pulling ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-white/60 ${progress >= 1 ? 'text-white' : ''}`}
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Content container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pulling ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
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
