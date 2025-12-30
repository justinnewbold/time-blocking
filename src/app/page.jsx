'use client';
import { useState, useEffect, useCallback } from 'react';

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
  { id: 22, title: 'Mia\'s recital prep', category: 'family', difficulty: 2, frog: false },
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
  { value: 4, label: 'Locked In', emoji: '🔥', color: '#ef4444', description: 'Let\'s crush it!' },
];

// Timer presets
const TIMER_PRESETS = [
  { minutes: 5, label: '5 min', description: 'Quick burst' },
  { minutes: 15, label: '15 min', description: 'Pomodoro lite' },
  { minutes: 25, label: '25 min', description: 'Pomodoro' },
  { minutes: 45, label: '45 min', description: 'Deep work' },
];

export default function FocusFlow() {
  const [screen, setScreen] = useState('checkin');
  const [energy, setEnergy] = useState(null);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
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

  // Calculate level from XP
  useEffect(() => {
    const newLevel = Math.floor(xp / 100) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [xp, level]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            setTimerRunning(false);
            // Timer complete!
          } else {
            setTimerMinutes(timerMinutes - 1);
            setTimerSeconds(59);
          }
        } else {
          setTimerSeconds(timerSeconds - 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerMinutes, timerSeconds]);

  // Set daily frog
  useEffect(() => {
    const frogs = tasks.filter(t => t.frog);
    if (frogs.length > 0 && !dailyFrog) {
      setDailyFrog(frogs[Math.floor(Math.random() * frogs.length)]);
    }
  }, [tasks, dailyFrog]);

  const completeTask = useCallback((task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setCompletedTasks(prev => [...prev, { ...task, completedAt: new Date() }]);
    
    // Calculate XP
    let earnedXp = task.difficulty * 10;
    if (task.frog) earnedXp *= 2;
    if (task.id === dailyFrog?.id) {
      earnedXp *= 1.5;
      setFrogCompleted(true);
    }
    
    setXp(prev => prev + Math.round(earnedXp));
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
    
    if (focusTask?.id === task.id) {
      setFocusTask(null);
      setScreen('main');
    }
  }, [dailyFrog, focusTask]);

  const startFocus = (task, minutes) => {
    setFocusTask(task);
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setScreen('focus');
  };

  const cantToday = () => {
    setScreen('main');
    setEnergy({ ...energy, value: 1 });
    // No guilt!
  };

  const filteredTasks = selectedCategory === 'all' 
    ? tasks 
    : tasks.filter(t => t.category === selectedCategory);

  // Check-in Screen
  if (screen === 'checkin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white">
          <h1 className="text-3xl font-bold text-center mb-2">Good morning! ☀️</h1>
          <p className="text-center text-white/70 mb-8">How&apos;s your energy today?</p>
          
          <div className="space-y-3">
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.value}
                onClick={() => {
                  setEnergy(e);
                  setScreen(e.value >= 2 ? 'frog' : 'main');
                }}
                className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/20 transition-all flex items-center gap-4 group"
              >
                <span className="text-4xl group-hover:scale-125 transition-transform">{e.emoji}</span>
                <div className="text-left">
                  <div className="font-semibold">{e.label}</div>
                  <div className="text-sm text-white/60">{e.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Frog Selection Screen
  if (screen === 'frog') {
    const frogs = tasks.filter(t => t.frog);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white">
          <div className="text-center mb-6">
            <span className="text-6xl">🐸</span>
            <h1 className="text-2xl font-bold mt-4">Eat the Frog!</h1>
            <p className="text-white/70 mt-2">Pick ONE dreaded task to tackle first. Get it done = 2x XP!</p>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {frogs.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  setDailyFrog(task);
                  setScreen('main');
                }}
                className={`w-full p-4 rounded-xl bg-white/5 hover:bg-white/20 transition-all text-left ${
                  dailyFrog?.id === task.id ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>{CATEGORIES[task.category]?.emoji}</span>
                  <span>{task.title}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[...Array(task.difficulty)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">⭐</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setScreen('main')}
            className="w-full mt-6 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
          >
            Skip for today 💜
          </button>
        </div>
      </div>
    );
  }

  // Focus Mode Screen
  if (screen === 'focus' && focusTask) {
    const progress = ((timerMinutes * 60 + timerSeconds) / (25 * 60)) * 100;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-white text-center">
          <div className="text-6xl mb-4">{CATEGORIES[focusTask.category]?.emoji}</div>
          <h1 className="text-2xl font-bold mb-2">{focusTask.title}</h1>
          <p className="text-white/60 mb-8">Stay focused. You&apos;ve got this! 💪</p>
          
          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128" cy="128" r="120"
                fill="none" stroke="#334155" strokeWidth="8"
              />
              <circle
                cx="128" cy="128" r="120"
                fill="none" stroke="#10b981" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 7.54} 754`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-mono">
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </span>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`px-8 py-3 rounded-full font-semibold transition-all ${
                timerRunning 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {timerRunning ? '⏸️ Pause' : '▶️ Start'}
            </button>
            <button
              onClick={() => completeTask(focusTask)}
              className="px-8 py-3 rounded-full bg-purple-500 hover:bg-purple-600 font-semibold transition-all"
            >
              ✅ Done!
            </button>
          </div>
          
          <button
            onClick={() => {
              setFocusTask(null);
              setTimerRunning(false);
              setScreen('main');
            }}
            className="mt-6 text-white/60 hover:text-white transition-all"
          >
            ← Back to tasks
          </button>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-8xl animate-bounce">🎉</div>
        </div>
      )}
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
          <div>
            <h1 className="text-2xl font-bold">FocusFlow</h1>
            <p className="text-white/60">
              {energy?.emoji} {energy?.label}
              {frogCompleted && ' • 🐸 Frog eaten!'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">Level {level}</div>
            <div className="text-sm text-white/60">{xp} XP • {streak} day streak</div>
          </div>
        </div>
        
        {/* Daily Frog Banner */}
        {dailyFrog && !frogCompleted && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 mb-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <span className="text-3xl">🐸</span>
                <div>
                  <div className="font-semibold">Today&apos;s Frog</div>
                  <div className="text-sm text-white/70">{dailyFrog.title}</div>
                </div>
              </div>
              <button
                onClick={() => startFocus(dailyFrog, 25)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-white font-semibold transition-all"
              >
                Eat it! 🍽️
              </button>
            </div>
          </div>
        )}
        
        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 font-semibold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            All Tasks
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === key
                  ? 'bg-white text-slate-900 font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
        
        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white/5 rounded-2xl p-4 text-white transition-all hover:bg-white/10 ${
                task.id === dailyFrog?.id ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORIES[task.category]?.emoji}</span>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {task.title}
                      {task.frog && <span>🐸</span>}
                      {task.id === dailyFrog?.id && (
                        <span className="text-xs bg-green-500/30 px-2 py-0.5 rounded-full">Today&apos;s Frog</span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[...Array(task.difficulty)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-xs">⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {TIMER_PRESETS.slice(0, 3).map((preset) => (
                    <button
                      key={preset.minutes}
                      onClick={() => startFocus(task, preset.minutes)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => completeTask(task)}
                    className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-all"
                  >
                    ✅
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredTasks.length === 0 && (
          <div className="text-center text-white/60 py-12">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-xl">All done in this category!</div>
          </div>
        )}
        
        {/* Can't Today Button */}
        {energy?.value > 1 && (
          <button
            onClick={cantToday}
            className="w-full mt-8 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all"
          >
            I just can&apos;t today 💜
            <span className="block text-sm mt-1">No guilt. Reset to zombie mode.</span>
          </button>
        )}
        
        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-white text-center">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold">{completedTasks.length}</div>
            <div className="text-sm text-white/60">Completed</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold">{tasks.length}</div>
            <div className="text-sm text-white/60">Remaining</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold">{xp}</div>
            <div className="text-sm text-white/60">Total XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}