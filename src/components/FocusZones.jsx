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

// Default focus zones
export const DEFAULT_FOCUS_ZONES = [
  {
    id: 'office',
    name: 'At Office',
    emoji: '🏢',
    color: '#3b82f6',
    description: 'Work environment with full setup',
    tags: ['work', 'computer', 'meetings', 'focused'],
    autoTrigger: {
      wifi: null, // Could be set to office WiFi name
      timeRange: { start: '09:00', end: '17:00' },
      weekdays: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'home-office',
    name: 'Home Office',
    emoji: '🏠',
    color: '#10b981',
    description: 'Working from home',
    tags: ['work', 'home', 'computer', 'flexible'],
    autoTrigger: {
      wifi: null,
      timeRange: null,
      weekdays: null
    }
  },
  {
    id: 'commute',
    name: 'Commuting',
    emoji: '🚇',
    color: '#f59e0b',
    description: 'On the go tasks',
    tags: ['mobile', 'reading', 'audio', 'quick'],
    autoTrigger: {
      wifi: null,
      timeRange: { start: '07:00', end: '09:00' },
      weekdays: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'errands',
    name: 'Running Errands',
    emoji: '🚗',
    color: '#ef4444',
    description: 'Out and about',
    tags: ['errands', 'outside', 'physical', 'quick'],
    autoTrigger: null
  },
  {
    id: 'couch',
    name: 'Couch Mode',
    emoji: '🛋️',
    color: '#8b5cf6',
    description: 'Relaxed, low-energy tasks',
    tags: ['rest', 'easy', 'passive', 'entertainment'],
    autoTrigger: {
      wifi: null,
      timeRange: { start: '19:00', end: '23:00' },
      weekdays: null
    }
  },
  {
    id: 'gym',
    name: 'At Gym',
    emoji: '💪',
    color: '#ec4899',
    description: 'Health and fitness activities',
    tags: ['health', 'exercise', 'physical'],
    autoTrigger: null
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    emoji: '🧠',
    color: '#06b6d4',
    description: 'Distraction-free deep work',
    tags: ['focus', 'creative', 'writing', 'coding', 'deep'],
    autoTrigger: null
  },
  {
    id: 'social',
    name: 'With Others',
    emoji: '👥',
    color: '#f97316',
    description: 'Tasks involving other people',
    tags: ['social', 'meeting', 'call', 'collaboration'],
    autoTrigger: null
  }
];

// Hook to manage focus zones
export function useFocusZones(tasks) {
  const [focusZones, setFocusZones] = useState(() =>
    Storage.get('focusZones', DEFAULT_FOCUS_ZONES)
  );
  const [currentZone, setCurrentZone] = useState(() =>
    Storage.get('currentFocusZone', null)
  );
  const [taskZones, setTaskZones] = useState(() =>
    Storage.get('taskZones', {})
  );
  const [zoneHistory, setZoneHistory] = useState(() =>
    Storage.get('zoneHistory', [])
  );
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(() =>
    Storage.get('autoDetectZone', false)
  );

  // Save to storage
  useEffect(() => {
    Storage.set('focusZones', focusZones);
  }, [focusZones]);

  useEffect(() => {
    Storage.set('currentFocusZone', currentZone);
  }, [currentZone]);

  useEffect(() => {
    Storage.set('taskZones', taskZones);
  }, [taskZones]);

  useEffect(() => {
    Storage.set('zoneHistory', zoneHistory);
  }, [zoneHistory]);

  useEffect(() => {
    Storage.set('autoDetectZone', autoDetectEnabled);
  }, [autoDetectEnabled]);

  // Auto-detect zone based on time and day
  useEffect(() => {
    if (!autoDetectEnabled) return;

    const checkAutoTrigger = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const currentDay = now.getDay();

      for (const zone of focusZones) {
        if (!zone.autoTrigger) continue;

        const { timeRange, weekdays } = zone.autoTrigger;

        // Check weekday
        if (weekdays && !weekdays.includes(currentDay)) continue;

        // Check time range
        if (timeRange) {
          if (currentTime >= timeRange.start && currentTime <= timeRange.end) {
            if (currentZone?.id !== zone.id) {
              setCurrentZone(zone);
            }
            return;
          }
        }
      }
    };

    checkAutoTrigger();
    const interval = setInterval(checkAutoTrigger, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoDetectEnabled, focusZones, currentZone]);

  // Set current zone
  const selectZone = useCallback((zone) => {
    setCurrentZone(zone);
    setZoneHistory(prev => [{
      zoneId: zone.id,
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 100));
  }, []);

  // Clear current zone
  const clearZone = useCallback(() => {
    setCurrentZone(null);
  }, []);

  // Assign task to zone
  const assignTaskToZone = useCallback((taskId, zoneId) => {
    setTaskZones(prev => ({
      ...prev,
      [taskId]: zoneId
    }));
  }, []);

  // Remove task from zone
  const removeTaskFromZone = useCallback((taskId) => {
    setTaskZones(prev => {
      const newZones = { ...prev };
      delete newZones[taskId];
      return newZones;
    });
  }, []);

  // Get tasks for current zone
  const getTasksForZone = useCallback((zoneId) => {
    const zone = focusZones.find(z => z.id === zoneId);
    if (!zone) return [];

    return tasks.filter(task => {
      // Check if task is explicitly assigned to this zone
      if (taskZones[task.id] === zoneId) return true;

      // Check if task category/tags match zone tags
      const taskCategory = task.category?.toLowerCase() || '';
      const taskTags = task.tags || [];
      const zoneTags = zone.tags || [];

      return zoneTags.some(tag =>
        taskCategory.includes(tag) ||
        taskTags.some(t => t.toLowerCase().includes(tag))
      );
    });
  }, [tasks, taskZones, focusZones]);

  // Get filtered tasks based on current zone
  const filteredTasks = useMemo(() => {
    if (!currentZone) return tasks;
    return getTasksForZone(currentZone.id);
  }, [currentZone, getTasksForZone, tasks]);

  // Add custom zone
  const addZone = useCallback((zone) => {
    const newZone = {
      ...zone,
      id: `custom_${Date.now()}`,
      autoTrigger: null
    };
    setFocusZones(prev => [...prev, newZone]);
    return newZone;
  }, []);

  // Update zone
  const updateZone = useCallback((zoneId, updates) => {
    setFocusZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, ...updates } : z
    ));
  }, []);

  // Delete custom zone
  const deleteZone = useCallback((zoneId) => {
    if (DEFAULT_FOCUS_ZONES.some(z => z.id === zoneId)) return false;
    setFocusZones(prev => prev.filter(z => z.id !== zoneId));
    if (currentZone?.id === zoneId) {
      setCurrentZone(null);
    }
    return true;
  }, [currentZone]);

  // Get zone stats
  const getZoneStats = useCallback((zoneId) => {
    const zoneTasks = getTasksForZone(zoneId);
    const completed = zoneTasks.filter(t => t.completed).length;
    const total = zoneTasks.length;

    return {
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [getTasksForZone]);

  return {
    // State
    focusZones,
    currentZone,
    taskZones,
    filteredTasks,
    autoDetectEnabled,

    // Actions
    selectZone,
    clearZone,
    assignTaskToZone,
    removeTaskFromZone,
    getTasksForZone,
    addZone,
    updateZone,
    deleteZone,
    setAutoDetectEnabled,
    getZoneStats,

    // Constants
    DEFAULT_FOCUS_ZONES
  };
}

// Zone Selector Component
export function ZoneSelector({ zones, currentZone, onSelect, onClear }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">📍 Focus Zones</h3>
        {currentZone && (
          <button
            onClick={onClear}
            className="text-xs text-white/60 hover:text-white"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => onSelect(zone)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${
              currentZone?.id === zone.id
                ? 'ring-2 ring-white/30 scale-105'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: `${zone.color}30` }}
          >
            <span>{zone.emoji}</span>
            <span className="text-sm">{zone.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Current Zone Badge
export function CurrentZoneBadge({ zone, onClear }) {
  if (!zone) return null;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
      style={{ backgroundColor: `${zone.color}30` }}
    >
      <span>{zone.emoji}</span>
      <span>{zone.name}</span>
      <button
        onClick={onClear}
        className="ml-1 opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

// Zone Management Modal
export function ZoneManagementModal({
  isOpen,
  onClose,
  zones,
  currentZone,
  onSelectZone,
  onAddZone,
  onUpdateZone,
  onDeleteZone,
  autoDetectEnabled,
  onToggleAutoDetect,
  getZoneStats
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [newZone, setNewZone] = useState({
    name: '',
    emoji: '📍',
    color: '#3b82f6',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !newZone.tags.includes(tagInput.trim())) {
      setNewZone(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setNewZone(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSaveZone = () => {
    if (!newZone.name.trim()) return;

    if (editingZone) {
      onUpdateZone(editingZone.id, newZone);
    } else {
      onAddZone(newZone);
    }

    setNewZone({ name: '', emoji: '📍', color: '#3b82f6', description: '', tags: [] });
    setShowAddForm(false);
    setEditingZone(null);
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setNewZone({
      name: zone.name,
      emoji: zone.emoji,
      color: zone.color,
      description: zone.description || '',
      tags: zone.tags || []
    });
    setShowAddForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📍 Focus Zones</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Auto-detect toggle */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-detect Zone</div>
                <div className="text-sm text-white/60">Based on time and day</div>
              </div>
              <button
                onClick={() => onToggleAutoDetect(!autoDetectEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  autoDetectEnabled ? 'bg-green-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoDetectEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* Zone list */}
          {!showAddForm && (
            <div className="space-y-3">
              {zones.map(zone => {
                const stats = getZoneStats(zone.id);
                const isDefault = DEFAULT_FOCUS_ZONES.some(z => z.id === zone.id);

                return (
                  <div
                    key={zone.id}
                    className={`glass-card p-4 ${
                      currentZone?.id === zone.id ? 'ring-2 ring-white/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${zone.color}30` }}
                      >
                        {zone.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{zone.name}</div>
                        <div className="text-sm text-white/60">{zone.description}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {zone.tags?.slice(0, 4).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-xs bg-white/10"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-white/40 mt-2">
                          {stats.pending} tasks • {stats.completionRate}% done
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onSelectZone(zone)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentZone?.id === zone.id
                              ? 'bg-green-500/30'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {currentZone?.id === zone.id ? '✓ Active' : 'Select'}
                        </button>
                        {!isDefault && (
                          <>
                            <button
                              onClick={() => handleEdit(zone)}
                              className="px-3 py-1 rounded-lg text-sm bg-white/10 hover:bg-white/20"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteZone(zone.id)}
                              className="px-3 py-1 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setShowAddForm(true)}
                className="glass-card p-4 w-full text-center hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">+</span>
                <div className="text-sm text-white/60">Add Custom Zone</div>
              </button>
            </div>
          )}

          {/* Add/Edit form */}
          {showAddForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingZone(null);
                    setNewZone({ name: '', emoji: '📍', color: '#3b82f6', description: '', tags: [] });
                  }}
                  className="text-white/60 hover:text-white"
                >
                  ← Back
                </button>
                <h3 className="font-semibold">
                  {editingZone ? 'Edit Zone' : 'Add New Zone'}
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-sm text-white/60">Emoji</label>
                  <input
                    type="text"
                    value={newZone.emoji}
                    onChange={(e) => setNewZone(prev => ({ ...prev, emoji: e.target.value }))}
                    className="glass-input w-full mt-1 text-center text-2xl"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-sm text-white/60">Name</label>
                  <input
                    type="text"
                    value={newZone.name}
                    onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Zone name"
                    className="glass-input w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60">Color</label>
                <div className="flex gap-2 mt-1">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewZone(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newZone.color === color ? 'scale-125 ring-2 ring-white/50' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60">Description</label>
                <input
                  type="text"
                  value={newZone.description}
                  onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this zone for?"
                  className="glass-input w-full mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-white/60">Tags (for auto-matching tasks)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="glass-input flex-1"
                  />
                  <button onClick={handleAddTag} className="glass-button px-3">+</button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {newZone.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-full text-sm bg-white/10 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveZone}
                disabled={!newZone.name.trim()}
                className="glass-button w-full py-3 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
              >
                {editingZone ? 'Save Changes' : 'Create Zone'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Task Zone Assignment
export function TaskZoneAssignment({ task, zones, currentZone, onAssign, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
      >
        {currentZone ? (
          <>
            <span>{currentZone.emoji}</span>
            <span>{currentZone.name}</span>
          </>
        ) : (
          <span className="text-white/60">+ Zone</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 glass-card p-2 z-10">
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => {
                onAssign(task.id, zone.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-left"
            >
              <span>{zone.emoji}</span>
              <span>{zone.name}</span>
            </button>
          ))}
          {currentZone && (
            <button
              onClick={() => {
                onRemove(task.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 text-sm text-left text-red-400"
            >
              <span>✕</span>
              <span>Remove zone</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ZoneManagementModal;
