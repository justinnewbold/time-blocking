'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

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

// Reminder types
export const REMINDER_TYPES = {
  PEAK_ENERGY: 'peak_energy',
  FROG_REMINDER: 'frog_reminder',
  BREAK_TIME: 'break_time',
  WIND_DOWN: 'wind_down',
  DAILY_PLANNING: 'daily_planning',
  STREAK_PROTECTION: 'streak_protection',
  CUSTOM: 'custom'
};

// Default smart reminder configurations
const DEFAULT_SMART_REMINDERS = [
  {
    id: 'peak-energy-morning',
    type: REMINDER_TYPES.PEAK_ENERGY,
    name: 'Peak Energy Alert',
    emoji: '⚡',
    description: 'Notify when entering typical high-energy time',
    enabled: true,
    conditions: {
      timeRange: { start: '09:00', end: '11:00' },
      energyThreshold: 3,
      weekdays: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'frog-reminder',
    type: REMINDER_TYPES.FROG_REMINDER,
    name: 'Eat Your Frog',
    emoji: '🐸',
    description: 'Remind to tackle hardest task first',
    enabled: true,
    conditions: {
      timeRange: { start: '09:00', end: '10:00' },
      requiresFrog: true,
      weekdays: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'break-reminder',
    type: REMINDER_TYPES.BREAK_TIME,
    name: 'Smart Break',
    emoji: '☕',
    description: 'Suggest break after extended focus',
    enabled: true,
    conditions: {
      focusMinutesThreshold: 90,
      cooldownMinutes: 30
    }
  },
  {
    id: 'wind-down',
    type: REMINDER_TYPES.WIND_DOWN,
    name: 'Wind Down',
    emoji: '🌙',
    description: 'Prepare to wrap up for the day',
    enabled: true,
    conditions: {
      timeRange: { start: '17:00', end: '18:00' },
      weekdays: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'daily-planning',
    type: REMINDER_TYPES.DAILY_PLANNING,
    name: 'Plan Tomorrow',
    emoji: '📋',
    description: 'Set up tasks for the next day',
    enabled: false,
    conditions: {
      timeRange: { start: '20:00', end: '21:00' },
      weekdays: [0, 1, 2, 3, 4]
    }
  },
  {
    id: 'streak-protection',
    type: REMINDER_TYPES.STREAK_PROTECTION,
    name: 'Streak Saver',
    emoji: '🔥',
    description: 'Alert if streak might be lost today',
    enabled: true,
    conditions: {
      timeRange: { start: '18:00', end: '20:00' },
      requiresActiveStreak: true,
      noCompletionsToday: true
    }
  }
];

// Hook to manage smart reminders
export function useSmartReminders({
  tasks,
  completedTasks,
  energy,
  streak,
  energyPatterns,
  totalFocusMinutes,
  lastBreakTime
}) {
  const [reminders, setReminders] = useState(() =>
    Storage.get('smartReminders', DEFAULT_SMART_REMINDERS)
  );
  const [reminderHistory, setReminderHistory] = useState(() =>
    Storage.get('reminderHistory', [])
  );
  const [snoozedReminders, setSnoozedReminders] = useState(() =>
    Storage.get('snoozedReminders', {})
  );
  const [activeNotification, setActiveNotification] = useState(null);

  // Save to storage
  useEffect(() => {
    Storage.set('smartReminders', reminders);
  }, [reminders]);

  useEffect(() => {
    Storage.set('reminderHistory', reminderHistory);
  }, [reminderHistory]);

  useEffect(() => {
    Storage.set('snoozedReminders', snoozedReminders);
  }, [snoozedReminders]);

  // Check if time is within range
  const isInTimeRange = useCallback((range) => {
    if (!range) return true;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= range.start && currentTime <= range.end;
  }, []);

  // Check if today is in weekdays
  const isInWeekdays = useCallback((weekdays) => {
    if (!weekdays) return true;
    return weekdays.includes(new Date().getDay());
  }, []);

  // Check if reminder is snoozed
  const isSnoozed = useCallback((reminderId) => {
    const snoozeUntil = snoozedReminders[reminderId];
    if (!snoozeUntil) return false;
    return new Date() < new Date(snoozeUntil);
  }, [snoozedReminders]);

  // Check if reminder was shown today
  const wasShownToday = useCallback((reminderId) => {
    const today = new Date().toDateString();
    return reminderHistory.some(r =>
      r.id === reminderId && new Date(r.shownAt).toDateString() === today
    );
  }, [reminderHistory]);

  // Get tasks completed today
  const todayCompletions = useMemo(() => {
    const today = new Date().toDateString();
    return completedTasks.filter(t => {
      const completedDate = new Date(t.completedAt || t.completed_at);
      return completedDate.toDateString() === today;
    });
  }, [completedTasks]);

  // Check if frog exists and is incomplete
  const hasFrog = useMemo(() => {
    return tasks.some(t => t.frog && !t.completed);
  }, [tasks]);

  // Evaluate reminder conditions
  const evaluateReminder = useCallback((reminder) => {
    if (!reminder.enabled) return false;
    if (isSnoozed(reminder.id)) return false;
    if (wasShownToday(reminder.id) && reminder.type !== REMINDER_TYPES.BREAK_TIME) return false;

    const conditions = reminder.conditions;

    // Time range check
    if (conditions.timeRange && !isInTimeRange(conditions.timeRange)) return false;

    // Weekday check
    if (conditions.weekdays && !isInWeekdays(conditions.weekdays)) return false;

    // Type-specific checks
    switch (reminder.type) {
      case REMINDER_TYPES.PEAK_ENERGY:
        return energy >= (conditions.energyThreshold || 3);

      case REMINDER_TYPES.FROG_REMINDER:
        return conditions.requiresFrog ? hasFrog : true;

      case REMINDER_TYPES.BREAK_TIME:
        if (!totalFocusMinutes) return false;
        const threshold = conditions.focusMinutesThreshold || 90;
        const cooldown = conditions.cooldownMinutes || 30;
        const timeSinceBreak = lastBreakTime
          ? (Date.now() - new Date(lastBreakTime).getTime()) / 60000
          : Infinity;
        return totalFocusMinutes >= threshold && timeSinceBreak >= cooldown;

      case REMINDER_TYPES.STREAK_PROTECTION:
        if (conditions.requiresActiveStreak && streak <= 0) return false;
        if (conditions.noCompletionsToday && todayCompletions.length > 0) return false;
        return true;

      case REMINDER_TYPES.CUSTOM:
      case REMINDER_TYPES.WIND_DOWN:
      case REMINDER_TYPES.DAILY_PLANNING:
      default:
        return true;
    }
  }, [energy, hasFrog, totalFocusMinutes, lastBreakTime, streak, todayCompletions, isSnoozed, wasShownToday, isInTimeRange, isInWeekdays]);

  // Get triggered reminders
  const triggeredReminders = useMemo(() => {
    return reminders.filter(evaluateReminder);
  }, [reminders, evaluateReminder]);

  // Show a reminder notification
  const showReminder = useCallback((reminder) => {
    setActiveNotification(reminder);
    setReminderHistory(prev => [{
      id: reminder.id,
      shownAt: new Date().toISOString()
    }, ...prev].slice(0, 100));
  }, []);

  // Dismiss reminder
  const dismissReminder = useCallback(() => {
    setActiveNotification(null);
  }, []);

  // Snooze reminder
  const snoozeReminder = useCallback((reminderId, minutes = 30) => {
    const snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();
    setSnoozedReminders(prev => ({
      ...prev,
      [reminderId]: snoozeUntil
    }));
    setActiveNotification(null);
  }, []);

  // Toggle reminder enabled
  const toggleReminder = useCallback((reminderId) => {
    setReminders(prev => prev.map(r =>
      r.id === reminderId ? { ...r, enabled: !r.enabled } : r
    ));
  }, []);

  // Update reminder
  const updateReminder = useCallback((reminderId, updates) => {
    setReminders(prev => prev.map(r =>
      r.id === reminderId ? { ...r, ...updates } : r
    ));
  }, []);

  // Add custom reminder
  const addCustomReminder = useCallback((reminder) => {
    const newReminder = {
      ...reminder,
      id: `custom_${Date.now()}`,
      type: REMINDER_TYPES.CUSTOM
    };
    setReminders(prev => [...prev, newReminder]);
    return newReminder;
  }, []);

  // Delete reminder
  const deleteReminder = useCallback((reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  }, []);

  // Auto-trigger check
  useEffect(() => {
    const checkReminders = () => {
      const triggered = triggeredReminders[0]; // Show one at a time
      if (triggered && !activeNotification) {
        showReminder(triggered);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [triggeredReminders, activeNotification, showReminder]);

  return {
    // State
    reminders,
    triggeredReminders,
    activeNotification,
    reminderHistory,

    // Actions
    showReminder,
    dismissReminder,
    snoozeReminder,
    toggleReminder,
    updateReminder,
    addCustomReminder,
    deleteReminder,

    // Constants
    REMINDER_TYPES
  };
}

// Reminder Notification Component
export function SmartReminderNotification({
  reminder,
  onDismiss,
  onSnooze,
  onAction
}) {
  if (!reminder) return null;

  const getActionButton = () => {
    switch (reminder.type) {
      case REMINDER_TYPES.FROG_REMINDER:
        return { text: 'Show My Frog', action: 'showFrog' };
      case REMINDER_TYPES.BREAK_TIME:
        return { text: 'Take a Break', action: 'takeBreak' };
      case REMINDER_TYPES.PEAK_ENERGY:
        return { text: 'Start Focusing', action: 'startFocus' };
      case REMINDER_TYPES.STREAK_PROTECTION:
        return { text: 'Quick Win', action: 'quickWin' };
      default:
        return { text: 'Got it', action: 'dismiss' };
    }
  };

  const action = getActionButton();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
      <div className="glass-card p-4 shadow-xl border border-white/20">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{reminder.emoji}</span>
          <div className="flex-1">
            <div className="font-semibold">{reminder.name}</div>
            <p className="text-sm text-white/60 mt-1">{reminder.description}</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={onDismiss}
                className="text-sm text-white/60 hover:text-white"
              >
                Dismiss
              </button>
              <button
                onClick={() => onSnooze(reminder.id, 30)}
                className="text-sm text-white/60 hover:text-white"
              >
                Snooze 30m
              </button>
              <button
                onClick={() => {
                  if (action.action === 'dismiss') {
                    onDismiss();
                  } else {
                    onAction(action.action);
                  }
                }}
                className="glass-button px-3 py-1 text-sm bg-purple-500/20 hover:bg-purple-500/30"
              >
                {action.text}
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Reminder Settings Card
export function ReminderSettingsCard({ reminder, onToggle, onEdit, onDelete }) {
  const isDefault = !reminder.id.startsWith('custom_');

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{reminder.emoji}</span>
        <div className="flex-1">
          <div className="font-medium">{reminder.name}</div>
          <div className="text-sm text-white/60">{reminder.description}</div>
          {reminder.conditions.timeRange && (
            <div className="text-xs text-white/40 mt-1">
              {reminder.conditions.timeRange.start} - {reminder.conditions.timeRange.end}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(reminder.id)}
            className={`w-12 h-6 rounded-full transition-colors ${
              reminder.enabled ? 'bg-green-500' : 'bg-white/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              reminder.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
          {!isDefault && (
            <button
              onClick={() => onDelete(reminder.id)}
              className="p-2 text-red-400 hover:text-red-300"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Smart Reminders Modal
export function SmartRemindersModal({
  isOpen,
  onClose,
  reminders,
  onToggle,
  onAdd,
  onDelete
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    name: '',
    emoji: '⏰',
    description: '',
    enabled: true,
    conditions: {
      timeRange: { start: '09:00', end: '17:00' }
    }
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (newReminder.name.trim()) {
      onAdd(newReminder);
      setNewReminder({
        name: '',
        emoji: '⏰',
        description: '',
        enabled: true,
        conditions: { timeRange: { start: '09:00', end: '17:00' } }
      });
      setShowAddForm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🔔 Smart Reminders</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!showAddForm ? (
            <>
              {reminders.map(reminder => (
                <ReminderSettingsCard
                  key={reminder.id}
                  reminder={reminder}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}

              <button
                onClick={() => setShowAddForm(true)}
                className="glass-card p-4 w-full text-center hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">+</span>
                <div className="text-sm text-white/60">Add Custom Reminder</div>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-white/60 hover:text-white"
                >
                  ← Back
                </button>
                <h3 className="font-semibold">Add Custom Reminder</h3>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-sm text-white/60">Emoji</label>
                  <input
                    type="text"
                    value={newReminder.emoji}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, emoji: e.target.value }))}
                    className="glass-input w-full mt-1 text-center text-2xl"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-sm text-white/60">Name</label>
                  <input
                    type="text"
                    value={newReminder.name}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Reminder name"
                    className="glass-input w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60">Description</label>
                <input
                  type="text"
                  value={newReminder.description}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What should this remind you?"
                  className="glass-input w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white/60">Start Time</label>
                  <input
                    type="time"
                    value={newReminder.conditions.timeRange.start}
                    onChange={(e) => setNewReminder(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        timeRange: { ...prev.conditions.timeRange, start: e.target.value }
                      }
                    }))}
                    className="glass-input w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60">End Time</label>
                  <input
                    type="time"
                    value={newReminder.conditions.timeRange.end}
                    onChange={(e) => setNewReminder(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        timeRange: { ...prev.conditions.timeRange, end: e.target.value }
                      }
                    }))}
                    className="glass-input w-full mt-1"
                  />
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={!newReminder.name.trim()}
                className="glass-button w-full py-3 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
              >
                Create Reminder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SmartRemindersModal;
