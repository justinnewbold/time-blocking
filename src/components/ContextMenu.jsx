'use client';

import { useEffect, useRef } from 'react';
import { Haptics } from './iOSUtils';

// iOS-style context menu / action sheet
export default function ContextMenu({ 
  isOpen, 
  onClose, 
  task,
  position, // { x, y } or null for bottom sheet style
  actions = []
}) {
  const menuRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleAction = (action) => {
    if (action.destructive) {
      Haptics.impact('heavy');
    } else {
      Haptics.medium();
    }
    action.onPress?.(task);
    onClose?.();
  };
  
  // Group actions by type
  const regularActions = actions.filter(a => !a.destructive && !a.cancel);
  const destructiveActions = actions.filter(a => a.destructive);
  const cancelAction = actions.find(a => a.cancel);
  
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => {
          Haptics.light();
          onClose?.();
        }}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className="relative mx-3 mb-3 animate-slide-up-spring"
      >
        {/* Task Preview */}
        {task && (
          <div className="bg-[#2c2c2e]/95 backdrop-blur-xl rounded-2xl mb-2 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10">
              <span className="text-2xl">{task.emoji || '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{task.title}</p>
                <p className="text-white/40 text-xs">
                  {'⭐'.repeat(task.difficulty || 2)} • {task.estimatedMinutes || 25}m
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Regular Actions */}
        <div className="bg-[#2c2c2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden mb-2">
          {regularActions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => handleAction(action)}
              className={`w-full px-4 py-4 flex items-center gap-3 active:bg-white/10 transition-colors ${
                i > 0 ? 'border-t border-white/10' : ''
              }`}
            >
              <span className="text-xl w-8 text-center">{action.icon}</span>
              <span className="text-white text-[17px]">{action.label}</span>
            </button>
          ))}
          
          {/* Destructive Actions */}
          {destructiveActions.map((action, i) => (
            <button
              key={action.label}
              onClick={() => handleAction(action)}
              className={`w-full px-4 py-4 flex items-center gap-3 active:bg-white/10 transition-colors border-t border-white/10`}
            >
              <span className="text-xl w-8 text-center">{action.icon}</span>
              <span className="text-red-400 text-[17px]">{action.label}</span>
            </button>
          ))}
        </div>
        
        {/* Cancel Button */}
        {cancelAction && (
          <button
            onClick={() => {
              Haptics.light();
              onClose?.();
            }}
            className="w-full bg-[#2c2c2e]/95 backdrop-blur-xl rounded-2xl py-4 active:bg-white/10 transition-colors"
          >
            <span className="text-[#0a84ff] text-[17px] font-semibold">
              {cancelAction.label || 'Cancel'}
            </span>
          </button>
        )}
      </div>
      
      {/* Safe area */}
      <div className="h-safe-area-bottom bg-transparent" />
    </div>
  );
}

// Pre-built task context menu
export function TaskContextMenu({ isOpen, onClose, task, onComplete, onDelete, onSetReminder, onSetFrog, onEdit }) {
  const actions = [
    {
      icon: '✓',
      label: 'Complete Task',
      onPress: onComplete
    },
    {
      icon: '🐸',
      label: task?.frog ? 'Remove Frog Status' : 'Mark as Daily Frog',
      onPress: onSetFrog
    },
    {
      icon: '🔔',
      label: 'Set Reminder',
      onPress: onSetReminder
    },
    {
      icon: '✏️',
      label: 'Edit Task',
      onPress: onEdit
    },
    {
      icon: '🗑️',
      label: 'Delete Task',
      destructive: true,
      onPress: onDelete
    },
    {
      label: 'Cancel',
      cancel: true
    }
  ];
  
  return (
    <ContextMenu
      isOpen={isOpen}
      onClose={onClose}
      task={task}
      actions={actions}
    />
  );
}
