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
    gentleLanguage: true  // ADHD: Use encouraging language instead of pressure
  });

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
          setStreak(progress.current_streak || 0);
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
        
        // Load thought dump (today only)
        const savedThoughts = Storage.get('thoughtDump', []);
        const todayThoughts = savedThoughts.filter(t => new Date(t.timestamp).toDateString() === today);
        setThoughtDump(todayThoughts);

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

    // Start normal focus
    startFocus(task, minutes);
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
  }, [timerRunning, timerMinutes, timerSeconds, focusTask]);

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
  };

  const handleCompleteTask = useCallback(async (task) => {
    const baseXP = task.difficulty * 10;
    const frogBonus = task.frog ? 20 : 0;
    const earnedXP = baseXP + frogBonus;
    
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
    
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setCompletedTasks(prev => [...prev, { ...task, completed: true, completedAt: new Date().toISOString(), timeData, earnedXP }]);
    
    if (task.frog) {
      setFrogCompleted(true);
      setDailyFrog(null);
    }
    
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
    
    // Trigger confetti celebration
    setConfettiFrog(task.frog);
    setShowConfetti(true);
    
    setFocusTask(null);
    setTimerStartTime(null);
    setScreen('tasks');
    
    Storage.set('xp', newXP);
    Storage.set('level', Math.floor(newXP / 100) + 1);
  }, [xp, completedTasks.length, userId, timerStartTime, checkAchievements]);

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
    setTimerRunning(false);
    setFocusTask(null);
    setScreen('tasks');
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

  // Sort tasks - frog first, then by difficulty
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Frog always first
    if (a.frog && !b.frog) return -1;
    if (!a.frog && b.frog) return 1;
    return b.difficulty - a.difficulty;
  });

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
                  <p className="text-2xl font-bold text-white">{streak}</p>
                  <p className="text-white/40 text-xs">Day Streak</p>
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
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="glass-icon-sm w-10 h-10 flex items-center justify-center">
                <span className="text-xl">{CATEGORIES[focusTask.category]?.emoji}</span>
              </div>
              <p className="text-white font-medium">{focusTask.title}</p>
              {focusTask.frog && <span className="text-xl">🐸</span>}
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

              {/* Right: Level + XP only */}
              <div className="glass-card px-4 py-2">
                <p className="text-white font-bold">Lv.{level}</p>
                <p className="text-green-400 text-xs text-right">{xp} XP</p>
              </div>
            </div>
          </div>
        </div>

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

                    {/* Quick explanation */}
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-purple-300 text-xs">
                        <strong>Pick For Me 🎲</strong> button appears when you have tasks - tap it to overcome decision paralysis!
                        The <strong>2m timer</strong> helps you just get started.
                      </p>
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
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="What needs to be done?"
                      className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-white/30"
                      autoFocus
                    />
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
      </div>
      </SwipeableTabView>
    </PageBackground>
  );
}
