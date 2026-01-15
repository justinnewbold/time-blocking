'use client';

import { useState } from 'react';

// Siri Shortcuts integration guide and shortcut generator
// Since web apps can't directly register Siri shortcuts, we provide:
// 1. API endpoints for shortcuts to call
// 2. Pre-built shortcut templates
// 3. Setup instructions

const SHORTCUT_TEMPLATES = [
  {
    id: 'add-task',
    name: 'Add Task to Frog',
    description: 'Quickly add a new task via voice',
    trigger: '"Hey Siri, add task to Frog"',
    icon: '➕',
    color: '#22c55e',
    steps: [
      'Ask for task name',
      'Send to Frog API',
      'Confirm task added'
    ],
    apiEndpoint: '/api/shortcuts/add-task',
    shortcutUrl: null // Will be generated
  },
  {
    id: 'whats-my-frog',
    name: "What's My Frog?",
    description: 'Hear your daily frog task',
    trigger: '"Hey Siri, what\'s my frog?"',
    icon: '🐸',
    color: '#10b981',
    steps: [
      'Fetch today\'s frog',
      'Speak the task name'
    ],
    apiEndpoint: '/api/widget?format=shortcuts',
    shortcutUrl: null
  },
  {
    id: 'daily-stats',
    name: 'Frog Daily Stats',
    description: 'Get a summary of your day',
    trigger: '"Hey Siri, Frog stats"',
    icon: '📊',
    color: '#3b82f6',
    steps: [
      'Fetch daily stats',
      'Speak tasks completed, streak, level'
    ],
    apiEndpoint: '/api/widget?type=stats&format=shortcuts',
    shortcutUrl: null
  },
  {
    id: 'energy-checkin',
    name: 'Frog Energy Check-in',
    description: 'Log your energy level',
    trigger: '"Hey Siri, Frog energy check"',
    icon: '⚡',
    color: '#f59e0b',
    steps: [
      'Ask energy level (1-4)',
      'Save to Frog',
      'Get task suggestions'
    ],
    apiEndpoint: '/api/shortcuts/energy',
    shortcutUrl: null
  },
  {
    id: 'complete-task',
    name: 'Complete Frog Task',
    description: 'Mark your frog as done',
    trigger: '"Hey Siri, I ate my frog"',
    icon: '✅',
    color: '#8b5cf6',
    steps: [
      'Mark daily frog complete',
      'Award XP',
      'Celebrate!'
    ],
    apiEndpoint: '/api/shortcuts/complete-frog',
    shortcutUrl: null
  },
  {
    id: 'start-focus',
    name: 'Start Frog Focus',
    description: 'Begin a focus session',
    trigger: '"Hey Siri, Frog focus time"',
    icon: '⏱️',
    color: '#ec4899',
    steps: [
      'Ask for duration',
      'Open Frog app',
      'Start timer'
    ],
    apiEndpoint: '/api/shortcuts/focus',
    shortcutUrl: null
  },
  {
    id: 'quick-wins',
    name: 'Frog Quick Wins',
    description: 'Get easy tasks for low energy',
    trigger: '"Hey Siri, Frog quick wins"',
    icon: '🏃',
    color: '#06b6d4',
    steps: [
      'Fetch quick win tasks',
      'List 3 easy tasks'
    ],
    apiEndpoint: '/api/widget?type=energy&format=shortcuts',
    shortcutUrl: null
  }
];

export default function SiriShortcuts({ onClose }) {
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');

  const generateShortcutCode = (shortcut) => {
    // Generate a simple Shortcuts-compatible URL scheme
    const endpoint = `${baseUrl}${shortcut.apiEndpoint}`;

    return `
// Shortcut: ${shortcut.name}
// Trigger: ${shortcut.trigger}

1. Open Shortcuts app
2. Create new shortcut
3. Add "Get Contents of URL" action
4. URL: ${endpoint}
5. Add "Get Dictionary Value" for the fields you need
6. Add "Show Result" or "Speak Text" action
7. Name it "${shortcut.name}"
8. Enable "Show in Widget" if desired
    `.trim();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-white/5 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎙️</span> Siri Shortcuts
          </h2>
          <button onClick={onClose} className="glass-icon-sm w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Introduction */}
          <div className="glass p-4 rounded-xl mb-4">
            <p className="text-white/70 text-sm mb-2">
              Control Frog with your voice using Siri Shortcuts. Set up these shortcuts to:
            </p>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• Add tasks hands-free</li>
              <li>• Check your daily frog</li>
              <li>• Log energy levels</li>
              <li>• Get productivity stats</li>
            </ul>
          </div>

          {/* Shortcut Templates */}
          <h3 className="text-white/60 text-sm mb-3">Available Shortcuts</h3>
          <div className="space-y-2">
            {SHORTCUT_TEMPLATES.map((shortcut) => (
              <button
                key={shortcut.id}
                onClick={() => setSelectedShortcut(
                  selectedShortcut?.id === shortcut.id ? null : shortcut
                )}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedShortcut?.id === shortcut.id
                    ? 'glass ring-2 ring-green-500'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${shortcut.color}30` }}
                  >
                    {shortcut.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{shortcut.name}</h4>
                    <p className="text-white/50 text-xs mt-0.5">{shortcut.description}</p>
                    <p className="text-green-400/70 text-xs mt-1 italic">
                      {shortcut.trigger}
                    </p>
                  </div>
                  <span className="text-white/30">
                    {selectedShortcut?.id === shortcut.id ? '▼' : '▶'}
                  </span>
                </div>

                {/* Expanded details */}
                {selectedShortcut?.id === shortcut.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h5 className="text-white/60 text-xs mb-2">Setup Steps:</h5>
                    <ol className="space-y-1 mb-4">
                      {shortcut.steps.map((step, i) => (
                        <li key={i} className="text-white/70 text-sm flex items-center gap-2">
                          <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>

                    {/* API Endpoint */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">API Endpoint:</p>
                      <code className="text-green-400 text-xs break-all">
                        {baseUrl}{shortcut.apiEndpoint}
                      </code>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(generateShortcutCode(shortcut));
                      }}
                      className="mt-3 w-full glass-button py-2 text-sm"
                    >
                      {copied ? '✓ Copied!' : '📋 Copy Setup Instructions'}
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Manual Setup Guide */}
          <div className="mt-6 glass p-4 rounded-xl">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <span>📖</span> Manual Setup Guide
            </h3>
            <ol className="text-white/70 text-sm space-y-2">
              <li>1. Open the <strong>Shortcuts</strong> app on your iPhone</li>
              <li>2. Tap <strong>+</strong> to create a new shortcut</li>
              <li>3. Add <strong>"Get Contents of URL"</strong> action</li>
              <li>4. Paste the API endpoint URL</li>
              <li>5. Add <strong>"Get Dictionary Value"</strong> to parse response</li>
              <li>6. Add <strong>"Speak Text"</strong> or <strong>"Show Result"</strong></li>
              <li>7. Name your shortcut and set a Siri phrase</li>
            </ol>
          </div>

          {/* Note about limitations */}
          <p className="text-white/30 text-xs mt-4 text-center">
            Note: Siri Shortcuts require iOS 12+ and the Shortcuts app
          </p>
        </div>
      </div>
    </div>
  );
}

// Shortcut API endpoints handler
export const shortcutEndpoints = {
  addTask: '/api/shortcuts/add-task',
  completeTask: '/api/shortcuts/complete-task',
  completeFrog: '/api/shortcuts/complete-frog',
  getStats: '/api/widget?format=shortcuts',
  getFrog: '/api/widget?format=shortcuts',
  setEnergy: '/api/shortcuts/energy',
  startFocus: '/api/shortcuts/focus'
};
