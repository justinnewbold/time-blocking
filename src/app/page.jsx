'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getTasks, createTask, updateTask, completeTask as dbCompleteTask, getUserProgress, upsertUserProgress } from '@/lib/supabase';

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
  { minutes: 5, label: '5 min', description: 'Quick burst' },
  { minutes: 15, label: '15 min', description: 'Pomodoro lite' },
  { minutes: 25, label: '25 min', description: 'Pomodoro' },
  { minutes: 45, label: '45 min', description: 'Deep work' },
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
  const [userId] = useState('justin');
  
  const timerRef = useRef(null);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setSyncStatus('syncing');
        
        // Load tasks from Supabase
        const dbTasks = await getTasks();
        const incompleteTasks = dbTasks.filter(t => !t.completed);
        const completed = dbTasks.filter(t => t.completed);
        
        // Transform to component format
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
        
        // Load user progress
        const progress = await getUserProgress(userId);
        if (progress) {
          setXp(progress.total_xp || 0);
          setLevel(progress.level || 1);
          setStreak(progress.current_streak || 0);
        }
        
        // Check local energy for today
        const storedEnergy = Storage.get('todayEnergy', null);
        const storedDate = Storage.get('lastDate', null);
        const today = new Date().toDateString();
        
        if (storedDate !== today) {
          Storage.set('todayEnergy', null);
          Storage.set('lastDate', today);
          setEnergy(null);
          setScreen('checkin');
        } else if (storedEnergy) {
          setEnergy(storedEnergy);
          setScreen('main');
        }
        
        setSyncStatus('synced');
      } catch (error) {
        console.error('Error loading data:', error);
        setSyncStatus('offline');
        
        // Fallback to localStorage
        const storedTasks = Storage.get('tasks', []);
        const storedCompleted = Storage.get('completedTasks', []);
        setTasks(storedTasks);
        setCompletedTasks(storedCompleted);
        setXp(Storage.get('xp', 0));
        setStreak(Storage.get('streak', 0));
      }
      
      setIsLoaded(true);
    };
    
    loadData();
  }, [userId]);

  // Sync progress to Supabase
  const syncProgress = useCallback(async (newXp, newStreak, tasksCompleted) => {
    try {
      await upsertUserProgress({
        user_id: userId,
        total_xp: newXp,
        level: Math.floor(newXp / 100) + 1,
        current_streak: newStreak,
        tasks_completed: tasksCompleted,
        last_activity_date: new Date().toISOString().split('T')[0]
      });
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing progress:', error);
      setSyncStatus('offline');
      // Save to localStorage as backup
      Storage.set('xp', newXp);
      Storage.set('streak', newStreak);
    }
  }, [userId]);

  // Calculate level from XP
  useEffect(() => {
    const newLevel = Math.floor(xp / 100) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [xp, level]);

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
      if (focusTask) {
        handleCompleteTask(focusTask);
      }
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerMinutes, timerSeconds, focusTask]);

  const handleEnergySelect = async (value) => {
    setEnergy(value);
    Storage.set('todayEnergy', value);
    Storage.set('lastDate', new Date().toDateString());
    
    // Log energy to Supabase
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
    setDailyFrog(task.id);
    
    // Update all tasks - reset frog status and set new frog
    try {
      // First, unset any existing frogs
      await supabase
        .from('focusflow_tasks')
        .update({ is_frog: false })
        .eq('user_id', userId);
      
      // Set the new frog
      await supabase
        .from('focusflow_tasks')
        .update({ is_frog: true })
        .eq('id', task.id);
      
      const updatedTasks = tasks.map(t => ({
        ...t,
        frog: t.id === task.id
      }));
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error setting frog:', error);
    }
    
    setScreen('main');
  };

  const skipFrogSelection = () => {
    setScreen('main');
  };

  const startFocus = (task, minutes) => {
    setFocusTask(task);
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setTimerRunning(true);
    setScreen('focus');
  };

  const handleCompleteTask = useCallback(async (task) => {
    // Calculate XP
    let earnedXp = task.difficulty * 10;
    if (task.frog) {
      earnedXp *= 2;
      setFrogCompleted(true);
    }
    if (energy >= 3) earnedXp += 10;
    
    const newXp = xp + earnedXp;
    const newCompletedCount = completedTasks.length + 1;
    
    setXp(newXp);
    
    // Update task in Supabase
    try {
      await dbCompleteTask(task.id, earnedXp);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error completing task:', error);
      setSyncStatus('offline');
    }
    
    // Update local state
    setCompletedTasks(prev => [...prev, { 
      ...task, 
      completed: true,
      completed_at: new Date().toISOString(), 
      xp_earned: earnedXp 
    }]);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    
    // Sync progress
    syncProgress(newXp, streak, newCompletedCount);
    
    setShowCelebration(true);
    
    setTimeout(() => {
      setShowCelebration(false);
      setFocusTask(null);
      setScreen('main');
    }, 2000);
  }, [xp, energy, streak, completedTasks.length, syncProgress]);

  const pauseTimer = () => {
    setTimerRunning(false);
  };

  const resumeTimer = () => {
    setTimerRunning(true);
  };

  const exitFocus = () => {
    setTimerRunning(false);
    setFocusTask(null);
    setScreen('main');
  };

  const handleCantToday = () => {
    setEnergy(1);
    Storage.set('todayEnergy', 1);
    setScreen('main');
  };

  const resetDay = () => {
    setEnergy(null);
    Storage.set('todayEnergy', null);
    setScreen('checkin');
    setFrogCompleted(false);
    setDailyFrog(null);
  };

  const addNewTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      const dbTask = await createTask({
        user_id: userId,
        title: newTask.title.trim(),
        category: newTask.category,
        difficulty: newTask.difficulty,
        energy_required: newTask.difficulty,
        is_frog: false
      });
      
      const task = {
        id: dbTask.id,
        title: dbTask.title,
        category: dbTask.category,
        difficulty: dbTask.difficulty,
        frog: false
      };
      
      setTasks(prev => [task, ...prev]);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error creating task:', error);
      setSyncStatus('offline');
      
      // Fallback: add locally
      const task = {
        id: Date.now().toString(),
        title: newTask.title.trim(),
        category: newTask.category,
        difficulty: newTask.difficulty,
        frog: false
      };
      setTasks(prev => [task, ...prev]);
    }
    
    setNewTask({ title: '', category: 'personal', difficulty: 2 });
    setShowAddTask(false);
  };

  // Filter tasks by energy and category
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
    const energyMatch = !energy || task.difficulty <= energy + 1;
    return categoryMatch && energyMatch;
  });

  const frogTasks = tasks.filter(t => t.difficulty >= 4);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <div className="text-white text-xl">Loading Frog 🐸...</div>
          <div className="text-purple-300 text-sm mt-2">Syncing with cloud...</div>
        </div>
      </div>
    );
  }

  // Check-in Screen
  if (screen === 'checkin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col">
        {/* Sync indicator */}
        <div className="absolute top-4 right-4">
          <span className={`text-xs px-2 py-1 rounded-full ${
            syncStatus === 'synced' ? 'bg-green-500/20 text-green-400' :
            syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {syncStatus === 'synced' ? '☁️ Synced' : syncStatus === 'syncing' ? '🔄 Syncing' : '📴 Offline'}
          </span>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Justin
          </h1>
          <p className="text-purple-200 text-center mb-8">How&apos;s your energy today?</p>
          
          <div className="space-y-4">
            {ENERGY_LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => handleEnergySelect(lvl.value)}
                className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-4 hover:bg-white/20 transition-all active:scale-98"
              >
                <span className="text-4xl">{lvl.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold">{lvl.label}</p>
                  <p className="text-purple-200 text-sm">{lvl.description}</p>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: lvl.color }}
                />
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleCantToday}
          className="mt-6 py-3 text-purple-300 text-sm hover:text-white transition-colors"
        >
          I can&apos;t today... 💔
        </button>
      </div>
    );
  }

  // Frog Selection Screen
  if (screen === 'frog') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <span className="text-6xl">🐸</span>
            <h1 className="text-2xl font-bold text-white mt-4">Eat the Frog!</h1>
            <p className="text-purple-200 mt-2">Which hard task will you tackle first?</p>
          </div>
          
          <div className="space-y-3">
            {frogTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-purple-200">No difficult tasks right now!</p>
                <button
                  onClick={skipFrogSelection}
                  className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold"
                >
                  Continue to Tasks
                </button>
              </div>
            ) : (
              frogTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleFrogSelect(task)}
                  className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-4 hover:bg-white/20 transition-all"
                >
                  <span className="text-2xl">{CATEGORIES[task.category]?.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-yellow-400 text-sm">{'⭐'.repeat(task.difficulty)}</p>
                  </div>
                  <span className="text-2xl">🐸</span>
                </button>
              ))
            )}
          </div>
        </div>
        
        {frogTasks.length > 0 && (
          <button
            onClick={skipFrogSelection}
            className="mt-6 py-3 text-purple-300 text-sm hover:text-white transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    );
  }

  // Focus Mode Screen
  if (screen === 'focus' && focusTask) {
    const totalSeconds = timerMinutes * 60 + timerSeconds;
    const maxSeconds = 45 * 60; // Max 45 min
    const progress = (totalSeconds / maxSeconds) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col">
        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center animate-bounce">
              <span className="text-8xl">{focusTask?.frog ? '🐸' : '🎉'}</span>
              <h2 className="text-3xl font-bold text-white mt-4">
                {focusTask?.frog ? 'Frog Eaten!' : 'Task Complete!'}
              </h2>
              <p className="text-yellow-400 text-xl mt-2">
                +{focusTask?.difficulty * 10 * (focusTask?.frog ? 2 : 1)} XP
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <button onClick={exitFocus} className="text-purple-300 text-sm">
            ← Exit
          </button>
          <div className="text-right">
            <span className="text-purple-300 text-sm">Level {level}</span>
            <div className="text-yellow-400 text-xs">{xp} XP</div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <span className="text-6xl">{focusTask.frog ? '🐸' : CATEGORIES[focusTask.category]?.emoji}</span>
            <h2 className="text-xl font-bold text-white mt-4">{focusTask.title}</h2>
          </div>
          
          {/* Timer Display */}
          <div className="relative w-64 h-64 mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="#4c1d95"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="#8b5cf6"
                strokeWidth="8"
                fill="none"
                strokeDasharray={754}
                strokeDashoffset={754 * (1 - progress / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white font-mono">
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="flex gap-4">
            {timerRunning ? (
              <button
                onClick={pauseTimer}
                className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all"
              >
                Resume
              </button>
            )}
            <button
              onClick={() => handleCompleteTask(focusTask)}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
            >
              Done! ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-32">
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add New Task</h2>
            
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title..."
              className="w-full p-3 bg-slate-700 text-white rounded-xl mb-4 outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            
            <div className="mb-4">
              <label className="text-purple-200 text-sm mb-2 block">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setNewTask(prev => ({ ...prev, category: key }))}
                    className={`p-2 rounded-xl text-sm flex items-center gap-1 justify-center transition-all ${
                      newTask.category === key 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {cat.emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="text-purple-200 text-sm mb-2 block">Difficulty</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => setNewTask(prev => ({ ...prev, difficulty: d }))}
                    className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                      newTask.difficulty === d 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {'⭐'.repeat(d)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddTask(false)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={addNewTask}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-40 p-4 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">🐸 Frog</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-500/20 text-green-400' :
                syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {syncStatus === 'synced' ? '☁️' : syncStatus === 'syncing' ? '🔄' : '📴'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-purple-300">Energy: {ENERGY_LEVELS.find(e => e.value === energy)?.emoji}</span>
              {frogCompleted && <span className="text-sm">🐸✓</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-bold">Level {level}</p>
            <p className="text-yellow-400 text-sm">{xp} XP</p>
          </div>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white/10 text-purple-200 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === key 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Frog Banner */}
      {!frogCompleted && dailyFrog && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-2xl border border-green-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐸</span>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Today&apos;s Frog</p>
              <p className="text-green-200">{tasks.find(t => t.id === dailyFrog)?.title}</p>
            </div>
            <button
              onClick={() => {
                const frogTask = tasks.find(t => t.id === dailyFrog);
                if (frogTask) startFocus(frogTask, 25);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold"
            >
              Start
            </button>
          </div>
        </div>
      )}
      
      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">🎉</span>
            <p className="text-white text-xl font-semibold mt-4">All caught up!</p>
            <p className="text-purple-200 mt-2">Add more tasks or enjoy your break.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl bg-white/10 backdrop-blur-sm border transition-all ${
                task.frog ? 'border-green-500/50 bg-green-900/20' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORIES[task.category]?.emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: CATEGORIES[task.category]?.color + '30', color: CATEGORIES[task.category]?.color }}
                    >
                      {CATEGORIES[task.category]?.name}
                    </span>
                    <span className="text-xs text-yellow-400">
                      {'⭐'.repeat(task.difficulty)}
                    </span>
                    {task.frog && <span>🐸</span>}
                  </div>
                </div>
              </div>
              
              {/* Timer Buttons */}
              <div className="flex gap-2 mt-3">
                {TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    onClick={() => startFocus(task, preset.minutes)}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm font-medium transition-all"
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
      <div className="fixed bottom-24 right-4 flex flex-col gap-3">
        <button
          onClick={() => setShowAddTask(true)}
          className="w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-purple-700 transition-all"
        >
          +
        </button>
        <button
          onClick={resetDay}
          className="w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-slate-600 transition-all"
        >
          🔄
        </button>
      </div>
      
      {/* Bottom Stats */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-white">{completedTasks.length}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{tasks.length}</p>
            <p className="text-xs text-gray-400">Remaining</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{xp}</p>
            <p className="text-xs text-gray-400">Total XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
