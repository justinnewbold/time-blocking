'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Haptics } from './iOSUtils';

// Define the tab order
const TABS = [
  { path: '/', label: 'Tasks', icon: '🐸' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/stats', label: 'Stats', icon: '📊' },
  { path: '/achievements', label: 'Badges', icon: '🏆' }
];

// Swipeable container for tab navigation
export default function SwipeableTabView({ children, currentTab = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef(null);
  const containerRef = useRef(null);
  
  const THRESHOLD = 80;
  const RESISTANCE = 2;
  const EDGE_WIDTH = 30; // Edge swipe detection area
  
  // Get current tab index
  const currentIndex = TABS.findIndex(t => t.path === pathname) ?? 0;
  
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isHorizontal.current = null;
    setSwiping(true);
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!swiping || transitioning) return;
    
    const touch = e.touches[0];
    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;
    
    // Determine direction on first significant move
    if (isHorizontal.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontal.current = Math.abs(diffX) > Math.abs(diffY) * 1.5;
    }
    
    if (isHorizontal.current) {
      // Check if we can swipe in this direction
      const canSwipeLeft = currentIndex < TABS.length - 1;
      const canSwipeRight = currentIndex > 0;
      
      let resistedDiff = diffX / RESISTANCE;
      
      // More resistance if we can't swipe in that direction
      if (diffX > 0 && !canSwipeRight) {
        resistedDiff = diffX / 5; // Much more resistance
      } else if (diffX < 0 && !canSwipeLeft) {
        resistedDiff = diffX / 5;
      }
      
      setOffset(resistedDiff);
    }
  }, [swiping, transitioning, currentIndex]);
  
  const handleTouchEnd = useCallback(() => {
    if (!swiping) return;
    setSwiping(false);
    
    const canSwipeLeft = currentIndex < TABS.length - 1;
    const canSwipeRight = currentIndex > 0;
    
    if (offset < -THRESHOLD && canSwipeLeft) {
      // Swipe left - go to next tab
      Haptics.medium();
      setTransitioning(true);
      setOffset(-window.innerWidth);
      setTimeout(() => {
        router.push(TABS[currentIndex + 1].path);
        setOffset(0);
        setTransitioning(false);
      }, 200);
    } else if (offset > THRESHOLD && canSwipeRight) {
      // Swipe right - go to previous tab
      Haptics.medium();
      setTransitioning(true);
      setOffset(window.innerWidth);
      setTimeout(() => {
        router.push(TABS[currentIndex - 1].path);
        setOffset(0);
        setTransitioning(false);
      }, 200);
    } else {
      // Snap back
      setOffset(0);
    }
  }, [swiping, offset, currentIndex, router]);
  
  // Reset offset when pathname changes
  useEffect(() => {
    setOffset(0);
  }, [pathname]);
  
  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Main content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {children}
      </div>
      
      {/* Tab indicators - show when swiping */}
      {Math.abs(offset) > 20 && (
        <>
          {/* Left indicator (previous tab) */}
          {currentIndex > 0 && offset > 20 && (
            <div 
              className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity"
              style={{ opacity: Math.min(offset / THRESHOLD, 1) }}
            >
              <span className="text-4xl">{TABS[currentIndex - 1].icon}</span>
              <span className="text-white/60 text-sm">{TABS[currentIndex - 1].label}</span>
            </div>
          )}
          
          {/* Right indicator (next tab) */}
          {currentIndex < TABS.length - 1 && offset < -20 && (
            <div 
              className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity"
              style={{ opacity: Math.min(Math.abs(offset) / THRESHOLD, 1) }}
            >
              <span className="text-4xl">{TABS[currentIndex + 1].icon}</span>
              <span className="text-white/60 text-sm">{TABS[currentIndex + 1].label}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Tab indicator dots
export function TabDots({ currentIndex }) {
  return (
    <div className="flex gap-1.5 justify-center py-2">
      {TABS.map((tab, i) => (
        <div
          key={tab.path}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            i === currentIndex 
              ? 'bg-white w-4' 
              : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  );
}

export { TABS };
