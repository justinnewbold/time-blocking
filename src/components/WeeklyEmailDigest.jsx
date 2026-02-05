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

// Digest sections
const DIGEST_SECTIONS = {
  SUMMARY: 'summary',
  ACCOMPLISHMENTS: 'accomplishments',
  STATS: 'stats',
  STREAKS: 'streaks',
  UPCOMING: 'upcoming',
  INSIGHTS: 'insights',
  MOTIVATION: 'motivation'
};

// Day preferences
const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' }
];

// Motivational quotes
const MOTIVATIONAL_QUOTES = [
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" }
];

// Hook for weekly email digest
export function useWeeklyEmailDigest(tasks = [], completedTasks = [], stats = {}) {
  const [digestSettings, setDigestSettings] = useState(() =>
    Storage.get('digestSettings', {
      enabled: true,
      email: '',
      sendDay: 0, // Sunday
      sendTime: '09:00',
      sections: Object.values(DIGEST_SECTIONS),
      includeMotivation: true,
      digestHistory: []
    })
  );
  const [lastDigest, setLastDigest] = useState(() =>
    Storage.get('lastDigest', null)
  );

  // Save to storage
  useEffect(() => {
    Storage.set('digestSettings', digestSettings);
  }, [digestSettings]);

  useEffect(() => {
    Storage.set('lastDigest', lastDigest);
  }, [lastDigest]);

  // Generate weekly summary
  const generateWeeklySummary = useCallback(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const weeklyCompleted = completedTasks.filter(t => {
      const completedDate = t.completedAt ? new Date(t.completedAt) : null;
      return completedDate && completedDate >= weekStart;
    });

    const weeklyTasks = tasks.filter(t => {
      const createdDate = t.created_at ? new Date(t.created_at) : null;
      return createdDate && createdDate >= weekStart;
    });

    // Calculate stats
    const totalCompleted = weeklyCompleted.length;
    const totalCreated = weeklyTasks.length;
    const completionRate = totalCreated > 0
      ? Math.round((totalCompleted / totalCreated) * 100)
      : 0;

    // Calculate focus time
    const totalFocusMinutes = weeklyCompleted.reduce(
      (sum, t) => sum + (t.actualMinutes || t.estimatedMinutes || 25), 0
    );

    // Count frogs eaten
    const frogsEaten = weeklyCompleted.filter(t => t.frog).length;

    // Get accomplishments (top 5 completed tasks)
    const accomplishments = weeklyCompleted
      .sort((a, b) => (b.difficulty || 2) - (a.difficulty || 2))
      .slice(0, 5);

    // Get upcoming tasks
    const upcoming = tasks
      .filter(t => !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    // Generate insights
    const insights = [];

    if (completionRate >= 80) {
      insights.push({
        emoji: '🎉',
        text: `Amazing week! You completed ${completionRate}% of your tasks.`
      });
    } else if (completionRate < 50 && totalCreated > 5) {
      insights.push({
        emoji: '💡',
        text: 'Consider setting fewer, more focused goals next week.'
      });
    }

    if (frogsEaten >= 3) {
      insights.push({
        emoji: '🐸',
        text: `You tackled ${frogsEaten} difficult tasks this week!`
      });
    }

    if (totalFocusMinutes >= 600) {
      const hours = Math.round(totalFocusMinutes / 60);
      insights.push({
        emoji: '⏱️',
        text: `${hours}+ hours of focused work this week. Impressive!`
      });
    }

    // Random motivational quote
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

    return {
      id: `digest_${Date.now()}`,
      weekStart: weekStart.toISOString(),
      weekEnd: now.toISOString(),
      generatedAt: now.toISOString(),
      stats: {
        totalCompleted,
        totalCreated,
        completionRate,
        totalFocusMinutes,
        focusHours: Math.round(totalFocusMinutes / 60),
        frogsEaten,
        currentStreak: stats.streak || 0
      },
      accomplishments,
      upcoming,
      insights,
      quote
    };
  }, [tasks, completedTasks, stats]);

  // Generate digest HTML
  const generateDigestHTML = useCallback((digest) => {
    const { stats: digestStats, accomplishments, upcoming, insights, quote } = digest;

    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1; text-align: center;">📊 Your Weekly FocusFlow Digest</h1>
        <p style="color: #666; text-align: center;">Week of ${new Date(digest.weekStart).toLocaleDateString()} - ${new Date(digest.weekEnd).toLocaleDateString()}</p>
    `;

    // Summary section
    if (digestSettings.sections.includes(DIGEST_SECTIONS.SUMMARY)) {
      html += `
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h2 style="margin-top: 0;">📈 This Week at a Glance</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${digestStats.totalCompleted}</div>
              <div style="color: #666; font-size: 14px;">Tasks Completed</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #6366f1;">${digestStats.focusHours}h</div>
              <div style="color: #666; font-size: 14px;">Focus Time</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${digestStats.frogsEaten} 🐸</div>
              <div style="color: #666; font-size: 14px;">Frogs Eaten</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${digestStats.currentStreak} 🔥</div>
              <div style="color: #666; font-size: 14px;">Day Streak</div>
            </div>
          </div>
        </div>
      `;
    }

    // Accomplishments
    if (digestSettings.sections.includes(DIGEST_SECTIONS.ACCOMPLISHMENTS) && accomplishments.length > 0) {
      html += `
        <div style="margin: 20px 0;">
          <h2>🏆 Top Accomplishments</h2>
          <ul style="list-style: none; padding: 0;">
            ${accomplishments.map(task => `
              <li style="padding: 10px; margin: 5px 0; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                ✅ ${task.title}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Upcoming
    if (digestSettings.sections.includes(DIGEST_SECTIONS.UPCOMING) && upcoming.length > 0) {
      html += `
        <div style="margin: 20px 0;">
          <h2>📅 Coming Up Next Week</h2>
          <ul style="list-style: none; padding: 0;">
            ${upcoming.map(task => `
              <li style="padding: 10px; margin: 5px 0; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                ${task.frog ? '🐸 ' : '📌 '}${task.title}
                ${task.dueDate ? `<span style="color: #666; font-size: 12px;"> - Due ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Insights
    if (digestSettings.sections.includes(DIGEST_SECTIONS.INSIGHTS) && insights.length > 0) {
      html += `
        <div style="margin: 20px 0;">
          <h2>💡 Insights</h2>
          ${insights.map(insight => `
            <p style="padding: 10px; background: #fef3c7; border-radius: 8px;">
              ${insight.emoji} ${insight.text}
            </p>
          `).join('')}
        </div>
      `;
    }

    // Motivation
    if (digestSettings.includeMotivation && quote) {
      html += `
        <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; color: white; text-align: center;">
          <p style="font-size: 18px; font-style: italic; margin: 0;">"${quote.text}"</p>
          <p style="margin: 10px 0 0; opacity: 0.8;">— ${quote.author}</p>
        </div>
      `;
    }

    // Footer
    html += `
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Keep up the great work! 💪</p>
          <p>Sent with ❤️ from FocusFlow</p>
        </div>
      </div>
    `;

    return html;
  }, [digestSettings]);

  // Preview digest
  const previewDigest = useCallback(() => {
    const digest = generateWeeklySummary();
    return {
      digest,
      html: generateDigestHTML(digest)
    };
  }, [generateWeeklySummary, generateDigestHTML]);

  // Send digest (simulated)
  const sendDigest = useCallback(async () => {
    if (!digestSettings.email) {
      return { success: false, message: 'No email configured' };
    }

    const digest = generateWeeklySummary();
    const html = generateDigestHTML(digest);

    // In a real app, this would call an API to send the email
    // For now, we just simulate it
    console.log('Sending digest to:', digestSettings.email);
    console.log('Digest content:', html);

    // Save to history
    setDigestSettings(prev => ({
      ...prev,
      digestHistory: [
        {
          id: digest.id,
          sentAt: new Date().toISOString(),
          email: digestSettings.email
        },
        ...(prev.digestHistory || [])
      ].slice(0, 52) // Keep 1 year of history
    }));

    setLastDigest(digest);

    return { success: true, message: 'Digest sent successfully!' };
  }, [digestSettings, generateWeeklySummary, generateDigestHTML]);

  // Update settings
  const updateSettings = useCallback((updates) => {
    setDigestSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle section
  const toggleSection = useCallback((section) => {
    setDigestSettings(prev => {
      const sections = prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section];
      return { ...prev, sections };
    });
  }, []);

  // Check if digest should be sent
  const shouldSendDigest = useCallback(() => {
    if (!digestSettings.enabled || !digestSettings.email) return false;

    const now = new Date();
    const [hour, minute] = digestSettings.sendTime.split(':').map(Number);

    // Check if it's the right day and time
    if (now.getDay() !== digestSettings.sendDay) return false;
    if (now.getHours() !== hour || now.getMinutes() < minute) return false;

    // Check if we already sent today
    if (lastDigest) {
      const lastSentDate = new Date(lastDigest.generatedAt).toDateString();
      if (lastSentDate === now.toDateString()) return false;
    }

    return true;
  }, [digestSettings, lastDigest]);

  return {
    // State
    digestSettings,
    lastDigest,

    // Actions
    updateSettings,
    toggleSection,
    previewDigest,
    sendDigest,
    shouldSendDigest,
    generateWeeklySummary,

    // Constants
    DIGEST_SECTIONS,
    DAYS_OF_WEEK
  };
}

// Section Toggle
export function DigestSectionToggle({ section, enabled, onToggle, label }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onToggle(section)}
        className={`w-10 h-5 rounded-full transition-colors ${
          enabled ? 'bg-green-500' : 'bg-white/20'
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </label>
  );
}

// Digest Preview Card
export function DigestPreviewCard({ digest }) {
  if (!digest) return null;

  const { stats, accomplishments, quote } = digest;

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">📧 Digest Preview</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-white/5">
          <p className="text-2xl font-bold text-green-400">{stats.totalCompleted}</p>
          <p className="text-xs text-white/40">Completed</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5">
          <p className="text-2xl font-bold text-blue-400">{stats.focusHours}h</p>
          <p className="text-xs text-white/40">Focus Time</p>
        </div>
      </div>

      {accomplishments.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm text-white/60 mb-2">Top Accomplishments</h4>
          <div className="space-y-1">
            {accomplishments.slice(0, 3).map(task => (
              <div key={task.id} className="text-sm p-2 rounded bg-green-500/10">
                ✅ {task.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {quote && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20">
          <p className="text-sm italic">"{quote.text}"</p>
          <p className="text-xs text-white/40 mt-1">— {quote.author}</p>
        </div>
      )}
    </div>
  );
}

// Digest Settings Panel
export function DigestSettingsPanel({ settings, onChange, onToggleSection }) {
  const sectionLabels = {
    [DIGEST_SECTIONS.SUMMARY]: '📈 Weekly Summary',
    [DIGEST_SECTIONS.ACCOMPLISHMENTS]: '🏆 Top Accomplishments',
    [DIGEST_SECTIONS.STATS]: '📊 Detailed Stats',
    [DIGEST_SECTIONS.STREAKS]: '🔥 Streak Progress',
    [DIGEST_SECTIONS.UPCOMING]: '📅 Upcoming Tasks',
    [DIGEST_SECTIONS.INSIGHTS]: '💡 Insights',
    [DIGEST_SECTIONS.MOTIVATION]: '✨ Motivational Quote'
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-white/60 block mb-1">Email Address</label>
        <input
          type="email"
          value={settings.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="your@email.com"
          className="glass-input w-full px-3 py-2 rounded-lg"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm text-white/60 block mb-1">Send Day</label>
          <select
            value={settings.sendDay}
            onChange={(e) => onChange({ sendDay: parseInt(e.target.value) })}
            className="glass-input w-full px-3 py-2 rounded-lg bg-transparent"
          >
            {DAYS_OF_WEEK.map(day => (
              <option key={day.id} value={day.id} className="bg-gray-900">
                {day.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-sm text-white/60 block mb-1">Send Time</label>
          <input
            type="time"
            value={settings.sendTime}
            onChange={(e) => onChange({ sendTime: e.target.value })}
            className="glass-input w-full px-3 py-2 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-white/60 block mb-2">Include Sections</label>
        <div className="space-y-1">
          {Object.entries(sectionLabels).map(([section, label]) => (
            <DigestSectionToggle
              key={section}
              section={section}
              enabled={settings.sections.includes(section)}
              onToggle={onToggleSection}
              label={label}
            />
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between">
        <span className="text-sm">Enable weekly digest</span>
        <button
          onClick={() => onChange({ enabled: !settings.enabled })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.enabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>
    </div>
  );
}

// Digest History List
export function DigestHistoryList({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4 text-white/40">
        <p>No digests sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, 10).map(item => (
        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
          <div>
            <p className="text-sm">Sent to {item.email}</p>
            <p className="text-xs text-white/40">
              {new Date(item.sentAt).toLocaleDateString()}
            </p>
          </div>
          <span className="text-green-400">✓</span>
        </div>
      ))}
    </div>
  );
}

// Weekly Digest Modal
export function WeeklyDigestModal({ isOpen, onClose, digestState }) {
  const [activeTab, setActiveTab] = useState('preview');
  const [sendResult, setSendResult] = useState(null);

  if (!isOpen) return null;

  const {
    digestSettings,
    updateSettings,
    toggleSection,
    previewDigest,
    sendDigest
  } = digestState;

  const { digest } = previewDigest();

  const handleSend = async () => {
    const result = await sendDigest();
    setSendResult(result);
    setTimeout(() => setSendResult(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📧 Weekly Digest</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex border-b border-white/10">
          {['preview', 'settings', 'history'].map(tab => (
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
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <DigestPreviewCard digest={digest} />

              {sendResult && (
                <div className={`text-center p-3 rounded-lg ${
                  sendResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {sendResult.message}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={!digestSettings.email}
                className="w-full glass-button py-3 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
              >
                📤 Send Test Digest
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <DigestSettingsPanel
              settings={digestSettings}
              onChange={updateSettings}
              onToggleSection={toggleSection}
            />
          )}

          {activeTab === 'history' && (
            <DigestHistoryList history={digestSettings.digestHistory} />
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyDigestModal;
