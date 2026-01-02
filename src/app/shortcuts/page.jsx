'use client';

import { useState } from 'react';

export default function ShortcutsPage() {
  const [copied, setCopied] = useState(null);
  
  const FROG_URL = 'https://frog.newbold.cloud';
  const SYNC_SECRET = 'frog-sync-2025';
  
  // Copy to clipboard helper
  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  
  // Shortcut configurations with step-by-step instructions
  const shortcuts = [
    {
      id: 'import',
      name: 'Sync Reminders → Frog',
      icon: '📥',
      color: 'from-blue-500 to-cyan-500',
      description: 'Import your Apple Reminders into Frog app',
      steps: [
        { action: 'Find All Reminders', note: 'Gets incomplete reminders from all lists' },
        { action: 'Repeat with Each', note: 'Loop through each reminder' },
        { action: 'Get Details of Reminder', note: 'Extract title, list, priority, notes' },
        { action: 'Add to Dictionary', note: 'Build JSON object for each reminder' },
        { action: 'Get Contents of URL', note: 'POST to Frog API endpoint' },
        { action: 'Show Result', note: 'Display sync confirmation' }
      ],
      apiEndpoint: `${FROG_URL}/api/apple-reminders`,
      method: 'POST',
      body: {
        secret: SYNC_SECRET,
        action: 'import',
        user_id: 'default_user',
        reminders: '[Array of reminder objects]'
      }
    },
    {
      id: 'export',
      name: 'Frog → Apple Reminders',
      icon: '📤',
      color: 'from-green-500 to-emerald-500',
      description: 'Export Frog tasks to Apple Reminders',
      steps: [
        { action: 'Get Contents of URL', note: 'GET Frog tasks from API' },
        { action: 'Get Dictionary Value', note: 'Extract tasks array' },
        { action: 'Repeat with Each', note: 'Loop through tasks' },
        { action: 'Add New Reminder', note: 'Create reminder with title, list, priority' },
        { action: 'Show Result', note: 'Display export confirmation' }
      ],
      apiEndpoint: `${FROG_URL}/api/apple-reminders?secret=${SYNC_SECRET}&user_id=default_user&filter=incomplete`,
      method: 'GET'
    },
    {
      id: 'complete',
      name: 'Mark Complete in Frog',
      icon: '✅',
      color: 'from-purple-500 to-pink-500',
      description: 'When you complete a reminder, mark it done in Frog too',
      steps: [
        { action: 'Shortcut Input', note: 'Receive reminder from automation' },
        { action: 'Get Details of Reminder', note: 'Get the reminder ID' },
        { action: 'Get Contents of URL', note: 'POST completion to Frog' },
        { action: 'Show Notification', note: 'Confirm sync' }
      ],
      apiEndpoint: `${FROG_URL}/api/apple-reminders`,
      method: 'POST',
      body: {
        secret: SYNC_SECRET,
        action: 'complete',
        user_id: 'default_user',
        apple_id: '[Reminder ID]'
      }
    }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl">🐸</span>
            <span className="text-3xl">+</span>
            <span className="text-5xl">🍎</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Apple Shortcuts Setup</h1>
          <p className="text-white/60">Set up 2-way sync between Frog and Apple Reminders</p>
        </div>
        
        {/* Shortcuts List */}
        <div className="space-y-6">
          {shortcuts.map((shortcut) => (
            <div 
              key={shortcut.id}
              className="bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10"
            >
              {/* Shortcut Header */}
              <div className={`bg-gradient-to-r ${shortcut.color} p-6`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{shortcut.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{shortcut.name}</h2>
                    <p className="text-white/80 text-sm">{shortcut.description}</p>
                  </div>
                </div>
              </div>
              
              {/* Steps */}
              <div className="p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span>📋</span> Shortcut Steps
                </h3>
                <div className="space-y-3">
                  {shortcut.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-blue-400 font-mono text-sm w-6">{i + 1}.</span>
                      <div>
                        <span className="text-white font-medium">{step.action}</span>
                        <span className="text-white/40 text-sm ml-2">— {step.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* API Details */}
                <div className="mt-6 p-4 bg-black/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-xs uppercase tracking-wide">API Endpoint</span>
                    <button
                      onClick={() => copyToClipboard(shortcut.apiEndpoint, `${shortcut.id}-url`)}
                      className="text-blue-400 text-xs hover:text-blue-300"
                    >
                      {copied === `${shortcut.id}-url` ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-green-400 text-xs break-all block">
                    {shortcut.apiEndpoint}
                  </code>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      shortcut.method === 'POST' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {shortcut.method}
                    </span>
                    <span className="text-white/40 text-xs">
                      Content-Type: application/json
                    </span>
                  </div>
                  
                  {shortcut.body && (
                    <div className="mt-3">
                      <span className="text-white/50 text-xs uppercase tracking-wide block mb-1">Request Body</span>
                      <pre className="text-yellow-400 text-xs overflow-x-auto">
                        {JSON.stringify(shortcut.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Start Guide */}
        <div className="mt-8 bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Quick Start Guide
          </h2>
          
          <div className="space-y-4 text-sm">
            <div className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</span>
              <div>
                <p className="text-white font-medium">Open Shortcuts App</p>
                <p className="text-white/50">On your iPhone, iPad, or Mac</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">2</span>
              <div>
                <p className="text-white font-medium">Create New Shortcut</p>
                <p className="text-white/50">Tap + and follow the steps above</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">3</span>
              <div>
                <p className="text-white font-medium">Set Up Automation (Optional)</p>
                <p className="text-white/50">Go to Automation tab → Create Personal Automation → Time of Day</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">✓</span>
              <div>
                <p className="text-white font-medium">Enjoy Automatic Sync!</p>
                <p className="text-white/50">Your reminders will stay in sync with Frog</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Back to App */}
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
          >
            <span>←</span> Back to Frog App
          </a>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-white/30 text-xs">
          <p>Frog + Apple Reminders Sync</p>
          <p className="mt-1">Compassionate productivity that works with your brain 🐸</p>
        </div>
      </div>
    </div>
  );
}
