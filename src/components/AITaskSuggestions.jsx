'use client';

import { useState, useEffect, useCallback } from 'react';

// AI-powered task suggestions based on:
// - Current energy level
// - Time of day
// - Task completion patterns
// - Due dates
// - Historical productivity data

// Energy-based task matching
const ENERGY_TASK_MATCH = {
  1: { maxDifficulty: 2, preferQuickWins: true, message: "Easy tasks for survival mode" },
  2: { maxDifficulty: 3, preferQuickWins: true, message: "Low-effort tasks to build momentum" },
  3: { maxDifficulty: 4, preferQuickWins: false, message: "Good energy for meaningful work" },
  4: { maxDifficulty: 5, preferQuickWins: false, message: "Peak energy - tackle the hard stuff!" }
};

// Time-of-day productivity patterns
const TIME_PATTERNS = {
  earlyMorning: { hours: [5, 6, 7, 8], boost: ['admin', 'personal'], label: 'Fresh mind time' },
  midMorning: { hours: [9, 10, 11], boost: ['development', 'patty-shack'], label: 'Peak focus hours' },
  afternoon: { hours: [12, 13, 14, 15], boost: ['family', 'home'], label: 'Post-lunch productivity' },
  lateAfternoon: { hours: [16, 17, 18], boost: ['music', 'personal'], label: 'Creative wind-down' },
  evening: { hours: [19, 20, 21], boost: ['family', 'home', 'personal'], label: 'Evening tasks' }
};

// Suggestion reasons for transparency
const SUGGESTION_REASONS = {
  ENERGY_MATCH: 'Matches your energy level',
  DUE_SOON: 'Due soon',
  OVERDUE: 'Overdue - needs attention',
  QUICK_WIN: 'Quick win to build momentum',
  FROG: 'Your daily frog - eat it first!',
  TIME_OPTIMAL: 'Good time for this category',
  STREAK_SAVER: 'Complete to keep your streak',
  TOP_3: 'In your Top 3 for today',
  PATTERN_MATCH: 'You usually do this now',
  CATEGORY_BALANCE: 'Balance your categories'
};

export function useAITaskSuggestions(tasks, energyLevel, stats = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze and generate suggestions
  const generateSuggestions = useCallback(() => {
    if (!tasks || tasks.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);

    // Simulate AI processing delay for UX
    setTimeout(() => {
      const scored = tasks
        .filter(task => !task.completed)
        .map(task => ({
          ...task,
          score: calculateTaskScore(task, energyLevel, stats),
          reasons: getTaskReasons(task, energyLevel, stats)
        }))
        .sort((a, b) => b.score - a.score);

      setSuggestions(scored.slice(0, 5));
      setIsAnalyzing(false);
    }, 300);
  }, [tasks, energyLevel, stats]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  return {
    suggestions,
    isAnalyzing,
    refreshSuggestions: generateSuggestions
  };
}

// Calculate task score based on multiple factors
function calculateTaskScore(task, energyLevel, stats) {
  let score = 0;
  const now = new Date();
  const hour = now.getHours();

  // Base score from difficulty (inverse relationship with energy)
  const energyMatch = ENERGY_TASK_MATCH[energyLevel] || ENERGY_TASK_MATCH[3];
  if (task.difficulty <= energyMatch.maxDifficulty) {
    score += 20;
  }
  if (task.difficulty === energyMatch.maxDifficulty) {
    score += 10; // Bonus for optimal match
  }

  // Frog bonus - always prioritize the frog
  if (task.frog || task.isFrog || task.is_frog) {
    score += 50;
  }

  // Due date urgency
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      score += 40; // Overdue
    } else if (hoursUntilDue < 24) {
      score += 30; // Due within 24 hours
    } else if (hoursUntilDue < 48) {
      score += 15; // Due within 2 days
    }
  }

  // Quick wins for low energy
  if (energyMatch.preferQuickWins && task.estimatedMinutes && task.estimatedMinutes <= 15) {
    score += 25;
  }

  // Time-of-day category boost
  const currentPeriod = Object.values(TIME_PATTERNS).find(p => p.hours.includes(hour));
  if (currentPeriod && currentPeriod.boost.includes(task.category?.toLowerCase())) {
    score += 15;
  }

  // Top 3 bonus
  if (task.isTop3 || task.inTop3) {
    score += 30;
  }

  // Streak protection (if late in day and no tasks completed)
  if (hour >= 18 && stats.tasksCompletedToday === 0) {
    if (task.difficulty <= 2) {
      score += 20; // Easy tasks to save streak
    }
  }

  // Category balance (slight penalty for over-represented categories)
  // This encourages variety in task completion

  return score;
}

// Get human-readable reasons for why a task is suggested
function getTaskReasons(task, energyLevel, stats) {
  const reasons = [];
  const now = new Date();
  const hour = now.getHours();
  const energyMatch = ENERGY_TASK_MATCH[energyLevel] || ENERGY_TASK_MATCH[3];

  if (task.frog || task.isFrog || task.is_frog) {
    reasons.push({ key: 'FROG', text: SUGGESTION_REASONS.FROG, priority: 1 });
  }

  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      reasons.push({ key: 'OVERDUE', text: SUGGESTION_REASONS.OVERDUE, priority: 2 });
    } else if (hoursUntilDue < 48) {
      reasons.push({ key: 'DUE_SOON', text: SUGGESTION_REASONS.DUE_SOON, priority: 3 });
    }
  }

  if (task.isTop3 || task.inTop3) {
    reasons.push({ key: 'TOP_3', text: SUGGESTION_REASONS.TOP_3, priority: 4 });
  }

  if (task.difficulty <= energyMatch.maxDifficulty) {
    reasons.push({ key: 'ENERGY_MATCH', text: SUGGESTION_REASONS.ENERGY_MATCH, priority: 5 });
  }

  if (energyMatch.preferQuickWins && task.estimatedMinutes && task.estimatedMinutes <= 15) {
    reasons.push({ key: 'QUICK_WIN', text: SUGGESTION_REASONS.QUICK_WIN, priority: 6 });
  }

  const currentPeriod = Object.values(TIME_PATTERNS).find(p => p.hours.includes(hour));
  if (currentPeriod && currentPeriod.boost.includes(task.category?.toLowerCase())) {
    reasons.push({ key: 'TIME_OPTIMAL', text: SUGGESTION_REASONS.TIME_OPTIMAL, priority: 7 });
  }

  if (hour >= 18 && stats.tasksCompletedToday === 0 && task.difficulty <= 2) {
    reasons.push({ key: 'STREAK_SAVER', text: SUGGESTION_REASONS.STREAK_SAVER, priority: 3 });
  }

  return reasons.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

// AI Suggestions Card Component
export function AISuggestionsCard({ tasks, energyLevel, stats, onSelectTask }) {
  const { suggestions, isAnalyzing, refreshSuggestions } = useAITaskSuggestions(tasks, energyLevel, stats);
  const [expanded, setExpanded] = useState(false);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const topSuggestion = suggestions[0];
  const otherSuggestions = suggestions.slice(1);

  return (
    <div className="glass-card p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span>AI Suggestions</span>
          {isAnalyzing && (
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </h3>
        <button
          onClick={refreshSuggestions}
          className="text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Energy context */}
      {energyLevel && (
        <p className="text-white/50 text-xs mb-3">
          {ENERGY_TASK_MATCH[energyLevel]?.message}
        </p>
      )}

      {/* Top suggestion */}
      <button
        onClick={() => onSelectTask?.(topSuggestion)}
        className="w-full text-left p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all mb-2"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">
            {topSuggestion.frog || topSuggestion.isFrog ? '🐸' : '⭐'}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">{topSuggestion.title}</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {topSuggestion.reasons?.slice(0, 2).map((reason, i) => (
                <span key={i} className="text-green-400/70 text-xs">
                  {reason.text}
                  {i < Math.min(topSuggestion.reasons.length, 2) - 1 && ' • '}
                </span>
              ))}
            </div>
          </div>
          <span className="text-white/30 text-xs">
            #{1}
          </span>
        </div>
      </button>

      {/* Other suggestions (expandable) */}
      {otherSuggestions.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2 text-white/40 text-xs hover:text-white/60 transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Show less' : `▼ ${otherSuggestions.length} more suggestions`}
          </button>

          {expanded && (
            <div className="space-y-2 mt-2 animate-slide-up">
              {otherSuggestions.map((task, i) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask?.(task)}
                  className="w-full text-left p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs w-4">#{i + 2}</span>
                    <span className="flex-1 text-white/80 text-sm truncate">{task.title}</span>
                    <span className="text-white/30 text-xs">
                      {task.reasons?.[0]?.text?.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Compact inline suggestion
export function InlineSuggestion({ tasks, energyLevel, stats, onSelectTask }) {
  const { suggestions } = useAITaskSuggestions(tasks, energyLevel, stats);

  if (!suggestions || suggestions.length === 0) return null;

  const top = suggestions[0];

  return (
    <button
      onClick={() => onSelectTask?.(top)}
      className="flex items-center gap-2 text-white/60 hover:text-white/80 text-sm transition-colors"
    >
      <span>🤖</span>
      <span className="truncate max-w-[200px]">Try: {top.title}</span>
    </button>
  );
}

// Get optimal task order for a list
export function getOptimalTaskOrder(tasks, energyLevel, stats) {
  if (!tasks || tasks.length === 0) return [];

  return tasks
    .map(task => ({
      ...task,
      score: calculateTaskScore(task, energyLevel, stats)
    }))
    .sort((a, b) => b.score - a.score);
}

// Get productivity insights
export function getProductivityInsights(completedTasks, energyLogs) {
  const insights = [];

  // Best productive hour
  if (completedTasks && completedTasks.length > 0) {
    const hourCounts = {};
    completedTasks.forEach(t => {
      if (t.completedAt || t.completed_at) {
        const hour = new Date(t.completedAt || t.completed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestHour) {
      const hour = parseInt(bestHour[0]);
      insights.push({
        type: 'peak_hour',
        title: 'Peak Productivity',
        value: `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`,
        description: `You complete most tasks around ${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`
      });
    }
  }

  // Average energy pattern
  if (energyLogs && energyLogs.length > 0) {
    const avgEnergy = energyLogs.reduce((sum, log) => sum + (log.energyLevel || log.energy_level || 0), 0) / energyLogs.length;
    insights.push({
      type: 'avg_energy',
      title: 'Average Energy',
      value: avgEnergy.toFixed(1),
      description: avgEnergy >= 3 ? 'Great energy levels!' : 'Consider scheduling harder tasks for high-energy days'
    });
  }

  // Frog eating rate
  const frogsEaten = completedTasks?.filter(t => t.frog || t.isFrog || t.is_frog).length || 0;
  const totalFrogs = completedTasks?.length || 1;
  if (frogsEaten > 0) {
    insights.push({
      type: 'frog_rate',
      title: 'Frog Completion',
      value: `${Math.round((frogsEaten / totalFrogs) * 100)}%`,
      description: 'Tasks completed that were marked as frogs'
    });
  }

  return insights;
}

export default AISuggestionsCard;
