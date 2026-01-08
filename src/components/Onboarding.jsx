'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'frog_onboarding_completed';
const ONBOARDING_VERSION = 1;

// Onboarding steps
const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Frog! 🐸',
    description: 'A compassionate productivity app designed for how your brain actually works.',
    image: '🐸',
    tips: [
      'No guilt, no shame - just gentle support',
      'Works with your energy, not against it',
      'Gamification makes productivity fun'
    ]
  },
  {
    id: 'energy',
    title: 'Energy Check-ins ⚡',
    description: "Start each day by checking your energy level. We'll show you tasks that match how you're feeling.",
    image: '🔋',
    tips: [
      'Zombie Mode = only essential tasks',
      'Locked In = tackle the hard stuff!',
      'Your energy changes - that\'s okay!'
    ]
  },
  {
    id: 'frog',
    title: 'Eat the Frog 🐸',
    description: '"Eat a live frog first thing in the morning and nothing worse will happen to you the rest of the day." - Mark Twain',
    image: '🍽️',
    tips: [
      'Pick your hardest task as your "frog"',
      'Frogs give 2x XP when completed!',
      'Eating your frog = instant relief'
    ]
  },
  {
    id: 'top3',
    title: 'Daily Top 3 🎯',
    description: 'Pick just 3 tasks to focus on today. Less overwhelm, more progress.',
    image: '3️⃣',
    tips: [
      'Quality over quantity',
      'Reduces decision fatigue',
      'Celebrate completing your Top 3!'
    ]
  },
  {
    id: 'focus',
    title: 'Focus Timer ⏱️',
    description: 'Use timed focus sessions with ambient sounds to stay in the zone.',
    image: '🎧',
    tips: [
      'Start with 5 or 15 minutes',
      'Pick calming background sounds',
      'Capture stray thoughts in the dump'
    ]
  },
  {
    id: 'gamification',
    title: 'Level Up! 🎮',
    description: 'Earn XP, level up your frog, unlock achievements, and build streaks.',
    image: '🏆',
    tips: [
      'XP = difficulty × 10 (2x for frogs!)',
      'Watch your frog evolve as you level up',
      '30+ achievements to unlock'
    ]
  },
  {
    id: 'ready',
    title: "You're Ready! 🚀",
    description: "Let's set your energy and pick your first frog. You've got this!",
    image: '✨',
    tips: [
      'Start small - one task at a time',
      'Be kind to yourself',
      'Progress > Perfection'
    ]
  }
];

// Check if onboarding should be shown
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed || JSON.parse(completed).version < ONBOARDING_VERSION) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
      completed: true,
      version: ONBOARDING_VERSION,
      completedAt: new Date().toISOString()
    }));
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return {
    showOnboarding,
    currentStep,
    totalSteps: STEPS.length,
    step: STEPS[currentStep],
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding
  };
}

// Onboarding Modal Component
export function OnboardingModal({
  showOnboarding,
  currentStep,
  totalSteps,
  step,
  nextStep,
  prevStep,
  skipOnboarding
}) {
  const [animating, setAnimating] = useState(false);

  if (!showOnboarding || !step) return null;

  const handleNext = () => {
    setAnimating(true);
    setTimeout(() => {
      nextStep();
      setAnimating(false);
    }, 200);
  };

  const handlePrev = () => {
    setAnimating(true);
    setTimeout(() => {
      prevStep();
      setAnimating(false);
    }, 200);
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full overflow-hidden animate-scale-in">
        {/* Progress Bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className={`p-6 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {/* Image/Emoji */}
          <div className="text-center mb-6">
            <div className="text-7xl mb-4 animate-bounce-slow">{step.image}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
            <p className="text-white/70 text-sm leading-relaxed">{step.description}</p>
          </div>

          {/* Tips */}
          <div className="space-y-2 mb-6">
            {step.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white/5 rounded-xl p-3"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-white/80 text-sm">{tip}</span>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-3 text-white/60 hover:text-white/80 transition-colors text-sm"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 glass-button py-3 text-white font-medium"
            >
              {isLastStep ? "Let's Go! 🚀" : 'Next →'}
            </button>
          </div>

          {/* Skip option */}
          {!isLastStep && (
            <button
              onClick={skipOnboarding}
              className="w-full mt-3 py-2 text-white/30 hover:text-white/50 text-xs transition-colors"
            >
              Skip tutorial
            </button>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'bg-green-500 w-4'
                    : i < currentStep
                    ? 'bg-green-500/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Tour Tooltip Component
export function TourTooltip({ show, target, title, description, onDismiss, position = 'bottom' }) {
  if (!show) return null;

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div className={`absolute ${positionClasses[position]} glass-card p-4 max-w-xs z-50 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm mb-1">{title}</h4>
          <p className="text-white/60 text-xs">{description}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/40 hover:text-white/60 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Feature Discovery Component
export function FeatureDiscovery({ feature, onDismiss, children }) {
  const [discovered, setDiscovered] = useState(true);

  useEffect(() => {
    const discoveredFeatures = JSON.parse(localStorage.getItem('frog_discovered_features') || '[]');
    setDiscovered(discoveredFeatures.includes(feature));
  }, [feature]);

  const handleDismiss = () => {
    const discoveredFeatures = JSON.parse(localStorage.getItem('frog_discovered_features') || '[]');
    if (!discoveredFeatures.includes(feature)) {
      localStorage.setItem('frog_discovered_features', JSON.stringify([...discoveredFeatures, feature]));
    }
    setDiscovered(true);
    onDismiss?.();
  };

  if (discovered) return children;

  return (
    <div className="relative">
      {children}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
    </div>
  );
}

// Settings button to replay onboarding
export function OnboardingReplayButton({ onReplay }) {
  return (
    <button
      onClick={onReplay}
      className="flex items-center gap-2 text-white/60 hover:text-white/80 text-sm transition-colors"
    >
      <span>📖</span>
      <span>Replay Tutorial</span>
    </button>
  );
}

export default OnboardingModal;
