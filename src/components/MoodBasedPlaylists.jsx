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

// Sound configurations with mood/energy mappings
export const AMBIENT_SOUNDS = {
  // Low energy sounds - calming, grounding
  rain: {
    id: 'rain',
    name: 'Gentle Rain',
    emoji: '🌧️',
    description: 'Soothing rainfall',
    category: 'nature',
    energyRange: [1, 2],
    moodTags: ['calm', 'focus', 'anxiety-relief'],
    frequency: 200,
    noiseType: 'brown'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Waves',
    emoji: '🌊',
    description: 'Rhythmic waves',
    category: 'nature',
    energyRange: [1, 3],
    moodTags: ['calm', 'meditation', 'sleep'],
    frequency: 180,
    noiseType: 'pink'
  },
  fireplace: {
    id: 'fireplace',
    name: 'Fireplace',
    emoji: '🔥',
    description: 'Crackling fire',
    category: 'cozy',
    energyRange: [1, 2],
    moodTags: ['cozy', 'comfort', 'relaxation'],
    frequency: 150,
    noiseType: 'brown'
  },

  // Medium energy sounds - balanced focus
  forest: {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    description: 'Birds and nature',
    category: 'nature',
    energyRange: [2, 3],
    moodTags: ['nature', 'focus', 'peaceful'],
    frequency: 250,
    noiseType: 'green'
  },
  coffeeShop: {
    id: 'coffeeShop',
    name: 'Coffee Shop',
    emoji: '☕',
    description: 'Cafe ambience',
    category: 'ambient',
    energyRange: [2, 4],
    moodTags: ['social', 'creative', 'work'],
    frequency: 180,
    noiseType: 'pink'
  },
  library: {
    id: 'library',
    name: 'Library',
    emoji: '📚',
    description: 'Quiet study space',
    category: 'ambient',
    energyRange: [2, 3],
    moodTags: ['focus', 'study', 'concentration'],
    frequency: 100,
    noiseType: 'white-soft'
  },

  // High energy sounds - stimulating
  lofi: {
    id: 'lofi',
    name: 'Lo-Fi Beats',
    emoji: '🎵',
    description: 'Chill beats',
    category: 'music',
    energyRange: [2, 4],
    moodTags: ['creative', 'flow', 'motivated'],
    frequency: 300,
    noiseType: 'sine'
  },
  whiteNoise: {
    id: 'whiteNoise',
    name: 'White Noise',
    emoji: '📻',
    description: 'Pure static',
    category: 'noise',
    energyRange: [3, 4],
    moodTags: ['focus', 'blocking', 'intense'],
    frequency: 400,
    noiseType: 'white'
  },
  thunderstorm: {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    emoji: '⛈️',
    description: 'Dramatic storm',
    category: 'nature',
    energyRange: [3, 4],
    moodTags: ['intense', 'powerful', 'dramatic'],
    frequency: 220,
    noiseType: 'brown'
  },

  // Special sounds
  binaural: {
    id: 'binaural',
    name: 'Focus Waves',
    emoji: '🧠',
    description: 'Binaural beats for focus',
    category: 'binaural',
    energyRange: [2, 4],
    moodTags: ['deep-focus', 'concentration', 'flow'],
    frequency: 40, // Gamma waves
    noiseType: 'binaural'
  },
  silence: {
    id: 'silence',
    name: 'Silence',
    emoji: '🔇',
    description: 'No sound',
    category: 'none',
    energyRange: [1, 4],
    moodTags: [],
    frequency: 0,
    noiseType: 'none'
  }
};

// Preset playlists based on activity/mood
export const PLAYLISTS = {
  deepWork: {
    id: 'deepWork',
    name: 'Deep Work',
    emoji: '🧠',
    description: 'Maximum concentration',
    sounds: ['binaural', 'whiteNoise', 'library'],
    energyMin: 3
  },
  creative: {
    id: 'creative',
    name: 'Creative Flow',
    emoji: '🎨',
    description: 'Boost creativity',
    sounds: ['lofi', 'coffeeShop', 'rain'],
    energyMin: 2
  },
  anxietyRelief: {
    id: 'anxietyRelief',
    name: 'Calm & Grounded',
    emoji: '🌿',
    description: 'Reduce stress',
    sounds: ['ocean', 'rain', 'forest'],
    energyMin: 1
  },
  powerHour: {
    id: 'powerHour',
    name: 'Power Hour',
    emoji: '⚡',
    description: 'High intensity',
    sounds: ['whiteNoise', 'thunderstorm', 'lofi'],
    energyMin: 4
  },
  cozy: {
    id: 'cozy',
    name: 'Cozy Corner',
    emoji: '🛋️',
    description: 'Warm and comfortable',
    sounds: ['fireplace', 'rain', 'forest'],
    energyMin: 1
  }
};

// Generate noise using Web Audio API
const createNoiseGenerator = (noiseType, frequency, volume = 0.3) => {
  if (typeof window === 'undefined' || noiseType === 'none') return null;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate noise based on type
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      switch (noiseType) {
        case 'white':
          output[i] = white;
          break;
        case 'white-soft':
          output[i] = white * 0.5;
          break;
        case 'pink':
          // Pink noise approximation
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
          break;
        case 'brown':
          // Brown noise (random walk)
          output[i] = (lastOut + (0.02 * white));
          output[i] = Math.max(-1, Math.min(1, output[i]));
          lastOut = output[i];
          break;
        case 'green':
          // Green noise (mid-frequency emphasis)
          output[i] = Math.sin(i * 0.01) * 0.3 + (Math.random() * 0.4 - 0.2);
          break;
        case 'sine':
          // Gentle sine wave for lo-fi simulation
          output[i] = Math.sin(i * 0.001) * 0.2 + Math.sin(i * 0.0003) * 0.1;
          break;
        case 'binaural':
          // Binaural beat simulation (40Hz gamma)
          const baseFreq = 200;
          const beatFreq = frequency;
          output[i] = Math.sin(2 * Math.PI * baseFreq * i / audioContext.sampleRate) * 0.3 +
                      Math.sin(2 * Math.PI * (baseFreq + beatFreq) * i / audioContext.sampleRate) * 0.3;
          break;
        default:
          output[i] = white * 0.5;
      }
    }

    const whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    // Add low-pass filter for smoother sound
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = noiseType === 'brown' ? 500 : 1000;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { source: whiteNoise, gain: gainNode, context: audioContext, filter };
  } catch (e) {
    console.log('Audio not available:', e);
    return null;
  }
};

// Hook to manage mood-based playlists
export function useMoodBasedPlaylists(currentEnergy) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [volume, setVolume] = useState(() => Storage.get('soundVolume', 0.3));
  const [autoSwitch, setAutoSwitch] = useState(() => Storage.get('autoSwitchSound', true));
  const [favorites, setFavorites] = useState(() => Storage.get('favoriteSounds', []));
  const [playHistory, setPlayHistory] = useState(() => Storage.get('soundHistory', []));

  const audioRef = useRef(null);

  // Save preferences
  useEffect(() => {
    Storage.set('soundVolume', volume);
  }, [volume]);

  useEffect(() => {
    Storage.set('autoSwitchSound', autoSwitch);
  }, [autoSwitch]);

  useEffect(() => {
    Storage.set('favoriteSounds', favorites);
  }, [favorites]);

  useEffect(() => {
    Storage.set('soundHistory', playHistory);
  }, [playHistory]);

  // Get recommended sounds based on energy
  const getRecommendedSounds = useCallback(() => {
    const energy = currentEnergy || 2;
    return Object.values(AMBIENT_SOUNDS).filter(sound =>
      sound.energyRange[0] <= energy && sound.energyRange[1] >= energy
    );
  }, [currentEnergy]);

  // Get recommended playlist based on energy
  const getRecommendedPlaylist = useCallback(() => {
    const energy = currentEnergy || 2;

    if (energy <= 1) return PLAYLISTS.anxietyRelief;
    if (energy === 2) return PLAYLISTS.cozy;
    if (energy === 3) return PLAYLISTS.creative;
    return PLAYLISTS.deepWork;
  }, [currentEnergy]);

  // Play a sound
  const playSound = useCallback((soundId) => {
    // Stop current sound
    if (audioRef.current) {
      audioRef.current.source.stop();
      audioRef.current.context.close();
      audioRef.current = null;
    }

    const sound = AMBIENT_SOUNDS[soundId];
    if (!sound || sound.noiseType === 'none') {
      setIsPlaying(false);
      setCurrentSound(null);
      return;
    }

    const audio = createNoiseGenerator(sound.noiseType, sound.frequency, volume);
    if (audio) {
      audio.source.start();
      audioRef.current = audio;
      setIsPlaying(true);
      setCurrentSound(sound);

      // Record in history
      setPlayHistory(prev => [{
        soundId,
        timestamp: new Date().toISOString(),
        energy: currentEnergy
      }, ...prev].slice(0, 100));
    }
  }, [volume, currentEnergy]);

  // Stop playing
  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.source.stop();
      audioRef.current.context.close();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentSound(null);
  }, []);

  // Update volume
  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.gain.gain.value = newVolume;
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((soundId) => {
    setFavorites(prev =>
      prev.includes(soundId)
        ? prev.filter(id => id !== soundId)
        : [...prev, soundId]
    );
  }, []);

  // Auto-switch based on energy change
  useEffect(() => {
    if (!autoSwitch || !isPlaying) return;

    const recommended = getRecommendedSounds();
    if (recommended.length > 0 && currentSound) {
      const currentStillValid = recommended.some(s => s.id === currentSound.id);
      if (!currentStillValid) {
        // Switch to a recommended sound
        playSound(recommended[0].id);
      }
    }
  }, [currentEnergy, autoSwitch, isPlaying, currentSound, getRecommendedSounds, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.source.stop();
        audioRef.current.context.close();
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    currentSound,
    volume,
    autoSwitch,
    favorites,
    playHistory,

    // Computed
    recommendedSounds: getRecommendedSounds(),
    recommendedPlaylist: getRecommendedPlaylist(),

    // Actions
    playSound,
    stopSound,
    updateVolume,
    toggleFavorite,
    setAutoSwitch,

    // Data
    AMBIENT_SOUNDS,
    PLAYLISTS
  };
}

// Sound Selector Component
export function SoundSelector({
  sounds,
  currentSound,
  favorites,
  onPlay,
  onStop,
  onToggleFavorite,
  isPlaying
}) {
  const categories = [...new Set(Object.values(sounds).map(s => s.category))];

  return (
    <div className="space-y-4">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-white/60 mb-2">⭐ Favorites</h4>
          <div className="flex flex-wrap gap-2">
            {favorites.map(id => {
              const sound = sounds[id];
              return sound ? (
                <button
                  key={id}
                  onClick={() => currentSound?.id === id ? onStop() : onPlay(id)}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${
                    currentSound?.id === id
                      ? 'bg-green-500/30 ring-2 ring-green-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span>{sound.emoji}</span>
                  <span className="text-sm">{sound.name}</span>
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* By category */}
      {categories.filter(c => c !== 'none').map(category => (
        <div key={category}>
          <h4 className="text-sm font-medium text-white/60 mb-2 capitalize">{category}</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(sounds)
              .filter(s => s.category === category)
              .map(sound => (
                <button
                  key={sound.id}
                  onClick={() => currentSound?.id === sound.id ? onStop() : onPlay(sound.id)}
                  className={`p-3 rounded-xl transition-all text-left ${
                    currentSound?.id === sound.id
                      ? 'bg-green-500/30 ring-2 ring-green-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{sound.emoji}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(sound.id);
                      }}
                      className="text-yellow-400 opacity-60 hover:opacity-100"
                    >
                      {favorites.includes(sound.id) ? '★' : '☆'}
                    </button>
                  </div>
                  <div className="text-sm font-medium mt-1">{sound.name}</div>
                  <div className="text-xs text-white/40">{sound.description}</div>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Now Playing Bar
export function NowPlayingBar({
  currentSound,
  isPlaying,
  volume,
  onVolumeChange,
  onStop,
  autoSwitch,
  onToggleAutoSwitch
}) {
  if (!isPlaying || !currentSound) return null;

  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-pulse">{currentSound.emoji}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{currentSound.name}</div>
          <div className="text-xs text-white/40">{currentSound.description}</div>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2">
          <span className="text-white/40">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Auto-switch toggle */}
        <button
          onClick={onToggleAutoSwitch}
          className={`p-2 rounded-lg transition-colors ${
            autoSwitch ? 'bg-purple-500/30' : 'bg-white/10'
          }`}
          title={autoSwitch ? 'Auto-switch enabled' : 'Auto-switch disabled'}
        >
          🔄
        </button>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30"
        >
          ⏹️
        </button>
      </div>
    </div>
  );
}

// Playlist Card
export function PlaylistCard({ playlist, onPlay, isActive }) {
  return (
    <button
      onClick={() => onPlay(playlist.sounds[0])}
      className={`glass-card p-4 text-left w-full transition-all hover:scale-[1.02] ${
        isActive ? 'ring-2 ring-purple-500/50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{playlist.emoji}</span>
        <div>
          <div className="font-semibold">{playlist.name}</div>
          <div className="text-sm text-white/60">{playlist.description}</div>
          <div className="flex gap-1 mt-2">
            {playlist.sounds.map(id => (
              <span key={id} className="text-sm">{AMBIENT_SOUNDS[id]?.emoji}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

// Mood Playlists Modal
export function MoodPlaylistsModal({
  isOpen,
  onClose,
  isPlaying,
  currentSound,
  volume,
  autoSwitch,
  favorites,
  recommendedSounds,
  recommendedPlaylist,
  onPlaySound,
  onStopSound,
  onVolumeChange,
  onToggleFavorite,
  onToggleAutoSwitch
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🎵 Mood-Based Sounds</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Now playing */}
        <div className="p-4 border-b border-white/10">
          <NowPlayingBar
            currentSound={currentSound}
            isPlaying={isPlaying}
            volume={volume}
            onVolumeChange={onVolumeChange}
            onStop={onStopSound}
            autoSwitch={autoSwitch}
            onToggleAutoSwitch={() => onToggleAutoSwitch(!autoSwitch)}
          />
          {!isPlaying && (
            <div className="text-center text-white/40 py-2">
              No sound playing
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Recommended for current energy */}
          <div>
            <h3 className="font-semibold mb-3">✨ Recommended for You</h3>
            <div className="flex flex-wrap gap-2">
              {recommendedSounds.slice(0, 4).map(sound => (
                <button
                  key={sound.id}
                  onClick={() => onPlaySound(sound.id)}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                    currentSound?.id === sound.id
                      ? 'bg-green-500/30 ring-2 ring-green-500/50'
                      : 'bg-purple-500/20 hover:bg-purple-500/30'
                  }`}
                >
                  <span>{sound.emoji}</span>
                  <span>{sound.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recommended playlist */}
          {recommendedPlaylist && (
            <div>
              <h3 className="font-semibold mb-3">🎧 Suggested Playlist</h3>
              <PlaylistCard
                playlist={recommendedPlaylist}
                onPlay={onPlaySound}
                isActive={recommendedPlaylist.sounds.includes(currentSound?.id)}
              />
            </div>
          )}

          {/* All playlists */}
          <div>
            <h3 className="font-semibold mb-3">📚 All Playlists</h3>
            <div className="space-y-2">
              {Object.values(PLAYLISTS).map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPlay={onPlaySound}
                  isActive={playlist.sounds.includes(currentSound?.id)}
                />
              ))}
            </div>
          </div>

          {/* All sounds */}
          <div>
            <h3 className="font-semibold mb-3">🔊 All Sounds</h3>
            <SoundSelector
              sounds={AMBIENT_SOUNDS}
              currentSound={currentSound}
              favorites={favorites}
              onPlay={onPlaySound}
              onStop={onStopSound}
              onToggleFavorite={onToggleFavorite}
              isPlaying={isPlaying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MoodPlaylistsModal;
