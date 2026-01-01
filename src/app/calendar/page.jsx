'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageBackground } from '@/components/BackgroundContext';
import { getCategories, DEFAULT_CATEGORIES } from '@/components/CategoryManager';

// Storage helper
const Storage = {
  get: (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`frog_${key}`) || localStorage.getItem(`focusflow_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  }
};

// Categories are now loaded dynamically via useCategories hook

// Recurrence types
const RECURRENCE_LABELS = {
  none: 'One-time',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly'
};

// Get days in month
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Format time
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

// Day Cell Component
function DayCell({ date, tasks, categories, isToday, isCurrentMonth, onClick }) {
  const dayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const taskDate = new Date(t.dueDate);
    return taskDate.toDateString() === date.toDateString();
  });

  const completedToday = Storage.get('completedTasks', []).filter(t => {
    const completedDate = new Date(t.completedAt);
    return completedDate.toDateString() === date.toDateString();
  });

  const totalTasks = dayTasks.length + completedToday.length;
  
  return (
    <button
      onClick={() => onClick(date)}
      className={`
        aspect-square p-1 rounded-lg text-left transition-all relative
        ${isCurrentMonth ? 'bg-white/5 hover:bg-white/10' : 'bg-white/[0.02] opacity-50'}
        ${isToday ? 'ring-2 ring-green-500 bg-green-500/10' : ''}
      `}
    >
      <span className={`text-xs font-medium ${isToday ? 'text-green-400' : 'text-white/60'}`}>
        {date.getDate()}
      </span>
      
      {/* Task indicators */}
      {totalTasks > 0 && (
        <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 flex-wrap">
          {dayTasks.slice(0, 3).map((task, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: categories[task.category]?.color || '#888' }}
            />
          ))}
          {completedToday.slice(0, 3 - dayTasks.length).map((_, i) => (
            <div key={`c-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-50" />
          ))}
          {totalTasks > 3 && (
            <span className="text-[8px] text-white/40">+{totalTasks - 3}</span>
          )}
        </div>
      )}
      
      {/* Recurring indicator */}
      {dayTasks.some(t => t.recurrence && t.recurrence !== 'none') && (
        <span className="absolute top-1 right-1 text-[8px]">🔄</span>
      )}
    </button>
  );
}

// Week View Component
function WeekView({ tasks, categories, selectedDate, onDateSelect }) {
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  
  const today = new Date();
  
  // Time slots (6 AM to 10 PM)
  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    timeSlots.push(hour);
  }
  
  return (
    <div className="glass-card overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-white/10">
        <div className="p-2 text-center text-white/40 text-xs">Time</div>
        {days.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const isSelected = day.toDateString() === selectedDate.toDateString();
          return (
            <button
              key={i}
              onClick={() => onDateSelect(day)}
              className={`p-2 text-center transition-all ${
                isToday ? 'bg-green-500/20' : ''
              } ${isSelected ? 'ring-1 ring-green-500' : ''}`}
            >
              <p className="text-[10px] text-white/40">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-sm font-medium ${isToday ? 'text-green-400' : 'text-white'}`}>
                {day.getDate()}
              </p>
            </button>
          );
        })}
      </div>
      
      {/* Time grid */}
      <div className="max-h-[400px] overflow-y-auto">
        {timeSlots.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-white/5 min-h-[40px]">
            <div className="p-1 text-right text-white/30 text-[10px] pr-2">
              {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
            </div>
            {days.map((day, dayIdx) => {
              const dayTasks = tasks.filter(t => {
                if (!t.dueDate) return false;
                const taskDate = new Date(t.dueDate);
                return taskDate.toDateString() === day.toDateString();
              });
              
              // Simple distribution of tasks across time slots
              const tasksAtHour = dayTasks.filter((_, idx) => {
                const taskHour = 8 + (idx * 2); // Spread tasks starting at 8am
                return taskHour === hour;
              });
              
              return (
                <div key={dayIdx} className="border-l border-white/5 p-0.5 relative">
                  {tasksAtHour.map((task, i) => (
                    <div
                      key={i}
                      className="text-[10px] p-1 rounded mb-0.5 truncate"
                      style={{ 
                        backgroundColor: `${categories[task.category]?.color}30`,
                        borderLeft: `2px solid ${categories[task.category]?.color}`
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day Detail Modal
function DayDetailModal({ date, tasks, categories, completedTasks, onClose }) {
  const dayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const taskDate = new Date(t.dueDate);
    return taskDate.toDateString() === date.toDateString();
  });

  const completedOnDay = completedTasks.filter(t => {
    const completedDate = new Date(t.completedAt);
    return completedDate.toDateString() === date.toDateString();
  });

  const isToday = date.toDateString() === new Date().toDateString();
  const isPast = date < new Date() && !isToday;
  const isFuture = date > new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up max-h-[80vh] overflow-hidden">
        <div className="glass-card p-6 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {date.toLocaleDateString('en-US', { weekday: 'long' })}
              </h2>
              <p className="text-white/60 text-sm">
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60">
              ✕
            </button>
          </div>

          {isToday && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
              <span>📍</span>
              <span className="text-green-400 font-medium">Today</span>
            </div>
          )}

          {/* Scheduled Tasks */}
          {dayTasks.length > 0 ? (
            <div className="mb-4">
              <h3 className="text-white/60 text-sm uppercase tracking-wider mb-2">
                {isPast ? 'Was Scheduled' : 'Scheduled'}
              </h3>
              <div className="space-y-2">
                {dayTasks.map((task, i) => (
                  <div 
                    key={i}
                    className="glass-card-inner p-3 flex items-center gap-3"
                    style={{ borderLeft: `3px solid ${categories[task.category]?.color}` }}
                  >
                    <span className="text-lg">{categories[task.category]?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>⏱️ {task.estimatedMinutes || 25}m</span>
                        <span>{'⭐'.repeat(task.difficulty || 2)}</span>
                        {task.recurrence && task.recurrence !== 'none' && (
                          <span className="text-blue-400">🔄 {RECURRENCE_LABELS[task.recurrence]}</span>
                        )}
                      </div>
                    </div>
                    {task.frog && <span className="text-xl">🐸</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <span className="text-3xl block mb-2">📭</span>
              <p>No tasks scheduled</p>
              {isFuture && (
                <Link href="/" className="text-green-400 text-sm mt-2 block">
                  + Add a task for this day
                </Link>
              )}
            </div>
          )}

          {/* Completed Tasks */}
          {completedOnDay.length > 0 && (
            <div>
              <h3 className="text-white/60 text-sm uppercase tracking-wider mb-2">Completed</h3>
              <div className="space-y-2">
                {completedOnDay.map((task, i) => (
                  <div 
                    key={i}
                    className="glass-card-inner p-3 flex items-center gap-3 opacity-60"
                  >
                    <span className="text-lg">✅</span>
                    <div className="flex-1">
                      <p className="text-white line-through">{task.title}</p>
                      <p className="text-xs text-green-400">+{task.earnedXP || 20} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {(dayTasks.length > 0 || completedOnDay.length > 0) && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
              <div className="glass-card-inner p-3">
                <p className="text-2xl font-bold text-white">{dayTasks.length}</p>
                <p className="text-white/40 text-xs">Scheduled</p>
              </div>
              <div className="glass-card-inner p-3">
                <p className="text-2xl font-bold text-green-400">{completedOnDay.length}</p>
                <p className="text-white/40 text-xs">Completed</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [CATEGORIES, setCategories] = useState(DEFAULT_CATEGORIES);
  const [viewMode, setViewMode] = useState('month'); // month | week
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);

  // Load categories
  useEffect(() => {
    setCategories(getCategories());
  }, []);

  // Load tasks
  useEffect(() => {
    const loadedTasks = Storage.get('tasks', []);
    const loadedCompleted = Storage.get('completedTasks', []);
    setTasks(loadedTasks);
    setCompletedTasks(loadedCompleted);
  }, []);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [year, month, daysInMonth, firstDay]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate stats for current month
  const monthStats = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const scheduledThisMonth = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= monthStart && d <= monthEnd;
    }).length;
    
    const completedThisMonth = completedTasks.filter(t => {
      const d = new Date(t.completedAt);
      return d >= monthStart && d <= monthEnd;
    }).length;
    
    const recurringCount = tasks.filter(t => t.recurrence && t.recurrence !== 'none').length;
    
    return { scheduledThisMonth, completedThisMonth, recurringCount };
  }, [tasks, completedTasks, year, month]);

  return (
    <PageBackground page="home">
      <div className="min-h-screen pb-24 safe-area-top">
        {/* Header */}
        <div className="sticky top-0 z-40 glass-dark safe-area-top">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="glass-icon w-10 h-10 flex items-center justify-center">
                ←
              </Link>
              <h1 className="text-lg font-bold text-white">📅 Calendar</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                  className="glass-icon w-10 h-10 flex items-center justify-center text-sm"
                >
                  {viewMode === 'month' ? '📆' : '📅'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Month Navigation */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPrevMonth} className="glass-icon w-10 h-10 flex items-center justify-center">
                ←
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={goToToday} className="text-green-400 text-sm">
                  Today
                </button>
              </div>
              <button onClick={goToNextMonth} className="glass-icon w-10 h-10 flex items-center justify-center">
                →
              </button>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{monthStats.scheduledThisMonth}</p>
                <p className="text-white/40 text-xs">Scheduled</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-green-400 font-bold">{monthStats.completedThisMonth}</p>
                <p className="text-white/40 text-xs">Completed</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-blue-400 font-bold">{monthStats.recurringCount}</p>
                <p className="text-white/40 text-xs">Recurring</p>
              </div>
            </div>

            {viewMode === 'month' ? (
              <>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-white/40 text-xs py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => (
                    <DayCell
                      key={i}
                      date={day.date}
                      tasks={tasks}
                      categories={CATEGORIES}
                      isToday={day.date.toDateString() === today.toDateString()}
                      isCurrentMonth={day.isCurrentMonth}
                      onClick={setSelectedDate}
                    />
                  ))}
                </div>
              </>
            ) : (
              <WeekView 
                tasks={tasks}
                categories={CATEGORIES}
                selectedDate={currentDate}
                onDateSelect={setSelectedDate}
              />
            )}
          </div>

          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="text-white/60 text-sm mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-white/60">{cat.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 opacity-50" />
                <span className="text-white/60">Completed</span>
              </div>
            </div>
          </div>

          {/* Upcoming Recurring Tasks */}
          {tasks.filter(t => t.recurrence && t.recurrence !== 'none').length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span>🔄</span> Recurring Tasks
              </h3>
              <div className="space-y-2">
                {tasks.filter(t => t.recurrence && t.recurrence !== 'none').map((task, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                  >
                    <span>{CATEGORIES[task.category]?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <p className="text-blue-400 text-xs">{RECURRENCE_LABELS[task.recurrence]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Day Detail Modal */}
        {selectedDate && (
          <DayDetailModal
            date={selectedDate}
            tasks={tasks}
            categories={CATEGORIES}
            completedTasks={completedTasks}
            onClose={() => setSelectedDate(null)}
          />
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom">
          <div className="flex justify-around py-3">
            <Link href="/" className="flex flex-col items-center gap-1 text-white/40">
              <span className="text-xl">🐸</span>
              <span className="text-[10px]">Tasks</span>
            </Link>
            <div className="flex flex-col items-center gap-1 text-green-400">
              <span className="text-xl">📅</span>
              <span className="text-[10px]">Calendar</span>
            </div>
            <Link href="/stats" className="flex flex-col items-center gap-1 text-white/40">
              <span className="text-xl">📊</span>
              <span className="text-[10px]">Stats</span>
            </Link>
            <Link href="/achievements" className="flex flex-col items-center gap-1 text-white/40">
              <span className="text-xl">🏆</span>
              <span className="text-[10px]">Awards</span>
            </Link>
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
