'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Analytics event types
const EVENT_TYPES = {
  // Task events
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  TASK_EDITED: 'task_edited',
  SUBTASK_COMPLETED: 'subtask_completed',

  // Energy events
  ENERGY_CHECKED_IN: 'energy_checked_in',
  ENERGY_CHANGED: 'energy_changed',

  // Focus events
  FOCUS_STARTED: 'focus_started',
  FOCUS_COMPLETED: 'focus_completed',
  FOCUS_ABANDONED: 'focus_abandoned',

  // Frog events
  FROG_SELECTED: 'frog_selected',
  FROG_EATEN: 'frog_eaten',

  // Achievement events
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  LEVEL_UP: 'level_up',

  // Feature usage
  FEATURE_USED: 'feature_used',
  SOUND_PLAYED: 'sound_played',
  THEME_CHANGED: 'theme_changed',

  // Navigation
  PAGE_VIEW: 'page_view',
  TAB_SWITCHED: 'tab_switched',

  // Errors
  ERROR_OCCURRED: 'error_occurred',

  // Session
  SESSION_START: 'session_start',
  SESSION_END: 'session_end'
};

// Analytics context
const AnalyticsContext = createContext(null);

// Analytics storage key
const ANALYTICS_STORAGE_KEY = 'frog_analytics_data';
const ANALYTICS_SETTINGS_KEY = 'frog_analytics_settings';

// Get device info
const getDeviceInfo = () => {
  if (typeof window === 'undefined') return {};

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    colorScheme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    standalone: window.matchMedia?.('(display-mode: standalone)').matches,
    online: navigator.onLine
  };
};

// Analytics Provider
export function AnalyticsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({
    enabled: true,
    trackErrors: true,
    trackUsage: true,
    trackPerformance: true
  });
  const [sessionId, setSessionId] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);

  // Load settings and events from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(ANALYTICS_SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }

    const savedEvents = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents);
        // Keep only last 7 days of events
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setEvents(parsed.filter(e => new Date(e.timestamp).getTime() > weekAgo));
      } catch (e) {}
    }

    // Start session
    const sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(sid);
    setSessionStart(new Date());
  }, []);

  // Save events to localStorage
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.slice(-500)));
    }
  }, [events]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(ANALYTICS_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Expose analytics globally for error boundary
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.frogAnalytics = {
        trackError: (error, errorInfo) => {
          trackEvent(EVENT_TYPES.ERROR_OCCURRED, {
            message: error?.message || String(error),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack
          });
        }
      };
    }
  }, []);

  // Track event
  const trackEvent = useCallback((eventType, data = {}) => {
    if (!settings.enabled) return;

    const event = {
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      sessionId,
      data,
      device: getDeviceInfo()
    };

    setEvents(prev => [...prev, event]);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventType, data);
    }
  }, [settings.enabled, sessionId]);

  // Track page view
  const trackPageView = useCallback((pageName) => {
    trackEvent(EVENT_TYPES.PAGE_VIEW, { page: pageName });
  }, [trackEvent]);

  // Track feature usage
  const trackFeature = useCallback((featureName, details = {}) => {
    trackEvent(EVENT_TYPES.FEATURE_USED, { feature: featureName, ...details });
  }, [trackEvent]);

  // Track error
  const trackError = useCallback((error, context = {}) => {
    if (!settings.trackErrors) return;

    trackEvent(EVENT_TYPES.ERROR_OCCURRED, {
      message: error?.message || String(error),
      stack: error?.stack,
      ...context
    });
  }, [settings.trackErrors, trackEvent]);

  // Get analytics summary
  const getAnalyticsSummary = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayEvents = events.filter(e => new Date(e.timestamp) >= today);
    const weekEvents = events.filter(e => new Date(e.timestamp) >= weekAgo);

    return {
      today: {
        tasksCompleted: todayEvents.filter(e => e.type === EVENT_TYPES.TASK_COMPLETED).length,
        focusSessions: todayEvents.filter(e => e.type === EVENT_TYPES.FOCUS_COMPLETED).length,
        frogsEaten: todayEvents.filter(e => e.type === EVENT_TYPES.FROG_EATEN).length,
        energyCheckins: todayEvents.filter(e => e.type === EVENT_TYPES.ENERGY_CHECKED_IN).length
      },
      week: {
        tasksCompleted: weekEvents.filter(e => e.type === EVENT_TYPES.TASK_COMPLETED).length,
        focusSessions: weekEvents.filter(e => e.type === EVENT_TYPES.FOCUS_COMPLETED).length,
        frogsEaten: weekEvents.filter(e => e.type === EVENT_TYPES.FROG_EATEN).length,
        mostUsedFeatures: getMostUsedFeatures(weekEvents),
        averageEnergyLevel: getAverageEnergy(weekEvents),
        peakProductivityHour: getPeakHour(weekEvents)
      },
      totalEvents: events.length
    };
  }, [events]);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Clear analytics data
  const clearAnalytics = useCallback(() => {
    setEvents([]);
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  }, []);

  // Export analytics data
  const exportAnalytics = useCallback(() => {
    const data = {
      events,
      summary: getAnalyticsSummary(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frog-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events, getAnalyticsSummary]);

  const value = {
    trackEvent,
    trackPageView,
    trackFeature,
    trackError,
    getAnalyticsSummary,
    settings,
    updateSettings,
    clearAnalytics,
    exportAnalytics,
    EVENT_TYPES
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Hook to use analytics
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      trackEvent: () => {},
      trackPageView: () => {},
      trackFeature: () => {},
      trackError: () => {},
      getAnalyticsSummary: () => ({}),
      settings: { enabled: false },
      updateSettings: () => {},
      clearAnalytics: () => {},
      exportAnalytics: () => {},
      EVENT_TYPES
    };
  }
  return context;
}

// Helper functions
function getMostUsedFeatures(events) {
  const featureEvents = events.filter(e => e.type === EVENT_TYPES.FEATURE_USED);
  const counts = {};
  featureEvents.forEach(e => {
    const feature = e.data?.feature || 'unknown';
    counts[feature] = (counts[feature] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([feature, count]) => ({ feature, count }));
}

function getAverageEnergy(events) {
  const energyEvents = events.filter(e => e.type === EVENT_TYPES.ENERGY_CHECKED_IN);
  if (energyEvents.length === 0) return null;

  const total = energyEvents.reduce((sum, e) => sum + (e.data?.energyLevel || 0), 0);
  return Math.round((total / energyEvents.length) * 10) / 10;
}

function getPeakHour(events) {
  const completionEvents = events.filter(e => e.type === EVENT_TYPES.TASK_COMPLETED);
  if (completionEvents.length === 0) return null;

  const hourCounts = {};
  completionEvents.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (!peakHour) return null;

  const hour = parseInt(peakHour[0]);
  return {
    hour,
    label: `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`,
    count: peakHour[1]
  };
}

// Analytics Dashboard Component
export function AnalyticsDashboard({ onClose }) {
  const { getAnalyticsSummary, settings, updateSettings, clearAnalytics, exportAnalytics } = useAnalytics();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setSummary(getAnalyticsSummary());
  }, [getAnalyticsSummary]);

  if (!summary) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-white/5 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span> Analytics
          </h2>
          <button onClick={onClose} className="glass-icon-sm w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Today's Stats */}
          <div>
            <h3 className="text-white/60 text-sm mb-3">Today</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Tasks Done" value={summary.today.tasksCompleted} icon="✅" />
              <StatCard label="Focus Sessions" value={summary.today.focusSessions} icon="⏱️" />
              <StatCard label="Frogs Eaten" value={summary.today.frogsEaten} icon="🐸" />
              <StatCard label="Energy Check-ins" value={summary.today.energyCheckins} icon="⚡" />
            </div>
          </div>

          {/* Week Stats */}
          <div>
            <h3 className="text-white/60 text-sm mb-3">This Week</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Tasks Done" value={summary.week.tasksCompleted} icon="✅" />
              <StatCard label="Focus Sessions" value={summary.week.focusSessions} icon="⏱️" />
              <StatCard label="Frogs Eaten" value={summary.week.frogsEaten} icon="🐸" />
              <StatCard
                label="Avg Energy"
                value={summary.week.averageEnergyLevel || '-'}
                icon="🔋"
              />
            </div>
          </div>

          {/* Peak Hour */}
          {summary.week.peakProductivityHour && (
            <div className="glass p-4 rounded-xl">
              <p className="text-white/60 text-sm">Peak Productivity Hour</p>
              <p className="text-white text-2xl font-bold">
                {summary.week.peakProductivityHour.label}
              </p>
              <p className="text-green-400 text-sm">
                {summary.week.peakProductivityHour.count} tasks completed
              </p>
            </div>
          )}

          {/* Most Used Features */}
          {summary.week.mostUsedFeatures?.length > 0 && (
            <div>
              <h3 className="text-white/60 text-sm mb-3">Most Used Features</h3>
              <div className="space-y-2">
                {summary.week.mostUsedFeatures.map((f, i) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span className="text-white/40 text-sm w-4">{i + 1}.</span>
                    <span className="flex-1 text-white/80 text-sm capitalize">
                      {f.feature.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white/40 text-sm">{f.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-white/60 text-sm mb-3">Settings</h3>
            <div className="space-y-3">
              <ToggleSetting
                label="Analytics Enabled"
                value={settings.enabled}
                onChange={(v) => updateSettings({ enabled: v })}
              />
              <ToggleSetting
                label="Track Errors"
                value={settings.trackErrors}
                onChange={(v) => updateSettings({ trackErrors: v })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={exportAnalytics}
              className="flex-1 glass-button py-2 text-white text-sm"
            >
              📥 Export Data
            </button>
            <button
              onClick={() => {
                if (confirm('Clear all analytics data?')) {
                  clearAnalytics();
                }
              }}
              className="flex-1 py-2 text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              🗑️ Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="glass p-3 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-white/60 text-xs">{label}</span>
      </div>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  );
}

function ToggleSetting({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/80 text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors ${
          value ? 'bg-green-500' : 'bg-white/20'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

export { EVENT_TYPES };
