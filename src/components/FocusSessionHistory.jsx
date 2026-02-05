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

// Focus session types
export const SESSION_TYPES = {
  POMODORO: { id: 'pomodoro', name: 'Pomodoro', emoji: '🍅', defaultMinutes: 25 },
  DEEP_WORK: { id: 'deep_work', name: 'Deep Work', emoji: '🧠', defaultMinutes: 50 },
  SPRINT: { id: 'sprint', name: 'Sprint', emoji: '⚡', defaultMinutes: 15 },
  MICRO: { id: 'micro', name: 'Micro', emoji: '✨', defaultMinutes: 5 },
  CUSTOM: { id: 'custom', name: 'Custom', emoji: '⚙️', defaultMinutes: null }
};

// Hook to manage focus session history
export function useFocusSessionHistory() {
  const [sessions, setSessions] = useState(() =>
    Storage.get('focusSessions', [])
  );
  const [currentSession, setCurrentSession] = useState(null);

  // Save to storage
  useEffect(() => {
    Storage.set('focusSessions', sessions);
  }, [sessions]);

  // Start a new session
  const startSession = useCallback((taskId, taskTitle, plannedMinutes, sessionType = 'pomodoro') => {
    const session = {
      id: `session_${Date.now()}`,
      taskId,
      taskTitle,
      sessionType,
      plannedMinutes,
      startedAt: new Date().toISOString(),
      endedAt: null,
      actualMinutes: 0,
      completed: false,
      abandoned: false,
      distractions: [],
      notes: '',
      energy: null,
      productivity: null
    };

    setCurrentSession(session);
    return session;
  }, []);

  // End current session
  const endSession = useCallback((completed = true, notes = '', energy = null, productivity = null) => {
    if (!currentSession) return null;

    const endedAt = new Date();
    const startedAt = new Date(currentSession.startedAt);
    const actualMinutes = Math.round((endedAt - startedAt) / 60000);

    const completedSession = {
      ...currentSession,
      endedAt: endedAt.toISOString(),
      actualMinutes,
      completed,
      abandoned: !completed,
      notes,
      energy,
      productivity
    };

    setSessions(prev => [completedSession, ...prev].slice(0, 500));
    setCurrentSession(null);

    return completedSession;
  }, [currentSession]);

  // Add distraction to current session
  const addDistraction = useCallback((distraction) => {
    if (!currentSession) return;

    setCurrentSession(prev => ({
      ...prev,
      distractions: [...prev.distractions, {
        type: distraction,
        timestamp: new Date().toISOString()
      }]
    }));
  }, [currentSession]);

  // Get sessions for a date range
  const getSessionsForRange = useCallback((startDate, endDate) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.startedAt);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }, [sessions]);

  // Get today's sessions
  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getSessionsForRange(today, tomorrow);
  }, [sessions, getSessionsForRange]);

  // Get this week's sessions
  const weekSessions = useMemo(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return getSessionsForRange(weekAgo, today);
  }, [sessions, getSessionsForRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.completed);
    const abandoned = sessions.filter(s => s.abandoned);

    const totalMinutes = completed.reduce((sum, s) => sum + s.actualMinutes, 0);
    const totalPlanned = completed.reduce((sum, s) => sum + s.plannedMinutes, 0);

    // Average session length
    const avgMinutes = completed.length > 0
      ? Math.round(totalMinutes / completed.length)
      : 0;

    // Completion rate
    const completionRate = sessions.length > 0
      ? Math.round((completed.length / sessions.length) * 100)
      : 0;

    // Time accuracy (actual vs planned)
    const accuracyRate = totalPlanned > 0
      ? Math.round((totalMinutes / totalPlanned) * 100)
      : 100;

    // Distraction analysis
    const allDistractions = sessions.flatMap(s => s.distractions);
    const distractionCounts = {};
    allDistractions.forEach(d => {
      distractionCounts[d.type] = (distractionCounts[d.type] || 0) + 1;
    });

    // Average distractions per session
    const avgDistractions = sessions.length > 0
      ? Math.round((allDistractions.length / sessions.length) * 10) / 10
      : 0;

    // By session type
    const byType = {};
    Object.keys(SESSION_TYPES).forEach(type => {
      const typeSessions = completed.filter(s => s.sessionType === type.toLowerCase());
      byType[type] = {
        count: typeSessions.length,
        totalMinutes: typeSessions.reduce((sum, s) => sum + s.actualMinutes, 0)
      };
    });

    // Best time of day
    const hourCounts = {};
    completed.forEach(s => {
      const hour = new Date(s.startedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const bestHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Productivity distribution
    const productivityScores = completed
      .filter(s => s.productivity !== null)
      .map(s => s.productivity);
    const avgProductivity = productivityScores.length > 0
      ? Math.round((productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length) * 10) / 10
      : null;

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      abandonedSessions: abandoned.length,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      avgMinutes,
      completionRate,
      accuracyRate,
      distractionCounts,
      avgDistractions,
      byType,
      bestHour: bestHour ? parseInt(bestHour[0]) : null,
      avgProductivity
    };
  }, [sessions]);

  // Get streak (consecutive days with completed sessions)
  const focusStreak = useMemo(() => {
    const uniqueDays = new Set();
    sessions
      .filter(s => s.completed)
      .forEach(s => {
        uniqueDays.add(new Date(s.startedAt).toDateString());
      });

    const sortedDays = Array.from(uniqueDays)
      .map(d => new Date(d))
      .sort((a, b) => b - a);

    if (sortedDays.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (sortedDays[i - 1] - sortedDays[i]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [sessions]);

  // Delete session
  const deleteSession = useCallback((sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setSessions([]);
  }, []);

  return {
    // State
    sessions,
    currentSession,
    todaySessions,
    weekSessions,
    stats,
    focusStreak,

    // Actions
    startSession,
    endSession,
    addDistraction,
    getSessionsForRange,
    deleteSession,
    clearHistory,

    // Constants
    SESSION_TYPES
  };
}

// Session Card Component
export function SessionCard({ session, onDelete }) {
  const startTime = new Date(session.startedAt);
  const sessionTypeConfig = Object.values(SESSION_TYPES).find(t => t.id === session.sessionType);

  return (
    <div className={`glass-card p-4 ${session.abandoned ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{sessionTypeConfig?.emoji || '⏱️'}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">{session.taskTitle || 'Focus Session'}</div>
            {onDelete && (
              <button
                onClick={() => onDelete(session.id)}
                className="text-white/40 hover:text-red-400"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-sm text-white/60 mt-1">
            {session.actualMinutes} min • {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {session.completed ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                ✓ Completed
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                ✕ Abandoned
              </span>
            )}
            {session.distractions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                {session.distractions.length} distractions
              </span>
            )}
            {session.productivity && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                {session.productivity}/5 productivity
              </span>
            )}
          </div>
          {session.notes && (
            <p className="text-xs text-white/40 mt-2 italic">"{session.notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Stats Overview Component
export function SessionStatsOverview({ stats, focusStreak }) {
  return (
    <div className="space-y-4">
      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{stats.totalHours}h</div>
          <div className="text-sm text-white/60">Total Focus Time</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.completedSessions}</div>
          <div className="text-sm text-white/60">Sessions Completed</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{stats.completionRate}%</div>
          <div className="text-sm text-white/60">Completion Rate</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{focusStreak}</div>
          <div className="text-sm text-white/60">Day Streak</div>
        </div>
      </div>

      {/* Additional stats */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium text-white/60 mb-3">More Insights</h4>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-white/60">Avg Session:</div>
          <div>{stats.avgMinutes} min</div>
          <div className="text-white/60">Time Accuracy:</div>
          <div>{stats.accuracyRate}%</div>
          <div className="text-white/60">Avg Distractions:</div>
          <div>{stats.avgDistractions} per session</div>
          {stats.bestHour !== null && (
            <>
              <div className="text-white/60">Best Time:</div>
              <div>{stats.bestHour}:00 - {stats.bestHour + 1}:00</div>
            </>
          )}
          {stats.avgProductivity !== null && (
            <>
              <div className="text-white/60">Avg Productivity:</div>
              <div>{stats.avgProductivity}/5</div>
            </>
          )}
        </div>
      </div>

      {/* Session types breakdown */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium text-white/60 mb-3">By Session Type</h4>
        <div className="space-y-2">
          {Object.entries(stats.byType).map(([type, data]) => {
            if (data.count === 0) return null;
            const config = SESSION_TYPES[type];
            return (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{config?.emoji}</span>
                  <span>{config?.name}</span>
                </div>
                <div className="text-sm text-white/60">
                  {data.count} sessions • {Math.round(data.totalMinutes / 60 * 10) / 10}h
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top distractions */}
      {Object.keys(stats.distractionCounts).length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-medium text-white/60 mb-3">Top Distractions</h4>
          <div className="space-y-2">
            {Object.entries(stats.distractionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  <span className="text-sm text-white/60">{count}x</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Session End Modal
export function SessionEndModal({ isOpen, onClose, session, onSave }) {
  const [notes, setNotes] = useState('');
  const [energy, setEnergy] = useState(3);
  const [productivity, setProductivity] = useState(3);
  const [completed, setCompleted] = useState(true);

  if (!isOpen || !session) return null;

  const handleSave = () => {
    onSave(completed, notes, energy, productivity);
    setNotes('');
    setEnergy(3);
    setProductivity(3);
    setCompleted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-bold">📝 Session Complete</h2>

        <div>
          <label className="text-sm text-white/60">Did you complete your focus goal?</label>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setCompleted(true)}
              className={`flex-1 py-2 rounded-lg ${
                completed ? 'bg-green-500/30 ring-2 ring-green-500/50' : 'bg-white/10'
              }`}
            >
              ✓ Yes
            </button>
            <button
              onClick={() => setCompleted(false)}
              className={`flex-1 py-2 rounded-lg ${
                !completed ? 'bg-red-500/30 ring-2 ring-red-500/50' : 'bg-white/10'
              }`}
            >
              ✕ No
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-white/60">Energy level after session</label>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setEnergy(level)}
                className={`flex-1 py-2 rounded-lg text-lg ${
                  energy === level ? 'bg-yellow-500/30 ring-2 ring-yellow-500/50' : 'bg-white/10'
                }`}
              >
                {level <= 2 ? '😴' : level === 3 ? '😐' : level === 4 ? '😊' : '⚡'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/60">How productive were you? (1-5)</label>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setProductivity(level)}
                className={`flex-1 py-2 rounded-lg ${
                  productivity === level ? 'bg-purple-500/30 ring-2 ring-purple-500/50' : 'bg-white/10'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/60">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you accomplish? Any reflections?"
            className="glass-input w-full mt-2 h-20 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="glass-button flex-1 py-2">Skip</button>
          <button
            onClick={handleSave}
            className="glass-button flex-1 py-2 bg-green-500/20 hover:bg-green-500/30"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}

// Focus History Modal
export function FocusHistoryModal({
  isOpen,
  onClose,
  sessions,
  todaySessions,
  weekSessions,
  stats,
  focusStreak,
  onDeleteSession,
  onClearHistory
}) {
  const [activeTab, setActiveTab] = useState('today');

  if (!isOpen) return null;

  const displaySessions = activeTab === 'today' ? todaySessions :
                          activeTab === 'week' ? weekSessions : sessions;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📊 Focus Session History</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['today', 'week', 'all', 'stats'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-green-500 text-green-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'stats' ? (
            <SessionStatsOverview stats={stats} focusStreak={focusStreak} />
          ) : (
            <div className="space-y-3">
              {displaySessions.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <p>No sessions {activeTab === 'today' ? 'today' : activeTab === 'week' ? 'this week' : 'yet'}</p>
                  <p className="text-sm mt-2">Start focusing to see your history here!</p>
                </div>
              ) : (
                <>
                  {/* Group by date for 'all' tab */}
                  {activeTab === 'all' ? (
                    Object.entries(
                      displaySessions.reduce((groups, session) => {
                        const date = new Date(session.startedAt).toLocaleDateString();
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(session);
                        return groups;
                      }, {})
                    ).map(([date, dateSessions]) => (
                      <div key={date}>
                        <h4 className="text-sm text-white/60 mb-2">{date}</h4>
                        <div className="space-y-2">
                          {dateSessions.map(session => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              onDelete={onDeleteSession}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    displaySessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onDelete={onDeleteSession}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer with clear button */}
        {sessions.length > 0 && (
          <div className="p-4 border-t border-white/10 text-center">
            <button
              onClick={() => {
                if (confirm('Clear all session history? This cannot be undone.')) {
                  onClearHistory();
                }
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FocusHistoryModal;
