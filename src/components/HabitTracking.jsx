'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Habit frequency options
const FREQUENCIES = {
  daily: { label: 'Daily', days: 1 },
  weekdays: { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  weekends: { label: 'Weekends', days: [0, 6] },
  weekly: { label: 'Weekly', days: 7 },
  custom: { label: 'Custom', days: null },
};

// Hook for habit management
export function useHabitTracking() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({}); // { habitId: { date: true } }
  const [isLoaded, setIsLoaded] = useState(false);

  // Load habits from localStorage
  useEffect(() => {
    const savedHabits = localStorage.getItem('habits');
    const savedCompletions = localStorage.getItem('habit_completions');

    if (savedHabits) {
      try {
        setHabits(JSON.parse(savedHabits));
      } catch (e) {
        console.error('Failed to parse habits:', e);
      }
    }

    if (savedCompletions) {
      try {
        setCompletions(JSON.parse(savedCompletions));
      } catch (e) {
        console.error('Failed to parse completions:', e);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save habits
  const saveHabits = useCallback((newHabits) => {
    localStorage.setItem('habits', JSON.stringify(newHabits));
    setHabits(newHabits);
  }, []);

  // Save completions
  const saveCompletions = useCallback((newCompletions) => {
    localStorage.setItem('habit_completions', JSON.stringify(newCompletions));
    setCompletions(newCompletions);
  }, []);

  // Add habit
  const addHabit = useCallback((habit) => {
    const newHabit = {
      ...habit,
      id: `habit_${Date.now()}`,
      createdAt: new Date().toISOString(),
      streak: 0,
      longestStreak: 0,
    };
    saveHabits([...habits, newHabit]);
    return newHabit;
  }, [habits, saveHabits]);

  // Update habit
  const updateHabit = useCallback((habitId, updates) => {
    saveHabits(habits.map(h => h.id === habitId ? { ...h, ...updates } : h));
  }, [habits, saveHabits]);

  // Delete habit
  const deleteHabit = useCallback((habitId) => {
    saveHabits(habits.filter(h => h.id !== habitId));
    const newCompletions = { ...completions };
    delete newCompletions[habitId];
    saveCompletions(newCompletions);
  }, [habits, completions, saveHabits, saveCompletions]);

  // Toggle completion for a date
  const toggleCompletion = useCallback((habitId, date = new Date()) => {
    const dateKey = date.toISOString().split('T')[0];
    const habitCompletions = completions[habitId] || {};
    const isCompleted = habitCompletions[dateKey];

    const newCompletions = {
      ...completions,
      [habitId]: {
        ...habitCompletions,
        [dateKey]: !isCompleted,
      },
    };

    // Update streak
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const newStreak = calculateStreak(newCompletions[habitId], habit.frequency);
      const newLongest = Math.max(habit.longestStreak || 0, newStreak);
      updateHabit(habitId, { streak: newStreak, longestStreak: newLongest });
    }

    saveCompletions(newCompletions);
    return !isCompleted;
  }, [completions, habits, updateHabit, saveCompletions]);

  // Check if habit is completed for a date
  const isCompleted = useCallback((habitId, date = new Date()) => {
    const dateKey = date.toISOString().split('T')[0];
    return completions[habitId]?.[dateKey] || false;
  }, [completions]);

  // Get completion rate for a habit
  const getCompletionRate = useCallback((habitId, days = 30) => {
    const habitCompletions = completions[habitId] || {};
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    let expectedDays = 0;
    let completedDays = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Check if this day matches the frequency
      const shouldComplete = isScheduledDay(habit.frequency, habit.customDays, dayOfWeek);

      if (shouldComplete) {
        expectedDays++;
        if (habitCompletions[dateKey]) {
          completedDays++;
        }
      }
    }

    return expectedDays > 0 ? Math.round((completedDays / expectedDays) * 100) : 0;
  }, [completions, habits]);

  // Get today's habits
  const todaysHabits = useMemo(() => {
    const today = new Date().getDay();
    return habits.filter(habit =>
      isScheduledDay(habit.frequency, habit.customDays, today)
    );
  }, [habits]);

  return {
    habits,
    completions,
    isLoaded,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    getCompletionRate,
    todaysHabits,
  };
}

// Helper to check if a day matches the frequency
function isScheduledDay(frequency, customDays, dayOfWeek) {
  if (frequency === 'daily') return true;
  if (frequency === 'weekdays') return [1, 2, 3, 4, 5].includes(dayOfWeek);
  if (frequency === 'weekends') return [0, 6].includes(dayOfWeek);
  if (frequency === 'custom' && customDays) return customDays.includes(dayOfWeek);
  return true;
}

// Calculate current streak
function calculateStreak(completions, frequency) {
  if (!completions) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Skip days not in frequency
    if (frequency === 'weekdays' && ![1, 2, 3, 4, 5].includes(dayOfWeek)) continue;
    if (frequency === 'weekends' && ![0, 6].includes(dayOfWeek)) continue;

    if (completions[dateKey]) {
      streak++;
    } else if (i > 0) {
      // Allow missing today, but not earlier days
      break;
    }
  }

  return streak;
}

// Habits List Modal
export function HabitsModal({ isOpen, onClose, habitTracking }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  if (!isOpen) return null;

  const { habits, todaysHabits, toggleCompletion, isCompleted, getCompletionRate, deleteHabit } = habitTracking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔄</span> Habits
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm"
            >
              + Add
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
          </div>
        </div>

        {/* Today's Habits */}
        {todaysHabits.length > 0 && (
          <div className="mb-6">
            <p className="text-white/60 text-sm mb-3">Today</p>
            <div className="space-y-2">
              {todaysHabits.map(habit => {
                const completed = isCompleted(habit.id);
                return (
                  <div
                    key={habit.id}
                    className={`p-4 rounded-xl transition-all ${
                      completed
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'glass-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCompletion(habit.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          completed
                            ? 'bg-green-500 text-white'
                            : 'border-2 border-white/30'
                        }`}
                      >
                        {completed && '✓'}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.emoji}</span>
                          <p className={`font-medium ${completed ? 'text-green-300' : 'text-white'}`}>
                            {habit.name}
                          </p>
                        </div>
                        <p className="text-white/40 text-xs">
                          🔥 {habit.streak} day streak
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Habits */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-white/60 text-sm mb-3">All Habits ({habits.length})</p>
          {habits.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">🔄</span>
              <p className="text-white/60 mt-2">No habits yet</p>
              <p className="text-white/40 text-sm">Add a habit to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {habits.map(habit => {
                const rate = getCompletionRate(habit.id);
                return (
                  <div key={habit.id} className="glass-card p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{habit.emoji}</span>
                        <div>
                          <p className="text-white font-medium">{habit.name}</p>
                          <p className="text-white/40 text-xs capitalize">
                            {FREQUENCIES[habit.frequency]?.label || habit.frequency}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingHabit(habit)}
                          className="text-white/40 hover:text-white"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this habit?')) {
                              deleteHabit(habit.id);
                            }
                          }}
                          className="text-white/40 hover:text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-white/40">Streak: </span>
                        <span className="text-white">🔥 {habit.streak}</span>
                      </div>
                      <div>
                        <span className="text-white/40">Best: </span>
                        <span className="text-white">{habit.longestStreak}</span>
                      </div>
                      <div>
                        <span className="text-white/40">Rate: </span>
                        <span className={rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                          {rate}%
                        </span>
                      </div>
                    </div>

                    {/* Mini Calendar (last 7 days) */}
                    <div className="flex gap-1 mt-3">
                      {Array(7).fill(0).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const completed = isCompleted(habit.id, date);
                        const isToday = i === 6;

                        return (
                          <div
                            key={i}
                            className={`flex-1 h-6 rounded ${
                              completed
                                ? 'bg-green-500'
                                : isToday
                                ? 'bg-white/20 border border-white/40'
                                : 'bg-white/10'
                            }`}
                            title={date.toLocaleDateString()}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Habit Modal */}
        {(showAddModal || editingHabit) && (
          <AddHabitModal
            isOpen={true}
            onClose={() => {
              setShowAddModal(false);
              setEditingHabit(null);
            }}
            onSave={(habit) => {
              if (editingHabit) {
                habitTracking.updateHabit(editingHabit.id, habit);
              } else {
                habitTracking.addHabit(habit);
              }
              setShowAddModal(false);
              setEditingHabit(null);
            }}
            existingHabit={editingHabit}
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Habit Modal
export function AddHabitModal({ isOpen, onClose, onSave, existingHabit = null }) {
  const [name, setName] = useState(existingHabit?.name || '');
  const [emoji, setEmoji] = useState(existingHabit?.emoji || '✅');
  const [frequency, setFrequency] = useState(existingHabit?.frequency || 'daily');
  const [customDays, setCustomDays] = useState(existingHabit?.customDays || []);
  const [reminderTime, setReminderTime] = useState(existingHabit?.reminderTime || '');

  const EMOJIS = ['✅', '🏃', '💧', '📚', '🧘', '💪', '🎯', '💊', '🌅', '🌙', '🥗', '🧠', '✍️', '🎹', '🌱'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      emoji,
      frequency,
      customDays: frequency === 'custom' ? customDays : null,
      reminderTime: reminderTime || null,
    });
  };

  const toggleDay = (dayIndex) => {
    if (customDays.includes(dayIndex)) {
      setCustomDays(customDays.filter(d => d !== dayIndex));
    } else {
      setCustomDays([...customDays, dayIndex].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {existingHabit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Name & Emoji */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-white/60 text-sm mb-2 block">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Drink 8 glasses of water"
              className="w-full glass-input px-4 py-3 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Icon</label>
            <select
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="glass-input px-3 py-3 rounded-xl text-white bg-transparent text-xl"
            >
              {EMOJIS.map(e => (
                <option key={e} value={e} className="bg-gray-900">{e}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="text-white/60 text-sm mb-2 block">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FREQUENCIES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFrequency(key)}
                className={`py-2 px-3 rounded-xl text-sm transition-all ${
                  frequency === key
                    ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                    : 'glass-button text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Days */}
        {frequency === 'custom' && (
          <div className="mb-4">
            <label className="text-white/60 text-sm mb-2 block">Select Days</label>
            <div className="flex gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    customDays.includes(idx)
                      ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                      : 'glass-button text-white/60'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reminder Time */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Reminder Time (optional)</label>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="w-full glass-input px-4 py-3 rounded-xl text-white"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl font-semibold bg-green-500/30 border border-green-500/50 text-white disabled:opacity-50"
        >
          {existingHabit ? 'Update Habit' : 'Add Habit'}
        </button>
      </div>
    </div>
  );
}

// Today's Habits Card (for dashboard)
export function TodaysHabitsCard({ habitTracking, onClick }) {
  const { todaysHabits, isCompleted, toggleCompletion } = habitTracking;

  if (todaysHabits.length === 0) return null;

  const completedCount = todaysHabits.filter(h => isCompleted(h.id)).length;

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">🔄 Today's Habits</span>
        <button onClick={onClick} className="text-white/40 text-sm hover:text-white">
          View All →
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / todaysHabits.length) * 100}%` }}
          />
        </div>
        <span className="text-white/60 text-sm">{completedCount}/{todaysHabits.length}</span>
      </div>

      <div className="flex gap-2">
        {todaysHabits.slice(0, 5).map(habit => {
          const completed = isCompleted(habit.id);
          return (
            <button
              key={habit.id}
              onClick={() => toggleCompletion(habit.id)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                completed
                  ? 'bg-green-500/30 border border-green-500/50'
                  : 'glass-button'
              }`}
              title={habit.name}
            >
              <span className={completed ? '' : 'grayscale opacity-50'}>{habit.emoji}</span>
            </button>
          );
        })}
        {todaysHabits.length > 5 && (
          <div className="w-10 h-10 rounded-full glass-button flex items-center justify-center text-white/40 text-sm">
            +{todaysHabits.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

export default HabitsModal;
