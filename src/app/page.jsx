'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase, getTasks, createTask, updateTask, completeTask as dbCompleteTask, getUserProgress, upsertUserProgress } from '@/lib/supabase';
import NotificationManager, { NOTIFICATION_TYPES } from '@/components/NotificationManager';
import { PageBackground, useBackground } from '@/components/BackgroundContext';
import BackgroundSelector from '@/components/BackgroundSelector';
import { useAchievements } from '@/components/AchievementsContext';
import { AchievementPopup } from '@/components/AchievementBadge';
import FrogCharacter, { getFrogStage, FrogEvolutionShowcase } from '@/components/FrogCharacter';
import FocusSounds from '@/components/FocusSounds';
import { ReminderPicker, ScheduledRemindersList, useRestoreReminders, scheduleNotification as scheduleTaskReminder, cancelNotification } from '@/components/ReminderManager';
import { CategoryManagerList, useCategories, getCategories, DEFAULT_CATEGORIES } from '@/components/CategoryManager';
import { Haptics } from '@/components/iOSUtils';
import SwipeableTask from '@/components/SwipeableTask';
import { TaskContextMenu } from '@/components/ContextMenu';
import PullToRefresh from '@/components/PullToRefresh';
import { useTheme, ThemeSelector, ThemeToggle } from '@/components/ThemeProvider';
import Confetti, { TaskCompleteCelebration, EmojiRain } from '@/components/Confetti';
import { TaskCardSkeleton, TaskListSkeleton, HeaderSkeleton } from '@/components/Skeleton';
import { TapToReorderList, useReorderableList } from '@/components/DraggableTaskList';
import WidgetPreview from '@/components/WidgetPreview';
import SwipeableTabView from '@/components/SwipeableTabView';
import { useDailyReminders, ReminderModal, ReminderSettings } from '@/components/DailyReminders';
import AppleRemindersSync from '@/components/AppleRemindersSync';
// New feature imports
import { useOnboarding, OnboardingModal } from '@/components/Onboarding';
import { AISuggestionsCard, useAITaskSuggestions } from '@/components/AITaskSuggestions';
import { DueDatePicker, DueDateBadge, OverdueTasksBanner, useDueDateNotifications } from '@/components/DueDateNotifications';
import SiriShortcuts from '@/components/SiriShortcuts';
import AppleWatchCompanion from '@/components/AppleWatchCompanion';
import { useAnalytics, AnalyticsDashboard } from '@/components/Analytics';
import UserProfile from '@/components/UserProfile';

// Categories - now uses dynamic categories from CategoryManager
// Default categories are defined in CategoryManager.jsx
// Custom categories are stored in localStorage

// Energy levels
const ENERGY_LEVELS = [
  { value: 1, label: 'Zombie Mode', emoji: '🧟', color: '#64748b', description: 'Just existing today' },
  { value: 2, label: 'Low Battery', emoji: '🔋', color: '#f59e0b', description: 'Can do easy stuff' },
  { value: 3, label: 'Cruising', emoji: '🚗', color: '#10b981', description: 'Normal productive day' },
  { value: 4, label: 'Locked In', emoji: '🔥', color: '#ef4444', description: "Let's crush it!" },
];

// Timer presets - includes ADHD-friendly 2-min micro-start
const TIMER_PRESETS = [
  { minutes: 2, label: '2m', description: 'Just start', adhd: true },  // ADHD: Overcome initiation paralysis
  { minutes: 5, label: '5m', description: 'Quick burst' },
  { minutes: 15, label: '15m', description: 'Pomodoro lite' },
  { minutes: 25, label: '25m', description: 'Pomodoro' },
];
// Calculate next due date for recurring tasks
const getNextDueDate = (currentDate, recurrence) => {
  const date = new Date(currentDate || new Date());
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekdays':
      date.setDate(date.getDate() + 1);
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString();
};

// Recurrence labels for display
const RECURRENCE_LABELS = {
  none: 'Once',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly'
};



// Local storage helper (fallback)
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

// Get ISO week number for streak freeze reset
const getISOWeek = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Time Blindness Helper: Get average actual time for a category
const getAverageTimeForCategory = (timeHistory, category, difficulty = null) => {
  const key = difficulty ? `${category}_${difficulty}` : category;
  const times = timeHistory[key] || timeHistory[category] || [];
  if (times.length === 0) return null;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return Math.round(avg);
};

// Time Blindness Helper: Get time prediction message
const getTimePrediction = (timeHistory, category, difficulty, estimatedMinutes) => {
  const avgTime = getAverageTimeForCategory(timeHistory, category, difficulty);
  if (!avgTime) return null;

  const diff = avgTime - estimatedMinutes;
  if (Math.abs(diff) <= 2) {
    return { message: `Usually takes ~${avgTime}min`, type: 'accurate', avgTime };
  } else if (diff > 0) {
    return { message: `Usually takes ~${avgTime}min (${diff}min longer than estimate)`, type: 'underestimate', avgTime };
  } else {
    return { message: `Usually takes ~${avgTime}min`, type: 'overestimate', avgTime };
  }
};

// REWARD VARIETY SYSTEM: Encouraging messages pool
const ENCOURAGING_MESSAGES = [
  { text: "You're on fire! 🔥", type: "hype" },
  { text: "Small wins add up! 💪", type: "gentle" },
  { text: "Your future self thanks you!", type: "motivational" },
  { text: "That's the momentum! 🚀", type: "hype" },
  { text: "One step at a time 🐢", type: "gentle" },
  { text: "Look at you being productive! ✨", type: "playful" },
  { text: "Brain worms defeated! 🧠", type: "playful" },
  { text: "You showed up. That matters.", type: "gentle" },
  { text: "Dopamine delivered! 📦", type: "playful" },
  { text: "Task crushed! 💥", type: "hype" },
  { text: "Your frog is proud 🐸", type: "playful" },
  { text: "Keep that beautiful momentum!", type: "motivational" },
  { text: "You're doing the thing!", type: "gentle" },
  { text: "Executive function: activated ⚡", type: "playful" },
  { text: "Another one bites the dust! 🎵", type: "hype" },
];

// REWARD VARIETY: Get random encouraging message (avoiding recent ones)
const getRandomEncouragement = (lastType = null, preferGentle = false) => {
  let pool = ENCOURAGING_MESSAGES;
  if (preferGentle) {
    pool = pool.filter(m => m.type === 'gentle' || m.type === 'motivational');
  }
  if (lastType) {
    pool = pool.filter(m => m.type !== lastType);
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

// REWARD VARIETY: Check for bonus XP (10% chance, increases with streak)
const checkBonusXP = (rewardStreak) => {
  const baseChance = 0.1; // 10% base chance
  const streakBonus = Math.min(rewardStreak * 0.05, 0.3); // Up to 30% bonus from streak
  return Math.random() < (baseChance + streakBonus);
};

// BODY DOUBLING: Simulate virtual focusers (creates feeling of community)
const getVirtualFocusersCount = () => {
  const hour = new Date().getHours();
  // More "people" during typical work hours
  if (hour >= 9 && hour <= 17) {
    return Math.floor(Math.random() * 15) + 8; // 8-22 people
  } else if (hour >= 6 && hour <= 22) {
    return Math.floor(Math.random() * 10) + 3; // 3-12 people
  }
  return Math.floor(Math.random() * 5) + 1; // 1-5 late night warriors
};

// CONTEXT-AWARE ENERGY: Get pattern key for current time
const getEnergyPatternKey = (date = new Date()) => {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
  const hour = date.getHours();
  const timeBlock = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `${dayOfWeek}_${timeBlock}`;
};

// CONTEXT-AWARE ENERGY: Analyze patterns and generate insights
const analyzeEnergyPatterns = (patterns, currentEnergy) => {
  if (Object.keys(patterns).length < 5) return null; // Need some data first

  const now = new Date();
  const currentKey = getEnergyPatternKey(now);
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  // Find best and worst times
  let bestTime = null;
  let worstTime = null;
  let bestAvg = 0;
  let worstAvg = 5;

  Object.entries(patterns).forEach(([key, data]) => {
    if (data.count >= 2) { // Need at least 2 data points
      const avg = data.totalEnergy / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestTime = key;
      }
      if (avg < worstAvg) {
        worstAvg = avg;
        worstTime = key;
      }
    }
  });

  // Current time pattern
  const currentPattern = patterns[currentKey];
  const typicalEnergy = currentPattern ? Math.round(currentPattern.totalEnergy / currentPattern.count) : null;

  // Generate insight
  let insight = null;
  if (bestTime) {
    const [day, time] = bestTime.split('_');
    insight = {
      bestTime: `${day} ${time}s`,
      bestAvgEnergy: Math.round(bestAvg * 10) / 10,
      currentTypical: typicalEnergy,
      suggestion: currentEnergy && typicalEnergy && currentEnergy < typicalEnergy - 0.5
        ? "Energy lower than usual - try quick wins today"
        : currentEnergy && typicalEnergy && currentEnergy > typicalEnergy + 0.5
        ? "Higher energy than usual - great day for your frog!"
        : null
    };
  }

  return insight;
};

// PANIC BUTTON: Find the absolute easiest task
const findEasiestTask = (tasks) => {
  if (tasks.length === 0) return null;

  // Filter incomplete tasks and sort by difficulty (lowest first)
  const incomplete = tasks.filter(t => !t.completed);
  if (incomplete.length === 0) return null;

  // Sort by difficulty, then by shortest estimated time
  const sorted = [...incomplete].sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    return (a.estimatedMinutes || 25) - (b.estimatedMinutes || 25);
  });

  return sorted[0];
};

// SENSORY REWARDS: Sound configurations
const CELEBRATION_SOUNDS = {
  chime: { frequency: 880, duration: 0.3, type: 'sine' },
  pop: { frequency: 600, duration: 0.15, type: 'square' },
  nature: { frequency: 440, duration: 0.5, type: 'triangle' },
  silent: null
};

// SENSORY REWARDS: Haptic patterns
const HAPTIC_PATTERNS = {
  standard: [100, 50, 100],
  gentle: [50],
  intense: [100, 30, 100, 30, 200],
  none: null
};

// SENSORY REWARDS: Play custom celebration sound
const playCelebrationSound = (soundType = 'chime') => {
  const config = CELEBRATION_SOUNDS[soundType];
  if (!config || typeof window === 'undefined') return;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = config.frequency;
    oscillator.type = config.type;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch (e) {
    console.log('Audio not available:', e);
  }
};

// SENSORY REWARDS: Trigger custom haptic
const triggerHaptic = (pattern = 'standard') => {
  const vibrationPattern = HAPTIC_PATTERNS[pattern];
  if (!vibrationPattern || typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(vibrationPattern);
};

// ACCOUNTABILITY: Generate share message
const generateAccountabilityMessage = (type, taskTitle = '', partnerName = '') => {
  const messages = {
    started: [
      `Hey ${partnerName}! I just started working on "${taskTitle}" 💪`,
      `Starting my focus session on "${taskTitle}" - wish me luck! 🐸`,
      `Time to eat my frog! Working on "${taskTitle}" now.`
    ],
    completed: [
      `I did it ${partnerName}! Finished "${taskTitle}" ✅`,
      `Frog eaten! "${taskTitle}" is done 🐸✨`,
      `Task complete: "${taskTitle}" - feeling accomplished!`
    ],
    frogEaten: [
      `BIG WIN! I ate my frog today: "${taskTitle}" 🐸🎉`,
      `${partnerName}, I conquered my hardest task! "${taskTitle}" is DONE!`,
      `Frog of the day demolished: "${taskTitle}" 💪🐸`
    ],
    struggling: [
      `Hey ${partnerName}, having a tough focus day. Could use some encouragement 💙`,
      `Brain not cooperating today. Just wanted to reach out.`,
      `Struggling to start. Sending this as my first small action.`
    ]
  };

  const pool = messages[type] || messages.completed;
  return pool[Math.floor(Math.random() * pool.length)];
};

// BAD DAY DETECTION: Threshold configurations
const BAD_DAY_THRESHOLDS = {
  panicButtonUses: 2,      // 2+ panic button presses
  taskSkips: 3,            // 3+ tasks skipped/abandoned
  focusAbandons: 2,        // 2+ focus sessions abandoned early
  lowProgressMinutes: 20,  // 20+ mins without a completion
  combinedScore: 5         // Weighted total for edge cases
};

// BAD DAY: Check if signals indicate a struggling day
const checkBadDaySignals = (signals) => {
  const score =
    (signals.panicButtonUses * 2) +
    (signals.taskSkips * 1) +
    (signals.focusAbandons * 1.5) +
    (signals.lowProgressMinutes > 20 ? 2 : 0);

  return (
    signals.panicButtonUses >= BAD_DAY_THRESHOLDS.panicButtonUses ||
    signals.taskSkips >= BAD_DAY_THRESHOLDS.taskSkips ||
    signals.focusAbandons >= BAD_DAY_THRESHOLDS.focusAbandons ||
    score >= BAD_DAY_THRESHOLDS.combinedScore
  );
};

// BAD DAY: Support messages
const BAD_DAY_MESSAGES = {
  detection: [
    "Looks like today's being tough. That's okay.",
    "Hey, noticing this might be a hard day. Want some help?",
    "Some days are like this. No judgment here."
  ],
  support: [
    "What if we made today a 'good enough' day instead of a productive day?",
    "One tiny win is still a win. Want me to find the easiest thing?",
    "Rest is productive too. But if you want, I can help you do just ONE thing."
  ]
};

// TASK CHUNKING: Generate micro-step suggestions based on task
const generateChunkSuggestions = (taskTitle, difficulty) => {
  const title = taskTitle.toLowerCase();

  // Common patterns and their breakdowns
  if (title.includes('write') || title.includes('draft') || title.includes('email')) {
    return [
      `Open document/app for "${taskTitle}"`,
      `Write just the first sentence`,
      `Add 2-3 more sentences`,
      `Quick review and send/save`
    ];
  }

  if (title.includes('clean') || title.includes('organize') || title.includes('tidy')) {
    return [
      `Set a 5-min timer`,
      `Pick up just 5 items`,
      `Wipe one surface`,
      `Put away what's in your hands`
    ];
  }

  if (title.includes('call') || title.includes('phone') || title.includes('contact')) {
    return [
      `Find the phone number`,
      `Write down 1-2 things to say`,
      `Dial the number`,
      `Say hello (the rest will follow)`
    ];
  }

  if (title.includes('study') || title.includes('read') || title.includes('learn')) {
    return [
      `Open the material`,
      `Read just one page/section`,
      `Write one thing you learned`,
      `Take a 2-min break, then one more page`
    ];
  }

  if (title.includes('exercise') || title.includes('workout') || title.includes('gym')) {
    return [
      `Put on workout clothes`,
      `Do 5 jumping jacks right now`,
      `Set up your space/equipment`,
      `Just 5 more minutes of movement`
    ];
  }

  // Generic breakdown based on difficulty
  const genericSteps = difficulty >= 3 ? [
    `Open/prepare what you need for "${taskTitle}"`,
    `Work on it for just 2 minutes`,
    `Take a tiny break, then 2 more minutes`,
    `Do one small part you've been avoiding`,
    `Wrap up whatever you've done - it counts!`
  ] : [
    `Start "${taskTitle}" - just begin`,
    `Do the easiest part first`,
    `Finish up - you're almost there!`
  ];

  return genericSteps;
};

// DOPAMINE PREVIEW: Calculate potential rewards for a task
const calculateTaskRewards = (task, streak, level, isFrog, bonusActive) => {
  const baseXP = task.difficulty * 10;
  const frogMultiplier = isFrog ? 2 : 1;
  const streakBonus = streak > 0 ? Math.min(streak * 2, 20) : 0;
  const levelBonus = Math.floor(level / 5) * 5;
  const bonusMultiplier = bonusActive ? 1.5 : 1;

  const totalXP = Math.round((baseXP * frogMultiplier + streakBonus + levelBonus) * bonusMultiplier);

  // Check for potential achievements
  const potentialAchievements = [];
  if (isFrog) potentialAchievements.push({ name: 'Frog Eater', emoji: '🐸' });
  if (streak >= 6) potentialAchievements.push({ name: 'Week Warrior', emoji: '🔥' });
  if (task.difficulty >= 4) potentialAchievements.push({ name: 'Challenge Accepted', emoji: '💪' });

  // Motivational extras
  const extras = [];
  if (isFrog) extras.push('2x XP for eating your frog!');
  if (streak > 0) extras.push(`${streak}-day streak bonus active`);
  if (bonusActive) extras.push('🎰 Lucky bonus multiplier!');
  if (task.difficulty >= 3) extras.push('Hard task = bigger reward!');

  return {
    baseXP,
    totalXP,
    streakBonus,
    frogBonus: isFrog ? baseXP : 0,
    potentialAchievements,
    extras,
    progressToNextLevel: Math.min(100, ((totalXP % 100) / 100) * 100)
  };
};

// FOCUS BUDDY: AI response generator
const FOCUS_BUDDY_RESPONSES = {
  greeting: [
    "Hey! I'm here to help you focus. What's on your mind? 💙",
    "Hi friend! Ready to tackle something together? 🌟",
    "Hello! I'm your focus buddy. How are you feeling about your tasks?"
  ],
  encouragement: [
    "You've got this! Even starting is a huge win. 💪",
    "Remember: progress over perfection. Any step forward counts!",
    "Your brain is unique and powerful. Let's work WITH it today! 🧠✨",
    "Taking breaks is productive too. You're doing great!",
    "One tiny task at a time. That's all it takes. 🌱"
  ],
  stuck: [
    "Feeling stuck is normal! Let's try the 2-minute rule: just start for 2 minutes.",
    "What's the tiniest first step you could take? Even opening a file counts!",
    "Sometimes our brain needs a reset. Try a 30-second stretch! 🧘",
    "You're not lazy - you might just need a different approach. What if we made the task smaller?"
  ],
  celebration: [
    "YES! Look at you go! 🎉",
    "That's amazing progress! Your future self thanks you! 🙌",
    "Another win in the books! You're building momentum! 🚀",
    "Incredible! See? You CAN do hard things! 💪"
  ],
  overwhelmed: [
    "It's okay to feel overwhelmed. Let's just focus on ONE thing right now. 💙",
    "Take a deep breath. You don't have to do everything today.",
    "What if we cleared everything and just picked the easiest task?",
    "Your worth isn't measured by your productivity. But I believe in you! 🌟"
  ],
  break: [
    "Break time is brain time! Your mind processes while you rest. 🧠",
    "Great choice taking a break! Hydrate, stretch, breathe. 💧",
    "Breaks make you MORE productive, not less. Science says so! 📊"
  ]
};

const generateBuddyResponse = (userMessage, context = {}) => {
  const msg = userMessage.toLowerCase();

  // Detect intent
  if (msg.includes('stuck') || msg.includes("can't") || msg.includes('hard')) {
    return FOCUS_BUDDY_RESPONSES.stuck[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.stuck.length)];
  }
  if (msg.includes('overwhelm') || msg.includes('too much') || msg.includes('anxious')) {
    return FOCUS_BUDDY_RESPONSES.overwhelmed[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.overwhelmed.length)];
  }
  if (msg.includes('done') || msg.includes('finished') || msg.includes('completed') || msg.includes('did it')) {
    return FOCUS_BUDDY_RESPONSES.celebration[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.celebration.length)];
  }
  if (msg.includes('break') || msg.includes('rest') || msg.includes('tired')) {
    return FOCUS_BUDDY_RESPONSES.break[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.break.length)];
  }
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
    return FOCUS_BUDDY_RESPONSES.greeting[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.greeting.length)];
  }

  // Default to encouragement
  return FOCUS_BUDDY_RESPONSES.encouragement[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.encouragement.length)];
};

// TIME ANCHORING: Check if current time matches a high-energy pattern
const checkTimeAnchor = (energyPatterns, currentEnergy) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const key = `${dayOfWeek}_${hour}`;

  const pattern = energyPatterns[key];
  if (!pattern || pattern.taskCount < 3) return null; // Need enough data

  // Check if this is typically a high-energy time
  if (pattern.avgEnergy >= 4 && pattern.avgCompletionRate > 0.6) {
    return {
      type: 'peak',
      message: `This is usually your power hour! You tend to crush tasks around ${hour}:00. Ready to tackle your frog? 🐸⚡`,
      confidence: Math.min(pattern.taskCount / 10, 1)
    };
  }

  // Check if energy seems low but pattern says it could be good
  if (currentEnergy <= 2 && pattern.avgEnergy >= 3) {
    return {
      type: 'encourage',
      message: `Historically, ${hour}:00 works well for you. Maybe try a quick 5-min task to build momentum? 🌱`,
      confidence: Math.min(pattern.taskCount / 10, 1)
    };
  }

  // Suggest break if pattern shows low productivity at this time
  if (pattern.avgCompletionRate < 0.3 && pattern.taskCount >= 5) {
    return {
      type: 'rest',
      message: `Your data shows ${hour}:00 isn't usually your peak time. Perfect for a guilt-free break! ☕`,
      confidence: Math.min(pattern.taskCount / 10, 1)
    };
  }

  return null;
};

// MOMENTUM MODE: Find the most similar task to continue the flow
const findSimilarTask = (completedTask, availableTasks) => {
  if (!completedTask || availableTasks.length === 0) return null;

  const incomplete = availableTasks.filter(t => !t.completed && t.id !== completedTask.id);
  if (incomplete.length === 0) return null;

  // Score tasks by similarity
  const scored = incomplete.map(task => {
    let score = 0;

    // Same category = high score
    if (task.category === completedTask.category) score += 5;

    // Similar difficulty = bonus
    const diffDiff = Math.abs((task.difficulty || 2) - (completedTask.difficulty || 2));
    score += (3 - diffDiff);

    // Similar time estimate = bonus
    const timeDiff = Math.abs((task.estimatedMinutes || 25) - (completedTask.estimatedMinutes || 25));
    if (timeDiff <= 10) score += 2;

    // Prefer easier tasks to maintain momentum
    score += (6 - (task.difficulty || 2));

    return { task, score };
  });

  // Sort by score and return the best match
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.task || null;
};

// DISTRACTION JOURNAL: Common distraction categories
const DISTRACTION_CATEGORIES = [
  { id: 'phone', emoji: '📱', label: 'Phone/Social Media' },
  { id: 'notification', emoji: '🔔', label: 'Notification' },
  { id: 'thought', emoji: '💭', label: 'Random thought/idea' },
  { id: 'hunger', emoji: '🍕', label: 'Hunger/Thirst' },
  { id: 'restroom', emoji: '🚽', label: 'Restroom break' },
  { id: 'person', emoji: '👤', label: 'Someone interrupted' },
  { id: 'bored', emoji: '😴', label: 'Got bored/Lost interest' },
  { id: 'anxious', emoji: '😰', label: 'Felt anxious/overwhelmed' },
  { id: 'other', emoji: '❓', label: 'Something else' }
];

// DISTRACTION JOURNAL: Get personalized tips based on patterns
const getDistractionTips = (patterns) => {
  const tips = [];
  const sorted = Object.entries(patterns).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return ['Keep tracking to discover your patterns!'];

  const topDistraction = sorted[0][0];
  const count = sorted[0][1];

  if (topDistraction === 'phone' && count >= 3) {
    tips.push('📱 Phone is your #1 distraction. Try putting it in another room during focus time.');
    tips.push('Consider using app blockers during focus sessions.');
  }
  if (topDistraction === 'notification' && count >= 3) {
    tips.push('🔔 Notifications pull you away often. Enable Do Not Disturb mode!');
  }
  if (topDistraction === 'thought' && count >= 3) {
    tips.push('💭 Your mind wanders a lot! Use the Thought Dump feature to capture ideas without losing focus.');
  }
  if (topDistraction === 'hunger' && count >= 2) {
    tips.push('🍕 Hunger derails you. Try having a snack ready before focus sessions.');
  }
  if (topDistraction === 'bored' && count >= 2) {
    tips.push('😴 Boredom is common with ADHD. Try shorter focus bursts (5-10 min) or body doubling.');
  }
  if (topDistraction === 'anxious' && count >= 2) {
    tips.push('😰 Anxiety is interrupting. Consider breaking tasks into smaller chunks or using the Panic Button.');
  }

  return tips.length > 0 ? tips : ['You\'re building awareness - that\'s the first step to improvement!'];
};

// ENERGY-BASED SORTING: Sort tasks based on current energy level
const sortTasksByEnergy = (tasks, currentEnergy, energyPatterns) => {
  if (!currentEnergy || tasks.length === 0) return tasks;

  return [...tasks].sort((a, b) => {
    // High energy (4-5): Prioritize difficult tasks and frogs
    if (currentEnergy >= 4) {
      // Frogs first when high energy
      if (a.frog && !b.frog) return -1;
      if (!a.frog && b.frog) return 1;
      // Then by difficulty (harder first)
      return (b.difficulty || 2) - (a.difficulty || 2);
    }

    // Medium energy (3): Balanced approach
    if (currentEnergy === 3) {
      // Moderate difficulty first
      const aDiff = Math.abs((a.difficulty || 2) - 3);
      const bDiff = Math.abs((b.difficulty || 2) - 3);
      return aDiff - bDiff;
    }

    // Low energy (1-2): Easy tasks first
    // Easy tasks first
    if ((a.difficulty || 2) !== (b.difficulty || 2)) {
      return (a.difficulty || 2) - (b.difficulty || 2);
    }
    // Then shorter tasks
    return (a.estimatedMinutes || 25) - (b.estimatedMinutes || 25);
  });
};

// TASK DNA: Analyze completion patterns to predict success
const analyzeTaskDNA = (taskDNA) => {
  const { completions, abandons } = taskDNA;

  if (completions.length < 5) return null; // Need more data

  // Analyze by different dimensions
  const insights = {
    bestCategories: {},
    bestTimeOfDay: {},
    bestDayOfWeek: {},
    bestDifficulty: {},
    bestEnergy: {},
    overallSuccessRate: completions.length / (completions.length + abandons.length)
  };

  // Count completions by dimension
  completions.forEach(task => {
    insights.bestCategories[task.category] = (insights.bestCategories[task.category] || 0) + 1;
    insights.bestTimeOfDay[task.timeOfDay] = (insights.bestTimeOfDay[task.timeOfDay] || 0) + 1;
    insights.bestDayOfWeek[task.dayOfWeek] = (insights.bestDayOfWeek[task.dayOfWeek] || 0) + 1;
    insights.bestDifficulty[task.difficulty] = (insights.bestDifficulty[task.difficulty] || 0) + 1;
    insights.bestEnergy[task.energy] = (insights.bestEnergy[task.energy] || 0) + 1;
  });

  // Subtract abandons to get net score
  abandons.forEach(task => {
    insights.bestCategories[task.category] = (insights.bestCategories[task.category] || 0) - 0.5;
    insights.bestTimeOfDay[task.timeOfDay] = (insights.bestTimeOfDay[task.timeOfDay] || 0) - 0.5;
    insights.bestDifficulty[task.difficulty] = (insights.bestDifficulty[task.difficulty] || 0) - 0.5;
  });

  return insights;
};

// TASK DNA: Score a task for current conditions
const scoreTaskDNA = (task, dnaInsights, currentEnergy, currentHour) => {
  if (!dnaInsights) return 50; // Default neutral score

  let score = 50;
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
  const dayOfWeek = new Date().getDay();

  // Category bonus (0-20 points)
  const categoryScore = dnaInsights.bestCategories[task.category] || 0;
  score += Math.min(20, categoryScore * 3);

  // Time of day bonus (0-15 points)
  const timeScore = dnaInsights.bestTimeOfDay[timeOfDay] || 0;
  score += Math.min(15, timeScore * 2);

  // Energy match bonus (0-15 points)
  const energyScore = dnaInsights.bestEnergy[currentEnergy] || 0;
  score += Math.min(15, energyScore * 2);

  // Difficulty match bonus (0-10 points)
  const difficultyScore = dnaInsights.bestDifficulty[task.difficulty] || 0;
  score += Math.min(10, difficultyScore * 2);

  return Math.min(100, Math.max(0, score));
};

// TASK DNA: Get top tasks likely to be completed
const getDNARecommendations = (tasks, dnaInsights, currentEnergy) => {
  if (!dnaInsights || tasks.length === 0) return [];

  const currentHour = new Date().getHours();
  const scored = tasks
    .filter(t => !t.completed)
    .map(task => ({
      task,
      score: scoreTaskDNA(task, dnaInsights, currentEnergy, currentHour)
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3); // Top 3 recommendations
};

// AMBIENT SOUNDS: Available sound configurations
const AMBIENT_SOUNDS = {
  rain: {
    name: 'Rain',
    emoji: '🌧️',
    description: 'Gentle rainfall',
    // Using Web Audio API oscillators to simulate sounds
    frequency: 200,
    type: 'brown-noise'
  },
  coffee: {
    name: 'Coffee Shop',
    emoji: '☕',
    description: 'Cafe ambience',
    frequency: 150,
    type: 'pink-noise'
  },
  lofi: {
    name: 'Lo-Fi',
    emoji: '🎵',
    description: 'Chill beats',
    frequency: 300,
    type: 'sine-wave'
  },
  forest: {
    name: 'Forest',
    emoji: '🌲',
    description: 'Nature sounds',
    frequency: 250,
    type: 'green-noise'
  },
  whitenoise: {
    name: 'White Noise',
    emoji: '📻',
    description: 'Pure static',
    frequency: 400,
    type: 'white-noise'
  },
  silence: {
    name: 'Silence',
    emoji: '🔇',
    description: 'No sound',
    frequency: 0,
    type: 'none'
  }
};

// AMBIENT SOUNDS: Create noise generator using Web Audio API
const createNoiseGenerator = (type, volume = 0.5) => {
  if (typeof window === 'undefined' || type === 'none') return null;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate different types of noise
    for (let i = 0; i < bufferSize; i++) {
      if (type === 'white-noise') {
        output[i] = Math.random() * 2 - 1;
      } else if (type === 'pink-noise' || type === 'brown-noise') {
        // Brown noise (random walk)
        const white = Math.random() * 2 - 1;
        output[i] = (output[i - 1] || 0) + (0.02 * white);
        output[i] = Math.max(-1, Math.min(1, output[i])); // Clamp
      } else if (type === 'green-noise') {
        // Green noise (mid-frequency emphasis)
        output[i] = Math.sin(i * 0.01) * 0.3 + (Math.random() * 0.4 - 0.2);
      } else {
        // Sine wave for lo-fi
        output[i] = Math.sin(i * 0.001) * 0.2;
      }
    }

    const whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume * 0.3; // Keep it subtle

    whiteNoise.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { source: whiteNoise, gain: gainNode, context: audioContext };
  } catch (e) {
    console.log('Audio not available:', e);
    return null;
  }
};

// FUTURE SELF: Get a random past message for encouragement
const getRandomFutureSelfMessage = (messages, currentMood = null) => {
  if (messages.length === 0) return null;

  // If low mood, prioritize uplifting messages
  if (currentMood && currentMood <= 2) {
    const upliftingMessages = messages.filter(m => m.mood >= 4);
    if (upliftingMessages.length > 0) {
      return upliftingMessages[Math.floor(Math.random() * upliftingMessages.length)];
    }
  }

  // Otherwise random
  return messages[Math.floor(Math.random() * messages.length)];
};

// FUTURE SELF: Prompt suggestions for leaving messages
const FUTURE_SELF_PROMPTS = [
  "What would you tell yourself on a hard day?",
  "What made this task feel good to complete?",
  "Any advice for future-you who's struggling?",
  "Describe how you feel right now in one sentence.",
  "What's one thing you're proud of today?"
];

// SMART BREAK REMINDERS: Break activities based on energy and time
const BREAK_ACTIVITIES = [
  { id: 1, text: 'Stretch for 2 minutes', emoji: '🧘', type: 'physical', energy: 'low' },
  { id: 2, text: 'Get some water', emoji: '💧', type: 'physical', energy: 'low' },
  { id: 3, text: 'Look away from screen (20-20-20)', emoji: '👀', type: 'rest', energy: 'low' },
  { id: 4, text: 'Take 5 deep breaths', emoji: '🌬️', type: 'rest', energy: 'low' },
  { id: 5, text: 'Quick walk around the room', emoji: '🚶', type: 'physical', energy: 'medium' },
  { id: 6, text: 'Do 10 jumping jacks', emoji: '⭐', type: 'physical', energy: 'high' },
  { id: 7, text: 'Dance to one song', emoji: '💃', type: 'physical', energy: 'high' },
  { id: 8, text: 'Text a friend something nice', emoji: '💬', type: 'social', energy: 'medium' },
  { id: 9, text: 'Pet an animal if available', emoji: '🐾', type: 'comfort', energy: 'low' },
  { id: 10, text: 'Stare out a window for 1 min', emoji: '🪟', type: 'rest', energy: 'low' },
  { id: 11, text: 'Eat a healthy snack', emoji: '🍎', type: 'physical', energy: 'medium' },
  { id: 12, text: 'Do a quick doodle', emoji: '✏️', type: 'creative', energy: 'low' }
];

// Get break suggestion based on energy and preferences
const getBreakSuggestion = (currentEnergy, breakCount = 0) => {
  // Map energy to activity energy levels
  const energyMap = {
    1: 'low', 2: 'low', 3: 'medium', 4: 'high'
  };
  const targetEnergy = energyMap[currentEnergy] || 'medium';

  // Filter activities, prefer matching energy but allow all
  let options = BREAK_ACTIVITIES.filter(a => a.energy === targetEnergy);
  if (options.length < 3) {
    options = BREAK_ACTIVITIES; // Fall back to all
  }

  // Rotate through activities to add variety
  const index = breakCount % options.length;
  return options[index];
};

// Check if break is needed (after X minutes of focus)
const BREAK_THRESHOLD_MINUTES = 50; // Suggest break after 50 mins total focus

// PROCRASTINATION BUSTER: Detect stuck tasks and offer help
const PROCRASTINATION_REASONS = [
  { id: 'unclear', text: "I don't know where to start", emoji: '🤔', help: 'chunk' },
  { id: 'boring', text: "It's boring or tedious", emoji: '😴', help: 'gamify' },
  { id: 'scary', text: "I'm afraid of failing", emoji: '😰', help: 'support' },
  { id: 'perfectionism', text: "I want it to be perfect", emoji: '✨', help: 'lower' },
  { id: 'energy', text: "I don't have the energy", emoji: '🔋', help: 'defer' },
  { id: 'overwhelm', text: "It feels too big", emoji: '🏔️', help: 'chunk' },
  { id: 'distraction', text: "I keep getting distracted", emoji: '🦋', help: 'focus' },
  { id: 'other', text: "Something else", emoji: '💭', help: 'talk' }
];

// Get procrastination help based on reason
const getProcrastinationHelp = (reason) => {
  const helps = {
    chunk: {
      title: "Let's break it down!",
      text: "Big tasks are scary. What's the tiniest first step you could do in 2 minutes?",
      action: "chunk"
    },
    gamify: {
      title: "Let's make it fun!",
      text: "Try the 'random minute' technique: set a timer for a random number between 5-15 and race it!",
      action: "timer"
    },
    support: {
      title: "It's okay to be imperfect",
      text: "Done is better than perfect. What would a 'good enough' version look like?",
      action: "lower"
    },
    lower: {
      title: "Lower the bar",
      text: "Try: 'I'll just do the worst possible version first, then improve it.'",
      action: "start"
    },
    defer: {
      title: "Not the right time",
      text: "That's valid! Let's mark this for when you have more energy.",
      action: "reschedule"
    },
    focus: {
      title: "Focus mode activated",
      text: "Let's try a super short 5-minute sprint. You can do anything for 5 minutes!",
      action: "sprint"
    },
    talk: {
      title: "Let's figure it out",
      text: "Sometimes we just need to process. What's really going on with this task?",
      action: "buddy"
    }
  };
  return helps[reason] || helps.talk;
};

// Check if task is being procrastinated (3+ attempts or 2+ skips)
const isProcrastinated = (taskAttempts, taskId) => {
  const attempts = taskAttempts[taskId];
  if (!attempts) return false;
  return attempts.attempts >= 3 || attempts.skips >= 2;
};

// QUICK WIN STREAKS: Milestone definitions
const STREAK_MILESTONES = [
  { streak: 3, title: 'Getting Started!', emoji: '🌱', reward: 'Momentum Builder' },
  { streak: 5, title: 'On a Roll!', emoji: '🔥', reward: 'Focus Fire' },
  { streak: 7, title: 'Unstoppable!', emoji: '⚡', reward: 'Power Streak' },
  { streak: 10, title: 'Legendary!', emoji: '👑', reward: 'Crown Achievement' },
  { streak: 15, title: 'Superhuman!', emoji: '🦸', reward: 'Hero Mode' },
  { streak: 20, title: 'Transcendent!', emoji: '✨', reward: 'Enlightened' }
];

// Get current milestone for streak
const getStreakMilestone = (streak) => {
  // Find highest milestone achieved
  const achieved = STREAK_MILESTONES.filter(m => streak >= m.streak);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
};

// Get next milestone
const getNextMilestone = (streak) => {
  return STREAK_MILESTONES.find(m => m.streak > streak) || null;
};

// FOCUS RITUAL: Default ritual steps
const DEFAULT_RITUAL_STEPS = [
  { id: 1, text: 'Take 3 deep breaths', emoji: '🌬️', completed: false },
  { id: 2, text: 'Clear your workspace', emoji: '🧹', completed: false },
  { id: 3, text: 'Put phone on silent', emoji: '📱', completed: false },
  { id: 4, text: 'Set your intention', emoji: '🎯', completed: false }
];

// ACCOMPLISHMENT JOURNAL: Generate summary for a date range
const generateAccomplishmentSummary = (completedTasks, dateRange = 'today') => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  let startDate;
  if (dateRange === 'today') {
    startDate = today;
  } else if (dateRange === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = weekAgo.toISOString().split('T')[0];
  } else if (dateRange === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    startDate = monthAgo.toISOString().split('T')[0];
  }

  const filtered = completedTasks.filter(task => {
    const taskDate = task.completedAt ? task.completedAt.split('T')[0] : today;
    return taskDate >= startDate;
  });

  const summary = {
    totalTasks: filtered.length,
    frogsEaten: filtered.filter(t => t.frog).length,
    totalXP: filtered.reduce((sum, t) => sum + (t.earnedXP || 0), 0),
    totalMinutes: filtered.reduce((sum, t) => sum + (t.timeData?.actual || 0), 0),
    categories: {},
    difficulties: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    bestDay: null,
    tasks: filtered
  };

  // Count by category
  filtered.forEach(task => {
    summary.categories[task.category] = (summary.categories[task.category] || 0) + 1;
    if (task.difficulty <= 2) summary.difficulties.easy++;
    else if (task.difficulty <= 3) summary.difficulties.medium++;
    else summary.difficulties.hard++;
  });

  return summary;
};

// ACCOMPLISHMENT JOURNAL: Get encouraging message based on accomplishments
const getAccomplishmentMessage = (summary) => {
  if (summary.totalTasks === 0) {
    return { emoji: '🌱', text: "Every journey starts somewhere. Ready to plant a seed?" };
  } else if (summary.frogsEaten > 0) {
    return { emoji: '🐸', text: `You ate ${summary.frogsEaten} frog${summary.frogsEaten > 1 ? 's' : ''}! That's real courage.` };
  } else if (summary.totalTasks >= 10) {
    return { emoji: '🚀', text: "Double digits! You're on fire!" };
  } else if (summary.totalTasks >= 5) {
    return { emoji: '⭐', text: "Solid progress! Keep the momentum going." };
  } else if (summary.difficulties.hard > 0) {
    return { emoji: '💪', text: "You tackled the hard stuff. That takes guts!" };
  } else {
    return { emoji: '✨', text: `${summary.totalTasks} task${summary.totalTasks > 1 ? 's' : ''} done! Every win counts.` };
  }
};

// TASK PARKING LOT: Reasons for parking a task
const PARK_REASONS = [
  { id: 'not-ready', text: 'Not ready yet', emoji: '⏳' },
  { id: 'waiting', text: 'Waiting on someone/something', emoji: '👥' },
  { id: 'wrong-time', text: 'Wrong time/season', emoji: '📅' },
  { id: 'need-info', text: 'Need more information', emoji: '❓' },
  { id: 'too-big', text: 'Too big right now', emoji: '🏔️' },
  { id: 'lost-interest', text: "Lost interest (and that's okay)", emoji: '💭' },
  { id: 'other', text: 'Other reason', emoji: '📝' }
];

// HYPERFOCUS GUARD: Warning messages
const HYPERFOCUS_MESSAGES = [
  { duration: 120, emoji: '⏰', text: "You've been at it for 2 hours! Time for a real break?" },
  { duration: 150, emoji: '🍽️', text: "2.5 hours in! Have you eaten? Hydrated?" },
  { duration: 180, emoji: '🌅', text: "3 hours of focus! Your brain deserves a rest." },
  { duration: 240, emoji: '😴', text: "4 hours! Seriously, take a break. This isn't sustainable." }
];

const getHyperfocusMessage = (minutes) => {
  const sorted = HYPERFOCUS_MESSAGES.sort((a, b) => b.duration - a.duration);
  return sorted.find(m => minutes >= m.duration) || HYPERFOCUS_MESSAGES[0];
};

// TASK AGING: Get age category and styling for a task
const TASK_AGE_CATEGORIES = [
  { maxDays: 1, label: 'Fresh', emoji: '✨', color: 'green', bonusXP: 0 },
  { maxDays: 3, label: 'Recent', emoji: '🌱', color: 'green', bonusXP: 0 },
  { maxDays: 7, label: 'Aging', emoji: '🍂', color: 'yellow', bonusXP: 5 },
  { maxDays: 14, label: 'Dusty', emoji: '🕸️', color: 'orange', bonusXP: 10 },
  { maxDays: 30, label: 'Ancient', emoji: '🏺', color: 'red', bonusXP: 20 },
  { maxDays: Infinity, label: 'Fossil', emoji: '🦴', color: 'purple', bonusXP: 30 }
];

const getTaskAge = (createdAt) => {
  if (!createdAt) return TASK_AGE_CATEGORIES[0];
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  return TASK_AGE_CATEGORIES.find(cat => days <= cat.maxDays) || TASK_AGE_CATEGORIES[TASK_AGE_CATEGORIES.length - 1];
};

const getTaskAgeDays = (createdAt) => {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
};

// MICRO-WINS: Celebration messages for different win types
const MICRO_WIN_MESSAGES = {
  start: [
    { emoji: '🚀', text: 'Blast off! You started!' },
    { emoji: '💪', text: 'Starting is the hardest part!' },
    { emoji: '⚡', text: 'Initiation complete!' },
    { emoji: '🎬', text: 'Action!' }
  ],
  subtask: [
    { emoji: '✅', text: 'Subtask crushed!' },
    { emoji: '🧩', text: 'Piece by piece!' },
    { emoji: '📦', text: 'One down!' },
    { emoji: '🎯', text: 'Bullseye!' }
  ],
  milestone5: [
    { emoji: '⏱️', text: '5 minutes in! Keep going!' },
    { emoji: '🌟', text: 'First 5 done!' }
  ],
  milestone15: [
    { emoji: '🔥', text: '15 minutes! On fire!' },
    { emoji: '💫', text: 'Quarter hour champion!' }
  ],
  milestone25: [
    { emoji: '🏆', text: 'Full pomodoro! Legend!' },
    { emoji: '👑', text: '25 minutes of focus!' }
  ],
  halfway: [
    { emoji: '🎉', text: 'Halfway there!' },
    { emoji: '⭐', text: 'Past the midpoint!' }
  ]
};

const getRandomMicroWin = (type) => {
  const messages = MICRO_WIN_MESSAGES[type] || MICRO_WIN_MESSAGES.start;
  return messages[Math.floor(Math.random() * messages.length)];
};

// DAILY INTENTION: Prompts for setting intention
const INTENTION_PROMPTS = [
  "What ONE task would make today feel successful?",
  "If you could only do ONE thing, what matters most?",
  "What will future-you thank you for completing?",
  "Which task has been weighing on you?",
  "What would give you the biggest sense of relief?"
];

// Glass Icon Button Component
function GlassIconButton({ icon, onClick, active, size = 'md', badge, className = '' }) {
  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-12 h-12 text-xl',
    lg: 'w-14 h-14 text-2xl'
  };
  
  return (
    <button
      onClick={onClick}
      className={`glass-icon ${sizes[size]} flex items-center justify-center relative transition-all hover:scale-105 active:scale-95 ${
        active ? 'ring-2 ring-white/30' : ''
      } ${className}`}
    >
      <span className={active ? '' : 'opacity-80'}>{icon}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// Glass Card Component
function GlassCard({ children, className = '', onClick, hover = false }) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-4 ${hover ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Frog() {
  const [screen, setScreen] = useState('checkin');
  const [energy, setEnergy] = useState(null);
  const [moodLog, setMoodLog] = useState([]); // [{timestamp, energy, note}]
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [moodNote, setMoodNote] = useState('');
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [focusTask, setFocusTask] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [frogCompleted, setFrogCompleted] = useState(false);
  const [dailyFrog, setDailyFrog] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', category: 'personal', difficulty: 2, estimatedMinutes: 25, recurrence: 'none', dueDate: null, dueReminder: 'none' });
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timeEstimates, setTimeEstimates] = useState({}); // { taskId: { estimated, actual, completed_at } }
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing');
  const [showNotifications, setShowNotifications] = useState(false);
  const [scheduleNotification, setScheduleNotification] = useState(null);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundEffects: true,
    vibration: true,
    showTaskCount: true,
    autoFilterByEnergy: true,
    compactMode: false,
    lowStimMode: false,  // ADHD: Reduce animations and visual noise
    gentleLanguage: true,  // ADHD: Use encouraging language instead of pressure
    // Streak Protection settings
    streakFreezesPerWeek: 2,  // Number of "forgiveness" days per week
    streakForgiveness: true   // Enable gentle streak recovery
  });

  // Time Blindness Helper - track actual times by category for predictions
  const [timeHistory, setTimeHistory] = useState({}); // { category: [actualMinutes, ...] }

  // Transition Momentum - buffer screen between tasks
  const [showTransition, setShowTransition] = useState(false);
  const [completedTaskData, setCompletedTaskData] = useState(null); // { task, actualMinutes, estimatedMinutes, xpEarned }
  const [suggestedNextTask, setSuggestedNextTask] = useState(null);

  // Streak Protection state
  const [streakFreezesUsed, setStreakFreezesUsed] = useState(0); // How many freezes used this week
  const [streakPaused, setStreakPaused] = useState(false); // Whether streak is currently "paused" not "lost"
  const [lastStreakWeek, setLastStreakWeek] = useState(null); // ISO week number to reset freezes

  // ADHD Features State
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(null);
  const [taskInProgress, setTaskInProgress] = useState(null);  // Track task user was working on
  const [startedTasks, setStartedTasks] = useState({});  // Track which tasks user has started (for Start XP)
  // Thought Dump - quick capture during focus (moved to focus screen only)
  const [thoughtDump, setThoughtDump] = useState([]);
  const [showThoughtInput, setShowThoughtInput] = useState(false);
  const [quickThought, setQuickThought] = useState('');
  // ADHD: One Thing Mode - radically simplified view showing only the frog
  const [oneThingMode, setOneThingMode] = useState(true);
  const [expandedTask, setExpandedTask] = useState(null);
  const [subtasks, setSubtasks] = useState({});  // { taskId: [{id, title, completed}] }
  const [newSubtask, setNewSubtask] = useState('');

  // BODY DOUBLING MODE - Virtual accountability
  const [bodyDoublingActive, setBodyDoublingActive] = useState(false);
  const [virtualFocusers, setVirtualFocusers] = useState(0); // Simulated count of others focusing
  const [bodyDoublingStartTime, setBodyDoublingStartTime] = useState(null);

  // CONTEXT-AWARE ENERGY TRACKING - Learn patterns
  const [energyPatterns, setEnergyPatterns] = useState({}); // { dayOfWeek_hour: { avgEnergy, taskCount, avgCompletionRate } }
  const [productivityInsights, setProductivityInsights] = useState(null); // Computed insights

  // REWARD VARIETY SYSTEM - Dopamine maintenance
  const [rewardStreak, setRewardStreak] = useState(0); // Consecutive completions for bonus
  const [lastRewardType, setLastRewardType] = useState(null); // Track variety
  const [bonusXPActive, setBonusXPActive] = useState(false); // Surprise bonus multiplier

  // PANIC BUTTON / EMERGENCY MODE - When everything is overwhelming
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyTask, setEmergencyTask] = useState(null); // The ONE easiest thing

  // EXTERNAL ACCOUNTABILITY - Real human connection
  const [accountabilityPartner, setAccountabilityPartner] = useState(null); // { name, contact }
  const [showAccountabilitySetup, setShowAccountabilitySetup] = useState(false);
  const [accountabilityNotifications, setAccountabilityNotifications] = useState([]); // Log of sent notifications

  // SENSORY REWARD CUSTOMIZATION - Personalized dopamine delivery
  const [sensoryPreferences, setSensoryPreferences] = useState({
    celebrationSound: 'chime', // chime, pop, nature, silent
    hapticPattern: 'standard', // standard, gentle, intense, none
    visualEffect: 'confetti', // confetti, glow, minimal, none
    messageStyle: 'mixed' // hype, gentle, playful, mixed
  });

  // BAD DAY AUTO-DETECT - Proactive support when struggling
  const [badDaySignals, setBadDaySignals] = useState({
    panicButtonUses: 0,
    taskSkips: 0,
    focusAbandons: 0,
    lowProgressMinutes: 0, // Time on app without completing anything
    sessionStartTime: null
  });
  const [showBadDaySupport, setShowBadDaySupport] = useState(false);
  const [badDayMode, setBadDayMode] = useState(false); // Reduced expectations active

  // VOICE INPUT - Frictionless task capture
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const speechRecognitionRef = useRef(null);

  // TASK CHUNKING - Break overwhelming tasks into micro-steps
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [taskToChunk, setTaskToChunk] = useState(null);
  const [suggestedChunks, setSuggestedChunks] = useState([]);
  const [customChunks, setCustomChunks] = useState(['', '', '']);

  // DOPAMINE PREVIEW - Show rewards before starting
  const [showDopaminePreview, setShowDopaminePreview] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);
  const [previewRewards, setPreviewRewards] = useState(null);

  // FOCUS BUDDY - AI encouragement chat
  const [showFocusBuddy, setShowFocusBuddy] = useState(false);
  const [focusBuddyMessages, setFocusBuddyMessages] = useState([]);
  const [focusBuddyInput, setFocusBuddyInput] = useState('');

  // TIME ANCHORING - Smart notifications based on energy patterns
  const [timeAnchorEnabled, setTimeAnchorEnabled] = useState(true);
  const [lastTimeAnchorCheck, setLastTimeAnchorCheck] = useState(null);
  const [showTimeAnchorSuggestion, setShowTimeAnchorSuggestion] = useState(false);
  const [timeAnchorMessage, setTimeAnchorMessage] = useState(null);

  // MOMENTUM MODE - Capitalize on consecutive completions
  const [momentumStreak, setMomentumStreak] = useState(0); // Consecutive completions this session
  const [momentumMode, setMomentumMode] = useState(false); // Auto-triggered after 2+ completions
  const [momentumSuggestion, setMomentumSuggestion] = useState(null); // Suggested next similar task
  const [showMomentumPrompt, setShowMomentumPrompt] = useState(false);

  // DISTRACTION JOURNAL - Track what pulls attention away
  const [showDistractionCapture, setShowDistractionCapture] = useState(false);
  const [distractionLog, setDistractionLog] = useState([]); // [{timestamp, reason, task, duration}]
  const [currentDistraction, setCurrentDistraction] = useState('');
  const [distractionPatterns, setDistractionPatterns] = useState({}); // {reason: count}

  // ENERGY-BASED SORTING - Smart task ordering
  const [energySortEnabled, setEnergySortEnabled] = useState(true);
  const [sortedByEnergy, setSortedByEnergy] = useState(false);

  // TASK DNA - Learn completion patterns for smart suggestions
  const [taskDNA, setTaskDNA] = useState({
    completions: [], // [{category, difficulty, timeOfDay, dayOfWeek, energy, duration, completed: true}]
    abandons: []     // [{category, difficulty, timeOfDay, dayOfWeek, energy, duration, completed: false}]
  });
  const [dnaInsights, setDnaInsights] = useState(null); // Computed insights
  const [showDNASuggestion, setShowDNASuggestion] = useState(false);
  const [dnaSuggestedTask, setDnaSuggestedTask] = useState(null);

  // AMBIENT SOUND MIXER - Focus sounds
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(false);
  const [currentAmbientSound, setCurrentAmbientSound] = useState('rain');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const ambientAudioRef = useRef(null);

  // FUTURE SELF MESSAGES - Motivation from past wins
  const [futureSelfMessages, setFutureSelfMessages] = useState([]); // [{id, taskTitle, message, timestamp, mood}]
  const [showFutureSelfCapture, setShowFutureSelfCapture] = useState(false);
  const [futureSelfInput, setFutureSelfInput] = useState('');
  const [showFutureSelfMessage, setShowFutureSelfMessage] = useState(false);
  const [currentFutureSelfMessage, setCurrentFutureSelfMessage] = useState(null);

  // SMART BREAK REMINDERS - Prevent burnout with timed breaks
  const [breakReminderEnabled, setBreakReminderEnabled] = useState(true);
  const [lastBreakTime, setLastBreakTime] = useState(null);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0); // Cumulative focus time since last break
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [suggestedBreakActivity, setSuggestedBreakActivity] = useState(null);
  const [breaksTaken, setBreaksTaken] = useState(0); // Track breaks for stats

  // PROCRASTINATION BUSTER - Detect and help with stuck tasks
  const [taskAttempts, setTaskAttempts] = useState({}); // {taskId: {attempts: number, lastAttempt: Date, skips: number}}
  const [showProcrastinationHelp, setShowProcrastinationHelp] = useState(false);
  const [procrastinatedTask, setProcrastinatedTask] = useState(null);
  const [procrastinationReasons, setProcrastinationReasons] = useState([]); // Common reasons this user procrastinates

  // QUICK WIN STREAKS - Visual streak tracking for momentum
  const [quickWinStreak, setQuickWinStreak] = useState(0); // Current streak of completed tasks
  const [bestQuickWinStreak, setBestQuickWinStreak] = useState(0); // All-time best
  const [streakMilestones, setStreakMilestones] = useState([]); // [{streak, timestamp, tasks}]
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakReward, setStreakReward] = useState(null); // Special reward for hitting milestone

  // FOCUS RITUAL BUILDER - Pre-focus routine for task initiation
  const [focusRitualEnabled, setFocusRitualEnabled] = useState(true);
  const [focusRitualSteps, setFocusRitualSteps] = useState([
    { id: 1, text: 'Take 3 deep breaths', emoji: '🌬️', completed: false },
    { id: 2, text: 'Clear your workspace', emoji: '🧹', completed: false },
    { id: 3, text: 'Put phone on silent', emoji: '📱', completed: false },
    { id: 4, text: 'Set your intention', emoji: '🎯', completed: false }
  ]);
  const [showFocusRitual, setShowFocusRitual] = useState(false);
  const [ritualTaskPending, setRitualTaskPending] = useState(null); // Task to start after ritual
  const [ritualMinutesPending, setRitualMinutesPending] = useState(null);
  const [showRitualEditor, setShowRitualEditor] = useState(false);

  // ACCOMPLISHMENT JOURNAL - Track and celebrate daily wins
  const [showAccomplishmentJournal, setShowAccomplishmentJournal] = useState(false);
  const [accomplishmentHistory, setAccomplishmentHistory] = useState({}); // {date: {tasks: [], xp: number, frogsEaten: number, focusMinutes: number}}
  const [journalView, setJournalView] = useState('today'); // 'today', 'week', 'month'

  // TASK PARKING LOT - Guilt-free zone for skipped tasks
  const [parkedTasks, setParkedTasks] = useState([]); // [{task, parkedAt, reason}]
  const [showParkingLot, setShowParkingLot] = useState(false);
  const [showParkTaskModal, setShowParkTaskModal] = useState(false);
  const [taskToPark, setTaskToPark] = useState(null);
  const [parkReason, setParkReason] = useState('');

  // HYPERFOCUS GUARD - Protect against burnout from extended sessions
  const [hyperfocusGuardEnabled, setHyperfocusGuardEnabled] = useState(true);
  const [hyperfocusThreshold, setHyperfocusThreshold] = useState(120); // Minutes before warning (default 2 hours)
  const [sessionStartTime, setSessionStartTime] = useState(null); // When current app session started
  const [showHyperfocusWarning, setShowHyperfocusWarning] = useState(false);
  const [hyperfocusExtensions, setHyperfocusExtensions] = useState(0); // How many times they've extended

  // DAILY INTENTION / NORTH STAR - The ONE task that makes today meaningful
  const [dailyIntention, setDailyIntention] = useState(null); // Task ID of today's north star
  const [showIntentionPicker, setShowIntentionPicker] = useState(false);
  const [intentionSetDate, setIntentionSetDate] = useState(null); // Track when intention was set

  // TASK AGING - Visual indicators for how long tasks have been sitting
  const [taskCreatedDates, setTaskCreatedDates] = useState({}); // {taskId: createdAt ISO string}

  // MICRO-WINS - Frequent celebration triggers
  const [microWinEnabled, setMicroWinEnabled] = useState(true);
  const [showMicroWin, setShowMicroWin] = useState(false);
  const [microWinType, setMicroWinType] = useState(null); // 'start', 'subtask', 'milestone', 'halfway'
  const [microWinMessage, setMicroWinMessage] = useState('');
  const [focusMilestones, setFocusMilestones] = useState([]); // Track which milestones hit this session

  const [userId, setUserId] = useState(null);
  
  // Dynamic categories (default + custom)
  const [CATEGORIES, refreshCategories] = useCategories();
  const { isDark, toggleTheme } = useTheme();
  
  // Daily Reminders for ADD-friendly check-ins
  const {
    settings: reminderSettings,
    updateSettings: updateReminderSettings,
    showReminder,
    dismissReminder,
    snoozeReminder,
    recordCheckin,
    requestPermission: requestReminderPermission,
    permission: reminderPermission,
    scheduleDailyNotifications
  } = useDailyReminders();
  
  // Reminder picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderTask, setReminderTask] = useState(null);
  
  // iOS Context Menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuTask, setContextMenuTask] = useState(null);
  
  // Pull to refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Confetti and celebration state
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiFrog, setConfettiFrog] = useState(false);
  
  // Widget modal state
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  
  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false);

  // New feature modal states
  const [showSiriShortcuts, setShowSiriShortcuts] = useState(false);
  const [showAppleWatch, setShowAppleWatch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const timerRef = useRef(null);

  // Restore scheduled reminders on load
  useRestoreReminders(tasks);

  // Achievements hook
  const { checkAchievements, stats: achievementStats } = useAchievements();

  // Onboarding hook
  const onboarding = useOnboarding();

  // Analytics hook
  const { trackEvent, trackFeature, EVENT_TYPES } = useAnalytics();

  // Due date notifications hook
  const { checkOverdueTasks } = useDueDateNotifications(tasks);

  // VOICE INPUT: Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setNewTask(prev => ({
            ...prev,
            title: prev.title ? `${prev.title} ${transcript}` : transcript
          }));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }
  }, []);

  // BAD DAY: Track session start and low progress time
  useEffect(() => {
    if (!badDaySignals.sessionStartTime) {
      setBadDaySignals(prev => ({ ...prev, sessionStartTime: Date.now() }));
    }

    // Check for prolonged low progress every minute
    const interval = setInterval(() => {
      if (badDaySignals.sessionStartTime && completedTasks.length === 0) {
        const minutesElapsed = Math.floor((Date.now() - badDaySignals.sessionStartTime) / 60000);
        if (minutesElapsed > badDaySignals.lowProgressMinutes) {
          setBadDaySignals(prev => ({ ...prev, lowProgressMinutes: minutesElapsed }));
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [badDaySignals.sessionStartTime, badDaySignals.lowProgressMinutes, completedTasks.length]);

  // BAD DAY: Check signals and offer support proactively
  useEffect(() => {
    if (!badDayMode && !showBadDaySupport && checkBadDaySignals(badDaySignals)) {
      // Delay slightly to not interrupt mid-action
      const timeout = setTimeout(() => {
        setShowBadDaySupport(true);
        Haptics.light();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [badDaySignals, badDayMode, showBadDaySupport]);

  // TIME ANCHORING: Check patterns periodically (every 30 minutes)
  useEffect(() => {
    if (!timeAnchorEnabled || !energy || screen !== 'tasks') return;

    // Only check if we haven't checked in the last 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    if (lastTimeAnchorCheck && Date.now() - lastTimeAnchorCheck < thirtyMinutes) return;

    const anchor = checkTimeAnchor(energyPatterns, energy);
    if (anchor && anchor.confidence >= 0.5) {
      setTimeAnchorMessage(anchor);
      setShowTimeAnchorSuggestion(true);
      setLastTimeAnchorCheck(Date.now());
    }
  }, [timeAnchorEnabled, energy, energyPatterns, screen, lastTimeAnchorCheck]);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setSyncStatus('syncing');

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        const authUserId = user?.id || 'anonymous';
        setUserId(authUserId);

        const dbTasks = await getTasks(authUserId);
        const incompleteTasks = dbTasks.filter(t => !t.completed);
        const completed = dbTasks.filter(t => t.completed);

        const formattedTasks = incompleteTasks.map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          difficulty: t.difficulty,
          frog: t.is_frog,
          notes: t.notes
        }));

        setTasks(formattedTasks);
        setCompletedTasks(completed);

        const progress = await getUserProgress(authUserId);
        if (progress) {
          setXp(progress.total_xp || 0);
          setLevel(progress.level || 1);

          // STREAK PROTECTION: Check if we need to use a freeze day
          const lastActivity = progress.last_activity_date;
          const today = new Date().toISOString().split('T')[0];
          const currentStreak = progress.current_streak || 0;

          if (lastActivity && lastActivity !== today && currentStreak > 0) {
            const lastDate = new Date(lastActivity);
            const todayDate = new Date(today);
            const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
              // Yesterday - streak continues normally
              setStreak(currentStreak);
            } else if (daysDiff > 1) {
              // Missed days - check for freeze
              const savedSettings = Storage.get('settings', {});
              const freezesPerWeek = savedSettings.streakFreezesPerWeek || 2;
              const forgiveness = savedSettings.streakForgiveness !== false;
              const usedFreezes = Storage.get('streakFreezesUsed', 0);
              const missedDays = daysDiff - 1;

              if (forgiveness && usedFreezes + missedDays <= freezesPerWeek) {
                // Use freeze days to protect streak
                const newFreezesUsed = usedFreezes + missedDays;
                setStreakFreezesUsed(newFreezesUsed);
                setStreakPaused(true);
                setStreak(currentStreak);
                Storage.set('streakFreezesUsed', newFreezesUsed);
                Storage.set('streakPaused', true);
              } else if (forgiveness && usedFreezes < freezesPerWeek) {
                // Partial protection - use remaining freezes but reduce streak
                const protectedDays = freezesPerWeek - usedFreezes;
                const lostDays = missedDays - protectedDays;
                const newStreak = Math.max(0, currentStreak - lostDays);
                setStreakFreezesUsed(freezesPerWeek);
                setStreakPaused(true);
                setStreak(newStreak);
                Storage.set('streakFreezesUsed', freezesPerWeek);
                Storage.set('streakPaused', true);
              } else {
                // No protection available - streak resets but with gentle message
                setStreak(0);
                setStreakPaused(false);
                Storage.set('streakPaused', false);
              }
            }
          } else {
            setStreak(currentStreak);
          }
        }

        // Check if we have a saved frog
        const savedFrog = formattedTasks.find(t => t.frog);
        if (savedFrog) {
          setDailyFrog(savedFrog);
        }
        
        // Check last activity date
        const lastDate = Storage.get('lastDate', null);
        const today = new Date().toDateString();
        if (lastDate === today) {
          const savedEnergy = Storage.get('todayEnergy', null);
          if (savedEnergy) {
            setEnergy(savedEnergy);
            setScreen('tasks');
          }
        }
        
        setSyncStatus('synced');
      } catch (error) {
        console.error('Error loading data:', error);
        setSyncStatus('offline');
        
        // Load from localStorage as fallback
        const localTasks = Storage.get('tasks', []);
        setTasks(localTasks.filter(t => !t.completed));
        setCompletedTasks(localTasks.filter(t => t.completed));
        setXp(Storage.get('xp', 0));
        setLevel(Storage.get('level', 1));
        setStreak(Storage.get('streak', 0));
      } finally {
        // Load subtasks from localStorage
        const savedSubtasks = Storage.get('subtasks', {});
        setSubtasks(savedSubtasks);
        
        // Load time estimates
        const savedEstimates = Storage.get('timeEstimates', {});
        setTimeEstimates(savedEstimates);
        
        // Load mood log (filter to today only)
        const savedMoodLog = Storage.get('moodLog', []);
        const today = new Date().toDateString();
        const todayMoods = savedMoodLog.filter(m => new Date(m.timestamp).toDateString() === today);
        setMoodLog(todayMoods);
        
        // Load settings
        const savedSettings = Storage.get('settings', null);
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }

        // Load Time Blindness Helper history
        const savedTimeHistory = Storage.get('timeHistory', {});
        setTimeHistory(savedTimeHistory);

        // Load Streak Protection data
        const savedStreakFreezesUsed = Storage.get('streakFreezesUsed', 0);
        const savedLastStreakWeek = Storage.get('lastStreakWeek', null);
        const currentWeek = getISOWeek();

        // Reset freezes if new week
        if (savedLastStreakWeek !== currentWeek) {
          setStreakFreezesUsed(0);
          setLastStreakWeek(currentWeek);
          Storage.set('streakFreezesUsed', 0);
          Storage.set('lastStreakWeek', currentWeek);
        } else {
          setStreakFreezesUsed(savedStreakFreezesUsed);
          setLastStreakWeek(savedLastStreakWeek);
        }
        
        // Load thought dump (today only)
        const savedThoughts = Storage.get('thoughtDump', []);
        const todayThoughts = savedThoughts.filter(t => new Date(t.timestamp).toDateString() === today);
        setThoughtDump(todayThoughts);

        // CONTEXT-AWARE ENERGY: Load energy patterns
        const savedEnergyPatterns = Storage.get('energyPatterns', {});
        setEnergyPatterns(savedEnergyPatterns);

        // REWARD VARIETY: Load reward streak
        const savedRewardStreak = Storage.get('rewardStreak', 0);
        // Reset if last completion wasn't today
        const lastRewardDate = Storage.get('lastRewardDate', null);
        if (lastRewardDate !== today) {
          setRewardStreak(0);
        } else {
          setRewardStreak(savedRewardStreak);
        }

        // ACCOUNTABILITY: Load partner settings
        const savedPartner = Storage.get('accountabilityPartner', null);
        if (savedPartner) {
          setAccountabilityPartner(savedPartner);
        }

        // SENSORY REWARDS: Load preferences
        const savedSensoryPrefs = Storage.get('sensoryPreferences', null);
        if (savedSensoryPrefs) {
          setSensoryPreferences(prev => ({ ...prev, ...savedSensoryPrefs }));
        }

        // TASK DNA: Load completion patterns
        const savedTaskDNA = Storage.get('taskDNA', null);
        if (savedTaskDNA) {
          setTaskDNA(savedTaskDNA);
          const insights = analyzeTaskDNA(savedTaskDNA);
          setDnaInsights(insights);
        }

        // FUTURE SELF: Load past messages
        const savedFutureSelfMessages = Storage.get('futureSelfMessages', []);
        if (savedFutureSelfMessages.length > 0) {
          setFutureSelfMessages(savedFutureSelfMessages);
        }

        // SMART BREAK: Load break settings
        const savedBreaksTaken = Storage.get('breaksTakenToday', 0);
        const breakDate = Storage.get('breakDate', null);
        const todayStr = new Date().toDateString();
        if (breakDate === todayStr) {
          setBreaksTaken(savedBreaksTaken);
        } else {
          Storage.set('breakDate', todayStr);
          Storage.set('breaksTakenToday', 0);
        }

        // PROCRASTINATION: Load task attempts
        const savedTaskAttempts = Storage.get('taskAttempts', {});
        if (Object.keys(savedTaskAttempts).length > 0) {
          setTaskAttempts(savedTaskAttempts);
        }
        const savedProcrastinationReasons = Storage.get('procrastinationReasons', []);
        if (savedProcrastinationReasons.length > 0) {
          setProcrastinationReasons(savedProcrastinationReasons);
        }

        // QUICK WIN STREAKS: Load streak data
        const savedQuickWinStreak = Storage.get('quickWinStreak', 0);
        const savedBestStreak = Storage.get('bestQuickWinStreak', 0);
        const savedMilestones = Storage.get('streakMilestones', []);
        setQuickWinStreak(savedQuickWinStreak);
        setBestQuickWinStreak(savedBestStreak);
        setStreakMilestones(savedMilestones);

        // FOCUS RITUAL: Load custom ritual steps
        const savedRitualSteps = Storage.get('focusRitualSteps', null);
        if (savedRitualSteps && savedRitualSteps.length > 0) {
          setFocusRitualSteps(savedRitualSteps);
        }
        const savedRitualEnabled = Storage.get('focusRitualEnabled', true);
        setFocusRitualEnabled(savedRitualEnabled);

        // ACCOMPLISHMENT JOURNAL: Load history
        const savedAccomplishments = Storage.get('accomplishmentHistory', {});
        if (Object.keys(savedAccomplishments).length > 0) {
          setAccomplishmentHistory(savedAccomplishments);
        }

        // TASK PARKING LOT: Load parked tasks
        const savedParkedTasks = Storage.get('parkedTasks', []);
        if (savedParkedTasks.length > 0) {
          setParkedTasks(savedParkedTasks);
        }

        // HYPERFOCUS GUARD: Load settings and start session timer
        const savedHyperfocusEnabled = Storage.get('hyperfocusGuardEnabled', true);
        setHyperfocusGuardEnabled(savedHyperfocusEnabled);
        const savedThreshold = Storage.get('hyperfocusThreshold', 120);
        setHyperfocusThreshold(savedThreshold);
        // Start session timer when app loads
        setSessionStartTime(Date.now());

        // DAILY INTENTION: Load today's intention if set
        const savedIntention = Storage.get('dailyIntention', null);
        const savedIntentionDate = Storage.get('intentionSetDate', null);
        if (savedIntention && savedIntentionDate) {
          const today = new Date().toDateString();
          const intentionDay = new Date(savedIntentionDate).toDateString();
          if (today === intentionDay) {
            // Same day - restore intention
            setDailyIntention(savedIntention);
            setIntentionSetDate(savedIntentionDate);
          } else {
            // New day - clear old intention and prompt for new one
            setDailyIntention(null);
            setIntentionSetDate(null);
            Storage.set('dailyIntention', null);
            Storage.set('intentionSetDate', null);
          }
        }

        // TASK AGING: Load created dates for all tasks
        const savedCreatedDates = Storage.get('taskCreatedDates', {});
        if (Object.keys(savedCreatedDates).length > 0) {
          setTaskCreatedDates(savedCreatedDates);
        }

        // MICRO-WINS: Load settings
        const savedMicroWinEnabled = Storage.get('microWinEnabled', true);
        setMicroWinEnabled(savedMicroWinEnabled);

        // Check for rollover tasks (from previous days)
        checkRolloverTasks();
        
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, [userId]);

  // Save subtasks to localStorage when changed
  useEffect(() => {
    if (Object.keys(subtasks).length > 0) {
      Storage.set('subtasks', subtasks);
    }
  }, [subtasks]);

  // HYPERFOCUS GUARD: Check session duration periodically
  useEffect(() => {
    if (!hyperfocusGuardEnabled || !sessionStartTime) return;

    const checkInterval = setInterval(() => {
      const minutesElapsed = Math.floor((Date.now() - sessionStartTime) / 60000);
      const adjustedThreshold = hyperfocusThreshold + (hyperfocusExtensions * 30);

      if (minutesElapsed >= adjustedThreshold && !showHyperfocusWarning) {
        setShowHyperfocusWarning(true);
        Haptics.medium();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [hyperfocusGuardEnabled, sessionStartTime, hyperfocusThreshold, hyperfocusExtensions, showHyperfocusWarning]);

  // Save time estimates to localStorage
  useEffect(() => {
    if (Object.keys(timeEstimates).length > 0) {
      Storage.set('timeEstimates', timeEstimates);
    }
  }, [timeEstimates]);

  // Save mood log and update historical data
  useEffect(() => {
    if (moodLog.length > 0) {
      // Get all historical moods and merge with today
      const allMoods = Storage.get('moodLog', []);
      const today = new Date().toDateString();
      const otherDays = allMoods.filter(m => new Date(m.timestamp).toDateString() !== today);
      Storage.set('moodLog', [...otherDays, ...moodLog]);
    }
  }, [moodLog]);

  // Save settings when changed
  useEffect(() => {
    Storage.set('settings', settings);
  }, [settings]);

  // Save thought dump
  useEffect(() => {
    if (thoughtDump.length > 0) {
      const allThoughts = Storage.get('thoughtDump', []);
      const today = new Date().toDateString();
      const otherDays = allThoughts.filter(t => new Date(t.timestamp).toDateString() !== today);
      Storage.set('thoughtDump', [...otherDays, ...thoughtDump]);
    }
  }, [thoughtDump]);

  // CONTEXT-AWARE ENERGY: Compute insights when energy patterns change
  useEffect(() => {
    if (energy && Object.keys(energyPatterns).length >= 5) {
      const insights = analyzeEnergyPatterns(energyPatterns, energy);
      setProductivityInsights(insights);
    }
  }, [energyPatterns, energy]);

  // BODY DOUBLING: Periodically update virtual focuser count for realism
  useEffect(() => {
    if (!bodyDoublingActive) return;

    const interval = setInterval(() => {
      // Slightly vary the count every 30 seconds for realism
      setVirtualFocusers(prev => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.max(1, Math.min(30, prev + delta));
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [bodyDoublingActive]);

  // Add a quick thought (during focus mode)
  const addQuickThought = (text) => {
    if (!text.trim()) return;
    const thought = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      convertedToTask: false
    };
    setThoughtDump(prev => [...prev, thought]);
    setQuickThought('');
    setShowThoughtInput(false);
    
    // Quick feedback
    if (settings.soundEffects) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.15);
      } catch (e) {}
    }
    if (settings.vibration && navigator.vibrate) navigator.vibrate(30);
  };

  // Convert thought to task
  const convertThoughtToTask = (thought) => {
    const newTaskFromThought = {
      id: Date.now(),
      title: thought.text,
      category: 'personal',
      difficulty: 2,
      estimatedMinutes: 15,
      completed: false,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [...prev, newTaskFromThought]);
    setThoughtDump(prev => prev.map(t => 
      t.id === thought.id ? { ...t, convertedToTask: true } : t
    ));
  };

  // Delete thought
  const deleteThought = (thoughtId) => {
    setThoughtDump(prev => prev.filter(t => t.id !== thoughtId));
  };

  // Toggle a setting
  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    
    // Handle push notification permission
    if (key === 'pushNotifications') {
      if (!settings.pushNotifications) {
        // Turning ON - request permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    }
    
    // Play feedback if sounds enabled
    if (settings.soundEffects) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.1);
      } catch (e) {}
    }
    if (settings.vibration && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  // Quick mood change function
  const changeMood = (newEnergy, note = '') => {
    const moodEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      energy: newEnergy,
      previousEnergy: energy,
      note: note.trim(),
      timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'
    };
    
    setMoodLog(prev => [...prev, moodEntry]);
    setEnergy(newEnergy);
    Storage.set('todayEnergy', newEnergy);
    setShowMoodPicker(false);
    setMoodNote('');
    
    // Play a gentle confirmation sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 440 + (newEnergy * 100); // Higher pitch for higher energy
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.2);
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {}
  };

  // Get mood trend (improving, declining, stable)
  const getMoodTrend = () => {
    if (moodLog.length < 2) return 'stable';
    const recent = moodLog.slice(-3);
    const avgRecent = recent.reduce((sum, m) => sum + m.energy, 0) / recent.length;
    const first = moodLog[0].energy;
    if (avgRecent > first + 0.5) return 'improving';
    if (avgRecent < first - 0.5) return 'declining';
    return 'stable';
  };

  // ===== ADHD HELPER FUNCTIONS =====

  // Pick For Me - Random task selector based on current energy
  const pickRandomTask = () => {
    Haptics.medium();

    // Filter tasks by energy level (if auto-filter enabled)
    let eligibleTasks = tasks.filter(t => !t.completed);

    if (settings.autoFilterByEnergy && energy) {
      // Match tasks to energy: low energy = easy tasks, high energy = hard tasks
      if (energy <= 2) {
        eligibleTasks = eligibleTasks.filter(t => t.difficulty <= 2);
      } else if (energy === 3) {
        eligibleTasks = eligibleTasks.filter(t => t.difficulty <= 4);
      }
      // High energy (4) can do any task
    }

    // If no tasks match energy filter, fall back to all tasks
    if (eligibleTasks.length === 0) {
      eligibleTasks = tasks.filter(t => !t.completed);
    }

    if (eligibleTasks.length === 0) return null;

    // Random selection with slight preference for frog task
    const frogTask = eligibleTasks.find(t => t.frog);
    if (frogTask && Math.random() > 0.7) {
      return frogTask;
    }

    const randomIndex = Math.floor(Math.random() * eligibleTasks.length);
    const selectedTask = eligibleTasks[randomIndex];

    // Play fun sound for pick
    if (settings.soundEffects) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        // Playful ascending tones
        osc.frequency.setValueAtTime(400, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.3);
      } catch (e) {}
    }

    return selectedTask;
  };

  // Handle Pick For Me button press
  const handlePickForMe = () => {
    const task = pickRandomTask();
    if (task) {
      // Start with micro-start (2 minutes) to overcome initiation paralysis
      startFocusWithStartXP(task, 2);
    }
  };

  // Start focus WITH Start XP reward (ADHD dopamine hit for just starting)
  const startFocusWithStartXP = async (task, minutes) => {
    // Award Start XP if this is the first time starting this task
    if (!startedTasks[task.id]) {
      const startXP = Math.max(2, Math.floor((task.difficulty * 10) * 0.1)); // 10% of completion XP, min 2
      setXp(prev => prev + startXP);

      // Mark task as started
      setStartedTasks(prev => ({ ...prev, [task.id]: true }));
      Storage.set('startedTasks', { ...startedTasks, [task.id]: true });

      // Play encouraging start sound
      if (settings.soundEffects) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = 523.25; // C5 - bright, encouraging
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.12, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.2);
        } catch (e) {}
      }

      if (settings.vibration && navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }

    // Track for distraction recovery
    setTaskInProgress(task);
    setLastActiveTime(Date.now());
    Storage.set('taskInProgress', task);
    Storage.set('lastActiveTime', Date.now());

    // PROCRASTINATION BUSTER: Track this attempt (inline to avoid circular dependency)
    setTaskAttempts(prev => {
      const current = prev[task.id] || { attempts: 0, skips: 0, lastAttempt: null };
      const updated = { ...current, attempts: current.attempts + 1, lastAttempt: new Date().toISOString() };
      const newAttempts = { ...prev, [task.id]: updated };
      Storage.set('taskAttempts', newAttempts);
      return newAttempts;
    });

    // FOCUS RITUAL: Start ritual if enabled, otherwise start focus directly
    if (focusRitualEnabled && minutes >= 5) { // Only show ritual for 5+ minute sessions
      // Reset ritual steps and show modal
      setFocusRitualSteps(prev => prev.map(step => ({ ...step, completed: false })));
      setRitualTaskPending(task);
      setRitualMinutesPending(minutes);
      setShowFocusRitual(true);
      Haptics.light();
    } else {
      startFocus(task, minutes);
    }
  };

  // Check for distraction recovery on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedLastActive = Storage.get('lastActiveTime', null);
        const savedTaskInProgress = Storage.get('taskInProgress', null);

        if (savedLastActive && savedTaskInProgress) {
          const timeSinceActive = Date.now() - savedLastActive;
          // Show welcome back if gone for more than 2 minutes
          if (timeSinceActive > 2 * 60 * 1000 && screen !== 'focus') {
            setTaskInProgress(savedTaskInProgress);
            setShowWelcomeBack(true);
          }
        }
      } else {
        // User is leaving - save current state
        setLastActiveTime(Date.now());
        Storage.set('lastActiveTime', Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [screen]);

  // Load started tasks from storage
  useEffect(() => {
    const savedStartedTasks = Storage.get('startedTasks', {});
    setStartedTasks(savedStartedTasks);
  }, []);

  // Rollover tasks function - move incomplete tasks from previous days
  const checkRolloverTasks = () => {
    const today = new Date().toDateString();
    const lastCheckDate = Storage.get('lastRolloverCheck', null);
    
    if (lastCheckDate !== today) {
      // Mark today as checked
      Storage.set('lastRolloverCheck', today);
      
      // Tasks automatically carry over since we don't delete incomplete ones
      // Just log for awareness
      console.log('Rollover check complete - tasks persist automatically');
    }
  };

  // Timer logic
  useEffect(() => {
    if (timerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      timerRef.current = setTimeout(() => {
        if (timerSeconds === 0) {
          setTimerMinutes(m => m - 1);
          setTimerSeconds(59);

          // MICRO-WINS: Check for time milestones when minutes decrement
          if (microWinEnabled && timerStartTime) {
            const elapsedMinutes = Math.floor((Date.now() - timerStartTime) / 60000);
            const totalMinutes = Math.floor((Date.now() - timerStartTime) / 60000) + timerMinutes;

            // Time-based milestones
            const milestones = [
              { minutes: 5, type: 'milestone5' },
              { minutes: 15, type: 'milestone15' },
              { minutes: 25, type: 'milestone25' }
            ];

            for (const milestone of milestones) {
              if (elapsedMinutes >= milestone.minutes && !focusMilestones.includes(milestone.minutes)) {
                setFocusMilestones(prev => [...prev, milestone.minutes]);
                const win = getRandomMicroWin(milestone.type);
                setMicroWinType(milestone.type);
                setMicroWinMessage(win);
                setShowMicroWin(true);
                Haptics.success();
                setTimeout(() => setShowMicroWin(false), 2000);
                break;
              }
            }

            // Halfway milestone (if session is 6+ minutes)
            if (totalMinutes >= 6) {
              const halfway = Math.floor(totalMinutes / 2);
              if (elapsedMinutes >= halfway && !focusMilestones.includes('halfway')) {
                setFocusMilestones(prev => [...prev, 'halfway']);
                const win = getRandomMicroWin('halfway');
                setMicroWinType('halfway');
                setMicroWinMessage(win);
                setShowMicroWin(true);
                Haptics.success();
                setTimeout(() => setShowMicroWin(false), 2000);
              }
            }
          }
        } else {
          setTimerSeconds(s => s - 1);
        }
      }, 1000);
    } else if (timerRunning && timerMinutes === 0 && timerSeconds === 0) {
      setTimerRunning(false);
      
      // Play sound and vibrate
      if (typeof window !== 'undefined') {
        try {
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.log('Audio not available:', e);
        }
      }
      
      // Send push notification
      if (scheduleNotification && focusTask) {
        const taskXP = focusTask.difficulty * 10 + (focusTask.frog ? 20 : 0);
        scheduleNotification(NOTIFICATION_TYPES.FOCUS_END, 0, { 
          xp: taskXP,
          taskTitle: focusTask.title 
        });
      }
      
      if (focusTask) {
        handleCompleteTask(focusTask);
      }
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerMinutes, timerSeconds, focusTask, microWinEnabled, timerStartTime, focusMilestones]);

  // Update document title with timer status
  useEffect(() => {
    if (timerRunning) {
      const timeStr = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;
      document.title = `${timeStr} | Frog 🐸`;
    } else if (screen === 'focus') {
      const timeStr = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;
      document.title = `⏸️ ${timeStr} | Frog 🐸`;
    } else {
      document.title = 'Frog 🐸';
    }
  }, [timerRunning, timerMinutes, timerSeconds, screen]);

  const handleEnergySelect = async (value) => {
    setEnergy(value);
    Storage.set('todayEnergy', value);
    Storage.set('lastDate', new Date().toDateString());

    // CONTEXT-AWARE ENERGY: Track pattern
    const patternKey = getEnergyPatternKey();
    setEnergyPatterns(prev => {
      const existing = prev[patternKey] || { totalEnergy: 0, count: 0, completions: 0 };
      const updated = {
        ...prev,
        [patternKey]: {
          totalEnergy: existing.totalEnergy + value,
          count: existing.count + 1,
          completions: existing.completions
        }
      };
      Storage.set('energyPatterns', updated);
      return updated;
    });

    // Generate productivity insights
    const insights = analyzeEnergyPatterns(energyPatterns, value);
    setProductivityInsights(insights);

    try {
      await supabase.from('focusflow_energy_log').upsert({
        user_id: userId,
        energy_level: value,
        log_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id,log_date' });
    } catch (error) {
      console.error('Error logging energy:', error);
    }

    setScreen('frog');
  };

  const handleFrogSelect = async (task) => {
    if (dailyFrog && dailyFrog.id !== task.id) {
      try {
        await updateTask(dailyFrog.id, { is_frog: false });
      } catch (e) {
        console.error('Error updating old frog:', e);
      }
      setTasks(prev => prev.map(t => t.id === dailyFrog.id ? { ...t, frog: false } : t));
    }
    
    try {
      await updateTask(task.id, { is_frog: true });
    } catch (e) {
      console.error('Error setting frog:', e);
    }
    
    const updatedTask = { ...task, frog: true };
    setDailyFrog(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    setScreen('tasks');
  };

  const startFocus = (task, minutes) => {
    setFocusTask(task);
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setTimerRunning(true);
    setTimerStartTime(Date.now());
    setScreen('focus');

    // MICRO-WINS: Reset milestones for new session and trigger start celebration
    setFocusMilestones([]);
    if (microWinEnabled) {
      // Trigger start micro-win after brief delay
      setTimeout(() => {
        const win = getRandomMicroWin('start');
        setMicroWinType('start');
        setMicroWinMessage(win);
        setShowMicroWin(true);
        Haptics.success();
        setTimeout(() => setShowMicroWin(false), 2000);
      }, 500);
    }
  };

  // AMBIENT SOUND: Stop ambient sound (defined early for use in handleCompleteTask)
  const stopAmbientSound = useCallback(() => {
    if (ambientAudioRef.current) {
      try {
        ambientAudioRef.current.source.stop();
        ambientAudioRef.current.context.close();
      } catch (e) {}
      ambientAudioRef.current = null;
    }
    setAmbientSoundEnabled(false);
  }, []);

  // TASK DNA: Record a completion for pattern learning (defined early for use in handleCompleteTask)
  const recordTaskDNA = useCallback((task, completed, duration) => {
    const now = new Date();
    const entry = {
      id: Date.now(),
      category: task.category,
      difficulty: task.difficulty || 2,
      timeOfDay: now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening',
      dayOfWeek: now.getDay(),
      energy: energy || 3,
      duration: duration,
      completed: completed,
      timestamp: now.toISOString()
    };

    setTaskDNA(prev => {
      const updated = {
        completions: completed ? [...prev.completions, entry].slice(-50) : prev.completions,
        abandons: !completed ? [...prev.abandons, entry].slice(-30) : prev.abandons
      };
      Storage.set('taskDNA', updated);

      // Recalculate insights
      const insights = analyzeTaskDNA(updated);
      setDnaInsights(insights);

      return updated;
    });
  }, [energy]);

  const handleCompleteTask = useCallback(async (task) => {
    const baseXP = task.difficulty * 10;
    const frogBonus = task.frog ? 20 : 0;

    // TASK AGING: Bonus XP for completing old tasks
    const agingBonus = taskCreatedDates[task.id] ? getTaskAge(taskCreatedDates[task.id]).bonusXP : 0;

    // DAILY INTENTION: Extra bonus for completing your north star
    const intentionBonus = (dailyIntention === task.id) ? 15 : 0;

    // REWARD VARIETY: Check for bonus XP surprise
    const gotBonusXP = checkBonusXP(rewardStreak);
    const bonusMultiplier = gotBonusXP ? 1.5 : 1;
    const earnedXP = Math.round((baseXP + frogBonus + agingBonus + intentionBonus) * bonusMultiplier);
    setBonusXPActive(gotBonusXP);

    // REWARD VARIETY: Update reward streak and get encouraging message
    const newRewardStreak = rewardStreak + 1;
    setRewardStreak(newRewardStreak);
    Storage.set('rewardStreak', newRewardStreak);
    Storage.set('lastRewardDate', new Date().toDateString());

    // Get varied encouraging message
    const encouragement = getRandomEncouragement(lastRewardType, settings.gentleLanguage);
    setLastRewardType(encouragement.type);
    
    // Calculate actual time spent (if timer was used)
    let actualMinutes = 0;
    let estimatedMinutes = task.estimatedMinutes || 25;
    let timeSaved = 0;
    
    if (timerStartTime) {
      actualMinutes = Math.round((Date.now() - timerStartTime) / 60000);
      timeSaved = Math.max(0, estimatedMinutes - actualMinutes);
    }
    
    // Save time estimate data
    const now = new Date();
    const timeData = {
      estimated: estimatedMinutes,
      actual: actualMinutes,
      timeSaved: timeSaved,
      completed_at: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours()
    };
    
    setTimeEstimates(prev => ({
      ...prev,
      [task.id]: timeData
    }));
    
    // Update achievement stats
    const currentStats = Storage.get('achievement_stats', {
      tasksCompleted: 0,
      frogsEaten: 0,
      totalTimeSaved: 0,
      accurateEstimates: 0,
      beatEstimates: 0,
      subtasksCompleted: 0,
      earlyTasks: 0,
      lateTasks: 0,
      weekendTasks: 0
    });
    
    const newStats = {
      ...currentStats,
      tasksCompleted: currentStats.tasksCompleted + 1,
      frogsEaten: task.frog ? currentStats.frogsEaten + 1 : currentStats.frogsEaten,
      totalTimeSaved: currentStats.totalTimeSaved + timeSaved,
      beatEstimates: actualMinutes < estimatedMinutes ? currentStats.beatEstimates + 1 : currentStats.beatEstimates,
      accurateEstimates: Math.abs(actualMinutes - estimatedMinutes) <= 5 ? currentStats.accurateEstimates + 1 : currentStats.accurateEstimates,
      earlyTasks: now.getHours() < 7 ? currentStats.earlyTasks + 1 : currentStats.earlyTasks,
      lateTasks: now.getHours() >= 23 ? currentStats.lateTasks + 1 : currentStats.lateTasks,
      weekendTasks: [0, 6].includes(now.getDay()) ? currentStats.weekendTasks + 1 : currentStats.weekendTasks,
      totalXP: xp + earnedXP,
      level: Math.floor((xp + earnedXP) / 100) + 1
    };
    
    Storage.set('achievement_stats', newStats);
    checkAchievements(newStats);
    
    try {
      await dbCompleteTask(task.id, earnedXP);
      
      const newTotalXP = xp + earnedXP;
      const newLevel = Math.floor(newTotalXP / 100) + 1;
      const newTasksCompleted = completedTasks.length + 1;
      
      await upsertUserProgress({
        user_id: userId,
        total_xp: newTotalXP,
        level: newLevel,
        tasks_completed: newTasksCompleted,
        frogs_eaten: task.frog ? (Storage.get('frogsEaten', 0) + 1) : Storage.get('frogsEaten', 0),
        last_activity_date: new Date().toISOString().split('T')[0]
      });
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error completing task:', error);
      setSyncStatus('offline');
    }
    
    setXp(prev => prev + earnedXP);
    const newXP = xp + earnedXP;
    setLevel(Math.floor(newXP / 100) + 1);
    
    // Handle recurring tasks - create next instance
    if (task.recurrence && task.recurrence !== 'none') {
      const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);
      if (nextDueDate) {
        const recurringTask = {
          id: Date.now(),
          title: task.title,
          category: task.category,
          difficulty: task.difficulty,
          estimatedMinutes: task.estimatedMinutes,
          recurrence: task.recurrence,
          dueDate: nextDueDate,
          frog: false,
          subtasks: task.subtasks ? task.subtasks.map(st => ({ ...st, completed: false })) : []
        };
        setTasks(prev => [...prev, recurringTask]);
        
        // Update local storage
        const savedTasks = Storage.get('tasks', []);
        Storage.set('tasks', [...savedTasks.filter(t => t.id !== task.id), recurringTask]);
      }
    }
    
    // Remove from tasks, add to completed
    const remainingTasks = tasks.filter(t => t.id !== task.id);
    setTasks(remainingTasks);
    setCompletedTasks(prev => [...prev, { ...task, completed: true, completedAt: new Date().toISOString(), timeData, earnedXP }]);

    if (task.frog) {
      setFrogCompleted(true);
      setDailyFrog(null);
    }

    // TIME BLINDNESS HELPER: Update time history for this category
    if (actualMinutes > 0) {
      const categoryKey = `${task.category}_${task.difficulty}`;
      setTimeHistory(prev => {
        const updated = {
          ...prev,
          [categoryKey]: [...(prev[categoryKey] || []), actualMinutes].slice(-10), // Keep last 10
          [task.category]: [...(prev[task.category] || []), actualMinutes].slice(-20) // Keep last 20
        };
        Storage.set('timeHistory', updated);
        return updated;
      });
    }

    // TRANSITION MOMENTUM: Show transition screen instead of going directly to tasks
    const nextTask = findNextSuggestedTask(remainingTasks, energy, task);
    setSuggestedNextTask(nextTask);

    setCompletedTaskData({
      task,
      actualMinutes,
      estimatedMinutes,
      xpEarned: earnedXP,
      timeDiff: actualMinutes - estimatedMinutes,
      // REWARD VARIETY additions
      encouragement: encouragement.text,
      bonusXP: gotBonusXP,
      rewardStreak: newRewardStreak
    });

    // SENSORY REWARDS: Trigger celebration with user preferences
    if (sensoryPreferences.visualEffect !== 'none') {
      setConfettiFrog(task.frog);
      setShowConfetti(sensoryPreferences.visualEffect === 'confetti');
    }

    // Play custom celebration sound and haptic
    if (sensoryPreferences.celebrationSound !== 'silent') {
      playCelebrationSound(sensoryPreferences.celebrationSound);
    }
    if (sensoryPreferences.hapticPattern !== 'none') {
      triggerHaptic(sensoryPreferences.hapticPattern);
    }

    // ACCOUNTABILITY: Send notification to partner if set up
    if (accountabilityPartner) {
      const notifType = task.frog ? 'frogEaten' : 'completed';
      // Auto-send for frog completion, otherwise just log
      if (task.frog) {
        sendAccountabilityNotification(notifType, task.title);
      }
    }

    setFocusTask(null);
    setTimerStartTime(null);

    // AMBIENT SOUND: Stop ambient sounds when task completes
    stopAmbientSound();

    // BODY DOUBLING: End session if active
    if (bodyDoublingActive) {
      setBodyDoublingActive(false);
      setBodyDoublingStartTime(null);
    }

    // EMERGENCY MODE: Exit if we were in it
    if (emergencyMode) {
      exitEmergencyMode(true);
    }

    // MOMENTUM MODE: Track consecutive completions
    const newMomentumStreak = momentumStreak + 1;
    setMomentumStreak(newMomentumStreak);

    // Trigger momentum mode prompt after 2+ completions
    if (newMomentumStreak >= 2 && remainingTasks.length > 0) {
      const similarTask = findSimilarTask(task, remainingTasks);
      if (similarTask) {
        setMomentumSuggestion(similarTask);
        setMomentumMode(true);
        // Show momentum prompt after transition dismisses
        setTimeout(() => {
          if (!showTransition) {
            setShowMomentumPrompt(true);
          }
        }, 3000);
      }
    }

    // TASK DNA: Record completion for pattern learning
    recordTaskDNA(task, true, actualMinutes);

    // ACCOMPLISHMENT JOURNAL: Record this win (inline to avoid circular dependency)
    const accomplishmentDate = new Date().toISOString().split('T')[0];
    setAccomplishmentHistory(prev => {
      const dayData = prev[accomplishmentDate] || { tasks: [], xp: 0, frogsEaten: 0, focusMinutes: 0 };
      const updated = {
        ...prev,
        [accomplishmentDate]: {
          tasks: [...dayData.tasks, { ...task, earnedXP, timeData, completedAt: new Date().toISOString() }],
          xp: dayData.xp + earnedXP,
          frogsEaten: dayData.frogsEaten + (task.frog ? 1 : 0),
          focusMinutes: dayData.focusMinutes + actualMinutes
        }
      };
      Storage.set('accomplishmentHistory', updated);
      return updated;
    });

    // QUICK WIN STREAKS: Update streak on completion (inline to avoid circular dependency)
    setQuickWinStreak(prevStreak => {
      const newStreak = prevStreak + 1;
      Storage.set('quickWinStreak', newStreak);
      // Check for milestone celebration
      const milestone = STREAK_MILESTONES.find(m => m.streak === newStreak);
      if (milestone) {
        setStreakReward(milestone);
        setShowStreakCelebration(true);
        Haptics.success();
      }
      if (newStreak > bestQuickWinStreak) {
        setBestQuickWinStreak(newStreak);
        Storage.set('bestQuickWinStreak', newStreak);
      }
      return newStreak;
    });

    // SMART BREAK: Check if break is needed after focus (inline)
    if (actualMinutes > 0 && breakReminderEnabled) {
      setTotalFocusMinutes(prev => {
        const newTotal = prev + actualMinutes;
        if (newTotal >= BREAK_THRESHOLD_MINUTES) {
          const activity = getBreakSuggestion(energy, breaksTaken);
          setSuggestedBreakActivity(activity);
          setShowBreakReminder(true);
        }
        return newTotal;
      });
    }

    // PROCRASTINATION BUSTER: Clear procrastination data for completed task (inline)
    setTaskAttempts(prev => {
      const updated = { ...prev };
      delete updated[task.id];
      Storage.set('taskAttempts', updated);
      return updated;
    });

    // DAILY INTENTION: Clear if we just completed our north star task
    if (dailyIntention === task.id) {
      setDailyIntention(null);
      setIntentionSetDate(null);
      Storage.set('dailyIntention', null);
      Storage.set('intentionSetDate', null);
      // Show extra celebration - they completed their ONE THING!
      Haptics.success();
    }

    // FUTURE SELF: Prompt for message after completing (especially for frogs or hard tasks)
    if (task.frog || task.difficulty >= 4) {
      // Show prompt after transition screen
      setTimeout(() => {
        setCompletedTaskData(prev => ({ ...prev, taskForMessage: task }));
        setShowFutureSelfCapture(true);
      }, 3500);
    }

    // Show transition screen (will auto-dismiss or user can continue)
    setShowTransition(true);

    Storage.set('xp', newXP);
    Storage.set('level', Math.floor(newXP / 100) + 1);
  }, [xp, completedTasks.length, userId, timerStartTime, checkAchievements, tasks, energy, rewardStreak, lastRewardType, settings.gentleLanguage, bodyDoublingActive, sensoryPreferences, accountabilityPartner, emergencyMode, momentumStreak, showTransition, recordTaskDNA, stopAmbientSound, bestQuickWinStreak, breakReminderEnabled, breaksTaken, taskCreatedDates, dailyIntention]);

  // TRANSITION MOMENTUM: Find the best next task to suggest
  const findNextSuggestedTask = useCallback((remainingTasks, currentEnergy, completedTask) => {
    if (remainingTasks.length === 0) return null;

    // Filter by energy if auto-filter enabled
    let candidates = remainingTasks;
    if (settings.autoFilterByEnergy && currentEnergy) {
      if (currentEnergy <= 2) {
        candidates = candidates.filter(t => t.difficulty <= 2);
      } else if (currentEnergy === 3) {
        candidates = candidates.filter(t => t.difficulty <= 4);
      }
    }

    // If no candidates after energy filter, use all remaining
    if (candidates.length === 0) candidates = remainingTasks;

    // Priority order: frog first, then by difficulty matching energy
    const frogTask = candidates.find(t => t.frog);
    if (frogTask) return frogTask;

    // Quick wins (low difficulty) for momentum
    const quickWins = candidates.filter(t => t.difficulty <= 2);
    if (quickWins.length > 0) return quickWins[0];

    // Otherwise first available
    return candidates[0];
  }, [settings.autoFilterByEnergy]);

  // TRANSITION MOMENTUM: Handle continuing to next task from transition screen
  const handleTransitionContinue = useCallback((startNextTask = false) => {
    setShowTransition(false);
    setShowCelebration(false);
    setCompletedTaskData(null);

    if (startNextTask && suggestedNextTask) {
      // Start 2-minute micro-session on the suggested task
      startFocusWithStartXP(suggestedNextTask, 2);
    } else {
      setScreen('tasks');
    }
  }, [suggestedNextTask]);

  // PANIC BUTTON: Activate emergency mode
  const activateEmergencyMode = useCallback(() => {
    Haptics.medium();
    const easiest = findEasiestTask(tasks);
    setEmergencyTask(easiest);
    setEmergencyMode(true);
    // Track for bad day detection
    setBadDaySignals(prev => ({
      ...prev,
      panicButtonUses: prev.panicButtonUses + 1
    }));
  }, [tasks]);

  // PANIC BUTTON: Exit emergency mode
  const exitEmergencyMode = useCallback((completed = false) => {
    setEmergencyMode(false);
    setEmergencyTask(null);
    if (!completed) {
      setScreen('tasks');
    }
  }, []);

  // ACCOUNTABILITY: Send notification to partner
  const sendAccountabilityNotification = useCallback((type, taskTitle = '') => {
    if (!accountabilityPartner) return;

    const message = generateAccountabilityMessage(type, taskTitle, accountabilityPartner.name);

    // Log the notification
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString(),
      sent: false // Would be true if actually sent via SMS/messaging API
    };

    setAccountabilityNotifications(prev => [...prev, notification]);

    // For SMS, we use a tel: or sms: link
    // This opens the native messaging app with pre-filled text
    if (accountabilityPartner.contact) {
      const smsLink = `sms:${accountabilityPartner.contact}?body=${encodeURIComponent(message)}`;
      window.open(smsLink, '_blank');
    }

    Haptics.success();
  }, [accountabilityPartner]);

  // ACCOUNTABILITY: Save partner
  const saveAccountabilityPartner = useCallback((name, contact) => {
    const partner = { name, contact };
    setAccountabilityPartner(partner);
    Storage.set('accountabilityPartner', partner);
    setShowAccountabilitySetup(false);
    Haptics.success();
  }, []);

  // SENSORY REWARDS: Update preference
  const updateSensoryPreference = useCallback((key, value) => {
    setSensoryPreferences(prev => {
      const updated = { ...prev, [key]: value };
      Storage.set('sensoryPreferences', updated);
      return updated;
    });
    Haptics.light();
  }, []);

  // SENSORY REWARDS: Play celebration with user preferences
  const playCelebration = useCallback(() => {
    if (sensoryPreferences.celebrationSound !== 'silent') {
      playCelebrationSound(sensoryPreferences.celebrationSound);
    }
    if (sensoryPreferences.hapticPattern !== 'none') {
      triggerHaptic(sensoryPreferences.hapticPattern);
    }
  }, [sensoryPreferences]);

  // VOICE INPUT: Toggle listening
  const toggleVoiceInput = useCallback(() => {
    if (!voiceSupported || !speechRecognitionRef.current) return;

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
        Haptics.light();
      } catch (e) {
        console.log('Speech recognition error:', e);
        setIsListening(false);
      }
    }
  }, [voiceSupported, isListening]);

  // BAD DAY: Record a signal
  const recordBadDaySignal = useCallback((signalType) => {
    setBadDaySignals(prev => ({
      ...prev,
      [signalType]: (prev[signalType] || 0) + 1
    }));
  }, []);

  // BAD DAY: Accept support and enter reduced mode
  const acceptBadDaySupport = useCallback(() => {
    setBadDayMode(true);
    setShowBadDaySupport(false);
    Haptics.success();

    // Find easiest task for them
    const easiest = findEasiestTask(tasks);
    if (easiest) {
      setFocusTask(easiest);
      setTimerMinutes(5); // Shorter timer for bad days
      setScreen('focus');
    }
  }, [tasks]);

  // BAD DAY: Dismiss support but don't activate mode
  const dismissBadDaySupport = useCallback(() => {
    setShowBadDaySupport(false);
    // Don't show again for this session
  }, []);

  // BAD DAY: Exit bad day mode
  const exitBadDayMode = useCallback(() => {
    setBadDayMode(false);
    // Reset signals for fresh tracking
    setBadDaySignals({
      panicButtonUses: 0,
      taskSkips: 0,
      focusAbandons: 0,
      lowProgressMinutes: 0,
      sessionStartTime: Date.now()
    });
  }, []);

  // TASK CHUNKING: Open chunk modal for a task
  const openChunkModal = useCallback((task) => {
    setTaskToChunk(task);
    const suggestions = generateChunkSuggestions(task.title, task.difficulty);
    setSuggestedChunks(suggestions);
    setCustomChunks(['', '', '']);
    setShowChunkModal(true);
    Haptics.medium();
  }, []);

  // TASK CHUNKING: Create chunk tasks from selection
  const createChunkTasks = useCallback(async (chunks) => {
    if (!taskToChunk || chunks.length === 0) return;

    const newTasks = chunks.filter(c => c.trim()).map((chunkTitle, index) => ({
      id: `${Date.now()}-chunk-${index}`,
      title: chunkTitle,
      category: taskToChunk.category,
      difficulty: 1, // Chunks are always easy
      frog: false,
      estimatedMinutes: 5, // Short chunks
      parentTaskId: taskToChunk.id,
      isChunk: true
    }));

    // Add chunks to task list
    setTasks(prev => [...newTasks, ...prev]);

    // Optionally hide the original task (keep it but mark as "chunked")
    setTasks(prev => prev.map(t =>
      t.id === taskToChunk.id
        ? { ...t, isChunked: true, chunkIds: newTasks.map(nt => nt.id) }
        : t
    ));

    // Persist to storage
    const savedTasks = Storage.get('tasks', []);
    Storage.set('tasks', [...newTasks, ...savedTasks]);

    setShowChunkModal(false);
    setTaskToChunk(null);
    setSuggestedChunks([]);
    Haptics.success();
  }, [taskToChunk]);

  // DOPAMINE PREVIEW: Show rewards before starting a task
  const showRewardPreview = useCallback((task) => {
    const isFrog = task.frog || (dailyFrog && dailyFrog.id === task.id);
    const rewards = calculateTaskRewards(task, streak, level, isFrog, bonusXPActive);
    setPreviewTask(task);
    setPreviewRewards(rewards);
    setShowDopaminePreview(true);
    Haptics.light();
  }, [streak, level, bonusXPActive, dailyFrog]);

  // DOPAMINE PREVIEW: Start task from preview
  const startFromPreview = useCallback((minutes = 25) => {
    if (previewTask) {
      startFocusWithStartXP(previewTask, minutes);
      setShowDopaminePreview(false);
      setPreviewTask(null);
      setPreviewRewards(null);
    }
  }, [previewTask, startFocusWithStartXP]);

  // FOCUS BUDDY: Send message to buddy
  const sendBuddyMessage = useCallback((message) => {
    if (!message.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: message,
      timestamp: new Date()
    };

    // Generate buddy response
    const response = generateBuddyResponse(message, { energy, focusTask, tasks });
    const buddyMsg = {
      id: Date.now() + 1,
      type: 'buddy',
      text: response,
      timestamp: new Date()
    };

    setFocusBuddyMessages(prev => [...prev, userMsg, buddyMsg]);
    setFocusBuddyInput('');
    Haptics.light();
  }, [energy, focusTask, tasks]);

  // FOCUS BUDDY: Open chat with initial greeting
  const openFocusBuddy = useCallback(() => {
    if (focusBuddyMessages.length === 0) {
      const greeting = FOCUS_BUDDY_RESPONSES.greeting[Math.floor(Math.random() * FOCUS_BUDDY_RESPONSES.greeting.length)];
      setFocusBuddyMessages([{
        id: Date.now(),
        type: 'buddy',
        text: greeting,
        timestamp: new Date()
      }]);
    }
    setShowFocusBuddy(true);
    Haptics.light();
  }, [focusBuddyMessages.length]);

  // TIME ANCHORING: Check patterns and show suggestion
  const checkTimeAnchorNow = useCallback(() => {
    if (!timeAnchorEnabled || !energyPatterns) return;

    const anchor = checkTimeAnchor(energyPatterns, energy);
    if (anchor && anchor.confidence >= 0.5) {
      setTimeAnchorMessage(anchor);
      setShowTimeAnchorSuggestion(true);
      setLastTimeAnchorCheck(Date.now());
      Haptics.light();
    }
  }, [timeAnchorEnabled, energyPatterns, energy]);

  // MOMENTUM MODE: Trigger after task completion
  const checkMomentumMode = useCallback((completedTask) => {
    const newStreak = momentumStreak + 1;
    setMomentumStreak(newStreak);

    // Activate momentum mode after 2+ consecutive completions
    if (newStreak >= 2) {
      setMomentumMode(true);
      const nextTask = findSimilarTask(completedTask, tasks);
      if (nextTask) {
        setMomentumSuggestion(nextTask);
        setShowMomentumPrompt(true);
        Haptics.success();
      }
    }
  }, [momentumStreak, tasks]);

  // MOMENTUM MODE: Accept suggestion and continue
  const acceptMomentumSuggestion = useCallback(() => {
    if (momentumSuggestion) {
      setShowMomentumPrompt(false);
      // Start with a shorter timer to maintain momentum
      startFocusWithStartXP(momentumSuggestion, 5);
    }
  }, [momentumSuggestion, startFocusWithStartXP]);

  // MOMENTUM MODE: Decline and reset
  const declineMomentumSuggestion = useCallback(() => {
    setShowMomentumPrompt(false);
    setMomentumMode(false);
    setMomentumStreak(0);
    setMomentumSuggestion(null);
  }, []);

  // DISTRACTION JOURNAL: Record a distraction
  const recordDistraction = useCallback((reason, customReason = '') => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      reason: reason,
      customReason: customReason,
      task: focusTask?.title || 'Unknown task',
      duration: timerStartTime ? Math.floor((Date.now() - timerStartTime) / 60000) : 0
    };

    setDistractionLog(prev => {
      const updated = [...prev, entry];
      Storage.set('distractionLog', updated);
      return updated;
    });

    // Update pattern counts
    setDistractionPatterns(prev => {
      const updated = { ...prev, [reason]: (prev[reason] || 0) + 1 };
      Storage.set('distractionPatterns', updated);
      return updated;
    });

    setShowDistractionCapture(false);
    setCurrentDistraction('');

    // Track for bad day detection
    setBadDaySignals(prev => ({
      ...prev,
      focusAbandons: prev.focusAbandons + 1
    }));

    Haptics.light();
  }, [focusTask, timerStartTime]);

  // DISTRACTION JOURNAL: Show capture modal when exiting focus early
  const handleEarlyFocusExit = useCallback(() => {
    // Only show if they've been focusing for at least 1 minute
    const minutesElapsed = timerStartTime ? Math.floor((Date.now() - timerStartTime) / 60000) : 0;
    if (minutesElapsed >= 1) {
      setShowDistractionCapture(true);
    } else {
      // Too short, just exit
      setScreen('tasks');
      setFocusTask(null);
      setTimerRunning(false);
    }
  }, [timerStartTime]);

  // ENERGY-BASED SORTING: Get energy-sorted tasks
  const getEnergySortedTasks = useCallback((taskList) => {
    if (!energySortEnabled || !energy) return taskList;
    return sortTasksByEnergy(taskList, energy, energyPatterns);
  }, [energySortEnabled, energy, energyPatterns]);

  // TASK DNA: Get personalized task suggestion
  const getDNASuggestion = useCallback(() => {
    const recommendations = getDNARecommendations(tasks, dnaInsights, energy);
    if (recommendations.length > 0) {
      setDnaSuggestedTask(recommendations[0]);
      setShowDNASuggestion(true);
      Haptics.light();
    }
  }, [tasks, dnaInsights, energy]);

  // AMBIENT SOUND: Start playing ambient sound
  const startAmbientSound = useCallback((soundType) => {
    // Stop any existing sound
    if (ambientAudioRef.current) {
      try {
        ambientAudioRef.current.source.stop();
        ambientAudioRef.current.context.close();
      } catch (e) {}
      ambientAudioRef.current = null;
    }

    if (soundType === 'silence' || !AMBIENT_SOUNDS[soundType]) {
      setAmbientSoundEnabled(false);
      return;
    }

    const sound = AMBIENT_SOUNDS[soundType];
    const generator = createNoiseGenerator(sound.type, ambientVolume);

    if (generator) {
      generator.source.start();
      ambientAudioRef.current = generator;
      setAmbientSoundEnabled(true);
      setCurrentAmbientSound(soundType);
    }
  }, [ambientVolume]);

  // AMBIENT SOUND: Adjust volume
  const adjustAmbientVolume = useCallback((newVolume) => {
    setAmbientVolume(newVolume);
    if (ambientAudioRef.current) {
      ambientAudioRef.current.gain.gain.value = newVolume * 0.3;
    }
  }, []);

  // FUTURE SELF: Save a message for future self
  const saveFutureSelfMessage = useCallback((taskTitle, message, mood = 3) => {
    if (!message.trim()) return;

    const entry = {
      id: Date.now(),
      taskTitle: taskTitle,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      mood: mood
    };

    setFutureSelfMessages(prev => {
      const updated = [...prev, entry].slice(-50); // Keep last 50
      Storage.set('futureSelfMessages', updated);
      return updated;
    });

    setShowFutureSelfCapture(false);
    setFutureSelfInput('');
    Haptics.success();
  }, []);

  // FUTURE SELF: Show a random past message
  const showRandomFutureSelfMessage = useCallback(() => {
    const message = getRandomFutureSelfMessage(futureSelfMessages, energy);
    if (message) {
      setCurrentFutureSelfMessage(message);
      setShowFutureSelfMessage(true);
      Haptics.light();
    }
  }, [futureSelfMessages, energy]);

  // SMART BREAK REMINDERS: Check if break is needed
  const checkBreakNeeded = useCallback((additionalMinutes = 0) => {
    if (!breakReminderEnabled) return;

    const newTotal = totalFocusMinutes + additionalMinutes;
    setTotalFocusMinutes(newTotal);

    if (newTotal >= BREAK_THRESHOLD_MINUTES && !showBreakReminder) {
      const activity = getBreakSuggestion(energy, breaksTaken);
      setSuggestedBreakActivity(activity);
      setShowBreakReminder(true);
      Haptics.light();
    }
  }, [breakReminderEnabled, totalFocusMinutes, showBreakReminder, energy, breaksTaken]);

  // SMART BREAK REMINDERS: Take a break
  const takeBreak = useCallback(() => {
    setShowBreakReminder(false);
    setTotalFocusMinutes(0);
    setLastBreakTime(Date.now());
    setBreaksTaken(prev => prev + 1);
    Haptics.success();

    // Save break stats
    const today = new Date().toISOString().split('T')[0];
    const breakStats = Storage.get('breakStats', {});
    breakStats[today] = (breakStats[today] || 0) + 1;
    Storage.set('breakStats', breakStats);
  }, []);

  // SMART BREAK REMINDERS: Skip break
  const skipBreak = useCallback(() => {
    setShowBreakReminder(false);
    // Reset counter but give a grace period (add 25 more minutes before next reminder)
    setTotalFocusMinutes(BREAK_THRESHOLD_MINUTES - 25);
  }, []);

  // PROCRASTINATION BUSTER: Track task attempt
  const trackTaskAttempt = useCallback((taskId, action = 'attempt') => {
    setTaskAttempts(prev => {
      const current = prev[taskId] || { attempts: 0, skips: 0, lastAttempt: null };
      const updated = {
        ...current,
        attempts: action === 'attempt' ? current.attempts + 1 : current.attempts,
        skips: action === 'skip' ? current.skips + 1 : current.skips,
        lastAttempt: new Date().toISOString()
      };

      const newAttempts = { ...prev, [taskId]: updated };
      Storage.set('taskAttempts', newAttempts);

      // Check if task is now procrastinated
      if (isProcrastinated(newAttempts, taskId) && !showProcrastinationHelp) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setProcrastinatedTask(task);
          setShowProcrastinationHelp(true);
        }
      }

      return newAttempts;
    });
  }, [tasks, showProcrastinationHelp]);

  // PROCRASTINATION BUSTER: Handle procrastination reason selection
  const handleProcrastinationReason = useCallback((reasonId) => {
    // Track reason for insights
    setProcrastinationReasons(prev => {
      const updated = [...prev, { reason: reasonId, timestamp: new Date().toISOString(), taskId: procrastinatedTask?.id }];
      Storage.set('procrastinationReasons', updated.slice(-50)); // Keep last 50
      return updated;
    });

    // Get help based on reason
    const reason = PROCRASTINATION_REASONS.find(r => r.id === reasonId);
    const help = getProcrastinationHelp(reason?.help || 'talk');

    // Take action based on help type
    if (help.action === 'chunk' && procrastinatedTask) {
      setShowProcrastinationHelp(false);
      setTaskToChunk(procrastinatedTask);
      setShowChunkModal(true);
    } else if (help.action === 'sprint' && procrastinatedTask) {
      setShowProcrastinationHelp(false);
      startFocus(procrastinatedTask, 5); // 5-minute sprint
    } else if (help.action === 'buddy') {
      setShowProcrastinationHelp(false);
      setShowFocusBuddy(true);
    } else {
      // Just show encouragement and close
      Haptics.success();
      setShowProcrastinationHelp(false);
    }
  }, [procrastinatedTask]);

  // PROCRASTINATION BUSTER: Clear procrastination data for task
  const clearProcrastination = useCallback((taskId) => {
    setTaskAttempts(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      Storage.set('taskAttempts', updated);
      return updated;
    });
  }, []);

  // QUICK WIN STREAKS: Update streak on task completion
  const updateQuickWinStreak = useCallback((increment = true) => {
    if (increment) {
      setQuickWinStreak(prev => {
        const newStreak = prev + 1;
        Storage.set('quickWinStreak', newStreak);

        // Check for milestone
        const milestone = getStreakMilestone(newStreak);
        const prevMilestone = getStreakMilestone(prev);

        // Update best streak
        if (newStreak > bestQuickWinStreak) {
          setBestQuickWinStreak(newStreak);
          Storage.set('bestQuickWinStreak', newStreak);
        }

        // Celebrate if hit new milestone
        if (milestone && (!prevMilestone || milestone.streak > prevMilestone.streak)) {
          setStreakReward(milestone);
          setShowStreakCelebration(true);
          Haptics.success();

          // Record milestone
          setStreakMilestones(prev => {
            const updated = [...prev, { ...milestone, timestamp: new Date().toISOString() }];
            Storage.set('streakMilestones', updated);
            return updated;
          });
        }

        return newStreak;
      });
    } else {
      // Reset streak (on skip or abandon)
      setQuickWinStreak(0);
      Storage.set('quickWinStreak', 0);
    }
  }, [bestQuickWinStreak]);

  // FOCUS RITUAL: Start ritual before focus
  const startFocusRitual = useCallback((task, minutes) => {
    if (!focusRitualEnabled) {
      // Skip ritual, go straight to focus
      startFocus(task, minutes);
      return;
    }

    // Reset ritual steps
    setFocusRitualSteps(prev => prev.map(step => ({ ...step, completed: false })));
    setRitualTaskPending(task);
    setRitualMinutesPending(minutes);
    setShowFocusRitual(true);
    Haptics.light();
  }, [focusRitualEnabled]);

  // FOCUS RITUAL: Complete a ritual step
  const completeRitualStep = useCallback((stepId) => {
    setFocusRitualSteps(prev => {
      const updated = prev.map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      );

      // Check if all completed
      const allCompleted = updated.every(s => s.completed);
      if (allCompleted && ritualTaskPending) {
        // Auto-start focus after short delay
        setTimeout(() => {
          setShowFocusRitual(false);
          startFocus(ritualTaskPending, ritualMinutesPending);
          setRitualTaskPending(null);
          setRitualMinutesPending(null);
          Haptics.success();
        }, 500);
      }

      return updated;
    });
    Haptics.light();
  }, [ritualTaskPending, ritualMinutesPending]);

  // FOCUS RITUAL: Skip ritual and start immediately
  const skipRitual = useCallback(() => {
    setShowFocusRitual(false);
    if (ritualTaskPending) {
      startFocus(ritualTaskPending, ritualMinutesPending);
    }
    setRitualTaskPending(null);
    setRitualMinutesPending(null);
  }, [ritualTaskPending, ritualMinutesPending]);

  // FOCUS RITUAL: Add custom step
  const addRitualStep = useCallback((text, emoji = '✨') => {
    setFocusRitualSteps(prev => {
      const newId = Math.max(...prev.map(s => s.id)) + 1;
      const updated = [...prev, { id: newId, text, emoji, completed: false }];
      Storage.set('focusRitualSteps', updated);
      return updated;
    });
  }, []);

  // FOCUS RITUAL: Remove custom step
  const removeRitualStep = useCallback((stepId) => {
    setFocusRitualSteps(prev => {
      const updated = prev.filter(s => s.id !== stepId);
      Storage.set('focusRitualSteps', updated);
      return updated;
    });
  }, []);

  // ACCOMPLISHMENT JOURNAL: Open journal with current summary
  const openAccomplishmentJournal = useCallback(() => {
    setShowAccomplishmentJournal(true);
    Haptics.light();
  }, []);

  // ACCOMPLISHMENT JOURNAL: Record completion for history
  const recordAccomplishment = useCallback((task, xpEarned, timeData) => {
    const today = new Date().toISOString().split('T')[0];
    setAccomplishmentHistory(prev => {
      const todayData = prev[today] || { tasks: [], xp: 0, frogsEaten: 0, focusMinutes: 0 };
      const updated = {
        ...prev,
        [today]: {
          tasks: [...todayData.tasks, { ...task, earnedXP: xpEarned, timeData, completedAt: new Date().toISOString() }],
          xp: todayData.xp + xpEarned,
          frogsEaten: todayData.frogsEaten + (task.frog ? 1 : 0),
          focusMinutes: todayData.focusMinutes + (timeData?.actual || 0)
        }
      };
      Storage.set('accomplishmentHistory', updated);
      return updated;
    });
  }, []);

  // TASK PARKING LOT: Park a task
  const parkTask = useCallback((task, reason) => {
    const parkedTask = {
      ...task,
      parkedAt: new Date().toISOString(),
      reason: reason || 'other'
    };

    setParkedTasks(prev => {
      const updated = [...prev, parkedTask];
      Storage.set('parkedTasks', updated);
      return updated;
    });

    // Remove from main tasks
    setTasks(prev => prev.filter(t => t.id !== task.id));
    const savedTasks = Storage.get('tasks', []);
    Storage.set('tasks', savedTasks.filter(t => t.id !== task.id));

    setShowParkTaskModal(false);
    setTaskToPark(null);
    setParkReason('');
    Haptics.success();
  }, []);

  // TASK PARKING LOT: Unpark a task (restore to main list)
  const unparkTask = useCallback((parkedTask) => {
    // Remove parked metadata and add back to tasks
    const { parkedAt, reason, ...task } = parkedTask;

    setTasks(prev => [...prev, task]);
    const savedTasks = Storage.get('tasks', []);
    Storage.set('tasks', [...savedTasks, task]);

    setParkedTasks(prev => {
      const updated = prev.filter(t => t.id !== parkedTask.id);
      Storage.set('parkedTasks', updated);
      return updated;
    });

    Haptics.success();
  }, []);

  // TASK PARKING LOT: Delete parked task permanently
  const deleteParkedTask = useCallback((taskId) => {
    setParkedTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      Storage.set('parkedTasks', updated);
      return updated;
    });
    Haptics.impact('heavy');
  }, []);

  // TASK PARKING LOT: Open park modal for a task
  const openParkTaskModal = useCallback((task) => {
    setTaskToPark(task);
    setShowParkTaskModal(true);
    Haptics.light();
  }, []);

  // HYPERFOCUS GUARD: Check session duration
  const checkHyperfocus = useCallback(() => {
    if (!hyperfocusGuardEnabled || !sessionStartTime) return;

    const minutesElapsed = Math.floor((Date.now() - sessionStartTime) / 60000);
    const adjustedThreshold = hyperfocusThreshold + (hyperfocusExtensions * 30); // Each extension adds 30 mins

    if (minutesElapsed >= adjustedThreshold && !showHyperfocusWarning) {
      setShowHyperfocusWarning(true);
      Haptics.warning ? Haptics.warning() : Haptics.medium();
    }
  }, [hyperfocusGuardEnabled, sessionStartTime, hyperfocusThreshold, hyperfocusExtensions, showHyperfocusWarning]);

  // HYPERFOCUS GUARD: Extend session
  const extendHyperfocusSession = useCallback(() => {
    setHyperfocusExtensions(prev => prev + 1);
    setShowHyperfocusWarning(false);
    Haptics.light();
  }, []);

  // HYPERFOCUS GUARD: Take break (reset session)
  const takeHyperfocusBreak = useCallback(() => {
    setShowHyperfocusWarning(false);
    setSessionStartTime(null);
    setHyperfocusExtensions(0);
    // Also reset focus minutes for break reminder
    setTotalFocusMinutes(0);
    Haptics.success();
  }, []);

  // DAILY INTENTION: Set today's north star task
  const setTodaysIntention = useCallback((taskId) => {
    const now = new Date().toISOString();
    setDailyIntention(taskId);
    setIntentionSetDate(now);
    Storage.set('dailyIntention', taskId);
    Storage.set('intentionSetDate', now);
    setShowIntentionPicker(false);
    Haptics.success();
  }, []);

  // DAILY INTENTION: Clear intention
  const clearDailyIntention = useCallback(() => {
    setDailyIntention(null);
    setIntentionSetDate(null);
    Storage.set('dailyIntention', null);
    Storage.set('intentionSetDate', null);
  }, []);

  // TASK AGING: Track when a task is created
  const trackTaskCreation = useCallback((taskId) => {
    const now = new Date().toISOString();
    setTaskCreatedDates(prev => {
      const updated = { ...prev, [taskId]: now };
      Storage.set('taskCreatedDates', updated);
      return updated;
    });
  }, []);

  // TASK AGING: Get bonus XP for completing old tasks
  const getAgingBonusXP = useCallback((taskId) => {
    const createdAt = taskCreatedDates[taskId];
    if (!createdAt) return 0;
    const age = getTaskAge(createdAt);
    return age.bonusXP;
  }, [taskCreatedDates]);

  // MICRO-WINS: Trigger a micro-win celebration
  const triggerMicroWin = useCallback((type) => {
    if (!microWinEnabled) return;
    const win = getRandomMicroWin(type);
    setMicroWinType(type);
    setMicroWinMessage(win);
    setShowMicroWin(true);
    Haptics.success();

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      setShowMicroWin(false);
    }, 2000);
  }, [microWinEnabled]);

  // MICRO-WINS: Check focus milestones during timer
  const checkFocusMilestones = useCallback((elapsedMinutes, totalMinutes) => {
    if (!microWinEnabled) return;

    // Check for time-based milestones
    const milestones = [
      { minutes: 5, type: 'milestone5' },
      { minutes: 15, type: 'milestone15' },
      { minutes: 25, type: 'milestone25' }
    ];

    for (const milestone of milestones) {
      if (elapsedMinutes >= milestone.minutes && !focusMilestones.includes(milestone.minutes)) {
        setFocusMilestones(prev => [...prev, milestone.minutes]);
        triggerMicroWin(milestone.type);
        break; // Only one celebration at a time
      }
    }

    // Check for halfway milestone
    const halfway = Math.floor(totalMinutes / 2);
    if (halfway >= 3 && elapsedMinutes >= halfway && !focusMilestones.includes('halfway')) {
      setFocusMilestones(prev => [...prev, 'halfway']);
      triggerMicroWin('halfway');
    }
  }, [microWinEnabled, focusMilestones, triggerMicroWin]);

  // MICRO-WINS: Reset milestones when starting new focus session
  const resetFocusMilestones = useCallback(() => {
    setFocusMilestones([]);
  }, []);

  // Delete a task
  const handleDeleteTask = useCallback((taskId) => {
    Haptics.impact('heavy');
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Remove from subtasks
    setSubtasks(prev => {
      const newSubtasks = { ...prev };
      delete newSubtasks[taskId];
      return newSubtasks;
    });
    
    // Update storage
    const savedTasks = Storage.get('tasks', []);
    Storage.set('tasks', savedTasks.filter(t => t.id !== taskId));
    
    // Cancel any scheduled reminders
    const scheduledReminders = Storage.get('scheduledReminders', {});
    if (scheduledReminders[taskId]) {
      delete scheduledReminders[taskId];
      Storage.set('scheduledReminders', scheduledReminders);
    }
  }, []);

  // Toggle frog status on a task
  const handleToggleFrog = useCallback((task) => {
    Haptics.medium();
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, frog: !t.frog } : t
    ));
    
    // Update storage
    const savedTasks = Storage.get('tasks', []);
    Storage.set('tasks', savedTasks.map(t => 
      t.id === task.id ? { ...t, frog: !t.frog } : t
    ));
    
    // Update daily frog
    if (!task.frog) {
      setDailyFrog(task.id);
    } else if (dailyFrog === task.id) {
      setDailyFrog(null);
    }
  }, [dailyFrog]);

  // Reorder tasks handler
  const handleReorderTasks = useCallback((fromIndex, toIndex) => {
    Haptics.medium();
    setTasks(prev => {
      const newTasks = [...prev];
      const [removed] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, removed);
      
      // Save new order
      Storage.set('tasks', newTasks);
      Storage.set('task_order', newTasks.map(t => t.id));
      
      return newTasks;
    });
    setReorderMode(false);
  }, []);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.medium();
    
    try {
      // Reload tasks from Supabase
      if (userId) {
        const dbTasks = await getTasks(userId);
        if (dbTasks && dbTasks.length > 0) {
          const formattedTasks = dbTasks.map(t => ({
            id: t.id,
            title: t.title,
            category: t.category || 'personal',
            difficulty: t.difficulty || t.energy_required || 2,
            estimatedMinutes: t.estimated_minutes || 25,
            frog: t.is_frog || false,
            completed: t.completed || false,
            dueDate: t.due_date,
            recurrence: t.recurrence || 'none'
          })).filter(t => !t.completed);
          setTasks(formattedTasks);
          Storage.set('tasks', formattedTasks);
        }
        
        // Reload user progress
        const progress = await getUserProgress(userId);
        if (progress) {
          setXp(progress.total_xp || 0);
          setLevel(progress.level || 1);
        }
      }
      
      // Refresh categories
      refreshCategories();
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      Haptics.success();
    } catch (error) {
      console.error('Refresh error:', error);
      Haptics.error();
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, refreshCategories]);

  const cancelFocus = () => {
    // DISTRACTION JOURNAL: Check if we should capture what pulled them away
    const minutesElapsed = timerStartTime ? Math.floor((Date.now() - timerStartTime) / 60000) : 0;

    // Stop ambient sounds when focus ends
    stopAmbientSound();

    if (minutesElapsed >= 1) {
      // Show distraction capture modal
      setTimerRunning(false);
      setShowDistractionCapture(true);
      // Reset momentum streak since they're abandoning
      setMomentumStreak(0);
      setMomentumMode(false);
    } else {
      // Too short, just exit normally
      setTimerRunning(false);
      setFocusTask(null);
      setScreen('tasks');
    }
  };

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const resetDay = () => {
    setEnergy(null);
    setScreen('checkin');
    Storage.set('todayEnergy', null);
    Storage.set('lastDate', null);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      const createdTask = await createTask({
        user_id: userId,
        title: newTask.title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        energy_required: newTask.difficulty,
        is_frog: false,
        completed: false
      });
      
      setTasks(prev => [...prev, {
        id: createdTask.id,
        title: createdTask.title,
        category: createdTask.category,
        difficulty: createdTask.difficulty,
        estimatedMinutes: newTask.estimatedMinutes,
        frog: false
      }]);

      // TASK AGING: Track when this task was created
      trackTaskCreation(createdTask.id);

      setSyncStatus('synced');
    } catch (error) {
      console.error('Error creating task:', error);
      setSyncStatus('offline');
      
      const localTask = {
        id: Date.now(),
        title: newTask.title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        estimatedMinutes: newTask.estimatedMinutes,
        recurrence: newTask.recurrence,
        dueDate: newTask.dueDate || new Date().toISOString(),
        frog: false
      };
      setTasks(prev => [...prev, localTask]);

      // TASK AGING: Track when this task was created
      trackTaskCreation(localTask.id);
    }
    
    setNewTask({ title: '', category: 'personal', difficulty: 2, estimatedMinutes: 25, recurrence: 'none', dueDate: null, dueReminder: 'none' });
    setShowAddTask(false);
  };

  // Play satisfying pop sound for subtask completion
  const playSubtaskSound = (completed) => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (completed) {
        // Happy ascending pop for completion
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        // Vibrate
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        // Soft click for uncomplete
        oscillator.frequency.value = 400;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      }
    } catch (e) {
      console.log('Audio not available');
    }
  };

  // Add a subtask to a task
  const addSubtask = (taskId) => {
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: Date.now(),
      title: newSubtask.trim(),
      completed: false
    };
    
    setSubtasks(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), subtask]
    }));
    
    setNewSubtask('');
    playSubtaskSound(false);
  };

  // Toggle subtask completion with XP reward
  const toggleSubtask = async (taskId, subtaskId) => {
    const taskSubtasks = subtasks[taskId] || [];
    const subtask = taskSubtasks.find(s => s.id === subtaskId);
    if (!subtask) return;
    
    const newCompleted = !subtask.completed;
    
    // Update subtask
    setSubtasks(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s => 
        s.id === subtaskId ? { ...s, completed: newCompleted } : s
      )
    }));
    
    // Play sound
    playSubtaskSound(newCompleted);
    
    // Award XP for completing (not uncompleting)
    if (newCompleted) {
      const earnedXP = 2; // Small XP for subtask
      setXp(prev => prev + earnedXP);

      // MICRO-WINS: Celebrate subtask completion
      if (microWinEnabled) {
        const win = getRandomMicroWin('subtask');
        setMicroWinType('subtask');
        setMicroWinMessage(win);
        setShowMicroWin(true);
        setTimeout(() => setShowMicroWin(false), 1500);
      }

      // Update in Supabase
      try {
        const newTotalXP = xp + earnedXP;
        await upsertUserProgress({
          user_id: userId,
          total_xp: newTotalXP,
          level: Math.floor(newTotalXP / 100) + 1
        });
      } catch (e) {
        console.error('Error updating XP:', e);
      }
    }
  };

  // Get subtask progress for a task
  const getSubtaskProgress = (taskId) => {
    const taskSubtasks = subtasks[taskId] || [];
    if (taskSubtasks.length === 0) return null;
    const completed = taskSubtasks.filter(s => s.completed).length;
    return { completed, total: taskSubtasks.length, percent: Math.round((completed / taskSubtasks.length) * 100) };
  };

  // Apply category filter
  let filteredTasks = selectedCategory === 'all' 
    ? tasks
    : tasks.filter(t => t.category === selectedCategory);

  // ADHD: One Thing Mode - only show the frog task (radical simplicity)
  // When enabled, hides all other tasks to reduce overwhelm
  const otherTasksCount = oneThingMode && dailyFrog
    ? tasks.filter(t => !t.frog).length
    : 0;

  // ENERGY-BASED SORTING: Sort tasks based on current energy level
  const sortedTasks = (() => {
    let sorted = [...filteredTasks];

    if (energySortEnabled && energy) {
      // Apply energy-based sorting
      sorted = sortTasksByEnergy(sorted, energy, energyPatterns);
      // But always keep frog at top if high energy
      if (energy >= 4) {
        sorted.sort((a, b) => {
          if (a.frog && !b.frog) return -1;
          if (!a.frog && b.frog) return 1;
          return 0;
        });
      }
    } else {
      // Default sort - frog first, then by difficulty
      sorted.sort((a, b) => {
        if (a.frog && !b.frog) return -1;
        if (!a.frog && b.frog) return 1;
        return b.difficulty - a.difficulty;
      });
    }

    return sorted;
  })();

  // ADHD: One Thing Mode - show only frog task when enabled
  const displayTasks = oneThingMode && dailyFrog
    ? sortedTasks.filter(t => t.frog)
    : sortedTasks;

  if (!isLoaded) {
    return (
      <PageBackground page="home">
      {/* Daily Reminder Modal */}
      <ReminderModal
        reminder={showReminder}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onCheckin={() => {
          recordCheckin();
          // If on checkin screen, proceed to tasks
          if (screen === 'checkin') {
            // Energy check will proceed normally
          }
        }}
      />
        <div className="min-h-screen safe-area-top">
          {/* Skeleton Header */}
          <div className="sticky top-0 z-40 glass-dark safe-area-top">
            <HeaderSkeleton />
          </div>
          
          {/* Skeleton Task List */}
          <div className="px-4 mt-4">
            <TaskListSkeleton count={5} />
          </div>
          
          {/* Loading indicator */}
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 glass-card px-6 py-3 flex items-center gap-3">
            <div className="text-2xl animate-bounce">🐸</div>
            <p className="text-white/80 text-sm">Loading your frogs...</p>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== EMERGENCY MODE SCREEN =====
  if (emergencyMode && emergencyTask) {
    return (
      <PageBackground page="home">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
          <div className="w-full max-w-sm">
            {/* Calming header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🫂</div>
              <h1 className="text-2xl font-bold text-white mb-2">
                It's okay. You're okay.
              </h1>
              <p className="text-white/60 text-sm">
                Everything else can wait. Just this one tiny thing.
              </p>
            </div>

            {/* The ONE task */}
            <div className="glass-card p-6 mb-6 border-2 border-green-500/30">
              <p className="text-white/50 text-xs uppercase tracking-wide mb-2">Your one thing:</p>
              <p className="text-white text-xl font-medium mb-4">{emergencyTask.title}</p>

              <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
                <span>⭐ {emergencyTask.difficulty}/5 difficulty</span>
                <span>•</span>
                <span>~{emergencyTask.estimatedMinutes || 5} min</span>
              </div>

              <button
                onClick={() => {
                  Haptics.medium();
                  startFocusWithStartXP(emergencyTask, 2);
                }}
                className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-green-500/20 border-green-500/30 hover:bg-green-500/30 transition-all"
              >
                Just start (2 min timer)
              </button>
            </div>

            {/* No pressure options */}
            <div className="space-y-3">
              <button
                onClick={() => exitEmergencyMode(false)}
                className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
              >
                I'm feeling better now
              </button>

              {accountabilityPartner && (
                <button
                  onClick={() => sendAccountabilityNotification('struggling', '')}
                  className="w-full glass-button py-3 rounded-xl text-blue-400/80 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                  <span>💙</span>
                  <span>Text {accountabilityPartner.name} for support</span>
                </button>
              )}
            </div>

            {/* Reassurance */}
            <p className="text-white/30 text-xs text-center mt-8">
              No XP tracking. No streaks. No pressure. Just you.
            </p>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== ENERGY CHECK-IN SCREEN =====
  if (screen === 'checkin') {
    return (
      <PageBackground page="home">
      {/* Daily Reminder Modal */}
      <ReminderModal
        reminder={showReminder}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onCheckin={() => {
          recordCheckin();
          // If on checkin screen, proceed to tasks
          if (screen === 'checkin') {
            // Energy check will proceed normally
          }
        }}
      />
        <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
          {/* Header */}
          <div className="p-6 text-center">
            <div className="text-6xl mb-4 animate-float">🐸</div>
            <h1 className="text-3xl font-bold text-white mb-2">Good Morning!</h1>
            <p className="text-white/60">How's your energy today?</p>
          </div>

          {/* CONTEXT-AWARE ENERGY: Productivity Insights */}
          {productivityInsights && (
            <div className="px-6 mb-4">
              <div className="glass-card p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">📊</span>
                  <p className="text-white/80 text-sm font-medium">Your Pattern Insight</p>
                </div>
                <p className="text-white/60 text-sm">
                  Your best focus time: <span className="text-purple-300 font-medium">{productivityInsights.bestTime}</span>
                </p>
                {productivityInsights.suggestion && (
                  <p className="text-blue-300 text-xs mt-2 italic">
                    💡 {productivityInsights.suggestion}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Energy Options */}
          <div className="flex-1 px-6 pb-6">
            <div className="space-y-4">
              {ENERGY_LEVELS.map((level, idx) => (
                <button
                  key={level.value}
                  onClick={() => handleEnergySelect(level.value)}
                  className="w-full glass-card p-5 text-left hover:scale-[1.02] active:scale-[0.98] transition-all animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="glass-icon w-14 h-14 flex items-center justify-center"
                      style={{ boxShadow: `0 0 20px ${level.color}40` }}
                    >
                      <span className="text-3xl">{level.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{level.label}</p>
                      <p className="text-white/50 text-sm">{level.description}</p>
                    </div>
                    <div className="text-white/30">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Bottom Stats */}
          <div className="p-6">
            <div className="glass-card p-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className={`text-2xl font-bold ${streakPaused ? 'text-blue-400' : 'text-white'}`}>
                    {streak}{streakPaused && <span className="text-sm ml-1">❄️</span>}
                  </p>
                  <p className="text-white/40 text-xs">
                    {streakPaused ? 'Streak Paused' : 'Day Streak'}
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-green-400">{level}</p>
                  <p className="text-white/40 text-xs">Level</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{xp}</p>
                  <p className="text-white/40 text-xs">Total XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== FROG SELECTION SCREEN =====
  if (screen === 'frog') {
    const hardTasks = tasks.filter(t => t.difficulty >= 3);
    
    return (
      <PageBackground page="home">
      {/* Daily Reminder Modal */}
      <ReminderModal
        reminder={showReminder}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onCheckin={() => {
          recordCheckin();
          // If on checkin screen, proceed to tasks
          if (screen === 'checkin') {
            // Energy check will proceed normally
          }
        }}
      />
        <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
          {/* Header */}
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">🐸</div>
            <h1 className="text-2xl font-bold text-white mb-2">Pick Your Frog</h1>
            <p className="text-white/60 text-sm">What's the hardest task you need to tackle today?</p>
          </div>
          
          {/* Task Options */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="space-y-3">
              {hardTasks.length > 0 ? (
                hardTasks.map((task, idx) => (
                  <button
                    key={task.id}
                    onClick={() => handleFrogSelect(task)}
                    className="w-full glass-card p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-all animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="glass-icon-sm w-12 h-12 flex items-center justify-center">
                        <span className="text-2xl">{CATEGORIES[task.category]?.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-yellow-400 text-sm">
                            {'⭐'.repeat(task.difficulty)}
                          </span>
                          <span className="text-white/40 text-xs">
                            {CATEGORIES[task.category]?.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl">🐸</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="text-white/60 mb-4">No hard tasks yet!</p>
                  <button
                    onClick={() => { setScreen('tasks'); setShowAddTask(true); }}
                    className="glass-button px-6 py-3 rounded-2xl text-white font-medium"
                  >
                    + Add a Task
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Skip Option */}
          <div className="p-6">
            <button
              onClick={() => setScreen('tasks')}
              className="w-full glass-card p-4 text-center text-white/60 hover:text-white transition-colors"
            >
              Skip for now →
            </button>
          </div>
        </div>
      </PageBackground>
    );
  }

  // ===== FOCUS MODE SCREEN =====
  if (screen === 'focus' && focusTask) {
    const progress = timerMinutes === 0 && timerSeconds === 0 ? 100 : 
      100 - ((timerMinutes * 60 + timerSeconds) / (25 * 60) * 100);
    
    return (
      <PageBackground page="home">
      {/* Daily Reminder Modal */}
      <ReminderModal
        reminder={showReminder}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onCheckin={() => {
          recordCheckin();
          // If on checkin screen, proceed to tasks
          if (screen === 'checkin') {
            // Energy check will proceed normally
          }
        }}
      />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
          {/* Timer Display */}
          <div className="glass-card p-8 w-full max-w-sm text-center mb-8">
            {/* Task Info */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                <span className="text-xl">{CATEGORIES[focusTask.category]?.emoji}</span>
              </div>
              <p className="text-white font-medium">{focusTask.title}</p>
              {focusTask.frog && <span className="text-xl">🐸</span>}
            </div>

            {/* BODY DOUBLING: Virtual co-working indicator */}
            <div className="mb-6">
              <button
                onClick={() => {
                  if (!bodyDoublingActive) {
                    setBodyDoublingActive(true);
                    setBodyDoublingStartTime(Date.now());
                    setVirtualFocusers(getVirtualFocusersCount());
                  } else {
                    setBodyDoublingActive(false);
                    setBodyDoublingStartTime(null);
                  }
                  Haptics.light();
                }}
                className={`glass-button px-4 py-2 rounded-xl text-sm transition-all ${
                  bodyDoublingActive ? 'bg-purple-500/30 border-purple-500/50' : 'bg-white/5'
                }`}
              >
                {bodyDoublingActive ? (
                  <span className="flex items-center gap-2 text-purple-300">
                    <span className="flex -space-x-2">
                      {[...Array(Math.min(3, virtualFocusers))].map((_, i) => (
                        <span key={i} className="w-5 h-5 rounded-full bg-purple-400/50 border border-purple-300/50 flex items-center justify-center text-xs">
                          {['👤', '🧑', '👩'][i]}
                        </span>
                      ))}
                    </span>
                    <span>{virtualFocusers} others focusing</span>
                    <span className="animate-pulse">●</span>
                  </span>
                ) : (
                  <span className="text-white/60 flex items-center gap-2">
                    <span>👥</span> Focus with others
                  </span>
                )}
              </button>
              {bodyDoublingActive && (
                <p className="text-purple-300/60 text-xs mt-2">
                  You're not alone. Others are working too. 💜
                </p>
              )}
            </div>

            {/* Big Timer */}
            <div className="text-7xl font-light text-white mb-8 font-mono tracking-wider">
              {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <FrogCharacter level={level} size="md" animate={timerRunning} />
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleTimer}
                className={`glass-button w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                  timerRunning ? 'animate-pulse-glow' : ''
                }`}
              >
                {timerRunning ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => handleCompleteTask(focusTask)}
                className="glass-button w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              >
                ✅
              </button>
            </div>
            
            {/* Focus Sounds */}
            <div className="mt-6">
              <FocusSounds isPlaying={timerRunning} />
            </div>

            {/* AMBIENT SOUND MIXER */}
            <div className="mt-4 w-full max-w-xs">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎧</span>
                    <span className="text-white/80 text-sm font-medium">Ambient Sounds</span>
                  </div>
                  {ambientSoundEnabled && (
                    <button
                      onClick={stopAmbientSound}
                      className="text-xs text-red-400/70 hover:text-red-400"
                    >
                      Stop
                    </button>
                  )}
                </div>

                {/* Sound Type Selector */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(AMBIENT_SOUNDS).map(([key, sound]) => (
                    <button
                      key={key}
                      onClick={() => key === 'silence' ? stopAmbientSound() : startAmbientSound(key)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        currentAmbientSound === key && ambientSoundEnabled
                          ? 'bg-green-500/30 border border-green-500/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{sound.emoji}</span>
                      <p className="text-white/60 text-xs mt-1">{sound.name}</p>
                    </button>
                  ))}
                </div>

                {/* Volume Slider */}
                {ambientSoundEnabled && (
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={ambientVolume}
                      onChange={(e) => adjustAmbientVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400"
                    />
                    <span className="text-white/40 text-xs">🔊</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Thought Capture - Always visible in focus mode */}
          <div className="w-full max-w-sm mb-6">
            {showThoughtInput ? (
              <div className="glass-card p-4 animate-slide-up">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💭</span>
                  <p className="text-white/60 text-sm">Quick thought capture</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickThought}
                    onChange={(e) => setQuickThought(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuickThought(quickThought)}
                    placeholder="Type it before you forget..."
                    className="flex-1 glass-input px-4 py-3 rounded-xl text-white text-sm placeholder-white/30"
                    autoFocus
                  />
                  <button
                    onClick={() => addQuickThought(quickThought)}
                    className="glass-button px-4 py-3 rounded-xl text-green-400"
                  >
                    Save
                  </button>
                </div>
                <button
                  onClick={() => { setShowThoughtInput(false); setQuickThought(''); }}
                  className="w-full mt-2 text-white/40 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowThoughtInput(true)}
                className="w-full glass-card p-4 flex items-center justify-center gap-2 text-white/60 hover:text-white/80 transition-colors"
              >
                <span className="text-xl">💭</span>
                <span className="text-sm">Capture a thought</span>
                {thoughtDump.length > 0 && (
                  <span className="bg-white/20 text-white/60 text-xs px-2 py-0.5 rounded-full ml-2">
                    {thoughtDump.length}
                  </span>
                )}
              </button>
            )}
          </div>
          
          {/* Cancel Button */}
          <button
            onClick={cancelFocus}
            className="glass-card px-8 py-3 text-white/60 hover:text-white transition-colors"
          >
            Cancel Session
          </button>
        </div>
      </PageBackground>
    );
  }

  // ===== MAIN TASKS SCREEN =====
  return (
    <PageBackground page="home">
      {/* Daily Reminder Modal */}
      <ReminderModal
        reminder={showReminder}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onCheckin={() => {
          recordCheckin();
          // If on checkin screen, proceed to tasks
          if (screen === 'checkin') {
            // Energy check will proceed normally
          }
        }}
      />
      <SwipeableTabView>
        <div className="min-h-screen pb-32 safe-area-top">
        {/* ADHD-Simplified Glass Header - reduced visual noise */}
        <div className="sticky top-0 z-40 glass-dark safe-area-top">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Frog + Energy (tappable) */}
              <button
                onClick={() => setShowMoodPicker(true)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="glass-icon w-12 h-12 flex items-center justify-center overflow-hidden">
                  <FrogCharacter level={level} size="sm" />
                </div>
                <div className="text-left">
                  <span className="text-2xl">{ENERGY_LEVELS.find(e => e.value === energy)?.emoji}</span>
                  <p className="text-white/50 text-xs">{ENERGY_LEVELS.find(e => e.value === energy)?.label}</p>
                </div>
              </button>

              {/* Right: Level + XP + Streak */}
              <div className="flex items-center gap-2">
                {quickWinStreak >= 2 && (
                  <div className="glass-card px-3 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                    <p className="text-yellow-400 font-bold text-sm">🔥 {quickWinStreak}</p>
                  </div>
                )}
                <div className="glass-card px-4 py-2">
                  <p className="text-white font-bold">Lv.{level}</p>
                  <p className="text-green-400 text-xs text-right">{xp} XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAD DAY MODE: Reduced expectations banner */}
        {badDayMode && (
          <div className="px-4 mt-2">
            <div className="glass-card p-3 bg-blue-500/10 border border-blue-400/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">💙</span>
                <div>
                  <p className="text-blue-300 text-sm font-medium">Gentle mode active</p>
                  <p className="text-white/50 text-xs">One tiny win is enough today</p>
                </div>
              </div>
              <button
                onClick={exitBadDayMode}
                className="text-white/40 text-xs hover:text-white/60 px-2 py-1"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* ENERGY SORTING: Show indicator when active */}
        {energySortEnabled && energy && !badDayMode && (
          <div className="px-4 mt-2">
            <div className={`glass-card p-2 flex items-center justify-center gap-2 text-xs ${
              energy >= 4 ? 'bg-green-500/10 border border-green-500/20' :
              energy <= 2 ? 'bg-orange-500/10 border border-orange-500/20' :
              'bg-white/5 border border-white/10'
            }`}>
              <span>{energy >= 4 ? '⚡' : energy <= 2 ? '🌱' : '⚖️'}</span>
              <span className={energy >= 4 ? 'text-green-400' : energy <= 2 ? 'text-orange-400' : 'text-white/60'}>
                {energy >= 4 ? 'High energy mode: Hard tasks first' :
                 energy <= 2 ? 'Low energy mode: Easy wins first' :
                 'Balanced mode: Mix of tasks'}
              </span>
            </div>
          </div>
        )}

        {/* MOMENTUM MODE: Active streak indicator */}
        {momentumMode && momentumStreak >= 2 && (
          <div className="px-4 mt-2">
            <div className="glass-card p-2 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center gap-2">
              <span className="text-lg animate-pulse">🔥</span>
              <span className="text-orange-400 text-xs font-medium">
                Momentum active! {momentumStreak} in a row
              </span>
            </div>
          </div>
        )}

        {/* Daily Frog Banner */}
        {dailyFrog && !frogCompleted && (
          <div className="px-4 mt-4">
            <div 
              className="glass-card p-4 border-2 border-green-500/30 animate-pulse-glow cursor-pointer hover:scale-[1.01] transition-transform"
              onClick={() => startFocus(dailyFrog, 25)}
            >
              <div className="flex items-center gap-4">
                <div className="glass-icon w-14 h-14 flex items-center justify-center animate-float">
                  <span className="text-3xl">🐸</span>
                </div>
                <div className="flex-1">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Today's Frog</p>
                  <p className="text-white font-medium text-lg">{dailyFrog.title}</p>
                  <p className="text-white/50 text-xs mt-1">Tap to start • 2x XP bonus!</p>
                </div>
                <div className="text-white/30 text-2xl">→</div>
              </div>
            </div>
          </div>
        )}

        {/* Frog Completed Banner */}
        {frogCompleted && (
          <div className="px-4 mt-4">
            <div className="glass-card p-4 border-2 border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎉</div>
                <div>
                  <p className="text-green-400 font-semibold">Frog Eaten!</p>
                  <p className="text-white/60 text-sm">You tackled your hardest task today!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Tasks Banner - uses gentle language by default */}
        <div className="px-4 mt-4">
          <OverdueTasksBanner
            tasks={tasks}
            onTaskClick={(task) => startFocusWithStartXP(task, 2)}  // Use micro-start for overdue
            gentleMode={settings.gentleLanguage}
          />
        </div>

        {/* Tasks List with Pull to Refresh */}
        <PullToRefresh onRefresh={handleRefresh} className="mt-4">
          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-4">
              <div className="refresh-spinner" />
            </div>
          )}
          
          <div className={`px-4 space-y-3 ios-scroll pb-32 ${reorderMode ? 'pt-16' : ''}`}>
            {displayTasks.length === 0 ? (
              <div className="glass-card p-8 text-center float-animation">
                <div className="text-5xl mb-4">✨</div>
                <p className="text-white font-medium mb-2">All caught up!</p>
                <p className="text-white/50 text-sm">Add a new task to get started</p>
              </div>
            ) : reorderMode ? (
            <TapToReorderList
              items={displayTasks}
              onReorder={handleReorderTasks}
            >
              {displayTasks.map((task, idx) => {
                const progress = getSubtaskProgress(task.id);
                const taskSubtasks = subtasks[task.id] || [];
                
                return (
                  <div 
                    key={task.id}
                    className="glass-card p-4 stagger-item"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="glass-icon-sm w-11 h-11 flex items-center justify-center">
                        <span className="text-xl">{CATEGORIES[task.category]?.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: CATEGORIES[task.category]?.color + '20',
                              color: CATEGORIES[task.category]?.color 
                            }}
                          >
                            {CATEGORIES[task.category]?.name}
                          </span>
                          {task.frog && <span className="text-sm">🐸</span>}
                          {task.dueDate && <DueDateBadge dueDate={task.dueDate} compact />}
                        </div>
                      </div>
                      <span className="text-white/40 text-2xl">↕</span>
                    </div>
                  </div>
                );
              })}
            </TapToReorderList>
          ) : (
            displayTasks.map((task, idx) => {
              const progress = getSubtaskProgress(task.id);
              const isExpanded = expandedTask === task.id;
              const taskSubtasks = subtasks[task.id] || [];
              
              return (
                <SwipeableTask
                  key={task.id}
                  task={task}
                  category={CATEGORIES[task.category]}
                  onSwipeRight={() => {
                    Haptics.success();
                    handleCompleteTask(task);
                  }}
                  onSwipeLeft={() => {
                    Haptics.impact('heavy');
                    handleDeleteTask(task.id);
                  }}
                  onLongPress={() => {
                    setContextMenuTask(task);
                    setShowContextMenu(true);
                  }}
                >
                  <div 
                    className="glass-card p-4 stagger-item ios-tap"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Task Header - Click to expand */}
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => {
                        Haptics.light();
                        setExpandedTask(isExpanded ? null : task.id);
                      }}
                    >
                    <div className="glass-icon-sm w-11 h-11 flex items-center justify-center">
                      <span className="text-xl">{CATEGORIES[task.category]?.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: CATEGORIES[task.category]?.color + '20',
                            color: CATEGORIES[task.category]?.color 
                          }}
                        >
                          {CATEGORIES[task.category]?.name}
                        </span>
                        <span className="text-yellow-400 text-xs">
                          {'⭐'.repeat(task.difficulty)}
                        </span>
                        {task.frog && <span className="text-sm">🐸</span>}
                        {dailyIntention === task.id && <span className="text-sm" title="Today's North Star">⭐</span>}
                        {/* TASK AGING INDICATOR */}
                        {taskCreatedDates[task.id] && (() => {
                          const age = getTaskAge(taskCreatedDates[task.id]);
                          const days = getTaskAgeDays(taskCreatedDates[task.id]);
                          if (days >= 3) { // Only show for aging tasks
                            return (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  age.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                  age.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                  age.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                  age.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-white/10 text-white/50'
                                }`}
                                title={`${age.label} - ${days} days old (+${age.bonusXP} bonus XP)`}
                              >
                                {age.emoji} {days}d
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {task.recurrence && task.recurrence !== 'none' && (
                          <span className="text-xs text-blue-400">🔄</span>
                        )}
                        {task.reminderTime && new Date(task.reminderTime) > new Date() && (
                          <span className="text-xs text-yellow-400" title={`Reminder: ${new Date(task.reminderTime).toLocaleString()}`}>🔔</span>
                        )}
                        {task.dueDate && <DueDateBadge dueDate={task.dueDate} compact />}
                        {progress && (
                          <span className="text-green-400 text-xs">
                            {progress.completed}/{progress.total} ✓
                          </span>
                        )}
                      </div>
                      {/* TIME BLINDNESS HELPER: Show average time hint */}
                      {(() => {
                        const prediction = getTimePrediction(timeHistory, task.category, task.difficulty, task.estimatedMinutes || 25);
                        return prediction ? (
                          <p className={`text-xs mt-1 ${prediction.type === 'underestimate' ? 'text-orange-400/70' : 'text-white/40'}`}>
                            ⏱️ {prediction.message}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <span className={`text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                  
                  {/* Subtask Progress Bar */}
                  {progress && (
                    <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Expanded Subtasks Section */}
                  {isExpanded && (
                    <div className="mt-4 space-y-2 animate-slide-down">
                      {/* Existing Subtasks */}
                      {taskSubtasks.map((subtask) => (
                        <div 
                          key={subtask.id}
                          onClick={() => { Haptics.selection(); toggleSubtask(task.id, subtask.id); }}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            subtask.completed 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            subtask.completed 
                              ? 'bg-green-500 border-green-500 scale-110' 
                              : 'border-white/30'
                          }`}>
                            {subtask.completed && <span className="text-white text-sm">✓</span>}
                          </div>
                          <span className={`flex-1 text-sm ${
                            subtask.completed ? 'text-white/50 line-through' : 'text-white'
                          }`}>
                            {subtask.title}
                          </span>
                          {subtask.completed && (
                            <span className="text-green-400 text-xs">+2 XP</span>
                          )}
                        </div>
                      ))}
                      
                      {/* Add Subtask Input */}
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSubtask(task.id)}
                          placeholder="Add a step..."
                          className="flex-1 glass-input px-4 py-2.5 rounded-xl text-white text-sm placeholder-white/30"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); addSubtask(task.id); }}
                          className="glass-button px-4 py-2.5 rounded-xl text-white/80 text-sm font-medium hover:text-white"
                        >
                          +
                        </button>
                      </div>
                      
                      {taskSubtasks.length === 0 && (
                        <p className="text-white/40 text-xs text-center py-2">
                          Break this task into smaller steps for easy wins! 🎯
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* ADHD-Simplified: Single Start Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); Haptics.medium(); startFocusWithStartXP(task, 2); }}
                    className="w-full mt-3 glass-button py-3 rounded-xl text-green-400 font-semibold bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors ios-button flex items-center justify-center gap-2"
                  >
                    {!settings.lowStimMode && <span>⚡</span>}
                    <span>Just Start</span>
                  </button>

                  {/* DOPAMINE PREVIEW: Show what rewards await */}
                  <button
                    onClick={(e) => { e.stopPropagation(); showRewardPreview(task); }}
                    className="w-full mt-2 text-center text-yellow-400/70 hover:text-yellow-400 text-xs transition-colors py-1"
                  >
                    🎁 Preview rewards before starting
                  </button>

                  {/* TASK CHUNKING: Break it down button for difficult tasks */}
                  {task.difficulty >= 3 && !task.isChunked && !task.isChunk && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openChunkModal(task); }}
                      className="w-full mt-2 glass-button py-2.5 rounded-xl text-purple-400/80 font-medium bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors ios-button flex items-center justify-center gap-2 text-sm"
                    >
                      <span>🧩</span>
                      <span>Too big? Break it down</span>
                    </button>
                  )}

                  {/* Show chunk indicator if task has been chunked */}
                  {task.isChunked && (
                    <p className="text-purple-400/60 text-xs text-center mt-2">
                      🧩 Broken into {task.chunkIds?.length || 0} micro-tasks
                    </p>
                  )}

                  {/* Show parent indicator if this is a chunk */}
                  {task.isChunk && (
                    <p className="text-purple-400/60 text-xs text-center mt-2">
                      🧩 Micro-step
                    </p>
                  )}
                  </div>
                </SwipeableTask>
              );
            })
          )}
          </div>

          {/* ADHD: One Thing Mode Toggle */}
          {dailyFrog && otherTasksCount > 0 && oneThingMode && (
            <div className="mt-6 mb-4">
              <button
                onClick={() => { Haptics.light(); setOneThingMode(false); }}
                className="w-full glass-card p-4 flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
              >
                <span className="text-white/60">📋</span>
                <span className="text-white/70">
                  {otherTasksCount} more task{otherTasksCount !== 1 ? 's' : ''} waiting
                </span>
              </button>
            </div>
          )}
          {!oneThingMode && dailyFrog && (
            <div className="mt-6 mb-4">
              <button
                onClick={() => { Haptics.light(); setOneThingMode(true); }}
                className="w-full glass-card p-4 flex items-center justify-center gap-3 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all"
              >
                <span className="text-green-400">🎯</span>
                <span className="text-green-400">Focus on frog only</span>
              </button>
            </div>
          )}
        </PullToRefresh>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
          {/* DAILY INTENTION: Set your North Star task */}
          {tasks.length > 0 && (
            <button
              onClick={() => { Haptics.light(); setShowIntentionPicker(true); }}
              className={`glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform ${
                dailyIntention
                  ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/40'
                  : 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/20'
              }`}
              title={dailyIntention ? "Your North Star is set!" : "Set your North Star task"}
            >
              ⭐
            </button>
          )}
          {/* ACCOMPLISHMENT JOURNAL: View your wins */}
          {completedTasks.length > 0 && (
            <button
              onClick={openAccomplishmentJournal}
              className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/20"
              title="View your accomplishments"
            >
              📖
            </button>
          )}
          {/* PARKING LOT: Show if there are parked tasks */}
          {parkedTasks.length > 0 && (
            <button
              onClick={() => setShowParkingLot(true)}
              className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-400/20 relative"
              title="View parked tasks"
            >
              🅿️
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center font-bold text-white">
                {parkedTasks.length}
              </span>
            </button>
          )}
          {/* FUTURE SELF: Show encouraging message on bad days */}
          {(badDayMode || energy <= 2) && futureSelfMessages.length > 0 && (
            <button
              onClick={showRandomFutureSelfMessage}
              className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-400/20"
              title="Message from past you"
            >
              💌
            </button>
          )}
          {/* TASK DNA: Smart suggestion based on patterns */}
          {taskDNA.completions.length >= 3 && tasks.length > 0 && (
            <button
              onClick={getDNASuggestion}
              className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-cyan-500/20 to-green-500/20 border-2 border-cyan-400/20"
              title="DNA-matched task suggestion"
            >
              🧬
            </button>
          )}
          {/* FOCUS BUDDY: AI encouragement chat */}
          <button
            onClick={openFocusBuddy}
            className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-purple-400/20 to-blue-500/20 border-2 border-purple-400/20"
            title="Chat with Focus Buddy"
          >
            🤗
          </button>
          {/* PANIC BUTTON: Emergency mode when overwhelmed */}
          {tasks.length > 0 && (
            <button
              onClick={activateEmergencyMode}
              className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/20"
              title="Everything is too much? Tap here."
            >
              🫂
            </button>
          )}
          {/* ADHD: Pick For Me - overcomes decision paralysis */}
          {tasks.length > 0 && (
            <button
              onClick={handlePickForMe}
              className={`glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/30 ${!settings.lowStimMode ? 'animate-pulse-subtle' : ''}`}
              title="Pick a task for me!"
            >
              🎲
            </button>
          )}
          <button
            onClick={() => { Haptics.medium(); setShowAddTask(true); }}
            className="glass-icon w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform"
          >
            ➕
          </button>
          <button
            onClick={() => { Haptics.light(); resetDay(); }}
            className="glass-icon-sm w-12 h-12 flex items-center justify-center text-xl opacity-60 hover:opacity-100 transition-opacity"
          >
            🔄
          </button>
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom z-40">
          <div className="flex justify-around py-3">
            <div className="flex flex-col items-center text-green-400">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1">
                <span className="text-xl">🐸</span>
              </div>
              <span className="text-xs font-medium">Tasks</span>
            </div>
            <Link href="/calendar" className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">📅</span>
              </div>
              <span className="text-xs">Calendar</span>
            </Link>
            <Link href="/stats" className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-xs">Stats</span>
            </Link>
            <button 
              onClick={() => { Haptics.light(); setShowSettings(true); }}
              className="flex flex-col items-center text-white/50 hover:text-white/80 transition-colors"
            >
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center mb-1 opacity-60">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up max-h-[80vh] overflow-hidden">
              <div className="glass-card p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Settings</h2>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Account Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Account</h3>
                  <UserProfile />
                </div>

                {/* Notifications Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔔</span>
                        <div>
                          <p className="text-white font-medium">Push Notifications</p>
                          <p className="text-white/40 text-xs">Timer completion alerts</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('pushNotifications')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.pushNotifications ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.pushNotifications ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔊</span>
                        <div>
                          <p className="text-white font-medium">Sound Effects</p>
                          <p className="text-white/40 text-xs">Task completion sounds</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('soundEffects')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.soundEffects ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.soundEffects ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📳</span>
                        <div>
                          <p className="text-white font-medium">Vibration</p>
                          <p className="text-white/40 text-xs">Haptic feedback</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('vibration')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.vibration ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.vibration ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Display Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Display</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔢</span>
                        <div>
                          <p className="text-white font-medium">Show Task Count</p>
                          <p className="text-white/40 text-xs">Display total tasks remaining</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('showTaskCount')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.showTaskCount ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.showTaskCount ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-white font-medium">Auto-Filter by Energy</p>
                          <p className="text-white/40 text-xs">Show tasks matching your energy</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('autoFilterByEnergy')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.autoFilterByEnergy ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.autoFilterByEnergy ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📱</span>
                        <div>
                          <p className="text-white font-medium">Compact Mode</p>
                          <p className="text-white/40 text-xs">Smaller cards, more tasks visible</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('compactMode')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.compactMode ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.compactMode ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ADHD-Friendly Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🧠</span> ADHD-Friendly
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🌙</span>
                        <div>
                          <p className="text-white font-medium">Low Stim Mode</p>
                          <p className="text-white/40 text-xs">Reduce animations & visual noise</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('lowStimMode')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.lowStimMode ? 'bg-purple-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.lowStimMode ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💚</span>
                        <div>
                          <p className="text-white font-medium">Gentle Language</p>
                          <p className="text-white/40 text-xs">Encouraging, non-pressuring words</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('gentleLanguage')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.gentleLanguage ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.gentleLanguage ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Streak Protection Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">❄️</span>
                        <div>
                          <p className="text-white font-medium">Streak Forgiveness</p>
                          <p className="text-white/40 text-xs">
                            {settings.streakFreezesPerWeek} freeze days/week ({settings.streakFreezesPerWeek - streakFreezesUsed} left)
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('streakForgiveness')}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          settings.streakForgiveness ? 'bg-blue-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          settings.streakForgiveness ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Accountability Partner */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">👥</span>
                        <div>
                          <p className="text-white font-medium">Accountability Partner</p>
                          <p className="text-white/40 text-xs">
                            {accountabilityPartner ? `Connected: ${accountabilityPartner.name}` : 'Not set up'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAccountabilitySetup(true)}
                        className="glass-button px-3 py-1 rounded-lg text-sm text-white/70"
                      >
                        {accountabilityPartner ? 'Edit' : 'Set up'}
                      </button>
                    </div>

                    {/* Time Anchoring Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⏰</span>
                        <div>
                          <p className="text-white font-medium">Smart Time Anchoring</p>
                          <p className="text-white/40 text-xs">Get nudges during your peak productivity times</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTimeAnchorEnabled(prev => !prev)}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          timeAnchorEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          timeAnchorEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Energy-Based Sorting Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-white font-medium">Energy-Smart Sorting</p>
                          <p className="text-white/40 text-xs">
                            {energy >= 4 ? 'High energy → Hard tasks first' :
                             energy <= 2 ? 'Low energy → Easy tasks first' :
                             'Tasks sorted by your current energy'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnergySortEnabled(prev => !prev)}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          energySortEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          energySortEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Task DNA Smart Suggestions */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🧬</span>
                        <div>
                          <p className="text-white font-medium">Task DNA Matching</p>
                          <p className="text-white/40 text-xs">
                            {taskDNA.completions.length > 0
                              ? `Learning from ${taskDNA.completions.length} completed tasks`
                              : 'Complete tasks to build your pattern profile'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={getDNASuggestion}
                        disabled={taskDNA.completions.length < 3}
                        className="glass-button px-3 py-1 rounded-lg text-sm text-white/70 disabled:opacity-40"
                      >
                        Suggest
                      </button>
                    </div>

                    {/* Future Self Messages */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💌</span>
                        <div>
                          <p className="text-white font-medium">Future Self Messages</p>
                          <p className="text-white/40 text-xs">
                            {futureSelfMessages.length > 0
                              ? `${futureSelfMessages.length} message${futureSelfMessages.length !== 1 ? 's' : ''} saved for rough days`
                              : 'Complete frogs to leave encouragement'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={showRandomFutureSelfMessage}
                        disabled={futureSelfMessages.length === 0}
                        className="glass-button px-3 py-1 rounded-lg text-sm text-white/70 disabled:opacity-40"
                      >
                        View
                      </button>
                    </div>

                    {/* Smart Break Reminders */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">☕</span>
                        <div>
                          <p className="text-white font-medium">Smart Break Reminders</p>
                          <p className="text-white/40 text-xs">
                            Reminds you to take breaks after {BREAK_THRESHOLD_MINUTES} mins focus
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setBreakReminderEnabled(prev => !prev);
                          Storage.set('breakReminderEnabled', !breakReminderEnabled);
                        }}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          breakReminderEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          breakReminderEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Focus Ritual */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎯</span>
                        <div>
                          <p className="text-white font-medium">Focus Ritual</p>
                          <p className="text-white/40 text-xs">
                            Pre-focus checklist to help you get started
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFocusRitualEnabled(prev => !prev);
                          Storage.set('focusRitualEnabled', !focusRitualEnabled);
                        }}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          focusRitualEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          focusRitualEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Quick Win Streak Stats */}
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-yellow-300 text-xs font-medium">🔥 Quick Win Streak</p>
                        <span className="text-yellow-400 font-bold">{quickWinStreak} tasks</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Best streak: {bestQuickWinStreak}</span>
                        {getStreakMilestone(quickWinStreak) && (
                          <span className="text-yellow-300">
                            {getStreakMilestone(quickWinStreak).emoji} {getStreakMilestone(quickWinStreak).title}
                          </span>
                        )}
                      </div>
                      {getNextMilestone(quickWinStreak) && (
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
                            style={{
                              width: `${((quickWinStreak % (getNextMilestone(quickWinStreak)?.streak || 5)) / (getNextMilestone(quickWinStreak)?.streak || 5)) * 100}%`
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Accomplishment Journal */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📖</span>
                        <div>
                          <p className="text-white font-medium">Accomplishment Journal</p>
                          <p className="text-white/40 text-xs">
                            View your wins and celebrate progress
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={openAccomplishmentJournal}
                        className="glass-button px-3 py-1 rounded-lg text-sm text-white/70"
                      >
                        View
                      </button>
                    </div>

                    {/* Task Parking Lot */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🅿️</span>
                        <div>
                          <p className="text-white font-medium">Parking Lot</p>
                          <p className="text-white/40 text-xs">
                            {parkedTasks.length > 0
                              ? `${parkedTasks.length} task${parkedTasks.length !== 1 ? 's' : ''} parked`
                              : 'Guilt-free zone for paused tasks'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowParkingLot(true)}
                        className="glass-button px-3 py-1 rounded-lg text-sm text-white/70"
                      >
                        View
                      </button>
                    </div>

                    {/* Hyperfocus Guard */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⏰</span>
                        <div>
                          <p className="text-white font-medium">Hyperfocus Guard</p>
                          <p className="text-white/40 text-xs">
                            Warns after {hyperfocusThreshold} mins to prevent burnout
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setHyperfocusGuardEnabled(prev => !prev);
                          Storage.set('hyperfocusGuardEnabled', !hyperfocusGuardEnabled);
                        }}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          hyperfocusGuardEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          hyperfocusGuardEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Micro-Wins Celebrations */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎉</span>
                        <div>
                          <p className="text-white font-medium">Micro-Wins</p>
                          <p className="text-white/40 text-xs">
                            Celebrate starts, milestones, and subtasks
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMicroWinEnabled(prev => !prev);
                          Storage.set('microWinEnabled', !microWinEnabled);
                        }}
                        className={`w-12 h-7 rounded-full transition-all relative ${
                          microWinEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all ${
                          microWinEnabled ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    {/* Distraction Patterns Summary */}
                    {Object.keys(distractionPatterns).length > 0 && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-blue-300 text-xs font-medium mb-2">📓 Distraction Insights</p>
                        <div className="space-y-1">
                          {getDistractionTips(distractionPatterns).map((tip, i) => (
                            <p key={i} className="text-white/60 text-xs">{tip}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick explanation */}
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-purple-300 text-xs">
                        <strong>Journal 📖</strong> celebrates wins. <strong>Parking Lot 🅿️</strong> holds paused tasks. <strong>Hyperfocus Guard ⏰</strong> prevents burnout.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sensory Rewards Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🎵</span> Sensory Rewards
                  </h3>
                  <p className="text-white/40 text-xs mb-3">Customize how celebrations feel</p>

                  <div className="space-y-3">
                    {/* Celebration Sound */}
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-white font-medium text-sm mb-2">Celebration Sound</p>
                      <div className="flex gap-2 flex-wrap">
                        {['chime', 'pop', 'nature', 'silent'].map(sound => (
                          <button
                            key={sound}
                            onClick={() => {
                              updateSensoryPreference('celebrationSound', sound);
                              if (sound !== 'silent') playCelebrationSound(sound);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              sensoryPreferences.celebrationSound === sound
                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {sound === 'chime' ? '🔔 Chime' : sound === 'pop' ? '🎉 Pop' : sound === 'nature' ? '🌿 Nature' : '🔇 Silent'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Haptic Pattern */}
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-white font-medium text-sm mb-2">Haptic Feedback</p>
                      <div className="flex gap-2 flex-wrap">
                        {['standard', 'gentle', 'intense', 'none'].map(pattern => (
                          <button
                            key={pattern}
                            onClick={() => {
                              updateSensoryPreference('hapticPattern', pattern);
                              if (pattern !== 'none') triggerHaptic(pattern);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              sensoryPreferences.hapticPattern === pattern
                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {pattern === 'standard' ? '📳 Standard' : pattern === 'gentle' ? '✨ Gentle' : pattern === 'intense' ? '⚡ Intense' : '🚫 None'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Effect */}
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-white font-medium text-sm mb-2">Visual Celebration</p>
                      <div className="flex gap-2 flex-wrap">
                        {['confetti', 'glow', 'minimal', 'none'].map(effect => (
                          <button
                            key={effect}
                            onClick={() => updateSensoryPreference('visualEffect', effect)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              sensoryPreferences.visualEffect === effect
                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {effect === 'confetti' ? '🎊 Confetti' : effect === 'glow' ? '✨ Glow' : effect === 'minimal' ? '💫 Minimal' : '🚫 None'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Style */}
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-white font-medium text-sm mb-2">Encouragement Style</p>
                      <div className="flex gap-2 flex-wrap">
                        {['mixed', 'hype', 'gentle', 'playful'].map(style => (
                          <button
                            key={style}
                            onClick={() => updateSensoryPreference('messageStyle', style)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              sensoryPreferences.messageStyle === style
                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {style === 'mixed' ? '🎭 Mixed' : style === 'hype' ? '🔥 Hype' : style === 'gentle' ? '💚 Gentle' : '😜 Playful'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Appearance</h3>
                  
                  {/* Theme Selection */}
                  <div className="mb-3">
                    <p className="text-white font-medium mb-2 text-sm">Theme Mode</p>
                    <ThemeSelector />
                  </div>
                  
                  {/* Background Theme */}
                  <button
                    onClick={() => { setShowSettings(false); setShowBackgroundSelector(true); }}
                    className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎨</span>
                      <div className="text-left">
                        <p className="text-white font-medium">Background Theme</p>
                        <p className="text-white/40 text-xs">Choose your vibe</p>
                      </div>
                    </div>
                    <span className="text-white/40">→</span>
                  </button>
                </div>
                
                {/* Task Management Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Task Management</h3>
                  <div className="space-y-3">
                    {/* Reorder Tasks */}
                    <button
                      onClick={() => { setShowSettings(false); setReorderMode(true); Haptics.medium(); }}
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔀</span>
                        <div className="text-left">
                          <p className="text-white font-medium">Reorder Tasks</p>
                          <p className="text-white/40 text-xs">Tap to change task order</p>
                        </div>
                      </div>
                      <span className="text-white/40">→</span>
                    </button>
                  </div>
                </div>
                
                {/* iOS Widget Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">iOS Widget</h3>
                  <button
                    onClick={() => { setShowSettings(false); setShowWidgetModal(true); }}
                    className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📱</span>
                      <div className="text-left">
                        <p className="text-white font-medium">Add Home Screen Widget</p>
                        <p className="text-white/40 text-xs">See your frog at a glance</p>
                      </div>
                    </div>
                    <span className="text-white/40">→</span>
                  </button>
                </div>

                {/* Platform Integrations Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Platform Integrations</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => { setShowSettings(false); setShowSiriShortcuts(true); }}
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎙️</span>
                        <div className="text-left">
                          <p className="text-white font-medium">Siri Shortcuts</p>
                          <p className="text-white/40 text-xs">Voice commands for tasks</p>
                        </div>
                      </div>
                      <span className="text-white/40">→</span>
                    </button>

                    <button
                      onClick={() => { setShowSettings(false); setShowAppleWatch(true); }}
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⌚</span>
                        <div className="text-left">
                          <p className="text-white font-medium">Apple Watch</p>
                          <p className="text-white/40 text-xs">Complications & quick actions</p>
                        </div>
                      </div>
                      <span className="text-white/40">→</span>
                    </button>

                    <button
                      onClick={() => { setShowSettings(false); setShowAnalytics(true); }}
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📊</span>
                        <div className="text-left">
                          <p className="text-white font-medium">Analytics</p>
                          <p className="text-white/40 text-xs">Usage insights & patterns</p>
                        </div>
                      </div>
                      <span className="text-white/40">→</span>
                    </button>

                    <button
                      onClick={() => { setShowSettings(false); onboarding.resetOnboarding(); }}
                      className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors ios-button"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📖</span>
                        <div className="text-left">
                          <p className="text-white font-medium">Replay Tutorial</p>
                          <p className="text-white/40 text-xs">See the onboarding again</p>
                        </div>
                      </div>
                      <span className="text-white/40">→</span>
                    </button>
                  </div>
                </div>
                
                {/* Reminders Section */}
                {/* Apple Reminders Sync Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">🍎 Apple Reminders</h3>
                  <div className="glass-card-inner p-4 bg-white/5 rounded-xl">
                    <AppleRemindersSync userId={userId} onSyncComplete={() => loadTasks()} />
                  </div>
                </div>
                
                {/* Scheduled Reminders Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">🔔 Scheduled Reminders</h3>
                  <div className="glass-card-inner p-4 bg-white/5 rounded-xl">
                    <ScheduledRemindersList tasks={tasks} />
                    <p className="text-white/40 text-xs mt-3 text-center">
                      Tap 🔔 on any task to schedule a reminder
                    </p>
                  </div>
                </div>
                
                {/* Custom Categories Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">🎨 Categories</h3>
                  <div className="glass-card-inner p-4 bg-white/5 rounded-xl">
                    <CategoryManagerList onCategoriesChange={refreshCategories} />
                  </div>
                </div>
                
                {/* Frog Evolution Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Your Frog</h3>
                  <div className="glass-card-inner p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <FrogCharacter level={level} size="lg" />
                      <div>
                        <p className="text-white font-bold text-lg">{getFrogStage(level).name}</p>
                        <p className="text-white/60 text-sm">Level {level}</p>
                        <p className="text-white/40 text-xs mt-1">{getFrogStage(level).description}</p>
                      </div>
                    </div>
                    <FrogEvolutionShowcase currentLevel={level} />
                  </div>
                </div>
                
                {/* Data Section */}
                <div className="mb-6">
                  <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3">Data</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">💾</span>
                        <p className="text-white font-medium">Storage</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-white/40">Tasks</p>
                          <p className="text-white font-medium">{tasks.length + completedTasks.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-white/40">Mood Logs</p>
                          <p className="text-white font-medium">{moodLog.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* About */}
                <div className="text-center pt-4 border-t border-white/10">
                  <p className="text-white/30 text-xs">Frog 🐸 v1.0</p>
                  <p className="text-white/20 text-xs">Compassionate productivity for ADD minds</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Mood Change Modal */}
        {showMoodPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMoodPicker(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">How are you feeling?</h2>
                  <button 
                    onClick={() => setShowMoodPicker(false)} 
                    className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-white/50 text-sm mb-4">
                  Energy changes throughout the day — that&apos;s normal! Update your current level.
                </p>
                
                {/* Energy Level Selection */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {ENERGY_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      onClick={() => changeMood(lvl.value, moodNote)}
                      className={`glass-card p-4 text-center transition-all ${
                        energy === lvl.value 
                          ? 'ring-2 ring-green-400 bg-green-500/20' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="text-3xl block mb-1">{lvl.emoji}</span>
                      <span className="text-white/80 text-xs">{lvl.label}</span>
                    </button>
                  ))}
                </div>
                
                {/* Optional Note */}
                <div className="mb-4">
                  <label className="text-white/60 text-sm mb-2 block">Quick note (optional)</label>
                  <input
                    type="text"
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    placeholder="What changed? (coffee, meeting, tired...)"
                    className="w-full glass-input px-4 py-3 rounded-xl text-white text-sm placeholder-white/30"
                  />
                </div>
                
                {/* Today's Mood History */}
                {moodLog.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/60 text-sm mb-3">Today&apos;s mood changes:</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {moodLog.slice().reverse().map((entry) => {
                        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const lvl = ENERGY_LEVELS.find(e => e.value === entry.energy);
                        return (
                          <div key={entry.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                            <span className="text-lg">{lvl?.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white/80 text-sm">{lvl?.label}</p>
                              {entry.note && (
                                <p className="text-white/40 text-xs truncate">{entry.note}</p>
                              )}
                            </div>
                            <span className="text-white/30 text-xs">{time}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Mood Tips */}
                <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-blue-300 text-xs">
                    💡 <strong>Tip:</strong> Low energy? Try a 5-min task or take a short break. 
                    Your tasks will filter to match your current energy level.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">New Task</h2>
                  <button onClick={() => setShowAddTask(false)} className="glass-icon-sm w-10 h-10 flex items-center justify-center text-white/60">
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Task Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={isListening ? "Listening..." : "What needs to be done?"}
                        className={`flex-1 glass-input px-4 py-3 rounded-xl text-white placeholder-white/30 ${isListening ? 'ring-2 ring-red-400/50' : ''}`}
                        autoFocus
                      />
                      {voiceSupported && (
                        <button
                          type="button"
                          onClick={toggleVoiceInput}
                          className={`glass-button w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isListening
                              ? 'bg-red-500/30 ring-2 ring-red-400/50 animate-pulse'
                              : 'hover:bg-white/10'
                          }`}
                          title={isListening ? "Stop listening" : "Voice input"}
                        >
                          <span className="text-xl">{isListening ? '⏹️' : '🎤'}</span>
                        </button>
                      )}
                    </div>
                    {isListening && (
                      <p className="text-red-400/80 text-xs mt-1 animate-pulse">
                        🎙️ Speak now... tap again to stop
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => setNewTask(prev => ({ ...prev, category: key }))}
                          className={`glass-button p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                            newTask.category === key ? 'ring-2 ring-white/30 bg-white/10' : ''
                          }`}
                        >
                          <span className="text-xl">{cat.emoji}</span>
                          <span className="text-xs text-white/70">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Difficulty</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <button
                          key={d}
                          onClick={() => setNewTask(prev => ({ ...prev, difficulty: d }))}
                          className={`flex-1 glass-button py-3 rounded-xl text-center transition-all ${
                            newTask.difficulty === d ? 'ring-2 ring-yellow-400/50 bg-yellow-400/10' : ''
                          }`}
                        >
                          <span className="text-yellow-400">{'⭐'.repeat(d)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Time Estimate</label>
                    <div className="flex gap-2">
                      {[5, 15, 25, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setNewTask(prev => ({ ...prev, estimatedMinutes: mins }))}
                          className={`flex-1 glass-button py-3 rounded-xl text-center transition-all ${
                            newTask.estimatedMinutes === mins ? 'ring-2 ring-blue-400/50 bg-blue-400/10' : ''
                          }`}
                        >
                          <span className="text-blue-400 text-sm">{mins}m</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recurrence */}
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Repeat</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'none', label: 'Once', emoji: '1️⃣' },
                        { value: 'daily', label: 'Daily', emoji: '📆' },
                        { value: 'weekdays', label: 'Weekdays', emoji: '💼' },
                        { value: 'weekly', label: 'Weekly', emoji: '📅' },
                        { value: 'biweekly', label: 'Bi-weekly', emoji: '🔄' },
                        { value: 'monthly', label: 'Monthly', emoji: '🗓️' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setNewTask(prev => ({ ...prev, recurrence: opt.value }))}
                          className={`glass-button p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                            newTask.recurrence === opt.value ? 'ring-2 ring-purple-400/50 bg-purple-400/10' : ''
                          }`}
                        >
                          <span className="text-lg">{opt.emoji}</span>
                          <span className="text-[10px] text-white/70">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Due Date with Enhanced Picker */}
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">
                      {newTask.recurrence === 'none' ? 'Due Date (optional)' : 'Start Date'}
                    </label>
                    <DueDatePicker
                      value={newTask.dueDate}
                      onChange={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
                      reminder={newTask.dueReminder}
                      onReminderChange={(reminder) => setNewTask(prev => ({ ...prev, dueReminder: reminder }))}
                    />
                  </div>
                  
                  <button
                    onClick={handleAddTask}
                    disabled={!newTask.title.trim()}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-green-500/20 border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {newTask.recurrence !== 'none' ? '🔄 Add Recurring Task' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reminder Picker Modal */}
        {showReminderPicker && reminderTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowReminderPicker(false)} 
            />
            <div className="relative w-full max-w-sm mx-4">
              <ReminderPicker 
                task={reminderTask}
                onReminderSet={(time) => {
                  // Update task with reminder time
                  setTasks(prev => prev.map(t => 
                    t.id === reminderTask.id 
                      ? { ...t, reminderTime: time }
                      : t
                  ));
                }}
                onClose={() => {
                  setShowReminderPicker(false);
                  setReminderTask(null);
                }}
              />
            </div>
          </div>
        )}

        {/* iOS Context Menu */}
        <TaskContextMenu
          isOpen={showContextMenu}
          onClose={() => {
            setShowContextMenu(false);
            setContextMenuTask(null);
          }}
          task={contextMenuTask}
          onComplete={() => contextMenuTask && handleCompleteTask(contextMenuTask)}
          onDelete={() => contextMenuTask && handleDeleteTask(contextMenuTask.id)}
          onSetReminder={() => {
            if (contextMenuTask) {
              setReminderTask(contextMenuTask);
              setShowReminderPicker(true);
            }
          }}
          onSetFrog={() => contextMenuTask && handleToggleFrog(contextMenuTask)}
          onEdit={() => {
            // Future: Add edit functionality
            Haptics.light();
          }}
        />

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-center animate-bounce-in">
              <div className="text-8xl mb-4">🎉</div>
              <div className="glass-card px-8 py-4">
                <p className="text-white font-bold text-xl">Task Complete!</p>
                <p className="text-green-400">+{focusTask?.difficulty * 10 + (focusTask?.frog ? 20 : 0)} XP</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Confetti Celebration */}
        <TaskCompleteCelebration
          active={showConfetti}
          isFrog={confettiFrog}
          onComplete={() => setShowConfetti(false)}
        />

        {/* TRANSITION MOMENTUM: Post-task transition screen */}
        {showTransition && completedTaskData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className={`relative w-full max-w-sm mx-4 ${!settings.lowStimMode ? 'animate-bounce-in' : 'animate-slide-up'}`}>
              <div className="glass-card p-6 text-center">
                {/* Celebration */}
                <div className={`text-6xl mb-3 ${!settings.lowStimMode ? 'animate-wave' : ''}`}>
                  {completedTaskData.task.frog ? '🐸' : '✅'}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {completedTaskData.task.frog ? 'Frog Eaten!' : 'Nice Work!'}
                </h2>

                {/* REWARD VARIETY: XP with bonus indicator */}
                <div className="mb-2">
                  <p className={`font-semibold ${completedTaskData.bonusXP ? 'text-yellow-400' : 'text-green-400'}`}>
                    +{completedTaskData.xpEarned} XP
                    {completedTaskData.bonusXP && (
                      <span className="ml-2 text-sm bg-yellow-500/20 px-2 py-0.5 rounded-full animate-pulse">
                        ✨ BONUS!
                      </span>
                    )}
                  </p>
                </div>

                {/* REWARD VARIETY: Encouraging message */}
                <p className="text-white/80 text-sm mb-4 italic">
                  "{completedTaskData.encouragement || "Great job!"}"
                </p>

                {/* Reward streak indicator */}
                {completedTaskData.rewardStreak > 1 && (
                  <div className="text-xs text-purple-400 mb-3">
                    🔥 {completedTaskData.rewardStreak} tasks in a row today!
                  </div>
                )}

                {/* TIME BLINDNESS FEEDBACK */}
                {completedTaskData.actualMinutes > 0 && (
                  <div className="glass p-3 rounded-xl mb-4 text-sm">
                    <div className="flex justify-between text-white/70 mb-1">
                      <span>Estimated</span>
                      <span>Actual</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{completedTaskData.estimatedMinutes}min</span>
                      <span className={`text-lg ${completedTaskData.timeDiff <= 0 ? 'text-green-400' : completedTaskData.timeDiff <= 5 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        →
                      </span>
                      <span className={`font-bold ${completedTaskData.timeDiff <= 0 ? 'text-green-400' : completedTaskData.timeDiff <= 5 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {completedTaskData.actualMinutes}min
                      </span>
                    </div>
                    {completedTaskData.timeDiff > 5 && settings.gentleLanguage && (
                      <p className="text-white/50 text-xs mt-2">
                        This type of task usually takes a bit longer - that's useful to know! 📝
                      </p>
                    )}
                    {completedTaskData.timeDiff <= 0 && (
                      <p className="text-green-400/70 text-xs mt-2">
                        Finished early! Great focus session 🎯
                      </p>
                    )}
                  </div>
                )}

                {/* 30-second transition buffer message */}
                <p className="text-white/50 text-xs mb-4">
                  Take a breath. You've earned a moment. 🌟
                </p>

                {/* Next task suggestion */}
                {suggestedNextTask ? (
                  <div className="space-y-3">
                    <div className="glass p-3 rounded-xl text-left">
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Up Next</p>
                      <p className="text-white font-medium">{suggestedNextTask.title}</p>
                      {suggestedNextTask.frog && (
                        <span className="inline-block mt-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          🐸 Your Frog
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTransitionContinue(true)}
                      className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-green-500/20 border-green-500/30 hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <span>⚡</span>
                      <span>Just 2 more minutes</span>
                    </button>

                    <button
                      onClick={() => handleTransitionContinue(false)}
                      className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      Take a break
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-white/70">All tasks complete for now! 🎉</p>
                    <button
                      onClick={() => handleTransitionContinue(false)}
                      className="w-full glass-button py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Widget Preview Modal */}
        {showWidgetModal && (
          <WidgetPreview
            frog={dailyFrog}
            stats={{
              level,
              xp,
              tasksRemaining: tasks.length,
              tasksCompleted: completedTasks.length,
              streak
            }}
            onClose={() => setShowWidgetModal(false)}
          />
        )}
        
        {/* Reorder Mode Overlay */}
        {reorderMode && (
          <div className="fixed top-0 left-0 right-0 z-50 glass-dark safe-area-top">
            <div className="px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => { Haptics.light(); setReorderMode(false); }}
                className="glass-button px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <p className="text-white font-medium">Tap to Reorder</p>
              <button
                onClick={() => { Haptics.success(); setReorderMode(false); }}
                className="glass-button px-4 py-2 rounded-lg text-sm bg-green-500/20 text-green-400"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Notification Settings Modal */}
        <NotificationManager
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          frogTask={dailyFrog}
          onScheduleNotification={(fn) => setScheduleNotification(() => fn)}
        />

        {/* Background Selector Modal */}
        <BackgroundSelector
          isOpen={showBackgroundSelector}
          onClose={() => setShowBackgroundSelector(false)}
          currentPage="home"
        />

        {/* Onboarding Modal */}
        <OnboardingModal {...onboarding} />

        {/* Siri Shortcuts Modal */}
        {showSiriShortcuts && (
          <SiriShortcuts onClose={() => setShowSiriShortcuts(false)} />
        )}

        {/* Apple Watch Companion Modal */}
        {showAppleWatch && (
          <AppleWatchCompanion onClose={() => setShowAppleWatch(false)} />
        )}

        {/* Analytics Dashboard Modal */}
        {showAnalytics && (
          <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
        )}

        {/* Accountability Partner Setup Modal */}
        {showAccountabilitySetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccountabilitySetup(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🤝</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Accountability Partner</h2>
                  <p className="text-white/60 text-sm">
                    Add someone who can cheer you on when you complete tasks or help when you're struggling.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const name = formData.get('partnerName')?.trim();
                  const contact = formData.get('partnerContact')?.trim();
                  if (name) {
                    saveAccountabilityPartner(name, contact);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Their Name</label>
                    <input
                      type="text"
                      name="partnerName"
                      defaultValue={accountabilityPartner?.name || ''}
                      placeholder="e.g., Mom, Best Friend, Coach"
                      className="w-full glass-card bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">Phone Number (optional)</label>
                    <input
                      type="tel"
                      name="partnerContact"
                      defaultValue={accountabilityPartner?.contact || ''}
                      placeholder="e.g., +1 555-123-4567"
                      className="w-full glass-card bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                    <p className="text-white/40 text-xs mt-1">For quick text updates when you complete tasks</p>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                    >
                      {accountabilityPartner ? 'Update Partner' : 'Add Partner'}
                    </button>

                    {accountabilityPartner && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountabilityPartner(null);
                          Storage.set('accountabilityPartner', null);
                          setShowAccountabilitySetup(false);
                          Haptics.light();
                        }}
                        className="w-full glass-button py-3 rounded-xl text-red-400/80 hover:text-red-400 transition-colors"
                      >
                        Remove Partner
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAccountabilitySetup(false)}
                      className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-white/50 text-xs text-center">
                    💡 Having someone to share wins with can boost motivation by up to 65%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BAD DAY: Proactive Support Modal */}
        {showBadDaySupport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissBadDaySupport} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center">
                <div className="text-6xl mb-4">💙</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {BAD_DAY_MESSAGES.detection[Math.floor(Math.random() * BAD_DAY_MESSAGES.detection.length)]}
                </h2>
                <p className="text-white/60 mb-6">
                  {BAD_DAY_MESSAGES.support[Math.floor(Math.random() * BAD_DAY_MESSAGES.support.length)]}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={acceptBadDaySupport}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all"
                  >
                    <span className="mr-2">🌱</span>
                    Yes, help me do just one tiny thing
                  </button>

                  <button
                    onClick={() => {
                      activateEmergencyMode();
                      setShowBadDaySupport(false);
                    }}
                    className="w-full glass-button py-3 rounded-xl text-white/80 hover:text-white transition-colors"
                  >
                    <span className="mr-2">🫂</span>
                    Take me to emergency mode
                  </button>

                  <button
                    onClick={dismissBadDaySupport}
                    className="w-full glass-button py-3 rounded-xl text-white/50 hover:text-white/70 transition-colors"
                  >
                    I'm okay, just a rough patch
                  </button>
                </div>

                {badDayMode && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={exitBadDayMode}
                      className="text-white/40 text-sm hover:text-white/60"
                    >
                      Exit reduced expectations mode
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TASK CHUNKING: Break It Down Modal */}
        {showChunkModal && taskToChunk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowChunkModal(false)} />
            <div className="relative w-full max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="glass-card p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🧩</div>
                  <h2 className="text-xl font-bold text-white mb-2">Break It Down</h2>
                  <p className="text-white/60 text-sm">
                    "{taskToChunk.title}" feels big? Let's split it into tiny wins.
                  </p>
                </div>

                {/* Suggested chunks */}
                <div className="mb-6">
                  <label className="text-white/70 text-sm mb-3 block">Suggested micro-steps:</label>
                  <div className="space-y-2">
                    {suggestedChunks.map((chunk, index) => (
                      <label
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={index < 3}
                          className="w-5 h-5 rounded accent-green-500"
                          data-chunk-index={index}
                        />
                        <span className="text-white text-sm flex-1">{chunk}</span>
                        <span className="text-green-400/60 text-xs">+5 XP</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom chunks */}
                <div className="mb-6">
                  <label className="text-white/70 text-sm mb-3 block">Or add your own:</label>
                  <div className="space-y-2">
                    {customChunks.map((chunk, index) => (
                      <input
                        key={index}
                        type="text"
                        value={chunk}
                        onChange={(e) => {
                          const newChunks = [...customChunks];
                          newChunks[index] = e.target.value;
                          setCustomChunks(newChunks);
                        }}
                        placeholder={`Custom step ${index + 1}...`}
                        className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // Gather selected suggested chunks
                      const checkboxes = document.querySelectorAll('[data-chunk-index]');
                      const selectedSuggested = Array.from(checkboxes)
                        .filter(cb => cb.checked)
                        .map(cb => suggestedChunks[parseInt(cb.dataset.chunkIndex)]);

                      // Add custom chunks
                      const allChunks = [...selectedSuggested, ...customChunks.filter(c => c.trim())];

                      if (allChunks.length > 0) {
                        createChunkTasks(allChunks);
                      }
                    }}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                  >
                    Create {suggestedChunks.filter((_, i) => i < 3).length + customChunks.filter(c => c.trim()).length} Micro-Tasks
                  </button>

                  <button
                    onClick={() => setShowChunkModal(false)}
                    className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                  <p className="text-white/40 text-xs">
                    💡 Each micro-step earns XP independently!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOPAMINE PREVIEW: Show rewards before starting */}
        {showDopaminePreview && previewTask && previewRewards && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDopaminePreview(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center overflow-hidden">
                {/* Sparkle animation background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 text-2xl animate-pulse">✨</div>
                  <div className="absolute top-8 right-8 text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</div>
                  <div className="absolute bottom-12 left-8 text-lg animate-pulse" style={{ animationDelay: '1s' }}>💫</div>
                </div>

                <div className="relative">
                  <div className="text-5xl mb-4">🎁</div>
                  <h2 className="text-xl font-bold text-white mb-2">Complete This & Earn</h2>
                  <p className="text-white/60 text-sm mb-6">"{previewTask.title}"</p>

                  {/* XP Preview */}
                  <div className="glass-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-2xl mb-4">
                    <div className="text-4xl font-bold text-green-400 mb-1">
                      +{previewRewards.totalXP} XP
                    </div>
                    <div className="text-white/50 text-xs space-y-1">
                      <p>Base: {previewRewards.baseXP} XP</p>
                      {previewRewards.frogBonus > 0 && <p className="text-green-400">🐸 Frog bonus: +{previewRewards.frogBonus} XP</p>}
                      {previewRewards.streakBonus > 0 && <p className="text-orange-400">🔥 Streak bonus: +{previewRewards.streakBonus} XP</p>}
                    </div>
                  </div>

                  {/* Potential Achievements */}
                  {previewRewards.potentialAchievements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-white/50 text-xs mb-2">Potential achievements:</p>
                      <div className="flex justify-center gap-2">
                        {previewRewards.potentialAchievements.map((achievement, i) => (
                          <div key={i} className="glass-card bg-yellow-500/10 px-3 py-1 rounded-full text-sm">
                            <span className="mr-1">{achievement.emoji}</span>
                            <span className="text-yellow-400/80">{achievement.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extras */}
                  {previewRewards.extras.length > 0 && (
                    <div className="space-y-1 mb-6">
                      {previewRewards.extras.map((extra, i) => (
                        <p key={i} className="text-white/60 text-xs">✓ {extra}</p>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => startFromPreview(2)}
                      className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-500/30 hover:from-green-500/40 hover:to-emerald-500/40 transition-all"
                    >
                      <span className="mr-2">⚡</span>
                      Let's Go! (2 min start)
                    </button>

                    <button
                      onClick={() => startFromPreview(25)}
                      className="w-full glass-button py-3 rounded-xl text-white/70 hover:text-white transition-colors"
                    >
                      Full focus session (25 min)
                    </button>

                    <button
                      onClick={() => setShowDopaminePreview(false)}
                      className="w-full glass-button py-2 rounded-xl text-white/40 hover:text-white/60 transition-colors text-sm"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOCUS BUDDY: AI Chat Modal */}
        {showFocusBuddy && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFocusBuddy(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up max-h-[80vh] flex flex-col">
              <div className="glass-card p-4 flex flex-col h-full max-h-[70vh]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-xl">🤗</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Focus Buddy</h3>
                      <p className="text-white/50 text-xs">Here to help you stay on track</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFocusBuddy(false)}
                    className="glass-icon-sm w-8 h-8 flex items-center justify-center text-white/60"
                  >
                    ✕
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px]">
                  {focusBuddyMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.type === 'user'
                            ? 'bg-blue-500/30 text-white rounded-br-md'
                            : 'bg-white/10 text-white/90 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick replies */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {['I\'m stuck', 'I did it!', 'Feeling overwhelmed', 'Need a break'].map((reply) => (
                    <button
                      key={reply}
                      onClick={() => sendBuddyMessage(reply)}
                      className="glass-button px-3 py-1.5 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={focusBuddyInput}
                    onChange={(e) => setFocusBuddyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendBuddyMessage(focusBuddyInput)}
                    placeholder="Type a message..."
                    className="flex-1 glass-input px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm"
                  />
                  <button
                    onClick={() => sendBuddyMessage(focusBuddyInput)}
                    className="glass-button w-12 h-12 rounded-xl flex items-center justify-center text-xl hover:bg-white/10 transition-colors"
                  >
                    💬
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIME ANCHORING: Smart suggestion toast */}
        {showTimeAnchorSuggestion && timeAnchorMessage && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
            <div className={`glass-card p-4 ${
              timeAnchorMessage.type === 'peak' ? 'bg-green-500/10 border border-green-500/30' :
              timeAnchorMessage.type === 'rest' ? 'bg-blue-500/10 border border-blue-500/30' :
              'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {timeAnchorMessage.type === 'peak' ? '⚡' :
                   timeAnchorMessage.type === 'rest' ? '☕' : '🌱'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{timeAnchorMessage.message}</p>
                  <p className="text-white/40 text-xs mt-1">Based on your productivity patterns</p>
                </div>
                <button
                  onClick={() => setShowTimeAnchorSuggestion(false)}
                  className="text-white/40 hover:text-white/60"
                >
                  ✕
                </button>
              </div>

              {timeAnchorMessage.type === 'peak' && dailyFrog && (
                <button
                  onClick={() => {
                    setShowTimeAnchorSuggestion(false);
                    showRewardPreview(dailyFrog);
                  }}
                  className="w-full mt-3 glass-button py-2 rounded-xl text-green-400 text-sm font-medium bg-green-500/10 hover:bg-green-500/20 transition-colors"
                >
                  🐸 Show me the rewards for my frog!
                </button>
              )}
            </div>
          </div>
        )}

        {/* MOMENTUM MODE: Keep the flow going prompt */}
        {showMomentumPrompt && momentumSuggestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={declineMomentumSuggestion} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center overflow-hidden">
                {/* Momentum indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 animate-pulse" />

                <div className="text-5xl mb-4">🔥</div>
                <h2 className="text-xl font-bold text-white mb-2">You're On Fire!</h2>
                <p className="text-white/60 text-sm mb-2">
                  {momentumStreak} tasks completed in a row!
                </p>
                <p className="text-orange-400 text-sm mb-6">
                  Keep the momentum going?
                </p>

                {/* Suggested task */}
                <div className="glass-card bg-white/5 p-4 rounded-xl mb-6 text-left">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Similar task ready:</p>
                  <div className="flex items-center gap-3">
                    <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                      <span className="text-xl">{CATEGORIES[momentumSuggestion.category]?.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{momentumSuggestion.title}</p>
                      <p className="text-white/50 text-xs">
                        {momentumSuggestion.difficulty}⭐ • ~{momentumSuggestion.estimatedMinutes || 25} min
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={acceptMomentumSuggestion}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-orange-500/30 to-yellow-500/30 border-orange-500/30 hover:from-orange-500/40 hover:to-yellow-500/40 transition-all"
                  >
                    <span className="mr-2">⚡</span>
                    Keep Going! (5 min)
                  </button>

                  <button
                    onClick={declineMomentumSuggestion}
                    className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Take a break instead
                  </button>
                </div>

                <p className="text-white/40 text-xs mt-4">
                  💡 Capitalizing on hyperfocus can double your productivity!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DISTRACTION JOURNAL: Capture what pulled attention away */}
        {showDistractionCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">📓</div>
                  <h2 className="text-xl font-bold text-white mb-2">What Pulled You Away?</h2>
                  <p className="text-white/60 text-sm">
                    No judgment - tracking helps find patterns!
                  </p>
                </div>

                {/* Quick select categories */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {DISTRACTION_CATEGORIES.slice(0, 6).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => recordDistraction(cat.id)}
                      className="glass-button p-3 rounded-xl flex flex-col items-center gap-1 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-[10px] text-white/60 text-center leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* More options */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {DISTRACTION_CATEGORIES.slice(6).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => recordDistraction(cat.id)}
                      className="glass-button p-3 rounded-xl flex flex-col items-center gap-1 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-[10px] text-white/60 text-center leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Pattern insights if we have data */}
                {Object.keys(distractionPatterns).length > 0 && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-300 text-xs font-medium mb-1">💡 Your patterns:</p>
                    {getDistractionTips(distractionPatterns).slice(0, 1).map((tip, i) => (
                      <p key={i} className="text-white/60 text-xs">{tip}</p>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowDistractionCapture(false);
                      setFocusTask(null);
                      setScreen('tasks');
                    }}
                    className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TASK DNA: Smart suggestion modal */}
        {showDNASuggestion && dnaSuggestedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDNASuggestion(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center">
                <div className="text-5xl mb-4">🧬</div>
                <h2 className="text-xl font-bold text-white mb-2">Task DNA Match!</h2>
                <p className="text-white/60 text-sm mb-4">
                  Based on your patterns, you're most likely to finish this right now:
                </p>

                {/* Suggested task card */}
                <div className="glass-card bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-xl mb-4 text-left border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="glass-icon-sm w-12 h-12 flex items-center justify-center">
                      <span className="text-2xl">{CATEGORIES[dnaSuggestedTask.task.category]?.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{dnaSuggestedTask.task.title}</p>
                      <p className="text-white/50 text-xs">
                        {dnaSuggestedTask.task.difficulty}⭐ • {dnaSuggestedTask.score}% match
                      </p>
                    </div>
                  </div>
                </div>

                {dnaInsights && (
                  <p className="text-white/40 text-xs mb-4">
                    📊 Success rate: {Math.round(dnaInsights.overallSuccessRate * 100)}% ({taskDNA.completions.length} completions)
                  </p>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowDNASuggestion(false);
                      startFocusWithStartXP(dnaSuggestedTask.task, 5);
                    }}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                  >
                    <span className="mr-2">⚡</span>
                    Start This Task
                  </button>

                  <button
                    onClick={() => setShowDNASuggestion(false)}
                    className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FUTURE SELF: Leave a message modal */}
        {showFutureSelfCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFutureSelfCapture(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">💌</div>
                  <h2 className="text-xl font-bold text-white mb-2">Message to Future You</h2>
                  <p className="text-white/60 text-sm">
                    {FUTURE_SELF_PROMPTS[Math.floor(Math.random() * FUTURE_SELF_PROMPTS.length)]}
                  </p>
                </div>

                <textarea
                  value={futureSelfInput}
                  onChange={(e) => setFutureSelfInput(e.target.value)}
                  placeholder="Write something encouraging for when you're having a rough day..."
                  className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm resize-none h-24 mb-4"
                />

                <div className="space-y-3">
                  <button
                    onClick={() => saveFutureSelfMessage(
                      completedTaskData?.task?.title || 'Unknown task',
                      futureSelfInput,
                      energy || 3
                    )}
                    disabled={!futureSelfInput.trim()}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 transition-all disabled:opacity-50"
                  >
                    <span className="mr-2">💾</span>
                    Save for Future Me
                  </button>

                  <button
                    onClick={() => setShowFutureSelfCapture(false)}
                    className="w-full glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Skip this time
                  </button>
                </div>

                {futureSelfMessages.length > 0 && (
                  <p className="text-white/40 text-xs text-center mt-4">
                    💡 You have {futureSelfMessages.length} message{futureSelfMessages.length !== 1 ? 's' : ''} saved for future you!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FUTURE SELF: View past message modal */}
        {showFutureSelfMessage && currentFutureSelfMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFutureSelfMessage(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center">
                <div className="text-5xl mb-4">💌</div>
                <h2 className="text-xl font-bold text-white mb-2">A Message From Past You</h2>
                <p className="text-white/50 text-xs mb-4">
                  After completing "{currentFutureSelfMessage.taskTitle}"
                </p>

                <div className="glass-card bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-4">
                  <p className="text-white text-lg italic">"{currentFutureSelfMessage.message}"</p>
                </div>

                <p className="text-white/40 text-xs mb-6">
                  {new Date(currentFutureSelfMessage.timestamp).toLocaleDateString()}
                </p>

                <button
                  onClick={() => setShowFutureSelfMessage(false)}
                  className="w-full glass-button py-3 rounded-xl text-white/80 hover:text-white transition-colors"
                >
                  Thanks, past me! 💙
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMART BREAK REMINDER: Take a break modal */}
        {showBreakReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skipBreak} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center">
                <div className="text-5xl mb-4">☕</div>
                <h2 className="text-xl font-bold text-white mb-2">Time for a Break!</h2>
                <p className="text-white/60 text-sm mb-4">
                  You've been focusing for {totalFocusMinutes} minutes. Your brain needs a refresh!
                </p>

                {suggestedBreakActivity && (
                  <div className="glass-card bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-4">
                    <span className="text-3xl mb-2 block">{suggestedBreakActivity.emoji}</span>
                    <p className="text-white font-medium">{suggestedBreakActivity.text}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={takeBreak}
                    className="w-full glass-button py-3 rounded-xl text-green-400 font-medium bg-green-500/10 border border-green-500/20"
                  >
                    Take 5-minute break 🌟
                  </button>
                  <button
                    onClick={skipBreak}
                    className="w-full glass-button py-2 rounded-xl text-white/50 text-sm"
                  >
                    I'm in the zone, remind me later
                  </button>
                </div>

                <p className="text-white/30 text-xs mt-4">
                  Breaks taken today: {breaksTaken} 🏆
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PROCRASTINATION BUSTER: Help modal */}
        {showProcrastinationHelp && procrastinatedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProcrastinationHelp(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">🤔</div>
                  <h2 className="text-xl font-bold text-white">This task keeps coming back</h2>
                  <p className="text-white/60 text-sm mt-2">
                    "{procrastinatedTask.title}" - What's making it hard?
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  {PROCRASTINATION_REASONS.map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => handleProcrastinationReason(reason.id)}
                      className="w-full glass-card p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                    >
                      <span className="text-xl">{reason.emoji}</span>
                      <span className="text-white/80">{reason.text}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowProcrastinationHelp(false)}
                  className="w-full text-white/40 text-sm py-2"
                >
                  I'll figure it out myself
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUICK WIN STREAK: Celebration modal */}
        {showStreakCelebration && streakReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStreakCelebration(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-bounce-in">
              <div className="glass-card p-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20" />
                <div className="relative">
                  <div className="text-6xl mb-4 animate-bounce">{streakReward.emoji}</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{streakReward.title}</h2>
                  <p className="text-yellow-400 font-medium mb-2">
                    {quickWinStreak} task streak! 🔥
                  </p>
                  <p className="text-white/60 text-sm mb-4">
                    You unlocked: {streakReward.reward}
                  </p>

                  {getNextMilestone(quickWinStreak) && (
                    <div className="glass-card bg-white/5 p-3 rounded-xl mb-4">
                      <p className="text-white/50 text-xs">Next milestone:</p>
                      <p className="text-white/80">
                        {getNextMilestone(quickWinStreak).streak} tasks → {getNextMilestone(quickWinStreak).emoji} {getNextMilestone(quickWinStreak).title}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowStreakCelebration(false)}
                    className="w-full glass-button py-3 rounded-xl text-white font-medium bg-gradient-to-r from-yellow-500/30 to-orange-500/30"
                  >
                    Keep the momentum! 🚀
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOCUS RITUAL: Pre-focus checklist modal */}
        {showFocusRitual && ritualTaskPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎯</div>
                  <h2 className="text-xl font-bold text-white">Pre-Focus Ritual</h2>
                  <p className="text-white/60 text-sm mt-1">
                    Quick prep for "{ritualTaskPending.title}"
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  {focusRitualSteps.map(step => (
                    <button
                      key={step.id}
                      onClick={() => completeRitualStep(step.id)}
                      className={`w-full glass-card p-3 flex items-center gap-3 transition-all text-left ${
                        step.completed
                          ? 'bg-green-500/20 border-green-500/30'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{step.completed ? '✅' : step.emoji}</span>
                      <span className={step.completed ? 'text-green-400 line-through' : 'text-white/80'}>
                        {step.text}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={skipRitual}
                    className="flex-1 glass-button py-2 rounded-xl text-white/50 text-sm"
                  >
                    Skip ritual
                  </button>
                  <button
                    onClick={() => {
                      setShowFocusRitual(false);
                      startFocus(ritualTaskPending, ritualMinutesPending);
                      setRitualTaskPending(null);
                      setRitualMinutesPending(null);
                    }}
                    disabled={!focusRitualSteps.every(s => s.completed)}
                    className="flex-1 glass-button py-2 rounded-xl text-green-400 font-medium bg-green-500/10 disabled:opacity-40"
                  >
                    Start Focus 🚀
                  </button>
                </div>

                <p className="text-white/30 text-xs text-center mt-3">
                  Complete all steps or skip to begin
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACCOMPLISHMENT JOURNAL: Daily/Weekly summary modal */}
        {showAccomplishmentJournal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccomplishmentJournal(false)} />
            <div className="relative w-full max-w-md mx-4 animate-slide-up max-h-[80vh] overflow-hidden">
              <div className="glass-card p-6 overflow-y-auto max-h-[75vh]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📖</span> Your Wins
                  </h2>
                  <button
                    onClick={() => setShowAccomplishmentJournal(false)}
                    className="glass-icon-sm w-8 h-8 flex items-center justify-center text-white/60"
                  >
                    ✕
                  </button>
                </div>

                {/* View toggle */}
                <div className="flex gap-2 mb-4">
                  {['today', 'week', 'month'].map(view => (
                    <button
                      key={view}
                      onClick={() => setJournalView(view)}
                      className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                        journalView === view
                          ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {view === 'today' ? 'Today' : view === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>

                {/* Summary stats */}
                {(() => {
                  const summary = generateAccomplishmentSummary(completedTasks, journalView);
                  const message = getAccomplishmentMessage(summary);
                  return (
                    <>
                      <div className="glass-card bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-xl mb-4 text-center">
                        <span className="text-4xl mb-2 block">{message.emoji}</span>
                        <p className="text-white/80">{message.text}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="glass-card p-3 text-center">
                          <p className="text-2xl font-bold text-white">{summary.totalTasks}</p>
                          <p className="text-white/50 text-xs">Tasks Done</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                          <p className="text-2xl font-bold text-green-400">{summary.totalXP}</p>
                          <p className="text-white/50 text-xs">XP Earned</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                          <p className="text-2xl font-bold text-yellow-400">{summary.frogsEaten} 🐸</p>
                          <p className="text-white/50 text-xs">Frogs Eaten</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                          <p className="text-2xl font-bold text-blue-400">{summary.totalMinutes}</p>
                          <p className="text-white/50 text-xs">Focus Mins</p>
                        </div>
                      </div>

                      {/* Task breakdown */}
                      {summary.totalTasks > 0 && (
                        <div className="space-y-2">
                          <p className="text-white/60 text-xs uppercase tracking-wider">Completed Tasks</p>
                          {summary.tasks.slice(0, 10).map((task, i) => (
                            <div key={i} className="glass-card p-2 flex items-center gap-2">
                              <span>{task.frog ? '🐸' : '✅'}</span>
                              <span className="text-white/80 text-sm flex-1 truncate">{task.title}</span>
                              <span className="text-green-400 text-xs">+{task.earnedXP || 0} XP</span>
                            </div>
                          ))}
                          {summary.tasks.length > 10 && (
                            <p className="text-white/40 text-xs text-center">
                              + {summary.tasks.length - 10} more tasks
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TASK PARKING LOT: View parked tasks modal */}
        {showParkingLot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowParkingLot(false)} />
            <div className="relative w-full max-w-md mx-4 animate-slide-up max-h-[80vh] overflow-hidden">
              <div className="glass-card p-6 overflow-y-auto max-h-[75vh]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🅿️</span> Parking Lot
                  </h2>
                  <button
                    onClick={() => setShowParkingLot(false)}
                    className="glass-icon-sm w-8 h-8 flex items-center justify-center text-white/60"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-white/60 text-sm mb-4">
                  Tasks resting here guilt-free. Review when ready.
                </p>

                {parkedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🏖️</span>
                    <p className="text-white/60">No parked tasks</p>
                    <p className="text-white/40 text-sm">Tasks you skip repeatedly can be parked here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parkedTasks.map(task => {
                      const reason = PARK_REASONS.find(r => r.id === task.reason);
                      const daysParked = Math.floor((Date.now() - new Date(task.parkedAt).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={task.id} className="glass-card p-3">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{reason?.emoji || '📝'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{task.title}</p>
                              <p className="text-white/40 text-xs">
                                {reason?.text || 'Other reason'} • {daysParked === 0 ? 'Today' : `${daysParked}d ago`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => unparkTask(task)}
                              className="flex-1 glass-button py-2 rounded-lg text-green-400 text-sm bg-green-500/10"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => deleteParkedTask(task.id)}
                              className="glass-button px-3 py-2 rounded-lg text-red-400/70 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TASK PARKING LOT: Park task confirmation modal */}
        {showParkTaskModal && taskToPark && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowParkTaskModal(false)} />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🅿️</div>
                  <h2 className="text-xl font-bold text-white">Park This Task?</h2>
                  <p className="text-white/60 text-sm mt-1">
                    "{taskToPark.title}"
                  </p>
                </div>

                <p className="text-white/50 text-sm mb-3">Why are you parking this?</p>
                <div className="space-y-2 mb-4">
                  {PARK_REASONS.map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => setParkReason(reason.id)}
                      className={`w-full glass-card p-3 flex items-center gap-3 text-left transition-all ${
                        parkReason === reason.id
                          ? 'bg-blue-500/20 border-blue-500/30'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{reason.emoji}</span>
                      <span className="text-white/80">{reason.text}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowParkTaskModal(false)}
                    className="flex-1 glass-button py-2 rounded-xl text-white/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => parkTask(taskToPark, parkReason)}
                    disabled={!parkReason}
                    className="flex-1 glass-button py-2 rounded-xl text-blue-400 font-medium bg-blue-500/10 disabled:opacity-40"
                  >
                    Park It 🅿️
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HYPERFOCUS GUARD: Take a break warning */}
        {showHyperfocusWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm mx-4 animate-slide-up">
              <div className="glass-card p-6 text-center border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10">
                {(() => {
                  const minutesElapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 60000) : 0;
                  const message = getHyperfocusMessage(minutesElapsed);
                  return (
                    <>
                      <div className="text-5xl mb-4">{message.emoji}</div>
                      <h2 className="text-xl font-bold text-white mb-2">Hyperfocus Alert!</h2>
                      <p className="text-white/80 mb-4">{message.text}</p>
                      <p className="text-orange-400 text-sm mb-6">
                        You've been focused for {Math.floor(minutesElapsed / 60)}h {minutesElapsed % 60}m
                      </p>
                    </>
                  );
                })()}

                <div className="space-y-3">
                  <button
                    onClick={takeHyperfocusBreak}
                    className="w-full glass-button py-3 rounded-xl text-green-400 font-medium bg-green-500/10 border border-green-500/30"
                  >
                    Take a Real Break 🌴
                  </button>
                  <button
                    onClick={extendHyperfocusSession}
                    className="w-full glass-button py-2 rounded-xl text-white/50 text-sm"
                  >
                    30 more minutes, I'm in flow
                  </button>
                </div>

                <p className="text-white/30 text-xs mt-4">
                  Extensions: {hyperfocusExtensions}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Unlock Popup */}
        <AchievementPopup />

        {/* ADHD: Welcome Back Modal - Distraction Recovery */}
        {showWelcomeBack && taskInProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWelcomeBack(false)} />
            <div className={`relative w-full max-w-sm mx-4 ${!settings.lowStimMode ? 'animate-bounce-in' : 'animate-slide-up'}`}>
              <div className="glass-card p-6 text-center">
                {/* Friendly welcome */}
                <div className={`text-6xl mb-4 ${!settings.lowStimMode ? 'animate-wave' : ''}`}>
                  👋
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome back!
                </h2>
                <p className="text-white/60 mb-6">
                  {settings.gentleLanguage
                    ? "No worries - distractions happen! Ready to jump back in?"
                    : "You were working on something. Want to continue?"}
                </p>

                {/* Task reminder */}
                <div className="glass-card p-4 mb-6 text-left bg-white/5">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">You were working on:</p>
                  <div className="flex items-center gap-3">
                    <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                      <span className="text-xl">{CATEGORIES[taskInProgress.category]?.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{taskInProgress.title}</p>
                      {taskInProgress.frog && <span className="text-sm">🐸 Your frog!</span>}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowWelcomeBack(false);
                      startFocusWithStartXP(taskInProgress, 2);  // 2-min micro-start to ease back in
                    }}
                    className="w-full glass-button py-4 rounded-2xl text-white font-semibold bg-green-500/20 border-green-500/30 hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>⚡</span>
                    <span>Jump back in (2 min)</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowWelcomeBack(false);
                        setTaskInProgress(null);
                        Storage.set('taskInProgress', null);
                      }}
                      className="flex-1 glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      Different task
                    </button>
                    <button
                      onClick={() => {
                        setShowWelcomeBack(false);
                        setTaskInProgress(null);
                        Storage.set('taskInProgress', null);
                      }}
                      className="flex-1 glass-button py-3 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      Just browsing
                    </button>
                  </div>
                </div>

                {/* Encouraging message */}
                <p className="text-white/40 text-xs mt-4">
                  {settings.gentleLanguage
                    ? "Every return is a win! You're doing great. 💪"
                    : "Ready when you are."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DAILY INTENTION PICKER MODAL */}
        {showIntentionPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIntentionPicker(false)} />
            <div className="relative w-full max-w-md mx-4 animate-slide-up max-h-[80vh] overflow-auto">
              <div className="glass-card p-6">
                <div className="text-4xl text-center mb-4">⭐</div>
                <h2 className="text-xl font-bold text-white text-center mb-2">Set Your North Star</h2>
                <p className="text-white/60 text-center text-sm mb-6">
                  {INTENTION_PROMPTS[Math.floor(Math.random() * INTENTION_PROMPTS.length)]}
                </p>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {tasks.map(task => {
                    const isCurrentIntention = dailyIntention === task.id;
                    const category = CATEGORIES[task.category] || CATEGORIES.personal;
                    return (
                      <button
                        key={task.id}
                        onClick={() => setTodaysIntention(task.id)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          isCurrentIntention
                            ? 'bg-yellow-500/20 border-2 border-yellow-500/50'
                            : 'glass-card hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isCurrentIntention ? 'text-yellow-400' : 'text-white'}`}>
                              {task.title}
                            </p>
                            {task.frog && <span className="text-xs text-green-400">🐸 Your frog</span>}
                          </div>
                          {isCurrentIntention && <span className="text-xl">⭐</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {tasks.length === 0 && (
                  <p className="text-white/40 text-center py-8">
                    No tasks yet! Add some tasks first.
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  {dailyIntention && (
                    <button
                      onClick={() => {
                        clearDailyIntention();
                        setShowIntentionPicker(false);
                      }}
                      className="flex-1 glass-button py-3 rounded-xl text-white/50"
                    >
                      Clear Intention
                    </button>
                  )}
                  <button
                    onClick={() => setShowIntentionPicker(false)}
                    className="flex-1 glass-button py-3 rounded-xl text-white/70"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MICRO-WIN CELEBRATION POPUP */}
        {showMicroWin && microWinMessage && (
          <div className="fixed inset-x-0 top-20 z-50 flex justify-center pointer-events-none">
            <div className="animate-bounce-in">
              <div className="glass-card px-6 py-3 bg-gradient-to-r from-green-500/20 to-yellow-500/20 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{microWinMessage.emoji}</span>
                  <span className="text-white font-medium">{microWinMessage.text}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </SwipeableTabView>
    </PageBackground>
  );
}
