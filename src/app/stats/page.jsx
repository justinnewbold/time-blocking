'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageBackground } from '@/components/BackgroundContext';
import BackgroundSelector from '@/components/BackgroundSelector';
import { useAchievements } from '@/components/AchievementsContext';

// Storage helper
const Storage = {
  get: (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`frog_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  }
};

// Glass stat card component
const GlassStatCard = ({ icon, label, value, subValue, accent = 'green' }) => {
  const accents = {
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20'
  };
  
  return (
    <div className={`glass-card bg-gradient-to-br ${accents[accent]} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-white/60 text-sm">{label}</span>
      </div>
      <p className="text-white text-2xl font-bold">{value}</p>
      {subValue && <p className="text-white/40 text-xs mt-1">{subValue}</p>}
    </div>
  );
};

// Time saved chart
const TimeSavedChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4">⏱️ Time Saved This Week</h3>
        <p className="text-white/40 text-sm text-center py-8">Complete tasks to see time saved!</p>
      </div>
    );
  }
  
  const maxSaved = Math.max(...data.map(d => d.saved), 1);
  
  return (
    <div className="glass-card p-4">
      <h3 className="text-white font-semibold mb-4">⏱️ Time Saved This Week</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((day, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <div className="flex-1 w-full flex items-end">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500"
                style={{ height: `${(day.saved / maxSaved) * 100}%`, minHeight: day.saved > 0 ? '4px' : '0' }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2">{day.label}</p>
            {day.saved > 0 && <p className="text-blue-400 text-xs">{day.saved}m</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

// Accuracy chart - estimated vs actual
const AccuracyChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4">🎯 Estimation Accuracy</h3>
        <p className="text-white/40 text-sm text-center py-8">Complete timed tasks to track accuracy!</p>
      </div>
    );
  }
  
  return (
    <div className="glass-card p-4">
      <h3 className="text-white font-semibold mb-4">🎯 Recent Task Times</h3>
      <div className="space-y-3">
        {data.slice(-5).reverse().map((task, idx) => {
          const diff = task.estimated - task.actual;
          const isEarly = diff > 0;
          const diffPercent = Math.round((task.actual / task.estimated) * 100);
          
          return (
            <div key={idx} className="bg-white/5 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80 text-sm truncate flex-1">{task.title || 'Task'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isEarly ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {isEarly ? `${diff}m early` : `${Math.abs(diff)}m over`}
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-white/40">Est: {task.estimated}m</span>
                <span className="text-white/40">Actual: {task.actual}m</span>
                <span className={isEarly ? 'text-green-400' : 'text-orange-400'}>{diffPercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Daily timeline
const DailyTimeline = ({ data }) => {
  // Group by hour
  const hourlyData = Array(24).fill(0).map((_, hour) => ({
    hour,
    count: data.filter(d => d.hour === hour).length
  }));
  
  const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
  const activeHours = hourlyData.filter(h => h.count > 0);
  
  if (activeHours.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4">📅 Productivity by Hour</h3>
        <p className="text-white/40 text-sm text-center py-8">Complete tasks to see your patterns!</p>
      </div>
    );
  }
  
  // Show only hours 6am to midnight
  const displayHours = hourlyData.slice(6, 24);
  
  return (
    <div className="glass-card p-4">
      <h3 className="text-white font-semibold mb-4">📅 Productivity by Hour</h3>
      <div className="flex items-end gap-1 h-24">
        {displayHours.map((h) => (
          <div 
            key={h.hour}
            className="flex-1 relative group"
          >
            <div 
              className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t transition-all"
              style={{ height: `${(h.count / maxCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {h.hour}:00 - {h.count} tasks
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-white/40 text-xs">6am</span>
        <span className="text-white/40 text-xs">12pm</span>
        <span className="text-white/40 text-xs">6pm</span>
        <span className="text-white/40 text-xs">12am</span>
      </div>
    </div>
  );
};

// Category breakdown
const CategoryBreakdown = ({ tasks }) => {
  const categories = {};
  tasks.forEach(t => {
    const cat = t.category || 'personal';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  const CATEGORY_INFO = {
    'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔' },
    'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋' },
    'home': { name: 'Home', color: '#10b981', emoji: '🏠' },
    'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧' },
    'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵' },
    'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨' },
  };
  
  const total = Object.values(categories).reduce((a, b) => a + b, 0);
  
  return (
    <div className="glass-card p-4">
      <h3 className="text-white font-semibold mb-4">📁 Tasks by Category</h3>
      <div className="space-y-3">
        {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const info = CATEGORY_INFO[cat] || { name: cat, color: '#888', emoji: '📌' };
          const percent = Math.round((count / total) * 100);
          
          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span>{info.emoji}</span>
                  <span className="text-white/80 text-sm">{info.name}</span>
                </div>
                <span className="text-white/60 text-sm">{count} ({percent}%)</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: info.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Weekly calendar
const WeeklyCalendar = ({ completedDates }) => {
  const today = new Date();
  const days = [];
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = completedDates.filter(d => d === dateStr).length;
    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en', { weekday: 'short' }).charAt(0),
      dayNum: date.getDate(),
      count,
      isToday: i === 0
    });
  }
  
  return (
    <div className="glass-card p-4">
      <h3 className="text-white font-semibold mb-4">📆 Last 2 Weeks</h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => (
          <div 
            key={idx}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
              day.isToday 
                ? 'ring-2 ring-green-400' 
                : ''
            } ${
              day.count > 0 
                ? 'bg-green-500/30 text-white' 
                : 'bg-white/5 text-white/30'
            }`}
          >
            <span className="text-[10px] opacity-60">{day.dayName}</span>
            <span className="font-bold">{day.dayNum}</span>
            {day.count > 0 && <span className="text-green-400 text-[10px]">{day.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function StatsPage() {
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [timeEstimates, setTimeEstimates] = useState({});
  const [completedTasks, setCompletedTasks] = useState([]);
  const { stats: achievementStats } = useAchievements();
  
  // Load data
  useEffect(() => {
    setTimeEstimates(Storage.get('timeEstimates', {}));
    setCompletedTasks(Storage.get('tasks', []).filter(t => t.completed));
  }, []);
  
  // Calculate stats
  const stats = useMemo(() => {
    const estimates = Object.values(timeEstimates);
    const totalTimeSaved = estimates.reduce((sum, e) => sum + (e.timeSaved || 0), 0);
    const totalEstimated = estimates.reduce((sum, e) => sum + (e.estimated || 0), 0);
    const totalActual = estimates.reduce((sum, e) => sum + (e.actual || 0), 0);
    const beatCount = estimates.filter(e => e.actual < e.estimated).length;
    const accurateCount = estimates.filter(e => Math.abs(e.actual - e.estimated) <= 5).length;
    
    return {
      totalTimeSaved,
      totalEstimated,
      totalActual,
      beatCount,
      accurateCount,
      avgAccuracy: totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0
    };
  }, [timeEstimates]);
  
  // Prepare weekly time saved data
  const weeklyTimeSaved = useMemo(() => {
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEstimates = Object.values(timeEstimates).filter(e => e.date === dateStr);
      const saved = dayEstimates.reduce((sum, e) => sum + (e.timeSaved || 0), 0);
      
      days.push({
        label: date.toLocaleDateString('en', { weekday: 'short' }).charAt(0),
        saved
      });
    }
    
    return days;
  }, [timeEstimates]);
  
  // Prepare accuracy data
  const accuracyData = useMemo(() => {
    return Object.entries(timeEstimates)
      .map(([id, data]) => ({
        id,
        estimated: data.estimated || 25,
        actual: data.actual || 0,
        title: completedTasks.find(t => t.id?.toString() === id)?.title || 'Task'
      }))
      .filter(d => d.actual > 0);
  }, [timeEstimates, completedTasks]);
  
  // Prepare hourly data
  const hourlyData = useMemo(() => {
    return Object.values(timeEstimates).map(e => ({
      hour: e.hour || 12
    }));
  }, [timeEstimates]);
  
  // Prepare completed dates
  const completedDates = useMemo(() => {
    return Object.values(timeEstimates).map(e => e.date).filter(Boolean);
  }, [timeEstimates]);
  
  // Get localStorage stats
  const xp = Storage.get('xp', 0);
  const level = Storage.get('level', 1);
  const streak = Storage.get('streak', 0);
  
  return (
    <PageBackground page="stats">
      <div className="min-h-screen pb-24">
        {/* Header */}
        <div className="glass-dark sticky top-0 z-30 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="glass-icon-sm w-10 h-10 flex items-center justify-center">
              ←
            </Link>
            <h1 className="text-white font-bold text-lg">Analytics</h1>
            <button 
              onClick={() => setShowBackgroundSelector(true)}
              className="glass-icon-sm w-10 h-10 flex items-center justify-center"
            >
              🎨
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Level Card */}
          <div className="glass-card p-6 text-center bg-gradient-to-br from-green-500/20 to-emerald-500/10">
            <div className="text-5xl mb-2">🐸</div>
            <h2 className="text-white text-3xl font-bold">Level {level}</h2>
            <div className="mt-3 h-3 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${xp % 100}%` }}
              />
            </div>
            <p className="text-white/60 text-sm mt-2">{xp % 100}/100 XP to next level</p>
            <p className="text-green-400 text-sm mt-1">{xp} total XP</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <GlassStatCard 
              icon="✅" 
              label="Tasks Done" 
              value={achievementStats.tasksCompleted || completedTasks.length}
              accent="green"
            />
            <GlassStatCard 
              icon="🐸" 
              label="Frogs Eaten" 
              value={achievementStats.frogsEaten || 0}
              accent="purple"
            />
            <GlassStatCard 
              icon="🔥" 
              label="Current Streak" 
              value={streak}
              subValue={`Best: ${achievementStats.longestStreak || streak}`}
              accent="orange"
            />
            <GlassStatCard 
              icon="⏱️" 
              label="Time Saved" 
              value={`${stats.totalTimeSaved}m`}
              subValue={stats.totalTimeSaved >= 60 ? `${Math.floor(stats.totalTimeSaved / 60)}h ${stats.totalTimeSaved % 60}m` : null}
              accent="blue"
            />
          </div>

          {/* Time Analytics Section */}
          <div className="glass-card p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>⏰</span> Time Tracking Insights
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white/5 rounded-xl">
                <p className="text-xl font-bold text-blue-400">{stats.beatCount}</p>
                <p className="text-white/40 text-xs">Beat Estimate</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-xl">
                <p className="text-xl font-bold text-green-400">{stats.accurateCount}</p>
                <p className="text-white/40 text-xs">Within 5min</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-xl">
                <p className="text-xl font-bold text-purple-400">{stats.avgAccuracy}%</p>
                <p className="text-white/40 text-xs">Avg Accuracy</p>
              </div>
            </div>
          </div>

          {/* Time Saved Chart */}
          <TimeSavedChart data={weeklyTimeSaved} />
          
          {/* Accuracy Chart */}
          <AccuracyChart data={accuracyData} />
          
          {/* Productivity Timeline */}
          <DailyTimeline data={hourlyData} />
          
          {/* Weekly Calendar */}
          <WeeklyCalendar completedDates={completedDates} />
          
          {/* Category Breakdown */}
          <CategoryBreakdown tasks={completedTasks} />

          {/* Achievements Link */}
          <Link href="/achievements" className="block">
            <div className="glass-card p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 hover:from-yellow-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <p className="text-white font-semibold">Achievement Badges</p>
                    <p className="text-white/60 text-sm">View all {Object.keys(achievementStats).length > 0 ? 'unlocked' : ''} achievements</p>
                  </div>
                </div>
                <span className="text-white/40 text-xl">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom z-40">
          <div className="flex justify-around py-3">
            <Link href="/" className="flex flex-col items-center text-white/40">
              <span className="text-xl mb-1">🏠</span>
              <span className="text-xs">Home</span>
            </Link>
            <div className="flex flex-col items-center text-green-400">
              <span className="text-xl mb-1">📊</span>
              <span className="text-xs">Stats</span>
            </div>
            <Link href="/achievements" className="flex flex-col items-center text-white/40">
              <span className="text-xl mb-1">🏆</span>
              <span className="text-xs">Badges</span>
            </Link>
          </div>
        </div>

        <BackgroundSelector
          isOpen={showBackgroundSelector}
          onClose={() => setShowBackgroundSelector(false)}
          currentPage="stats"
        />
      </div>
    </PageBackground>
  );
}
