'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

// Dark mode backgrounds
export const DARK_BACKGROUNDS = {
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

// Light mode backgrounds
export const LIGHT_BACKGROUNDS = {
  sky: {
    name: 'Sky',
    class: 'bg-light-sky',
    preview: 'linear-gradient(180deg, #e0f2fe, #f0f9ff)',
    emoji: '☁️'
  },
  peach: {
    name: 'Peach',
    class: 'bg-light-peach',
    preview: 'linear-gradient(180deg, #fef3e2, #fff7ed)',
    emoji: '🍑'
  },
  mint: {
    name: 'Mint',
    class: 'bg-light-mint',
    preview: 'linear-gradient(180deg, #d1fae5, #ecfdf5)',
    emoji: '🌿'
  },
  lavender: {
    name: 'Lavender',
    class: 'bg-light-lavender',
    preview: 'linear-gradient(180deg, #ede9fe, #f5f3ff)',
    emoji: '💜'
  },
  rose: {
    name: 'Rose',
    class: 'bg-light-rose',
    preview: 'linear-gradient(180deg, #ffe4e6, #fff1f2)',
    emoji: '🌸'
  },
  cream: {
    name: 'Cream',
    class: 'bg-light-cream',
    preview: 'linear-gradient(180deg, #fef9c3, #fefce8)',
    emoji: '🍦'
  },
  silver: {
    name: 'Silver',
    class: 'bg-light-silver',
    preview: 'linear-gradient(180deg, #e5e7eb, #f3f4f6)',
    emoji: '🪙'
  },
  ocean: {
    name: 'Ocean',
    class: 'bg-light-ocean',
    preview: 'linear-gradient(180deg, #cffafe, #ecfeff)',
    emoji: '🐚'
  }
};

// Combined for backwards compatibility
export const BACKGROUNDS = { ...DARK_BACKGROUNDS };

// Default backgrounds per page
const DEFAULT_DARK_BACKGROUNDS = {
  home: 'forest',
  stats: 'cosmos',
  settings: 'midnight'
};

const DEFAULT_LIGHT_BACKGROUNDS = {
  home: 'mint',
  stats: 'lavender',
  settings: 'silver'
};

const BackgroundContext = createContext();

export function BackgroundProvider({ children }) {
  const { isDark } = useTheme();
  const [darkBackgrounds, setDarkBackgrounds] = useState(DEFAULT_DARK_BACKGROUNDS);
  const [lightBackgrounds, setLightBackgrounds] = useState(DEFAULT_LIGHT_BACKGROUNDS);
  const [showStars, setShowStars] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedDark = localStorage.getItem('frog_dark_backgrounds');
      if (savedDark) {
        const parsed = JSON.parse(savedDark);
        setDarkBackgrounds(prev => ({ ...prev, ...parsed }));
      }
      
      const savedLight = localStorage.getItem('frog_light_backgrounds');
      if (savedLight) {
        const parsed = JSON.parse(savedLight);
        setLightBackgrounds(prev => ({ ...prev, ...parsed }));
      }
      
      // Legacy migration
      const savedOld = localStorage.getItem('frog_backgrounds');
      if (savedOld && !savedDark) {
        const parsed = JSON.parse(savedOld);
        setDarkBackgrounds(prev => ({ ...prev, ...parsed }));
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
      localStorage.setItem('frog_dark_backgrounds', JSON.stringify(darkBackgrounds));
      localStorage.setItem('frog_light_backgrounds', JSON.stringify(lightBackgrounds));
      localStorage.setItem('frog_show_stars', JSON.stringify(showStars));
    }
  }, [darkBackgrounds, lightBackgrounds, showStars, loaded]);

  const setPageBackground = (page, bgKey) => {
    if (isDark) {
      setDarkBackgrounds(prev => ({ ...prev, [page]: bgKey }));
    } else {
      setLightBackgrounds(prev => ({ ...prev, [page]: bgKey }));
    }
  };

  const getPageBackground = (page) => {
    if (isDark) {
      return DARK_BACKGROUNDS[darkBackgrounds[page]] || DARK_BACKGROUNDS.forest;
    } else {
      return LIGHT_BACKGROUNDS[lightBackgrounds[page]] || LIGHT_BACKGROUNDS.mint;
    }
  };
  
  const getCurrentBackgrounds = () => {
    return isDark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;
  };

  return (
    <BackgroundContext.Provider value={{
      backgrounds: isDark ? darkBackgrounds : lightBackgrounds,
      setPageBackground,
      getPageBackground,
      showStars,
      setShowStars,
      BACKGROUNDS: getCurrentBackgrounds(),
      DARK_BACKGROUNDS,
      LIGHT_BACKGROUNDS,
      isDark
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
  const { getPageBackground, showStars, isDark } = useBackground();
  const bg = getPageBackground(page);
  
  return (
    <div className={`min-h-screen ${bg.class} relative overflow-hidden`}>
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" />
      
      {/* Stars overlay - only in dark mode */}
      {showStars && isDark && <div className="stars pointer-events-none" />}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
