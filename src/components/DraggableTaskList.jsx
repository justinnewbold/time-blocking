'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Haptics } from './iOSUtils';

// Draggable task list with reorder functionality
export default function DraggableTaskList({ 
  children, 
  items,
  onReorder,
  disabled = false 
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialY, setInitialY] = useState(0);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const longPressTimer = useRef(null);
  const isDragging = useRef(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  const handleTouchStart = useCallback((index, e) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    setInitialY(touch.clientY);
    
    // Start long press detection for drag
    longPressTimer.current = setTimeout(() => {
      Haptics.medium();
      isDragging.current = true;
      setDraggingIndex(index);
      setDragOffset({ x: 0, y: 0 });
    }, 500); // 500ms long press to start drag
  }, [disabled]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || draggingIndex === null) {
      // Cancel long press if moved too much before drag starts
      if (longPressTimer.current) {
        const touch = e.touches[0];
        const moveDistance = Math.abs(touch.clientY - initialY);
        if (moveDistance > 10) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }
    
    e.preventDefault();
    const touch = e.touches[0];
    const newY = touch.clientY - initialY;
    setDragOffset({ x: 0, y: newY });
    
    // Calculate which item we're over
    if (containerRef.current && itemRefs.current.length > 0) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const touchY = touch.clientY - containerRect.top;
      
      let newOverIndex = null;
      itemRefs.current.forEach((ref, idx) => {
        if (ref && idx !== draggingIndex) {
          const rect = ref.getBoundingClientRect();
          const itemY = rect.top - containerRect.top + rect.height / 2;
          
          if (touchY > itemY - rect.height / 2 && touchY < itemY + rect.height / 2) {
            newOverIndex = idx;
          }
        }
      });
      
      if (newOverIndex !== null && newOverIndex !== dragOverIndex) {
        Haptics.selection();
        setDragOverIndex(newOverIndex);
      }
    }
  }, [draggingIndex, dragOverIndex, initialY]);
  
  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isDragging.current && draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      // Reorder items
      Haptics.medium();
      onReorder?.(draggingIndex, dragOverIndex);
    }
    
    isDragging.current = false;
    setDraggingIndex(null);
    setDragOverIndex(null);
    setDragOffset({ x: 0, y: 0 });
  }, [draggingIndex, dragOverIndex, onReorder]);
  
  // Add global touch handlers when dragging
  useEffect(() => {
    if (draggingIndex !== null) {
      const handleGlobalMove = (e) => handleTouchMove(e);
      const handleGlobalEnd = () => handleTouchEnd();
      
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [draggingIndex, handleTouchMove, handleTouchEnd]);
  
  return (
    <div ref={containerRef} className="relative">
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={items?.[index]?.id || index}
          ref={el => itemRefs.current[index] = el}
          onTouchStart={(e) => handleTouchStart(index, e)}
          className={`relative transition-transform duration-200 ${
            draggingIndex === index 
              ? 'z-50 opacity-90 scale-105 shadow-2xl' 
              : dragOverIndex === index
                ? draggingIndex !== null && draggingIndex < index
                  ? 'translate-y-[-8px]'
                  : 'translate-y-[8px]'
                : ''
          }`}
          style={{
            transform: draggingIndex === index 
              ? `translateY(${dragOffset.y}px) scale(1.03)` 
              : undefined,
            transition: draggingIndex === index ? 'none' : undefined,
          }}
        >
          {/* Drag handle indicator */}
          {draggingIndex === index && (
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-green-500 rounded-full" />
          )}
          {child}
        </div>
      )) : children}
      
      {/* Drop indicator line */}
      {dragOverIndex !== null && draggingIndex !== null && (
        <div 
          className="absolute left-0 right-0 h-1 bg-green-500 rounded-full z-40 transition-all duration-150"
          style={{
            top: itemRefs.current[dragOverIndex]
              ? draggingIndex < dragOverIndex
                ? itemRefs.current[dragOverIndex].offsetTop + itemRefs.current[dragOverIndex].offsetHeight
                : itemRefs.current[dragOverIndex].offsetTop - 4
              : 0
          }}
        />
      )}
    </div>
  );
}

// Simple sortable list without complex drag (tap to select, tap to place)
export function TapToReorderList({ 
  children, 
  items,
  onReorder,
  disabled = false 
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  const handleItemTap = useCallback((index) => {
    if (disabled) return;
    
    if (selectedIndex === null) {
      // First tap - select item
      Haptics.medium();
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      // Tap same item - deselect
      Haptics.light();
      setSelectedIndex(null);
    } else {
      // Tap different item - swap/move
      Haptics.success();
      onReorder?.(selectedIndex, index);
      setSelectedIndex(null);
    }
  }, [selectedIndex, disabled, onReorder]);
  
  return (
    <div className="relative">
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={items?.[index]?.id || index}
          onClick={() => handleItemTap(index)}
          className={`relative cursor-pointer transition-all duration-200 ${
            selectedIndex === index 
              ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-transparent scale-[1.02] z-10' 
              : selectedIndex !== null
                ? 'opacity-60 hover:opacity-100'
                : ''
          }`}
        >
          {/* Selection indicator */}
          {selectedIndex === index && (
            <div className="absolute -right-1 -top-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-20 shadow-lg">
              ↕
            </div>
          )}
          {child}
        </div>
      )) : children}
      
      {/* Instructions */}
      {selectedIndex !== null && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-white/80 z-50 animate-slide-up">
          Tap another task to swap positions
        </div>
      )}
    </div>
  );
}

// Hook for managing reorderable list state
export function useReorderableList(initialItems, storageKey) {
  const [items, setItems] = useState(initialItems);
  
  // Load saved order
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const savedOrder = localStorage.getItem(`frog_${storageKey}_order`);
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder);
          const reordered = orderIds
            .map(id => initialItems.find(item => item.id === id))
            .filter(Boolean);
          // Add any new items not in saved order
          const newItems = initialItems.filter(
            item => !orderIds.includes(item.id)
          );
          setItems([...reordered, ...newItems]);
        } catch (e) {
          setItems(initialItems);
        }
      } else {
        setItems(initialItems);
      }
    }
  }, [initialItems, storageKey]);
  
  const reorder = useCallback((fromIndex, toIndex) => {
    setItems(prev => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      
      // Save order
      if (storageKey && typeof window !== 'undefined') {
        const orderIds = newItems.map(item => item.id);
        localStorage.setItem(`frog_${storageKey}_order`, JSON.stringify(orderIds));
      }
      
      return newItems;
    });
  }, [storageKey]);
  
  return [items, reorder, setItems];
}
