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

// Challenge types
export const CHALLENGE_TYPES = [
  {
    id: 'frog-week',
    name: 'Frog Hunter',
    emoji: '🐸',
    description: 'Eat your frog every day this week',
    duration: 7,
    goal: 5,
    metric: 'frogsEaten',
    difficulty: 'medium',
    xpReward: 500
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    emoji: '🔥',
    description: 'Maintain a 7-day completion streak',
    duration: 7,
    goal: 7,
    metric: 'streakDays',
    difficulty: 'hard',
    xpReward: 750
  },
  {
    id: 'task-blitz',
    name: 'Task Blitz',
    emoji: '⚡',
    description: 'Complete 20 tasks this week',
    duration: 7,
    goal: 20,
    metric: 'tasksCompleted',
    difficulty: 'medium',
    xpReward: 400
  },
  {
    id: 'focus-champion',
    name: 'Focus Champion',
    emoji: '🎯',
    description: 'Log 10 hours of focused time',
    duration: 7,
    goal: 600, // minutes
    metric: 'focusMinutes',
    difficulty: 'hard',
    xpReward: 600
  },
  {
    id: 'quick-wins',
    name: 'Quick Win Warrior',
    emoji: '🚀',
    description: 'Complete 15 quick wins (under 15 min)',
    duration: 7,
    goal: 15,
    metric: 'quickWins',
    difficulty: 'easy',
    xpReward: 300
  },
  {
    id: 'hard-hitter',
    name: 'Hard Hitter',
    emoji: '💪',
    description: 'Complete 10 difficult tasks (level 4-5)',
    duration: 7,
    goal: 10,
    metric: 'hardTasks',
    difficulty: 'hard',
    xpReward: 800
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    emoji: '🌅',
    description: 'Complete a task before 9 AM for 5 days',
    duration: 7,
    goal: 5,
    metric: 'earlyTasks',
    difficulty: 'medium',
    xpReward: 450
  },
  {
    id: 'consistency-king',
    name: 'Consistency King',
    emoji: '👑',
    description: 'Complete at least 3 tasks every day for a week',
    duration: 7,
    goal: 7,
    metric: 'consistentDays',
    difficulty: 'hard',
    xpReward: 700
  }
];

// Hook to manage accountability challenges
export function useAccountabilityChallenges(completedTasks, streak, totalFocusMinutes) {
  const [challenges, setChallenges] = useState(() =>
    Storage.get('accountabilityChallenges', [])
  );
  const [completedChallenges, setCompletedChallenges] = useState(() =>
    Storage.get('completedChallenges', [])
  );
  const [friends, setFriends] = useState(() =>
    Storage.get('challengeFriends', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('accountabilityChallenges', challenges);
  }, [challenges]);

  useEffect(() => {
    Storage.set('completedChallenges', completedChallenges);
  }, [completedChallenges]);

  useEffect(() => {
    Storage.set('challengeFriends', friends);
  }, [friends]);

  // Calculate progress for a challenge
  const calculateProgress = useCallback((challenge) => {
    const startDate = new Date(challenge.startedAt);
    const now = new Date();

    // Get tasks completed during challenge period
    const challengeTasks = completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt || task.completed_at);
      return completedDate >= startDate && completedDate <= now;
    });

    let current = 0;

    switch (challenge.metric) {
      case 'frogsEaten':
        current = challengeTasks.filter(t => t.frog).length;
        break;
      case 'streakDays':
        current = streak;
        break;
      case 'tasksCompleted':
        current = challengeTasks.length;
        break;
      case 'focusMinutes':
        current = totalFocusMinutes;
        break;
      case 'quickWins':
        current = challengeTasks.filter(t => (t.estimatedMinutes || 25) <= 15).length;
        break;
      case 'hardTasks':
        current = challengeTasks.filter(t => (t.difficulty || 2) >= 4).length;
        break;
      case 'earlyTasks':
        const earlyDays = new Set();
        challengeTasks.forEach(t => {
          const date = new Date(t.completedAt || t.completed_at);
          if (date.getHours() < 9) {
            earlyDays.add(date.toDateString());
          }
        });
        current = earlyDays.size;
        break;
      case 'consistentDays':
        const dailyCounts = {};
        challengeTasks.forEach(t => {
          const dateKey = new Date(t.completedAt || t.completed_at).toDateString();
          dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        });
        current = Object.values(dailyCounts).filter(c => c >= 3).length;
        break;
    }

    return {
      current,
      goal: challenge.goal,
      percentage: Math.min(100, Math.round((current / challenge.goal) * 100)),
      isComplete: current >= challenge.goal
    };
  }, [completedTasks, streak, totalFocusMinutes]);

  // Start a new challenge
  const startChallenge = useCallback((challengeType, friendId = null) => {
    const template = CHALLENGE_TYPES.find(c => c.id === challengeType);
    if (!template) return null;

    const challenge = {
      ...template,
      instanceId: `${challengeType}_${Date.now()}`,
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + template.duration * 24 * 60 * 60 * 1000).toISOString(),
      friendId,
      status: 'active'
    };

    setChallenges(prev => [...prev, challenge]);
    return challenge;
  }, []);

  // Complete a challenge
  const completeChallenge = useCallback((instanceId) => {
    setChallenges(prev => prev.filter(c => c.instanceId !== instanceId));
    const challenge = challenges.find(c => c.instanceId === instanceId);
    if (challenge) {
      setCompletedChallenges(prev => [{
        ...challenge,
        completedAt: new Date().toISOString(),
        status: 'completed'
      }, ...prev].slice(0, 50));
    }
    return challenge?.xpReward || 0;
  }, [challenges]);

  // Abandon a challenge
  const abandonChallenge = useCallback((instanceId) => {
    setChallenges(prev => prev.filter(c => c.instanceId !== instanceId));
  }, []);

  // Check for expired challenges
  useEffect(() => {
    const now = new Date();
    challenges.forEach(challenge => {
      const endsAt = new Date(challenge.endsAt);
      if (now > endsAt) {
        const progress = calculateProgress(challenge);
        if (progress.isComplete) {
          completeChallenge(challenge.instanceId);
        } else {
          abandonChallenge(challenge.instanceId);
        }
      }
    });
  }, [challenges, calculateProgress, completeChallenge, abandonChallenge]);

  // Add a friend
  const addFriend = useCallback((friend) => {
    const newFriend = {
      ...friend,
      id: `friend_${Date.now()}`,
      addedAt: new Date().toISOString()
    };
    setFriends(prev => [...prev, newFriend]);
    return newFriend;
  }, []);

  // Remove a friend
  const removeFriend = useCallback((friendId) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
  }, []);

  // Get active challenges with progress
  const activeChallenges = useMemo(() => {
    return challenges.map(challenge => ({
      ...challenge,
      progress: calculateProgress(challenge)
    }));
  }, [challenges, calculateProgress]);

  // Get available challenges (not currently active)
  const availableChallenges = useMemo(() => {
    const activeIds = challenges.map(c => c.id);
    return CHALLENGE_TYPES.filter(c => !activeIds.includes(c.id));
  }, [challenges]);

  return {
    // State
    activeChallenges,
    availableChallenges,
    completedChallenges,
    friends,

    // Actions
    startChallenge,
    completeChallenge,
    abandonChallenge,
    addFriend,
    removeFriend,
    calculateProgress,

    // Data
    CHALLENGE_TYPES
  };
}

// Challenge Card Component
export function ChallengeCard({
  challenge,
  onStart,
  onAbandon,
  isActive = false
}) {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-white/60';
    }
  };

  const getDaysRemaining = () => {
    if (!challenge.endsAt) return null;
    const now = new Date();
    const end = new Date(challenge.endsAt);
    const days = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
    return days;
  };

  return (
    <div className={`glass-card p-4 ${isActive ? 'ring-2 ring-purple-500/30' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{challenge.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{challenge.name}</div>
            <span className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
              {challenge.difficulty}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">{challenge.description}</p>

          {isActive && challenge.progress && (
            <>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{challenge.progress.current} / {challenge.progress.goal}</span>
                  <span>{challenge.progress.percentage}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      challenge.progress.isComplete ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${challenge.progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* Days remaining */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-white/40">
                  {getDaysRemaining()} days remaining
                </span>
                <button
                  onClick={() => onAbandon(challenge.instanceId)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Abandon
                </button>
              </div>
            </>
          )}

          {!isActive && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-yellow-400">🏆 {challenge.xpReward} XP</span>
              <button
                onClick={() => onStart(challenge.id)}
                className="glass-button px-3 py-1 text-sm bg-purple-500/20 hover:bg-purple-500/30"
              >
                Start Challenge
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Friend Challenge Card
export function FriendChallengeCard({ friend, challenges, onChallenge, onRemove }) {
  const activeChallengeWithFriend = challenges.find(c => c.friendId === friend.id);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
          {friend.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{friend.name}</div>
          {friend.email && (
            <div className="text-xs text-white/40">{friend.email}</div>
          )}
        </div>
        <div className="flex gap-2">
          {!activeChallengeWithFriend && (
            <button
              onClick={() => onChallenge(friend.id)}
              className="glass-button px-3 py-1 text-sm bg-purple-500/20 hover:bg-purple-500/30"
            >
              Challenge
            </button>
          )}
          <button
            onClick={() => onRemove(friend.id)}
            className="glass-button px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30"
          >
            Remove
          </button>
        </div>
      </div>
      {activeChallengeWithFriend && (
        <div className="mt-3 p-2 rounded-lg bg-purple-500/10">
          <div className="text-sm">
            <span className="text-purple-400">Active challenge:</span>{' '}
            {activeChallengeWithFriend.name}
          </div>
        </div>
      )}
    </div>
  );
}

// Add Friend Modal
export function AddFriendModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (name.trim()) {
      onAdd({ name: name.trim(), email: email.trim() || null });
      setName('');
      setEmail('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-sm w-full p-6">
        <h3 className="text-lg font-bold mb-4">Add Accountability Partner</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friend's name"
              className="glass-input w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-white/60">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="glass-input w-full mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="glass-button flex-1 py-2">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="glass-button flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
          >
            Add Partner
          </button>
        </div>
      </div>
    </div>
  );
}

// Challenges Modal
export function ChallengesModal({
  isOpen,
  onClose,
  activeChallenges,
  availableChallenges,
  completedChallenges,
  friends,
  onStartChallenge,
  onAbandonChallenge,
  onAddFriend,
  onRemoveFriend
}) {
  const [activeTab, setActiveTab] = useState('active');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState(null);

  if (!isOpen) return null;

  const handleStartWithFriend = (challengeId) => {
    onStartChallenge(challengeId, selectedFriendForChallenge);
    setSelectedFriendForChallenge(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🏆 Accountability Challenges</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['active', 'available', 'friends', 'completed'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
              {tab === 'active' && activeChallenges.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-500/30 text-xs">
                  {activeChallenges.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'active' && (
            <div className="space-y-3">
              {activeChallenges.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <p>No active challenges</p>
                  <p className="text-sm mt-2">Start one from the Available tab!</p>
                </div>
              ) : (
                activeChallenges.map(challenge => (
                  <ChallengeCard
                    key={challenge.instanceId}
                    challenge={challenge}
                    isActive={true}
                    onAbandon={onAbandonChallenge}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'available' && (
            <div className="space-y-3">
              {availableChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onStart={onStartChallenge}
                />
              ))}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAddFriend(true)}
                className="glass-card p-4 w-full text-center hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">+</span>
                <div className="text-sm text-white/60">Add Partner</div>
              </button>

              {friends.length === 0 ? (
                <div className="text-center text-white/40 py-4">
                  <p>No accountability partners yet</p>
                  <p className="text-sm mt-2">Add friends to challenge each other!</p>
                </div>
              ) : (
                friends.map(friend => (
                  <FriendChallengeCard
                    key={friend.id}
                    friend={friend}
                    challenges={activeChallenges}
                    onChallenge={(friendId) => {
                      setSelectedFriendForChallenge(friendId);
                      setActiveTab('available');
                    }}
                    onRemove={onRemoveFriend}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div className="space-y-3">
              {completedChallenges.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <p>No completed challenges yet</p>
                  <p className="text-sm mt-2">Complete your first challenge to see it here!</p>
                </div>
              ) : (
                completedChallenges.map((challenge, i) => (
                  <div key={i} className="glass-card p-4 flex items-center gap-3">
                    <span className="text-2xl">{challenge.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium">{challenge.name}</div>
                      <div className="text-xs text-white/40">
                        Completed {new Date(challenge.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-green-400">✓ +{challenge.xpReward} XP</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected friend for challenge */}
        {selectedFriendForChallenge && activeTab === 'available' && (
          <div className="p-4 border-t border-white/10 bg-purple-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Challenging: {friends.find(f => f.id === selectedFriendForChallenge)?.name}
              </span>
              <button
                onClick={() => setSelectedFriendForChallenge(null)}
                className="text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <AddFriendModal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAdd={onAddFriend}
      />
    </div>
  );
}

export default ChallengesModal;
