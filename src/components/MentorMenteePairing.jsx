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

// User roles
const ROLES = {
  MENTOR: 'mentor',
  MENTEE: 'mentee',
  BOTH: 'both'
};

// Expertise areas
const EXPERTISE_AREAS = [
  { id: 'productivity', name: 'Productivity Systems', emoji: '📊' },
  { id: 'adhd', name: 'ADHD Management', emoji: '🧠' },
  { id: 'time_management', name: 'Time Management', emoji: '⏰' },
  { id: 'focus', name: 'Deep Focus', emoji: '🎯' },
  { id: 'habits', name: 'Habit Building', emoji: '🔄' },
  { id: 'work_life', name: 'Work-Life Balance', emoji: '⚖️' },
  { id: 'motivation', name: 'Motivation', emoji: '💪' },
  { id: 'goals', name: 'Goal Setting', emoji: '🎯' },
  { id: 'anxiety', name: 'Managing Anxiety', emoji: '🧘' },
  { id: 'procrastination', name: 'Overcoming Procrastination', emoji: '🚀' }
];

// Hook for mentor/mentee pairing
export function useMentorMentee() {
  const [profile, setProfile] = useState(() =>
    Storage.get('mentorProfile', {
      role: null,
      expertise: [],
      seekingHelp: [],
      bio: '',
      availability: 'flexible',
      matchPreferences: {
        communicationStyle: 'text',
        frequency: 'weekly'
      }
    })
  );
  const [connections, setConnections] = useState(() =>
    Storage.get('mentorConnections', [])
  );
  const [messages, setMessages] = useState(() =>
    Storage.get('mentorMessages', {})
  );
  const [checkIns, setCheckIns] = useState(() =>
    Storage.get('mentorCheckIns', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('mentorProfile', profile);
  }, [profile]);

  useEffect(() => {
    Storage.set('mentorConnections', connections);
  }, [connections]);

  useEffect(() => {
    Storage.set('mentorMessages', messages);
  }, [messages]);

  useEffect(() => {
    Storage.set('mentorCheckIns', checkIns);
  }, [checkIns]);

  // Update profile
  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  // Add connection
  const addConnection = useCallback((user, role) => {
    const connection = {
      id: `conn_${Date.now()}`,
      ...user,
      role, // 'mentor' or 'mentee'
      status: 'pending',
      connectedAt: new Date().toISOString(),
      lastInteraction: null
    };

    setConnections(prev => [...prev, connection]);
    return connection;
  }, []);

  // Accept connection
  const acceptConnection = useCallback((connectionId) => {
    setConnections(prev => prev.map(c =>
      c.id === connectionId
        ? { ...c, status: 'active', acceptedAt: new Date().toISOString() }
        : c
    ));
  }, []);

  // Decline/remove connection
  const removeConnection = useCallback((connectionId) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  }, []);

  // Send message
  const sendMessage = useCallback((connectionId, text) => {
    const message = {
      id: `msg_${Date.now()}`,
      text,
      sentAt: new Date().toISOString(),
      fromMe: true
    };

    setMessages(prev => ({
      ...prev,
      [connectionId]: [...(prev[connectionId] || []), message]
    }));

    // Update last interaction
    setConnections(prev => prev.map(c =>
      c.id === connectionId
        ? { ...c, lastInteraction: new Date().toISOString() }
        : c
    ));

    return message;
  }, []);

  // Schedule check-in
  const scheduleCheckIn = useCallback((connectionId, date, topic = '') => {
    const checkIn = {
      id: `checkin_${Date.now()}`,
      connectionId,
      scheduledFor: date,
      topic,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    setCheckIns(prev => [...prev, checkIn]);
    return checkIn;
  }, []);

  // Complete check-in
  const completeCheckIn = useCallback((checkInId, notes = '') => {
    setCheckIns(prev => prev.map(c =>
      c.id === checkInId
        ? { ...c, status: 'completed', notes, completedAt: new Date().toISOString() }
        : c
    ));
  }, []);

  // Get active connections by role
  const getMentors = useCallback(() => {
    return connections.filter(c => c.role === 'mentor' && c.status === 'active');
  }, [connections]);

  const getMentees = useCallback(() => {
    return connections.filter(c => c.role === 'mentee' && c.status === 'active');
  }, [connections]);

  // Get upcoming check-ins
  const getUpcomingCheckIns = useCallback(() => {
    const now = new Date();
    return checkIns
      .filter(c => c.status === 'scheduled' && new Date(c.scheduledFor) > now)
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  }, [checkIns]);

  // Find compatible matches (simulated)
  const findMatches = useCallback(() => {
    // In a real app, this would call an API
    // For now, return simulated matches based on profile
    const simulatedMatches = [
      {
        id: 'match_1',
        name: 'Alex P.',
        avatar: '🧑‍💻',
        role: profile.role === ROLES.MENTEE ? 'mentor' : 'mentee',
        expertise: ['productivity', 'adhd'],
        bio: 'Productivity enthusiast with 5 years of ADHD management experience',
        matchScore: 95
      },
      {
        id: 'match_2',
        name: 'Sam K.',
        avatar: '👩‍🎓',
        role: profile.role === ROLES.MENTEE ? 'mentor' : 'mentee',
        expertise: ['time_management', 'focus'],
        bio: 'Time management coach specializing in deep work',
        matchScore: 88
      },
      {
        id: 'match_3',
        name: 'Jordan M.',
        avatar: '🧑‍🏫',
        role: profile.role === ROLES.MENTEE ? 'mentor' : 'mentee',
        expertise: ['habits', 'motivation'],
        bio: 'Habit formation expert and accountability partner',
        matchScore: 82
      }
    ];

    return simulatedMatches;
  }, [profile.role]);

  return {
    // State
    profile,
    connections,
    messages,
    checkIns,

    // Actions
    updateProfile,
    addConnection,
    acceptConnection,
    removeConnection,
    sendMessage,
    scheduleCheckIn,
    completeCheckIn,
    findMatches,

    // Getters
    getMentors,
    getMentees,
    getUpcomingCheckIns,

    // Constants
    ROLES,
    EXPERTISE_AREAS
  };
}

// Expertise Selector
export function ExpertiseSelector({ selected, onChange, label = "Select areas" }) {
  return (
    <div>
      {label && <label className="text-sm text-white/60 block mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {EXPERTISE_AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => {
              const newSelected = selected.includes(area.id)
                ? selected.filter(id => id !== area.id)
                : [...selected, area.id];
              onChange(newSelected);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
              selected.includes(area.id)
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <span>{area.emoji}</span>
            <span>{area.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Role Selector
export function RoleSelector({ role, onChange }) {
  const roles = [
    { id: ROLES.MENTEE, label: 'Looking for a Mentor', emoji: '🎓', desc: 'Get guidance from experienced users' },
    { id: ROLES.MENTOR, label: 'Want to be a Mentor', emoji: '🧑‍🏫', desc: 'Help others on their journey' },
    { id: ROLES.BOTH, label: 'Both', emoji: '🤝', desc: 'Learn and teach at the same time' }
  ];

  return (
    <div className="space-y-2">
      {roles.map(r => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={`w-full p-4 rounded-xl text-left transition-colors ${
            role === r.id
              ? 'bg-blue-500/20 ring-2 ring-blue-500/50'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{r.emoji}</span>
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-sm text-white/40">{r.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Match Card
export function MatchCard({ match, onConnect }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
          {match.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{match.name}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {match.matchScore}% match
            </span>
          </div>
          <p className="text-sm text-white/60 capitalize">{match.role}</p>
          <p className="text-sm mt-2">{match.bio}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {match.expertise.map(exp => {
              const area = EXPERTISE_AREAS.find(a => a.id === exp);
              return (
                <span key={exp} className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                  {area?.emoji} {area?.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <button
        onClick={() => onConnect(match)}
        className="w-full mt-4 glass-button py-2 bg-blue-500/20 hover:bg-blue-500/30"
      >
        🤝 Connect
      </button>
    </div>
  );
}

// Connection Card
export function ConnectionCard({ connection, messages, onMessage, onScheduleCheckIn }) {
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onMessage(connection.id, newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            {connection.avatar || '👤'}
          </div>
          <div>
            <h4 className="font-medium">{connection.name}</h4>
            <p className="text-xs text-white/40 capitalize">
              Your {connection.role}
              {connection.status === 'pending' && ' (pending)'}
            </p>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs ${
          connection.status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {connection.status}
        </div>
      </div>

      {connection.status === 'active' && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex-1 glass-button py-2 text-sm"
            >
              💬 Chat
            </button>
            <button
              onClick={() => onScheduleCheckIn(connection.id)}
              className="flex-1 glass-button py-2 text-sm"
            >
              📅 Check-in
            </button>
          </div>

          {showChat && (
            <div className="border-t border-white/10 pt-3">
              <div className="h-40 overflow-y-auto space-y-2 mb-2">
                {messages?.length === 0 ? (
                  <p className="text-center text-white/40 text-sm py-4">
                    No messages yet. Say hi!
                  </p>
                ) : (
                  messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded-lg text-sm max-w-[80%] ${
                        msg.fromMe
                          ? 'bg-blue-500/20 ml-auto'
                          : 'bg-white/10'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="glass-input flex-1 px-3 py-2 rounded-lg text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Check-in Card
export function CheckInCard({ checkIn, connection, onComplete }) {
  const isUpcoming = new Date(checkIn.scheduledFor) > new Date();

  return (
    <div className="p-3 rounded-lg bg-white/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Check-in with {connection?.name || 'Unknown'}</p>
          <p className="text-xs text-white/40">
            {new Date(checkIn.scheduledFor).toLocaleDateString()} at{' '}
            {new Date(checkIn.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {checkIn.topic && <p className="text-sm text-white/60 mt-1">{checkIn.topic}</p>}
        </div>
        {isUpcoming && checkIn.status === 'scheduled' && (
          <button
            onClick={() => onComplete(checkIn.id)}
            className="px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-sm"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

// Mentor/Mentee Modal
export function MentorMenteeModal({ isOpen, onClose, mentorState }) {
  const [activeTab, setActiveTab] = useState('connections');
  const [showSetup, setShowSetup] = useState(false);

  if (!isOpen) return null;

  const {
    profile,
    connections,
    messages,
    checkIns,
    updateProfile,
    addConnection,
    sendMessage,
    scheduleCheckIn,
    completeCheckIn,
    findMatches,
    getUpcomingCheckIns
  } = mentorState;

  const matches = profile.role ? findMatches() : [];
  const upcomingCheckIns = getUpcomingCheckIns();

  // Check if profile is set up
  if (!profile.role && !showSetup) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">🤝 Mentor/Mentee</h2>
          <p className="text-white/60 mb-6">
            Connect with accountability partners who can help you stay on track or share your experience with others.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="glass-button px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30"
          >
            Get Started
          </button>
          <button
            onClick={onClose}
            className="block w-full mt-3 text-white/40 hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  if (showSetup || !profile.role) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto p-4">
          <h2 className="text-lg font-bold mb-4">Set Up Your Profile</h2>

          <div className="space-y-4">
            <RoleSelector
              role={profile.role}
              onChange={(role) => updateProfile({ role })}
            />

            {(profile.role === ROLES.MENTOR || profile.role === ROLES.BOTH) && (
              <ExpertiseSelector
                selected={profile.expertise}
                onChange={(expertise) => updateProfile({ expertise })}
                label="Areas you can help with"
              />
            )}

            {(profile.role === ROLES.MENTEE || profile.role === ROLES.BOTH) && (
              <ExpertiseSelector
                selected={profile.seekingHelp}
                onChange={(seekingHelp) => updateProfile({ seekingHelp })}
                label="Areas you need help with"
              />
            )}

            <div>
              <label className="text-sm text-white/60 block mb-2">Short bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                placeholder="Tell others about yourself..."
                className="glass-input w-full px-4 py-3 rounded-xl resize-none h-20"
              />
            </div>

            <button
              onClick={() => setShowSetup(false)}
              disabled={!profile.role}
              className="w-full glass-button py-3 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🤝 Mentor/Mentee</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetup(true)}
              className="text-white/40 hover:text-white text-sm"
            >
              Edit Profile
            </button>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
        </div>

        <div className="flex border-b border-white/10">
          {['connections', 'find', 'check-ins'].map(tab => (
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
          {activeTab === 'connections' && (
            <div className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p className="text-4xl mb-2">🤝</p>
                  <p>No connections yet</p>
                  <p className="text-sm">Find mentors or mentees to connect with</p>
                </div>
              ) : (
                connections.map(conn => (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    messages={messages[conn.id] || []}
                    onMessage={sendMessage}
                    onScheduleCheckIn={(connId) => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(10, 0, 0, 0);
                      scheduleCheckIn(connId, tomorrow.toISOString());
                    }}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'find' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Based on your profile, here are some potential matches:
              </p>
              {matches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onConnect={(m) => addConnection(m, m.role)}
                />
              ))}
            </div>
          )}

          {activeTab === 'check-ins' && (
            <div className="space-y-4">
              {upcomingCheckIns.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>No upcoming check-ins</p>
                </div>
              ) : (
                upcomingCheckIns.map(checkIn => (
                  <CheckInCard
                    key={checkIn.id}
                    checkIn={checkIn}
                    connection={connections.find(c => c.id === checkIn.connectionId)}
                    onComplete={completeCheckIn}
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

export default MentorMenteeModal;
