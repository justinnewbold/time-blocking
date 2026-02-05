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

// Time slot configuration
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_SLOT_DURATION = 30; // minutes

// Format hour for display
const formatHour = (hour) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${ampm}`;
};

// Format time slot
const formatTimeSlot = (hour, half = 0) => {
  const h = String(hour).padStart(2, '0');
  const m = half === 0 ? '00' : '30';
  return `${h}:${m}`;
};

// Parse time slot string to { hour, half }
const parseTimeSlot = (slotStr) => {
  const [h, m] = slotStr.split(':').map(Number);
  return { hour: h, half: m >= 30 ? 1 : 0 };
};

// Hook to manage task time slots
export function useTaskTimeSlots(tasks) {
  const [timeSlots, setTimeSlots] = useState(() =>
    Storage.get('taskTimeSlots', {})
  );
  const [daySchedules, setDaySchedules] = useState(() =>
    Storage.get('daySchedules', {})
  );
  const [workingHours, setWorkingHours] = useState(() =>
    Storage.get('workingHours', { start: 9, end: 17 })
  );

  // Save to storage
  useEffect(() => {
    Storage.set('taskTimeSlots', timeSlots);
  }, [timeSlots]);

  useEffect(() => {
    Storage.set('daySchedules', daySchedules);
  }, [daySchedules]);

  useEffect(() => {
    Storage.set('workingHours', workingHours);
  }, [workingHours]);

  // Get date key (YYYY-MM-DD)
  const getDateKey = useCallback((date = new Date()) => {
    return date.toISOString().split('T')[0];
  }, []);

  // Assign task to time slot
  const assignTaskToSlot = useCallback((taskId, date, startSlot, endSlot = null) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);
    const slotKey = `${dateKey}_${taskId}`;

    setTimeSlots(prev => ({
      ...prev,
      [slotKey]: {
        taskId,
        date: dateKey,
        startSlot,
        endSlot: endSlot || startSlot,
        createdAt: new Date().toISOString()
      }
    }));
  }, [getDateKey]);

  // Remove task from time slot
  const removeTaskFromSlot = useCallback((taskId, date) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);
    const slotKey = `${dateKey}_${taskId}`;

    setTimeSlots(prev => {
      const newSlots = { ...prev };
      delete newSlots[slotKey];
      return newSlots;
    });
  }, [getDateKey]);

  // Get tasks for a specific day
  const getTasksForDay = useCallback((date) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);

    const dayTasks = Object.values(timeSlots)
      .filter(slot => slot.date === dateKey)
      .map(slot => {
        const task = tasks.find(t => t.id === slot.taskId);
        return task ? { ...task, slot } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.slot.startSlot.localeCompare(b.slot.startSlot));

    return dayTasks;
  }, [timeSlots, tasks, getDateKey]);

  // Get schedule for a specific day with time blocks
  const getDaySchedule = useCallback((date) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);
    const dayTasks = getTasksForDay(dateKey);

    // Create 30-minute slots from working hours
    const slots = [];
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      for (let half = 0; half < 2; half++) {
        const slotTime = formatTimeSlot(hour, half);
        const assignedTask = dayTasks.find(t =>
          t.slot.startSlot <= slotTime && t.slot.endSlot >= slotTime
        );

        slots.push({
          time: slotTime,
          hour,
          half,
          task: assignedTask || null,
          isStart: assignedTask?.slot.startSlot === slotTime,
          isEnd: assignedTask?.slot.endSlot === slotTime
        });
      }
    }

    return slots;
  }, [getTasksForDay, workingHours, getDateKey]);

  // Check for conflicts
  const checkConflict = useCallback((date, startSlot, endSlot, excludeTaskId = null) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);

    return Object.values(timeSlots).some(slot => {
      if (slot.date !== dateKey) return false;
      if (excludeTaskId && slot.taskId === excludeTaskId) return false;

      // Check for overlap
      return !(endSlot < slot.startSlot || startSlot > slot.endSlot);
    });
  }, [timeSlots, getDateKey]);

  // Get unscheduled tasks
  const getUnscheduledTasks = useCallback((date) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);
    const scheduledIds = new Set(
      Object.values(timeSlots)
        .filter(s => s.date === dateKey)
        .map(s => s.taskId)
    );

    return tasks.filter(t => !t.completed && !scheduledIds.has(t.id));
  }, [tasks, timeSlots, getDateKey]);

  // Auto-schedule tasks based on estimates and energy
  const autoScheduleTasks = useCallback((date, tasksToSchedule, energy = 3) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);
    const currentSchedule = [...Object.values(timeSlots).filter(s => s.date === dateKey)];

    // Sort tasks: frogs first if high energy, then by difficulty
    const sorted = [...tasksToSchedule].sort((a, b) => {
      if (energy >= 3) {
        if (a.frog && !b.frog) return -1;
        if (!a.frog && b.frog) return 1;
      }
      return (b.difficulty || 2) - (a.difficulty || 2);
    });

    // Find available slots
    const getNextAvailableSlot = (startHour) => {
      for (let hour = startHour; hour < workingHours.end; hour++) {
        for (let half = 0; half < 2; half++) {
          const slotTime = formatTimeSlot(hour, half);
          const isOccupied = currentSchedule.some(s =>
            s.startSlot <= slotTime && s.endSlot >= slotTime
          );
          if (!isOccupied) return { hour, half, time: slotTime };
        }
      }
      return null;
    };

    // Assign tasks
    let currentHour = workingHours.start;
    const assignments = [];

    for (const task of sorted) {
      const startSlot = getNextAvailableSlot(currentHour);
      if (!startSlot) break;

      const durationSlots = Math.ceil((task.estimatedMinutes || 25) / TIME_SLOT_DURATION);
      const endHour = startSlot.hour + Math.floor((startSlot.half + durationSlots - 1) / 2);
      const endHalf = (startSlot.half + durationSlots - 1) % 2;
      const endSlotTime = formatTimeSlot(endHour, endHalf);

      assignments.push({
        taskId: task.id,
        date: dateKey,
        startSlot: startSlot.time,
        endSlot: endSlotTime
      });

      // Mark slots as occupied
      currentSchedule.push({
        startSlot: startSlot.time,
        endSlot: endSlotTime
      });

      currentHour = endHour;
    }

    // Apply assignments
    assignments.forEach(a => {
      assignTaskToSlot(a.taskId, a.date, a.startSlot, a.endSlot);
    });

    return assignments;
  }, [timeSlots, workingHours, getDateKey, assignTaskToSlot]);

  // Get total scheduled minutes for a day
  const getScheduledMinutes = useCallback((date) => {
    const dateKey = typeof date === 'string' ? date : getDateKey(date);

    return Object.values(timeSlots)
      .filter(s => s.date === dateKey)
      .reduce((total, slot) => {
        const start = parseTimeSlot(slot.startSlot);
        const end = parseTimeSlot(slot.endSlot);
        const startMinutes = start.hour * 60 + start.half * 30;
        const endMinutes = end.hour * 60 + end.half * 30 + 30;
        return total + (endMinutes - startMinutes);
      }, 0);
  }, [timeSlots, getDateKey]);

  return {
    // State
    timeSlots,
    workingHours,

    // Actions
    assignTaskToSlot,
    removeTaskFromSlot,
    getTasksForDay,
    getDaySchedule,
    checkConflict,
    getUnscheduledTasks,
    autoScheduleTasks,
    getScheduledMinutes,
    setWorkingHours,
    getDateKey
  };
}

// Time Slot Picker Component
export function TimeSlotPicker({
  task,
  date,
  onAssign,
  onCancel,
  workingHours,
  existingSlots
}) {
  const [startSlot, setStartSlot] = useState(formatTimeSlot(workingHours.start, 0));
  const [duration, setDuration] = useState(task.estimatedMinutes || 25);

  const getEndSlot = () => {
    const start = parseTimeSlot(startSlot);
    const durationSlots = Math.ceil(duration / TIME_SLOT_DURATION);
    const totalHalves = start.half + durationSlots;
    const endHour = start.hour + Math.floor(totalHalves / 2);
    const endHalf = (totalHalves - 1) % 2;
    return formatTimeSlot(endHour, endHalf);
  };

  const hasConflict = () => {
    const end = getEndSlot();
    return existingSlots.some(slot =>
      slot.taskId !== task.id &&
      !(end < slot.startSlot || startSlot > slot.endSlot)
    );
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="font-semibold">⏰ Schedule "{task.title}"</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-white/60">Start Time</label>
          <select
            value={startSlot}
            onChange={(e) => setStartSlot(e.target.value)}
            className="glass-input w-full mt-1"
          >
            {HOURS.filter(h => h >= workingHours.start && h < workingHours.end).map(hour => (
              <>
                <option key={`${hour}:00`} value={formatTimeSlot(hour, 0)}>
                  {formatHour(hour)}:00
                </option>
                <option key={`${hour}:30`} value={formatTimeSlot(hour, 1)}>
                  {formatHour(hour)}:30
                </option>
              </>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="glass-input w-full mt-1"
          >
            <option value={15}>15 min</option>
            <option value={25}>25 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
      </div>

      <div className="text-sm">
        <span className="text-white/60">Scheduled: </span>
        <span>{startSlot} - {getEndSlot()}</span>
      </div>

      {hasConflict() && (
        <div className="text-sm text-red-400">
          ⚠️ This overlaps with another scheduled task
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="glass-button flex-1 py-2">
          Cancel
        </button>
        <button
          onClick={() => onAssign(task.id, date, startSlot, getEndSlot())}
          disabled={hasConflict()}
          className="glass-button flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}

// Day Schedule View Component
export function DayScheduleView({
  date,
  schedule,
  unscheduledTasks,
  onAssignTask,
  onRemoveTask,
  onSelectTask,
  workingHours
}) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const totalScheduled = schedule.filter(s => s.task).length * 30;
  const totalWorkMinutes = (workingHours.end - workingHours.start) * 60;
  const utilizationPercent = Math.round((totalScheduled / totalWorkMinutes) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            })}
          </h3>
          <p className="text-sm text-white/60">
            {Math.round(totalScheduled / 60)}h scheduled ({utilizationPercent}% utilized)
          </p>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="glass-card overflow-hidden">
        {schedule.map((slot, index) => (
          <div
            key={slot.time}
            className={`flex items-stretch border-b border-white/5 last:border-b-0 ${
              slot.half === 0 ? 'border-t border-white/10' : ''
            }`}
          >
            {/* Time label */}
            <div className="w-16 py-2 px-2 text-xs text-white/40 flex-shrink-0">
              {slot.half === 0 && formatHour(slot.hour)}
            </div>

            {/* Slot content */}
            <div
              className={`flex-1 min-h-[40px] p-2 transition-colors ${
                slot.task
                  ? slot.isStart
                    ? 'bg-blue-500/20 rounded-t-lg'
                    : slot.isEnd
                      ? 'bg-blue-500/20 rounded-b-lg'
                      : 'bg-blue-500/20'
                  : 'hover:bg-white/5 cursor-pointer'
              }`}
              onClick={() => !slot.task && setSelectedSlot(slot)}
            >
              {slot.task && slot.isStart && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{slot.task.frog ? '🐸' : '○'}</span>
                    <span className="text-sm font-medium">{slot.task.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTask(slot.task.id, date);
                    }}
                    className="text-white/40 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              )}
              {!slot.task && (
                <div className="text-xs text-white/20 text-center">
                  + Add task
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-medium text-white/60 mb-3">
            Unscheduled Tasks ({unscheduledTasks.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {unscheduledTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <span>{task.frog ? '🐸' : '○'}</span>
                  <span className="text-sm">{task.title}</span>
                  <span className="text-xs text-white/40">
                    {task.estimatedMinutes || 25}m
                  </span>
                </div>
                <button
                  onClick={() => onAssignTask(task)}
                  className="text-xs px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30"
                >
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Week View Component
export function WeekScheduleView({
  startDate,
  tasks,
  timeSlots,
  onDaySelect,
  getTasksForDay,
  getScheduledMinutes
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card p-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map(date => {
          const dateKey = date.toISOString().split('T')[0];
          const dayTasks = getTasksForDay(dateKey);
          const scheduledMins = getScheduledMinutes(dateKey);
          const isToday = dateKey === today;

          return (
            <button
              key={dateKey}
              onClick={() => onDaySelect(date)}
              className={`p-3 rounded-lg text-center transition-all hover:scale-105 ${
                isToday ? 'ring-2 ring-blue-500/50 bg-blue-500/10' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-xs text-white/60">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-blue-400' : ''}`}>
                {date.getDate()}
              </div>
              {dayTasks.length > 0 && (
                <div className="mt-1">
                  <div className="text-xs text-green-400">{dayTasks.length} tasks</div>
                  <div className="text-xs text-white/40">{Math.round(scheduledMins / 60)}h</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Time Blocking Modal
export function TimeBlockingModal({
  isOpen,
  onClose,
  tasks,
  timeSlots,
  workingHours,
  onAssignTask,
  onRemoveTask,
  onAutoSchedule,
  getTasksForDay,
  getDaySchedule,
  getUnscheduledTasks,
  getScheduledMinutes,
  setWorkingHours
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [taskToPicker, setTaskToPicker] = useState(null);

  if (!isOpen) return null;

  const dateKey = selectedDate.toISOString().split('T')[0];
  const schedule = getDaySchedule(selectedDate);
  const unscheduledTasks = getUnscheduledTasks(selectedDate);

  const handleAssignFromPicker = (taskId, date, start, end) => {
    onAssignTask(taskId, date, start, end);
    setTaskToPicker(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📅 Time Blocking</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="glass-button px-3 py-1 text-sm"
            >
              ⚙️
            </button>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="text-sm font-medium mb-3">Working Hours</h3>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-white/60">Start</label>
                <select
                  value={workingHours.start}
                  onChange={(e) => setWorkingHours(prev => ({ ...prev, start: Number(e.target.value) }))}
                  className="glass-input ml-2"
                >
                  {HOURS.slice(5, 12).map(h => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60">End</label>
                <select
                  value={workingHours.end}
                  onChange={(e) => setWorkingHours(prev => ({ ...prev, end: Number(e.target.value) }))}
                  className="glass-input ml-2"
                >
                  {HOURS.slice(14, 24).map(h => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Week view */}
        <div className="p-4 border-b border-white/10">
          <WeekScheduleView
            startDate={(() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - d.getDay());
              return d;
            })()}
            tasks={tasks}
            timeSlots={timeSlots}
            onDaySelect={setSelectedDate}
            getTasksForDay={getTasksForDay}
            getScheduledMinutes={getScheduledMinutes}
          />
        </div>

        {/* Day schedule */}
        <div className="flex-1 overflow-y-auto p-4">
          {taskToPicker ? (
            <TimeSlotPicker
              task={taskToPicker}
              date={dateKey}
              onAssign={handleAssignFromPicker}
              onCancel={() => setTaskToPicker(null)}
              workingHours={workingHours}
              existingSlots={Object.values(timeSlots).filter(s => s.date === dateKey)}
            />
          ) : (
            <DayScheduleView
              date={dateKey}
              schedule={schedule}
              unscheduledTasks={unscheduledTasks}
              onAssignTask={setTaskToPicker}
              onRemoveTask={onRemoveTask}
              onSelectTask={() => {}}
              workingHours={workingHours}
            />
          )}
        </div>

        {/* Auto-schedule button */}
        {!taskToPicker && unscheduledTasks.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => onAutoSchedule(selectedDate, unscheduledTasks)}
              className="glass-button w-full py-2 bg-purple-500/20 hover:bg-purple-500/30"
            >
              🪄 Auto-Schedule {unscheduledTasks.length} Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeBlockingModal;
