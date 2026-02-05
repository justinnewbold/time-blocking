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

// Default blocklist categories
const BLOCKLIST_CATEGORIES = {
  social: {
    name: 'Social Media',
    emoji: '📱',
    sites: [
      'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
      'tiktok.com', 'snapchat.com', 'linkedin.com', 'reddit.com'
    ]
  },
  entertainment: {
    name: 'Entertainment',
    emoji: '🎬',
    sites: [
      'youtube.com', 'netflix.com', 'hulu.com', 'disneyplus.com',
      'twitch.tv', 'primevideo.com', 'hbomax.com'
    ]
  },
  news: {
    name: 'News Sites',
    emoji: '📰',
    sites: [
      'cnn.com', 'bbc.com', 'nytimes.com', 'foxnews.com',
      'news.google.com', 'huffpost.com'
    ]
  },
  shopping: {
    name: 'Shopping',
    emoji: '🛒',
    sites: [
      'amazon.com', 'ebay.com', 'etsy.com', 'walmart.com',
      'target.com', 'aliexpress.com'
    ]
  },
  gaming: {
    name: 'Gaming',
    emoji: '🎮',
    sites: [
      'store.steampowered.com', 'epicgames.com', 'roblox.com',
      'chess.com', 'itch.io'
    ]
  }
};

// Block modes
const BLOCK_MODES = {
  SOFT: 'soft',       // Shows warning, allows override
  MEDIUM: 'medium',   // Requires typing to proceed
  HARD: 'hard',       // No override allowed
  SCHEDULED: 'scheduled'  // Only blocks during set hours
};

// Hook for screen time blocker
export function useScreenTimeBlocker() {
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockMode, setBlockMode] = useState(() =>
    Storage.get('blockMode', BLOCK_MODES.SOFT)
  );
  const [blockedCategories, setBlockedCategories] = useState(() =>
    Storage.get('blockedCategories', ['social', 'entertainment'])
  );
  const [customBlocklist, setCustomBlocklist] = useState(() =>
    Storage.get('customBlocklist', [])
  );
  const [allowlist, setAllowlist] = useState(() =>
    Storage.get('allowlist', [])
  );
  const [schedule, setSchedule] = useState(() =>
    Storage.get('blockSchedule', {
      enabled: false,
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5] // Mon-Fri
    })
  );
  const [blockStats, setBlockStats] = useState(() =>
    Storage.get('blockStats', {
      totalBlocked: 0,
      overrideCount: 0,
      streakDays: 0,
      lastBlockDate: null
    })
  );
  const [focusSessionActive, setFocusSessionActive] = useState(false);
  const [breakTime, setBreakTime] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  const breakTimerRef = useRef(null);

  // Save to storage
  useEffect(() => {
    Storage.set('blockMode', blockMode);
  }, [blockMode]);

  useEffect(() => {
    Storage.set('blockedCategories', blockedCategories);
  }, [blockedCategories]);

  useEffect(() => {
    Storage.set('customBlocklist', customBlocklist);
  }, [customBlocklist]);

  useEffect(() => {
    Storage.set('allowlist', allowlist);
  }, [allowlist]);

  useEffect(() => {
    Storage.set('blockSchedule', schedule);
  }, [schedule]);

  useEffect(() => {
    Storage.set('blockStats', blockStats);
  }, [blockStats]);

  // Get all blocked sites
  const getAllBlockedSites = useCallback(() => {
    const categorySites = blockedCategories.flatMap(catId =>
      BLOCKLIST_CATEGORIES[catId]?.sites || []
    );
    const allBlocked = [...new Set([...categorySites, ...customBlocklist])];
    return allBlocked.filter(site => !allowlist.includes(site));
  }, [blockedCategories, customBlocklist, allowlist]);

  // Check if blocking should be active
  const shouldBlock = useCallback(() => {
    if (breakTime) return false;

    if (focusSessionActive) return true;

    if (blockMode === BLOCK_MODES.SCHEDULED && schedule.enabled) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      const isScheduledDay = schedule.days.includes(currentDay);
      const isScheduledTime = currentTime >= startTime && currentTime <= endTime;

      return isScheduledDay && isScheduledTime;
    }

    return isBlocking;
  }, [breakTime, focusSessionActive, blockMode, schedule, isBlocking]);

  // Check if URL is blocked
  const isUrlBlocked = useCallback((url) => {
    if (!shouldBlock()) return false;

    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const blockedSites = getAllBlockedSites();
      return blockedSites.some(site =>
        hostname === site || hostname.endsWith('.' + site)
      );
    } catch {
      return false;
    }
  }, [shouldBlock, getAllBlockedSites]);

  // Start blocking
  const startBlocking = useCallback(() => {
    setIsBlocking(true);
    setFocusSessionActive(true);

    setBlockStats(prev => ({
      ...prev,
      lastBlockDate: new Date().toISOString()
    }));
  }, []);

  // Stop blocking
  const stopBlocking = useCallback(() => {
    setIsBlocking(false);
    setFocusSessionActive(false);
    setBreakTime(false);

    if (breakTimerRef.current) {
      clearTimeout(breakTimerRef.current);
    }
  }, []);

  // Take a break
  const takeBreak = useCallback((minutes = breakDuration) => {
    setBreakTime(true);

    breakTimerRef.current = setTimeout(() => {
      setBreakTime(false);
    }, minutes * 60 * 1000);
  }, [breakDuration]);

  // End break early
  const endBreak = useCallback(() => {
    setBreakTime(false);
    if (breakTimerRef.current) {
      clearTimeout(breakTimerRef.current);
    }
  }, []);

  // Record blocked attempt
  const recordBlockedAttempt = useCallback((url) => {
    setBlockStats(prev => ({
      ...prev,
      totalBlocked: prev.totalBlocked + 1
    }));
  }, []);

  // Record override
  const recordOverride = useCallback(() => {
    setBlockStats(prev => ({
      ...prev,
      overrideCount: prev.overrideCount + 1
    }));
  }, []);

  // Toggle category
  const toggleCategory = useCallback((categoryId) => {
    setBlockedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // Add to custom blocklist
  const addToBlocklist = useCallback((site) => {
    const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (cleanSite && !customBlocklist.includes(cleanSite)) {
      setCustomBlocklist(prev => [...prev, cleanSite]);
    }
  }, [customBlocklist]);

  // Remove from blocklist
  const removeFromBlocklist = useCallback((site) => {
    setCustomBlocklist(prev => prev.filter(s => s !== site));
  }, []);

  // Add to allowlist
  const addToAllowlist = useCallback((site) => {
    const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (cleanSite && !allowlist.includes(cleanSite)) {
      setAllowlist(prev => [...prev, cleanSite]);
    }
  }, [allowlist]);

  // Remove from allowlist
  const removeFromAllowlist = useCallback((site) => {
    setAllowlist(prev => prev.filter(s => s !== site));
  }, []);

  // Update schedule
  const updateSchedule = useCallback((updates) => {
    setSchedule(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    setBlockStats({
      totalBlocked: 0,
      overrideCount: 0,
      streakDays: 0,
      lastBlockDate: null
    });
  }, []);

  return {
    // State
    isBlocking,
    blockMode,
    blockedCategories,
    customBlocklist,
    allowlist,
    schedule,
    blockStats,
    focusSessionActive,
    breakTime,
    breakDuration,

    // Computed
    shouldBlock: shouldBlock(),
    getAllBlockedSites,
    isUrlBlocked,

    // Actions
    setBlockMode,
    startBlocking,
    stopBlocking,
    takeBreak,
    endBreak,
    setBreakDuration,
    recordBlockedAttempt,
    recordOverride,
    toggleCategory,
    addToBlocklist,
    removeFromBlocklist,
    addToAllowlist,
    removeFromAllowlist,
    updateSchedule,
    resetStats,

    // Data
    BLOCKLIST_CATEGORIES,
    BLOCK_MODES
  };
}

// Block Mode Selector
export function BlockModeSelector({ mode, onChange }) {
  const modes = [
    { id: BLOCK_MODES.SOFT, name: 'Soft', emoji: '🟢', desc: 'Warning only' },
    { id: BLOCK_MODES.MEDIUM, name: 'Medium', emoji: '🟡', desc: 'Type to proceed' },
    { id: BLOCK_MODES.HARD, name: 'Hard', emoji: '🔴', desc: 'No override' },
    { id: BLOCK_MODES.SCHEDULED, name: 'Scheduled', emoji: '📅', desc: 'Time-based' }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`p-3 rounded-xl text-left transition-all ${
            mode === m.id
              ? 'bg-blue-500/20 ring-2 ring-blue-500/50'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{m.emoji}</span>
            <span className="font-medium">{m.name}</span>
          </div>
          <p className="text-xs text-white/40 mt-1">{m.desc}</p>
        </button>
      ))}
    </div>
  );
}

// Category Toggle
export function CategoryToggle({ categories, selected, onToggle }) {
  return (
    <div className="space-y-2">
      {Object.entries(categories).map(([id, category]) => (
        <label
          key={id}
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{category.emoji}</span>
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-white/40">{category.sites.length} sites</p>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full transition-colors ${
            selected.includes(id) ? 'bg-red-500' : 'bg-white/20'
          }`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
              selected.includes(id) ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </label>
      ))}
    </div>
  );
}

// Schedule Editor
export function ScheduleEditor({ schedule, onChange }) {
  const days = [
    { id: 0, name: 'Sun' },
    { id: 1, name: 'Mon' },
    { id: 2, name: 'Tue' },
    { id: 3, name: 'Wed' },
    { id: 4, name: 'Thu' },
    { id: 5, name: 'Fri' },
    { id: 6, name: 'Sat' }
  ];

  const toggleDay = (dayId) => {
    const newDays = schedule.days.includes(dayId)
      ? schedule.days.filter(d => d !== dayId)
      : [...schedule.days, dayId];
    onChange({ days: newDays });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between">
        <span>Enable Schedule</span>
        <button
          onClick={() => onChange({ enabled: !schedule.enabled })}
          className={`w-10 h-5 rounded-full transition-colors ${
            schedule.enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            schedule.enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      {schedule.enabled && (
        <>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-white/60 block mb-1">Start Time</label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-white/60 block mb-1">End Time</label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-2">Active Days</label>
            <div className="flex gap-1">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                    schedule.days.includes(day.id)
                      ? 'bg-blue-500/30 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Custom Site Input
export function CustomSiteInput({ onAdd, placeholder = "Add site (e.g., example.com)" }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="glass-input flex-1 px-3 py-2 rounded-lg"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="glass-button px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

// Site List
export function SiteList({ sites, onRemove, emptyMessage = "No sites added" }) {
  if (sites.length === 0) {
    return <p className="text-sm text-white/40 text-center py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {sites.map(site => (
        <div
          key={site}
          className="flex items-center justify-between p-2 rounded-lg bg-white/5"
        >
          <span className="text-sm">{site}</span>
          <button
            onClick={() => onRemove(site)}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// Blocking Status Card
export function BlockingStatusCard({ blockerState }) {
  const {
    shouldBlock,
    blockStats,
    breakTime,
    focusSessionActive,
    startBlocking,
    stopBlocking,
    takeBreak,
    endBreak,
    getAllBlockedSites
  } = blockerState;

  const blockedSites = getAllBlockedSites();

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🛡️ Screen Blocker</h3>
        <div className={`px-3 py-1 rounded-full text-sm ${
          shouldBlock
            ? 'bg-red-500/20 text-red-400'
            : 'bg-green-500/20 text-green-400'
        }`}>
          {shouldBlock ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-white/60">Blocked</p>
          <p className="text-xl font-bold">{blockStats.totalBlocked}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-white/60">Sites</p>
          <p className="text-xl font-bold">{blockedSites.length}</p>
        </div>
      </div>

      {breakTime && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 text-center">
          <p className="text-yellow-400">☕ Break Time Active</p>
          <button
            onClick={endBreak}
            className="mt-2 text-sm underline text-yellow-300"
          >
            End Break
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {focusSessionActive ? (
          <>
            <button
              onClick={() => takeBreak(5)}
              disabled={breakTime}
              className="flex-1 glass-button py-2 bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50"
            >
              ☕ 5min Break
            </button>
            <button
              onClick={stopBlocking}
              className="flex-1 glass-button py-2 bg-red-500/20 hover:bg-red-500/30"
            >
              Stop
            </button>
          </>
        ) : (
          <button
            onClick={startBlocking}
            className="w-full glass-button py-2 bg-green-500/20 hover:bg-green-500/30"
          >
            🛡️ Start Blocking
          </button>
        )}
      </div>
    </div>
  );
}

// Blocked Page Overlay
export function BlockedPageOverlay({ url, mode, onOverride, onClose }) {
  const [typeChallenge, setTypeChallenge] = useState('');
  const challengePhrase = "I need to access this site";

  const canOverride = mode === BLOCK_MODES.SOFT ||
    (mode === BLOCK_MODES.MEDIUM && typeChallenge === challengePhrase);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-6 text-center">
        <div className="text-6xl mb-4">🛑</div>
        <h2 className="text-2xl font-bold mb-2">Site Blocked</h2>
        <p className="text-white/60 mb-4">
          This site is on your blocklist during focus time
        </p>
        <p className="text-sm text-white/40 mb-6 break-all">{url}</p>

        {mode === BLOCK_MODES.HARD ? (
          <p className="text-red-400 mb-4">
            Hard mode is enabled. No override available.
          </p>
        ) : mode === BLOCK_MODES.MEDIUM ? (
          <div className="mb-4">
            <p className="text-sm text-white/60 mb-2">
              Type "{challengePhrase}" to proceed:
            </p>
            <input
              type="text"
              value={typeChallenge}
              onChange={(e) => setTypeChallenge(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-lg text-center"
              placeholder="Type the phrase..."
            />
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 glass-button py-3 bg-blue-500/20 hover:bg-blue-500/30"
          >
            ← Go Back
          </button>
          {mode !== BLOCK_MODES.HARD && (
            <button
              onClick={onOverride}
              disabled={!canOverride}
              className="flex-1 glass-button py-3 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50"
            >
              Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Screen Time Blocker Modal
export function ScreenTimeBlockerModal({ isOpen, onClose, blockerState }) {
  const [activeTab, setActiveTab] = useState('categories');

  if (!isOpen) return null;

  const {
    blockMode,
    blockedCategories,
    customBlocklist,
    allowlist,
    schedule,
    setBlockMode,
    toggleCategory,
    addToBlocklist,
    removeFromBlocklist,
    addToAllowlist,
    removeFromAllowlist,
    updateSchedule,
    BLOCKLIST_CATEGORIES
  } = blockerState;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🛡️ Screen Time Blocker</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['categories', 'custom', 'schedule'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">Block Mode</h4>
                <BlockModeSelector mode={blockMode} onChange={setBlockMode} />
              </div>

              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">Categories</h4>
                <CategoryToggle
                  categories={BLOCKLIST_CATEGORIES}
                  selected={blockedCategories}
                  onToggle={toggleCategory}
                />
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">🚫 Additional Blocked Sites</h4>
                <CustomSiteInput onAdd={addToBlocklist} />
                <div className="mt-2">
                  <SiteList
                    sites={customBlocklist}
                    onRemove={removeFromBlocklist}
                    emptyMessage="No custom sites blocked"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">✅ Always Allowed Sites</h4>
                <CustomSiteInput
                  onAdd={addToAllowlist}
                  placeholder="Add allowed site..."
                />
                <div className="mt-2">
                  <SiteList
                    sites={allowlist}
                    onRemove={removeFromAllowlist}
                    emptyMessage="No exceptions added"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <ScheduleEditor schedule={schedule} onChange={updateSchedule} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenTimeBlockerModal;
