'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// Break activity categories and suggestions
const BREAK_ACTIVITIES = {
  movement: {
    name: 'Movement',
    emoji: '🏃',
    color: 'green',
    activities: [
      { id: 'stretch', name: 'Quick Stretch', duration: 2, description: 'Stretch your arms, neck, and back', emoji: '🧘' },
      { id: 'walk', name: 'Short Walk', duration: 5, description: 'Walk around your space or outside', emoji: '🚶' },
      { id: 'jumping-jacks', name: 'Jumping Jacks', duration: 1, description: '20 jumping jacks to get blood flowing', emoji: '⭐' },
      { id: 'desk-yoga', name: 'Desk Yoga', duration: 5, description: '5-minute seated yoga routine', emoji: '🧘‍♀️' },
      { id: 'stairs', name: 'Climb Stairs', duration: 3, description: 'Walk up and down stairs a few times', emoji: '🪜' },
      { id: 'dance', name: 'Dance Break', duration: 3, description: 'Put on a song and move!', emoji: '💃' },
    ],
  },
  mindfulness: {
    name: 'Mindfulness',
    emoji: '🧘',
    color: 'blue',
    activities: [
      { id: 'breathing', name: 'Deep Breathing', duration: 2, description: '4-7-8 breathing technique', emoji: '🌬️', guided: true },
      { id: 'meditation', name: 'Mini Meditation', duration: 5, description: 'Brief guided meditation', emoji: '🧘', guided: true },
      { id: 'body-scan', name: 'Body Scan', duration: 3, description: 'Notice sensations from head to toe', emoji: '👁️' },
      { id: 'gratitude', name: 'Gratitude Moment', duration: 2, description: 'Think of 3 things you\'re grateful for', emoji: '🙏' },
      { id: 'window-gaze', name: 'Window Gazing', duration: 3, description: 'Look outside and observe nature', emoji: '🪟' },
    ],
  },
  refresh: {
    name: 'Refresh',
    emoji: '💧',
    color: 'cyan',
    activities: [
      { id: 'water', name: 'Drink Water', duration: 1, description: 'Hydrate! Drink a full glass of water', emoji: '💧' },
      { id: 'snack', name: 'Healthy Snack', duration: 5, description: 'Have a nutritious snack', emoji: '🍎' },
      { id: 'splash', name: 'Face Splash', duration: 1, description: 'Splash cold water on your face', emoji: '💦' },
      { id: 'coffee', name: 'Coffee/Tea Break', duration: 5, description: 'Make yourself a warm drink', emoji: '☕' },
      { id: 'eye-rest', name: 'Eye Rest', duration: 2, description: 'Look at something 20ft away for 20s', emoji: '👀' },
    ],
  },
  social: {
    name: 'Social',
    emoji: '👋',
    color: 'yellow',
    activities: [
      { id: 'text', name: 'Send a Text', duration: 2, description: 'Message a friend or family member', emoji: '📱' },
      { id: 'chat', name: 'Quick Chat', duration: 5, description: 'Have a brief conversation', emoji: '💬' },
      { id: 'pet', name: 'Pet Time', duration: 3, description: 'Spend time with your pet', emoji: '🐾' },
      { id: 'compliment', name: 'Give a Compliment', duration: 1, description: 'Brighten someone\'s day', emoji: '😊' },
    ],
  },
  creative: {
    name: 'Creative',
    emoji: '🎨',
    color: 'purple',
    activities: [
      { id: 'doodle', name: 'Quick Doodle', duration: 3, description: 'Draw something simple', emoji: '✏️' },
      { id: 'music', name: 'Listen to Music', duration: 5, description: 'Play your favorite song', emoji: '🎵' },
      { id: 'photo', name: 'Take a Photo', duration: 2, description: 'Photograph something interesting', emoji: '📸' },
      { id: 'read', name: 'Read a Page', duration: 3, description: 'Read a page of a book', emoji: '📖' },
    ],
  },
};

// Breathing exercise guide
const BREATHING_EXERCISES = [
  {
    id: '4-7-8',
    name: '4-7-8 Relaxing Breath',
    description: 'Calming breath for stress relief',
    steps: [
      { phase: 'inhale', duration: 4, instruction: 'Breathe in through your nose' },
      { phase: 'hold', duration: 7, instruction: 'Hold your breath' },
      { phase: 'exhale', duration: 8, instruction: 'Exhale slowly through your mouth' },
    ],
    cycles: 4,
  },
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal counts for balance and focus',
    steps: [
      { phase: 'inhale', duration: 4, instruction: 'Breathe in' },
      { phase: 'hold', duration: 4, instruction: 'Hold' },
      { phase: 'exhale', duration: 4, instruction: 'Breathe out' },
      { phase: 'hold', duration: 4, instruction: 'Hold' },
    ],
    cycles: 4,
  },
  {
    id: 'energizing',
    name: 'Energizing Breath',
    description: 'Quick breaths for energy boost',
    steps: [
      { phase: 'inhale', duration: 2, instruction: 'Quick inhale' },
      { phase: 'exhale', duration: 2, instruction: 'Sharp exhale' },
    ],
    cycles: 10,
  },
];

// Hook for break suggestions
export function useBreakSuggestions(energyLevel, focusMinutes, lastBreakTime) {
  const getSuggestions = useCallback(() => {
    const suggestions = [];

    // Always suggest hydration
    suggestions.push(BREAK_ACTIVITIES.refresh.activities.find(a => a.id === 'water'));

    // Energy-based suggestions
    if (energyLevel <= 2) {
      // Low energy - suggest movement and refresh
      suggestions.push(
        BREAK_ACTIVITIES.movement.activities.find(a => a.id === 'jumping-jacks'),
        BREAK_ACTIVITIES.refresh.activities.find(a => a.id === 'splash'),
        BREAK_ACTIVITIES.movement.activities.find(a => a.id === 'walk'),
      );
    } else if (energyLevel >= 4) {
      // High energy - suggest mindfulness to maintain
      suggestions.push(
        BREAK_ACTIVITIES.mindfulness.activities.find(a => a.id === 'breathing'),
        BREAK_ACTIVITIES.refresh.activities.find(a => a.id === 'eye-rest'),
      );
    } else {
      // Medium energy - balanced suggestions
      suggestions.push(
        BREAK_ACTIVITIES.movement.activities.find(a => a.id === 'stretch'),
        BREAK_ACTIVITIES.mindfulness.activities.find(a => a.id === 'gratitude'),
      );
    }

    // Long focus session - suggest movement
    if (focusMinutes >= 45) {
      suggestions.unshift(BREAK_ACTIVITIES.movement.activities.find(a => a.id === 'walk'));
    }

    // Dedupe and limit
    const unique = [...new Map(suggestions.filter(Boolean).map(s => [s.id, s])).values()];
    return unique.slice(0, 4);
  }, [energyLevel, focusMinutes]);

  return { suggestions: getSuggestions() };
}

// Break Suggestions Modal
export function BreakSuggestionsModal({
  isOpen,
  onClose,
  energyLevel = 3,
  focusMinutes = 25,
  onStartActivity,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { suggestions } = useBreakSuggestions(energyLevel, focusMinutes);

  if (!isOpen) return null;

  const allActivities = selectedCategory === 'all'
    ? Object.values(BREAK_ACTIVITIES).flatMap(cat => cat.activities)
    : BREAK_ACTIVITIES[selectedCategory]?.activities || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>☕</span> Break Time!
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Suggested Activities */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <p className="text-white/60 text-sm mb-3">Suggested for you</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => {
                    onStartActivity(activity);
                    onClose();
                  }}
                  className="p-3 glass-card rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  <span className="text-xl">{activity.emoji}</span>
                  <p className="text-white font-medium text-sm mt-1">{activity.name}</p>
                  <p className="text-white/40 text-xs">{activity.duration} min</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-white/20 text-white'
                : 'glass-button text-white/60'
            }`}
          >
            All
          </button>
          {Object.entries(BREAK_ACTIVITIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === key
                  ? 'bg-white/20 text-white'
                  : 'glass-button text-white/60'
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* All Activities */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {allActivities.map(activity => (
            <button
              key={activity.id}
              onClick={() => {
                onStartActivity(activity);
                onClose();
              }}
              className="w-full p-4 glass-card rounded-xl text-left hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activity.emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.name}</p>
                  <p className="text-white/60 text-sm">{activity.description}</p>
                </div>
                <span className="text-white/40 text-sm">{activity.duration}m</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Guided Breathing Exercise
export function BreathingExercise({ exercise, onComplete, onClose }) {
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const currentExercise = exercise || BREATHING_EXERCISES[0];
  const step = currentExercise.steps[currentStep];

  useEffect(() => {
    if (!isRunning) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    // Move to next step
    const nextStep = currentStep + 1;
    if (nextStep < currentExercise.steps.length) {
      setCurrentStep(nextStep);
      setCountdown(currentExercise.steps[nextStep].duration);
    } else {
      // Completed a cycle
      const nextCycle = currentCycle + 1;
      if (nextCycle < currentExercise.cycles) {
        setCurrentCycle(nextCycle);
        setCurrentStep(0);
        setCountdown(currentExercise.steps[0].duration);
      } else {
        // All done!
        setIsRunning(false);
        onComplete?.();
      }
    }
  }, [countdown, isRunning, currentStep, currentCycle, currentExercise, onComplete]);

  const startExercise = () => {
    setCurrentCycle(0);
    setCurrentStep(0);
    setCountdown(currentExercise.steps[0].duration);
    setIsRunning(true);
  };

  const phaseColors = {
    inhale: 'from-blue-500 to-cyan-500',
    hold: 'from-purple-500 to-pink-500',
    exhale: 'from-green-500 to-teal-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-md mx-4 text-center">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-white/60 hover:text-white text-2xl"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">{currentExercise.name}</h2>
        <p className="text-white/60 mb-8">{currentExercise.description}</p>

        {!isRunning ? (
          <button
            onClick={startExercise}
            className="px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg"
          >
            Start Breathing Exercise
          </button>
        ) : (
          <div className="space-y-8">
            {/* Breathing Circle */}
            <div className="relative mx-auto w-48 h-48">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${phaseColors[step.phase]} opacity-30 animate-pulse`}
                style={{
                  transform: step.phase === 'inhale' ? 'scale(1.2)' :
                            step.phase === 'exhale' ? 'scale(0.8)' : 'scale(1)',
                  transition: `transform ${step.duration}s ease-in-out`,
                }}
              />
              <div className="absolute inset-4 rounded-full glass-card flex items-center justify-center">
                <div className="text-center">
                  <p className="text-5xl font-bold text-white">{countdown}</p>
                  <p className="text-white/60 capitalize">{step.phase}</p>
                </div>
              </div>
            </div>

            {/* Instruction */}
            <p className="text-xl text-white">{step.instruction}</p>

            {/* Progress */}
            <div className="flex justify-center gap-2">
              {Array(currentExercise.cycles).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < currentCycle ? 'bg-green-500' :
                    i === currentCycle ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            <p className="text-white/40 text-sm">
              Cycle {currentCycle + 1} of {currentExercise.cycles}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Break Timer
export function QuickBreakTimer({ duration, activity, onComplete, onClose }) {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) {
      if (timeLeft <= 0) onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-md mx-4 glass-card p-8 rounded-3xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
        >
          ×
        </button>

        <span className="text-5xl">{activity?.emoji || '☕'}</span>
        <h2 className="text-xl font-bold text-white mt-4">{activity?.name || 'Break Time'}</h2>
        <p className="text-white/60 text-sm mt-1">{activity?.description}</p>

        {/* Timer */}
        <div className="my-8">
          <p className="text-6xl font-bold text-white font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-6 py-3 rounded-xl glass-button text-white"
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button
            onClick={() => {
              onComplete?.();
              onClose();
            }}
            className="px-6 py-3 rounded-xl bg-green-500/30 border border-green-500/50 text-white"
          >
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}

export { BREAK_ACTIVITIES, BREATHING_EXERCISES };
export default BreakSuggestionsModal;
