'use client';
import { useState, useEffect, useCallback } from 'react';

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

// Recurrence types
const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
};

// Day names
const DAYS = [
  { id: 0, short: 'Sun', full: 'Sunday' },
  { id: 1, short: 'Mon', full: 'Monday' },
  { id: 2, short: 'Tue', full: 'Tuesday' },
  { id: 3, short: 'Wed', full: 'Wednesday' },
  { id: 4, short: 'Thu', full: 'Thursday' },
  { id: 5, short: 'Fri', full: 'Friday' },
  { id: 6, short: 'Sat', full: 'Saturday' }
];

// Month options
const MONTHLY_OPTIONS = {
  DAY_OF_MONTH: 'day_of_month',  // e.g., 15th of every month
  DAY_OF_WEEK: 'day_of_week',   // e.g., 2nd Tuesday
  LAST_DAY: 'last_day'          // Last day of month
};

// Hook for advanced recurrence
export function useAdvancedRecurrence() {
  const [recurrenceRules, setRecurrenceRules] = useState(() =>
    Storage.get('recurrenceRules', {})
  );
  const [generatedTasks, setGeneratedTasks] = useState(() =>
    Storage.get('generatedRecurringTasks', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('recurrenceRules', recurrenceRules);
  }, [recurrenceRules]);

  useEffect(() => {
    Storage.set('generatedRecurringTasks', generatedTasks);
  }, [generatedTasks]);

  // Create recurrence rule
  const createRecurrenceRule = useCallback((taskId, rule) => {
    const newRule = {
      id: `rule_${Date.now()}`,
      taskId,
      type: rule.type || RECURRENCE_TYPES.DAILY,
      interval: rule.interval || 1,
      daysOfWeek: rule.daysOfWeek || [],
      dayOfMonth: rule.dayOfMonth || null,
      monthlyOption: rule.monthlyOption || MONTHLY_OPTIONS.DAY_OF_MONTH,
      weekOfMonth: rule.weekOfMonth || 1,
      endDate: rule.endDate || null,
      occurrences: rule.occurrences || null,
      skipWeekends: rule.skipWeekends || false,
      skipHolidays: rule.skipHolidays || false,
      generateAhead: rule.generateAhead || 7, // days
      lastGenerated: null,
      timesGenerated: 0,
      createdAt: new Date().toISOString()
    };

    setRecurrenceRules(prev => ({
      ...prev,
      [taskId]: newRule
    }));

    return newRule;
  }, []);

  // Update recurrence rule
  const updateRecurrenceRule = useCallback((taskId, updates) => {
    setRecurrenceRules(prev => {
      if (!prev[taskId]) return prev;
      return {
        ...prev,
        [taskId]: { ...prev[taskId], ...updates }
      };
    });
  }, []);

  // Delete recurrence rule
  const deleteRecurrenceRule = useCallback((taskId) => {
    setRecurrenceRules(prev => {
      const { [taskId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Calculate next occurrence
  const calculateNextOccurrence = useCallback((rule, fromDate = new Date()) => {
    const date = new Date(fromDate);
    date.setHours(0, 0, 0, 0);

    switch (rule.type) {
      case RECURRENCE_TYPES.DAILY:
        date.setDate(date.getDate() + rule.interval);
        break;

      case RECURRENCE_TYPES.WEEKLY:
        if (rule.daysOfWeek.length > 0) {
          // Find next matching day
          let found = false;
          for (let i = 1; i <= 7 * rule.interval; i++) {
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + i);
            if (rule.daysOfWeek.includes(nextDate.getDay())) {
              date.setTime(nextDate.getTime());
              found = true;
              break;
            }
          }
          if (!found) {
            date.setDate(date.getDate() + 7 * rule.interval);
          }
        } else {
          date.setDate(date.getDate() + 7 * rule.interval);
        }
        break;

      case RECURRENCE_TYPES.BIWEEKLY:
        date.setDate(date.getDate() + 14);
        break;

      case RECURRENCE_TYPES.MONTHLY:
        if (rule.monthlyOption === MONTHLY_OPTIONS.LAST_DAY) {
          // Last day of next month
          date.setMonth(date.getMonth() + rule.interval + 1, 0);
        } else if (rule.monthlyOption === MONTHLY_OPTIONS.DAY_OF_WEEK) {
          // Nth weekday of month
          date.setMonth(date.getMonth() + rule.interval);
          date.setDate(1);
          const targetDay = rule.daysOfWeek[0] || 1;
          const targetWeek = rule.weekOfMonth || 1;

          // Find first occurrence of target day
          while (date.getDay() !== targetDay) {
            date.setDate(date.getDate() + 1);
          }
          // Move to target week
          date.setDate(date.getDate() + (targetWeek - 1) * 7);
        } else {
          // Specific day of month
          date.setMonth(date.getMonth() + rule.interval);
          if (rule.dayOfMonth) {
            date.setDate(Math.min(rule.dayOfMonth, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
          }
        }
        break;

      case RECURRENCE_TYPES.CUSTOM:
        date.setDate(date.getDate() + rule.interval);
        break;

      default:
        return null;
    }

    // Skip weekends if enabled
    if (rule.skipWeekends) {
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
    }

    // Check end conditions
    if (rule.endDate && date > new Date(rule.endDate)) {
      return null;
    }
    if (rule.occurrences && rule.timesGenerated >= rule.occurrences) {
      return null;
    }

    return date;
  }, []);

  // Generate upcoming occurrences
  const generateUpcomingOccurrences = useCallback((rule, count = 5) => {
    const occurrences = [];
    let currentDate = new Date();

    for (let i = 0; i < count; i++) {
      const next = calculateNextOccurrence(rule, currentDate);
      if (!next) break;
      occurrences.push(next);
      currentDate = next;
    }

    return occurrences;
  }, [calculateNextOccurrence]);

  // Generate recurring task instance
  const generateTaskInstance = useCallback((baseTask, rule, dueDate) => {
    return {
      id: `${baseTask.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: baseTask.title,
      category: baseTask.category,
      difficulty: baseTask.difficulty,
      estimatedMinutes: baseTask.estimatedMinutes,
      frog: baseTask.frog,
      dueDate: dueDate.toISOString(),
      completed: false,
      created_at: new Date().toISOString(),
      isRecurringInstance: true,
      parentTaskId: baseTask.id,
      recurrenceRuleId: rule.id
    };
  }, []);

  // Check and generate due recurring tasks
  const processRecurringTasks = useCallback((tasks) => {
    const now = new Date();
    const newTasks = [];

    Object.entries(recurrenceRules).forEach(([taskId, rule]) => {
      const baseTask = tasks.find(t => t.id === taskId);
      if (!baseTask) return;

      const lastGen = rule.lastGenerated ? new Date(rule.lastGenerated) : new Date(rule.createdAt);
      const generateUntil = new Date(now.getTime() + rule.generateAhead * 24 * 60 * 60 * 1000);

      let nextDate = calculateNextOccurrence(rule, lastGen);

      while (nextDate && nextDate <= generateUntil) {
        // Check if this instance already exists
        const instanceExists = generatedTasks.some(t =>
          t.parentTaskId === taskId &&
          new Date(t.dueDate).toDateString() === nextDate.toDateString()
        );

        if (!instanceExists) {
          const newTask = generateTaskInstance(baseTask, rule, nextDate);
          newTasks.push(newTask);
        }

        nextDate = calculateNextOccurrence(rule, nextDate);
      }

      // Update lastGenerated
      if (newTasks.length > 0) {
        updateRecurrenceRule(taskId, {
          lastGenerated: now.toISOString(),
          timesGenerated: rule.timesGenerated + newTasks.length
        });
      }
    });

    if (newTasks.length > 0) {
      setGeneratedTasks(prev => [...prev, ...newTasks]);
    }

    return newTasks;
  }, [recurrenceRules, generatedTasks, calculateNextOccurrence, generateTaskInstance, updateRecurrenceRule]);

  // Get recurrence rule for task
  const getRecurrenceRule = useCallback((taskId) => {
    return recurrenceRules[taskId] || null;
  }, [recurrenceRules]);

  // Get human-readable recurrence description
  const getRecurrenceDescription = useCallback((rule) => {
    if (!rule) return 'No recurrence';

    switch (rule.type) {
      case RECURRENCE_TYPES.DAILY:
        return rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`;

      case RECURRENCE_TYPES.WEEKLY:
        if (rule.daysOfWeek.length > 0) {
          const dayNames = rule.daysOfWeek.map(d => DAYS[d].short).join(', ');
          return rule.interval === 1
            ? `Weekly on ${dayNames}`
            : `Every ${rule.interval} weeks on ${dayNames}`;
        }
        return rule.interval === 1 ? 'Every week' : `Every ${rule.interval} weeks`;

      case RECURRENCE_TYPES.BIWEEKLY:
        return 'Every 2 weeks';

      case RECURRENCE_TYPES.MONTHLY:
        if (rule.monthlyOption === MONTHLY_OPTIONS.LAST_DAY) {
          return 'Last day of every month';
        }
        if (rule.monthlyOption === MONTHLY_OPTIONS.DAY_OF_WEEK) {
          const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
          const dayName = DAYS[rule.daysOfWeek[0]]?.full || 'day';
          return `${ordinals[rule.weekOfMonth - 1]} ${dayName} of every month`;
        }
        return `Day ${rule.dayOfMonth} of every month`;

      case RECURRENCE_TYPES.CUSTOM:
        return `Every ${rule.interval} days`;

      default:
        return 'No recurrence';
    }
  }, []);

  return {
    // State
    recurrenceRules,
    generatedTasks,

    // Actions
    createRecurrenceRule,
    updateRecurrenceRule,
    deleteRecurrenceRule,
    processRecurringTasks,
    calculateNextOccurrence,
    generateUpcomingOccurrences,

    // Helpers
    getRecurrenceRule,
    getRecurrenceDescription,

    // Constants
    RECURRENCE_TYPES,
    DAYS,
    MONTHLY_OPTIONS
  };
}

// Recurrence Type Selector
export function RecurrenceTypeSelector({ value, onChange }) {
  const options = [
    { id: RECURRENCE_TYPES.NONE, label: 'None', emoji: '➖' },
    { id: RECURRENCE_TYPES.DAILY, label: 'Daily', emoji: '📅' },
    { id: RECURRENCE_TYPES.WEEKLY, label: 'Weekly', emoji: '📆' },
    { id: RECURRENCE_TYPES.BIWEEKLY, label: 'Biweekly', emoji: '🗓️' },
    { id: RECURRENCE_TYPES.MONTHLY, label: 'Monthly', emoji: '📊' },
    { id: RECURRENCE_TYPES.CUSTOM, label: 'Custom', emoji: '⚙️' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`p-2 rounded-lg text-sm transition-colors ${
            value === opt.id
              ? 'bg-blue-500/20 ring-2 ring-blue-500/50'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <span className="block text-lg">{opt.emoji}</span>
          <span className="text-xs">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// Day of Week Picker
export function DayOfWeekPicker({ selected, onChange, multiple = true }) {
  const handleToggle = (dayId) => {
    if (multiple) {
      const newSelected = selected.includes(dayId)
        ? selected.filter(d => d !== dayId)
        : [...selected, dayId].sort();
      onChange(newSelected);
    } else {
      onChange([dayId]);
    }
  };

  return (
    <div className="flex gap-1">
      {DAYS.map(day => (
        <button
          key={day.id}
          onClick={() => handleToggle(day.id)}
          className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
            selected.includes(day.id)
              ? 'bg-blue-500/30 text-white'
              : 'bg-white/10 text-white/40 hover:bg-white/15'
          }`}
        >
          {day.short}
        </button>
      ))}
    </div>
  );
}

// Interval Selector
export function IntervalSelector({ value, onChange, max = 30, label = "Every" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/60">{label}</span>
      <input
        type="number"
        min="1"
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        className="glass-input w-16 px-2 py-1 rounded-lg text-center"
      />
      <span className="text-sm text-white/60">day(s)</span>
    </div>
  );
}

// Monthly Options Selector
export function MonthlyOptionsSelector({ option, dayOfMonth, weekOfMonth, dayOfWeek, onChange }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {[
          { id: MONTHLY_OPTIONS.DAY_OF_MONTH, label: 'Day of month' },
          { id: MONTHLY_OPTIONS.DAY_OF_WEEK, label: 'Day of week' },
          { id: MONTHLY_OPTIONS.LAST_DAY, label: 'Last day' }
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-2">
            <input
              type="radio"
              checked={option === opt.id}
              onChange={() => onChange({ monthlyOption: opt.id })}
              className="accent-blue-500"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      {option === MONTHLY_OPTIONS.DAY_OF_MONTH && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">On day</span>
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth || 1}
            onChange={(e) => onChange({ dayOfMonth: parseInt(e.target.value) })}
            className="glass-input w-16 px-2 py-1 rounded-lg text-center"
          />
        </div>
      )}

      {option === MONTHLY_OPTIONS.DAY_OF_WEEK && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">The</span>
            <select
              value={weekOfMonth || 1}
              onChange={(e) => onChange({ weekOfMonth: parseInt(e.target.value) })}
              className="glass-input px-2 py-1 rounded-lg bg-transparent"
            >
              {['1st', '2nd', '3rd', '4th', '5th'].map((label, i) => (
                <option key={i} value={i + 1} className="bg-gray-900">{label}</option>
              ))}
            </select>
          </div>
          <DayOfWeekPicker
            selected={dayOfWeek || []}
            onChange={(days) => onChange({ daysOfWeek: days })}
            multiple={false}
          />
        </div>
      )}
    </div>
  );
}

// End Condition Selector
export function EndConditionSelector({ endDate, occurrences, onChange }) {
  const [endType, setEndType] = useState(
    endDate ? 'date' : occurrences ? 'count' : 'never'
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {[
          { id: 'never', label: 'Never ends' },
          { id: 'date', label: 'End by date' },
          { id: 'count', label: 'End after occurrences' }
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-2">
            <input
              type="radio"
              checked={endType === opt.id}
              onChange={() => {
                setEndType(opt.id);
                if (opt.id === 'never') {
                  onChange({ endDate: null, occurrences: null });
                }
              }}
              className="accent-blue-500"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      {endType === 'date' && (
        <input
          type="date"
          value={endDate ? endDate.split('T')[0] : ''}
          onChange={(e) => onChange({ endDate: e.target.value, occurrences: null })}
          className="glass-input px-3 py-2 rounded-lg w-full"
        />
      )}

      {endType === 'count' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">After</span>
          <input
            type="number"
            min="1"
            max="999"
            value={occurrences || 10}
            onChange={(e) => onChange({ occurrences: parseInt(e.target.value), endDate: null })}
            className="glass-input w-20 px-2 py-1 rounded-lg text-center"
          />
          <span className="text-sm text-white/60">times</span>
        </div>
      )}
    </div>
  );
}

// Preview Upcoming Occurrences
export function OccurrencePreview({ occurrences }) {
  if (occurrences.length === 0) {
    return <p className="text-sm text-white/40">No upcoming occurrences</p>;
  }

  return (
    <div className="space-y-1">
      <h5 className="text-xs text-white/60 mb-2">Upcoming:</h5>
      {occurrences.slice(0, 5).map((date, i) => (
        <div key={i} className="text-sm text-white/80 flex items-center gap-2">
          <span className="text-white/40">{i + 1}.</span>
          <span>{date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}</span>
        </div>
      ))}
    </div>
  );
}

// Recurrence Editor Modal
export function RecurrenceEditorModal({ isOpen, onClose, taskId, existingRule, onSave, recurrenceState }) {
  const [rule, setRule] = useState(existingRule || {
    type: RECURRENCE_TYPES.DAILY,
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: null,
    monthlyOption: MONTHLY_OPTIONS.DAY_OF_MONTH,
    weekOfMonth: 1,
    endDate: null,
    occurrences: null,
    skipWeekends: false
  });

  const { generateUpcomingOccurrences, getRecurrenceDescription } = recurrenceState;

  if (!isOpen) return null;

  const previewOccurrences = generateUpcomingOccurrences(rule);

  const handleSave = () => {
    onSave(taskId, rule);
    onClose();
  };

  const updateRule = (updates) => {
    setRule(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🔄 Set Recurrence</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-white/60 mb-2">Repeat</h4>
            <RecurrenceTypeSelector
              value={rule.type}
              onChange={(type) => updateRule({ type })}
            />
          </div>

          {rule.type !== RECURRENCE_TYPES.NONE && (
            <>
              {(rule.type === RECURRENCE_TYPES.DAILY || rule.type === RECURRENCE_TYPES.CUSTOM) && (
                <IntervalSelector
                  value={rule.interval}
                  onChange={(interval) => updateRule({ interval })}
                />
              )}

              {rule.type === RECURRENCE_TYPES.WEEKLY && (
                <div className="space-y-3">
                  <IntervalSelector
                    value={rule.interval}
                    onChange={(interval) => updateRule({ interval })}
                    label="Every"
                  />
                  <div>
                    <h5 className="text-sm text-white/60 mb-2">On days:</h5>
                    <DayOfWeekPicker
                      selected={rule.daysOfWeek}
                      onChange={(daysOfWeek) => updateRule({ daysOfWeek })}
                    />
                  </div>
                </div>
              )}

              {rule.type === RECURRENCE_TYPES.MONTHLY && (
                <MonthlyOptionsSelector
                  option={rule.monthlyOption}
                  dayOfMonth={rule.dayOfMonth}
                  weekOfMonth={rule.weekOfMonth}
                  dayOfWeek={rule.daysOfWeek}
                  onChange={updateRule}
                />
              )}

              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">Ends</h4>
                <EndConditionSelector
                  endDate={rule.endDate}
                  occurrences={rule.occurrences}
                  onChange={updateRule}
                />
              </div>

              <label className="flex items-center justify-between">
                <span className="text-sm">Skip weekends</span>
                <button
                  onClick={() => updateRule({ skipWeekends: !rule.skipWeekends })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    rule.skipWeekends ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
                    rule.skipWeekends ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </label>

              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-sm text-white/60 mb-2">
                  📝 {getRecurrenceDescription(rule)}
                </p>
                <OccurrencePreview occurrences={previewOccurrences} />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 glass-button py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 glass-button py-2 bg-blue-500/20 hover:bg-blue-500/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Recurrence Badge
export function RecurrenceBadge({ rule, description }) {
  if (!rule || rule.type === RECURRENCE_TYPES.NONE) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs">
      🔄 {description || 'Recurring'}
    </span>
  );
}

export default RecurrenceEditorModal;
