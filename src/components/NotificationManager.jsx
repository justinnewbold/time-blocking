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
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
    const savedSettings = localStorage.getItem('focusflow_notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('focusflow_notification_settings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        showTestNotification();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const showTestNotification = () => {
    if (permission !== 'granted') return;
    new Notification('FocusFlow Notifications Enabled!', {
      body: 'You will now receive reminders to help you stay focused.',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: 'test-notification'
    });
  };

  const scheduleLocalNotification = useCallback((type, delay, customData = {}) => {
    if (permission !== 'granted') return;
    
    const notifications = {
      [NOTIFICATION_TYPES.MORNING_REMINDER]: {
        title: 'Good Morning!',
        body: 'Time to check in with your energy level and pick your frog!',
        tag: 'morning-reminder'
      },
      [NOTIFICATION_TYPES.FROG_REMINDER]: {
        title: 'Frog Reminder',
        body: customData.taskTitle ? `Don't forget: ${customData.taskTitle}` : 'Your frog is waiting!',
        tag: 'frog-reminder'
      },
      [NOTIFICATION_TYPES.FOCUS_END]: {
        title: 'Focus Session Complete!',
        body: `Great work! You earned ${customData.xp || 0} XP.`,
        tag: 'focus-end'
      },
      [NOTIFICATION_TYPES.STREAK_REMINDER]: {
        title: 'Keep Your Streak!',
        body: `You have a ${customData.streak || 0} day streak.`,
        tag: 'streak-reminder'
      },
      [NOTIFICATION_TYPES.CELEBRATION]: {
        title: customData.title || 'Achievement Unlocked!',
        body: customData.body || 'You did something amazing!',
        tag: 'celebration'
      }
    };

    const notificationData = notifications[type];
    if (!notificationData) return;

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
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
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔔</div>
              <div>
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <p className="text-amber-100 text-sm">Stay on track with reminders</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
              <span className="text-white text-xl">&times;</span>
            </button>
          </div>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!isSupported ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-200 text-sm">Push notifications are not supported in this browser.</p>
            </div>
          ) : permission === 'denied' ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-200 text-sm">Notifications are blocked. Enable them in browser settings.</p>
            </div>
          ) : permission !== 'granted' ? (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-100 text-sm mb-3">Enable notifications for reminders.</p>
              <button onClick={requestPermission} disabled={loading} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </button>
            </div>
          ) : (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <p className="text-green-200 text-sm">Notifications enabled!</p>
            </div>
          )}
          <SettingSection title="🌅 Morning Check-in" settingKey="morningReminder" settings={settings} onChange={handleSettingChange} timeKey="morningTime" />
          <SettingSection title="🐸 Frog Reminders" settingKey="frogReminder" settings={settings} onChange={handleSettingChange} delayKey="frogReminderDelay" />
          <SettingSection title="⏱️ Focus Sessions" settingKey="focusEndSound" settings={settings} onChange={handleSettingChange} />
          <SettingSection title="🔥 Streak Protection" settingKey="streakReminder" settings={settings} onChange={handleSettingChange} />
          <SettingSection title="🎉 Celebrations" settingKey="celebrations" settings={settings} onChange={handleSettingChange} />
          {permission === 'granted' && (
            <button onClick={showTestNotification} className="w-full py-3 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600">
              Send Test Notification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingSection({ title, settingKey, settings, onChange, timeKey, delayKey }) {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">{title}</h3>
      <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Enabled</span>
          <button onClick={() => onChange(settingKey, !settings[settingKey])} className={`w-12 h-6 rounded-full transition-colors ${settings[settingKey] ? 'bg-amber-500' : 'bg-slate-600'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[settingKey] ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {timeKey && settings[settingKey] && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Time</span>
            <input type="time" value={settings[timeKey]} onChange={(e) => onChange(timeKey, e.target.value)} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-sm" />
          </div>
        )}
        {delayKey && settings[settingKey] && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Delay</span>
            <select value={settings[delayKey]} onChange={(e) => onChange(delayKey, parseInt(e.target.value))} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-sm">
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
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
