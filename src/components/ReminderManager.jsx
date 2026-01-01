'use client';

import { useState, useEffect, useCallback } from 'react';

// Storage helper
const Storage = {
  get: (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`frog_${key}`) || localStorage.getItem(`focusflow_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`frog_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

// Schedule a notification
export function scheduleNotification(task, reminderTime) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }
  
  const now = new Date();
  const scheduledTime = new Date(reminderTime);
  const delay = scheduledTime.getTime() - now.getTime();
  
  if (delay <= 0) {
    console.log('Reminder time is in the past');
    return null;
  }
  
  // Store the timeout ID so we can cancel it later
  const timeoutId = setTimeout(() => {
    showNotification(task);
  }, delay);
  
  // Save scheduled reminder
  const scheduledReminders = Storage.get('scheduledReminders', {});
  scheduledReminders[task.id] = {
    taskId: task.id,
    taskTitle: task.title,
    reminderTime: reminderTime,
    timeoutId: timeoutId
  };
  Storage.set('scheduledReminders', scheduledReminders);
  
  return timeoutId;
}

// Show the notification
export function showNotification(task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const notification = new Notification('🐸 Frog Reminder', {
    body: `Time to work on: ${task.title}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: `task-${task.id}`,
    requireInteraction: true,
    actions: [
      { action: 'start', title: '▶️ Start Now' },
      { action: 'snooze', title: '⏰ Snooze 10m' }
    ]
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // Also vibrate if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  
  // Remove from scheduled reminders
  const scheduledReminders = Storage.get('scheduledReminders', {});
  delete scheduledReminders[task.id];
  Storage.set('scheduledReminders', scheduledReminders);
}

// Cancel a scheduled notification
export function cancelNotification(taskId) {
  const scheduledReminders = Storage.get('scheduledReminders', {});
  const reminder = scheduledReminders[taskId];
  
  if (reminder && reminder.timeoutId) {
    clearTimeout(reminder.timeoutId);
    delete scheduledReminders[taskId];
    Storage.set('scheduledReminders', scheduledReminders);
  }
}

// Format time for display
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Format date for display
function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

// Quick time presets
const TIME_PRESETS = [
  { label: 'In 15 min', getTime: () => new Date(Date.now() + 15 * 60 * 1000) },
  { label: 'In 30 min', getTime: () => new Date(Date.now() + 30 * 60 * 1000) },
  { label: 'In 1 hour', getTime: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'Tomorrow 9am', getTime: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }},
];

// Reminder Picker Component
export function ReminderPicker({ task, onReminderSet, onClose }) {
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  useEffect(() => {
    // Check current permission
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);
  
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  };
  
  const handlePresetClick = (preset) => {
    const time = preset.getTime();
    scheduleNotification(task, time.toISOString());
    onReminderSet?.(time.toISOString());
    onClose?.();
  };
  
  const handleCustomSubmit = () => {
    if (!customDate || !customTime) return;
    
    const dateTime = new Date(`${customDate}T${customTime}`);
    if (dateTime <= new Date()) {
      alert('Please select a future time');
      return;
    }
    
    scheduleNotification(task, dateTime.toISOString());
    onReminderSet?.(dateTime.toISOString());
    onClose?.();
  };
  
  if (!permissionGranted) {
    return (
      <div className="glass-card p-4 animate-slide-up">
        <div className="text-center">
          <span className="text-4xl mb-3 block">🔔</span>
          <h3 className="text-white font-bold mb-2">Enable Notifications</h3>
          <p className="text-white/60 text-sm mb-4">
            Allow notifications to receive task reminders
          </p>
          <button
            onClick={handleRequestPermission}
            className="glass-button px-6 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>🔔</span> Set Reminder
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
      </div>
      
      <p className="text-white/60 text-sm mb-4 truncate">
        For: {task.title}
      </p>
      
      {/* Quick Presets */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TIME_PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => handlePresetClick(preset)}
            className="glass-button p-3 rounded-xl text-center hover:bg-white/10 transition-all"
          >
            <span className="text-white text-sm">{preset.label}</span>
          </button>
        ))}
      </div>
      
      {/* Custom Time */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-white/60 text-xs mb-2">Or pick a custom time:</p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 glass-input px-3 py-2 rounded-lg text-white text-sm"
            style={{ colorScheme: 'dark' }}
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="flex-1 glass-input px-3 py-2 rounded-lg text-white text-sm"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <button
          onClick={handleCustomSubmit}
          disabled={!customDate || !customTime}
          className="w-full glass-button py-3 rounded-xl bg-blue-500/20 text-blue-400 font-medium disabled:opacity-50"
        >
          Set Custom Reminder
        </button>
      </div>
    </div>
  );
}

// Scheduled Reminders List Component
export function ScheduledRemindersList({ tasks }) {
  const [reminders, setReminders] = useState({});
  
  useEffect(() => {
    setReminders(Storage.get('scheduledReminders', {}));
  }, []);
  
  const handleCancel = (taskId) => {
    cancelNotification(taskId);
    setReminders(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };
  
  const reminderList = Object.values(reminders).filter(r => {
    const time = new Date(r.reminderTime);
    return time > new Date();
  });
  
  if (reminderList.length === 0) {
    return (
      <div className="text-center py-6 text-white/40">
        <span className="text-2xl block mb-2">🔕</span>
        <p className="text-sm">No scheduled reminders</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {reminderList.map((reminder) => (
        <div 
          key={reminder.taskId}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
        >
          <span className="text-xl">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{reminder.taskTitle}</p>
            <p className="text-white/40 text-xs">
              {formatDate(reminder.reminderTime)} at {formatTime(reminder.reminderTime)}
            </p>
          </div>
          <button
            onClick={() => handleCancel(reminder.taskId)}
            className="text-red-400 text-sm hover:text-red-300"
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook to restore reminders on page load
export function useRestoreReminders(tasks) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const scheduledReminders = Storage.get('scheduledReminders', {});
    const now = new Date();
    
    Object.entries(scheduledReminders).forEach(([taskId, reminder]) => {
      const reminderTime = new Date(reminder.reminderTime);
      
      if (reminderTime <= now) {
        // Reminder was missed, remove it
        delete scheduledReminders[taskId];
      } else {
        // Reschedule the reminder
        const task = tasks.find(t => t.id.toString() === taskId);
        if (task) {
          const delay = reminderTime.getTime() - now.getTime();
          const timeoutId = setTimeout(() => {
            showNotification(task);
          }, delay);
          scheduledReminders[taskId].timeoutId = timeoutId;
        }
      }
    });
    
    Storage.set('scheduledReminders', scheduledReminders);
  }, [tasks]);
}

export default ReminderPicker;
