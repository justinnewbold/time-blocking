'use client';

import { useState } from 'react';

// Apple Watch integration support
// Since native watchOS apps require Swift/SwiftUI, we provide:
// 1. Complication data API for Shortcuts-based complications
// 2. Watch-optimized web view instructions
// 3. Siri Shortcuts for quick watch interactions

const WATCH_FEATURES = [
  {
    id: 'complications',
    name: 'Watch Complications',
    description: 'Quick glance at your frog and stats right on your watch face',
    icon: '⌚',
    available: true,
    setup: [
      'Install "Shortcuts" on your Apple Watch',
      'Create a shortcut that fetches frog data',
      'Add shortcut as a complication'
    ]
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Complete tasks and log energy from your wrist',
    icon: '⚡',
    available: true,
    setup: [
      'Set up "Complete Frog" Siri Shortcut',
      'Say "Hey Siri, I ate my frog" on your watch',
      'Get haptic confirmation'
    ]
  },
  {
    id: 'notifications',
    name: 'Watch Notifications',
    description: 'Get gentle reminders on your watch',
    icon: '🔔',
    available: true,
    setup: [
      'Enable Frog notifications on your iPhone',
      'Notifications will mirror to your watch',
      'Customize in Watch app settings'
    ]
  },
  {
    id: 'siri',
    name: 'Siri on Watch',
    description: 'Voice control from your wrist',
    icon: '🎙️',
    available: true,
    setup: [
      'Set up Siri Shortcuts in the app',
      'Shortcuts sync to your Apple Watch',
      'Use voice commands hands-free'
    ]
  }
];

const COMPLICATION_TYPES = [
  {
    name: 'Circular',
    description: 'Shows frog emoji + tasks remaining',
    preview: '🐸 5',
    size: 'small'
  },
  {
    name: 'Modular Small',
    description: 'Frog status and streak',
    preview: '🐸 5🔥',
    size: 'small'
  },
  {
    name: 'Modular Large',
    description: 'Today\'s frog task name',
    preview: '🐸 Review Q4 reports',
    size: 'large'
  },
  {
    name: 'Utilitarian',
    description: 'Compact task count',
    preview: '5 tasks • Lv.12',
    size: 'medium'
  }
];

export default function AppleWatchCompanion({ onClose }) {
  const [activeTab, setActiveTab] = useState('features');
  const [selectedFeature, setSelectedFeature] = useState(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://frog.newbold.cloud';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-white/5 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⌚</span> Apple Watch
          </h2>
          <button onClick={onClose} className="glass-icon-sm w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['features', 'complications', 'setup'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm mb-4">
                Access Frog from your Apple Watch for quick productivity on the go.
              </p>

              {WATCH_FEATURES.map(feature => (
                <button
                  key={feature.id}
                  onClick={() => setSelectedFeature(
                    selectedFeature?.id === feature.id ? null : feature
                  )}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedFeature?.id === feature.id
                      ? 'glass ring-2 ring-green-500'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">{feature.name}</h4>
                        {feature.available && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-sm mt-1">{feature.description}</p>
                    </div>
                  </div>

                  {selectedFeature?.id === feature.id && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h5 className="text-white/60 text-xs mb-2">How to Set Up:</h5>
                      <ol className="space-y-2">
                        {feature.setup.map((step, i) => (
                          <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                            <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Complications Tab */}
          {activeTab === 'complications' && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm mb-4">
                Add Frog data to your watch face using Shortcuts complications.
              </p>

              {/* Complication previews */}
              <div className="grid grid-cols-2 gap-3">
                {COMPLICATION_TYPES.map((comp, i) => (
                  <div key={i} className="glass p-3 rounded-xl">
                    <div className={`bg-black/30 rounded-lg p-3 mb-2 text-center ${
                      comp.size === 'large' ? 'col-span-2' : ''
                    }`}>
                      <span className="text-white text-sm">{comp.preview}</span>
                    </div>
                    <h4 className="text-white text-sm font-medium">{comp.name}</h4>
                    <p className="text-white/50 text-xs">{comp.description}</p>
                  </div>
                ))}
              </div>

              {/* API endpoint for complications */}
              <div className="glass p-4 rounded-xl mt-4">
                <h4 className="text-white font-medium mb-2">Complication Data API</h4>
                <p className="text-white/50 text-sm mb-3">
                  Use this endpoint in Shortcuts to get watch-optimized data:
                </p>
                <code className="block bg-black/20 rounded-lg p-3 text-green-400 text-xs break-all">
                  {baseUrl}/api/widget?type=compact&format=shortcuts
                </code>
              </div>
            </div>
          )}

          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className="glass p-4 rounded-xl">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>📱</span> Requirements
                </h3>
                <ul className="text-white/70 text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Apple Watch Series 3 or later
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    watchOS 7.0 or later
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Shortcuts app on Watch
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    iPhone paired with watch
                  </li>
                </ul>
              </div>

              <div className="glass p-4 rounded-xl">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>🔧</span> Quick Setup Guide
                </h3>
                <ol className="text-white/70 text-sm space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                    <div>
                      <strong className="text-white">Enable Notifications</strong>
                      <p className="text-white/50 mt-1">Turn on Frog notifications in settings. They'll sync to your watch automatically.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                    <div>
                      <strong className="text-white">Set Up Siri Shortcuts</strong>
                      <p className="text-white/50 mt-1">Create shortcuts for common actions. They'll appear on your watch.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                    <div>
                      <strong className="text-white">Add Complications</strong>
                      <p className="text-white/50 mt-1">Add Shortcuts complications to your watch face for quick access.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                    <div>
                      <strong className="text-white">Use Voice Commands</strong>
                      <p className="text-white/50 mt-1">"Hey Siri, what's my frog?" works right from your wrist!</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Example Voice Commands */}
              <div className="glass p-4 rounded-xl">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>🎙️</span> Voice Commands on Watch
                </h3>
                <div className="space-y-2">
                  {[
                    '"Hey Siri, what\'s my frog?"',
                    '"Hey Siri, Frog stats"',
                    '"Hey Siri, I ate my frog"',
                    '"Hey Siri, add task to Frog"'
                  ].map((cmd, i) => (
                    <div key={i} className="bg-black/20 rounded-lg px-3 py-2">
                      <p className="text-green-400 text-sm italic">{cmd}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-white/30 text-xs text-center">
                Full native Apple Watch app coming soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Watch complication data endpoint helper
export function getWatchComplicationData(stats, frog) {
  return {
    circular: {
      emoji: '🐸',
      value: stats?.tasksRemaining || 0
    },
    modularSmall: {
      line1: `🐸 ${stats?.tasksRemaining || 0}`,
      line2: `${stats?.streak || 0}🔥`
    },
    modularLarge: {
      title: frog?.title || 'Select your frog',
      subtitle: `Lv.${stats?.level || 1} • ${stats?.xp || 0} XP`
    },
    utilitarian: {
      text: `${stats?.tasksRemaining || 0} tasks • Lv.${stats?.level || 1}`
    }
  };
}
