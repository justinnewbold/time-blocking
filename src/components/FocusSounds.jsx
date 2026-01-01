'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Ambient sound types using Web Audio API
const SOUND_TYPES = [
  { 
    id: 'none', 
    name: 'None', 
    emoji: '🔇',
    description: 'Silence'
  },
  { 
    id: 'rain', 
    name: 'Rain', 
    emoji: '🌧️',
    description: 'Gentle rainfall'
  },
  { 
    id: 'whitenoise', 
    name: 'White Noise', 
    emoji: '📻',
    description: 'Static hum'
  },
  { 
    id: 'brownnoise', 
    name: 'Brown Noise', 
    emoji: '🌊',
    description: 'Deep rumble'
  },
  { 
    id: 'pinknoise', 
    name: 'Pink Noise', 
    emoji: '🌸',
    description: 'Balanced static'
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    emoji: '🌲',
    description: 'Nature sounds'
  },
  { 
    id: 'lofi', 
    name: 'Lo-Fi Beats', 
    emoji: '🎵',
    description: 'Chill vibes'
  },
  { 
    id: 'fireplace', 
    name: 'Fireplace', 
    emoji: '🔥',
    description: 'Crackling fire'
  }
];

// Audio generation functions
class AmbientSoundGenerator {
  constructor() {
    this.audioContext = null;
    this.nodes = [];
    this.isPlaying = false;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  stop() {
    this.nodes.forEach(node => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch (e) {}
    });
    this.nodes = [];
    this.isPlaying = false;
  }

  // White noise generator
  createWhiteNoise(volume = 0.3) {
    const ctx = this.init();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.5;
    
    // Low pass filter for smoother sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 8000;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    source.start();
    this.nodes.push(source, gain, filter);
    this.isPlaying = true;
    
    return gain;
  }

  // Brown noise (deeper)
  createBrownNoise(volume = 0.3) {
    const ctx = this.init();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.7;
    
    source.connect(gain);
    gain.connect(ctx.destination);
    
    source.start();
    this.nodes.push(source, gain);
    this.isPlaying = true;
    
    return gain;
  }

  // Pink noise
  createPinkNoise(volume = 0.3) {
    const ctx = this.init();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.6;
    
    source.connect(gain);
    gain.connect(ctx.destination);
    
    source.start();
    this.nodes.push(source, gain);
    this.isPlaying = true;
    
    return gain;
  }

  // Rain sound (filtered noise with droplet effects)
  createRain(volume = 0.3) {
    const ctx = this.init();
    
    // Base rain (filtered white noise)
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    // High shelf filter for rain texture
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 4000;
    highShelf.gain.value = -10;
    
    // Low pass for smoothness
    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 6000;
    
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.4;
    
    source.connect(highShelf);
    highShelf.connect(lowPass);
    lowPass.connect(gain);
    gain.connect(ctx.destination);
    
    source.start();
    this.nodes.push(source, highShelf, lowPass, gain);
    this.isPlaying = true;
    
    return gain;
  }

  // Forest sounds (layered oscillators with modulation)
  createForest(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);
    
    // Wind (filtered noise)
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windData.length; i++) {
      windData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;
    
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 300;
    windFilter.Q.value = 0.5;
    
    const windGain = ctx.createGain();
    windGain.gain.value = 0.4;
    
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSource.start();
    
    // Crickets (high frequency oscillators)
    const cricketOsc = ctx.createOscillator();
    cricketOsc.type = 'sine';
    cricketOsc.frequency.value = 4000;
    
    const cricketGain = ctx.createGain();
    cricketGain.gain.value = 0.02;
    
    // Modulate cricket volume
    const cricketLfo = ctx.createOscillator();
    cricketLfo.frequency.value = 6;
    const cricketLfoGain = ctx.createGain();
    cricketLfoGain.gain.value = 0.02;
    
    cricketLfo.connect(cricketLfoGain);
    cricketLfoGain.connect(cricketGain.gain);
    cricketOsc.connect(cricketGain);
    cricketGain.connect(masterGain);
    
    cricketOsc.start();
    cricketLfo.start();
    
    this.nodes.push(windSource, windFilter, windGain, cricketOsc, cricketGain, cricketLfo, cricketLfoGain, masterGain);
    this.isPlaying = true;
    
    return masterGain;
  }

  // Lo-fi beats (simple drum pattern with low-passed oscillators)
  createLofi(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);
    
    // Low drone
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55; // A1
    
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.15;
    
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 200;
    
    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start();
    
    // Vinyl crackle (filtered noise)
    const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleData.length; i++) {
      crackleData[i] = Math.random() > 0.99 ? (Math.random() * 2 - 1) * 0.5 : 0;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;
    
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.3;
    
    crackleSource.connect(crackleGain);
    crackleGain.connect(masterGain);
    crackleSource.start();
    
    // Slow chord progression LFO
    const chordOsc = ctx.createOscillator();
    chordOsc.type = 'triangle';
    chordOsc.frequency.value = 110;
    
    const chordGain = ctx.createGain();
    chordGain.gain.value = 0.08;
    
    const chordFilter = ctx.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.value = 400;
    
    chordOsc.connect(chordFilter);
    chordFilter.connect(chordGain);
    chordGain.connect(masterGain);
    chordOsc.start();
    
    this.nodes.push(droneOsc, droneGain, droneFilter, crackleSource, crackleGain, chordOsc, chordGain, chordFilter, masterGain);
    this.isPlaying = true;
    
    return masterGain;
  }

  // Fireplace (crackling)
  createFireplace(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);
    
    // Base rumble
    const rumbleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const rumbleData = rumbleBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < rumbleData.length; i++) {
      const white = Math.random() * 2 - 1;
      rumbleData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = rumbleData[i];
      rumbleData[i] *= 2;
    }
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = rumbleBuffer;
    rumbleSource.loop = true;
    
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 200;
    
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.5;
    
    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    rumbleSource.start();
    
    // Crackle pops
    const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleData.length; i++) {
      if (Math.random() > 0.998) {
        const intensity = Math.random();
        for (let j = 0; j < 500 && i + j < crackleData.length; j++) {
          crackleData[i + j] = (Math.random() * 2 - 1) * intensity * Math.exp(-j / 100);
        }
      }
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;
    
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.6;
    
    crackleSource.connect(crackleGain);
    crackleGain.connect(masterGain);
    crackleSource.start();
    
    this.nodes.push(rumbleSource, rumbleFilter, rumbleGain, crackleSource, crackleGain, masterGain);
    this.isPlaying = true;
    
    return masterGain;
  }

  play(type, volume = 0.3) {
    this.stop();
    
    switch (type) {
      case 'whitenoise':
        return this.createWhiteNoise(volume);
      case 'brownnoise':
        return this.createBrownNoise(volume);
      case 'pinknoise':
        return this.createPinkNoise(volume);
      case 'rain':
        return this.createRain(volume);
      case 'forest':
        return this.createForest(volume);
      case 'lofi':
        return this.createLofi(volume);
      case 'fireplace':
        return this.createFireplace(volume);
      default:
        return null;
    }
  }

  setVolume(gainNode, volume) {
    if (gainNode && this.audioContext) {
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }
}

// Singleton instance
let soundGenerator = null;
const getSoundGenerator = () => {
  if (!soundGenerator) {
    soundGenerator = new AmbientSoundGenerator();
  }
  return soundGenerator;
};

export default function FocusSounds({ isPlaying, onSoundChange }) {
  const [selectedSound, setSelectedSound] = useState('none');
  const [volume, setVolume] = useState(0.5);
  const [showPicker, setShowPicker] = useState(false);
  const gainNodeRef = useRef(null);

  // Handle sound playback
  useEffect(() => {
    const generator = getSoundGenerator();
    
    if (isPlaying && selectedSound !== 'none') {
      gainNodeRef.current = generator.play(selectedSound, volume);
    } else {
      generator.stop();
      gainNodeRef.current = null;
    }

    return () => {
      generator.stop();
    };
  }, [isPlaying, selectedSound]);

  // Handle volume changes
  useEffect(() => {
    const generator = getSoundGenerator();
    if (gainNodeRef.current) {
      generator.setVolume(gainNodeRef.current, volume);
    }
  }, [volume]);

  const handleSoundSelect = (soundId) => {
    setSelectedSound(soundId);
    setShowPicker(false);
    onSoundChange?.(soundId);
    
    // Save preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusflow_focusSound', soundId);
    }
  };

  // Load saved preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focusflow_focusSound');
      if (saved) setSelectedSound(saved);
      
      const savedVolume = localStorage.getItem('focusflow_focusVolume');
      if (savedVolume) setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Save volume preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusflow_focusVolume', volume.toString());
    }
  }, [volume]);

  const currentSound = SOUND_TYPES.find(s => s.id === selectedSound);

  return (
    <div className="relative">
      {/* Sound Toggle Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`glass-card px-4 py-3 flex items-center gap-3 transition-all ${
          selectedSound !== 'none' && isPlaying ? 'ring-2 ring-green-500/50' : ''
        }`}
      >
        <span className="text-xl">{currentSound?.emoji}</span>
        <div className="text-left">
          <p className="text-white text-sm font-medium">{currentSound?.name}</p>
          <p className="text-white/50 text-xs">
            {isPlaying && selectedSound !== 'none' ? 'Playing...' : 'Focus sounds'}
          </p>
        </div>
        {selectedSound !== 'none' && isPlaying && (
          <div className="ml-auto flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-400 rounded-full animate-pulse"
                style={{ 
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Sound Picker Modal */}
      {showPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-4 animate-slide-up z-50">
          <h4 className="text-white font-medium mb-3">🎵 Focus Sounds</h4>
          
          {/* Sound Options */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {SOUND_TYPES.map((sound) => (
              <button
                key={sound.id}
                onClick={() => handleSoundSelect(sound.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedSound === sound.id
                    ? 'bg-green-500/30 ring-2 ring-green-500'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl block mb-1">{sound.emoji}</span>
                <span className="text-white/80 text-xs">{sound.name}</span>
              </button>
            ))}
          </div>

          {/* Volume Slider */}
          {selectedSound !== 'none' && (
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-white/60 text-sm">🔊</span>
            </div>
          )}

          <button
            onClick={() => setShowPicker(false)}
            className="w-full mt-3 py-2 text-white/40 text-sm hover:text-white/60"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export { SOUND_TYPES, AmbientSoundGenerator, getSoundGenerator };
