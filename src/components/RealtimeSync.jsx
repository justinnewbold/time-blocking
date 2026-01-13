'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Realtime sync hook for Supabase subscriptions
export function useRealtimeSync({
  supabase,
  userId,
  onTasksChange,
  onProgressChange,
  enabled = true,
}) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSync, setLastSync] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !userId || !enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    // Create channel for realtime updates
    const channel = supabase
      .channel(`user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focusflow_tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Task change:', payload);
          setLastSync(new Date());

          if (payload.eventType === 'INSERT') {
            onTasksChange?.({ type: 'insert', task: payload.new });
          } else if (payload.eventType === 'UPDATE') {
            onTasksChange?.({ type: 'update', task: payload.new, old: payload.old });
          } else if (payload.eventType === 'DELETE') {
            onTasksChange?.({ type: 'delete', task: payload.old });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focusflow_user_progress',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Progress change:', payload);
          setLastSync(new Date());

          if (payload.new) {
            onProgressChange?.(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('timeout');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, userId, enabled, onTasksChange, onProgressChange]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setLastSync(new Date());
    // The actual refresh should be handled by the parent component
  }, []);

  return {
    connectionStatus,
    lastSync,
    refresh,
    isConnected: connectionStatus === 'connected',
  };
}

// Sync status indicator component
export function SyncStatusIndicator({
  status,
  lastSync,
  onRefresh,
  compact = false,
}) {
  const statusConfig = {
    connected: {
      color: 'green',
      icon: '🟢',
      text: 'Live',
      description: 'Real-time sync active',
    },
    connecting: {
      color: 'yellow',
      icon: '🟡',
      text: 'Connecting',
      description: 'Establishing connection...',
    },
    disconnected: {
      color: 'gray',
      icon: '⚪',
      text: 'Offline',
      description: 'Not connected',
    },
    error: {
      color: 'red',
      icon: '🔴',
      text: 'Error',
      description: 'Connection failed',
    },
    timeout: {
      color: 'orange',
      icon: '🟠',
      text: 'Timeout',
      description: 'Connection timed out',
    },
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const seconds = Math.floor((new Date() - lastSync) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return lastSync.toLocaleTimeString();
  };

  if (compact) {
    return (
      <button
        onClick={onRefresh}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
        title={`${config.description}\nLast sync: ${formatLastSync()}`}
      >
        <span className="text-xs">{config.icon}</span>
        <span className="text-white/60 text-xs">{config.text}</span>
      </button>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className="text-white font-medium">{config.text}</p>
            <p className="text-white/60 text-sm">{config.description}</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Refresh now"
        >
          <span className="text-white/60">🔄</span>
        </button>
      </div>

      {lastSync && (
        <p className="text-white/40 text-xs mt-2">
          Last sync: {formatLastSync()}
        </p>
      )}
    </div>
  );
}

// Conflict resolution modal
export function ConflictResolutionModal({
  isOpen,
  onClose,
  localData,
  remoteData,
  onResolve,
}) {
  if (!isOpen) return null;

  const handleResolve = (choice) => {
    onResolve(choice === 'local' ? localData : remoteData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚠️</span> Sync Conflict
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        <p className="text-white/60 mb-6">
          This item was modified on another device. Which version would you like to keep?
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Local Version */}
          <div className="glass-card p-4 rounded-xl">
            <p className="text-white/60 text-xs uppercase mb-2">This Device</p>
            <p className="text-white font-medium">{localData?.title || 'Local version'}</p>
            {localData?.updated_at && (
              <p className="text-white/40 text-xs mt-2">
                {new Date(localData.updated_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Remote Version */}
          <div className="glass-card p-4 rounded-xl">
            <p className="text-white/60 text-xs uppercase mb-2">Cloud</p>
            <p className="text-white font-medium">{remoteData?.title || 'Remote version'}</p>
            {remoteData?.updated_at && (
              <p className="text-white/40 text-xs mt-2">
                {new Date(remoteData.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleResolve('local')}
            className="flex-1 py-3 rounded-xl font-medium bg-blue-500/20 border border-blue-500/30 text-white"
          >
            Keep Local
          </button>
          <button
            onClick={() => handleResolve('remote')}
            className="flex-1 py-3 rounded-xl font-medium bg-green-500/20 border border-green-500/30 text-white"
          >
            Keep Cloud
          </button>
        </div>
      </div>
    </div>
  );
}

// Offline queue for pending changes
export function useOfflineQueue() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    // Load queue from localStorage on mount
    const savedQueue = localStorage.getItem('offline_queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save queue to localStorage whenever it changes
    localStorage.setItem('offline_queue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback((operation) => {
    setQueue(prev => [...prev, {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const removeFromQueue = useCallback((operationId) => {
    setQueue(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const processQueue = useCallback(async (processFunc) => {
    const operations = [...queue];
    const results = [];

    for (const op of operations) {
      try {
        await processFunc(op);
        results.push({ id: op.id, success: true });
        removeFromQueue(op.id);
      } catch (error) {
        results.push({ id: op.id, success: false, error: error.message });
      }
    }

    return results;
  }, [queue, removeFromQueue]);

  return {
    queue,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}

export default useRealtimeSync;
