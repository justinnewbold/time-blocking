'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Categories with colors
const CATEGORIES = {
  'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔' },
  'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋' },
  'home': { name: 'Home', color: '#10b981', emoji: '🏠' },
  'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧' },
  'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵' },
  'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨' },
};

// Initial tasks from Apple Reminders
const INITIAL_TASKS = [
  // Patty Shack Tasks
  { id: 1, title: 'Review Q4 sales reports', category: 'patty-shack', difficulty: 3, frog: false },
  { id: 2, title: 'Schedule manager meetings', category: 'patty-shack', difficulty: 2, frog: false },
  { id: 3, title: 'Update inventory system', category: 'patty-shack', difficulty: 4, frog: true },
  { id: 4, title: 'Review virtual brand performance', category: 'patty-shack', difficulty: 3, frog: false },
  { id: 5, title: 'Call Denver location', category: 'patty-shack', difficulty: 2, frog: false },
  { id: 6, title: 'Check Milwaukee staffing', category: 'patty-shack', difficulty: 2, frog: false },
  { id: 7, title: 'Layton equipment maintenance', category: 'patty-shack', difficulty: 3, frog: false },
  { id: 8, title: 'Review food costs', category: 'patty-shack', difficulty: 4, frog: true },
  { id: 9, title: 'Update menu pricing', category: 'patty-shack', difficulty: 3, frog: false },
  { id: 10, title: 'Schedule health inspections', category: 'patty-shack', difficulty: 2, frog: false },
  
  // Admin Tasks
  { id: 11, title: 'File quarterly taxes', category: 'admin', difficulty: 5, frog: true },
  { id: 12, title: 'Review insurance policies', category: 'admin', difficulty: 4, frog: true },
  { id: 13, title: 'Update business licenses', category: 'admin', difficulty: 3, frog: false },
  { id: 14, title: 'Pay vendor invoices', category: 'admin', difficulty: 2, frog: false },
  { id: 15, title: 'Review payroll', category: 'admin', difficulty: 3, frog: false },
  
  // Home Tasks
  { id: 16, title: 'Fix garage door', category: 'home', difficulty: 4, frog: true },
  { id: 17, title: 'Clean out basement', category: 'home', difficulty: 5, frog: true },
  { id: 18, title: 'Organize office', category: 'home', difficulty: 3, frog: false },
  { id: 19, title: 'Schedule HVAC maintenance', category: 'home', difficulty: 2, frog: false },
  { id: 20, title: 'Replace smoke detectors', category: 'home', difficulty: 2, frog: false },
  
  // Family Tasks
  { id: 21, title: 'Plan date night with Aimee', category: 'family', difficulty: 1, frog: false },
  { id: 22, title: "Mia's recital prep", category: 'family', difficulty: 2, frog: false },
  { id: 23, title: 'Family dinner planning', category: 'family', difficulty: 2, frog: false },
  
  // Music Tasks
  { id: 24, title: 'Practice KeyPerfect exercises', category: 'music', difficulty: 2, frog: false },
  { id: 25, title: 'Record new track ideas', category: 'music', difficulty: 3, frog: false },
  { id: 26, title: 'Update music studio setup', category: 'music', difficulty: 3, frog: false },
  
  // Personal Tasks
  { id: 27, title: 'Doctor appointment', category: 'personal', difficulty: 2, frog: false },
  { id: 28, title: 'Gym session', category: 'personal', difficulty: 2, frog: false },
  { id: 29, title: 'Read 30 mins', category: 'personal', difficulty: 1, frog: false },
  { id: 30, title: 'Meditation', category: 'personal', difficulty: 1, frog: false },
];

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

// Storage helper for persistence
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

export default function FocusFlow() {
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
  
  const timerRef = useRef(null);

  // Load from storage on mount
  useEffect(() => {
    const storedTasks = Storage.get('tasks', null);
    const storedCompleted = Storage.get('completedTasks', []);
    const storedXp = Storage.get('xp', 0);
    const storedStreak = Storage.get('streak', 0);
    const storedEnergy = Storage.get('todayEnergy', null);
    const storedDate = Storage.get('lastDate', null);
    const today = new Date().toDateString();
    
    // Reset energy if it's a new day
    if (storedDate !== today) {
      Storage.set('todayEnergy', null);
      Storage.set('lastDate', today);
      setEnergy(null);
      setScreen('checkin');
    } else if (storedEnergy) {
      setEnergy(storedEnergy);
      setScreen('main');
    }
    
    setTasks(storedTasks || INITIAL_TASKS);
    setCompletedTasks(storedCompleted);
    setXp(storedXp);
    setStreak(storedStreak);
    setIsLoaded(true);
  }, []);

  // Save to storage when state changes
  useEffect(() => {
    if (isLoaded) {
      Storage.set('tasks', tasks);
      Storage.set('completedTasks', completedTasks);
      Storage.set('xp', xp);
      Storage.set('streak', streak);
    }
  }, [tasks, completedTasks, xp, streak, isLoaded]);

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
      // Timer completed - auto complete task
      if (focusTask) {
        completeTask(focusTask);
      }
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerMinutes, timerSeconds, focusTask]);

  const handleEnergySelect = (value) => {
    setEnergy(value);
    Storage.set('todayEnergy', value);
    Storage.set('lastDate', new Date().toDateString());
    setScreen('frog');
  };

  const handleFrogSelect = (task) => {
    setDailyFrog(task.id);
    const updatedTasks = tasks.map(t => ({
      ...t,
      frog: t.id === task.id
    }));
    setTasks(updatedTasks);
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

  const completeTask = useCallback((task) => {
    // Calculate XP
    let earnedXp = task.difficulty * 10;
    if (task.frog) {
      earnedXp *= 2; // Double XP for frog!
      setFrogCompleted(true);
    }
    
    // Add energy bonus
    if (energy >= 3) earnedXp += 10;
    
    setXp(prev => prev + earnedXp);
    setCompletedTasks(prev => [...prev, { ...task, completedAt: new Date().toISOString(), xpEarned: earnedXp }]);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setShowCelebration(true);
    
    setTimeout(() => {
      setShowCelebration(false);
      setFocusTask(null);
      setScreen('main');
    }, 2000);
  }, [energy]);

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

  const addTask = () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: Date.now(),
      title: newTask.title.trim(),
      category: newTask.category,
      difficulty: newTask.difficulty,
      frog: false,
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [task, ...prev]);
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
        <div className="animate-pulse text-white text-xl">Loading FocusFlow...</div>
      </div>
    );
  }

  // Check-in Screen
  if (screen === 'checkin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Justin
          </h1>
          <p className="text-purple-200 text-center mb-8">How&apos;s your energy today?</p>
          
          <div className="space-y-4">
            {ENERGY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleEnergySelect(level.value)}
                className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-4 hover:bg-white/20 transition-all active:scale-98"
              >
                <span className="text-4xl">{level.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold">{level.label}</p>
                  <p className="text-purple-200 text-sm">{level.description}</p>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: level.color }}
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
    const progress = ((timerMinutes * 60 + timerSeconds) / (TIMER_PRESETS.find(p => p.minutes === Math.ceil((timerMinutes * 60 + timerSeconds) / 60))?.minutes * 60 || 25 * 60)) * 100;
    
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
              onClick={() => completeTask(focusTask)}
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
                onClick={addTask}
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
            <h1 className="text-xl font-bold text-white">FocusFlow</h1>
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
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
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
