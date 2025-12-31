'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase, getTasks, createTask, updateTask, completeTask as dbCompleteTask, getUserProgress, upsertUserProgress } from '@/lib/supabase';
import NotificationManager, { NOTIFICATION_TYPES } from '@/components/NotificationManager';
import { PageBackground, useBackground } from '@/components/BackgroundContext';
import BackgroundSelector from '@/components/BackgroundSelector';

// Categories with colors
const CATEGORIES = {
  'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔' },
  'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋' },
  'home': { name: 'Home', color: '#10b981', emoji: '🏠' },
  'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧' },
  'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵' },
  'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨' },
};

// Energy levels
const ENERGY_LEVELS = [
  { value: 1, label: 'Zombie Mode', emoji: '🧟', color: '#64748b', description: 'Just existing today' },
  { value: 2, label: 'Low Battery', emoji: '🔋', color: '#f59e0b', description: 'Can do easy stuff' },
  { value: 3, label: 'Cruising', emoji: '🚗', color: '#10b981', description: 'Normal productive day' },
  { value: 4, label: 'Locked In', emoji: '🔥', color: '#ef4444', description: "Let's crush it!" },
];

// Timer presets
const TIMER_PRESETS = [
  { minutes: 5, label: '5m', description: 'Quick burst' },
  { minutes: 15, label: '15m', description: 'Pomodoro lite' },
  { minutes: 25, label: '25m', description: 'Pomodoro' },
  { minutes: 45, label: '45m', description: 'Deep work' },
];

// Local storage helper (fallback)
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

// Glass Icon Button Component
function GlassIconButton({ icon, onClick, active, size = 'md', badge, className = '' }) {
  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-12 h-12 text-xl',
    lg: 'w-14 h-14 text-2xl'
  };
  
  return (
    <button
      onClick={onClick}
      className={`glass-icon ${sizes[size]} flex items-center justify-center relative transition-all hover:scale-105 active:scale-95 ${
        active ? 'ring-2 ring-white/30' : ''
      } ${className}`}
    >
      <span className={active ? '' : 'opacity-80'}>{icon}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// Glass Card Component
function GlassCard({ children, className = '', onClick, hover = false }) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-4 ${hover ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Frog() {
  const [screen, setScreen] = useState('checkin');
  const [energy, setEnergy] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [focusTask, setFocusTask] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [frogCompleted, setFrogCompleted] = useState(false);
  const [dailyFrog, setDailyFrog] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', category: 'personal', difficulty: 2 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing');
  const [showNotifications, setShowNotifications] = useState(false);
  const [scheduleNotification, setScheduleNotification] = useState(null);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [userId] = useState('justin');
  
  const timerRef = useRef(null);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setSyncStatus('syncing');
        
        const dbTasks = await getTasks();
        const incompleteTasks = dbTasks.filter(t => !t.completed);
        const completed = dbTasks.filter(t => t.completed);
        
        const formattedTasks = incompleteTasks.map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          difficulty: t.difficulty,
          frog: t.is_frog,
          notes: t.notes
        }));
        
        setTasks(formattedTasks);
        setCompletedTasks(completed);
        
        const progress = await getUserProgress(userId);
        if (progress) {
          setXp(progress.total_xp || 0);
          setLevel(progress.level || 1);
          setStreak(progress.current_streak || 0);
        }
        
        // Check if we have a saved frog
        const savedFrog = formattedTasks.find(t => t.frog);
        if (savedFrog) {
          setDailyFrog(savedFrog);
        }
        
        // Check last activity date
        const lastDate = Storage.get('lastDate', null);
        const today = new Date().toDateString();
        if (lastDate === today) {
          const savedEnergy = Storage.get('todayEnergy', null);
          if (savedEnergy) {
            setEnergy(savedEnergy);
            setScreen('tasks');
          }
        }
        
        setSyncStatus('synced');
      } catch (error) {
        console.error('Error loading data:', error);
        setSyncStatus('offline');
        
        // Load from localStorage as fallback
        const localTasks = Storage.get('tasks', []);
        setTasks(localTasks.filter(t => !t.completed));
        setCompletedTasks(localTasks.filter(t => t.completed));
        setXp(Storage.get('xp', 0));
        setLevel(Storage.get('level', 1));
        setStreak(Storage.get('streak', 0));
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, [userId]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      timerRef.current = setTimeout(() => {
        if (timerSeconds === 0) {
          setTimerMinutes(m => m - 1);
          setTimerSeconds(59);
        } else {
          setTimerSeconds(s => s - 1);
        }
      }, 1000);
    } else if (timerRunning && timerMinutes === 0 && timerSeconds === 0) {
      setTimerRunning(false);
      
      // Play sound and vibrate
      if (typeof window !== 'undefined') {
        try {
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.log('Audio not available:', e);
        }
      }
      
      // Send push notification
      if (scheduleNotification && focusTask) {
        const taskXP = focusTask.difficulty * 10 + (focusTask.frog ? 20 : 0);
        scheduleNotification(NOTIFICATION_TYPES.FOCUS_END, 0, { 
          xp: taskXP,
          taskTitle: focusTask.title 
        });
      }
      
      if (focusTask) {
        handleCompleteTask(focusTask);
      }
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerMinutes, timerSeconds, focusTask]);

  // Update document title with timer status
  useEffect(() => {
    if (timerRunning) {
      const timeStr = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;
      document.title = `${timeStr} | Frog 🐸`;
    } else if (screen === 'focus') {
      const timeStr = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;
      document.title = `⏸️ ${timeStr} | Frog 🐸`;
    } else {
      document.title = 'Frog 🐸';
    }
  }, [timerRunning, timerMinutes, timerSeconds, screen]);

  const handleEnergySelect = async (value) => {
    setEnergy(value);
    Storage.set('todayEnergy', value);
    Storage.set('lastDate', new Date().toDateString());
    
    try {
      await supabase.from('focusflow_energy_log').upsert({
        user_id: userId,
        energy_level: value,
        log_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id,log_date' });
    } catch (error) {
      console.error('Error logging energy:', error);
    }
    
    setScreen('frog');
  };

  const handleFrogSelect = async (task) => {
    if (dailyFrog && dailyFrog.id !== task.id) {
      try {
        await updateTask(dailyFrog.id, { is_frog: false });
      } catch (e) {
        console.error('Error updating old frog:', e);
      }
      setTasks(prev => prev.map(t => t.id === dailyFrog.id ? { ...t, frog: false } : t));
    }
    
    try {
      await updateTask(task.id, { is_frog: true });
    } catch (e) {
      console.error('Error setting frog:', e);
    }
    
    const updatedTask = { ...task, frog: true };
    setDailyFrog(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    setScreen('tasks');
  };

  const startFocus = (task, minutes) => {
    setFocusTask(task);
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setTimerRunning(true);
    setScreen('focus');
  };

  const handleCompleteTask = useCallback(async (task) => {
    const baseXP = task.difficulty * 10;
    const frogBonus = task.frog ? 20 : 0;
    const earnedXP = baseXP + frogBonus;
    
    try {
      await dbCompleteTask(task.id, earnedXP);
      
      const newTotalXP = xp + earnedXP;
      const newLevel = Math.floor(newTotalXP / 100) + 1;
      const newTasksCompleted = completedTasks.length + 1;
      
      await upsertUserProgress({
        user_id: userId,
        total_xp: newTotalXP,
        level: newLevel,
        tasks_completed: newTasksCompleted,
        frogs_eaten: task.frog ? (Storage.get('frogsEaten', 0) + 1) : Storage.get('frogsEaten', 0),
        last_activity_date: new Date().toISOString().split('T')[0]
      });
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error completing task:', error);
      setSyncStatus('offline');
    }
    
    setXp(prev => prev + earnedXP);
    const newXP = xp + earnedXP;
    setLevel(Math.floor(newXP / 100) + 1);
    
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setCompletedTasks(prev => [...prev, { ...task, completed: true }]);
    
    if (task.frog) {
      setFrogCompleted(true);
      setDailyFrog(null);
    }
    
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
    
    setFocusTask(null);
    setScreen('tasks');
    
    Storage.set('xp', newXP);
    Storage.set('level', Math.floor(newXP / 100) + 1);
  }, [xp, completedTasks.length, userId]);

  const cancelFocus = () => {
    setTimerRunning(false);
    setFocusTask(null);
    setScreen('tasks');
  };

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const resetDay = () => {
    setEnergy(null);
    setScreen('checkin');
    Storage.set('todayEnergy', null);
    Storage.set('lastDate', null);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      const createdTask = await createTask({
        user_id: userId,
        title: newTask.title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        energy_required: newTask.difficulty,
        is_frog: false,
        completed: false
      });
      
      setTasks(prev => [...prev, {
        id: createdTask.id,
        title: createdTask.title,
        category: createdTask.category,
        difficulty: createdTask.difficulty,
        frog: false
      }]);
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error creating task:', error);
      setSyncStatus('offline');
      
      const localTask = {
        id: Date.now(),
        title: newTask.title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        frog: false
      };
      setTasks(prev => [...prev, localTask]);
    }
    
    setNewTask({ title: '', category: 'personal', difficulty: 2 });
    setShowAddTask(false);
  };

  const filteredTasks = selectedCategory === 'all' 
    ? tasks 
    : tasks.filter(t => t.category === selectedCategory);

  // Sort tasks - frog first, then by difficulty
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.frog && !b.frog) return -1;
    if (!a.frog && b.frog) return 1;
    return b.difficulty - a.difficulty;
  });

  if (!isLoaded) {
    return (
      <PageBackground page="home">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-6 animate-float">🐸</div>
            <div className="glass-card px-8 py-4">
              <p className="text-white/80 font-medium">Loading your frogs...</p>
            </div>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== ENERGY CHECK-IN SCREEN =====
  if (screen === 'checkin') {
    return (
      <PageBackground page="home">
        <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
          {/* Header */}
          <div className="p-6 text-center">
            <div className="text-6xl mb-4 animate-float">🐸</div>
            <h1 className="text-3xl font-bold text-white mb-2">Good Morning!</h1>
            <p className="text-white/60">How's your energy today?</p>
          </div>
          
          {/* Energy Options */}
          <div className="flex-1 px-6 pb-6">
            <div className="space-y-4">
              {ENERGY_LEVELS.map((level, idx) => (
                <button
                  key={level.value}
                  onClick={() => handleEnergySelect(level.value)}
                  className="w-full glass-card p-5 text-left hover:scale-[1.02] active:scale-[0.98] transition-all animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="glass-icon w-14 h-14 flex items-center justify-center"
                      style={{ boxShadow: `0 0 20px ${level.color}40` }}
                    >
                      <span className="text-3xl">{level.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{level.label}</p>
                      <p className="text-white/50 text-sm">{level.description}</p>
                    </div>
                    <div className="text-white/30">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Bottom Stats */}
          <div className="p-6">
            <div className="glass-card p-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{streak}</p>
                  <p className="text-white/40 text-xs">Day Streak</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-green-400">{level}</p>
                  <p className="text-white/40 text-xs">Level</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{xp}</p>
                  <p className="text-white/40 text-xs">Total XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== FROG SELECTION SCREEN =====
  if (screen === 'frog') {
    const hardTasks = tasks.filter(t => t.difficulty >= 3);
    
    return (
      <PageBackground page="home">
        <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
          {/* Header */}
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">🐸</div>
            <h1 className="text-2xl font-bold text-white mb-2">Pick Your Frog</h1>
            <p className="text-white/60 text-sm">What's the hardest task you need to tackle today?</p>
          </div>
          
          {/* Task Options */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="space-y-3">
              {hardTasks.length > 0 ? (
                hardTasks.map((task, idx) => (
                  <button
                    key={task.id}
                    onClick={() => handleFrogSelect(task)}
                    className="w-full glass-card p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-all animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="glass-icon-sm w-12 h-12 flex items-center justify-center">
                        <span className="text-2xl">{CATEGORIES[task.category]?.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-yellow-400 text-sm">
                            {'⭐'.repeat(task.difficulty)}
                          </span>
                          <span className="text-white/40 text-xs">
                            {CATEGORIES[task.category]?.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl">🐸</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="text-white/60 mb-4">No hard tasks yet!</p>
                  <button
                    onClick={() => { setScreen('tasks'); setShowAddTask(true); }}
                    className="glass-button px-6 py-3 rounded-2xl text-white font-medium"
                  >
                    + Add a Task
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Skip Option */}
          <div className="p-6">
            <button
              onClick={() => setScreen('tasks')}
              className="w-full glass-card p-4 text-center text-white/60 hover:text-white transition-colors"
            >
              Skip for now →
            </button>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== FOCUS MODE SCREEN =====
  if (screen === 'focus' && focusTask) {
    const progress = timerMinutes === 0 && timerSeconds === 0 ? 100 : 
      100 - ((timerMinutes * 60 + timerSeconds) / (25 * 60) * 100);
    
    return (
      <PageBackground page="home">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
          {/* Timer Display */}
          <div className="glass-card p-8 w-full max-w-sm text-center mb-8">
            {/* Task Info */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                <span className="text-xl">{CATEGORIES[focusTask.category]?.emoji}</span>
              </div>
              <p className="text-white font-medium">{focusTask.title}</p>
              {focusTask.frog && <span className="text-xl">🐸</span>}
            </div>
            
            {/* Big Timer */}
            <div className="text-7xl font-light text-white mb-8 font-mono tracking-wider">
              {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">{timerRunning ? '🔥' : '⏸️'}</span>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleTimer}
                className={`glass-button w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                  timerRunning ? 'animate-pulse-glow' : ''
                }`}
              >
                {timerRunning ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => handleCompleteTask(focusTask)}
                className="glass-button w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              >
                ✅
              </button>
            </div>
          </div>
          
          {/* Cancel Button */}
          <button
            onClick={cancelFocus}
            className="glass-card px-8 py-3 text-white/60 hover:text-white transition-colors"
          >
            Cancel Session
          </button>
        </div>
      </PageBackground>
    );
  }

  // ===== MAIN TASKS SCREEN =====
  return (
    <PageBackground page="home">
      <div className="min-h-screen pb-32 safe-area-top">
        {/* Glass Header */}
        <div className="sticky top-0 z-40 glass-dark safe-area-top">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: App Title & Status */}
              <div className="flex items-center gap-3">
                <div className="glass-icon w-11 h-11 flex items-center justify-center">
                  <span className="text-2xl">🐸</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white">Frog</h1>
                    <span className={`w-2 h-2 rounded-full ${
                      syncStatus === 'synced' ? 'bg-green-400' :
                      syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                      'bg-red-400'
                    }`} />
                  </div>
                  <p className="text-white/50 text-xs">
                    {ENERGY_LEVELS.find(e => e.value === energy)?.emoji} {ENERGY_LEVELS.find(e => e.value === energy)?.label}
                  </p>
                </div>
              </div>
              
              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <GlassIconButton icon="🎨" onClick={() => setShowBackgroundSelector(true)} size="sm" />
                <GlassIconButton icon="🔔" onClick={() => setShowNotifications(true)} size="sm" />
                <Link href="/stats">
                  <GlassIconButton icon="📊" size="sm" />
                </Link>
                <div className="glass-card px-3 py-2 ml-1">
                  <p className="text-white font-bold text-sm">Lv.{level}</p>
                  <p className="text-green-400 text-xs">{xp} XP</p>
                </div>
              </div>
            </div>
            
            {/* Category Filter Pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`glass-button px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'all' ? 'bg-white/20 text-white' : 'text-white/60'
                }`}
              >
                All Tasks
              </button>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`glass-button px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedCategory === key ? 'bg-white/20 text-white' : 'text-white/60'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Frog Banner */}
        {dailyFrog && !frogCompleted && (
          <div className="px-4 mt-4">
            <div 
              className="glass-card p-4 border-2 border-green-500/30 animate-pulse-glow cursor-pointer hover:scale-[1.01] transition-transform"
              onClick={() => startFocus(dailyFrog, 25)}
            >
              <div className="flex items-center gap-4">
                <div className="glass-icon w-14 h-14 flex items-center justify-center animate-float">
                  <span className="text-3xl">🐸</span>
                </div>
                <div className="flex-1">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Today's Frog</p>
                  <p className="text-white font-medium text-lg">{dailyFrog.title}</p>
                  <p className="text-white/50 text-xs mt-1">Tap to start • 2x XP bonus!</p>
                </div>
                <div className="text-white/30 text-2xl">→</div>
              </div>
            </div>
          </div>
        )}

        {/* Frog Completed Banner */}
        {frogCompleted && (
          <div className="px-4 mt-4">
            <div className="glass-card p-4 border-2 border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎉</div>
                <div>
                  <p className="text-green-400 font-semibold">Frog Eaten!</p>
                  <p className="text-white/60 text-sm">You tackled your hardest task today!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="px-4 mt-4 space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-white font-medium mb-2">All caught up!</p>
              <p className="text-white/50 text-sm">Add a new task to get started</p>
            </div>
          ) : (
            sortedTasks.map((task, idx) => (
              <div 
                key={task.id}
                className="glass-card p-4 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="glass-icon-sm w-11 h-11 flex items-center justify-center">
                    <span className="text-xl">{CATEGORIES[task.category]?.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: CATEGORIES[task.category]?.color + '20',
                          color: CATEGORIES[task.category]?.color 
                        }}
                      >
                        {CATEGORIES[task.category]?.name}
                      </span>
                      <span className="text-yellow-400 text-xs">
                        {'⭐'.repeat(task.difficulty)}
                      </span>
                      {task.frog && <span className="text-sm">🐸</span>}
                    </div>
                  </div>
                </div>
                
                {/* Timer Preset Buttons */}
                <div className="flex gap-2">
                  {TIMER_PRESETS.map((preset) => (
                    <button
                      key={preset.minutes}
                      onClick={() => startFocus(task, preset.minutes)}
                      className="flex-1 glass-button py-2.5 rounded-xl text-white/80 text-sm font-medium hover:text-white transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
          <button
            onClick={() => setShowAddTask(true)}
            className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform"
          >
            ➕
          </button>
          <button
            onClick={resetDay}
            className="glass-icon-sm w-12 h-12 flex items-center justify-center text-xl opacity-60 hover:opacity-100 transition-opacity"
          >
            🔄
          </button>
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom z-40">
          <div className="flex justify-around py-3">
            <div className="flex flex-col items-center text-green-400">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1">
                <span className="text-xl">🐸</span>
              </div>
              <span className="text-xs font-medium">Tasks</span>
            </div>
            <Link href="/stats" className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-xs">Stats</span>
            </Link>
            <button 
              onClick={() => setShowBackgroundSelector(true)}
              className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors"
            >
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">New Task</h2>
                  <button onClick={() => setShowAddTask(false)} className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60">
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Task Name</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="What needs to be done?"
                      className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-white/30"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => setNewTask(prev => ({ ...prev, category: key }))}
                          className={`glass-button p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                            newTask.category === key ? 'ring-2 ring-white/30 bg-white/10' : ''
                          }`}
                        >
                          <span className="text-xl">{cat.emoji}</span>
                          <span className="text-xs text-white/70">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Difficulty</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <button
                          key={d}
                          onClick={() => setNewTask(prev => ({ ...prev, difficulty: d }))}
                          className={`flex-1 glass-button py-3 rounded-xl text-center transition-all ${
                            newTask.difficulty === d ? 'ring-2 ring-yellow-400/50 bg-yellow-400/10' : ''
                          }`}
                        >
                          <span className="text-yellow-400">{'⭐'.repeat(d)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddTask}
                    disabled={!newTask.title.trim()}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-green-500/20 border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-center animate-bounce-in">
              <div className="text-8xl mb-4">🎉</div>
              <div className="glass-card px-8 py-4">
                <p className="text-white font-bold text-xl">Task Complete!</p>
                <p className="text-green-400">+{focusTask?.difficulty * 10 + (focusTask?.frog ? 20 : 0)} XP</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings Modal */}
        <NotificationManager
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          frogTask={dailyFrog}
          onScheduleNotification={(fn) => setScheduleNotification(() => fn)}
        />

        {/* Background Selector Modal */}
        <BackgroundSelector
          isOpen={showBackgroundSelector}
          onClose={() => setShowBackgroundSelector(false)}
          currentPage="home"
        />
      </div>
    </PageBackground>
  );
}
