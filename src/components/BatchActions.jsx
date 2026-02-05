'use client';
import { useState, useCallback } from 'react';

// Batch action types
const BATCH_ACTIONS = {
  COMPLETE: 'complete',
  DELETE: 'delete',
  MOVE_DATE: 'move_date',
  CHANGE_CATEGORY: 'change_category',
  CHANGE_DIFFICULTY: 'change_difficulty',
  MARK_FROG: 'mark_frog',
  UNMARK_FROG: 'unmark_frog',
  ADD_TAG: 'add_tag',
  REMOVE_TAG: 'remove_tag',
  DUPLICATE: 'duplicate',
  ARCHIVE: 'archive'
};

// Hook for batch actions
export function useBatchActions(tasks, onUpdateTasks) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      setSelectedIds(new Set());
    }
  }, [isSelectionMode]);

  // Toggle task selection
  const toggleTaskSelection = useCallback((taskId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Select all tasks
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(tasks.map(t => t.id)));
  }, [tasks]);

  // Select none
  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Select by filter
  const selectByFilter = useCallback((filterFn) => {
    const filteredIds = tasks.filter(filterFn).map(t => t.id);
    setSelectedIds(new Set(filteredIds));
  }, [tasks]);

  // Get selected tasks
  const getSelectedTasks = useCallback(() => {
    return tasks.filter(t => selectedIds.has(t.id));
  }, [tasks, selectedIds]);

  // Execute batch action
  const executeBatchAction = useCallback((action, payload = {}) => {
    const selected = getSelectedTasks();
    if (selected.length === 0) return;

    let updatedTasks = [...tasks];

    switch (action) {
      case BATCH_ACTIONS.COMPLETE:
        updatedTasks = tasks.map(t =>
          selectedIds.has(t.id)
            ? { ...t, completed: true, completedAt: new Date().toISOString() }
            : t
        );
        break;

      case BATCH_ACTIONS.DELETE:
        updatedTasks = tasks.filter(t => !selectedIds.has(t.id));
        break;

      case BATCH_ACTIONS.MOVE_DATE:
        if (payload.date) {
          updatedTasks = tasks.map(t =>
            selectedIds.has(t.id)
              ? { ...t, dueDate: payload.date }
              : t
          );
        }
        break;

      case BATCH_ACTIONS.CHANGE_CATEGORY:
        if (payload.category) {
          updatedTasks = tasks.map(t =>
            selectedIds.has(t.id)
              ? { ...t, category: payload.category }
              : t
          );
        }
        break;

      case BATCH_ACTIONS.CHANGE_DIFFICULTY:
        if (payload.difficulty) {
          updatedTasks = tasks.map(t =>
            selectedIds.has(t.id)
              ? { ...t, difficulty: payload.difficulty }
              : t
          );
        }
        break;

      case BATCH_ACTIONS.MARK_FROG:
        updatedTasks = tasks.map(t =>
          selectedIds.has(t.id) ? { ...t, frog: true } : t
        );
        break;

      case BATCH_ACTIONS.UNMARK_FROG:
        updatedTasks = tasks.map(t =>
          selectedIds.has(t.id) ? { ...t, frog: false } : t
        );
        break;

      case BATCH_ACTIONS.ADD_TAG:
        if (payload.tag) {
          updatedTasks = tasks.map(t =>
            selectedIds.has(t.id)
              ? { ...t, tags: [...new Set([...(t.tags || []), payload.tag])] }
              : t
          );
        }
        break;

      case BATCH_ACTIONS.REMOVE_TAG:
        if (payload.tag) {
          updatedTasks = tasks.map(t =>
            selectedIds.has(t.id)
              ? { ...t, tags: (t.tags || []).filter(tag => tag !== payload.tag) }
              : t
          );
        }
        break;

      case BATCH_ACTIONS.DUPLICATE:
        const duplicates = selected.map(t => ({
          ...t,
          id: `${t.id}_dup_${Date.now()}`,
          title: `${t.title} (copy)`,
          completed: false,
          completedAt: null,
          created_at: new Date().toISOString()
        }));
        updatedTasks = [...tasks, ...duplicates];
        break;

      case BATCH_ACTIONS.ARCHIVE:
        updatedTasks = tasks.map(t =>
          selectedIds.has(t.id) ? { ...t, archived: true } : t
        );
        break;
    }

    onUpdateTasks(updatedTasks);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [tasks, selectedIds, getSelectedTasks, onUpdateTasks]);

  // Quick filters for selection
  const quickFilters = {
    completed: () => selectByFilter(t => t.completed),
    incomplete: () => selectByFilter(t => !t.completed),
    frogs: () => selectByFilter(t => t.frog),
    overdue: () => selectByFilter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && !t.completed;
    }),
    today: () => selectByFilter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === new Date().toDateString();
    }),
    noDate: () => selectByFilter(t => !t.dueDate),
    highDifficulty: () => selectByFilter(t => (t.difficulty || 3) >= 4)
  };

  return {
    // State
    selectedIds,
    isSelectionMode,
    selectedCount: selectedIds.size,

    // Actions
    toggleSelectionMode,
    toggleTaskSelection,
    selectAll,
    selectNone,
    selectByFilter,
    getSelectedTasks,
    executeBatchAction,
    quickFilters,

    // Constants
    BATCH_ACTIONS
  };
}

// Selection Checkbox
export function SelectionCheckbox({ isSelected, onToggle }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
        isSelected
          ? 'bg-blue-500 border-blue-500'
          : 'border-white/30 hover:border-white/50'
      }`}
    >
      {isSelected && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

// Batch Action Toolbar
export function BatchActionToolbar({
  selectedCount,
  onAction,
  onSelectAll,
  onSelectNone,
  onCancel,
  categories = []
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
        <span className="text-sm text-white/60">Select tasks to perform actions</span>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Select All
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-white/40 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-blue-500/20 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{selectedCount} selected</span>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-xs text-blue-300 hover:text-blue-200"
          >
            All
          </button>
          <button
            onClick={onSelectNone}
            className="text-xs text-white/60 hover:text-white"
          >
            None
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-white/40 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction(BATCH_ACTIONS.COMPLETE)}
          className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-sm"
        >
          ✓ Complete
        </button>

        <button
          onClick={() => onAction(BATCH_ACTIONS.DELETE)}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm"
        >
          🗑️ Delete
        </button>

        <button
          onClick={() => onAction(BATCH_ACTIONS.MARK_FROG)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          🐸 Mark Frog
        </button>

        <button
          onClick={() => onAction(BATCH_ACTIONS.DUPLICATE)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          📋 Duplicate
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
          >
            📅 Move Date
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg bg-gray-800 shadow-xl z-10">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="glass-input px-2 py-1 rounded text-sm mb-2"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (selectedDate) {
                      onAction(BATCH_ACTIONS.MOVE_DATE, { date: selectedDate });
                      setShowDatePicker(false);
                    }
                  }}
                  className="px-2 py-1 rounded bg-blue-500/30 text-xs"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-2 py-1 rounded bg-white/10 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
          >
            🏷️ Category
          </button>
          {showCategoryPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg bg-gray-800 shadow-xl z-10 min-w-32">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    onAction(BATCH_ACTIONS.CHANGE_CATEGORY, { category: cat });
                    setShowCategoryPicker(false);
                  }}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm capitalize"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDifficultyPicker(!showDifficultyPicker)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
          >
            ⭐ Difficulty
          </button>
          {showDifficultyPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg bg-gray-800 shadow-xl z-10">
              {[1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  onClick={() => {
                    onAction(BATCH_ACTIONS.CHANGE_DIFFICULTY, { difficulty: d });
                    setShowDifficultyPicker(false);
                  }}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm"
                >
                  {'⭐'.repeat(d)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Quick Filter Buttons
export function QuickFilterButtons({ quickFilters, taskCounts }) {
  const filters = [
    { id: 'incomplete', label: 'Incomplete', count: taskCounts.incomplete },
    { id: 'completed', label: 'Completed', count: taskCounts.completed },
    { id: 'frogs', label: 'Frogs', emoji: '🐸', count: taskCounts.frogs },
    { id: 'overdue', label: 'Overdue', count: taskCounts.overdue },
    { id: 'today', label: 'Today', count: taskCounts.today }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-white/40 self-center">Quick select:</span>
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => quickFilters[filter.id]?.()}
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
          disabled={filter.count === 0}
        >
          {filter.emoji || ''} {filter.label}
          {filter.count > 0 && (
            <span className="ml-1 text-white/40">({filter.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Batch Mode Toggle Button
export function BatchModeToggle({ isActive, selectedCount, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-blue-500/30 text-blue-300'
          : 'bg-white/10 hover:bg-white/20 text-white/60'
      }`}
    >
      {isActive ? (
        <>
          ✓ {selectedCount} selected
        </>
      ) : (
        <>☑️ Batch Select</>
      )}
    </button>
  );
}

// Confirmation Dialog
export function BatchConfirmDialog({ action, count, onConfirm, onCancel }) {
  const getActionMessage = () => {
    switch (action) {
      case BATCH_ACTIONS.DELETE:
        return `Delete ${count} task${count > 1 ? 's' : ''}? This cannot be undone.`;
      case BATCH_ACTIONS.COMPLETE:
        return `Mark ${count} task${count > 1 ? 's' : ''} as complete?`;
      case BATCH_ACTIONS.ARCHIVE:
        return `Archive ${count} task${count > 1 ? 's' : ''}?`;
      default:
        return `Apply action to ${count} task${count > 1 ? 's' : ''}?`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-sm w-full">
        <h3 className="font-bold text-lg mb-2">Confirm Action</h3>
        <p className="text-white/60 mb-4">{getActionMessage()}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 glass-button py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 glass-button py-2 ${
              action === BATCH_ACTIONS.DELETE
                ? 'bg-red-500/20 hover:bg-red-500/30'
                : 'bg-blue-500/20 hover:bg-blue-500/30'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchActionToolbar;
