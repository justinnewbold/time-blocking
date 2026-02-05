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

// Share card templates
const SHARE_TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal',
    bgGradient: 'from-gray-900 to-gray-800',
    textColor: 'text-white'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bgGradient: 'from-orange-500 to-pink-600',
    textColor: 'text-white'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bgGradient: 'from-blue-500 to-cyan-600',
    textColor: 'text-white'
  },
  {
    id: 'forest',
    name: 'Forest',
    bgGradient: 'from-green-600 to-emerald-700',
    textColor: 'text-white'
  },
  {
    id: 'purple',
    name: 'Purple Haze',
    bgGradient: 'from-purple-600 to-indigo-700',
    textColor: 'text-white'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    bgGradient: 'from-gray-900 to-black',
    textColor: 'text-white'
  }
];

// Achievement types
const ACHIEVEMENT_TYPES = {
  STREAK: 'streak',
  TASKS_COMPLETED: 'tasks_completed',
  FOCUS_TIME: 'focus_time',
  FROG_EATEN: 'frog_eaten',
  LEVEL_UP: 'level_up',
  BADGE: 'badge',
  WEEKLY_GOAL: 'weekly_goal',
  CUSTOM: 'custom'
};

// Shareable platforms
const SHARE_PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'bg-blue-700' },
  { id: 'copy', name: 'Copy Link', icon: '📋', color: 'bg-gray-600' },
  { id: 'download', name: 'Download', icon: '💾', color: 'bg-green-600' }
];

// Hook for achievement sharing
export function useAchievementSharing() {
  const [sharedAchievements, setSharedAchievements] = useState(() =>
    Storage.get('sharedAchievements', [])
  );
  const [shareSettings, setShareSettings] = useState(() =>
    Storage.get('shareSettings', {
      autoShare: false,
      defaultTemplate: 'minimal',
      showStats: true,
      showStreak: true,
      username: '',
      includeAppLink: true
    })
  );

  // Save to storage
  useEffect(() => {
    Storage.set('sharedAchievements', sharedAchievements);
  }, [sharedAchievements]);

  useEffect(() => {
    Storage.set('shareSettings', shareSettings);
  }, [shareSettings]);

  // Create shareable content
  const createShareContent = useCallback((achievement, template = 'minimal') => {
    const shareId = `share_${Date.now()}`;

    let title = '';
    let emoji = '';
    let stats = [];

    switch (achievement.type) {
      case ACHIEVEMENT_TYPES.STREAK:
        emoji = '🔥';
        title = `${achievement.value} Day Streak!`;
        stats = [`${achievement.value} consecutive days`];
        break;

      case ACHIEVEMENT_TYPES.TASKS_COMPLETED:
        emoji = '✅';
        title = `Completed ${achievement.value} Tasks!`;
        stats = [`${achievement.value} tasks crushed`];
        break;

      case ACHIEVEMENT_TYPES.FOCUS_TIME:
        const hours = Math.floor(achievement.value / 60);
        const mins = achievement.value % 60;
        emoji = '⏱️';
        title = `${hours}h ${mins}m of Focus Time!`;
        stats = [`Deep work: ${hours} hours ${mins} minutes`];
        break;

      case ACHIEVEMENT_TYPES.FROG_EATEN:
        emoji = '🐸';
        title = `Ate ${achievement.value} Frogs!`;
        stats = [`${achievement.value} tough tasks conquered`];
        break;

      case ACHIEVEMENT_TYPES.LEVEL_UP:
        emoji = '🎮';
        title = `Reached Level ${achievement.value}!`;
        stats = [`Leveled up to ${achievement.value}`];
        break;

      case ACHIEVEMENT_TYPES.BADGE:
        emoji = '🏆';
        title = `Earned: ${achievement.badgeName}`;
        stats = [achievement.badgeDescription || ''];
        break;

      case ACHIEVEMENT_TYPES.WEEKLY_GOAL:
        emoji = '🎯';
        title = 'Weekly Goal Achieved!';
        stats = [achievement.goalDescription || 'Completed weekly target'];
        break;

      default:
        emoji = '⭐';
        title = achievement.title || 'Achievement Unlocked!';
        stats = [achievement.description || ''];
    }

    const shareContent = {
      id: shareId,
      type: achievement.type,
      title,
      emoji,
      stats,
      template,
      achievement,
      createdAt: new Date().toISOString(),
      shares: 0
    };

    return shareContent;
  }, []);

  // Record share
  const recordShare = useCallback((shareContent, platform) => {
    const shareRecord = {
      ...shareContent,
      sharedAt: new Date().toISOString(),
      platform,
      shares: shareContent.shares + 1
    };

    setSharedAchievements(prev => [shareRecord, ...prev].slice(0, 50));
    return shareRecord;
  }, []);

  // Generate share text
  const generateShareText = useCallback((content) => {
    let text = `${content.emoji} ${content.title}\n\n`;

    if (content.stats.length > 0) {
      text += content.stats.filter(s => s).join('\n') + '\n\n';
    }

    if (shareSettings.includeAppLink) {
      text += '#FocusFlow #Productivity';
    }

    return text;
  }, [shareSettings.includeAppLink]);

  // Share to platform
  const shareToPlattform = useCallback(async (content, platform) => {
    const text = generateShareText(content);

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          '_blank'
        );
        break;

      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`,
          '_blank'
        );
        break;

      case 'copy':
        try {
          await navigator.clipboard.writeText(text);
          return { success: true, message: 'Copied to clipboard!' };
        } catch (err) {
          return { success: false, message: 'Failed to copy' };
        }

      case 'download':
        // This would trigger canvas download in a real implementation
        return { success: true, message: 'Download started' };

      default:
        return { success: false, message: 'Unknown platform' };
    }

    recordShare(content, platform);
    return { success: true };
  }, [generateShareText, recordShare]);

  // Update settings
  const updateSettings = useCallback((updates) => {
    setShareSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Get share stats
  const getShareStats = useCallback(() => {
    const totalShares = sharedAchievements.reduce((sum, s) => sum + (s.shares || 1), 0);
    const byPlatform = sharedAchievements.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {});

    return { totalShares, byPlatform, totalAchievements: sharedAchievements.length };
  }, [sharedAchievements]);

  return {
    // State
    sharedAchievements,
    shareSettings,

    // Actions
    createShareContent,
    recordShare,
    generateShareText,
    shareToPlattform,
    updateSettings,
    getShareStats,

    // Constants
    SHARE_TEMPLATES,
    ACHIEVEMENT_TYPES,
    SHARE_PLATFORMS
  };
}

// Share Card Preview
export function ShareCardPreview({ content, template, username }) {
  const selectedTemplate = SHARE_TEMPLATES.find(t => t.id === template) || SHARE_TEMPLATES[0];

  return (
    <div className={`w-full aspect-video rounded-xl bg-gradient-to-br ${selectedTemplate.bgGradient} p-6 flex flex-col justify-between ${selectedTemplate.textColor}`}>
      <div>
        {username && (
          <p className="text-sm opacity-60">@{username}</p>
        )}
      </div>

      <div className="text-center">
        <span className="text-5xl">{content.emoji}</span>
        <h3 className="text-2xl font-bold mt-2">{content.title}</h3>
        {content.stats.length > 0 && (
          <p className="text-lg opacity-80 mt-1">{content.stats[0]}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs opacity-40">FocusFlow</span>
        <span className="text-xs opacity-40">
          {new Date(content.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// Template Selector
export function TemplateSelector({ selected, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {SHARE_TEMPLATES.map(template => (
        <button
          key={template.id}
          onClick={() => onChange(template.id)}
          className={`flex-shrink-0 w-20 h-12 rounded-lg bg-gradient-to-br ${template.bgGradient} transition-all ${
            selected === template.id ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <span className="text-xs text-white">{template.name}</span>
        </button>
      ))}
    </div>
  );
}

// Platform Share Buttons
export function PlatformShareButtons({ onShare }) {
  return (
    <div className="flex gap-2">
      {SHARE_PLATFORMS.map(platform => (
        <button
          key={platform.id}
          onClick={() => onShare(platform.id)}
          className={`flex-1 py-3 rounded-xl ${platform.color} text-white flex items-center justify-center gap-2 hover:opacity-90`}
        >
          <span>{platform.icon}</span>
          <span className="text-sm">{platform.name}</span>
        </button>
      ))}
    </div>
  );
}

// Recent Shares List
export function RecentSharesList({ shares }) {
  if (shares.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>No shares yet</p>
        <p className="text-sm">Share your first achievement!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shares.slice(0, 10).map(share => (
        <div key={share.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xl">{share.emoji}</span>
            <div>
              <p className="text-sm font-medium">{share.title}</p>
              <p className="text-xs text-white/40">
                Shared on {share.platform} • {new Date(share.sharedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Share Settings Panel
export function ShareSettingsPanel({ settings, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-white/60 block mb-1">Display Name</label>
        <input
          type="text"
          value={settings.username}
          onChange={(e) => onChange({ username: e.target.value })}
          placeholder="@username"
          className="glass-input w-full px-3 py-2 rounded-lg"
        />
      </div>

      <div>
        <label className="text-sm text-white/60 block mb-2">Default Template</label>
        <div className="flex gap-2">
          {SHARE_TEMPLATES.slice(0, 4).map(t => (
            <button
              key={t.id}
              onClick={() => onChange({ defaultTemplate: t.id })}
              className={`flex-1 py-2 rounded-lg bg-gradient-to-br ${t.bgGradient} text-xs text-white ${
                settings.defaultTemplate === t.id ? 'ring-2 ring-white' : 'opacity-60'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between">
        <span className="text-sm">Show stats on card</span>
        <button
          onClick={() => onChange({ showStats: !settings.showStats })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.showStats ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            settings.showStats ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>

      <label className="flex items-center justify-between">
        <span className="text-sm">Include app hashtags</span>
        <button
          onClick={() => onChange({ includeAppLink: !settings.includeAppLink })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.includeAppLink ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${
            settings.includeAppLink ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </label>
    </div>
  );
}

// Achievement Share Modal
export function AchievementShareModal({ isOpen, onClose, achievement, shareState }) {
  const [selectedTemplate, setSelectedTemplate] = useState(
    shareState.shareSettings.defaultTemplate
  );
  const [shareResult, setShareResult] = useState(null);

  if (!isOpen || !achievement) return null;

  const {
    createShareContent,
    shareToPlattform,
    shareSettings
  } = shareState;

  const content = createShareContent(achievement, selectedTemplate);

  const handleShare = async (platform) => {
    const result = await shareToPlattform(content, platform);
    setShareResult(result);

    if (result.success && result.message) {
      setTimeout(() => setShareResult(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📤 Share Achievement</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <ShareCardPreview
            content={content}
            template={selectedTemplate}
            username={shareSettings.username}
          />

          <div>
            <label className="text-sm text-white/60 block mb-2">Card Style</label>
            <TemplateSelector
              selected={selectedTemplate}
              onChange={setSelectedTemplate}
            />
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-2">Share to</label>
            <PlatformShareButtons onShare={handleShare} />
          </div>

          {shareResult && (
            <div className={`text-center p-3 rounded-lg ${
              shareResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {shareResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Share Button Component
export function ShareAchievementButton({ achievement, shareState, size = 'normal' }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`glass-button ${
          size === 'small' ? 'px-2 py-1 text-sm' : 'px-4 py-2'
        } bg-blue-500/20 hover:bg-blue-500/30`}
      >
        📤 Share
      </button>

      <AchievementShareModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        achievement={achievement}
        shareState={shareState}
      />
    </>
  );
}

export default AchievementShareModal;
