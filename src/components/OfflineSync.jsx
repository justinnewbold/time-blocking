'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

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

// Sync operation types
const SYNC_OPERATIONS = {
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  DELETE_TASK: 'delete_task',
  COMPLETE_TASK: 'complete_task',
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  UPDATE_SETTINGS: 'update_settings',
  LOG_SESSION: 'log_session',
  UPDATE_STATS: 'update_stats'
};

// Hook to manage offline mode and sync queue
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState(() =>
    Storage.get('syncQueue', [])
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() =>
    Storage.get('lastSyncTime', null)
  );
  const [syncErrors, setSyncErrors] = useState([]);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(() =>
    Storage.get('offlineModeEnabled', true)
  );
  const syncTimeoutRef = useRef(null);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (syncQueue.length > 0) {
        processSyncQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue.length]);

  // Save sync queue to storage
  useEffect(() => {
    Storage.set('syncQueue', syncQueue);
  }, [syncQueue]);

  // Save last sync time
  useEffect(() => {
    Storage.set('lastSyncTime', lastSyncTime);
  }, [lastSyncTime]);

  // Save offline mode setting
  useEffect(() => {
    Storage.set('offlineModeEnabled', offlineModeEnabled);
  }, [offlineModeEnabled]);

  // Add operation to sync queue
  const queueOperation = useCallback((operation, data, priority = 'normal') => {
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      data,
      priority,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    };

    setSyncQueue(prev => {
      // Check for duplicate operations that can be merged
      const existingIndex = prev.findIndex(item =>
        item.operation === operation &&
        item.data?.id === data?.id &&
        item.operation !== SYNC_OPERATIONS.DELETE_TASK
      );

      if (existingIndex >= 0 && operation === SYNC_OPERATIONS.UPDATE_TASK) {
        // Merge updates for the same task
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          data: { ...updated[existingIndex].data, ...data },
          timestamp: new Date().toISOString()
        };
        return updated;
      }

      // Add to queue based on priority
      if (priority === 'high') {
        return [queueItem, ...prev];
      }
      return [...prev, queueItem];
    });

    return queueItem.id;
  }, []);

  // Remove operation from queue
  const removeFromQueue = useCallback((operationId) => {
    setSyncQueue(prev => prev.filter(item => item.id !== operationId));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    setSyncErrors([]);
  }, []);

  // Process sync queue (simulate syncing to server)
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    const errors = [];

    for (const item of syncQueue) {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 200));

        // In a real app, this would call your API
        // For now, we just simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
          removeFromQueue(item.id);
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        if (item.retryCount < item.maxRetries) {
          // Increment retry count
          setSyncQueue(prev => prev.map(qItem =>
            qItem.id === item.id
              ? { ...qItem, retryCount: qItem.retryCount + 1 }
              : qItem
          ));
        } else {
          errors.push({
            operationId: item.id,
            operation: item.operation,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    setSyncErrors(errors);
    setLastSyncTime(new Date().toISOString());
    setIsSyncing(false);
  }, [isOnline, isSyncing, syncQueue, removeFromQueue]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (isOnline && !isSyncing) {
      processSyncQueue();
    }
  }, [isOnline, isSyncing, processSyncQueue]);

  // Schedule periodic sync
  useEffect(() => {
    if (!offlineModeEnabled || !isOnline) return;

    // Sync every 30 seconds if there are pending items
    syncTimeoutRef.current = setInterval(() => {
      if (syncQueue.length > 0 && !isSyncing) {
        processSyncQueue();
      }
    }, 30000);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [offlineModeEnabled, isOnline, syncQueue.length, isSyncing, processSyncQueue]);

  // Get queue status
  const queueStatus = {
    pending: syncQueue.length,
    hasErrors: syncErrors.length > 0,
    errorCount: syncErrors.length,
    lastSync: lastSyncTime,
    isOnline,
    isSyncing
  };

  // Helper functions for common operations
  const queueTaskCreate = useCallback((task) => {
    return queueOperation(SYNC_OPERATIONS.CREATE_TASK, task, 'normal');
  }, [queueOperation]);

  const queueTaskUpdate = useCallback((task) => {
    return queueOperation(SYNC_OPERATIONS.UPDATE_TASK, task, 'normal');
  }, [queueOperation]);

  const queueTaskDelete = useCallback((taskId) => {
    return queueOperation(SYNC_OPERATIONS.DELETE_TASK, { id: taskId }, 'high');
  }, [queueOperation]);

  const queueTaskComplete = useCallback((taskId, completionData) => {
    return queueOperation(SYNC_OPERATIONS.COMPLETE_TASK, { id: taskId, ...completionData }, 'high');
  }, [queueOperation]);

  const queueSessionLog = useCallback((sessionData) => {
    return queueOperation(SYNC_OPERATIONS.LOG_SESSION, sessionData, 'normal');
  }, [queueOperation]);

  return {
    // State
    isOnline,
    isSyncing,
    syncQueue,
    syncErrors,
    lastSyncTime,
    queueStatus,
    offlineModeEnabled,

    // Actions
    queueOperation,
    removeFromQueue,
    clearQueue,
    triggerSync,
    setOfflineModeEnabled,

    // Helpers
    queueTaskCreate,
    queueTaskUpdate,
    queueTaskDelete,
    queueTaskComplete,
    queueSessionLog,

    // Constants
    SYNC_OPERATIONS
  };
}

// Online Status Indicator
export function OnlineStatusIndicator({ isOnline, isSyncing, pendingCount }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      !isOnline
        ? 'bg-red-500/20 text-red-400'
        : isSyncing
          ? 'bg-yellow-500/20 text-yellow-400'
          : pendingCount > 0
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-green-500/20 text-green-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        !isOnline
          ? 'bg-red-500'
          : isSyncing
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-green-500'
      }`} />
      <span>
        {!isOnline
          ? 'Offline'
          : isSyncing
            ? 'Syncing...'
            : pendingCount > 0
              ? `${pendingCount} pending`
              : 'Online'
        }
      </span>
    </div>
  );
}

// Sync Queue List
export function SyncQueueList({ queue, onRemove, onRetry }) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>No pending operations</p>
      </div>
    );
  }

  const getOperationLabel = (op) => {
    switch (op) {
      case SYNC_OPERATIONS.CREATE_TASK: return 'Create Task';
      case SYNC_OPERATIONS.UPDATE_TASK: return 'Update Task';
      case SYNC_OPERATIONS.DELETE_TASK: return 'Delete Task';
      case SYNC_OPERATIONS.COMPLETE_TASK: return 'Complete Task';
      case SYNC_OPERATIONS.LOG_SESSION: return 'Log Session';
      default: return op;
    }
  };

  return (
    <div className="space-y-2">
      {queue.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg bg-white/5"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${
                item.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-white/10'
              }`}>
                {getOperationLabel(item.operation)}
              </span>
              {item.retryCount > 0 && (
                <span className="text-xs text-yellow-400">
                  Retry {item.retryCount}/{item.maxRetries}
                </span>
              )}
            </div>
            {item.data?.title && (
              <p className="text-sm text-white/60 mt-1">{item.data.title}</p>
            )}
            <p className="text-xs text-white/40">
              {new Date(item.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.retryCount > 0 && onRetry && (
              <button
                onClick={() => onRetry(item.id)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                🔄
              </button>
            )}
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Sync Status Card
export function SyncStatusCard({ status, onSync, onClearQueue }) {
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">☁️ Sync Status</h3>
        <OnlineStatusIndicator
          isOnline={status.isOnline}
          isSyncing={status.isSyncing}
          pendingCount={status.pending}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Last synced</span>
          <span>{formatLastSync(status.lastSync)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Pending changes</span>
          <span className={status.pending > 0 ? 'text-orange-400' : ''}>
            {status.pending}
          </span>
        </div>

        {status.hasErrors && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Sync errors</span>
            <span className="text-red-400">{status.errorCount}</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onSync}
            disabled={!status.isOnline || status.isSyncing || status.pending === 0}
            className="flex-1 glass-button py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
          >
            {status.isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
          {status.pending > 0 && (
            <button
              onClick={onClearQueue}
              className="glass-button py-2 px-3 bg-red-500/20 hover:bg-red-500/30"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Offline Banner
export function OfflineBanner({ isOnline, pendingCount }) {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black px-4 py-2 z-50 flex items-center justify-center gap-2">
      <span>📴</span>
      <span className="font-medium">You're offline</span>
      {pendingCount > 0 && (
        <span className="text-sm">• {pendingCount} changes will sync when online</span>
      )}
    </div>
  );
}

// Sync Settings Panel
export function SyncSettingsPanel({ enabled, onToggle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Offline Mode</div>
          <div className="text-sm text-white/60">Queue changes when offline</div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-12 h-6 rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <p className="text-xs text-white/40">
        When enabled, your changes are saved locally and synced automatically
        when you're back online. Works great for commutes or spotty wifi!
      </p>
    </div>
  );
}

// Sync Queue Modal
export function SyncQueueModal({ isOpen, onClose, syncState }) {
  if (!isOpen) return null;

  const {
    syncQueue,
    queueStatus,
    syncErrors,
    triggerSync,
    removeFromQueue,
    clearQueue
  } = syncState;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">☁️ Sync Queue</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <SyncStatusCard
            status={queueStatus}
            onSync={triggerSync}
            onClearQueue={clearQueue}
          />

          {syncErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">⚠️ Sync Errors</h4>
              <div className="space-y-2">
                {syncErrors.map((error, i) => (
                  <div key={i} className="text-sm p-2 rounded bg-red-500/10 text-red-400">
                    {error.operation}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-sm font-medium text-white/60 mb-2">Pending Operations</h4>
            <SyncQueueList
              queue={syncQueue}
              onRemove={removeFromQueue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SyncQueueModal;
