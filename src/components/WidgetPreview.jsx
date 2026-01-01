'use client';

import { useState, useEffect } from 'react';

// iOS Widget preview and setup instructions
export default function WidgetPreview({ 
  frog = null, 
  stats = {},
  onClose 
}) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const shortcutUrl = `https://www.icloud.com/shortcuts/frog-widget`;
  const widgetApiUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/widget`;
  
  const copyApiUrl = () => {
    navigator.clipboard?.writeText(widgetApiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass-card p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📱</span> iOS Widget
          </h2>
          <button 
            onClick={onClose}
            className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60"
          >
            ✕
          </button>
        </div>
        
        {/* Widget Preview */}
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-3">Widget Preview</p>
          
          {/* Small Widget */}
          <div className="flex gap-3 mb-4">
            <div className="w-[155px] h-[155px] bg-gradient-to-br from-green-600/90 to-emerald-800/90 rounded-[22px] p-3 flex flex-col justify-between shadow-xl">
              <div>
                <p className="text-white/70 text-[11px]">{today}</p>
                <p className="text-white font-semibold text-lg mt-1">
                  {frog ? '🐸 Eat your frog!' : '🐸 Frog'}
                </p>
              </div>
              <div>
                {frog ? (
                  <p className="text-white/90 text-sm line-clamp-2">{frog.title}</p>
                ) : (
                  <p className="text-white/60 text-xs">No frog selected</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-white/70 text-[10px]">Lv.{stats.level || 1}</span>
                  <span className="text-white/70 text-[10px]">•</span>
                  <span className="text-white/70 text-[10px]">{stats.tasksRemaining || 0} tasks</span>
                </div>
              </div>
            </div>
            
            {/* Medium Widget */}
            <div className="flex-1 h-[155px] bg-gradient-to-br from-green-600/90 to-emerald-800/90 rounded-[22px] p-3 flex flex-col justify-between shadow-xl">
              <div className="flex justify-between">
                <div>
                  <p className="text-white/70 text-[11px]">{today}</p>
                  <p className="text-white font-semibold">Today's Frog</p>
                </div>
                <span className="text-3xl">🐸</span>
              </div>
              <div>
                {frog ? (
                  <>
                    <p className="text-white/90 font-medium">{frog.title}</p>
                    <p className="text-white/60 text-xs mt-1">{frog.category}</p>
                  </>
                ) : (
                  <p className="text-white/60 text-sm">Open Frog to select your daily frog</p>
                )}
              </div>
              <div className="flex gap-3">
                <div>
                  <p className="text-white font-bold">{stats.tasksCompleted || 0}</p>
                  <p className="text-white/50 text-[10px]">Done</p>
                </div>
                <div>
                  <p className="text-white font-bold">{stats.tasksRemaining || 0}</p>
                  <p className="text-white/50 text-[10px]">Left</p>
                </div>
                <div>
                  <p className="text-white font-bold">{stats.streak || 0}🔥</p>
                  <p className="text-white/50 text-[10px]">Streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Setup Instructions */}
        <div className="space-y-4">
          <p className="text-white/60 text-sm">How to Add Widget</p>
          
          {/* Method 1: iOS Shortcuts */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium flex items-center gap-2 mb-2">
              <span>⚡</span> Method 1: iOS Shortcuts (Recommended)
            </h3>
            <ol className="text-white/70 text-sm space-y-2">
              <li>1. Open <strong>Shortcuts</strong> app on your iPhone</li>
              <li>2. Create a new shortcut</li>
              <li>3. Add "Get Contents of URL" action</li>
              <li>4. Set URL to the API endpoint below</li>
              <li>5. Add "Show Result" action</li>
              <li>6. Add shortcut to Home Screen</li>
            </ol>
            
            {/* API URL */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                readOnly
                value={widgetApiUrl}
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-xs"
              />
              <button
                onClick={copyApiUrl}
                className="glass-button px-3 py-2 rounded-lg text-sm"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>
          
          {/* Method 2: Web Clip */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium flex items-center gap-2 mb-2">
              <span>🔗</span> Method 2: Home Screen Bookmark
            </h3>
            <ol className="text-white/70 text-sm space-y-2">
              <li>1. Open Frog in Safari</li>
              <li>2. Tap the Share button</li>
              <li>3. Select "Add to Home Screen"</li>
              <li>4. The app icon acts as a quick launcher</li>
            </ol>
          </div>
          
          {/* Method 3: Scriptable */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium flex items-center gap-2 mb-2">
              <span>📝</span> Method 3: Scriptable Widget
            </h3>
            <p className="text-white/70 text-sm mb-2">
              For a true widget experience, use the Scriptable app:
            </p>
            <ol className="text-white/70 text-sm space-y-2">
              <li>1. Install <strong>Scriptable</strong> from App Store</li>
              <li>2. Create new script with our widget code</li>
              <li>3. Add Scriptable widget to Home Screen</li>
              <li>4. Select your Frog script</li>
            </ol>
            
            <button
              onClick={() => {
                const script = `
// Frog Widget for Scriptable
const API = "${widgetApiUrl}";

async function createWidget() {
  const data = await fetchData();
  const w = new ListWidget();
  w.backgroundColor = new Color("#166534");
  
  const title = w.addText("🐸 " + (data.frog?.title || "No frog today"));
  title.textColor = Color.white();
  title.font = Font.boldSystemFont(14);
  
  w.addSpacer(4);
  
  const stats = w.addText("Lv." + data.stats.level + " • " + data.stats.tasksRemaining + " tasks");
  stats.textColor = new Color("#ffffff", 0.7);
  stats.font = Font.systemFont(11);
  
  return w;
}

async function fetchData() {
  const req = new Request(API);
  return await req.loadJSON();
}

const widget = await createWidget();
Script.setWidget(widget);
Script.complete();
                `.trim();
                navigator.clipboard?.writeText(script);
                alert('Scriptable code copied! Paste it in the Scriptable app.');
              }}
              className="mt-2 glass-button px-4 py-2 rounded-lg text-sm w-full"
            >
              Copy Scriptable Code
            </button>
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full glass-button py-3 rounded-xl text-white font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

// Mini widget component for embedding in the app
export function MiniWidget({ frog, stats }) {
  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/70 text-xs">Today's Frog</span>
        <span className="text-2xl">🐸</span>
      </div>
      {frog ? (
        <p className="text-white font-medium line-clamp-2">{frog.title}</p>
      ) : (
        <p className="text-white/60 text-sm">No frog selected</p>
      )}
      <div className="flex gap-4 mt-3 text-white/70 text-xs">
        <span>Lv.{stats?.level || 1}</span>
        <span>{stats?.xp || 0} XP</span>
        <span>{stats?.streak || 0}🔥</span>
      </div>
    </div>
  );
}
