'use client';

import { useState, useEffect, useCallback } from 'react';

// Due date reminder intervals
const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder', icon: '🔕' },
  { value: 'at_time', label: 'At due time', icon: '⏰' },
  { value: '15min', label: '15 minutes before', icon: '⏱️' },
  { value: '30min', label: '30 minutes before', icon: '⏱️' },
  { value: '1hour', label: '1 hour before', icon: '🕐' },
  { value: '1day', label: '1 day before', icon: '📅' },
  { value: '1week', label: '1 week before', icon: '📆' }
];

// Get milliseconds for reminder offset
const getReminderOffset = (reminderType) => {
  const offsets = {
    'at_time': 0,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
    '1week': 7 * 24 * 60 * 60 * 1000
  };
  return offsets[reminderType] || 0;
};

// Format due date for display
// gentleMode parameter uses encouraging language instead of "overdue"
export const formatDueDate = (dueDate, gentleMode = true) => {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
  const diffMs = due - now;

  // Include time if it's set (not midnight)
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0;
  const timeStr = hasTime ? due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  if (diffMs < 0) {
    // Past due - use gentle language
    if (gentleMode) {
      if (diffDays === 0 && hasTime) {
        return { text: `Waiting since ${timeStr}`, color: '#f97316', isOverdue: true };  // Orange, not red
      }
      const days = Math.abs(diffDays);
      return { text: `Waiting ${days} day${days !== 1 ? 's' : ''}`, color: '#f97316', isOverdue: true };
    } else {
      // Traditional language
      if (diffDays === 0 && hasTime) {
        return { text: `Overdue ${timeStr}`, color: '#ef4444', isOverdue: true };
      }
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, color: '#ef4444', isOverdue: true };
    }
  }

  if (diffDays === 0) {
    if (hasTime) {
      return { text: `Today ${timeStr}`, color: '#f97316', isToday: true };
    }
    return { text: 'Today', color: '#f97316', isToday: true };
  }

  if (diffDays === 1) {
    if (hasTime) {
      return { text: `Tomorrow ${timeStr}`, color: '#eab308', isTomorrow: true };
    }
    return { text: 'Tomorrow', color: '#eab308', isTomorrow: true };
  }

  if (diffDays <= 7) {
    const dayName = due.toLocaleDateString('en-US', { weekday: 'short' });
    if (hasTime) {
      return { text: `${dayName} ${timeStr}`, color: '#22c55e', isThisWeek: true };
    }
    return { text: `${dayName} (${diffDays} days)`, color: '#22c55e', isThisWeek: true };
  }

  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (hasTime ? ` ${timeStr}` : ''),
    color: '#64748b',
    isFuture: true
  };
};

// Due date picker component
export function DueDatePicker({ value, onChange, reminder, onReminderChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(value ? new Date(value).toISOString().split('T')[0] : '');
  const [time, setTime] = useState(value ? new Date(value).toTimeString().slice(0, 5) : '');
  const [selectedReminder, setSelectedReminder] = useState(reminder || 'none');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDate(d.toISOString().split('T')[0]);
      const hours = d.getHours();
      const mins = d.getMinutes();
      if (hours !== 0 || mins !== 0) {
        setTime(d.toTimeString().slice(0, 5));
      }
    }
  }, [value]);

  const handleSave = () => {
    if (date) {
      let dueDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      onChange(dueDate.toISOString());
      onReminderChange?.(selectedReminder);
    } else {
      onChange(null);
      onReminderChange?.('none');
    }
    setShowPicker(false);
  };

  const handleClear = () => {
    setDate('');
    setTime('');
    setSelectedReminder('none');
    onChange(null);
    onReminderChange?.('none');
    setShowPicker(false);
  };

  const quickDates = [
    { label: 'Today', getValue: () => new Date() },
    { label: 'Tomorrow', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
    { label: 'This Week', getValue: () => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d; } },
    { label: 'Next Week', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } },
    { label: 'Next Month', getValue: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } }
  ];

  const dueDateInfo = value ? formatDueDate(value) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`glass-button px-4 py-2 rounded-xl flex items-center gap-2 text-sm ${
          dueDateInfo?.isOverdue ? 'ring-2 ring-red-500/50' : ''
        }`}
      >
        <span>📅</span>
        <span className={dueDateInfo ? '' : 'text-white/60'}>
          {dueDateInfo ? dueDateInfo.text : 'Set due date'}
        </span>
        {dueDateInfo && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: dueDateInfo.color }}
          />
        )}
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 glass-card p-4 z-50 min-w-[300px] animate-slide-up">
          <h4 className="text-white font-medium mb-3">Set Due Date</h4>

          {/* Quick date buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickDates.map(({ label, getValue }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const d = getValue();
                  setDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-xs transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date input */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs mb-1 block">Time (optional)</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Reminder selector */}
          <div className="mb-4">
            <label className="text-white/60 text-xs mb-1 block">Reminder</label>
            <select
              value={selectedReminder}
              onChange={(e) => setSelectedReminder(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              {REMINDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-2 text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="flex-1 py-2 text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 glass-button py-2 text-white text-sm"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Due date badge for task cards
export function DueDateBadge({ dueDate, compact = false }) {
  if (!dueDate) return null;

  const info = formatDueDate(dueDate);
  if (!info) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${info.isOverdue ? 'bg-red-500/20 animate-pulse' : 'bg-white/10'}`}
      style={{ color: info.color }}
    >
      {info.isOverdue && <span>⚠️</span>}
      {info.isToday && <span>📍</span>}
      <span>{info.text}</span>
    </span>
  );
}

// Hook for managing due date notifications
export function useDueDateNotifications(tasks) {
  const [scheduledReminders, setScheduledReminders] = useState({});

  // Schedule notification for a task's due date
  const scheduleReminder = useCallback(async (task) => {
    if (!task.dueDate || task.dueDateReminder === 'none' || !task.dueDateReminder) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const dueDate = new Date(task.dueDate);
    const offset = getReminderOffset(task.dueDateReminder);
    const reminderTime = new Date(dueDate.getTime() - offset);
    const now = new Date();

    // Don't schedule if reminder time has passed
    if (reminderTime <= now) return;

    const delay = reminderTime.getTime() - now.getTime();

    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          id: `due-date-${task.id}`,
          delay: delay,
          notification: {
            title: '📅 Task Due Soon!',
            body: task.title,
            icon: '/icons/icon.svg',
            badge: '/icons/icon.svg',
            tag: `due-date-${task.id}`,
            data: { url: '/', taskId: task.id, type: 'due_date' }
          }
        });

        setScheduledReminders(prev => ({
          ...prev,
          [task.id]: { scheduledFor: reminderTime.toISOString(), taskTitle: task.title }
        }));

        console.log(`[DueDate] Scheduled reminder for "${task.title}" at ${reminderTime}`);
      } else {
        // Fallback to setTimeout for browsers without service worker
        const timeoutId = setTimeout(() => {
          new Notification('📅 Task Due Soon!', {
            body: task.title,
            icon: '/icons/icon.svg',
            tag: `due-date-${task.id}`
          });
        }, delay);

        setScheduledReminders(prev => ({
          ...prev,
          [task.id]: { timeoutId, scheduledFor: reminderTime.toISOString(), taskTitle: task.title }
        }));
      }
    } catch (error) {
      console.error('[DueDate] Failed to schedule reminder:', error);
    }
  }, []);

  // Cancel a scheduled reminder
  const cancelReminder = useCallback((taskId) => {
    const reminder = scheduledReminders[taskId];
    if (!reminder) return;

    if (reminder.timeoutId) {
      clearTimeout(reminder.timeoutId);
    }

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_NOTIFICATION',
        id: `due-date-${taskId}`
      });
    }

    setScheduledReminders(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, [scheduledReminders]);

  // Check for overdue tasks and notify
  const checkOverdueTasks = useCallback(() => {
    if (!tasks || !Array.isArray(tasks)) return [];

    const now = new Date();
    const overdue = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false;
      return new Date(task.dueDate) < now;
    });

    return overdue;
  }, [tasks]);

  // Schedule reminders for all tasks with due dates
  useEffect(() => {
    if (!tasks || !Array.isArray(tasks)) return;

    tasks.forEach(task => {
      if (task.dueDate && task.dueDateReminder && task.dueDateReminder !== 'none' && !task.completed) {
        // Only schedule if not already scheduled or if due date changed
        const existing = scheduledReminders[task.id];
        if (!existing) {
          scheduleReminder(task);
        }
      }
    });
  }, [tasks, scheduleReminder, scheduledReminders]);

  return {
    scheduleReminder,
    cancelReminder,
    checkOverdueTasks,
    scheduledReminders
  };
}

// Overdue tasks banner component - uses gentle, ADHD-friendly language
export function OverdueTasksBanner({ tasks, onTaskClick, gentleMode = true }) {
  const overdueTasks = tasks?.filter(t => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < new Date();
  }) || [];

  if (overdueTasks.length === 0) return null;

  // Gentle mode uses orange/yellow tones and encouraging language
  // Non-gentle mode uses red and "overdue"
  const colors = gentleMode
    ? { bg: 'bg-orange-500/10', border: 'border-orange-500/30', title: 'text-orange-400', text: 'text-orange-300/70', button: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300' }
    : { bg: 'bg-red-500/10', border: 'border-red-500/30', title: 'text-red-400', text: 'text-red-300/70', button: 'bg-red-500/20 hover:bg-red-500/30 text-red-300' };

  const title = gentleMode
    ? `${overdueTasks.length} task${overdueTasks.length !== 1 ? 's' : ''} waiting for you`
    : `${overdueTasks.length} Overdue Task${overdueTasks.length !== 1 ? 's' : ''}`;

  const icon = gentleMode ? '👋' : '⚠️';
  const buttonText = gentleMode ? 'Start one' : 'View';

  return (
    <div className={`glass-card ${colors.bg} border ${colors.border} p-4 mb-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className={`${colors.title} font-semibold`}>
            {title}
          </h4>
          <p className={`${colors.text} text-sm`}>
            {gentleMode ? "No rush - just pick one when you're ready!" : (
              <>
                {overdueTasks.slice(0, 2).map(t => t.title).join(', ')}
                {overdueTasks.length > 2 && ` and ${overdueTasks.length - 2} more`}
              </>
            )}
          </p>
        </div>
        {onTaskClick && (
          <button
            onClick={() => onTaskClick(overdueTasks[0])}
            className={`px-3 py-1.5 ${colors.button} rounded-lg text-sm transition-colors`}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}

// Upcoming due dates list
export function UpcomingDueDates({ tasks, onTaskClick, limit = 5 }) {
  const upcomingTasks = tasks
    ?.filter(t => t.dueDate && !t.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, limit) || [];

  if (upcomingTasks.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <span>📅</span> Upcoming Due Dates
      </h4>
      <div className="space-y-2">
        {upcomingTasks.map(task => {
          const info = formatDueDate(task.dueDate);
          return (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: info?.color || '#64748b' }}
              />
              <span className="flex-1 text-white/80 text-sm truncate">{task.title}</span>
              <span className="text-xs" style={{ color: info?.color || '#64748b' }}>
                {info?.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { REMINDER_OPTIONS, getReminderOffset };
