'use client';

import { useState, useEffect, useCallback } from 'react';

// Apple Reminders Sync Component
export default function AppleRemindersSync({ userId = 'default_user', onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [lastSync, setLastSync] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Load last sync time from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('frog_apple_last_sync');
    if (saved) setLastSync(new Date(saved));
  }, []);
  
  // Sync secret (should match server)
  const SYNC_SECRET = 'frog-sync-2025';
  const API_URL = 'https://frog.newbold.cloud/api/apple-reminders';
  
  // Manual sync trigger (gets tasks to export)
  const handleExportToApple = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${API_URL}?secret=${SYNC_SECRET}&user_id=${userId}&filter=incomplete`);
      const data = await response.json();
      
      if (data.success) {
        setSyncResults({ exported: data.count, tasks: data.tasks });
        setSyncStatus('success');
        
        // Copy to clipboard for manual paste into Shortcuts
        const exportText = data.tasks.map(t => 
          `${t.title} | ${t.list} | Priority: ${t.priority === 1 ? 'High' : t.priority === 5 ? 'Medium' : 'Low'}`
        ).join('\n');
        
        await navigator.clipboard.writeText(exportText);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('Export error:', error);
    }
  }, [userId]);
  
  // Generate Apple Shortcut URL
  const getImportShortcutUrl = () => {
    // This creates a base64-encoded shortcut configuration
    const shortcutConfig = {
      WFWorkflowName: 'Sync Reminders to Frog',
      WFWorkflowDescription: 'Imports your Apple Reminders to Frog app',
      WFWorkflowActions: [
        { WFWorkflowActionIdentifier: 'is.workflow.actions.reminders.find' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.url.request' }
      ]
    };
    return `https://www.icloud.com/shortcuts/api/records/share`;
  };
  
  // Format relative time
  const formatLastSync = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <span className="text-2xl">🍎</span>
          </div>
          <div>
            <h3 className="text-white font-bold">Apple Reminders</h3>
            <p className="text-white/50 text-sm">
              Last sync: {formatLastSync(lastSync)}
            </p>
          </div>
        </div>
        
        {/* Sync Status Indicator */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400' :
          syncStatus === 'success' ? 'bg-green-500/20 text-green-400' :
          syncStatus === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-white/10 text-white/50'
        }`}>
          {syncStatus === 'syncing' ? '⟳ Syncing...' :
           syncStatus === 'success' ? '✓ Synced' :
           syncStatus === 'error' ? '✗ Error' :
           '○ Ready'}
        </div>
      </div>
      
      {/* Sync Results */}
      {syncResults && syncStatus === 'success' && (
        <div className="glass-card p-4 bg-green-500/10 border border-green-500/20 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">✓</span>
            <span className="text-green-400 font-medium">Export Ready!</span>
          </div>
          <p className="text-white/70 text-sm">
            {syncResults.exported} tasks copied to clipboard. Open Shortcuts app and paste into the import field.
          </p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleExportToApple}
          disabled={syncStatus === 'syncing'}
          className="glass-button p-4 rounded-2xl text-center hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <span className="text-2xl block mb-2">📤</span>
          <span className="text-white text-sm font-medium">Export to Apple</span>
          <span className="text-white/40 text-xs block mt-1">Copy tasks</span>
        </button>
        
        <button
          onClick={() => setShowShortcuts(true)}
          className="glass-button p-4 rounded-2xl text-center hover:bg-white/10 transition-all"
        >
          <span className="text-2xl block mb-2">📥</span>
          <span className="text-white text-sm font-medium">Import from Apple</span>
          <span className="text-white/40 text-xs block mt-1">Via Shortcuts</span>
        </button>
      </div>
      
      {/* Setup Instructions Toggle */}
      <button
        onClick={() => setShowSetup(!showSetup)}
        className="w-full glass-button p-3 rounded-xl flex items-center justify-between hover:bg-white/5"
      >
        <span className="text-white/70 text-sm flex items-center gap-2">
          <span>⚙️</span> Setup Instructions
        </span>
        <span className="text-white/40">{showSetup ? '▲' : '▼'}</span>
      </button>
      
      {/* Setup Panel */}
      {showSetup && (
        <div className="glass-card p-4 rounded-2xl space-y-4 animate-fade-in">
          <h4 className="text-white font-bold flex items-center gap-2">
            <span>📱</span> How to Set Up 2-Way Sync
          </h4>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="text-blue-400 font-bold">1</span>
              <div>
                <p className="text-white">Download the Apple Shortcut</p>
                <p className="text-white/50">Tap "Get Shortcut" below to add it to your Shortcuts app</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <span className="text-blue-400 font-bold">2</span>
              <div>
                <p className="text-white">Run the Shortcut</p>
                <p className="text-white/50">It will automatically sync your reminders with Frog</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <span className="text-blue-400 font-bold">3</span>
              <div>
                <p className="text-white">Set up Automation (Optional)</p>
                <p className="text-white/50">Create an automation to run daily for auto-sync</p>
              </div>
            </div>
          </div>
          
          {/* Shortcut Download Links */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <a
              href="shortcuts://import-shortcut?url=https://frog.newbold.cloud/shortcuts/sync-to-frog.shortcut"
              className="block w-full glass-button p-3 rounded-xl bg-blue-500/20 text-blue-400 text-center font-medium"
            >
              📥 Get "Import to Frog" Shortcut
            </a>
            <a
              href="shortcuts://import-shortcut?url=https://frog.newbold.cloud/shortcuts/export-from-frog.shortcut"
              className="block w-full glass-button p-3 rounded-xl bg-green-500/20 text-green-400 text-center font-medium"
            >
              📤 Get "Export from Frog" Shortcut
            </a>
          </div>
          
          {/* API Info for Advanced Users */}
          <details className="pt-3 border-t border-white/10">
            <summary className="text-white/50 text-xs cursor-pointer hover:text-white/70">
              🔧 Advanced: Manual API Setup
            </summary>
            <div className="mt-3 p-3 bg-black/30 rounded-xl">
              <p className="text-white/70 text-xs mb-2">API Endpoint:</p>
              <code className="text-green-400 text-xs break-all block mb-3">
                {API_URL}
              </code>
              <p className="text-white/70 text-xs mb-2">Secret Key:</p>
              <code className="text-yellow-400 text-xs">{SYNC_SECRET}</code>
            </div>
          </details>
        </div>
      )}
      
      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-fade-in"
             onClick={() => setShowShortcuts(false)}>
          <div className="glass-card p-6 rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Import from Apple</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-white/40 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <p className="text-white/70 text-sm">
                To import reminders from Apple, you need to use Apple Shortcuts. This allows automatic sync without giving Frog direct access to your reminders.
              </p>
              
              <div className="glass p-4 rounded-2xl bg-blue-500/10">
                <h4 className="text-white font-medium mb-2">Quick Setup</h4>
                <ol className="text-white/70 text-sm space-y-2 list-decimal list-inside">
                  <li>Tap the button below to add the shortcut</li>
                  <li>Run it from the Shortcuts app</li>
                  <li>Your reminders will sync to Frog!</li>
                </ol>
              </div>
              
              <a
                href="shortcuts://import-shortcut?url=https://frog.newbold.cloud/shortcuts/sync-to-frog.shortcut"
                className="block w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center font-bold text-lg"
              >
                Add Shortcut to My Device
              </a>
              
              <p className="text-white/40 text-xs text-center">
                Works on iPhone, iPad, and Mac with Shortcuts app
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact sync button for use in other places
export function AppleSyncButton({ onClick, syncing }) {
  return (
    <button
      onClick={onClick}
      disabled={syncing}
      className="glass-icon flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
    >
      <span className={syncing ? 'animate-spin' : ''}>🍎</span>
      <span className="text-white text-sm">{syncing ? 'Syncing...' : 'Sync'}</span>
    </button>
  );
}

// Hook for sync status
export function useAppleRemindersSync(userId = 'default_user') {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('frog_apple_last_sync');
    if (saved) setLastSync(new Date(saved));
  }, []);
  
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/apple-reminders?secret=frog-sync-2025&user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        setLastSync(now);
        localStorage.setItem('frog_apple_last_sync', now.toISOString());
      }
      return data;
    } finally {
      setSyncing(false);
    }
  }, [userId]);
  
  return { sync, syncing, lastSync };
}
