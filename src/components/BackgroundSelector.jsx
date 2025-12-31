'use client';
import { useState } from 'react';
import { useBackground, BACKGROUNDS } from './BackgroundContext';

export default function BackgroundSelector({ isOpen, onClose, currentPage = 'home' }) {
  const { backgrounds, setPageBackground, showStars, setShowStars } = useBackground();
  const [selectedPage, setSelectedPage] = useState(currentPage);
  
  if (!isOpen) return null;

  const pages = [
    { key: 'home', name: 'Home', emoji: '🐸' },
    { key: 'stats', name: 'Stats', emoji: '📊' },
    { key: 'settings', name: 'Settings', emoji: '⚙️' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up">
        <div className="glass-card p-6 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="glass-icon w-12 h-12 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Backgrounds</h2>
                <p className="text-white/60 text-sm">Customize each page</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Page Selector */}
          <div className="ios-segment mb-6">
            {pages.map(page => (
              <button
                key={page.key}
                onClick={() => setSelectedPage(page.key)}
                className={`ios-segment-item ${selectedPage === page.key ? 'active' : ''}`}
              >
                <span className="mr-1">{page.emoji}</span>
                {page.name}
              </button>
            ))}
          </div>

          {/* Background Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(BACKGROUNDS).map(([key, bg]) => (
              <button
                key={key}
                onClick={() => setPageBackground(selectedPage, key)}
                className={`relative rounded-2xl overflow-hidden h-24 transition-all ${
                  backgrounds[selectedPage] === key 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]' 
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {/* Preview background */}
                <div 
                  className="absolute inset-0"
                  style={{ background: bg.preview }}
                />
                
                {/* Overlay gradient matching the style */}
                <div className={`absolute inset-0 ${bg.class}`}>
                  <div className="absolute inset-0" />
                </div>
                
                {/* Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">{bg.emoji}</span>
                  <span className="text-white text-sm font-medium drop-shadow-lg">
                    {bg.name}
                  </span>
                </div>
                
                {/* Selected indicator */}
                {backgrounds[selectedPage] === key && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <span className="text-green-500 text-sm">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Stars Toggle */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⭐</span>
              <div>
                <p className="text-white font-medium">Star Effect</p>
                <p className="text-white/60 text-xs">Twinkling stars overlay</p>
              </div>
            </div>
            <button
              onClick={() => setShowStars(!showStars)}
              className={`ios-toggle ${showStars ? 'active' : ''}`}
            />
          </div>

          {/* Current Selection Info */}
          <div className="mt-4 text-center">
            <p className="text-white/40 text-xs">
              {pages.find(p => p.key === selectedPage)?.emoji} {pages.find(p => p.key === selectedPage)?.name} → {BACKGROUNDS[backgrounds[selectedPage]]?.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
