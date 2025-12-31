'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, getUserProgress, getTasks } from '@/lib/supabase';

// Categories (same as main app)
const CATEGORIES = {
  'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔' },
  'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋' },
  'home': { name: 'Home', color: '#10b981', emoji: '🏠' },
  'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧' },
  'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵' },
  'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨' },
};

// Helper to get last 7 days
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate()
    });
  }
  return days;
}

// XP Bar Chart Component
function XPChart({ weeklyData, maxXP }) {
  const barMaxHeight = 120;
  
  return (
    <div className="bg-slate-800/50 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📈</span> Weekly XP
      </h3>
      <div className="flex items-end justify-between gap-2" style={{ height: barMaxHeight + 40 }}>
        {weeklyData.map((day, i) => {
          const height = maxXP > 0 ? (day.xp / maxXP) * barMaxHeight : 0;
          const isToday = i === weeklyData.length - 1;
          return (
            <div key={day.date} className="flex flex-col items-center flex-1">
              <span className="text-xs text-green-400 font-medium mb-1">
                {day.xp > 0 ? day.xp : ''}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  isToday ? 'bg-green-500' : 'bg-green-600/60'
                }`}
                style={{ 
                  height: Math.max(height, day.xp > 0 ? 8 : 2),
                  minHeight: 2
                }}
              />
              <span className={`text-xs mt-2 ${isToday ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Category Breakdown Component
function CategoryBreakdown({ categoryData }) {
  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="bg-slate-800/50 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🎯</span> Tasks by Category
      </h3>
      <div className="space-y-3">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const count = categoryData[key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  {cat.name}
                </span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: cat.color 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Streak Calendar Component
function StreakCalendar({ streakDays }) {
  const last14Days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last14Days.push({
      date: dateStr,
      dayNum: date.getDate(),
      active: streakDays.includes(dateStr)
    });
  }
  
  return (
    <div className="bg-slate-800/50 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🔥</span> Activity Streak
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {last14Days.map((day) => (
          <div
            key={day.date}
            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
              day.active
                ? 'bg-green-500 text-white'
                : 'bg-slate-700/50 text-gray-500'
            }`}
          >
            {day.dayNum}
          </div>
        ))}
      </div>
      <p className="text-center text-gray-400 text-sm mt-3">Last 14 days</p>
    </div>
  );
}

// Stats Card Component
function StatCard({ icon, label, value, sublabel, color = 'green' }) {
  const colors = {
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
          {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// Focus Time Chart
function FocusTimeChart({ sessions }) {
  const last7Days = getLast7Days();
  const dailyMinutes = last7Days.map(day => {
    const daysSessions = sessions.filter(s => 
      s.started_at && s.started_at.split('T')[0] === day.date && s.completed
    );
    return {
      ...day,
      minutes: daysSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    };
  });
  
  const maxMinutes = Math.max(...dailyMinutes.map(d => d.minutes), 60);
  const barMaxHeight = 100;
  
  return (
    <div className="bg-slate-800/50 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>⏱️</span> Focus Time (minutes)
      </h3>
      <div className="flex items-end justify-between gap-2" style={{ height: barMaxHeight + 40 }}>
        {dailyMinutes.map((day, i) => {
          const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * barMaxHeight : 0;
          const isToday = i === dailyMinutes.length - 1;
          return (
            <div key={day.date} className="flex flex-col items-center flex-1">
              <span className="text-xs text-purple-400 font-medium mb-1">
                {day.minutes > 0 ? day.minutes : ''}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  isToday ? 'bg-purple-500' : 'bg-purple-600/60'
                }`}
                style={{ 
                  height: Math.max(height, day.minutes > 0 ? 8 : 2),
                  minHeight: 2
                }}
              />
              <span className={`text-xs mt-2 ${isToday ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    tasksCompleted: 0,
    frogsEaten: 0,
    totalFocusMinutes: 0
  });
  const [weeklyXP, setWeeklyXP] = useState([]);
  const [categoryData, setCategoryData] = useState({});
  const [streakDays, setStreakDays] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [userId] = useState('justin');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      
      // Get user progress
      const progress = await getUserProgress(userId);
      if (progress) {
        setStats({
          totalXP: progress.total_xp || 0,
          level: progress.level || 1,
          currentStreak: progress.current_streak || 0,
          longestStreak: progress.longest_streak || 0,
          tasksCompleted: progress.tasks_completed || 0,
          frogsEaten: progress.frogs_eaten || 0,
          totalFocusMinutes: progress.total_focus_minutes || 0
        });
      }
      
      // Get all tasks for category breakdown
      const tasks = await getTasks();
      const completedTasks = tasks.filter(t => t.completed);
      
      // Calculate category counts
      const catCounts = {};
      completedTasks.forEach(t => {
        catCounts[t.category] = (catCounts[t.category] || 0) + 1;
      });
      setCategoryData(catCounts);
      
      // Calculate weekly XP
      const last7Days = getLast7Days();
      const weekData = last7Days.map(day => {
        const dayTasks = completedTasks.filter(t => 
          t.completed_at && t.completed_at.split('T')[0] === day.date
        );
        return {
          ...day,
          xp: dayTasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0)
        };
      });
      setWeeklyXP(weekData);
      
      // Calculate streak days (days with completions)
      const activeDays = [...new Set(
        completedTasks
          .filter(t => t.completed_at)
          .map(t => t.completed_at.split('T')[0])
      )];
      setStreakDays(activeDays);
      
      // Get sessions
      const { data: sessionsData } = await supabase
        .from('focusflow_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      setSessions(sessionsData || []);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxWeeklyXP = Math.max(...weeklyXP.map(d => d.xp), 50);
  const weeklyTotal = weeklyXP.reduce((sum, d) => sum + d.xp, 0);
  const avgDailyXP = Math.round(weeklyTotal / 7);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <p className="text-green-400">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link 
            href="/"
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <span>←</span>
            <span className="font-medium">Back to Tasks</span>
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span> Stats
          </h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Level & XP Hero */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6 text-center">
          <div className="text-6xl mb-2">🐸</div>
          <p className="text-3xl font-bold text-white">Level {stats.level}</p>
          <p className="text-green-400 font-semibold text-xl">{stats.totalXP} XP</p>
          <div className="mt-3 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.totalXP % 100)}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">{100 - (stats.totalXP % 100)} XP to next level</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard 
            icon="✅" 
            label="Tasks Done" 
            value={stats.tasksCompleted}
            color="green"
          />
          <StatCard 
            icon="🐸" 
            label="Frogs Eaten" 
            value={stats.frogsEaten}
            color="purple"
          />
          <StatCard 
            icon="🔥" 
            label="Current Streak" 
            value={`${stats.currentStreak} days`}
            sublabel={`Best: ${stats.longestStreak} days`}
            color="orange"
          />
          <StatCard 
            icon="⏱️" 
            label="Focus Time" 
            value={`${stats.totalFocusMinutes}m`}
            sublabel={`~${Math.round(stats.totalFocusMinutes / 60)}h total`}
            color="blue"
          />
        </div>

        {/* Weekly Summary */}
        <div className="bg-slate-800/50 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>📅</span> This Week
          </h3>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{weeklyTotal}</p>
              <p className="text-xs text-gray-400">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{avgDailyXP}</p>
              <p className="text-xs text-gray-400">Avg Daily</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">
                {weeklyXP.filter(d => d.xp > 0).length}
              </p>
              <p className="text-xs text-gray-400">Active Days</p>
            </div>
          </div>
        </div>

        {/* Weekly XP Chart */}
        <XPChart weeklyData={weeklyXP} maxXP={maxWeeklyXP} />

        {/* Focus Time Chart */}
        <FocusTimeChart sessions={sessions} />

        {/* Category Breakdown */}
        <CategoryBreakdown categoryData={categoryData} />

        {/* Streak Calendar */}
        <StreakCalendar streakDays={streakDays} />

        {/* Motivational Footer */}
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">
            {stats.frogsEaten >= 10 
              ? "🏆 You're a Frog-eating machine!" 
              : stats.currentStreak >= 7 
                ? "🔥 Incredible streak! Keep it going!"
                : stats.tasksCompleted >= 5
                  ? "💪 Great progress! You've got this!"
                  : "🌱 Every task completed is a win!"}
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link 
            href="/"
            className="flex flex-col items-center text-gray-400 hover:text-green-400 transition-colors"
          >
            <span className="text-2xl">🐸</span>
            <span className="text-xs mt-1">Tasks</span>
          </Link>
          <div className="flex flex-col items-center text-green-400">
            <span className="text-2xl">📊</span>
            <span className="text-xs mt-1 font-medium">Stats</span>
          </div>
          <Link 
            href="/"
            className="flex flex-col items-center text-gray-400 hover:text-green-400 transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
