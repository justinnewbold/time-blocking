'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Haptics } from './iOSUtils';

// iOS-style bottom sheet with drag to dismiss
export default function BottomSheet({ 
  isOpen, 
  onClose, 
  children,
  title,
  showHandle = true,
  snapPoints = [0.5, 0.9], // Percentage of screen height
  initialSnap = 0,
  allowFullClose = true
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isClosing, setIsClosing] = useState(false);
  
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  
  const CLOSE_THRESHOLD = 150;
  const VELOCITY_THRESHOLD = 0.5;
  
  // Get sheet height based on snap point
  const getSheetHeight = (snapIndex) => {
    if (typeof window === 'undefined') return 400;
    return window.innerHeight * snapPoints[snapIndex];
  };
  
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    startOffset.current = dragOffset;
    lastY.current = touch.clientY;
    lastTime.current = Date.now();
    setIsDragging(true);
  }, [dragOffset]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const diff = currentY - startY.current;
    
    // Calculate velocity
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (currentY - lastY.current) / dt;
    }
    lastY.current = currentY;
    lastTime.current = now;
    
    // Only allow dragging down (positive diff)
    if (diff > 0 || startOffset.current > 0) {
      e.preventDefault();
      const newOffset = Math.max(0, startOffset.current + diff);
      setDragOffset(newOffset);
      
      // Haptic at close threshold
      if (newOffset > CLOSE_THRESHOLD && startOffset.current + diff <= CLOSE_THRESHOLD) {
        Haptics.light();
      }
    }
  }, [isDragging]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const shouldClose = 
      (dragOffset > CLOSE_THRESHOLD && allowFullClose) || 
      (velocity.current > VELOCITY_THRESHOLD && allowFullClose);
    
    if (shouldClose) {
      Haptics.medium();
      setIsClosing(true);
      setDragOffset(window.innerHeight);
      setTimeout(() => {
        onClose?.();
        setIsClosing(false);
        setDragOffset(0);
      }, 300);
    } else {
      // Snap back
      setDragOffset(0);
      Haptics.light();
    }
  }, [isDragging, dragOffset, allowFullClose, onClose]);
  
  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setDragOffset(0);
      setIsClosing(false);
      setCurrentSnap(initialSnap);
    }
  }, [isOpen, initialSnap]);
  
  if (!isOpen && !isClosing) return null;
  
  const sheetHeight = getSheetHeight(currentSnap);
  const translateY = dragOffset;
  const opacity = Math.max(0, 1 - (dragOffset / (sheetHeight * 0.5)));
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity }}
        onClick={() => {
          if (allowFullClose) {
            Haptics.light();
            setIsClosing(true);
            setDragOffset(window.innerHeight);
            setTimeout(() => {
              onClose?.();
              setIsClosing(false);
              setDragOffset(0);
            }, 300);
          }
        }}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-[#1c1c1e]/95 backdrop-blur-xl rounded-t-3xl overflow-hidden"
        style={{
          maxHeight: `${snapPoints[snapPoints.length - 1] * 100}vh`,
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div 
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-9 h-1 bg-white/30 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white text-center">{title}</h2>
          </div>
        )}
        
        {/* Content */}
        <div 
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: `calc(${snapPoints[snapPoints.length - 1] * 100}vh - 60px)` }}
        >
          {children}
        </div>
        
        {/* Safe area padding */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
}

// Simple confirmation sheet
export function ConfirmSheet({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDestructive = false
}) {
  const handleConfirm = () => {
    Haptics.medium();
    onConfirm?.();
    onClose?.();
  };
  
  const handleCancel = () => {
    Haptics.light();
    onClose?.();
  };
  
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} showHandle={false}>
      <div className="p-6 text-center">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        {message && <p className="text-white/60 mb-6">{message}</p>}
        
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] ${
              confirmDestructive 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-4 rounded-2xl font-semibold text-lg text-white/60 bg-white/5 transition-all active:scale-[0.98]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
