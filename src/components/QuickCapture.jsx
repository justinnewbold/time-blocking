'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Storage helper
const Storage = {
  get: (key, defaultValue) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(`focusflow_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`focusflow_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// Hook for quick capture
export function useQuickCapture(onAddTask) {
  const [isOpen, setIsOpen] = useState(false);
  const [captureHistory, setCaptureHistory] = useState(() =>
    Storage.get('captureHistory', [])
  );
  const [quickCaptureSettings, setQuickCaptureSettings] = useState(() =>
    Storage.get('quickCaptureSettings', {
      defaultCategory: 'personal',
      defaultDifficulty: 2,
      defaultEstimate: 25,
      autoClose: true,
      showConfirmation: true,
      keyboardShortcut: 'q'
    })
  );

  // Save to storage
  useEffect(() => {
    Storage.set('captureHistory', captureHistory);
  }, [captureHistory]);

  useEffect(() => {
    Storage.set('quickCaptureSettings', quickCaptureSettings);
  }, [quickCaptureSettings]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl/Cmd + configured key
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === quickCaptureSettings.keyboardShortcut) {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, quickCaptureSettings.keyboardShortcut]);

  // Quick capture task
  const captureTask = useCallback((title, options = {}) => {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      category: options.category || quickCaptureSettings.defaultCategory,
      difficulty: options.difficulty || quickCaptureSettings.defaultDifficulty,
      estimatedMinutes: options.estimatedMinutes || quickCaptureSettings.defaultEstimate,
      frog: options.frog || false,
      dueDate: options.dueDate || null,
      completed: false,
      created_at: new Date().toISOString(),
      source: 'quick_capture'
    };

    // Add to history
    setCaptureHistory(prev => {
      const updated = [
        { title: task.title, timestamp: task.created_at },
        ...prev
      ].slice(0, 20);
      return updated;
    });

    // Call the add task callback
    if (onAddTask) {
      onAddTask(task);
    }

    if (quickCaptureSettings.autoClose) {
      setIsOpen(false);
    }

    return task;
  }, [onAddTask, quickCaptureSettings]);

  // Capture multiple tasks (from paste)
  const captureMultiple = useCallback((text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const tasks = lines.map(line => captureTask(line.trim()));
    return tasks;
  }, [captureTask]);

  // Update settings
  const updateSettings = useCallback((updates) => {
    setQuickCaptureSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Open/close
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Clear history
  const clearHistory = useCallback(() => {
    setCaptureHistory([]);
  }, []);

  return {
    // State
    isOpen,
    captureHistory,
    quickCaptureSettings,

    // Actions
    open,
    close,
    toggle,
    captureTask,
    captureMultiple,
    updateSettings,
    clearHistory
  };
}

// Quick Capture Input
export function QuickCaptureInput({ onCapture, onClose, settings, history }) {
  const [value, setValue] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [category, setCategory] = useState(settings.defaultCategory);
  const [difficulty, setDifficulty] = useState(settings.defaultDifficulty);
  const [dueDate, setDueDate] = useState('');
  const [isFrog, setIsFrog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;

    // Check if pasting multiple lines
    if (value.includes('\n')) {
      const lines = value.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        onCapture(line.trim(), { category, difficulty, dueDate: dueDate || null, frog: isFrog });
      });
    } else {
      onCapture(value.trim(), { category, difficulty, dueDate: dueDate || null, frog: isFrog });
    }

    if (settings.showConfirmation) {
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 1500);
    }

    setValue('');
    setShowAdvanced(false);
    setIsFrog(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Ctrl/Cmd + Enter for quick submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const categories = ['personal', 'work', 'health', 'learning', 'errands', 'creative'];

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you need to do?"
            className="glass-input w-full px-4 py-3 pr-24 rounded-xl text-lg"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40"
            >
              ⚙️
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
            >
              ➕
            </button>
          </div>
        </div>
      </form>

      {showAdvanced && (
        <div className="p-3 rounded-xl bg-white/5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-1 rounded-lg text-xs capitalize ${
                  category === cat
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`text-lg ${d <= difficulty ? 'opacity-100' : 'opacity-30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="glass-input px-2 py-1 rounded-lg text-sm flex-1"
              placeholder="Due date"
            />

            <button
              onClick={() => setIsFrog(!isFrog)}
              className={`text-xl ${isFrog ? 'opacity-100' : 'opacity-30'}`}
            >
              🐸
            </button>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="text-center text-green-400 animate-pulse">
          ✓ Task added!
        </div>
      )}

      <div className="text-xs text-white/40 flex items-center justify-between">
        <span>Tip: Paste multiple lines to add several tasks at once</span>
        <span>⌘+Enter to submit</span>
      </div>

      {history.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-white/40 mb-2">Recently added:</p>
          <div className="space-y-1">
            {history.slice(0, 3).map((item, i) => (
              <div key={i} className="text-sm text-white/60 truncate">
                {item.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Floating Quick Capture Button
export function QuickCaptureButton({ onClick, shortcut = 'Q' }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-40 group"
      title={`Quick Capture (Ctrl+${shortcut})`}
    >
      <span className="text-2xl">➕</span>
      <span className="absolute -top-8 right-0 px-2 py-1 rounded bg-black/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Ctrl+{shortcut}
      </span>
    </button>
  );
}

// Quick Capture Modal
export function QuickCaptureModal({ isOpen, onClose, captureState }) {
  if (!isOpen) return null;

  const {
    captureTask,
    captureHistory,
    quickCaptureSettings
  } = captureState;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="glass-card max-w-lg w-full p-4 animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            ⚡ Quick Capture
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <QuickCaptureInput
          onCapture={captureTask}
          onClose={onClose}
          settings={quickCaptureSettings}
          history={captureHistory}
        />
      </div>
    </div>
  );
}

// Quick Capture Settings Panel
export function QuickCaptureSettings({ settings, onChange }) {
  const categories = ['personal', 'work', 'health', 'learning', 'errands', 'creative'];

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Quick Capture Settings</h4>

      <div>
        <label className="text-sm text-white/60 block mb-1">Default Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onChange({ defaultCategory: cat })}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                settings.defaultCategory === cat
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-white/60 block mb-1">Default Difficulty</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(d => (
            <button
              key={d}
              onClick={() => onChange({ defaultDifficulty: d })}
              className={`flex-1 py-2 rounded-lg ${
                settings.defaultDifficulty === d
                  ? 'bg-blue-500/30'
                  : 'bg-white/10'
              }`}
            >
              {'⭐'.repeat(d)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-white/60 block mb-1">Default Time Estimate</label>
        <div className="flex gap-2">
          {[15, 25, 30, 45, 60].map(mins => (
            <button
              key={mins}
              onClick={() => onChange({ defaultEstimate: mins })}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                settings.defaultEstimate === mins
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between">
        <span className="text-sm">Auto-close after adding</span>
        <button
          onClick={() => onChange({ autoClose: !settings.autoClose })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.autoClose ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            settings.autoClose ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <label className="flex items-center justify-between">
        <span className="text-sm">Show confirmation</span>
        <button
          onClick={() => onChange({ showConfirmation: !settings.showConfirmation })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.showConfirmation ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            settings.showConfirmation ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <div>
        <label className="text-sm text-white/60 block mb-1">Keyboard Shortcut</label>
        <div className="flex items-center gap-2">
          <span className="text-sm">Ctrl/⌘ +</span>
          <input
            type="text"
            value={settings.keyboardShortcut}
            onChange={(e) => onChange({ keyboardShortcut: e.target.value.slice(-1).toLowerCase() })}
            className="glass-input w-12 px-2 py-1 rounded-lg text-center uppercase"
            maxLength={1}
          />
        </div>
      </div>
    </div>
  );
}

export default QuickCaptureModal;
