'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, getUserProgress, getTasks } from '@/lib/supabase';
import { PageBackground, useBackground } from '@/components/BackgroundContext';
import BackgroundSelector from '@/components/BackgroundSelector';

// Categories
const CATEGORIES = {
  'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔' },
  'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋' },
  'home': { name: 'Home', color: '#10b981', emoji: '🏠' },
  'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧' },
  'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵' },
  'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨' },
};

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

// Glass Icon Button
function GlassIconButton({ icon, onClick, size = 'md' }) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-12 h-12 text-xl' };
  return (
    <button onClick={onClick} className={`glass-icon ${sizes[size]} flex items-center justify-center transition-all hover:scale-105 active:scale-95`}>
      <span>{icon}</span>
    </button>
  );
}

// Glass Stat Card
function GlassStatCard({ icon, label, value, sublabel, accentColor = 'green' }) {
  const colors = {
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  };
  
  return (
    <div className={`glass-card bg-gradient-to-br ${colors[accentColor]} p-4`}>
      <div className="flex items-center gap-3">
        <div className="glass-icon-sm w-12 h-12 flex items-center justify-center">
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-white/60 text-sm">{label}</p>
          {sublabel && <p className="text-white/40 text-xs">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// XP Bar Chart
function XPChart({ weeklyData, maxXP }) {
  const barMaxHeight = 100;
  
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
          <span className="text-xl">📈</span>
        </div>
        <h3 className="text-lg font-semibold text-white">Weekly XP</h3>
      </div>
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
                  isToday ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-white/20'
                }`}
                style={{ height: Math.max(height, day.xp > 0 ? 8 : 2), minHeight: 2 }}
              />
              <span className={`text-xs mt-2 ${isToday ? 'text-green-400 font-bold' : 'text-white/50'}`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Category Breakdown
function CategoryBreakdown({ categoryData }) {
  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
          <span className="text-xl">🎯</span>
        </div>
        <h3 className="text-lg font-semibold text-white">By Category</h3>
      </div>
      <div className="space-y-3">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const count = categoryData[key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/80 flex items-center gap-2">
                  <span>{cat.emoji}</span> {cat.name}
                </span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Streak Calendar
function StreakCalendar({ streakDays }) {
  const last14Days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last14Days.push({
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate(),
      active: streakDays.includes(date.toISOString().split('T')[0])
    });
  }
  
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
          <span className="text-xl">🔥</span>
        </div>
        <h3 className="text-lg font-semibold text-white">Activity</h3>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {last14Days.map((day) => (
          <div
            key={day.date}
            className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
              day.active
                ? 'glass-button bg-green-500/30 text-green-400 border-green-500/50'
                : 'glass-button text-white/30'
            }`}
          >
            {day.dayNum}
          </div>
        ))}
      </div>
      <p className="text-center text-white/40 text-xs mt-3">Last 14 days</p>
    </div>
  );
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalXP: 0, level: 1, currentStreak: 0, longestStreak: 0,
    tasksCompleted: 0, frogsEaten: 0, totalFocusMinutes: 0
  });
  const [weeklyXP, setWeeklyXP] = useState([]);
  const [categoryData, setCategoryData] = useState({});
  const [streakDays, setStreakDays] = useState([]);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [userId] = useState('justin');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      
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
      
      const tasks = await getTasks();
      const completedTasks = tasks.filter(t => t.completed);
      
      const catCounts = {};
      completedTasks.forEach(t => {
        catCounts[t.category] = (catCounts[t.category] || 0) + 1;
      });
      setCategoryData(catCounts);
      
      const last7Days = getLast7Days();
      const weekData = last7Days.map(day => {
        const dayTasks = completedTasks.filter(t => 
          t.completed_at && t.completed_at.split('T')[0] === day.date
        );
        return { ...day, xp: dayTasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0) };
      });
      setWeeklyXP(weekData);
      
      const activeDays = [...new Set(
        completedTasks.filter(t => t.completed_at).map(t => t.completed_at.split('T')[0])
      )];
      setStreakDays(activeDays);
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
      <PageBackground page="stats">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-float">📊</div>
            <div className="glass-card px-8 py-4">
              <p className="text-white/80">Loading stats...</p>
            </div>
          </div>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground page="stats">
      <div className="min-h-screen pb-24 safe-area-top">
        {/* Glass Header */}
        <div className="sticky top-0 z-40 glass-dark safe-area-top">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                <span>←</span>
                <span className="font-medium">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <h1 className="text-lg font-bold text-white">Stats</h1>
              </div>
              <GlassIconButton icon="🎨" onClick={() => setShowBackgroundSelector(true)} size="sm" />
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-4">
          {/* Level Hero Card */}
          <div className="glass-card p-6 text-center bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
            <div className="text-6xl mb-3 animate-float">🐸</div>
            <p className="text-3xl font-bold text-white">Level {stats.level}</p>
            <p className="text-green-400 font-semibold text-xl">{stats.totalXP} XP</p>
            <div className="mt-4 h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${stats.totalXP % 100}%` }}
              />
            </div>
            <p className="text-white/50 text-sm mt-2">{100 - (stats.totalXP % 100)} XP to next level</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <GlassStatCard icon="✅" label="Tasks Done" value={stats.tasksCompleted} accentColor="green" />
            <GlassStatCard icon="🐸" label="Frogs Eaten" value={stats.frogsEaten} accentColor="purple" />
            <GlassStatCard 
              icon="🔥" label="Streak" value={`${stats.currentStreak}d`} 
              sublabel={`Best: ${stats.longestStreak}d`} accentColor="orange" 
            />
            <GlassStatCard 
              icon="⏱️" label="Focus" value={`${stats.totalFocusMinutes}m`}
              sublabel={`~${Math.round(stats.totalFocusMinutes / 60)}h`} accentColor="blue"
            />
          </div>

          {/* Weekly Summary */}
          <div className="glass-card p-4">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{weeklyTotal}</p>
                <p className="text-white/50 text-xs">Weekly XP</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-purple-400">{avgDailyXP}</p>
                <p className="text-white/50 text-xs">Avg Daily</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-orange-400">{weeklyXP.filter(d => d.xp > 0).length}</p>
                <p className="text-white/50 text-xs">Active Days</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <XPChart weeklyData={weeklyXP} maxXP={maxWeeklyXP} />
          <CategoryBreakdown categoryData={categoryData} />
          <StreakCalendar streakDays={streakDays} />

          {/* Motivational Footer */}
          <div className="text-center py-4">
            <p className="text-white/40 text-sm">
              {stats.frogsEaten >= 10 
                ? "🏆 You're a Frog-eating machine!" 
                : stats.currentStreak >= 7 
                  ? "🔥 Incredible streak!"
                  : "🌱 Every task is progress!"}
            </p>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom z-40">
          <div className="flex justify-around py-3">
            <Link href="/" className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">🐸</span>
              </div>
              <span className="text-xs">Tasks</span>
            </Link>
            <div className="flex flex-col items-center text-green-400">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-xs font-medium">Stats</span>
            </div>
            <button onClick={() => setShowBackgroundSelector(true)} className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>

        {/* Background Selector */}
        <BackgroundSelector
          isOpen={showBackgroundSelector}
          onClose={() => setShowBackgroundSelector(false)}
          currentPage="stats"
        />
      </div>
    </PageBackground>
  );
}
