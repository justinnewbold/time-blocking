'use client';

import { useEffect, useCallback, useState } from 'react';

// Keyboard shortcut definitions
export const SHORTCUTS = {
  // Task Management
  'n': { action: 'newTask', description: 'New task', category: 'Tasks' },
  'f': { action: 'markFrog', description: 'Mark as Frog', category: 'Tasks' },
  'd': { action: 'deleteTask', description: 'Delete selected task', category: 'Tasks' },
  'e': { action: 'editTask', description: 'Edit selected task', category: 'Tasks' },
  'Enter': { action: 'completeTask', description: 'Complete selected task', category: 'Tasks' },
  'Escape': { action: 'closeModal', description: 'Close modal / Deselect', category: 'General' },

  // Navigation
  'j': { action: 'nextTask', description: 'Select next task', category: 'Navigation' },
  'k': { action: 'prevTask', description: 'Select previous task', category: 'Navigation' },
  '1': { action: 'goHome', description: 'Go to Home', category: 'Navigation' },
  '2': { action: 'goStats', description: 'Go to Stats', category: 'Navigation' },
  '3': { action: 'goCalendar', description: 'Go to Calendar', category: 'Navigation' },
  '4': { action: 'goAchievements', description: 'Go to Achievements', category: 'Navigation' },

  // Timer
  's': { action: 'startTimer', description: 'Start focus timer', category: 'Timer' },
  'p': { action: 'pauseTimer', description: 'Pause/Resume timer', category: 'Timer' },
  'x': { action: 'stopTimer', description: 'Stop timer', category: 'Timer' },

  // Quick Actions
  't': { action: 'openTop3', description: 'Open Top 3 picker', category: 'Quick Actions' },
  'q': { action: 'quickWins', description: 'Show quick wins', category: 'Quick Actions' },
  '/': { action: 'search', description: 'Search tasks', category: 'Quick Actions' },
  '?': { action: 'showHelp', description: 'Show shortcuts help', category: 'Quick Actions' },

  // Settings
  ',': { action: 'openSettings', description: 'Open settings', category: 'Settings' },
};

// Modifier key shortcuts (Cmd/Ctrl + key)
export const MOD_SHORTCUTS = {
  's': { action: 'save', description: 'Save/Sync', category: 'General' },
  'z': { action: 'undo', description: 'Undo last action', category: 'General' },
  'Shift+z': { action: 'redo', description: 'Redo last action', category: 'General' },
  'e': { action: 'exportData', description: 'Export data', category: 'Data' },
  'i': { action: 'importData', description: 'Import data', category: 'Data' },
};

export function useKeyboardShortcuts({
  enabled = true,
  onAction,
  selectedTaskIndex = -1,
  tasksLength = 0,
}) {
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Track input focus
  useEffect(() => {
    const handleFocusIn = (e) => {
      const tagName = e.target.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable;
      setIsInputFocused(isInput);
    };

    const handleFocusOut = () => {
      setIsInputFocused(false);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!enabled || isInputFocused) return;

    const key = e.key;
    const isMod = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // Handle modifier shortcuts
    if (isMod) {
      const modKey = isShift ? `Shift+${key.toLowerCase()}` : key.toLowerCase();
      const modShortcut = MOD_SHORTCUTS[modKey];
      if (modShortcut) {
        e.preventDefault();
        onAction?.(modShortcut.action, { key: modKey, shift: isShift });
        return;
      }
    }

    // Handle regular shortcuts
    const shortcut = SHORTCUTS[key];
    if (shortcut) {
      // Don't prevent default for numbers if not in our app
      if (/^[1-4]$/.test(key)) {
        e.preventDefault();
      }
      onAction?.(shortcut.action, { key, selectedTaskIndex, tasksLength });
    }
  }, [enabled, isInputFocused, onAction, selectedTaskIndex, tasksLength]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isInputFocused };
}

// Keyboard shortcuts help modal
export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const categories = {};

  // Group shortcuts by category
  Object.entries(SHORTCUTS).forEach(([key, shortcut]) => {
    if (!categories[shortcut.category]) {
      categories[shortcut.category] = [];
    }
    categories[shortcut.category].push({ key, ...shortcut });
  });

  // Add modifier shortcuts
  Object.entries(MOD_SHORTCUTS).forEach(([key, shortcut]) => {
    if (!categories[shortcut.category]) {
      categories[shortcut.category] = [];
    }
    categories[shortcut.category].push({
      key: `⌘${key.includes('Shift') ? '⇧' + key.replace('Shift+', '') : key}`,
      ...shortcut,
      isMod: true
    });
  });

  const categoryOrder = ['Tasks', 'Navigation', 'Timer', 'Quick Actions', 'Settings', 'General', 'Data'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 glass-card p-6 rounded-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⌨️</span> Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryOrder.map(category => {
            const shortcuts = categories[category];
            if (!shortcuts?.length) return null;

            return (
              <div key={category}>
                <h3 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 glass-card rounded-lg"
                    >
                      <span className="text-white/80 text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded text-white/90 text-xs font-mono min-w-[2rem] text-center">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">
            Press <kbd className="px-1 bg-white/10 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

// Visual indicator for current shortcut
export function ShortcutToast({ action, visible }) {
  if (!visible) return null;

  const actionLabels = {
    newTask: '➕ New Task',
    markFrog: '🐸 Mark as Frog',
    deleteTask: '🗑️ Delete Task',
    completeTask: '✅ Complete Task',
    startTimer: '▶️ Start Timer',
    pauseTimer: '⏸️ Pause Timer',
    stopTimer: '⏹️ Stop Timer',
    openTop3: '🎯 Top 3 Picker',
    quickWins: '⚡ Quick Wins',
    openSettings: '⚙️ Settings',
    exportData: '📥 Export Data',
    save: '💾 Saved',
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="glass-card px-4 py-2 rounded-full text-white text-sm font-medium">
        {actionLabels[action] || action}
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
