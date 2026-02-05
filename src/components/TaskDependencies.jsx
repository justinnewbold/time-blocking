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

// Hook to manage task dependencies
export function useTaskDependencies(tasks, completedTasks) {
  const [dependencies, setDependencies] = useState(() =>
    Storage.get('taskDependencies', {})
  );

  // Save dependencies to storage
  useEffect(() => {
    Storage.set('taskDependencies', dependencies);
  }, [dependencies]);

  // Add a dependency (taskId depends on blockerTaskId)
  const addDependency = useCallback((taskId, blockerTaskId) => {
    if (taskId === blockerTaskId) return false;

    // Check for circular dependencies
    if (wouldCreateCycle(taskId, blockerTaskId, dependencies)) {
      return false;
    }

    setDependencies(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), blockerTaskId]
    }));
    return true;
  }, [dependencies]);

  // Remove a dependency
  const removeDependency = useCallback((taskId, blockerTaskId) => {
    setDependencies(prev => {
      const newDeps = { ...prev };
      if (newDeps[taskId]) {
        newDeps[taskId] = newDeps[taskId].filter(id => id !== blockerTaskId);
        if (newDeps[taskId].length === 0) {
          delete newDeps[taskId];
        }
      }
      return newDeps;
    });
  }, []);

  // Clear all dependencies for a task
  const clearDependencies = useCallback((taskId) => {
    setDependencies(prev => {
      const newDeps = { ...prev };
      delete newDeps[taskId];
      return newDeps;
    });
  }, []);

  // Check if a task is blocked
  const isTaskBlocked = useCallback((taskId) => {
    const blockers = dependencies[taskId] || [];
    if (blockers.length === 0) return false;

    const completedIds = new Set([
      ...completedTasks.map(t => t.id),
      ...tasks.filter(t => t.completed).map(t => t.id)
    ]);

    return blockers.some(blockerId => !completedIds.has(blockerId));
  }, [dependencies, completedTasks, tasks]);

  // Get blocking tasks for a task
  const getBlockingTasks = useCallback((taskId) => {
    const blockerIds = dependencies[taskId] || [];
    const completedIds = new Set([
      ...completedTasks.map(t => t.id),
      ...tasks.filter(t => t.completed).map(t => t.id)
    ]);

    return blockerIds
      .filter(id => !completedIds.has(id))
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean);
  }, [dependencies, completedTasks, tasks]);

  // Get tasks that are blocked by a specific task
  const getBlockedTasks = useCallback((taskId) => {
    const blocked = [];
    Object.entries(dependencies).forEach(([blockedId, blockerIds]) => {
      if (blockerIds.includes(taskId)) {
        const task = tasks.find(t => t.id === blockedId);
        if (task) blocked.push(task);
      }
    });
    return blocked;
  }, [dependencies, tasks]);

  // Get all unblocked tasks
  const getUnblockedTasks = useCallback(() => {
    return tasks.filter(task => !task.completed && !isTaskBlocked(task.id));
  }, [tasks, isTaskBlocked]);

  // Get dependency chain for visualization
  const getDependencyChain = useCallback((taskId, visited = new Set()) => {
    if (visited.has(taskId)) return [];
    visited.add(taskId);

    const blockerIds = dependencies[taskId] || [];
    const chain = [];

    blockerIds.forEach(blockerId => {
      const blockerTask = tasks.find(t => t.id === blockerId);
      if (blockerTask) {
        chain.push({
          task: blockerTask,
          children: getDependencyChain(blockerId, visited)
        });
      }
    });

    return chain;
  }, [dependencies, tasks]);

  // Check for circular dependency before adding
  const wouldCreateCycle = (taskId, newBlockerId, deps) => {
    const visited = new Set();
    const stack = [newBlockerId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const blockers = deps[current] || [];
      stack.push(...blockers);
    }

    return false;
  };

  // Calculate critical path (longest chain to complete a task)
  const getCriticalPath = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return [];

    const chain = getDependencyChain(taskId);
    if (chain.length === 0) return [task];

    // Find longest path
    const findLongestPath = (nodes) => {
      if (nodes.length === 0) return [];
      let longest = [];
      nodes.forEach(node => {
        const childPath = findLongestPath(node.children);
        const path = [node.task, ...childPath];
        if (path.length > longest.length) {
          longest = path;
        }
      });
      return longest;
    };

    return [...findLongestPath(chain), task];
  }, [tasks, getDependencyChain]);

  return {
    dependencies,
    addDependency,
    removeDependency,
    clearDependencies,
    isTaskBlocked,
    getBlockingTasks,
    getBlockedTasks,
    getUnblockedTasks,
    getDependencyChain,
    getCriticalPath
  };
}

// Dependency Picker Modal
export function DependencyPicker({
  isOpen,
  onClose,
  task,
  tasks,
  currentDependencies,
  onAddDependency,
  onRemoveDependency,
  completedTasks
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !task) return null;

  const completedIds = new Set([
    ...completedTasks.map(t => t.id),
    ...tasks.filter(t => t.completed).map(t => t.id)
  ]);

  const availableTasks = tasks.filter(t =>
    t.id !== task.id &&
    !t.completed &&
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentBlockers = currentDependencies[task.id] || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">🔗 Task Dependencies</h2>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
          <p className="text-sm text-white/60">
            Select tasks that must be completed before "{task.title}"
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full"
          />
        </div>

        {/* Current dependencies */}
        {currentBlockers.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-medium text-white/60 mb-2">Current blockers:</div>
            <div className="space-y-2">
              {currentBlockers.map(blockerId => {
                const blocker = tasks.find(t => t.id === blockerId);
                const isComplete = completedIds.has(blockerId);
                return blocker ? (
                  <div
                    key={blockerId}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isComplete ? 'bg-green-500/20' : 'bg-orange-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{isComplete ? '✅' : '⏳'}</span>
                      <span className={isComplete ? 'line-through opacity-60' : ''}>
                        {blocker.title}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveDependency(task.id, blockerId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Available tasks to add as dependencies */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm font-medium text-white/60 mb-2">Add blockers:</div>
          <div className="space-y-2">
            {availableTasks.map(availableTask => {
              const isBlocker = currentBlockers.includes(availableTask.id);
              return (
                <button
                  key={availableTask.id}
                  onClick={() => {
                    if (isBlocker) {
                      onRemoveDependency(task.id, availableTask.id);
                    } else {
                      onAddDependency(task.id, availableTask.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    isBlocker
                      ? 'bg-blue-500/20 ring-2 ring-blue-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-xl">{isBlocker ? '🔗' : '○'}</span>
                    <div>
                      <div className="font-medium">{availableTask.title}</div>
                      <div className="text-xs text-white/40">{availableTask.category}</div>
                    </div>
                  </div>
                  {isBlocker && <span className="text-green-400">✓</span>}
                </button>
              );
            })}
            {availableTasks.length === 0 && (
              <p className="text-center text-white/40 py-4">
                No tasks available to add as dependencies
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Blocked Task Badge Component
export function BlockedBadge({ blockingTasks, onClick }) {
  if (!blockingTasks || blockingTasks.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs hover:bg-orange-500/30 transition-colors"
    >
      <span>🔒</span>
      <span>Blocked by {blockingTasks.length}</span>
    </button>
  );
}

// Dependency Chain Visualization
export function DependencyChainView({ task, chain, tasks, onTaskClick }) {
  const renderChainNode = (node, depth = 0) => {
    const isCompleted = node.task.completed;

    return (
      <div key={node.task.id} className="ml-4 border-l-2 border-white/20 pl-4">
        <button
          onClick={() => onTaskClick?.(node.task)}
          className={`flex items-center gap-2 py-2 hover:bg-white/10 rounded px-2 w-full text-left ${
            isCompleted ? 'opacity-60' : ''
          }`}
        >
          <span>{isCompleted ? '✅' : '⏳'}</span>
          <span className={isCompleted ? 'line-through' : ''}>{node.task.title}</span>
        </button>
        {node.children.map(child => renderChainNode(child, depth + 1))}
      </div>
    );
  };

  if (chain.length === 0) {
    return (
      <div className="text-center text-white/40 py-4">
        No dependencies for this task
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/60 mb-2">Dependency chain:</div>
      {chain.map(node => renderChainNode(node))}
      <div className="ml-4 border-l-2 border-green-500/50 pl-4">
        <div className="flex items-center gap-2 py-2 px-2 bg-green-500/10 rounded">
          <span>🎯</span>
          <span className="font-medium">{task.title}</span>
          <span className="text-xs text-white/40">(target)</span>
        </div>
      </div>
    </div>
  );
}

// Critical Path Display
export function CriticalPathView({ criticalPath }) {
  if (!criticalPath || criticalPath.length <= 1) {
    return null;
  }

  const totalEstimate = criticalPath.reduce((sum, task) =>
    sum + (task.estimatedMinutes || 25), 0
  );

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">🎯 Critical Path</h3>
        <span className="text-sm text-white/60">~{totalEstimate}min total</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {criticalPath.map((task, index) => (
          <div key={task.id} className="flex items-center">
            <div className={`px-3 py-2 rounded-lg whitespace-nowrap ${
              task.completed
                ? 'bg-green-500/20 text-green-400'
                : index === 0
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/10'
            }`}>
              {task.completed ? '✅' : index === 0 ? '👉' : '○'} {task.title}
            </div>
            {index < criticalPath.length - 1 && (
              <span className="mx-2 text-white/40">→</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-white/40 mt-2">
        Complete these tasks in order for fastest progress
      </p>
    </div>
  );
}

// Dependency Summary Card
export function DependencySummaryCard({ tasks, dependencies, completedTasks, onManage }) {
  const blockedCount = tasks.filter(task => {
    const blockers = dependencies[task.id] || [];
    if (blockers.length === 0) return false;
    const completedIds = new Set([
      ...completedTasks.map(t => t.id),
      ...tasks.filter(t => t.completed).map(t => t.id)
    ]);
    return blockers.some(id => !completedIds.has(id));
  }).length;

  const totalDependencies = Object.values(dependencies).flat().length;

  if (totalDependencies === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔗</span>
          <div>
            <div className="font-semibold">Task Dependencies</div>
            <div className="text-sm text-white/60">
              {blockedCount > 0
                ? `${blockedCount} task${blockedCount > 1 ? 's' : ''} blocked`
                : 'All tasks unblocked!'
              }
            </div>
          </div>
        </div>
        <button
          onClick={onManage}
          className="glass-button px-3 py-1 text-sm"
        >
          Manage
        </button>
      </div>
    </div>
  );
}

export default DependencyPicker;
