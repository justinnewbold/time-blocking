'use client';
import { useState, useEffect, useCallback } from 'react';

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

// Commitment types
const COMMITMENT_TYPES = {
  DAILY_GOAL: 'daily_goal',
  WEEKLY_GOAL: 'weekly_goal',
  PROJECT: 'project',
  HABIT: 'habit',
  CHALLENGE: 'challenge'
};

// Hook for public accountability board
export function usePublicAccountability() {
  const [commitments, setCommitments] = useState(() =>
    Storage.get('publicCommitments', [])
  );
  const [profile, setProfile] = useState(() =>
    Storage.get('accountabilityProfile', {
      displayName: '',
      avatar: '👤',
      streak: 0,
      totalCommitments: 0,
      completedCommitments: 0,
      isPublic: false
    })
  );
  const [followers, setFollowers] = useState(() =>
    Storage.get('accountabilityFollowers', [])
  );
  const [following, setFollowing] = useState(() =>
    Storage.get('accountabilityFollowing', [])
  );
  const [cheers, setCheers] = useState(() =>
    Storage.get('accountabilityCheers', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('publicCommitments', commitments);
  }, [commitments]);

  useEffect(() => {
    Storage.set('accountabilityProfile', profile);
  }, [profile]);

  useEffect(() => {
    Storage.set('accountabilityFollowers', followers);
  }, [followers]);

  useEffect(() => {
    Storage.set('accountabilityFollowing', following);
  }, [following]);

  useEffect(() => {
    Storage.set('accountabilityCheers', cheers);
  }, [cheers]);

  // Create commitment
  const createCommitment = useCallback((commitment) => {
    const newCommitment = {
      id: `commit_${Date.now()}`,
      ...commitment,
      type: commitment.type || COMMITMENT_TYPES.DAILY_GOAL,
      status: 'active',
      progress: 0,
      cheers: 0,
      comments: [],
      visibility: commitment.visibility || 'public',
      createdAt: new Date().toISOString(),
      deadline: commitment.deadline || null
    };

    setCommitments(prev => [newCommitment, ...prev]);

    setProfile(prev => ({
      ...prev,
      totalCommitments: prev.totalCommitments + 1
    }));

    return newCommitment;
  }, []);

  // Update commitment progress
  const updateProgress = useCallback((commitmentId, progress) => {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId
        ? { ...c, progress: Math.min(100, Math.max(0, progress)) }
        : c
    ));
  }, []);

  // Complete commitment
  const completeCommitment = useCallback((commitmentId) => {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId
        ? { ...c, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
        : c
    ));

    setProfile(prev => ({
      ...prev,
      completedCommitments: prev.completedCommitments + 1,
      streak: prev.streak + 1
    }));
  }, []);

  // Abandon commitment
  const abandonCommitment = useCallback((commitmentId, reason = '') => {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId
        ? { ...c, status: 'abandoned', abandonReason: reason, abandonedAt: new Date().toISOString() }
        : c
    ));

    setProfile(prev => ({
      ...prev,
      streak: 0
    }));
  }, []);

  // Add cheer to commitment
  const addCheer = useCallback((commitmentId, fromUser = 'Anonymous') => {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId ? { ...c, cheers: c.cheers + 1 } : c
    ));

    setCheers(prev => [
      {
        id: `cheer_${Date.now()}`,
        commitmentId,
        fromUser,
        timestamp: new Date().toISOString()
      },
      ...prev
    ].slice(0, 50));
  }, []);

  // Add comment to commitment
  const addComment = useCallback((commitmentId, comment, fromUser = 'Anonymous') => {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId
        ? {
            ...c,
            comments: [
              ...c.comments,
              {
                id: `comment_${Date.now()}`,
                text: comment,
                fromUser,
                timestamp: new Date().toISOString()
              }
            ]
          }
        : c
    ));
  }, []);

  // Update profile
  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  // Follow user
  const followUser = useCallback((userId, userName) => {
    setFollowing(prev => {
      if (prev.find(u => u.id === userId)) return prev;
      return [...prev, { id: userId, name: userName, followedAt: new Date().toISOString() }];
    });
  }, []);

  // Unfollow user
  const unfollowUser = useCallback((userId) => {
    setFollowing(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Get active commitments
  const getActiveCommitments = useCallback(() => {
    return commitments.filter(c => c.status === 'active');
  }, [commitments]);

  // Get commitment stats
  const getStats = useCallback(() => {
    const active = commitments.filter(c => c.status === 'active').length;
    const completed = commitments.filter(c => c.status === 'completed').length;
    const abandoned = commitments.filter(c => c.status === 'abandoned').length;
    const successRate = commitments.length > 0
      ? Math.round((completed / (completed + abandoned)) * 100) || 0
      : 0;

    return { active, completed, abandoned, successRate, total: commitments.length };
  }, [commitments]);

  return {
    // State
    commitments,
    profile,
    followers,
    following,
    cheers,

    // Actions
    createCommitment,
    updateProgress,
    completeCommitment,
    abandonCommitment,
    addCheer,
    addComment,
    updateProfile,
    followUser,
    unfollowUser,

    // Getters
    getActiveCommitments,
    getStats,

    // Constants
    COMMITMENT_TYPES
  };
}

// Profile Card
export function AccountabilityProfileCard({ profile, stats, onEdit }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl">
          {profile.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{profile.displayName || 'Anonymous'}</h3>
            {profile.isPublic && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">Public</span>
            )}
          </div>
          <p className="text-sm text-white/60">
            {profile.streak > 0 ? `🔥 ${profile.streak} day streak` : 'Start your streak!'}
          </p>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
            ✏️
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-xl font-bold">{stats.active}</p>
          <p className="text-xs text-white/40">Active</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-xl font-bold text-green-400">{stats.completed}</p>
          <p className="text-xs text-white/40">Done</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-xl font-bold">{stats.successRate}%</p>
          <p className="text-xs text-white/40">Success</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-xl font-bold">{profile.streak}</p>
          <p className="text-xs text-white/40">Streak</p>
        </div>
      </div>
    </div>
  );
}

// Commitment Card
export function CommitmentCard({ commitment, onCheer, onComplete, onUpdate, isOwner = false }) {
  const [showComments, setShowComments] = useState(false);

  const statusColors = {
    active: 'border-blue-500/30',
    completed: 'border-green-500/30',
    abandoned: 'border-red-500/30'
  };

  const typeEmojis = {
    [COMMITMENT_TYPES.DAILY_GOAL]: '🎯',
    [COMMITMENT_TYPES.WEEKLY_GOAL]: '📅',
    [COMMITMENT_TYPES.PROJECT]: '🚀',
    [COMMITMENT_TYPES.HABIT]: '🔄',
    [COMMITMENT_TYPES.CHALLENGE]: '💪'
  };

  return (
    <div className={`glass-card p-4 border ${statusColors[commitment.status]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeEmojis[commitment.type]}</span>
          <div>
            <h4 className="font-medium">{commitment.title}</h4>
            <p className="text-xs text-white/40">
              {new Date(commitment.createdAt).toLocaleDateString()}
              {commitment.deadline && ` • Due ${new Date(commitment.deadline).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {commitment.status === 'completed' && <span className="text-green-400">✓</span>}
      </div>

      {commitment.description && (
        <p className="text-sm text-white/60 mb-3">{commitment.description}</p>
      )}

      {/* Progress bar */}
      {commitment.status === 'active' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/40">Progress</span>
            <span>{commitment.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${commitment.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCheer(commitment.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
          >
            👏 {commitment.cheers}
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
          >
            💬 {commitment.comments?.length || 0}
          </button>
        </div>

        {isOwner && commitment.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(commitment.id, commitment.progress + 10)}
              className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-sm"
            >
              +10%
            </button>
            <button
              onClick={() => onComplete(commitment.id)}
              className="px-2 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-sm"
            >
              Complete
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && commitment.comments?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {commitment.comments.map(comment => (
            <div key={comment.id} className="text-sm">
              <span className="text-white/60">{comment.fromUser}: </span>
              <span>{comment.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Commitment Form
export function CreateCommitmentForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(COMMITMENT_TYPES.DAILY_GOAL);
  const [deadline, setDeadline] = useState('');
  const [visibility, setVisibility] = useState('public');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      deadline: deadline || null,
      visibility
    });

    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you committing to?"
        className="glass-input w-full px-4 py-3 rounded-xl"
        required
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Why is this important? (optional)"
        className="glass-input w-full px-4 py-3 rounded-xl resize-none h-20"
      />

      <div className="flex flex-wrap gap-2">
        {Object.entries(COMMITMENT_TYPES).map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(value)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              type === value
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {value.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-white/40 block mb-1">Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="glass-input w-full px-3 py-2 rounded-lg"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/40 block mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="glass-input w-full px-3 py-2 rounded-lg bg-transparent"
          >
            <option value="public" className="bg-gray-900">Public</option>
            <option value="followers" className="bg-gray-900">Followers Only</option>
            <option value="private" className="bg-gray-900">Private</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 glass-button py-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 glass-button py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
        >
          🎯 Make Commitment
        </button>
      </div>
    </form>
  );
}

// Accountability Board Modal
export function AccountabilityBoardModal({ isOpen, onClose, accountabilityState }) {
  const [activeTab, setActiveTab] = useState('commitments');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  const {
    commitments,
    profile,
    createCommitment,
    updateProgress,
    completeCommitment,
    addCheer,
    getStats
  } = accountabilityState;

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📢 Accountability Board</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex border-b border-white/10">
          {['commitments', 'profile'].map(tab => (
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
          {activeTab === 'commitments' && (
            <div className="space-y-4">
              {showCreateForm ? (
                <CreateCommitmentForm
                  onSubmit={(data) => {
                    createCommitment(data);
                    setShowCreateForm(false);
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full glass-button py-3 bg-blue-500/20 hover:bg-blue-500/30"
                >
                  ➕ New Commitment
                </button>
              )}

              {commitments.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p className="text-4xl mb-2">🎯</p>
                  <p>No commitments yet</p>
                  <p className="text-sm">Make your first public commitment!</p>
                </div>
              ) : (
                commitments.map(commitment => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onCheer={addCheer}
                    onComplete={completeCommitment}
                    onUpdate={updateProgress}
                    isOwner={true}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <AccountabilityProfileCard
              profile={profile}
              stats={stats}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountabilityBoardModal;
