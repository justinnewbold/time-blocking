'use client';

import { useState, useEffect, useCallback } from 'react';

const NOTIFICATION_TYPES = {
  MORNING_REMINDER: 'morning_reminder',
  FROG_REMINDER: 'frog_reminder',
  FOCUS_END: 'focus_end',
  STREAK_REMINDER: 'streak_reminder',
  CELEBRATION: 'celebration'
};

export default function NotificationManager({ 
  isOpen, 
  onClose, 
  frogTask,
  onScheduleNotification 
}) {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState({
    morningReminder: true,
    morningTime: '08:00',
    frogReminder: true,
    frogReminderDelay: 30,
    focusEndSound: true,
    streakReminder: true,
    celebrations: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
    const savedSettings = localStorage.getItem('frog_notification_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error parsing notification settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('frog_notification_settings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        showTestNotification();
        // Try to register for periodic sync
        registerPeriodicSync();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
          await registration.periodicSync.register('daily-checkin', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          });
          console.log('Periodic sync registered for daily check-in');
        }
      }
    } catch (e) {
      console.log('Periodic sync not available:', e);
    }
  };

  const showTestNotification = () => {
    if (permission !== 'granted') return;
    
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        notification: {
          title: '🐸 Notifications Enabled!',
          body: "You'll now receive reminders to help you eat your frogs.",
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: 'test-notification'
        }
      });
    } else {
      new Notification('🐸 Notifications Enabled!', {
        body: "You'll now receive reminders to help you eat your frogs.",
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: 'test-notification'
      });
    }
  };

  const scheduleLocalNotification = useCallback((type, delay, customData = {}) => {
    if (permission !== 'granted') return;
    
    const notifications = {
      [NOTIFICATION_TYPES.MORNING_REMINDER]: {
        title: '🐸 Good Morning!',
        body: "Time to check your energy and pick today's frog!",
        tag: 'morning-reminder'
      },
      [NOTIFICATION_TYPES.FROG_REMINDER]: {
        title: '🐸 Frog Reminder',
        body: customData.taskTitle ? `Don't forget: ${customData.taskTitle}` : 'Your frog is waiting to be eaten!',
        tag: 'frog-reminder'
      },
      [NOTIFICATION_TYPES.FOCUS_END]: {
        title: '🎉 Focus Session Complete!',
        body: `Amazing work! You earned ${customData.xp || 0} XP.`,
        tag: 'focus-end'
      },
      [NOTIFICATION_TYPES.STREAK_REMINDER]: {
        title: '🔥 Keep Your Streak!',
        body: `You have a ${customData.streak || 0} day streak. Don't break it!`,
        tag: 'streak-reminder'
      },
      [NOTIFICATION_TYPES.CELEBRATION]: {
        title: customData.title || '🏆 Achievement Unlocked!',
        body: customData.body || 'You did something amazing!',
        tag: 'celebration'
      }
    };

    const notificationData = notifications[type];
    if (!notificationData) return;

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        id: `${type}-${Date.now()}`,
        delay: delay,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: notificationData.tag,
          data: { url: '/', type }
        }
      });
    } else {
      setTimeout(() => {
        new Notification(notificationData.title, {
          body: notificationData.body,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: notificationData.tag
        });
      }, delay);
    }
  }, [permission]);

  useEffect(() => {
    if (onScheduleNotification) {
      onScheduleNotification(scheduleLocalNotification);
    }
  }, [onScheduleNotification, scheduleLocalNotification]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔔</div>
              <div>
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <p className="text-green-100 text-sm">Stay on track with reminders</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <span className="text-white text-xl">&times;</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Permission Status */}
          {!isSupported ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-200 text-sm">Push notifications are not supported in this browser. Try Chrome or Safari.</p>
            </div>
          ) : permission === 'denied' ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-200 text-sm">Notifications are blocked. Please enable them in your browser settings to receive reminders.</p>
            </div>
          ) : permission !== 'granted' ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-100 text-sm mb-3">Enable notifications to get reminders about your frogs, focus sessions, and streaks!</p>
              <button 
                onClick={requestPermission} 
                disabled={loading} 
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                {loading ? 'Enabling...' : '🐸 Enable Notifications'}
              </button>
            </div>
          ) : (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <p className="text-green-200 text-sm">Notifications are enabled! You're all set.</p>
            </div>
          )}

          {/* Settings Sections */}
          <SettingSection 
            title="🌅 Morning Check-in" 
            description="Daily reminder to set your energy and pick a frog"
            settingKey="morningReminder" 
            settings={settings} 
            onChange={handleSettingChange} 
            timeKey="morningTime"
            disabled={permission !== 'granted'}
          />
          
          <SettingSection 
            title="🐸 Frog Reminders" 
            description="Nudge to tackle your hardest task"
            settingKey="frogReminder" 
            settings={settings} 
            onChange={handleSettingChange} 
            delayKey="frogReminderDelay"
            disabled={permission !== 'granted'}
          />
          
          <SettingSection 
            title="⏱️ Focus Session Alerts" 
            description="Notification when your timer completes"
            settingKey="focusEndSound" 
            settings={settings} 
            onChange={handleSettingChange}
            disabled={permission !== 'granted'}
          />
          
          <SettingSection 
            title="🔥 Streak Protection" 
            description="Evening reminder to maintain your streak"
            settingKey="streakReminder" 
            settings={settings} 
            onChange={handleSettingChange}
            disabled={permission !== 'granted'}
          />
          
          <SettingSection 
            title="🎉 Celebrations" 
            description="Level up and achievement notifications"
            settingKey="celebrations" 
            settings={settings} 
            onChange={handleSettingChange}
            disabled={permission !== 'granted'}
          />

          {/* Test Button */}
          {permission === 'granted' && (
            <button 
              onClick={showTestNotification} 
              className="w-full py-3 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600 transition-colors"
            >
              📱 Send Test Notification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingSection({ title, description, settingKey, settings, onChange, timeKey, delayKey, disabled }) {
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Enabled</span>
          <button 
            onClick={() => !disabled && onChange(settingKey, !settings[settingKey])} 
            disabled={disabled}
            className={`w-12 h-6 rounded-full transition-colors ${settings[settingKey] ? 'bg-green-500' : 'bg-slate-600'} ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[settingKey] ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        
        {timeKey && settings[settingKey] && !disabled && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Reminder Time</span>
            <input 
              type="time" 
              value={settings[timeKey]} 
              onChange={(e) => onChange(timeKey, e.target.value)} 
              className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>
        )}
        
        {delayKey && settings[settingKey] && !disabled && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Remind after</span>
            <select 
              value={settings[delayKey]} 
              onChange={(e) => onChange(delayKey, parseInt(e.target.value))} 
              className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-500 focus:border-green-500 focus:outline-none"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export { NOTIFICATION_TYPES };
