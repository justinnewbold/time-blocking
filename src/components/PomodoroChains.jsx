'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Pomodoro Chain Presets
export const CHAIN_PRESETS = [
  {
    id: 'classic',
    name: 'Classic Pomodoro',
    emoji: '🍅',
    sessions: 4,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    description: '4 × 25min with 5min breaks, then 15min rest'
  },
  {
    id: 'adhd-friendly',
    name: 'ADHD Sprints',
    emoji: '⚡',
    sessions: 6,
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    description: '6 × 15min sprints for better focus retention'
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    emoji: '🧠',
    sessions: 3,
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
    description: '3 × 50min for deep concentration tasks'
  },
  {
    id: 'quick-bursts',
    name: 'Quick Bursts',
    emoji: '🚀',
    sessions: 8,
    focusMinutes: 10,
    shortBreakMinutes: 2,
    longBreakMinutes: 10,
    description: '8 × 10min micro-sessions for variety'
  },
  {
    id: 'custom',
    name: 'Custom Chain',
    emoji: '⚙️',
    sessions: 4,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    description: 'Configure your own chain'
  }
];

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

// Chain state types
const CHAIN_STATES = {
  IDLE: 'idle',
  FOCUS: 'focus',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
  COMPLETED: 'completed',
  PAUSED: 'paused'
};

// Hook to manage pomodoro chains
export function usePomodoroChain(onSessionComplete, onChainComplete) {
  const [chainConfig, setChainConfig] = useState(() =>
    Storage.get('pomodoroChainConfig', CHAIN_PRESETS[0])
  );
  const [chainState, setChainState] = useState(CHAIN_STATES.IDLE);
  const [currentSession, setCurrentSession] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [chainHistory, setChainHistory] = useState(() =>
    Storage.get('pomodoroChainHistory', [])
  );
  const [isChainActive, setIsChainActive] = useState(false);
  const [pausedState, setPausedState] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Save config to storage
  useEffect(() => {
    Storage.set('pomodoroChainConfig', chainConfig);
  }, [chainConfig]);

  // Save history to storage
  useEffect(() => {
    Storage.set('pomodoroChainHistory', chainHistory);
  }, [chainHistory]);

  // Timer logic
  useEffect(() => {
    if (chainState === CHAIN_STATES.FOCUS ||
        chainState === CHAIN_STATES.SHORT_BREAK ||
        chainState === CHAIN_STATES.LONG_BREAK) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [chainState]);

  // Handle phase completion
  const handlePhaseComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (chainState === CHAIN_STATES.FOCUS) {
      // Focus session completed
      const focusDuration = chainConfig.focusMinutes;
      setTotalFocusTime(prev => prev + focusDuration);

      if (onSessionComplete) {
        onSessionComplete({
          session: currentSession + 1,
          duration: focusDuration,
          type: 'focus'
        });
      }

      // Check if chain is complete
      if (currentSession + 1 >= chainConfig.sessions) {
        completeChain();
      } else {
        // Move to break
        const isLongBreak = (currentSession + 1) % 4 === 0;
        if (isLongBreak) {
          setChainState(CHAIN_STATES.LONG_BREAK);
          setTimeRemaining(chainConfig.longBreakMinutes * 60);
        } else {
          setChainState(CHAIN_STATES.SHORT_BREAK);
          setTimeRemaining(chainConfig.shortBreakMinutes * 60);
        }
      }
    } else if (chainState === CHAIN_STATES.SHORT_BREAK || chainState === CHAIN_STATES.LONG_BREAK) {
      // Break completed, start next focus session
      setCurrentSession(prev => prev + 1);
      setChainState(CHAIN_STATES.FOCUS);
      setTimeRemaining(chainConfig.focusMinutes * 60);
    }
  }, [chainState, currentSession, chainConfig, onSessionComplete]);

  // Complete the chain
  const completeChain = useCallback(() => {
    setChainState(CHAIN_STATES.COMPLETED);
    setIsChainActive(false);

    const chainRecord = {
      id: Date.now(),
      config: chainConfig,
      completedAt: new Date().toISOString(),
      totalFocusMinutes: totalFocusTime + chainConfig.focusMinutes,
      sessionsCompleted: chainConfig.sessions
    };

    setChainHistory(prev => [chainRecord, ...prev].slice(0, 50));

    if (onChainComplete) {
      onChainComplete(chainRecord);
    }
  }, [chainConfig, totalFocusTime, onChainComplete]);

  // Start a chain
  const startChain = useCallback((presetId = null) => {
    if (presetId) {
      const preset = CHAIN_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setChainConfig(preset);
      }
    }

    setCurrentSession(0);
    setTotalFocusTime(0);
    setTimeRemaining(chainConfig.focusMinutes * 60);
    setChainState(CHAIN_STATES.FOCUS);
    setIsChainActive(true);
    startTimeRef.current = Date.now();
  }, [chainConfig]);

  // Pause chain
  const pauseChain = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setPausedState({
      state: chainState,
      timeRemaining,
      currentSession
    });
    setChainState(CHAIN_STATES.PAUSED);
  }, [chainState, timeRemaining, currentSession]);

  // Resume chain
  const resumeChain = useCallback(() => {
    if (pausedState) {
      setChainState(pausedState.state);
      setTimeRemaining(pausedState.timeRemaining);
      setCurrentSession(pausedState.currentSession);
      setPausedState(null);
    }
  }, [pausedState]);

  // Stop chain
  const stopChain = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setChainState(CHAIN_STATES.IDLE);
    setIsChainActive(false);
    setCurrentSession(0);
    setTimeRemaining(0);
    setPausedState(null);
  }, []);

  // Skip current phase
  const skipPhase = useCallback(() => {
    handlePhaseComplete();
  }, [handlePhaseComplete]);

  // Update custom chain config
  const updateChainConfig = useCallback((updates) => {
    setChainConfig(prev => ({
      ...prev,
      ...updates,
      id: 'custom',
      name: 'Custom Chain',
      emoji: '⚙️'
    }));
  }, []);

  // Get progress percentage
  const getProgress = useCallback(() => {
    const totalPhases = chainConfig.sessions * 2 - 1; // focus + breaks
    const completedPhases = currentSession * 2 +
      (chainState === CHAIN_STATES.SHORT_BREAK || chainState === CHAIN_STATES.LONG_BREAK ? 1 : 0);
    return (completedPhases / totalPhases) * 100;
  }, [chainConfig.sessions, currentSession, chainState]);

  // Get total chain duration estimate
  const getTotalDuration = useCallback(() => {
    const focusTime = chainConfig.sessions * chainConfig.focusMinutes;
    const shortBreaks = (chainConfig.sessions - 1) * chainConfig.shortBreakMinutes;
    const longBreaks = Math.floor((chainConfig.sessions - 1) / 4) * chainConfig.longBreakMinutes;
    return focusTime + shortBreaks + longBreaks;
  }, [chainConfig]);

  return {
    // State
    chainConfig,
    chainState,
    currentSession,
    timeRemaining,
    totalFocusTime,
    chainHistory,
    isChainActive,
    isPaused: chainState === CHAIN_STATES.PAUSED,
    isCompleted: chainState === CHAIN_STATES.COMPLETED,

    // Actions
    startChain,
    pauseChain,
    resumeChain,
    stopChain,
    skipPhase,
    updateChainConfig,
    setChainConfig,

    // Computed
    getProgress,
    getTotalDuration,

    // Constants
    CHAIN_PRESETS,
    CHAIN_STATES
  };
}

// Chain Timer Display Component
export function ChainTimerDisplay({
  chainState,
  timeRemaining,
  currentSession,
  totalSessions,
  onPause,
  onResume,
  onStop,
  onSkip,
  isPaused
}) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const getPhaseLabel = () => {
    switch (chainState) {
      case CHAIN_STATES.FOCUS: return 'Focus Time';
      case CHAIN_STATES.SHORT_BREAK: return 'Short Break';
      case CHAIN_STATES.LONG_BREAK: return 'Long Break';
      case CHAIN_STATES.PAUSED: return 'Paused';
      case CHAIN_STATES.COMPLETED: return 'Chain Complete!';
      default: return 'Ready';
    }
  };

  const getPhaseEmoji = () => {
    switch (chainState) {
      case CHAIN_STATES.FOCUS: return '🎯';
      case CHAIN_STATES.SHORT_BREAK: return '☕';
      case CHAIN_STATES.LONG_BREAK: return '🌴';
      case CHAIN_STATES.PAUSED: return '⏸️';
      case CHAIN_STATES.COMPLETED: return '🎉';
      default: return '⏰';
    }
  };

  const getPhaseColor = () => {
    switch (chainState) {
      case CHAIN_STATES.FOCUS: return 'text-green-400';
      case CHAIN_STATES.SHORT_BREAK: return 'text-blue-400';
      case CHAIN_STATES.LONG_BREAK: return 'text-purple-400';
      case CHAIN_STATES.PAUSED: return 'text-yellow-400';
      case CHAIN_STATES.COMPLETED: return 'text-yellow-300';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="glass-card p-6 text-center">
      {/* Phase indicator */}
      <div className={`text-lg font-medium ${getPhaseColor()} mb-2`}>
        {getPhaseEmoji()} {getPhaseLabel()}
      </div>

      {/* Session progress */}
      <div className="text-sm text-white/60 mb-4">
        Session {currentSession + 1} of {totalSessions}
      </div>

      {/* Timer display */}
      <div className="text-6xl font-mono font-bold mb-6">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Session dots */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSessions }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < currentSession
                ? 'bg-green-500'
                : i === currentSession
                  ? chainState === CHAIN_STATES.FOCUS
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-blue-400'
                  : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {isPaused ? (
          <button
            onClick={onResume}
            className="glass-button px-6 py-2 bg-green-500/20 hover:bg-green-500/30"
          >
            ▶️ Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="glass-button px-6 py-2 bg-yellow-500/20 hover:bg-yellow-500/30"
          >
            ⏸️ Pause
          </button>
        )}

        <button
          onClick={onSkip}
          className="glass-button px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30"
        >
          ⏭️ Skip
        </button>

        <button
          onClick={onStop}
          className="glass-button px-6 py-2 bg-red-500/20 hover:bg-red-500/30"
        >
          ⏹️ Stop
        </button>
      </div>
    </div>
  );
}

// Chain Preset Selector
export function ChainPresetSelector({ currentPreset, onSelect, onCustomize }) {
  const [showCustomize, setShowCustomize] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    sessions: 4,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">🔗 Pomodoro Chain Presets</h3>

      <div className="grid grid-cols-1 gap-3">
        {CHAIN_PRESETS.filter(p => p.id !== 'custom').map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={`glass-card p-4 text-left hover:scale-[1.02] transition-transform ${
              currentPreset?.id === preset.id ? 'ring-2 ring-white/30' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{preset.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold">{preset.name}</div>
                <div className="text-sm text-white/60">{preset.description}</div>
              </div>
              {currentPreset?.id === preset.id && (
                <span className="text-green-400">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Custom configuration */}
      <button
        onClick={() => setShowCustomize(!showCustomize)}
        className="glass-card p-4 w-full text-left hover:scale-[1.02] transition-transform"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div className="flex-1">
            <div className="font-semibold">Custom Chain</div>
            <div className="text-sm text-white/60">Configure your own settings</div>
          </div>
          <span>{showCustomize ? '▼' : '▶'}</span>
        </div>
      </button>

      {showCustomize && (
        <div className="glass-card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60">Sessions</label>
              <input
                type="number"
                min={1}
                max={12}
                value={customConfig.sessions}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, sessions: parseInt(e.target.value) || 4 }))}
                className="glass-input w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-white/60">Focus (min)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={customConfig.focusMinutes}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, focusMinutes: parseInt(e.target.value) || 25 }))}
                className="glass-input w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-white/60">Short Break (min)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={customConfig.shortBreakMinutes}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, shortBreakMinutes: parseInt(e.target.value) || 5 }))}
                className="glass-input w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-white/60">Long Break (min)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={customConfig.longBreakMinutes}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, longBreakMinutes: parseInt(e.target.value) || 15 }))}
                className="glass-input w-full mt-1"
              />
            </div>
          </div>

          <button
            onClick={() => {
              onCustomize({
                ...customConfig,
                id: 'custom',
                name: 'Custom Chain',
                emoji: '⚙️',
                description: `${customConfig.sessions} × ${customConfig.focusMinutes}min sessions`
              });
            }}
            className="glass-button w-full py-2 bg-green-500/20 hover:bg-green-500/30"
          >
            Apply Custom Chain
          </button>
        </div>
      )}
    </div>
  );
}

// Chain History Display
export function ChainHistory({ history }) {
  if (history.length === 0) {
    return (
      <div className="glass-card p-4 text-center text-white/60">
        <p>No completed chains yet. Start your first one!</p>
      </div>
    );
  }

  const totalFocusMinutes = history.reduce((sum, h) => sum + h.totalFocusMinutes, 0);
  const totalChains = history.length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">📊 Chain History</h3>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold">{totalChains}</div>
          <div className="text-sm text-white/60">Chains Completed</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-bold">{Math.round(totalFocusMinutes / 60)}h</div>
          <div className="text-sm text-white/60">Total Focus Time</div>
        </div>
      </div>

      {/* Recent chains */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.slice(0, 10).map(chain => (
          <div key={chain.id} className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{chain.config.emoji}</span>
                <span className="font-medium">{chain.config.name}</span>
              </div>
              <span className="text-sm text-white/60">
                {chain.totalFocusMinutes}min
              </span>
            </div>
            <div className="text-xs text-white/40 mt-1">
              {new Date(chain.completedAt).toLocaleDateString()} at{' '}
              {new Date(chain.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Chain Manager Modal
export function ChainManagerModal({
  isOpen,
  onClose,
  onStartChain,
  chainState,
  currentSession,
  totalSessions,
  timeRemaining,
  chainConfig,
  chainHistory,
  isPaused,
  onPause,
  onResume,
  onStop,
  onSkip,
  onSelectPreset,
  onCustomize,
  isChainActive
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">🔗 Pomodoro Chains</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {isChainActive ? (
          <ChainTimerDisplay
            chainState={chainState}
            timeRemaining={timeRemaining}
            currentSession={currentSession}
            totalSessions={totalSessions}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onSkip={onSkip}
            isPaused={isPaused}
          />
        ) : (
          <>
            <ChainPresetSelector
              currentPreset={chainConfig}
              onSelect={onSelectPreset}
              onCustomize={onCustomize}
            />

            <button
              onClick={onStartChain}
              className="glass-button w-full py-3 mt-4 bg-green-500/20 hover:bg-green-500/30 text-lg font-semibold"
            >
              🚀 Start Chain ({chainConfig.sessions} sessions)
            </button>

            <div className="mt-6">
              <ChainHistory history={chainHistory} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChainManagerModal;
