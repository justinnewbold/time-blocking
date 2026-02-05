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

// Planning session steps
const PLANNING_STEPS = [
  {
    id: 'review',
    title: 'Review Last Week',
    emoji: '🔍',
    description: 'Reflect on what you accomplished and learned'
  },
  {
    id: 'celebrate',
    title: 'Celebrate Wins',
    emoji: '🎉',
    description: 'Acknowledge your achievements, big and small'
  },
  {
    id: 'rollover',
    title: 'Handle Unfinished Tasks',
    emoji: '📋',
    description: 'Decide what to keep, defer, or delete'
  },
  {
    id: 'goals',
    title: 'Set Weekly Goals',
    emoji: '🎯',
    description: 'Choose 2-3 major goals for the week'
  },
  {
    id: 'schedule',
    title: 'Plan Your Week',
    emoji: '📅',
    description: 'Assign tasks to days and time blocks'
  },
  {
    id: 'commit',
    title: 'Commit to Your Plan',
    emoji: '💪',
    description: 'Review and confirm your weekly intentions'
  }
];

// Reflection prompts
const REFLECTION_PROMPTS = [
  "What was your biggest win this week?",
  "What task did you procrastinate on most?",
  "What helped you focus best?",
  "What surprised you this week?",
  "What would you do differently?",
  "What are you grateful for?"
];

// Hook to manage weekly planning
export function useWeeklyPlanning(tasks, completedTasks, onCreateTask) {
  const [currentStep, setCurrentStep] = useState(0);
  const [planningData, setPlanningData] = useState(() =>
    Storage.get('weeklyPlanningData', {
      lastPlanningDate: null,
      weeklyGoals: [],
      reflections: {},
      scheduledTasks: {},
      weeklyReviews: []
    })
  );
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [tempData, setTempData] = useState({});

  // Get current week identifier
  const getCurrentWeek = useCallback(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return `${now.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
  }, []);

  // Save planning data to storage
  useEffect(() => {
    Storage.set('weeklyPlanningData', planningData);
  }, [planningData]);

  // Check if planning session is due
  const isPlanningDue = useMemo(() => {
    const lastDate = planningData.lastPlanningDate;
    if (!lastDate) return true;

    const last = new Date(lastDate);
    const now = new Date();
    const daysSinceLast = Math.floor((now - last) / (24 * 60 * 60 * 1000));

    return daysSinceLast >= 7;
  }, [planningData.lastPlanningDate]);

  // Get last week's stats
  const lastWeekStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const tasksCompletedLastWeek = completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt || task.completed_at);
      return completedDate >= weekAgo && completedDate <= now;
    });

    const frogsEaten = tasksCompletedLastWeek.filter(t => t.frog).length;
    const totalXP = tasksCompletedLastWeek.reduce((sum, t) => sum + (t.earnedXP || 0), 0);
    const totalMinutes = tasksCompletedLastWeek.reduce((sum, t) =>
      sum + (t.timeData?.actual || t.estimatedMinutes || 0), 0
    );

    // Category breakdown
    const categories = {};
    tasksCompletedLastWeek.forEach(task => {
      categories[task.category] = (categories[task.category] || 0) + 1;
    });

    return {
      total: tasksCompletedLastWeek.length,
      frogsEaten,
      totalXP,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      categories,
      tasks: tasksCompletedLastWeek
    };
  }, [completedTasks]);

  // Get unfinished tasks from last week
  const unfinishedTasks = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return tasks.filter(task => {
      if (task.completed) return false;
      const createdDate = new Date(task.createdAt || task.created_at || now);
      return createdDate < now;
    });
  }, [tasks]);

  // Start planning session
  const startPlanningSession = useCallback(() => {
    setIsSessionActive(true);
    setCurrentStep(0);
    setTempData({
      reflection: '',
      wins: [],
      rolloverDecisions: {},
      weeklyGoals: [],
      schedule: {}
    });
  }, []);

  // Navigate steps
  const nextStep = useCallback(() => {
    if (currentStep < PLANNING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Complete planning session
  const completePlanningSession = useCallback(() => {
    const weekId = getCurrentWeek();

    const review = {
      weekId,
      completedAt: new Date().toISOString(),
      stats: lastWeekStats,
      reflection: tempData.reflection,
      wins: tempData.wins,
      goals: tempData.weeklyGoals
    };

    setPlanningData(prev => ({
      ...prev,
      lastPlanningDate: new Date().toISOString(),
      weeklyGoals: tempData.weeklyGoals,
      scheduledTasks: tempData.schedule,
      weeklyReviews: [review, ...prev.weeklyReviews].slice(0, 52) // Keep 1 year
    }));

    setIsSessionActive(false);
    setTempData({});
    setCurrentStep(0);
  }, [getCurrentWeek, lastWeekStats, tempData]);

  // Cancel planning session
  const cancelPlanningSession = useCallback(() => {
    setIsSessionActive(false);
    setTempData({});
    setCurrentStep(0);
  }, []);

  // Update temporary data
  const updateTempData = useCallback((key, value) => {
    setTempData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Set rollover decision for a task
  const setRolloverDecision = useCallback((taskId, decision) => {
    setTempData(prev => ({
      ...prev,
      rolloverDecisions: {
        ...prev.rolloverDecisions,
        [taskId]: decision
      }
    }));
  }, []);

  // Add weekly goal
  const addWeeklyGoal = useCallback((goal) => {
    setTempData(prev => ({
      ...prev,
      weeklyGoals: [...(prev.weeklyGoals || []), goal]
    }));
  }, []);

  // Remove weekly goal
  const removeWeeklyGoal = useCallback((index) => {
    setTempData(prev => ({
      ...prev,
      weeklyGoals: prev.weeklyGoals.filter((_, i) => i !== index)
    }));
  }, []);

  return {
    // State
    currentStep,
    planningData,
    isSessionActive,
    tempData,
    isPlanningDue,
    lastWeekStats,
    unfinishedTasks,

    // Actions
    startPlanningSession,
    completePlanningSession,
    cancelPlanningSession,
    nextStep,
    prevStep,
    updateTempData,
    setRolloverDecision,
    addWeeklyGoal,
    removeWeeklyGoal,

    // Constants
    PLANNING_STEPS,
    REFLECTION_PROMPTS
  };
}

// Weekly Planning Reminder Card
export function WeeklyPlanningReminder({ isPlanningDue, onStartPlanning }) {
  if (!isPlanningDue) return null;

  return (
    <div className="glass-card p-4 border-2 border-purple-500/30">
      <div className="flex items-center gap-3">
        <span className="text-3xl">📆</span>
        <div className="flex-1">
          <div className="font-semibold">Time for Weekly Planning!</div>
          <div className="text-sm text-white/60">
            Start your week with intention and clarity
          </div>
        </div>
        <button
          onClick={onStartPlanning}
          className="glass-button px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30"
        >
          Start Session
        </button>
      </div>
    </div>
  );
}

// Step 1: Review Last Week
function ReviewStep({ stats, onReflectionChange, reflection, prompts }) {
  const [selectedPrompt, setSelectedPrompt] = useState(
    prompts[Math.floor(Math.random() * prompts.length)]
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">🔍</span>
        <h3 className="text-xl font-bold">Review Last Week</h3>
        <p className="text-white/60">Let's see what you accomplished!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{stats.total}</div>
          <div className="text-sm text-white/60">Tasks Completed</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{stats.frogsEaten}</div>
          <div className="text-sm text-white/60">Frogs Eaten</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.totalXP}</div>
          <div className="text-sm text-white/60">XP Earned</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{stats.totalHours}h</div>
          <div className="text-sm text-white/60">Focus Time</div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(stats.categories).length > 0 && (
        <div className="glass-card p-4">
          <div className="text-sm font-medium text-white/60 mb-2">Categories:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.categories).map(([cat, count]) => (
              <span key={cat} className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reflection prompt */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-white/60">Reflection:</div>
          <button
            onClick={() => setSelectedPrompt(prompts[Math.floor(Math.random() * prompts.length)])}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            New prompt
          </button>
        </div>
        <p className="text-sm italic text-white/80 mb-3">{selectedPrompt}</p>
        <textarea
          value={reflection}
          onChange={(e) => onReflectionChange(e.target.value)}
          placeholder="Write your reflection..."
          className="glass-input w-full h-24 resize-none"
        />
      </div>
    </div>
  );
}

// Step 2: Celebrate Wins
function CelebrateStep({ stats, wins, onWinsChange }) {
  const [newWin, setNewWin] = useState('');

  const addWin = () => {
    if (newWin.trim()) {
      onWinsChange([...wins, newWin.trim()]);
      setNewWin('');
    }
  };

  const removeWin = (index) => {
    onWinsChange(wins.filter((_, i) => i !== index));
  };

  // Auto-generate some wins from stats
  const suggestedWins = useMemo(() => {
    const suggestions = [];
    if (stats.total > 0) suggestions.push(`Completed ${stats.total} tasks!`);
    if (stats.frogsEaten > 0) suggestions.push(`Ate ${stats.frogsEaten} frogs - tackled the hard stuff!`);
    if (stats.totalHours >= 5) suggestions.push(`${stats.totalHours} hours of focused work!`);
    return suggestions;
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">🎉</span>
        <h3 className="text-xl font-bold">Celebrate Your Wins!</h3>
        <p className="text-white/60">Every accomplishment deserves recognition</p>
      </div>

      {/* Suggested wins */}
      {suggestedWins.length > 0 && (
        <div className="glass-card p-4">
          <div className="text-sm font-medium text-white/60 mb-2">Auto-detected wins:</div>
          <div className="space-y-2">
            {suggestedWins.map((win, i) => (
              <div key={i} className="flex items-center gap-2 text-green-400">
                <span>✨</span>
                <span>{win}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom wins */}
      <div className="glass-card p-4">
        <div className="text-sm font-medium text-white/60 mb-2">Add your own wins:</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWin}
            onChange={(e) => setNewWin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWin()}
            placeholder="Something you're proud of..."
            className="glass-input flex-1"
          />
          <button onClick={addWin} className="glass-button px-4">+</button>
        </div>

        {wins.length > 0 && (
          <div className="mt-3 space-y-2">
            {wins.map((win, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span>🏆</span>
                  <span>{win}</span>
                </div>
                <button onClick={() => removeWin(i)} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Handle Rollover Tasks
function RolloverStep({ unfinishedTasks, decisions, onDecision }) {
  const DECISION_OPTIONS = [
    { id: 'keep', label: 'Keep', emoji: '✅', color: 'green' },
    { id: 'defer', label: 'Defer', emoji: '📅', color: 'yellow' },
    { id: 'delete', label: 'Delete', emoji: '🗑️', color: 'red' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">📋</span>
        <h3 className="text-xl font-bold">Handle Unfinished Tasks</h3>
        <p className="text-white/60">Decide what to do with each task</p>
      </div>

      {unfinishedTasks.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <span className="text-4xl mb-2 block">🎯</span>
          <p className="text-white/60">No unfinished tasks! You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {unfinishedTasks.map(task => (
            <div key={task.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-1">{task.frog ? '🐸' : '○'}</span>
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-white/40">{task.category}</div>

                  <div className="flex gap-2 mt-3">
                    {DECISION_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        onClick={() => onDecision(task.id, option.id)}
                        className={`flex-1 py-2 rounded-lg transition-all text-sm ${
                          decisions[task.id] === option.id
                            ? option.color === 'green'
                              ? 'bg-green-500/30 ring-2 ring-green-500/50'
                              : option.color === 'yellow'
                                ? 'bg-yellow-500/30 ring-2 ring-yellow-500/50'
                                : 'bg-red-500/30 ring-2 ring-red-500/50'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {option.emoji} {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {Object.keys(decisions).length > 0 && (
        <div className="glass-card p-4">
          <div className="text-sm text-white/60">Summary:</div>
          <div className="flex gap-4 mt-2">
            <span className="text-green-400">
              ✅ Keep: {Object.values(decisions).filter(d => d === 'keep').length}
            </span>
            <span className="text-yellow-400">
              📅 Defer: {Object.values(decisions).filter(d => d === 'defer').length}
            </span>
            <span className="text-red-400">
              🗑️ Delete: {Object.values(decisions).filter(d => d === 'delete').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: Set Weekly Goals
function GoalsStep({ goals, onAddGoal, onRemoveGoal }) {
  const [newGoal, setNewGoal] = useState('');
  const [goalType, setGoalType] = useState('outcome');

  const GOAL_TYPES = [
    { id: 'outcome', label: 'Outcome', emoji: '🎯', placeholder: "What do you want to achieve?" },
    { id: 'habit', label: 'Habit', emoji: '🔄', placeholder: "What habit do you want to build?" },
    { id: 'avoid', label: 'Avoid', emoji: '🚫', placeholder: "What do you want to avoid?" }
  ];

  const addGoal = () => {
    if (newGoal.trim()) {
      onAddGoal({
        text: newGoal.trim(),
        type: goalType,
        createdAt: new Date().toISOString()
      });
      setNewGoal('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">🎯</span>
        <h3 className="text-xl font-bold">Set Weekly Goals</h3>
        <p className="text-white/60">Choose 2-3 meaningful goals for this week</p>
      </div>

      {/* Goal type selector */}
      <div className="flex gap-2">
        {GOAL_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => setGoalType(type.id)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              goalType === type.id
                ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {type.emoji} {type.label}
          </button>
        ))}
      </div>

      {/* Add goal input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder={GOAL_TYPES.find(t => t.id === goalType)?.placeholder}
          className="glass-input flex-1"
        />
        <button
          onClick={addGoal}
          disabled={goals.length >= 5}
          className="glass-button px-4 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Goals list */}
      {goals.length > 0 && (
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {goal.type === 'outcome' ? '🎯' : goal.type === 'habit' ? '🔄' : '🚫'}
                </span>
                <span>{goal.text}</span>
              </div>
              <button
                onClick={() => onRemoveGoal(i)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && (
        <div className="text-center text-white/40 py-4">
          Add at least one goal to continue
        </div>
      )}

      {goals.length >= 3 && (
        <div className="text-center text-yellow-400 text-sm">
          ⚠️ Focus on 2-3 goals for best results
        </div>
      )}
    </div>
  );
}

// Step 5: Schedule Tasks
function ScheduleStep({ tasks, schedule, onScheduleChange }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');

  const getTasksForDay = (day) => {
    return Object.entries(schedule)
      .filter(([_, scheduledDay]) => scheduledDay === day)
      .map(([taskId]) => tasks.find(t => t.id === taskId))
      .filter(Boolean);
  };

  const assignToDay = (taskId, day) => {
    onScheduleChange({
      ...schedule,
      [taskId]: day
    });
  };

  const unscheduledTasks = tasks.filter(t =>
    !t.completed && !schedule[t.id]
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">📅</span>
        <h3 className="text-xl font-bold">Plan Your Week</h3>
        <p className="text-white/60">Assign tasks to specific days</p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedDay === day
                ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {day.substring(0, 3)}
            {getTasksForDay(day).length > 0 && (
              <span className="ml-1 text-xs opacity-60">({getTasksForDay(day).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks for selected day */}
      <div className="glass-card p-4">
        <div className="text-sm font-medium text-white/60 mb-2">
          Tasks for {selectedDay}:
        </div>
        {getTasksForDay(selectedDay).length === 0 ? (
          <p className="text-white/40 text-center py-4">No tasks scheduled</p>
        ) : (
          <div className="space-y-2">
            {getTasksForDay(selectedDay).map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span>{task.frog ? '🐸' : '○'}</span>
                  <span>{task.title}</span>
                </div>
                <button
                  onClick={() => {
                    const newSchedule = { ...schedule };
                    delete newSchedule[task.id];
                    onScheduleChange(newSchedule);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="glass-card p-4">
          <div className="text-sm font-medium text-white/60 mb-2">Unscheduled:</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {unscheduledTasks.map(task => (
              <button
                key={task.id}
                onClick={() => assignToDay(task.id, selectedDay)}
                className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{task.frog ? '🐸' : '○'}</span>
                  <span>{task.title}</span>
                </div>
                <span className="text-blue-400">+ {selectedDay.substring(0, 3)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 6: Commit
function CommitStep({ goals, stats, schedule, tasks }) {
  const scheduledCount = Object.keys(schedule).length;
  const totalEstimate = Object.keys(schedule)
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean)
    .reduce((sum, t) => sum + (t.estimatedMinutes || 25), 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-2 block">💪</span>
        <h3 className="text-xl font-bold">Ready to Crush This Week!</h3>
        <p className="text-white/60">Here's your plan at a glance</p>
      </div>

      {/* Goals summary */}
      <div className="glass-card p-4">
        <div className="text-sm font-medium text-white/60 mb-2">🎯 Your Goals:</div>
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>
                {goal.type === 'outcome' ? '🎯' : goal.type === 'habit' ? '🔄' : '🚫'}
              </span>
              <span>{goal.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule summary */}
      <div className="glass-card p-4">
        <div className="text-sm font-medium text-white/60 mb-2">📅 Schedule:</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <div className="text-xs text-white/40">Tasks Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(totalEstimate / 60)}h</div>
            <div className="text-xs text-white/40">Estimated Time</div>
          </div>
        </div>
      </div>

      {/* Motivational message */}
      <div className="glass-card p-4 text-center bg-gradient-to-r from-purple-500/20 to-blue-500/20">
        <p className="text-lg">
          "The secret of getting ahead is getting started."
        </p>
        <p className="text-sm text-white/60 mt-1">— Mark Twain</p>
      </div>
    </div>
  );
}

// Main Weekly Planning Modal
export function WeeklyPlanningModal({
  isOpen,
  onClose,
  currentStep,
  tempData,
  lastWeekStats,
  unfinishedTasks,
  tasks,
  onNext,
  onPrev,
  onComplete,
  updateTempData,
  setRolloverDecision,
  addWeeklyGoal,
  removeWeeklyGoal,
  PLANNING_STEPS,
  REFLECTION_PROMPTS
}) {
  if (!isOpen) return null;

  const step = PLANNING_STEPS[currentStep];
  const canProceed = () => {
    switch (step.id) {
      case 'goals':
        return (tempData.weeklyGoals || []).length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step.id) {
      case 'review':
        return (
          <ReviewStep
            stats={lastWeekStats}
            reflection={tempData.reflection || ''}
            onReflectionChange={(val) => updateTempData('reflection', val)}
            prompts={REFLECTION_PROMPTS}
          />
        );
      case 'celebrate':
        return (
          <CelebrateStep
            stats={lastWeekStats}
            wins={tempData.wins || []}
            onWinsChange={(val) => updateTempData('wins', val)}
          />
        );
      case 'rollover':
        return (
          <RolloverStep
            unfinishedTasks={unfinishedTasks}
            decisions={tempData.rolloverDecisions || {}}
            onDecision={setRolloverDecision}
          />
        );
      case 'goals':
        return (
          <GoalsStep
            goals={tempData.weeklyGoals || []}
            onAddGoal={addWeeklyGoal}
            onRemoveGoal={removeWeeklyGoal}
          />
        );
      case 'schedule':
        return (
          <ScheduleStep
            tasks={tasks}
            schedule={tempData.schedule || {}}
            onScheduleChange={(val) => updateTempData('schedule', val)}
          />
        );
      case 'commit':
        return (
          <CommitStep
            goals={tempData.weeklyGoals || []}
            stats={lastWeekStats}
            schedule={tempData.schedule || {}}
            tasks={tasks}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">📆 Weekly Planning</h2>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {PLANNING_STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`flex-1 h-2 rounded-full transition-all ${
                  i < currentStep
                    ? 'bg-green-500'
                    : i === currentStep
                      ? 'bg-blue-500'
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-white/60 mt-2">
            Step {currentStep + 1} of {PLANNING_STEPS.length}: {step.title}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-between">
          <button
            onClick={onPrev}
            disabled={currentStep === 0}
            className="glass-button px-4 py-2 disabled:opacity-30"
          >
            ← Back
          </button>

          {currentStep === PLANNING_STEPS.length - 1 ? (
            <button
              onClick={onComplete}
              className="glass-button px-6 py-2 bg-green-500/20 hover:bg-green-500/30"
            >
              ✓ Complete Planning
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canProceed()}
              className="glass-button px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Weekly Goals Display Card
export function WeeklyGoalsCard({ goals, onEdit }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">🎯 Weekly Goals</h3>
        {onEdit && (
          <button onClick={onEdit} className="text-sm text-blue-400 hover:text-blue-300">
            Edit
          </button>
        )}
      </div>
      <div className="space-y-2">
        {goals.map((goal, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>
              {goal.type === 'outcome' ? '🎯' : goal.type === 'habit' ? '🔄' : '🚫'}
            </span>
            <span>{goal.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeeklyPlanningModal;
