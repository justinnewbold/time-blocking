'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Theme context
const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  isLight: false,
  systemTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {}
});

// Storage helper
const Storage = {
  get: (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`frog_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`frog_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system'); // 'light' | 'dark' | 'system'
  const [systemTheme, setSystemTheme] = useState('dark');
  
  // Determine actual theme
  const actualTheme = theme === 'system' ? systemTheme : theme;
  const isDark = actualTheme === 'dark';
  const isLight = actualTheme === 'light';
  
  // Load saved theme preference
  useEffect(() => {
    const savedTheme = Storage.get('theme', 'system');
    setThemeState(savedTheme);
  }, []);
  
  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    // Set initial value
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.remove('light-mode');
      root.classList.add('dark-mode');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark-mode');
      root.classList.add('light-mode');
      root.style.colorScheme = 'light';
    }
    
    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#000000' : '#f5f5f7');
    }
  }, [isDark]);
  
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    Storage.set('theme', newTheme);
  }, []);
  
  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  }, [isDark, setTheme]);
  
  return (
    <ThemeContext.Provider value={{
      theme,
      isDark,
      isLight,
      systemTheme,
      actualTheme,
      setTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Theme toggle button component
export function ThemeToggle({ className = '' }) {
  const { isDark, theme, setTheme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`ios-button flex items-center gap-2 ${className}`}
      aria-label="Toggle theme"
    >
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Sun icon */}
        <span 
          className={`absolute text-xl transition-all duration-300 ${
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        >
          ☀️
        </span>
        {/* Moon icon */}
        <span 
          className={`absolute text-xl transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        >
          🌙
        </span>
      </div>
    </button>
  );
}

// Theme selector for settings
export function ThemeSelector() {
  const { theme, setTheme, systemTheme } = useTheme();
  
  const options = [
    { value: 'system', label: 'System', icon: '📱', desc: `Currently ${systemTheme}` },
    { value: 'light', label: 'Light', icon: '☀️', desc: 'Always light' },
    { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Always dark' }
  ];
  
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ios-button ${
            theme === option.value 
              ? 'bg-white/10 ring-2 ring-green-500/50' 
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <span className="text-xl">{option.icon}</span>
          <div className="flex-1 text-left">
            <p className="text-white font-medium">{option.label}</p>
            <p className="text-white/40 text-xs">{option.desc}</p>
          </div>
          {theme === option.value && (
            <span className="text-green-400">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default ThemeProvider;
