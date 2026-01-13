'use client';

import { useState } from 'react';

// Task clone utility
export function cloneTask(task, options = {}) {
  const {
    includeSubtasks = true,
    resetDueDate = false,
    addCopyPrefix = true,
  } = options;

  const clonedTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: addCopyPrefix ? `${task.title} (copy)` : task.title,
    completed: false,
    frog: false, // Don't copy frog status
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Reset due date if requested
  if (resetDueDate) {
    delete clonedTask.dueDate;
    delete clonedTask.dueReminder;
  }

  // Remove completion-related fields
  delete clonedTask.completed_at;
  delete clonedTask.completedAt;

  return clonedTask;
}

// Clone subtasks
export function cloneSubtasks(subtasks, newTaskId) {
  if (!subtasks || !Array.isArray(subtasks)) return [];

  return subtasks.map(subtask => ({
    ...subtask,
    id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taskId: newTaskId,
    completed: false,
  }));
}

// Clone Task Modal
export function CloneTaskModal({ isOpen, onClose, task, subtasks = [], onClone }) {
  const [includeSubtasks, setIncludeSubtasks] = useState(true);
  const [resetDueDate, setResetDueDate] = useState(false);
  const [addCopyPrefix, setAddCopyPrefix] = useState(true);
  const [customTitle, setCustomTitle] = useState('');

  if (!isOpen || !task) return null;

  const handleClone = () => {
    const clonedTask = cloneTask(task, {
      includeSubtasks,
      resetDueDate,
      addCopyPrefix: addCopyPrefix && !customTitle,
    });

    // Apply custom title if provided
    if (customTitle.trim()) {
      clonedTask.title = customTitle.trim();
    }

    // Clone subtasks if requested
    let clonedSubtasks = [];
    if (includeSubtasks && subtasks.length > 0) {
      clonedSubtasks = cloneSubtasks(subtasks, clonedTask.id);
    }

    onClone(clonedTask, clonedSubtasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📋</span> Clone Task
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Original Task Preview */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <p className="text-white/40 text-xs uppercase mb-1">Original Task</p>
          <p className="text-white font-medium">{task.title}</p>
          {subtasks.length > 0 && (
            <p className="text-white/60 text-sm mt-1">{subtasks.length} subtask(s)</p>
          )}
        </div>

        {/* Custom Title */}
        <div className="mb-4">
          <label className="text-white/60 text-sm mb-2 block">New Title (optional)</label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={addCopyPrefix ? `${task.title} (copy)` : task.title}
            className="w-full glass-input px-4 py-3 rounded-xl text-white"
          />
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={addCopyPrefix}
              onChange={(e) => setAddCopyPrefix(e.target.checked)}
              disabled={customTitle.trim().length > 0}
              className="w-5 h-5 rounded accent-blue-500"
            />
            <span className="text-white">Add "(copy)" to title</span>
          </label>

          {subtasks.length > 0 && (
            <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={includeSubtasks}
                onChange={(e) => setIncludeSubtasks(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500"
              />
              <span className="text-white">Include subtasks</span>
              <span className="text-white/40 text-sm ml-auto">{subtasks.length}</span>
            </label>
          )}

          {task.dueDate && (
            <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={resetDueDate}
                onChange={(e) => setResetDueDate(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500"
              />
              <span className="text-white">Clear due date</span>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 glass-button rounded-xl text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            className="flex-1 py-3 rounded-xl font-semibold bg-blue-500/30 border border-blue-500/50 text-white"
          >
            📋 Clone Task
          </button>
        </div>
      </div>
    </div>
  );
}

// Quick clone button for task cards
export function QuickCloneButton({ task, subtasks = [], onClone, className = '' }) {
  const handleQuickClone = (e) => {
    e.stopPropagation();

    const clonedTask = cloneTask(task, {
      includeSubtasks: true,
      resetDueDate: false,
      addCopyPrefix: true,
    });

    const clonedSubtasks = subtasks.length > 0
      ? cloneSubtasks(subtasks, clonedTask.id)
      : [];

    onClone(clonedTask, clonedSubtasks);
  };

  return (
    <button
      onClick={handleQuickClone}
      className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
      title="Clone task"
    >
      <span className="text-white/60 hover:text-white">📋</span>
    </button>
  );
}

export default CloneTaskModal;
