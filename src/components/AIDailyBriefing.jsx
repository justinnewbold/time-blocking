'use client';
import { useState, useEffect, useCallback } from 'react';

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

// Briefing templates based on context
const BRIEFING_TEMPLATES = {
  morning: {
    greeting: ['Good morning!', 'Rise and shine!', 'Ready to conquer the day?'],
    encouragements: [
      "You've got this! Small steps lead to big wins.",
      "Every task completed is progress worth celebrating.",
      "Focus on what matters most to you today.",
      "Remember: done is better than perfect."
    ]
  },
  afternoon: {
    greeting: ['Good afternoon!', 'Hope your day is going well!', 'Afternoon check-in!'],
    encouragements: [
      "Great progress so far! Keep the momentum going.",
      "Take a breather if needed - you've earned it.",
      "The afternoon is full of possibilities.",
      "You're doing better than you think!"
    ]
  },
  evening: {
    greeting: ['Good evening!', 'Winding down?', 'Evening reflection time!'],
    encouragements: [
      "Celebrate what you accomplished today!",
      "Rest is productive too.",
      "Tomorrow is a fresh start.",
      "Be proud of your effort, not just results."
    ]
  }
};

// Hook for AI Daily Briefing
export function useAIDailyBriefing(tasks = [], completedTasks = [], energyLevel = 3) {
  const [briefing, setBriefing] = useState(null);
  const [lastBriefingDate, setLastBriefingDate] = useState(() =>
    Storage.get('lastBriefingDate', null)
  );
  const [briefingHistory, setBriefingHistory] = useState(() =>
    Storage.get('briefingHistory', [])
  );
  const [briefingPreferences, setBriefingPreferences] = useState(() =>
    Storage.get('briefingPreferences', {
      showWeather: false,
      showMotivation: true,
      showStats: true,
      showSuggestions: true,
      autoShow: true,
      preferredTime: '08:00'
    })
  );

  // Save to storage
  useEffect(() => {
    Storage.set('lastBriefingDate', lastBriefingDate);
  }, [lastBriefingDate]);

  useEffect(() => {
    Storage.set('briefingHistory', briefingHistory);
  }, [briefingHistory]);

  useEffect(() => {
    Storage.set('briefingPreferences', briefingPreferences);
  }, [briefingPreferences]);

  // Get time of day
  const getTimeOfDay = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  // Get random item from array
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Generate today's priority suggestion
  const generatePrioritySuggestion = useCallback(() => {
    const pendingTasks = tasks.filter(t => !t.completed);

    if (pendingTasks.length === 0) {
      return {
        type: 'celebration',
        message: "No pending tasks! You're all caught up! 🎉",
        suggestions: []
      };
    }

    // Find frogs (high priority tasks)
    const frogs = pendingTasks.filter(t => t.frog);
    // Find overdue tasks
    const overdue = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    });
    // Find quick wins (low difficulty, short duration)
    const quickWins = pendingTasks.filter(t =>
      (t.difficulty || 3) <= 2 && (t.estimatedMinutes || 25) <= 15
    );

    const suggestions = [];

    if (energyLevel >= 4 && frogs.length > 0) {
      suggestions.push({
        type: 'frog',
        emoji: '🐸',
        task: frogs[0],
        reason: "High energy! Perfect time to tackle your biggest challenge."
      });
    } else if (energyLevel <= 2 && quickWins.length > 0) {
      suggestions.push({
        type: 'quickwin',
        emoji: '⚡',
        task: quickWins[0],
        reason: "Low energy? Start with a quick win to build momentum."
      });
    }

    if (overdue.length > 0) {
      suggestions.push({
        type: 'overdue',
        emoji: '⏰',
        task: overdue[0],
        reason: `This task is overdue - consider prioritizing it.`
      });
    }

    // Add a frog suggestion if energy is moderate and we haven't suggested one
    if (!suggestions.find(s => s.type === 'frog') && frogs.length > 0) {
      suggestions.push({
        type: 'frog',
        emoji: '🐸',
        task: frogs[0],
        reason: "Your most important task for today."
      });
    }

    // Fill with regular tasks if needed
    if (suggestions.length < 3) {
      const remaining = pendingTasks
        .filter(t => !suggestions.find(s => s.task?.id === t.id))
        .slice(0, 3 - suggestions.length);

      remaining.forEach(task => {
        suggestions.push({
          type: 'regular',
          emoji: '📋',
          task,
          reason: "On your list for today."
        });
      });
    }

    return { suggestions: suggestions.slice(0, 3) };
  }, [tasks, energyLevel]);

  // Generate stats summary
  const generateStatsSummary = useCallback(() => {
    const today = new Date().toDateString();
    const todayCompleted = completedTasks.filter(t => {
      const completedDate = t.completedAt ? new Date(t.completedAt).toDateString() : null;
      return completedDate === today;
    });

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const yesterdayCompleted = completedTasks.filter(t => {
      const completedDate = t.completedAt ? new Date(t.completedAt).toDateString() : null;
      return completedDate === yesterday;
    });

    // Calculate streak
    let streak = 0;
    const sortedDates = [...new Set(
      completedTasks
        .filter(t => t.completedAt)
        .map(t => new Date(t.completedAt).toDateString())
    )].sort((a, b) => new Date(b) - new Date(a));

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 86400000).toDateString();
      if (sortedDates[i] === expectedDate || (i === 0 && sortedDates[i] === yesterday)) {
        streak++;
      } else {
        break;
      }
    }

    return {
      todayCompleted: todayCompleted.length,
      yesterdayCompleted: yesterdayCompleted.length,
      pendingCount: tasks.filter(t => !t.completed).length,
      streak,
      trend: todayCompleted.length >= yesterdayCompleted.length ? 'up' : 'down'
    };
  }, [tasks, completedTasks]);

  // Generate full briefing
  const generateBriefing = useCallback(() => {
    const timeOfDay = getTimeOfDay();
    const templates = BRIEFING_TEMPLATES[timeOfDay];
    const prioritySuggestion = generatePrioritySuggestion();
    const stats = generateStatsSummary();

    const briefingContent = {
      id: `briefing_${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeOfDay,
      greeting: randomItem(templates.greeting),
      encouragement: randomItem(templates.encouragements),
      priorities: prioritySuggestion,
      stats,
      energyLevel,
      insights: generateInsights(stats, prioritySuggestion, energyLevel)
    };

    setBriefing(briefingContent);
    setLastBriefingDate(new Date().toDateString());

    // Save to history
    setBriefingHistory(prev => {
      const updated = [briefingContent, ...prev].slice(0, 30);
      return updated;
    });

    return briefingContent;
  }, [getTimeOfDay, generatePrioritySuggestion, generateStatsSummary, energyLevel]);

  // Generate insights
  const generateInsights = (stats, priorities, energy) => {
    const insights = [];

    // Streak insight
    if (stats.streak >= 7) {
      insights.push({
        type: 'streak',
        emoji: '🔥',
        message: `Amazing ${stats.streak}-day streak! You're on fire!`
      });
    } else if (stats.streak >= 3) {
      insights.push({
        type: 'streak',
        emoji: '⭐',
        message: `${stats.streak}-day streak going! Keep it up!`
      });
    }

    // Productivity trend
    if (stats.trend === 'up' && stats.todayCompleted > 0) {
      insights.push({
        type: 'trend',
        emoji: '📈',
        message: `You're outpacing yesterday! Great momentum.`
      });
    }

    // Energy-based insight
    if (energy <= 2) {
      insights.push({
        type: 'energy',
        emoji: '🔋',
        message: 'Low energy day? Focus on essential tasks only.'
      });
    } else if (energy >= 4) {
      insights.push({
        type: 'energy',
        emoji: '💪',
        message: 'High energy! Great day for challenging work.'
      });
    }

    // Task load insight
    if (stats.pendingCount === 0) {
      insights.push({
        type: 'complete',
        emoji: '🎯',
        message: 'All clear! Time to plan ahead or take a break.'
      });
    } else if (stats.pendingCount > 10) {
      insights.push({
        type: 'overload',
        emoji: '⚠️',
        message: 'Heavy task load. Consider prioritizing ruthlessly.'
      });
    }

    return insights.slice(0, 3);
  };

  // Check if briefing should auto-show
  const shouldShowBriefing = useCallback(() => {
    if (!briefingPreferences.autoShow) return false;

    const today = new Date().toDateString();
    if (lastBriefingDate === today) return false;

    const now = new Date();
    const [prefHour, prefMin] = briefingPreferences.preferredTime.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const prefMinutes = prefHour * 60 + prefMin;

    // Show if we're within 2 hours of preferred time
    return Math.abs(currentMinutes - prefMinutes) <= 120;
  }, [briefingPreferences, lastBriefingDate]);

  // Update preferences
  const updatePreferences = useCallback((updates) => {
    setBriefingPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear briefing
  const clearBriefing = useCallback(() => {
    setBriefing(null);
  }, []);

  return {
    // State
    briefing,
    lastBriefingDate,
    briefingHistory,
    briefingPreferences,

    // Actions
    generateBriefing,
    clearBriefing,
    updatePreferences,
    shouldShowBriefing
  };
}

// Priority Task Card
export function PriorityTaskCard({ suggestion, onSelectTask }) {
  if (!suggestion.task) return null;

  return (
    <button
      onClick={() => onSelectTask(suggestion.task)}
      className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{suggestion.emoji}</span>
        <div className="flex-1">
          <p className="font-medium">{suggestion.task.title}</p>
          <p className="text-sm text-white/40 mt-1">{suggestion.reason}</p>
        </div>
      </div>
    </button>
  );
}

// Stats Summary Card
export function StatsSummaryCard({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center p-3 rounded-xl bg-white/5">
        <p className="text-2xl font-bold">{stats.todayCompleted}</p>
        <p className="text-xs text-white/40">Today</p>
      </div>
      <div className="text-center p-3 rounded-xl bg-white/5">
        <p className="text-2xl font-bold">{stats.pendingCount}</p>
        <p className="text-xs text-white/40">Pending</p>
      </div>
      <div className="text-center p-3 rounded-xl bg-white/5">
        <div className="flex items-center justify-center gap-1">
          <span className="text-2xl font-bold">{stats.streak}</span>
          {stats.streak > 0 && <span className="text-orange-400">🔥</span>}
        </div>
        <p className="text-xs text-white/40">Streak</p>
      </div>
    </div>
  );
}

// Insight Card
export function InsightCard({ insight }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <span className="text-xl">{insight.emoji}</span>
      <p className="text-sm">{insight.message}</p>
    </div>
  );
}

// Daily Briefing Card
export function DailyBriefingCard({ briefing, onSelectTask, onDismiss }) {
  if (!briefing) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{briefing.greeting} 👋</h3>
          <p className="text-sm text-white/60">{briefing.encouragement}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/40 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      <StatsSummaryCard stats={briefing.stats} />

      {/* Priorities */}
      {briefing.priorities.suggestions?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-white/60 mb-2">🎯 Today's Focus</h4>
          <div className="space-y-2">
            {briefing.priorities.suggestions.map((suggestion, i) => (
              <PriorityTaskCard
                key={i}
                suggestion={suggestion}
                onSelectTask={onSelectTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {briefing.insights?.length > 0 && (
        <div className="mt-4 space-y-2">
          {briefing.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

// Briefing Preferences Panel
export function BriefingPreferencesPanel({ preferences, onChange }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Briefing Settings</h4>

      <label className="flex items-center justify-between">
        <span className="text-sm">Auto-show daily briefing</span>
        <button
          onClick={() => onChange({ autoShow: !preferences.autoShow })}
          className={`w-10 h-5 rounded-full transition-colors ${
            preferences.autoShow ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            preferences.autoShow ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <div>
        <label className="text-sm text-white/60 block mb-1">Preferred Time</label>
        <input
          type="time"
          value={preferences.preferredTime}
          onChange={(e) => onChange({ preferredTime: e.target.value })}
          className="glass-input px-3 py-2 rounded-lg"
        />
      </div>

      <label className="flex items-center justify-between">
        <span className="text-sm">Show motivation</span>
        <button
          onClick={() => onChange({ showMotivation: !preferences.showMotivation })}
          className={`w-10 h-5 rounded-full transition-colors ${
            preferences.showMotivation ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            preferences.showMotivation ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <label className="flex items-center justify-between">
        <span className="text-sm">Show stats summary</span>
        <button
          onClick={() => onChange({ showStats: !preferences.showStats })}
          className={`w-10 h-5 rounded-full transition-colors ${
            preferences.showStats ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            preferences.showStats ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <label className="flex items-center justify-between">
        <span className="text-sm">Show task suggestions</span>
        <button
          onClick={() => onChange({ showSuggestions: !preferences.showSuggestions })}
          className={`w-10 h-5 rounded-full transition-colors ${
            preferences.showSuggestions ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            preferences.showSuggestions ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>
    </div>
  );
}

// Daily Briefing Modal
export function DailyBriefingModal({ isOpen, onClose, briefingState, onSelectTask }) {
  if (!isOpen) return null;

  const {
    briefing,
    briefingHistory,
    briefingPreferences,
    generateBriefing,
    updatePreferences
  } = briefingState;

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🌟 Daily Briefing</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/60 hover:text-white"
            >
              ⚙️
            </button>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showSettings ? (
            <BriefingPreferencesPanel
              preferences={briefingPreferences}
              onChange={updatePreferences}
            />
          ) : briefing ? (
            <DailyBriefingCard
              briefing={briefing}
              onSelectTask={(task) => {
                onSelectTask(task);
                onClose();
              }}
              onDismiss={onClose}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4">Ready for your daily briefing?</p>
              <button
                onClick={generateBriefing}
                className="glass-button px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30"
              >
                ✨ Generate Briefing
              </button>
            </div>
          )}

          {/* History */}
          {!showSettings && briefingHistory.length > 1 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-2">Recent Briefings</h4>
              <div className="space-y-2">
                {briefingHistory.slice(1, 4).map(b => (
                  <div
                    key={b.id}
                    className="p-2 rounded-lg bg-white/5 text-sm"
                  >
                    <p className="text-white/40">
                      {new Date(b.timestamp).toLocaleDateString()} - {b.timeOfDay}
                    </p>
                    <p className="text-white/60">{b.greeting}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyBriefingModal;
