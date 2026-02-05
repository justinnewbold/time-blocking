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

// Focus music services
const MUSIC_SERVICES = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    color: '#1DB954',
    playlists: [
      { id: 'focus_flow', name: 'Focus Flow', uri: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ' },
      { id: 'deep_focus', name: 'Deep Focus', uri: 'spotify:playlist:37i9dQZF1DWZx3PYkPX3XC' },
      { id: 'peaceful_piano', name: 'Peaceful Piano', uri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO' },
      { id: 'lofi_beats', name: 'Lo-Fi Beats', uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn' },
      { id: 'nature_sounds', name: 'Nature Sounds', uri: 'spotify:playlist:37i9dQZF1DX4PP3DA4J0N8' }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '📺',
    color: '#FF0000',
    playlists: [
      { id: 'lofi_girl', name: 'Lofi Girl', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
      { id: 'study_with_me', name: 'Study With Me', url: 'https://www.youtube.com/results?search_query=study+with+me+live' },
      { id: 'brown_noise', name: 'Brown Noise', url: 'https://www.youtube.com/watch?v=RqzGzwTY-6w' },
      { id: 'rain_sounds', name: 'Rain Sounds', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' }
    ]
  },
  {
    id: 'apple_music',
    name: 'Apple Music',
    icon: '🍎',
    color: '#FC3C44',
    playlists: [
      { id: 'focus', name: 'Pure Focus', uri: 'music://playlist/pure-focus' },
      { id: 'concentration', name: 'Concentration', uri: 'music://playlist/concentration' }
    ]
  }
];

// Built-in ambient sounds using Web Audio API
const AMBIENT_SOUNDS = [
  { id: 'white_noise', name: 'White Noise', emoji: '📻', type: 'noise', noiseType: 'white' },
  { id: 'pink_noise', name: 'Pink Noise', emoji: '🌸', type: 'noise', noiseType: 'pink' },
  { id: 'brown_noise', name: 'Brown Noise', emoji: '🟤', type: 'noise', noiseType: 'brown' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', type: 'oscillator', frequency: 200 },
  { id: 'thunder', name: 'Thunderstorm', emoji: '⛈️', type: 'oscillator', frequency: 80 },
  { id: 'wind', name: 'Wind', emoji: '💨', type: 'noise', noiseType: 'pink', filter: 'lowpass' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊', type: 'oscillator', frequency: 120 },
  { id: 'forest', name: 'Forest', emoji: '🌲', type: 'noise', noiseType: 'white', filter: 'bandpass' },
  { id: 'fire', name: 'Fireplace', emoji: '🔥', type: 'noise', noiseType: 'brown', filter: 'lowpass' },
  { id: 'cafe', name: 'Café Ambience', emoji: '☕', type: 'noise', noiseType: 'pink', filter: 'bandpass' }
];

// Focus music presets
const FOCUS_PRESETS = [
  { id: 'deep_work', name: 'Deep Work', sounds: ['brown_noise'], volume: 0.3, description: 'Minimal distractions' },
  { id: 'creative', name: 'Creative Flow', sounds: ['cafe', 'rain'], volume: 0.25, description: 'Background ambience' },
  { id: 'calm', name: 'Calm Focus', sounds: ['rain'], volume: 0.4, description: 'Relaxing rain sounds' },
  { id: 'energize', name: 'Energize', sounds: ['white_noise'], volume: 0.2, description: 'Wake up your brain' },
  { id: 'nature', name: 'Nature Retreat', sounds: ['forest', 'wind'], volume: 0.35, description: 'Outdoor vibes' },
  { id: 'cozy', name: 'Cozy Corner', sounds: ['fire', 'rain'], volume: 0.3, description: 'Warm and comfy' }
];

// Hook for focus music integration
export function useFocusMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => Storage.get('focusMusicVolume', 0.3));
  const [activeSounds, setActiveSounds] = useState(() => Storage.get('activeSounds', []));
  const [activePreset, setActivePreset] = useState(null);
  const [favoriteServices, setFavoriteServices] = useState(() =>
    Storage.get('favoriteMusicServices', [])
  );
  const [autoPlay, setAutoPlay] = useState(() => Storage.get('focusMusicAutoPlay', false));
  const [fadeIn, setFadeIn] = useState(() => Storage.get('focusMusicFadeIn', true));

  const audioContextRef = useRef(null);
  const nodesRef = useRef({});
  const gainNodeRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
      }
    };

    // Initialize on first user interaction
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  // Save settings
  useEffect(() => {
    Storage.set('focusMusicVolume', volume);
  }, [volume]);

  useEffect(() => {
    Storage.set('activeSounds', activeSounds);
  }, [activeSounds]);

  useEffect(() => {
    Storage.set('favoriteMusicServices', favoriteServices);
  }, [favoriteServices]);

  useEffect(() => {
    Storage.set('focusMusicAutoPlay', autoPlay);
  }, [autoPlay]);

  useEffect(() => {
    Storage.set('focusMusicFadeIn', fadeIn);
  }, [fadeIn]);

  // Create noise generator
  const createNoiseGenerator = useCallback((type) => {
    if (!audioContextRef.current) return null;

    const ctx = audioContextRef.current;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      switch (type) {
        case 'pink':
          // Pink noise approximation
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
          break;
        case 'brown':
          // Brown noise
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
          break;
        default:
          // White noise
          output[i] = white;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    return source;
  }, []);

  // Play a sound
  const playSound = useCallback((soundId) => {
    if (!audioContextRef.current || nodesRef.current[soundId]) return;

    const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (!sound) return;

    const ctx = audioContextRef.current;
    let source;

    if (sound.type === 'noise') {
      source = createNoiseGenerator(sound.noiseType);

      // Apply filter if specified
      if (sound.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = sound.filter;
        filter.frequency.value = sound.filter === 'lowpass' ? 500 : 1000;
        filter.Q.value = 1;

        source.connect(filter);
        filter.connect(gainNodeRef.current);
        nodesRef.current[soundId] = { source, filter };
      } else {
        source.connect(gainNodeRef.current);
        nodesRef.current[soundId] = { source };
      }
    } else if (sound.type === 'oscillator') {
      source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.value = sound.frequency;

      // Add some modulation for more natural sound
      const modulator = ctx.createOscillator();
      const modulatorGain = ctx.createGain();
      modulator.frequency.value = 0.2;
      modulatorGain.gain.value = 20;
      modulator.connect(modulatorGain);
      modulatorGain.connect(source.frequency);
      modulator.start();

      source.connect(gainNodeRef.current);
      nodesRef.current[soundId] = { source, modulator };
    }

    if (source) {
      source.start();
      setActiveSounds(prev => [...new Set([...prev, soundId])]);
      setIsPlaying(true);
    }
  }, [createNoiseGenerator]);

  // Stop a sound
  const stopSound = useCallback((soundId) => {
    const nodes = nodesRef.current[soundId];
    if (nodes) {
      try {
        nodes.source?.stop();
        nodes.modulator?.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      delete nodesRef.current[soundId];
    }

    setActiveSounds(prev => {
      const updated = prev.filter(id => id !== soundId);
      if (updated.length === 0) setIsPlaying(false);
      return updated;
    });
  }, []);

  // Toggle a sound
  const toggleSound = useCallback((soundId) => {
    if (activeSounds.includes(soundId)) {
      stopSound(soundId);
    } else {
      playSound(soundId);
    }
  }, [activeSounds, playSound, stopSound]);

  // Stop all sounds
  const stopAll = useCallback(() => {
    Object.keys(nodesRef.current).forEach(soundId => {
      stopSound(soundId);
    });
    setIsPlaying(false);
  }, [stopSound]);

  // Apply preset
  const applyPreset = useCallback((presetId) => {
    const preset = FOCUS_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    stopAll();
    setVolume(preset.volume);
    setActivePreset(presetId);

    // Start preset sounds with slight delay
    preset.sounds.forEach((soundId, index) => {
      setTimeout(() => playSound(soundId), index * 100);
    });
  }, [stopAll, playSound]);

  // Update volume
  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    if (gainNodeRef.current) {
      if (fadeIn) {
        gainNodeRef.current.gain.linearRampToValueAtTime(
          newVolume,
          audioContextRef.current.currentTime + 0.5
        );
      } else {
        gainNodeRef.current.gain.value = newVolume;
      }
    }
  }, [fadeIn]);

  // Toggle favorite service
  const toggleFavoriteService = useCallback((serviceId) => {
    setFavoriteServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  // Open external playlist
  const openPlaylist = useCallback((playlist) => {
    if (playlist.uri) {
      window.open(playlist.uri, '_blank');
    } else if (playlist.url) {
      window.open(playlist.url, '_blank');
    }
  }, []);

  // Start with timer
  const startWithTimer = useCallback(() => {
    if (autoPlay && activeSounds.length === 0) {
      // Apply default preset or first preset
      applyPreset('deep_work');
    }
  }, [autoPlay, activeSounds.length, applyPreset]);

  // Stop with timer
  const stopWithTimer = useCallback(() => {
    if (autoPlay) {
      stopAll();
    }
  }, [autoPlay, stopAll]);

  return {
    // State
    isPlaying,
    volume,
    activeSounds,
    activePreset,
    favoriteServices,
    autoPlay,
    fadeIn,

    // Actions
    playSound,
    stopSound,
    toggleSound,
    stopAll,
    applyPreset,
    updateVolume,
    toggleFavoriteService,
    openPlaylist,
    setAutoPlay,
    setFadeIn,
    startWithTimer,
    stopWithTimer,

    // Data
    AMBIENT_SOUNDS,
    FOCUS_PRESETS,
    MUSIC_SERVICES
  };
}

// Sound Button Component
export function SoundButton({ sound, isActive, onToggle }) {
  return (
    <button
      onClick={() => onToggle(sound.id)}
      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
        isActive
          ? 'bg-blue-500/30 ring-2 ring-blue-500/50'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="text-2xl">{sound.emoji}</span>
      <span className="text-xs mt-1 text-white/60">{sound.name}</span>
    </button>
  );
}

// Volume Control
export function VolumeControl({ volume, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">🔈</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none bg-white/20"
        style={{
          background: `linear-gradient(to right, #3B82F6 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`
        }}
      />
      <span className="text-lg">🔊</span>
      <span className="text-sm text-white/60 w-10">{Math.round(volume * 100)}%</span>
    </div>
  );
}

// Preset Card
export function PresetCard({ preset, isActive, onApply }) {
  return (
    <button
      onClick={() => onApply(preset.id)}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left ${
        isActive
          ? 'bg-green-500/20 ring-2 ring-green-500/50'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex-1">
        <p className="font-medium">{preset.name}</p>
        <p className="text-xs text-white/40">{preset.description}</p>
      </div>
      <div className="flex -space-x-1">
        {preset.sounds.map(soundId => {
          const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
          return (
            <span key={soundId} className="text-lg">
              {sound?.emoji}
            </span>
          );
        })}
      </div>
    </button>
  );
}

// Music Service Card
export function MusicServiceCard({ service, isFavorite, onToggleFavorite, onOpenPlaylist }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{service.icon}</span>
          <span className="font-medium">{service.name}</span>
        </div>
        <button
          onClick={() => onToggleFavorite(service.id)}
          className="text-xl"
        >
          {isFavorite ? '⭐' : '☆'}
        </button>
      </div>

      <div className="space-y-2">
        {service.playlists.map(playlist => (
          <button
            key={playlist.id}
            onClick={() => onOpenPlaylist(playlist)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
          >
            <span>{playlist.name}</span>
            <span className="text-white/40">↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Now Playing Bar
export function NowPlayingBar({ isPlaying, activeSounds, volume, onStop, onVolumeChange }) {
  if (!isPlaying || activeSounds.length === 0) return null;

  const activeNames = activeSounds.map(id =>
    AMBIENT_SOUNDS.find(s => s.id === id)?.name
  ).filter(Boolean);

  return (
    <div className="fixed bottom-20 left-4 right-4 glass-card p-3 rounded-xl flex items-center justify-between z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="animate-pulse">🎵</span>
        </div>
        <div>
          <p className="text-sm font-medium">Now Playing</p>
          <p className="text-xs text-white/60">{activeNames.join(' + ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-20"
        />
        <button
          onClick={onStop}
          className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center"
        >
          ⏹
        </button>
      </div>
    </div>
  );
}

// Focus Music Modal
export function FocusMusicModal({ isOpen, onClose, musicState }) {
  const [activeTab, setActiveTab] = useState('sounds');

  if (!isOpen) return null;

  const {
    isPlaying,
    volume,
    activeSounds,
    activePreset,
    favoriteServices,
    autoPlay,
    fadeIn,
    toggleSound,
    stopAll,
    applyPreset,
    updateVolume,
    toggleFavoriteService,
    openPlaylist,
    setAutoPlay,
    setFadeIn,
    AMBIENT_SOUNDS,
    FOCUS_PRESETS,
    MUSIC_SERVICES
  } = musicState;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🎵 Focus Music</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['sounds', 'presets', 'services'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sounds' && (
            <div className="space-y-4">
              <VolumeControl volume={volume} onChange={updateVolume} />

              <div className="grid grid-cols-5 gap-2">
                {AMBIENT_SOUNDS.map(sound => (
                  <SoundButton
                    key={sound.id}
                    sound={sound}
                    isActive={activeSounds.includes(sound.id)}
                    onToggle={toggleSound}
                  />
                ))}
              </div>

              {isPlaying && (
                <button
                  onClick={stopAll}
                  className="w-full glass-button py-3 bg-red-500/20 hover:bg-red-500/30"
                >
                  ⏹ Stop All
                </button>
              )}
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3">
              {FOCUS_PRESETS.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={activePreset === preset.id}
                  onApply={applyPreset}
                />
              ))}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Open your favorite music service for focus playlists
              </p>
              {MUSIC_SERVICES.map(service => (
                <MusicServiceCard
                  key={service.id}
                  service={service}
                  isFavorite={favoriteServices.includes(service.id)}
                  onToggleFavorite={toggleFavoriteService}
                  onOpenPlaylist={openPlaylist}
                />
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-play with timer</span>
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`w-10 h-5 rounded-full transition-colors ${
                autoPlay ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                autoPlay ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm">Fade in/out</span>
            <button
              onClick={() => setFadeIn(!fadeIn)}
              className={`w-10 h-5 rounded-full transition-colors ${
                fadeIn ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                fadeIn ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

// Quick Music Button
export function QuickMusicButton({ isPlaying, activeSounds, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${
        isPlaying
          ? 'bg-green-500/20 text-green-400'
          : 'bg-white/10 text-white/60 hover:text-white'
      }`}
    >
      <span className="text-xl">{isPlaying ? '🎵' : '🎧'}</span>
      {isPlaying && activeSounds.length > 0 && (
        <span className="ml-1 text-xs">{activeSounds.length}</span>
      )}
    </button>
  );
}

export default FocusMusicModal;
