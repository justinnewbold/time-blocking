// Widget API - Returns today's frog and task summary
// Can be used by iOS Shortcuts, widgets, or other integrations

import { NextResponse } from 'next/server';
import { getTasks, getUserProgress } from '@/lib/supabase';

// Widget types supported
const WIDGET_TYPES = {
  SMALL: 'small',      // Shows frog and basic stats
  MEDIUM: 'medium',    // Shows frog, tasks remaining, streak
  LARGE: 'large',      // Shows frog, top 3 tasks, full stats
  COMPACT: 'compact',  // Minimal info for lock screen
  STATS: 'stats',      // Focus on statistics
  ENERGY: 'energy',    // Energy level and suggestions
};

// Get app URL from environment or construct from request
function getAppUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const widgetType = searchParams.get('type') || WIDGET_TYPES.MEDIUM;
  const format = searchParams.get('format') || 'json'; // json, scriptable, shortcuts
  const appUrl = getAppUrl(request);

  // If no userId provided, return error
  if (!userId) {
    return NextResponse.json({
      error: 'userId parameter is required',
      timestamp: new Date().toISOString(),
    }, {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // Fetch real data from Supabase
    const [tasks, progress] = await Promise.all([
      getTasks(userId),
      getUserProgress(userId),
    ]);

    const incompleteTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const frogTask = incompleteTasks.find(t => t.is_frog);
    const today = new Date().toISOString().split('T')[0];
    const todayCompletedFrogs = completedTasks.filter(t =>
      t.is_frog && t.completed_at && t.completed_at.startsWith(today)
    ).length;

    // Get overdue and due today tasks
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueTasks = incompleteTasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due < now;
    });
    const dueTodayTasks = incompleteTasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === now.getTime();
    });

    // Quick wins = low difficulty incomplete tasks
    const quickWins = incompleteTasks
      .filter(t => t.difficulty <= 2)
      .slice(0, 5);

    // Build widget data
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
        hasDaily: !!frogTask,
        title: frogTask?.title || null,
        category: frogTask?.category || null,
        emoji: '🐸',
        message: frogTask
          ? `Your frog: ${frogTask.title}`
          : "No frog selected yet. Open Frog to eat your frog!",
      },
      stats: {
        tasksRemaining: incompleteTasks.length,
        tasksCompleted: completedTasks.length,
        totalTasks: tasks.length,
        completionRate: tasks.length > 0
          ? Math.round((completedTasks.length / tasks.length) * 100)
          : 0,
        currentStreak: progress?.current_streak || 0,
        longestStreak: progress?.longest_streak || 0,
        level: progress?.level || 1,
        xp: progress?.total_xp || 0,
        xpToNextLevel: ((progress?.level || 1) * 200) - (progress?.total_xp || 0),
        frogsEatenToday: todayCompletedFrogs,
      },
      energy: {
        current: null, // Energy is stored client-side
        lastCheckin: null,
        suggestion: "Check in to see task suggestions",
      },
      tasks: {
        top3: incompleteTasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          difficulty: t.difficulty,
          isFrog: t.is_frog,
        })),
        overdue: overdueTasks.map(t => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
        })),
        dueToday: dueTodayTasks.map(t => ({
          id: t.id,
          title: t.title,
        })),
        quickWins: quickWins.map(t => ({
          id: t.id,
          title: t.title,
          difficulty: t.difficulty,
        })),
      },
      quickActions: [
        { label: 'Open Frog', action: 'open', url: appUrl },
        { label: 'Add Task', action: 'add', url: `${appUrl}?action=add` },
        { label: 'Check Energy', action: 'energy', url: `${appUrl}?action=checkin` },
        { label: 'Start Focus', action: 'focus', url: `${appUrl}?action=focus` },
      ],
    };

    // Filter data based on widget type
    let widgetData = filterByWidgetType(baseData, widgetType, appUrl);

    // Format response based on requested format
    if (format === 'scriptable') {
      widgetData = formatForScriptable(widgetData);
    } else if (format === 'shortcuts') {
      widgetData = formatForShortcuts(widgetData, appUrl);
    }

    return NextResponse.json(widgetData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Widget API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch data',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

function filterByWidgetType(data, type, appUrl) {
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

function formatForShortcuts(data, appUrl) {
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
    openUrl: appUrl,
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
