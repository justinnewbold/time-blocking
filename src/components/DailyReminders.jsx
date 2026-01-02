'use client';

import { useState, useEffect, useCallback } from 'react';

// Reminder types
const REMINDER_TYPES = {
  MORNING_CHECKIN: 'morning_checkin',
  STREAK_PROTECTION: 'streak_protection',
  EVENING_REFLECTION: 'evening_reflection',
  FROG_NUDGE: 'frog_nudge'
};

// Motivational messages for ADD brains
const MORNING_MESSAGES = [
  "Rise and shine! 🌅 What's your energy level today?",
  "New day, new frog! 🐸 Let's pick your most important task",
  "Good morning! ☀️ Ready to tackle something meaningful?",
  "Your brain is fresh! 🧠 Perfect time to eat a frog",
  "A gentle nudge: Pick your Top 3 for today 📋",
  "Hey! Your future self will thank you for starting now 💪",
  "Time for your daily check-in! How are you feeling? 💚"
];

const STREAK_MESSAGES = [
  "🔥 Don't lose your {streak}-day streak! Complete just one task",
  "Your {streak}-day streak is at risk! Quick win time? ⚡",
  "Keep the momentum! 🚀 {streak} days and counting",
  "One small task = streak saved! You've got {streak} days 🌟"
];

const EVENING_MESSAGES = [
  "Time to reflect 🌙 How did today go?",
  "Evening check-in: Celebrate your wins! 🎉",
  "Before you wind down, log your mood 📝",
  "Great job today! Review what you accomplished 💫"
];

export function useDailyReminders() {
  const [settings, setSettings] = useState({
    enabled: true,
    morningTime: '08:00',
    eveningTime: '20:00',
    streakProtection: true,
    frogNudge: true,
    soundEnabled: true,
    vibrationEnabled: true
  });
  
  const [lastCheckin, setLastCheckin] = useState(null);
  const [showReminder, setShowReminder] = useState(null);
  const [permission, setPermission] = useState('default');
  
  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('frog_reminder_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {}
    }
    
    const lastCheck = localStorage.getItem('frog_last_checkin');
    if (lastCheck) {
      setLastCheckin(new Date(lastCheck));
    }
    
    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);
  
  // Save settings
  useEffect(() => {
    localStorage.setItem('frog_reminder_settings', JSON.stringify(settings));
  }, [settings]);
  
  // Check if we need to show a reminder when app opens
  useEffect(() => {
    if (!settings.enabled) return;
    
    const now = new Date();
    const today = now.toDateString();
    const lastCheckinDay = lastCheckin?.toDateString();
    
    // If no check-in today, show morning reminder
    if (lastCheckinDay !== today) {
      const hour = now.getHours();
      const [morningHour] = settings.morningTime.split(':').map(Number);
      
      // Show reminder if it's past the morning time and we haven't checked in
      if (hour >= morningHour) {
        setTimeout(() => {
          setShowReminder({
            type: REMINDER_TYPES.MORNING_CHECKIN,
            message: MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)],
            canSnooze: true
          });
        }, 1500); // Slight delay for smooth UX
      }
    }
  }, [lastCheckin, settings]);
  
  // Schedule notifications via service worker
  const scheduleNotification = useCallback(async (type, time, options = {}) => {
    if (permission !== 'granted') return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Calculate delay
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const delay = scheduledTime.getTime() - now.getTime();
      
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        id: `daily-${type}`,
        delay: delay,
        notification: {
          title: options.title || '🐸 Frog Reminder',
          body: options.body || MORNING_MESSAGES[0],
          icon: '/icons/icon.svg',
          tag: type,
          data: { url: '/', action: type }
        }
      });
      
      console.log(`[Reminders] Scheduled ${type} for ${scheduledTime}`);
    } catch (error) {
      console.error('[Reminders] Failed to schedule:', error);
    }
  }, [permission]);
  
  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[Reminders] Permission error:', error);
      return false;
    }
  }, []);
  
  // Record check-in
  const recordCheckin = useCallback(() => {
    const now = new Date();
    setLastCheckin(now);
    localStorage.setItem('frog_last_checkin', now.toISOString());
    setShowReminder(null);
  }, []);
  
  // Snooze reminder
  const snoozeReminder = useCallback((minutes = 30) => {
    setShowReminder(null);
    
    // Show again after snooze period
    setTimeout(() => {
      setShowReminder({
        type: REMINDER_TYPES.MORNING_CHECKIN,
        message: "Just checking back! Ready now? 🐸",
        canSnooze: true,
        isSnoozed: true
      });
    }, minutes * 60 * 1000);
    
    // Store snooze time
    localStorage.setItem('frog_snooze_until', new Date(Date.now() + minutes * 60 * 1000).toISOString());
  }, []);
  
  // Dismiss reminder
  const dismissReminder = useCallback(() => {
    setShowReminder(null);
  }, []);
  
  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  // Schedule all daily notifications
  const scheduleDailyNotifications = useCallback(async () => {
    if (!settings.enabled || permission !== 'granted') return;
    
    // Morning check-in
    await scheduleNotification(
      REMINDER_TYPES.MORNING_CHECKIN,
      settings.morningTime,
      {
        title: '🐸 Good Morning!',
        body: MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)]
      }
    );
    
    // Evening reflection
    if (settings.eveningTime) {
      await scheduleNotification(
        REMINDER_TYPES.EVENING_REFLECTION,
        settings.eveningTime,
        {
          title: '🌙 Evening Reflection',
          body: EVENING_MESSAGES[Math.floor(Math.random() * EVENING_MESSAGES.length)]
        }
      );
    }
  }, [settings, permission, scheduleNotification]);
  
  return {
    settings,
    updateSettings,
    showReminder,
    dismissReminder,
    snoozeReminder,
    recordCheckin,
    requestPermission,
    permission,
    scheduleDailyNotifications,
    lastCheckin
  };
}

// Reminder Modal Component
export function ReminderModal({ reminder, onDismiss, onSnooze, onCheckin }) {
  if (!reminder) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="glass-card max-w-sm w-full p-6 text-center animate-scale-in">
        {/* Animated Frog */}
        <div className="text-6xl mb-4 animate-bounce-slow">🐸</div>
        
        {/* Message */}
        <p className="text-white text-lg mb-6 leading-relaxed">
          {reminder.message}
        </p>
        
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onCheckin}
            className="w-full glass-button py-3 text-white font-semibold flex items-center justify-center gap-2"
          >
            <span>Let's Do This!</span>
            <span className="text-lg">💪</span>
          </button>
          
          {reminder.canSnooze && (
            <div className="flex gap-3">
              <button
                onClick={() => onSnooze(15)}
                className="flex-1 glass-button py-2 text-white/70 text-sm"
              >
                15 min ⏰
              </button>
              <button
                onClick={() => onSnooze(30)}
                className="flex-1 glass-button py-2 text-white/70 text-sm"
              >
                30 min ⏰
              </button>
              <button
                onClick={() => onSnooze(60)}
                className="flex-1 glass-button py-2 text-white/70 text-sm"
              >
                1 hour ⏰
              </button>
            </div>
          )}
          
          <button
            onClick={onDismiss}
            className="w-full py-2 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Not now
          </button>
        </div>
        
        {/* Streak reminder */}
        {reminder.streak && (
          <p className="text-yellow-400 text-sm mt-4">
            🔥 {reminder.streak} day streak at risk!
          </p>
        )}
      </div>
    </div>
  );
}

// Reminder Settings Component
export function ReminderSettings({ settings, onUpdate, permission, onRequestPermission }) {
  const [localSettings, setLocalSettings] = useState(settings);
  
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <span>🔔</span> Daily Reminders
      </h3>
      
      {/* Permission Status */}
      {permission !== 'granted' && (
        <div className="glass p-4 rounded-xl">
          <p className="text-white/70 text-sm mb-3">
            Enable notifications to receive gentle reminders
          </p>
          <button
            onClick={onRequestPermission}
            className="glass-button px-4 py-2 text-white text-sm"
          >
            Enable Notifications
          </button>
        </div>
      )}
      
      {/* Master Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-white/80">Reminders Enabled</span>
        <button
          onClick={() => handleChange('enabled', !localSettings.enabled)}
          className={`w-12 h-7 rounded-full transition-colors ${
            localSettings.enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
            localSettings.enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
      
      {localSettings.enabled && (
        <>
          {/* Morning Time */}
          <div className="flex items-center justify-between">
            <span className="text-white/80">Morning Check-in</span>
            <input
              type="time"
              value={localSettings.morningTime}
              onChange={(e) => handleChange('morningTime', e.target.value)}
              className="glass-input px-3 py-1 text-white text-sm"
            />
          </div>
          
          {/* Evening Time */}
          <div className="flex items-center justify-between">
            <span className="text-white/80">Evening Reflection</span>
            <input
              type="time"
              value={localSettings.eveningTime}
              onChange={(e) => handleChange('eveningTime', e.target.value)}
              className="glass-input px-3 py-1 text-white text-sm"
            />
          </div>
          
          {/* Streak Protection */}
          <div className="flex items-center justify-between">
            <span className="text-white/80">Streak Protection</span>
            <button
              onClick={() => handleChange('streakProtection', !localSettings.streakProtection)}
              className={`w-12 h-7 rounded-full transition-colors ${
                localSettings.streakProtection ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
                localSettings.streakProtection ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          
          {/* Frog Nudge */}
          <div className="flex items-center justify-between">
            <span className="text-white/80">Frog Nudge (if not eaten)</span>
            <button
              onClick={() => handleChange('frogNudge', !localSettings.frogNudge)}
              className={`w-12 h-7 rounded-full transition-colors ${
                localSettings.frogNudge ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
                localSettings.frogNudge ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          
          <p className="text-white/40 text-xs">
            💡 Gentle reminders designed for ADD brains - no guilt, just support!
          </p>
        </>
      )}
    </div>
  );
}

export default { useDailyReminders, ReminderModal, ReminderSettings };
