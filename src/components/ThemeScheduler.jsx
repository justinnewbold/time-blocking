'use client';

import { useState, useEffect, useCallback } from 'react';

// Theme schedule configuration
export const DEFAULT_SCHEDULE = {
  enabled: false,
  lightTheme: 'light',
  darkTheme: 'dark',
  mode: 'sunset', // 'sunset', 'custom', 'system'
  customLightTime: '07:00',
  customDarkTime: '19:00',
};

// Get sunset/sunrise times (simplified - uses approximate times based on month)
function getSunTimes() {
  const month = new Date().getMonth();

  // Approximate sunrise/sunset hours by month (Northern Hemisphere)
  const sunTimes = [
    { sunrise: 7, sunset: 17 },  // Jan
    { sunrise: 7, sunset: 18 },  // Feb
    { sunrise: 6, sunset: 18 },  // Mar
    { sunrise: 6, sunset: 19 },  // Apr
    { sunrise: 5, sunset: 20 },  // May
    { sunrise: 5, sunset: 21 },  // Jun
    { sunrise: 5, sunset: 21 },  // Jul
    { sunrise: 6, sunset: 20 },  // Aug
    { sunrise: 6, sunset: 19 },  // Sep
    { sunrise: 7, sunset: 18 },  // Oct
    { sunrise: 7, sunset: 17 },  // Nov
    { sunrise: 7, sunset: 17 },  // Dec
  ];

  return sunTimes[month];
}

// Determine if it's currently "dark" time
export function isDarkTime(schedule) {
  if (!schedule.enabled) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinutes;

  if (schedule.mode === 'system') {
    // Use system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  if (schedule.mode === 'sunset') {
    const { sunrise, sunset } = getSunTimes();
    const sunriseMinutes = sunrise * 60;
    const sunsetMinutes = sunset * 60;

    return currentTime < sunriseMinutes || currentTime >= sunsetMinutes;
  }

  if (schedule.mode === 'custom') {
    const [lightHour, lightMin] = schedule.customLightTime.split(':').map(Number);
    const [darkHour, darkMin] = schedule.customDarkTime.split(':').map(Number);

    const lightTime = lightHour * 60 + lightMin;
    const darkTime = darkHour * 60 + darkMin;

    // Handle overnight schedules
    if (darkTime < lightTime) {
      // Dark time is before light time (e.g., 22:00 - 06:00)
      return currentTime >= darkTime && currentTime < lightTime;
    } else {
      // Normal schedule (e.g., 07:00 - 19:00)
      return currentTime < lightTime || currentTime >= darkTime;
    }
  }

  return false;
}

// Hook for theme scheduling
export function useThemeScheduler(currentTheme, setTheme, schedule, setSchedule) {
  const [lastCheck, setLastCheck] = useState(null);

  const checkAndUpdateTheme = useCallback(() => {
    if (!schedule.enabled) return;

    const shouldBeDark = isDarkTime(schedule);
    if (shouldBeDark === null) return;

    const targetTheme = shouldBeDark ? schedule.darkTheme : schedule.lightTheme;

    // Only update if different and not manually overridden recently
    if (currentTheme !== targetTheme) {
      const lastManualChange = localStorage.getItem('theme_manual_change');
      if (lastManualChange) {
        const timeSinceManual = Date.now() - parseInt(lastManualChange);
        // Don't override manual changes for 30 minutes
        if (timeSinceManual < 30 * 60 * 1000) {
          return;
        }
      }

      setTheme(targetTheme);
    }

    setLastCheck(new Date());
  }, [schedule, currentTheme, setTheme]);

  // Check on mount and every minute
  useEffect(() => {
    checkAndUpdateTheme();

    const interval = setInterval(checkAndUpdateTheme, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndUpdateTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (schedule.mode !== 'system' || !schedule.enabled) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkAndUpdateTheme();

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [schedule.mode, schedule.enabled, checkAndUpdateTheme]);

  // Mark manual theme changes
  const handleManualThemeChange = useCallback((newTheme) => {
    localStorage.setItem('theme_manual_change', Date.now().toString());
    setTheme(newTheme);
  }, [setTheme]);

  return { lastCheck, handleManualThemeChange };
}

// Theme Schedule Settings UI
export function ThemeScheduleSettings({ schedule, onScheduleChange, themes }) {
  const lightThemes = themes?.filter(t => t.type === 'light') || [
    { id: 'light', name: 'Light' },
    { id: 'sky', name: 'Sky' },
    { id: 'peach', name: 'Peach' },
    { id: 'mint', name: 'Mint' },
    { id: 'lavender', name: 'Lavender' },
  ];

  const darkThemes = themes?.filter(t => t.type === 'dark') || [
    { id: 'dark', name: 'Dark' },
    { id: 'midnight', name: 'Midnight' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'ocean', name: 'Ocean' },
    { id: 'forest', name: 'Forest' },
  ];

  const { sunrise, sunset } = getSunTimes();

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 glass-card rounded-xl">
        <div>
          <p className="text-white font-medium">Auto Theme Switching</p>
          <p className="text-white/60 text-sm">Change themes based on time</p>
        </div>
        <button
          onClick={() => onScheduleChange({ ...schedule, enabled: !schedule.enabled })}
          className={`w-14 h-8 rounded-full transition-colors ${
            schedule.enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
              schedule.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {schedule.enabled && (
        <>
          {/* Mode Selection */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Schedule Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onScheduleChange({ ...schedule, mode: 'sunset' })}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  schedule.mode === 'sunset'
                    ? 'bg-orange-500/30 border border-orange-500/50 text-white'
                    : 'glass-button text-white/70'
                }`}
              >
                🌅 Sunset
              </button>
              <button
                onClick={() => onScheduleChange({ ...schedule, mode: 'custom' })}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  schedule.mode === 'custom'
                    ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                    : 'glass-button text-white/70'
                }`}
              >
                ⏰ Custom
              </button>
              <button
                onClick={() => onScheduleChange({ ...schedule, mode: 'system' })}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  schedule.mode === 'system'
                    ? 'bg-purple-500/30 border border-purple-500/50 text-white'
                    : 'glass-button text-white/70'
                }`}
              >
                💻 System
              </button>
            </div>
          </div>

          {/* Sunset Info */}
          {schedule.mode === 'sunset' && (
            <div className="glass-card p-4 rounded-xl">
              <p className="text-white/60 text-sm mb-2">Approximate times for this month:</p>
              <div className="flex justify-between text-white">
                <span>🌅 Sunrise: ~{sunrise}:00 AM</span>
                <span>🌆 Sunset: ~{sunset}:00 PM</span>
              </div>
            </div>
          )}

          {/* Custom Times */}
          {schedule.mode === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Light Mode Start</label>
                <input
                  type="time"
                  value={schedule.customLightTime}
                  onChange={(e) => onScheduleChange({ ...schedule, customLightTime: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Dark Mode Start</label>
                <input
                  type="time"
                  value={schedule.customDarkTime}
                  onChange={(e) => onScheduleChange({ ...schedule, customDarkTime: e.target.value })}
                  className="w-full glass-input px-4 py-3 rounded-xl text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}

          {/* Theme Selection */}
          {schedule.mode !== 'system' && (
            <>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Light Theme</label>
                <div className="grid grid-cols-5 gap-2">
                  {lightThemes.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onScheduleChange({ ...schedule, lightTheme: theme.id })}
                      className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                        schedule.lightTheme === theme.id
                          ? 'bg-white/30 border border-white/50 text-white'
                          : 'glass-button text-white/70'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Dark Theme</label>
                <div className="grid grid-cols-5 gap-2">
                  {darkThemes.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onScheduleChange({ ...schedule, darkTheme: theme.id })}
                      className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                        schedule.darkTheme === theme.id
                          ? 'bg-white/30 border border-white/50 text-white'
                          : 'glass-button text-white/70'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Current Status */}
          <div className="glass-card p-4 rounded-xl">
            <p className="text-white/60 text-sm mb-1">Current Status</p>
            <p className="text-white font-medium">
              {isDarkTime(schedule)
                ? `🌙 Dark mode (${schedule.darkTheme})`
                : `☀️ Light mode (${schedule.lightTheme})`
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ThemeScheduleSettings;
