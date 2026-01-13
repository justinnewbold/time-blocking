'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Ambient sound types using Web Audio API
const SOUND_TYPES = [
  {
    id: 'none',
    name: 'None',
    emoji: '🔇',
    description: 'Silence',
    category: 'basic'
  },
  {
    id: 'rain',
    name: 'Rain',
    emoji: '🌧️',
    description: 'Gentle rainfall',
    category: 'nature'
  },
  {
    id: 'whitenoise',
    name: 'White Noise',
    emoji: '📻',
    description: 'Static hum',
    category: 'noise'
  },
  {
    id: 'brownnoise',
    name: 'Brown Noise',
    emoji: '🌊',
    description: 'Deep rumble',
    category: 'noise'
  },
  {
    id: 'pinknoise',
    name: 'Pink Noise',
    emoji: '🌸',
    description: 'Balanced static',
    category: 'noise'
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    description: 'Nature sounds',
    category: 'nature'
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Beats',
    emoji: '🎵',
    description: 'Chill vibes',
    category: 'music'
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    emoji: '🔥',
    description: 'Crackling fire',
    category: 'nature'
  },
  // New sounds
  {
    id: 'ocean',
    name: 'Ocean Waves',
    emoji: '🌊',
    description: 'Calming waves',
    category: 'nature'
  },
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    emoji: '⛈️',
    description: 'Rain & thunder',
    category: 'nature'
  },
  {
    id: 'coffeeshop',
    name: 'Coffee Shop',
    emoji: '☕',
    description: 'Ambient cafe',
    category: 'ambient'
  },
  {
    id: 'binaural',
    name: 'Binaural Focus',
    emoji: '🧠',
    description: 'Focus frequency',
    category: 'focus'
  },
  {
    id: 'wind',
    name: 'Wind',
    emoji: '💨',
    description: 'Gentle breeze',
    category: 'nature'
  },
  {
    id: 'birds',
    name: 'Birds',
    emoji: '🐦',
    description: 'Morning birds',
    category: 'nature'
  },
  {
    id: 'stream',
    name: 'Stream',
    emoji: '🏞️',
    description: 'Flowing water',
    category: 'nature'
  },
  {
    id: 'train',
    name: 'Train',
    emoji: '🚂',
    description: 'Rhythmic tracks',
    category: 'ambient'
  },
  {
    id: 'airplane',
    name: 'Airplane',
    emoji: '✈️',
    description: 'Cabin noise',
    category: 'ambient'
  },
  {
    id: 'fan',
    name: 'Fan',
    emoji: '🌀',
    description: 'Steady hum',
    category: 'noise'
  },
  {
    id: 'meditation',
    name: 'Meditation',
    emoji: '🧘',
    description: 'Peaceful tones',
    category: 'focus'
  },
  {
    id: 'library',
    name: 'Library',
    emoji: '📚',
    description: 'Quiet study',
    category: 'ambient'
  }
];

// Sound categories for filtering
const SOUND_CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🎧' },
  { id: 'nature', name: 'Nature', emoji: '🌿' },
  { id: 'noise', name: 'Noise', emoji: '📻' },
  { id: 'ambient', name: 'Ambient', emoji: '🏙️' },
  { id: 'focus', name: 'Focus', emoji: '🎯' },
  { id: 'music', name: 'Music', emoji: '🎵' }
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

  // Ocean waves
  createOcean(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);

    // Base wave noise
    const bufferSize = 4 * ctx.sampleRate;
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

    // Wave modulation LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(masterGain);
    source.start();
    lfo.start();

    this.nodes.push(source, lfo, lfoGain, filter, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Thunderstorm
  createThunderstorm(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);

    // Heavy rain base
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.5;

    source.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(masterGain);
    source.start();

    // Distant rumble
    const rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.value = 40;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.1;

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    rumbleOsc.start();

    this.nodes.push(source, filter, rainGain, rumbleOsc, rumbleGain, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Coffee shop ambiance
  createCoffeeShop(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);

    // Low murmur (filtered noise)
    const murmurBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const murmurData = murmurBuffer.getChannelData(0);
    for (let i = 0; i < murmurData.length; i++) {
      murmurData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const murmurSource = ctx.createBufferSource();
    murmurSource.buffer = murmurBuffer;
    murmurSource.loop = true;

    const murmurFilter = ctx.createBiquadFilter();
    murmurFilter.type = 'bandpass';
    murmurFilter.frequency.value = 400;
    murmurFilter.Q.value = 0.7;

    const murmurGain = ctx.createGain();
    murmurGain.gain.value = 0.6;

    murmurSource.connect(murmurFilter);
    murmurFilter.connect(murmurGain);
    murmurGain.connect(masterGain);
    murmurSource.start();

    // Occasional clinks (sparse noise)
    const clinkBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const clinkData = clinkBuffer.getChannelData(0);
    for (let i = 0; i < clinkData.length; i++) {
      if (Math.random() > 0.9995) {
        for (let j = 0; j < 200 && i + j < clinkData.length; j++) {
          clinkData[i + j] = Math.sin(j * 0.3) * Math.exp(-j / 50) * 0.3;
        }
      }
    }
    const clinkSource = ctx.createBufferSource();
    clinkSource.buffer = clinkBuffer;
    clinkSource.loop = true;

    const clinkFilter = ctx.createBiquadFilter();
    clinkFilter.type = 'highpass';
    clinkFilter.frequency.value = 2000;

    clinkSource.connect(clinkFilter);
    clinkFilter.connect(masterGain);
    clinkSource.start();

    this.nodes.push(murmurSource, murmurFilter, murmurGain, clinkSource, clinkFilter, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Binaural beats for focus (40Hz gamma)
  createBinaural(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.3;
    masterGain.connect(ctx.destination);

    // Left ear: 200Hz
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = 200;

    const leftPanner = ctx.createStereoPanner();
    leftPanner.pan.value = -1;

    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.5;

    leftOsc.connect(leftGain);
    leftGain.connect(leftPanner);
    leftPanner.connect(masterGain);

    // Right ear: 240Hz (40Hz difference for gamma waves)
    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = 240;

    const rightPanner = ctx.createStereoPanner();
    rightPanner.pan.value = 1;

    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.5;

    rightOsc.connect(rightGain);
    rightGain.connect(rightPanner);
    rightPanner.connect(masterGain);

    leftOsc.start();
    rightOsc.start();

    this.nodes.push(leftOsc, leftGain, leftPanner, rightOsc, rightGain, rightPanner, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Wind
  createWind(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);

    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Modulating filter for wind gusts
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(masterGain);
    source.start();
    lfo.start();

    this.nodes.push(source, filter, lfo, lfoGain, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Birds
  createBirds(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);

    // Background ambient
    const ambientBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ambientData = ambientBuffer.getChannelData(0);
    for (let i = 0; i < ambientData.length; i++) {
      ambientData[i] = (Math.random() * 2 - 1) * 0.05;
    }
    const ambientSource = ctx.createBufferSource();
    ambientSource.buffer = ambientBuffer;
    ambientSource.loop = true;
    ambientSource.connect(masterGain);
    ambientSource.start();

    // Bird chirps (modulated oscillators)
    for (let b = 0; b < 3; b++) {
      const birdOsc = ctx.createOscillator();
      birdOsc.type = 'sine';
      birdOsc.frequency.value = 2000 + Math.random() * 2000;

      const birdGain = ctx.createGain();
      birdGain.gain.value = 0;

      const tremolo = ctx.createOscillator();
      tremolo.frequency.value = 8 + Math.random() * 8;

      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.15;

      tremolo.connect(tremoloGain);
      tremoloGain.connect(birdGain.gain);

      birdOsc.connect(birdGain);
      birdGain.connect(masterGain);

      birdOsc.start();
      tremolo.start();

      this.nodes.push(birdOsc, birdGain, tremolo, tremoloGain);
    }

    this.nodes.push(ambientSource, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Stream/Creek
  createStream(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);

    // Flowing water noise
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 200;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4000;

    // Modulation for babbling effect
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.5;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 500;

    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(masterGain);
    source.start();
    lfo.start();

    this.nodes.push(source, highpass, lowpass, lfo, lfoGain, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Train
  createTrain(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);

    // Base rumble
    const rumbleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const rumbleData = rumbleBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < rumbleData.length; i++) {
      const white = Math.random() * 2 - 1;
      rumbleData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = rumbleData[i];
      rumbleData[i] *= 3;
    }
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = rumbleBuffer;
    rumbleSource.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 150;

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(masterGain);
    rumbleSource.start();

    // Rhythmic click-clack
    const clickBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const clickData = clickBuffer.getChannelData(0);
    const clickInterval = Math.floor(ctx.sampleRate * 0.8);
    for (let i = 0; i < clickData.length; i++) {
      if (i % clickInterval < 100) {
        clickData[i] = Math.random() * 0.3 * Math.exp(-(i % clickInterval) / 20);
      }
    }
    const clickSource = ctx.createBufferSource();
    clickSource.buffer = clickBuffer;
    clickSource.loop = true;

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 800;

    clickSource.connect(clickFilter);
    clickFilter.connect(masterGain);
    clickSource.start();

    this.nodes.push(rumbleSource, rumbleFilter, clickSource, clickFilter, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Airplane cabin
  createAirplane(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.5;
    masterGain.connect(ctx.destination);

    // Engine drone
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    source.connect(filter);
    filter.connect(masterGain);
    source.start();

    // High frequency air circulation
    const airBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const airData = airBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      airData[i] = Math.random() * 2 - 1;
    }
    const airSource = ctx.createBufferSource();
    airSource.buffer = airBuffer;
    airSource.loop = true;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 4000;
    airFilter.Q.value = 2;

    const airGain = ctx.createGain();
    airGain.gain.value = 0.1;

    airSource.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(masterGain);
    airSource.start();

    this.nodes.push(source, filter, airSource, airFilter, airGain, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Fan
  createFan(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;
    masterGain.connect(ctx.destination);

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Blade modulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 3;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.1;

    const gainMod = ctx.createGain();
    gainMod.gain.value = 0.5;

    lfo.connect(lfoGain);
    lfoGain.connect(gainMod.gain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.7;

    source.connect(filter);
    filter.connect(gainMod);
    gainMod.connect(masterGain);
    source.start();
    lfo.start();

    this.nodes.push(source, filter, lfo, lfoGain, gainMod, masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Meditation tones
  createMeditation(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.3;
    masterGain.connect(ctx.destination);

    // Singing bowl frequencies
    const frequencies = [261.63, 329.63, 392]; // C, E, G

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0.3 / frequencies.length;

      // Slow tremolo
      const tremolo = ctx.createOscillator();
      tremolo.frequency.value = 0.1 + i * 0.05;

      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.1;

      tremolo.connect(tremoloGain);
      tremoloGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      tremolo.start();

      this.nodes.push(osc, gain, tremolo, tremoloGain);
    });

    this.nodes.push(masterGain);
    this.isPlaying = true;
    return masterGain;
  }

  // Library ambiance
  createLibrary(volume = 0.3) {
    const ctx = this.init();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.3;
    masterGain.connect(ctx.destination);

    // Very quiet background noise
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.value = 0.1;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();

    // Occasional page turn (very sparse clicks)
    const pageBuffer = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
    const pageData = pageBuffer.getChannelData(0);
    for (let i = 0; i < pageData.length; i++) {
      if (Math.random() > 0.9999) {
        for (let j = 0; j < 300 && i + j < pageData.length; j++) {
          pageData[i + j] = (Math.random() * 2 - 1) * 0.1 * Math.exp(-j / 100);
        }
      }
    }
    const pageSource = ctx.createBufferSource();
    pageSource.buffer = pageBuffer;
    pageSource.loop = true;

    pageSource.connect(masterGain);
    pageSource.start();

    this.nodes.push(source, filter, gain, pageSource, masterGain);
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
      case 'ocean':
        return this.createOcean(volume);
      case 'thunderstorm':
        return this.createThunderstorm(volume);
      case 'coffeeshop':
        return this.createCoffeeShop(volume);
      case 'binaural':
        return this.createBinaural(volume);
      case 'wind':
        return this.createWind(volume);
      case 'birds':
        return this.createBirds(volume);
      case 'stream':
        return this.createStream(volume);
      case 'train':
        return this.createTrain(volume);
      case 'airplane':
        return this.createAirplane(volume);
      case 'fan':
        return this.createFan(volume);
      case 'meditation':
        return this.createMeditation(volume);
      case 'library':
        return this.createLibrary(volume);
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const gainNodeRef = useRef(null);

  // Filter sounds by category
  const filteredSounds = selectedCategory === 'all'
    ? SOUND_TYPES
    : SOUND_TYPES.filter(s => s.category === selectedCategory || s.id === 'none');

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
        <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-4 animate-slide-up z-50 max-h-[70vh] overflow-y-auto">
          <h4 className="text-white font-medium mb-3">🎵 Focus Sounds</h4>

          {/* Category Filter */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
            {SOUND_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-green-500/30 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Sound Options */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {filteredSounds.map((sound) => (
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

export { SOUND_TYPES, SOUND_CATEGORIES, AmbientSoundGenerator, getSoundGenerator };
