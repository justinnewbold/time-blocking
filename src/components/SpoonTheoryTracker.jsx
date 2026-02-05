'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Storage helper
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

// Default spoon costs for activities
const DEFAULT_SPOON_COSTS = {
  // Task difficulty to spoon cost mapping
  difficulty: {
    1: 1,  // Very easy
    2: 2,  // Easy
    3: 3,  // Medium
    4: 5,  // Hard
    5: 7   // Very hard
  },
  // Additional factors
  frog: 2,           // Extra cost for frog tasks
  longDuration: 1,   // Extra cost for tasks > 45 min
  communication: 1,  // Extra cost for social/communication tasks
  creative: 1        // Extra cost for creative tasks
};

// Spoon restoration activities
const RESTORATION_ACTIVITIES = [
  { id: 'nap', name: 'Power Nap', emoji: '😴', spoons: 3, duration: '20-30 min' },
  { id: 'meal', name: 'Nutritious Meal', emoji: '🍽️', spoons: 2, duration: '30 min' },
  { id: 'walk', name: 'Short Walk', emoji: '🚶', spoons: 2, duration: '15-20 min' },
  { id: 'meditation', name: 'Meditation', emoji: '🧘', spoons: 2, duration: '10-15 min' },
  { id: 'shower', name: 'Shower/Bath', emoji: '🚿', spoons: 2, duration: '15-20 min' },
  { id: 'nature', name: 'Time in Nature', emoji: '🌳', spoons: 3, duration: '30+ min' },
  { id: 'social', name: 'Supportive Social Time', emoji: '💬', spoons: 2, duration: '20+ min' },
  { id: 'creative', name: 'Enjoyable Creative Activity', emoji: '🎨', spoons: 2, duration: '30+ min' },
  { id: 'rest', name: 'Complete Rest', emoji: '🛋️', spoons: 4, duration: '1+ hour' }
];

// Hook to manage spoon theory tracking
export function useSpoonTheory(tasks, completedTasks) {
  const [dailySpoons, setDailySpoons] = useState(() =>
    Storage.get('dailySpoons', 12)
  );
  const [currentSpoons, setCurrentSpoons] = useState(() => {
    const saved = Storage.get('currentSpoons', null);
    const lastDate = Storage.get('spoonsLastDate', null);
    const today = new Date().toDateString();

    // Reset spoons at start of new day
    if (lastDate !== today) {
      return Storage.get('dailySpoons', 12);
    }
    return saved ?? Storage.get('dailySpoons', 12);
  });
  const [spoonHistory, setSpoonHistory] = useState(() =>
    Storage.get('spoonHistory', [])
  );
  const [spoonCosts, setSpoonCosts] = useState(() =>
    Storage.get('customSpoonCosts', DEFAULT_SPOON_COSTS)
  );
  const [spoonsEnabled, setSpoonsEnabled] = useState(() =>
    Storage.get('spoonsEnabled', false)
  );

  // Save to storage
  useEffect(() => {
    Storage.set('dailySpoons', dailySpoons);
  }, [dailySpoons]);

  useEffect(() => {
    Storage.set('currentSpoons', currentSpoons);
    Storage.set('spoonsLastDate', new Date().toDateString());
  }, [currentSpoons]);

  useEffect(() => {
    Storage.set('spoonHistory', spoonHistory);
  }, [spoonHistory]);

  useEffect(() => {
    Storage.set('customSpoonCosts', spoonCosts);
  }, [spoonCosts]);

  useEffect(() => {
    Storage.set('spoonsEnabled', spoonsEnabled);
  }, [spoonsEnabled]);

  // Calculate spoon cost for a task
  const calculateTaskCost = useCallback((task) => {
    if (!task) return 0;

    let cost = spoonCosts.difficulty[task.difficulty || 2] || 2;

    // Additional factors
    if (task.frog) cost += spoonCosts.frog;
    if ((task.estimatedMinutes || 25) > 45) cost += spoonCosts.longDuration;
    if (['social', 'communication'].includes(task.category?.toLowerCase())) {
      cost += spoonCosts.communication;
    }
    if (['creative', 'design'].includes(task.category?.toLowerCase())) {
      cost += spoonCosts.creative;
    }

    return cost;
  }, [spoonCosts]);

  // Spend spoons for a task
  const spendSpoons = useCallback((task, customCost = null) => {
    const cost = customCost ?? calculateTaskCost(task);

    setCurrentSpoons(prev => Math.max(0, prev - cost));
    setSpoonHistory(prev => [{
      type: 'spend',
      amount: cost,
      taskId: task?.id,
      taskTitle: task?.title,
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 200));

    return cost;
  }, [calculateTaskCost]);

  // Restore spoons
  const restoreSpoons = useCallback((amount, activity = null) => {
    setCurrentSpoons(prev => Math.min(dailySpoons, prev + amount));
    setSpoonHistory(prev => [{
      type: 'restore',
      amount,
      activity,
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 200));

    return amount;
  }, [dailySpoons]);

  // Manual adjustment
  const adjustSpoons = useCallback((newValue) => {
    const clamped = Math.max(0, Math.min(dailySpoons + 5, newValue)); // Allow slightly over daily
    setCurrentSpoons(clamped);
  }, [dailySpoons]);

  // Get tasks affordable with current spoons
  const getAffordableTasks = useCallback((taskList) => {
    return taskList.filter(task => calculateTaskCost(task) <= currentSpoons);
  }, [calculateTaskCost, currentSpoons]);

  // Get recommended tasks based on remaining spoons
  const getRecommendedTasks = useCallback((taskList) => {
    const affordable = getAffordableTasks(taskList);

    if (currentSpoons <= 3) {
      // Very low spoons - only easiest tasks
      return affordable.filter(t => calculateTaskCost(t) <= 2);
    } else if (currentSpoons <= 6) {
      // Low spoons - prefer easier tasks
      return affordable.sort((a, b) => calculateTaskCost(a) - calculateTaskCost(b));
    } else {
      // Good spoons - can tackle harder tasks
      return affordable;
    }
  }, [getAffordableTasks, currentSpoons, calculateTaskCost]);

  // Get spoon status
  const spoonStatus = useMemo(() => {
    const percentage = (currentSpoons / dailySpoons) * 100;

    if (percentage >= 75) return { level: 'high', color: 'green', message: 'Good energy reserves!' };
    if (percentage >= 50) return { level: 'medium', color: 'yellow', message: 'Pace yourself' };
    if (percentage >= 25) return { level: 'low', color: 'orange', message: 'Running low - prioritize rest' };
    return { level: 'critical', color: 'red', message: 'Very low - focus on essentials only' };
  }, [currentSpoons, dailySpoons]);

  // Get today's summary
  const todaySummary = useMemo(() => {
    const today = new Date().toDateString();
    const todayHistory = spoonHistory.filter(h =>
      new Date(h.timestamp).toDateString() === today
    );

    const spent = todayHistory
      .filter(h => h.type === 'spend')
      .reduce((sum, h) => sum + h.amount, 0);
    const restored = todayHistory
      .filter(h => h.type === 'restore')
      .reduce((sum, h) => sum + h.amount, 0);

    return {
      started: dailySpoons,
      spent,
      restored,
      remaining: currentSpoons,
      tasksCompleted: todayHistory.filter(h => h.type === 'spend').length
    };
  }, [spoonHistory, dailySpoons, currentSpoons]);

  // Reset daily spoons
  const resetDailySpoons = useCallback(() => {
    setCurrentSpoons(dailySpoons);
  }, [dailySpoons]);

  return {
    // State
    dailySpoons,
    currentSpoons,
    spoonHistory,
    spoonsEnabled,
    spoonStatus,
    todaySummary,

    // Actions
    setDailySpoons,
    calculateTaskCost,
    spendSpoons,
    restoreSpoons,
    adjustSpoons,
    getAffordableTasks,
    getRecommendedTasks,
    resetDailySpoons,
    setSpoonsEnabled,

    // Data
    RESTORATION_ACTIVITIES,
    DEFAULT_SPOON_COSTS
  };
}

// Spoon Display Component
export function SpoonDisplay({ current, total, status }) {
  const spoonArray = Array.from({ length: total }, (_, i) => i < current);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Energy (Spoons)</span>
        <span className={`text-sm ${
          status.color === 'green' ? 'text-green-400' :
          status.color === 'yellow' ? 'text-yellow-400' :
          status.color === 'orange' ? 'text-orange-400' : 'text-red-400'
        }`}>
          {current} / {total}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {spoonArray.map((filled, i) => (
          <span
            key={i}
            className={`text-lg transition-all ${
              filled ? 'opacity-100' : 'opacity-20'
            }`}
          >
            🥄
          </span>
        ))}
      </div>

      <p className="text-xs text-white/40">{status.message}</p>
    </div>
  );
}

// Task Spoon Cost Badge
export function TaskSpoonCost({ task, calculateCost, currentSpoons }) {
  const cost = calculateCost(task);
  const canAfford = currentSpoons >= cost;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      canAfford ? 'bg-white/10' : 'bg-red-500/20 text-red-400'
    }`}>
      <span>🥄</span>
      <span>{cost}</span>
      {!canAfford && <span>(need more)</span>}
    </div>
  );
}

// Spoon Restoration Modal
export function SpoonRestorationModal({ isOpen, onClose, activities, onRestore, currentSpoons, dailySpoons }) {
  if (!isOpen) return null;

  const maxRestorable = dailySpoons - currentSpoons;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🔋 Restore Energy</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="p-4">
          <p className="text-sm text-white/60 mb-4">
            Take a break to restore your spoons. Current: {currentSpoons} / {dailySpoons}
          </p>

          {maxRestorable <= 0 ? (
            <div className="text-center text-green-400 py-4">
              <p>✨ Your spoons are fully restored!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => {
                    onRestore(Math.min(activity.spoons, maxRestorable), activity.name);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activity.emoji}</span>
                    <div className="text-left">
                      <div className="font-medium">{activity.name}</div>
                      <div className="text-xs text-white/40">{activity.duration}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400">+{Math.min(activity.spoons, maxRestorable)} 🥄</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Spoon Settings Panel
export function SpoonSettingsPanel({
  dailySpoons,
  onSetDailySpoons,
  spoonsEnabled,
  onToggleEnabled
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Spoon Theory Tracker</div>
          <div className="text-sm text-white/60">Track daily energy for chronic illness/ADHD</div>
        </div>
        <button
          onClick={() => onToggleEnabled(!spoonsEnabled)}
          className={`w-12 h-6 rounded-full transition-colors ${
            spoonsEnabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            spoonsEnabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {spoonsEnabled && (
        <div>
          <label className="text-sm text-white/60">Daily Spoon Allowance</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="range"
              min={5}
              max={20}
              value={dailySpoons}
              onChange={(e) => onSetDailySpoons(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 text-center">{dailySpoons}</span>
          </div>
          <p className="text-xs text-white/40 mt-1">
            12 is typical. Adjust based on your baseline energy.
          </p>
        </div>
      )}
    </div>
  );
}

// Spoon Summary Card
export function SpoonSummaryCard({ summary, status, onRestore }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">🥄 Spoon Status</h3>
        <button
          onClick={onRestore}
          className="text-sm text-green-400 hover:text-green-300"
        >
          + Restore
        </button>
      </div>

      <SpoonDisplay
        current={summary.remaining}
        total={summary.started}
        status={status}
      />

      <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-red-400">{summary.spent}</div>
          <div className="text-xs text-white/40">Spent</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-green-400">{summary.restored}</div>
          <div className="text-xs text-white/40">Restored</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div>{summary.tasksCompleted}</div>
          <div className="text-xs text-white/40">Tasks</div>
        </div>
      </div>
    </div>
  );
}

export default SpoonSummaryCard;
