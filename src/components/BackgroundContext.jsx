'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// Available majestic backgrounds
export const BACKGROUNDS = {
  aurora: {
    name: 'Aurora',
    class: 'bg-aurora',
    preview: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    emoji: '🌌'
  },
  northernLights: {
    name: 'Northern Lights',
    class: 'bg-northern-lights',
    preview: 'linear-gradient(180deg, #0a0a1a, #1a1a2e)',
    emoji: '✨'
  },
  sunset: {
    name: 'Sunset',
    class: 'bg-sunset',
    preview: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
    emoji: '🌅'
  },
  ocean: {
    name: 'Ocean',
    class: 'bg-ocean',
    preview: 'linear-gradient(180deg, #0a192f, #0d2137)',
    emoji: '🌊'
  },
  forest: {
    name: 'Forest',
    class: 'bg-forest',
    preview: 'linear-gradient(180deg, #0d1f0d, #1a3a1a)',
    emoji: '🌲'
  },
  cosmos: {
    name: 'Cosmos',
    class: 'bg-cosmos',
    preview: 'linear-gradient(180deg, #000011, #0a0a20)',
    emoji: '🪐'
  },
  midnight: {
    name: 'Midnight',
    class: 'bg-midnight',
    preview: 'linear-gradient(180deg, #020617, #0f172a)',
    emoji: '🌙'
  },
  rose: {
    name: 'Rose',
    class: 'bg-rose',
    preview: 'linear-gradient(180deg, #1a0a14, #2d1a24)',
    emoji: '🌹'
  }
};

// Default backgrounds per page
const DEFAULT_BACKGROUNDS = {
  home: 'forest',
  stats: 'cosmos',
  settings: 'midnight'
};

const BackgroundContext = createContext();

export function BackgroundProvider({ children }) {
  const [backgrounds, setBackgrounds] = useState(DEFAULT_BACKGROUNDS);
  const [showStars, setShowStars] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('frog_backgrounds');
      if (saved) {
        const parsed = JSON.parse(saved);
        setBackgrounds(prev => ({ ...prev, ...parsed }));
      }
      const savedStars = localStorage.getItem('frog_show_stars');
      if (savedStars !== null) {
        setShowStars(JSON.parse(savedStars));
      }
    } catch (e) {
      console.error('Error loading backgrounds:', e);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('frog_backgrounds', JSON.stringify(backgrounds));
      localStorage.setItem('frog_show_stars', JSON.stringify(showStars));
    }
  }, [backgrounds, showStars, loaded]);

  const setPageBackground = (page, bgKey) => {
    setBackgrounds(prev => ({ ...prev, [page]: bgKey }));
  };

  const getPageBackground = (page) => {
    return BACKGROUNDS[backgrounds[page]] || BACKGROUNDS.forest;
  };

  return (
    <BackgroundContext.Provider value={{
      backgrounds,
      setPageBackground,
      getPageBackground,
      showStars,
      setShowStars,
      BACKGROUNDS
    }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within BackgroundProvider');
  }
  return context;
}

// Background wrapper component
export function PageBackground({ page, children }) {
  const { getPageBackground, showStars } = useBackground();
  const bg = getPageBackground(page);
  
  return (
    <div className={`min-h-screen ${bg.class} relative overflow-hidden`}>
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      
      {/* Stars overlay */}
      {showStars && <div className="stars pointer-events-none" />}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
