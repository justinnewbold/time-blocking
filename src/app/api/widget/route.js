// Widget API - Returns today's frog and task summary
// Can be used by iOS Shortcuts, widgets, or other integrations

import { NextResponse } from 'next/server';

// Widget types supported
const WIDGET_TYPES = {
  SMALL: 'small',      // Shows frog and basic stats
  MEDIUM: 'medium',    // Shows frog, tasks remaining, streak
  LARGE: 'large',      // Shows frog, top 3 tasks, full stats
  COMPACT: 'compact',  // Minimal info for lock screen
  STATS: 'stats',      // Focus on statistics
  ENERGY: 'energy',    // Energy level and suggestions
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';
  const widgetType = searchParams.get('type') || WIDGET_TYPES.MEDIUM;
  const format = searchParams.get('format') || 'json'; // json, scriptable, shortcuts

  // Build widget data based on type
  const baseData = {
    timestamp: new Date().toISOString(),
    userId,
    widgetType,
    today: {
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }),
      shortDate: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      greeting: getGreeting(),
      dayProgress: getDayProgress(),
    },
    frog: {
      hasDaily: false,
      title: null,
      category: null,
      emoji: '🐸',
      message: "No frog selected yet. Open Frog to eat your frog!",
    },
    stats: {
      tasksRemaining: 0,
      tasksCompleted: 0,
      totalTasks: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 200,
      frogsEatenToday: 0,
    },
    energy: {
      current: null,
      lastCheckin: null,
      suggestion: "Check in to see task suggestions",
    },
    tasks: {
      top3: [],
      overdue: [],
      dueToday: [],
      quickWins: [],
    },
    quickActions: [
      { label: 'Open Frog', action: 'open', url: 'https://frog.newbold.cloud' },
      { label: 'Add Task', action: 'add', url: 'https://frog.newbold.cloud?action=add' },
      { label: 'Check Energy', action: 'energy', url: 'https://frog.newbold.cloud?action=checkin' },
      { label: 'Start Focus', action: 'focus', url: 'https://frog.newbold.cloud?action=focus' },
    ],
  };

  // Filter data based on widget type
  let widgetData = filterByWidgetType(baseData, widgetType);

  // Format response based on requested format
  if (format === 'scriptable') {
    widgetData = formatForScriptable(widgetData);
  } else if (format === 'shortcuts') {
    widgetData = formatForShortcuts(widgetData);
  }

  return NextResponse.json(widgetData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function filterByWidgetType(data, type) {
  switch (type) {
    case WIDGET_TYPES.SMALL:
      return {
        timestamp: data.timestamp,
        frog: {
          title: data.frog.title || '🐸 Eat your frog!',
          emoji: data.frog.emoji,
        },
        stats: {
          level: data.stats.level,
          tasksRemaining: data.stats.tasksRemaining,
        },
      };

    case WIDGET_TYPES.COMPACT:
      return {
        frogTitle: data.frog.title || 'Select a frog',
        remaining: data.stats.tasksRemaining,
        streak: data.stats.currentStreak,
      };

    case WIDGET_TYPES.STATS:
      return {
        timestamp: data.timestamp,
        today: data.today,
        stats: data.stats,
        energy: data.energy,
      };

    case WIDGET_TYPES.ENERGY:
      return {
        timestamp: data.timestamp,
        energy: data.energy,
        suggestion: getEnergySuggestion(data.energy.current),
        quickWins: data.tasks.quickWins.slice(0, 3),
      };

    case WIDGET_TYPES.LARGE:
      return {
        ...data,
        tasks: {
          top3: data.tasks.top3,
          overdue: data.tasks.overdue.slice(0, 2),
        },
      };

    case WIDGET_TYPES.MEDIUM:
    default:
      return {
        timestamp: data.timestamp,
        today: data.today,
        frog: data.frog,
        stats: {
          tasksRemaining: data.stats.tasksRemaining,
          tasksCompleted: data.stats.tasksCompleted,
          streak: data.stats.currentStreak,
          level: data.stats.level,
        },
        quickActions: data.quickActions.slice(0, 2),
      };
  }
}

function formatForScriptable(data) {
  // Optimized format for Scriptable widgets
  return {
    ...data,
    _scriptable: {
      refreshInterval: 300, // 5 minutes
      backgroundColor: '#166534',
      textColor: '#ffffff',
      font: 'system',
    },
  };
}

function formatForShortcuts(data) {
  // Format optimized for iOS Shortcuts
  return {
    frogTitle: data.frog?.title || 'No frog selected',
    frogEmoji: data.frog?.emoji || '🐸',
    tasksRemaining: data.stats?.tasksRemaining || 0,
    tasksCompleted: data.stats?.tasksCompleted || 0,
    streak: data.stats?.currentStreak || data.stats?.streak || 0,
    level: data.stats?.level || 1,
    greeting: data.today?.greeting || getGreeting(),
    date: data.today?.shortDate || new Date().toLocaleDateString(),
    message: data.frog?.message || 'Ready to be productive?',
    openUrl: 'https://frog.newbold.cloud',
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night owl? 🦉';
  if (hour < 12) return 'Good morning! ☀️';
  if (hour < 17) return 'Good afternoon! 🌤️';
  if (hour < 21) return 'Good evening! 🌙';
  return 'Good night! 💤';
}

function getDayProgress() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(6, 0, 0, 0); // Day starts at 6am
  const end = new Date(now);
  end.setHours(22, 0, 0, 0); // Day ends at 10pm

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

function getEnergySuggestion(energyLevel) {
  const suggestions = {
    1: "Take it easy. Try a quick 5-minute task.",
    2: "Low energy day. Focus on small wins.",
    3: "Steady energy. Good time for normal tasks.",
    4: "High energy! Perfect for tackling your frog!",
    null: "Check in to get personalized suggestions.",
  };
  return suggestions[energyLevel] || suggestions[null];
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
