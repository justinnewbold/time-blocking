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

// Procrastination triggers
const PROCRASTINATION_TRIGGERS = [
  { id: 'overwhelm', name: 'Feeling Overwhelmed', emoji: '😰' },
  { id: 'unclear', name: 'Unclear Next Step', emoji: '❓' },
  { id: 'boring', name: 'Task Seems Boring', emoji: '😴' },
  { id: 'fear', name: 'Fear of Failure', emoji: '😨' },
  { id: 'perfectionism', name: 'Perfectionism', emoji: '🎯' },
  { id: 'distraction', name: 'Got Distracted', emoji: '📱' },
  { id: 'energy', name: 'Low Energy', emoji: '🔋' },
  { id: 'motivation', name: 'Lack of Motivation', emoji: '😕' },
  { id: 'other', name: 'Other', emoji: '🤷' }
];

// Coping strategies
const COPING_STRATEGIES = {
  overwhelm: [
    'Break task into smaller 5-minute chunks',
    'Start with the easiest part',
    'Use the "two-minute rule" - just start for 2 minutes'
  ],
  unclear: [
    'Write down the very next physical action',
    'Ask someone for clarification',
    'Do quick research to understand requirements'
  ],
  boring: [
    'Gamify it - set a timer and race yourself',
    'Pair with something enjoyable (music, snacks)',
    'Reward yourself after completion'
  ],
  fear: [
    'Remember: done is better than perfect',
    'Imagine the worst case - is it really that bad?',
    'Focus on learning, not performance'
  ],
  perfectionism: [
    'Set a "good enough" standard upfront',
    'Give yourself permission to revise later',
    'Time-box the task to prevent over-polishing'
  ],
  distraction: [
    'Put phone in another room',
    'Use website blockers',
    'Try the Pomodoro technique'
  ],
  energy: [
    'Take a 10-minute walk',
    'Have a healthy snack',
    'Do some quick stretches or exercises'
  ],
  motivation: [
    'Visualize how you\'ll feel when it\'s done',
    'Connect the task to your bigger goals',
    'Start with a related task you enjoy'
  ],
  other: [
    'Take a short break and return fresh',
    'Talk to someone about the task',
    'Change your environment'
  ]
};

// Hook for procrastination pattern analysis
export function useProcrastinationAnalysis() {
  const [procrastinationLog, setProcrastinationLog] = useState(() =>
    Storage.get('procrastinationLog', [])
  );
  const [patterns, setPatterns] = useState(() =>
    Storage.get('procrastinationPatterns', {})
  );

  // Save to storage
  useEffect(() => {
    Storage.set('procrastinationLog', procrastinationLog);
  }, [procrastinationLog]);

  useEffect(() => {
    Storage.set('procrastinationPatterns', patterns);
  }, [patterns]);

  // Log procrastination event
  const logProcrastination = useCallback((taskId, trigger, notes = '') => {
    const entry = {
      id: `proc_${Date.now()}`,
      taskId,
      trigger,
      notes,
      timestamp: new Date().toISOString(),
      dayOfWeek: new Date().getDay(),
      hourOfDay: new Date().getHours(),
      overcame: false,
      overcameStrategy: null
    };

    setProcrastinationLog(prev => [entry, ...prev].slice(0, 500));
    return entry;
  }, []);

  // Mark as overcome
  const markOvercome = useCallback((entryId, strategy = null) => {
    setProcrastinationLog(prev => prev.map(entry =>
      entry.id === entryId
        ? { ...entry, overcame: true, overcameStrategy: strategy, overcameAt: new Date().toISOString() }
        : entry
    ));
  }, []);

  // Analyze patterns
  const analyzePatterns = useMemo(() => {
    if (procrastinationLog.length < 5) {
      return {
        topTriggers: [],
        peakTimes: [],
        peakDays: [],
        successRate: 0,
        insights: []
      };
    }

    // Count triggers
    const triggerCounts = procrastinationLog.reduce((acc, entry) => {
      acc[entry.trigger] = (acc[entry.trigger] || 0) + 1;
      return acc;
    }, {});

    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger, count]) => ({
        trigger,
        count,
        percentage: Math.round((count / procrastinationLog.length) * 100),
        info: PROCRASTINATION_TRIGGERS.find(t => t.id === trigger)
      }));

    // Analyze time patterns
    const hourCounts = procrastinationLog.reduce((acc, entry) => {
      acc[entry.hourOfDay] = (acc[entry.hourOfDay] || 0) + 1;
      return acc;
    }, {});

    const peakTimes = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        label: `${parseInt(hour)}:00 - ${parseInt(hour) + 1}:00`
      }));

    // Analyze day patterns
    const dayCounts = procrastinationLog.reduce((acc, entry) => {
      acc[entry.dayOfWeek] = (acc[entry.dayOfWeek] || 0) + 1;
      return acc;
    }, {});

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day, count]) => ({
        day: parseInt(day),
        dayName: dayNames[parseInt(day)],
        count
      }));

    // Calculate success rate
    const overcameCount = procrastinationLog.filter(e => e.overcame).length;
    const successRate = Math.round((overcameCount / procrastinationLog.length) * 100);

    // Generate insights
    const insights = [];

    if (topTriggers[0]) {
      const topTrigger = topTriggers[0].info;
      insights.push({
        type: 'trigger',
        emoji: topTrigger?.emoji || '❓',
        message: `Your #1 procrastination trigger is "${topTrigger?.name || 'Unknown'}" (${topTriggers[0].percentage}% of the time)`
      });
    }

    if (peakTimes[0]) {
      insights.push({
        type: 'time',
        emoji: '⏰',
        message: `You procrastinate most around ${peakTimes[0].label}`
      });
    }

    if (peakDays[0]) {
      insights.push({
        type: 'day',
        emoji: '📅',
        message: `${peakDays[0].dayName}s are your most challenging days`
      });
    }

    if (successRate >= 70) {
      insights.push({
        type: 'success',
        emoji: '💪',
        message: `Great job! You overcome procrastination ${successRate}% of the time`
      });
    } else if (successRate < 50 && procrastinationLog.length > 10) {
      insights.push({
        type: 'improvement',
        emoji: '📈',
        message: 'Try using the suggested strategies to improve your success rate'
      });
    }

    return {
      topTriggers,
      peakTimes,
      peakDays,
      successRate,
      insights,
      totalLogged: procrastinationLog.length,
      totalOvercome: overcameCount
    };
  }, [procrastinationLog]);

  // Get coping strategies for a trigger
  const getCopingStrategies = useCallback((trigger) => {
    return COPING_STRATEGIES[trigger] || COPING_STRATEGIES.other;
  }, []);

  // Get recent entries
  const getRecentEntries = useCallback((limit = 10) => {
    return procrastinationLog.slice(0, limit);
  }, [procrastinationLog]);

  // Clear all data
  const clearData = useCallback(() => {
    setProcrastinationLog([]);
    setPatterns({});
  }, []);

  return {
    // State
    procrastinationLog,
    patterns: analyzePatterns,

    // Actions
    logProcrastination,
    markOvercome,
    getCopingStrategies,
    getRecentEntries,
    clearData,

    // Constants
    PROCRASTINATION_TRIGGERS
  };
}

// Trigger Selector
export function TriggerSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PROCRASTINATION_TRIGGERS.map(trigger => (
        <button
          key={trigger.id}
          onClick={() => onSelect(trigger.id)}
          className={`p-3 rounded-xl text-center transition-colors ${
            selected === trigger.id
              ? 'bg-red-500/20 ring-2 ring-red-500/50'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <span className="text-2xl block">{trigger.emoji}</span>
          <span className="text-xs text-white/60">{trigger.name}</span>
        </button>
      ))}
    </div>
  );
}

// Coping Strategy Card
export function CopingStrategyCard({ strategy, onUsed }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <p className="text-sm flex-1">{strategy}</p>
      {onUsed && (
        <button
          onClick={() => onUsed(strategy)}
          className="ml-2 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-sm text-green-400"
        >
          Used ✓
        </button>
      )}
    </div>
  );
}

// Pattern Stats Card
export function PatternStatsCard({ patterns }) {
  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">📊 Your Procrastination Patterns</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-white/5">
          <p className="text-2xl font-bold">{patterns.totalLogged}</p>
          <p className="text-xs text-white/40">Times Logged</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5">
          <p className="text-2xl font-bold text-green-400">{patterns.successRate}%</p>
          <p className="text-xs text-white/40">Overcome Rate</p>
        </div>
      </div>

      {patterns.topTriggers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm text-white/60 mb-2">Top Triggers</h4>
          <div className="space-y-2">
            {patterns.topTriggers.map((item, i) => (
              <div key={item.trigger} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.info?.emoji}</span>
                  <span className="text-sm">{item.info?.name}</span>
                </div>
                <span className="text-sm text-white/40">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {patterns.peakTimes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm text-white/60 mb-2">Peak Procrastination Times</h4>
          <div className="flex gap-2">
            {patterns.peakTimes.map(time => (
              <span
                key={time.hour}
                className="px-3 py-1 rounded-full bg-red-500/20 text-sm"
              >
                {time.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {patterns.peakDays.length > 0 && (
        <div>
          <h4 className="text-sm text-white/60 mb-2">Challenging Days</h4>
          <div className="flex gap-2">
            {patterns.peakDays.map(day => (
              <span
                key={day.day}
                className="px-3 py-1 rounded-full bg-orange-500/20 text-sm"
              >
                {day.dayName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Insight Card
export function PatternInsight({ insight }) {
  const colors = {
    trigger: 'bg-red-500/10 border-red-500/30',
    time: 'bg-blue-500/10 border-blue-500/30',
    day: 'bg-orange-500/10 border-orange-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    improvement: 'bg-yellow-500/10 border-yellow-500/30'
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[insight.type] || 'bg-white/5'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{insight.emoji}</span>
        <p className="text-sm">{insight.message}</p>
      </div>
    </div>
  );
}

// Log Entry Card
export function ProcrastinationLogEntry({ entry, onMarkOvercome }) {
  const trigger = PROCRASTINATION_TRIGGERS.find(t => t.id === entry.trigger);

  return (
    <div className={`p-3 rounded-lg ${entry.overcame ? 'bg-green-500/10' : 'bg-white/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{trigger?.emoji}</span>
          <span className="text-sm">{trigger?.name}</span>
        </div>
        {entry.overcame ? (
          <span className="text-xs text-green-400">✓ Overcome</span>
        ) : (
          <button
            onClick={() => onMarkOvercome(entry.id)}
            className="text-xs text-white/40 hover:text-white"
          >
            Mark overcome
          </button>
        )}
      </div>
      {entry.notes && (
        <p className="text-sm text-white/60">{entry.notes}</p>
      )}
      <p className="text-xs text-white/40 mt-1">
        {new Date(entry.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

// Quick Log Form
export function QuickProcrastinationLog({ taskTitle, onLog, onCancel }) {
  const [trigger, setTrigger] = useState(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!trigger) return;
    onLog(trigger, notes);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-white/60 mb-2">What's holding you back from:</p>
        <p className="font-medium">{taskTitle}</p>
      </div>

      <TriggerSelector selected={trigger} onSelect={setTrigger} />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any additional thoughts? (optional)"
        className="glass-input w-full px-4 py-3 rounded-xl resize-none h-20"
      />

      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 glass-button py-2">
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!trigger}
          className="flex-1 glass-button py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
        >
          Log & Get Help
        </button>
      </div>
    </div>
  );
}

// Procrastination Analysis Modal
export function ProcrastinationAnalysisModal({ isOpen, onClose, analysisState, currentTask = null }) {
  const [activeTab, setActiveTab] = useState(currentTask ? 'log' : 'patterns');
  const [showStrategies, setShowStrategies] = useState(null);

  if (!isOpen) return null;

  const {
    patterns,
    logProcrastination,
    markOvercome,
    getCopingStrategies,
    getRecentEntries
  } = analysisState;

  const recentEntries = getRecentEntries(10);

  const handleLog = (trigger, notes) => {
    const entry = logProcrastination(currentTask?.id, trigger, notes);
    setShowStrategies(trigger);
    setActiveTab('strategies');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🧠 Procrastination Analysis</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex border-b border-white/10">
          {['patterns', 'log', 'strategies', 'history'].map(tab => (
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
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              <PatternStatsCard patterns={patterns} />

              {patterns.insights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white/60">💡 Insights</h4>
                  {patterns.insights.map((insight, i) => (
                    <PatternInsight key={i} insight={insight} />
                  ))}
                </div>
              )}

              {patterns.totalLogged < 5 && (
                <div className="text-center py-4 text-white/40">
                  <p>Log at least 5 procrastination events to see patterns</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'log' && (
            <QuickProcrastinationLog
              taskTitle={currentTask?.title || 'Current task'}
              onLog={handleLog}
            />
          )}

          {activeTab === 'strategies' && (
            <div className="space-y-4">
              {showStrategies ? (
                <>
                  <h4 className="font-medium">
                    Strategies for {PROCRASTINATION_TRIGGERS.find(t => t.id === showStrategies)?.name}
                  </h4>
                  <div className="space-y-2">
                    {getCopingStrategies(showStrategies).map((strategy, i) => (
                      <CopingStrategyCard
                        key={i}
                        strategy={strategy}
                        onUsed={(s) => {
                          if (recentEntries[0] && !recentEntries[0].overcame) {
                            markOvercome(recentEntries[0].id, s);
                          }
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">Select a trigger to see strategies:</p>
                  {PROCRASTINATION_TRIGGERS.map(trigger => (
                    <button
                      key={trigger.id}
                      onClick={() => setShowStrategies(trigger.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                      <span className="text-xl">{trigger.emoji}</span>
                      <span>{trigger.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {recentEntries.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>No procrastination logged yet</p>
                </div>
              ) : (
                recentEntries.map(entry => (
                  <ProcrastinationLogEntry
                    key={entry.id}
                    entry={entry}
                    onMarkOvercome={markOvercome}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProcrastinationAnalysisModal;
