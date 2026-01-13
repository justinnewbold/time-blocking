'use client';

import { useState, useMemo } from 'react';

// Generate productivity report data
export function useProductivityReport(tasks, completedTasks, userProgress, energyLog = []) {
  return useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Filter completed tasks by time period
    const weeklyCompleted = completedTasks.filter(t => {
      const completedAt = new Date(t.completed_at || t.completedAt);
      return completedAt >= oneWeekAgo;
    });

    const monthlyCompleted = completedTasks.filter(t => {
      const completedAt = new Date(t.completed_at || t.completedAt);
      return completedAt >= oneMonthAgo;
    });

    // Calculate daily averages
    const dailyAvgWeek = weeklyCompleted.length / 7;
    const dailyAvgMonth = monthlyCompleted.length / 30;

    // Category breakdown
    const categoryBreakdown = {};
    monthlyCompleted.forEach(task => {
      const cat = task.category || 'uncategorized';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Best day of week
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    monthlyCompleted.forEach(task => {
      const day = new Date(task.completed_at || task.completedAt).getDay();
      dayOfWeekCounts[day]++;
    });
    const bestDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Best time of day
    const hourCounts = Array(24).fill(0);
    monthlyCompleted.forEach(task => {
      const hour = new Date(task.completed_at || task.completedAt).getHours();
      hourCounts[hour]++;
    });
    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
    const getTimeOfDay = (hour) => {
      if (hour >= 5 && hour < 12) return 'Morning';
      if (hour >= 12 && hour < 17) return 'Afternoon';
      if (hour >= 17 && hour < 21) return 'Evening';
      return 'Night';
    };

    // Frog completion rate
    const frogsCompleted = monthlyCompleted.filter(t => t.frog).length;
    const frogsAssigned = [...tasks, ...completedTasks].filter(t => {
      const createdAt = new Date(t.created_at || t.createdAt);
      return createdAt >= oneMonthAgo && t.frog;
    }).length;
    const frogCompletionRate = frogsAssigned > 0 ? (frogsCompleted / frogsAssigned * 100) : 0;

    // Energy patterns
    const energyByTime = { morning: [], afternoon: [], evening: [] };
    energyLog.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (hour >= 5 && hour < 12) energyByTime.morning.push(log.level);
      else if (hour >= 12 && hour < 17) energyByTime.afternoon.push(log.level);
      else if (hour >= 17 && hour < 21) energyByTime.evening.push(log.level);
    });

    const avgEnergy = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // Streak data
    const currentStreak = userProgress?.streak || 0;
    const longestStreak = userProgress?.longestStreak || 0;
    const streakHealth = currentStreak >= longestStreak * 0.8 ? 'excellent' :
                        currentStreak >= longestStreak * 0.5 ? 'good' : 'needs-attention';

    // Time estimation accuracy
    const tasksWithEstimates = monthlyCompleted.filter(t => t.estimatedMinutes && t.actualMinutes);
    const accuracyData = tasksWithEstimates.map(t => ({
      estimated: t.estimatedMinutes,
      actual: t.actualMinutes,
      accuracy: Math.min(t.estimatedMinutes, t.actualMinutes) / Math.max(t.estimatedMinutes, t.actualMinutes) * 100,
    }));
    const avgAccuracy = accuracyData.length > 0
      ? accuracyData.reduce((sum, t) => sum + t.accuracy, 0) / accuracyData.length
      : null;

    return {
      weekly: {
        tasksCompleted: weeklyCompleted.length,
        dailyAverage: dailyAvgWeek.toFixed(1),
        frogsEaten: weeklyCompleted.filter(t => t.frog).length,
        focusMinutes: weeklyCompleted.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes || 0), 0),
      },
      monthly: {
        tasksCompleted: monthlyCompleted.length,
        dailyAverage: dailyAvgMonth.toFixed(1),
        frogsEaten: frogsCompleted,
        focusMinutes: monthlyCompleted.reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes || 0), 0),
      },
      insights: {
        bestDay: dayNames[bestDayIndex],
        bestTimeOfDay: getTimeOfDay(bestHour),
        bestHour,
        topCategory: Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
        frogCompletionRate: frogCompletionRate.toFixed(0),
        estimationAccuracy: avgAccuracy ? avgAccuracy.toFixed(0) : null,
      },
      streak: {
        current: currentStreak,
        longest: longestStreak,
        health: streakHealth,
      },
      energy: {
        morning: avgEnergy(energyByTime.morning),
        afternoon: avgEnergy(energyByTime.afternoon),
        evening: avgEnergy(energyByTime.evening),
      },
      categoryBreakdown,
      dayOfWeekCounts,
      hourCounts,
    };
  }, [tasks, completedTasks, userProgress, energyLog]);
}

// Productivity Report Modal
export function ProductivityReportModal({ isOpen, onClose, report, period = 'weekly' }) {
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  if (!isOpen || !report) return null;

  const data = selectedPeriod === 'weekly' ? report.weekly : report.monthly;
  const periodLabel = selectedPeriod === 'weekly' ? 'This Week' : 'This Month';

  const energyLabels = { 1: 'Zombie', 2: 'Low', 3: 'Cruising', 4: 'Locked In' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span> Productivity Report
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedPeriod('weekly')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              selectedPeriod === 'weekly'
                ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                : 'glass-button text-white/70'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setSelectedPeriod('monthly')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              selectedPeriod === 'monthly'
                ? 'bg-purple-500/30 border border-purple-500/50 text-white'
                : 'glass-button text-white/70'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4 rounded-xl text-center">
            <p className="text-3xl font-bold text-white">{data.tasksCompleted}</p>
            <p className="text-white/60 text-sm">Tasks Completed</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <p className="text-3xl font-bold text-white">{data.dailyAverage}</p>
            <p className="text-white/60 text-sm">Daily Average</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <p className="text-3xl font-bold text-white">{data.frogsEaten} 🐸</p>
            <p className="text-white/60 text-sm">Frogs Eaten</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <p className="text-3xl font-bold text-white">{Math.round(data.focusMinutes / 60)}h</p>
            <p className="text-white/60 text-sm">Focus Time</p>
          </div>
        </div>

        {/* Streak Status */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">🔥 Streak Status</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              report.streak.health === 'excellent' ? 'bg-green-500/30 text-green-300' :
              report.streak.health === 'good' ? 'bg-yellow-500/30 text-yellow-300' :
              'bg-red-500/30 text-red-300'
            }`}>
              {report.streak.health === 'excellent' ? 'On Fire!' :
               report.streak.health === 'good' ? 'Going Strong' : 'Needs Attention'}
            </span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-4xl font-bold text-white">{report.streak.current}</p>
              <p className="text-white/60 text-sm">Current</p>
            </div>
            <div className="text-white/40">/</div>
            <div>
              <p className="text-2xl font-bold text-white/60">{report.streak.longest}</p>
              <p className="text-white/40 text-sm">Best</p>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <p className="text-white font-medium mb-3">💡 Insights</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Most Productive Day</span>
              <span className="text-white">{report.insights.bestDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Peak Performance Time</span>
              <span className="text-white">{report.insights.bestTimeOfDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Top Category</span>
              <span className="text-white capitalize">{report.insights.topCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Frog Completion Rate</span>
              <span className="text-white">{report.insights.frogCompletionRate}%</span>
            </div>
            {report.insights.estimationAccuracy && (
              <div className="flex justify-between">
                <span className="text-white/60">Time Estimation Accuracy</span>
                <span className="text-white">{report.insights.estimationAccuracy}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Energy Patterns */}
        {(report.energy.morning || report.energy.afternoon || report.energy.evening) && (
          <div className="glass-card p-4 rounded-xl mb-6">
            <p className="text-white font-medium mb-3">⚡ Energy Patterns</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="glass-card p-3 rounded-lg">
                <p className="text-xl">🌅</p>
                <p className="text-white/60 text-xs">Morning</p>
                <p className="text-white font-medium">
                  {report.energy.morning ? energyLabels[Math.round(report.energy.morning)] : '-'}
                </p>
              </div>
              <div className="glass-card p-3 rounded-lg">
                <p className="text-xl">☀️</p>
                <p className="text-white/60 text-xs">Afternoon</p>
                <p className="text-white font-medium">
                  {report.energy.afternoon ? energyLabels[Math.round(report.energy.afternoon)] : '-'}
                </p>
              </div>
              <div className="glass-card p-3 rounded-lg">
                <p className="text-xl">🌙</p>
                <p className="text-white/60 text-xs">Evening</p>
                <p className="text-white font-medium">
                  {report.energy.evening ? energyLabels[Math.round(report.energy.evening)] : '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Day of Week Chart */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <p className="text-white font-medium mb-3">📅 Tasks by Day</p>
          <div className="flex items-end justify-between h-24 px-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
              const count = report.dayOfWeekCounts[idx];
              const maxCount = Math.max(...report.dayOfWeekCounts, 1);
              const height = (count / maxCount) * 100;

              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full max-w-[20px] bg-blue-500/50 rounded-t transition-all"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-white/40 text-xs mt-1">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(report.categoryBreakdown).length > 0 && (
          <div className="glass-card p-4 rounded-xl">
            <p className="text-white font-medium mb-3">📁 By Category</p>
            <div className="space-y-2">
              {Object.entries(report.categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category, count]) => {
                  const total = Object.values(report.categoryBreakdown).reduce((a, b) => a + b, 0);
                  const percentage = (count / total * 100).toFixed(0);

                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-white capitalize text-sm">{category}</span>
                          <span className="text-white/60 text-sm">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Weekly Summary Card (for dashboard)
export function WeeklySummaryCard({ report, onClick }) {
  if (!report) return null;

  const { weekly, streak } = report;

  return (
    <button
      onClick={onClick}
      className="w-full glass-card p-4 rounded-xl text-left hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">📊 This Week</span>
        <span className="text-white/40 text-sm">View Report →</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{weekly.tasksCompleted}</p>
          <p className="text-white/40 text-xs">Tasks</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{weekly.frogsEaten}</p>
          <p className="text-white/40 text-xs">Frogs 🐸</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{streak.current}</p>
          <p className="text-white/40 text-xs">Streak 🔥</p>
        </div>
      </div>
    </button>
  );
}

export default ProductivityReportModal;
