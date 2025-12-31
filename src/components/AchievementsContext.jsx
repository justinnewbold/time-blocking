'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// Achievement definitions
export const ACHIEVEMENTS = {
  // Task Milestones
  first_task: {
    id: 'first_task',
    name: 'First Steps',
    description: 'Complete your first task',
    emoji: '👶',
    category: 'tasks',
    requirement: 1,
    field: 'tasksCompleted'
  },
  task_10: {
    id: 'task_10',
    name: 'Getting Started',
    description: 'Complete 10 tasks',
    emoji: '🌱',
    category: 'tasks',
    requirement: 10,
    field: 'tasksCompleted'
  },
  task_50: {
    id: 'task_50',
    name: 'Momentum Builder',
    description: 'Complete 50 tasks',
    emoji: '🚀',
    category: 'tasks',
    requirement: 50,
    field: 'tasksCompleted'
  },
  task_100: {
    id: 'task_100',
    name: 'Centurion',
    description: 'Complete 100 tasks',
    emoji: '💯',
    category: 'tasks',
    requirement: 100,
    field: 'tasksCompleted'
  },
  task_500: {
    id: 'task_500',
    name: 'Task Master',
    description: 'Complete 500 tasks',
    emoji: '👑',
    category: 'tasks',
    requirement: 500,
    field: 'tasksCompleted'
  },
  
  // Frog Milestones
  first_frog: {
    id: 'first_frog',
    name: 'Frog Eater',
    description: 'Eat your first frog',
    emoji: '🐸',
    category: 'frogs',
    requirement: 1,
    field: 'frogsEaten'
  },
  frog_10: {
    id: 'frog_10',
    name: 'Frog Hunter',
    description: 'Eat 10 frogs',
    emoji: '🎯',
    category: 'frogs',
    requirement: 10,
    field: 'frogsEaten'
  },
  frog_50: {
    id: 'frog_50',
    name: 'Frog Feast',
    description: 'Eat 50 frogs',
    emoji: '🍽️',
    category: 'frogs',
    requirement: 50,
    field: 'frogsEaten'
  },
  frog_100: {
    id: 'frog_100',
    name: 'Frog Legend',
    description: 'Eat 100 frogs',
    emoji: '🏆',
    category: 'frogs',
    requirement: 100,
    field: 'frogsEaten'
  },
  
  // Streak Milestones
  streak_3: {
    id: 'streak_3',
    name: 'Hat Trick',
    description: '3 day streak',
    emoji: '🔥',
    category: 'streaks',
    requirement: 3,
    field: 'longestStreak'
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7 day streak',
    emoji: '📅',
    category: 'streaks',
    requirement: 7,
    field: 'longestStreak'
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30 day streak',
    emoji: '🌙',
    category: 'streaks',
    requirement: 30,
    field: 'longestStreak'
  },
  streak_100: {
    id: 'streak_100',
    name: 'Unstoppable',
    description: '100 day streak',
    emoji: '⚡',
    category: 'streaks',
    requirement: 100,
    field: 'longestStreak'
  },
  
  // Time Saved Milestones (in minutes)
  time_saved_30: {
    id: 'time_saved_30',
    name: 'Time Saver',
    description: 'Save 30 minutes total',
    emoji: '⏰',
    category: 'time',
    requirement: 30,
    field: 'totalTimeSaved'
  },
  time_saved_120: {
    id: 'time_saved_120',
    name: 'Hour Hero',
    description: 'Save 2 hours total',
    emoji: '⌛',
    category: 'time',
    requirement: 120,
    field: 'totalTimeSaved'
  },
  time_saved_480: {
    id: 'time_saved_480',
    name: 'Time Lord',
    description: 'Save 8 hours total',
    emoji: '🕐',
    category: 'time',
    requirement: 480,
    field: 'totalTimeSaved'
  },
  time_saved_1440: {
    id: 'time_saved_1440',
    name: 'Day Maker',
    description: 'Save 24 hours total',
    emoji: '🌟',
    category: 'time',
    requirement: 1440,
    field: 'totalTimeSaved'
  },
  
  // Estimation Accuracy
  accurate_5: {
    id: 'accurate_5',
    name: 'Good Guesser',
    description: '5 tasks within estimate',
    emoji: '🎯',
    category: 'accuracy',
    requirement: 5,
    field: 'accurateEstimates'
  },
  accurate_25: {
    id: 'accurate_25',
    name: 'Time Prophet',
    description: '25 tasks within estimate',
    emoji: '🔮',
    category: 'accuracy',
    requirement: 25,
    field: 'accurateEstimates'
  },
  under_estimate_10: {
    id: 'under_estimate_10',
    name: 'Speed Demon',
    description: 'Beat estimate 10 times',
    emoji: '💨',
    category: 'accuracy',
    requirement: 10,
    field: 'beatEstimates'
  },
  
  // XP/Level Milestones
  level_5: {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    emoji: '⭐',
    category: 'xp',
    requirement: 5,
    field: 'level'
  },
  level_10: {
    id: 'level_10',
    name: 'Double Digits',
    description: 'Reach level 10',
    emoji: '🌟',
    category: 'xp',
    requirement: 10,
    field: 'level'
  },
  level_25: {
    id: 'level_25',
    name: 'Quarter Century',
    description: 'Reach level 25',
    emoji: '💫',
    category: 'xp',
    requirement: 25,
    field: 'level'
  },
  xp_1000: {
    id: 'xp_1000',
    name: 'XP Hunter',
    description: 'Earn 1,000 XP',
    emoji: '💎',
    category: 'xp',
    requirement: 1000,
    field: 'totalXP'
  },
  xp_5000: {
    id: 'xp_5000',
    name: 'XP Hoarder',
    description: 'Earn 5,000 XP',
    emoji: '💰',
    category: 'xp',
    requirement: 5000,
    field: 'totalXP'
  },
  
  // Subtask Milestones
  subtask_25: {
    id: 'subtask_25',
    name: 'Chunk Master',
    description: 'Complete 25 subtasks',
    emoji: '✂️',
    category: 'subtasks',
    requirement: 25,
    field: 'subtasksCompleted'
  },
  subtask_100: {
    id: 'subtask_100',
    name: 'Detail Oriented',
    description: 'Complete 100 subtasks',
    emoji: '🔍',
    category: 'subtasks',
    requirement: 100,
    field: 'subtasksCompleted'
  },
  
  // Special Achievements
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a task before 7am',
    emoji: '🌅',
    category: 'special',
    requirement: 1,
    field: 'earlyTasks'
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a task after 11pm',
    emoji: '🦉',
    category: 'special',
    requirement: 1,
    field: 'lateTasks'
  },
  weekend_warrior: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete 10 tasks on weekends',
    emoji: '🎉',
    category: 'special',
    requirement: 10,
    field: 'weekendTasks'
  }
};

const ACHIEVEMENT_CATEGORIES = {
  tasks: { name: 'Tasks', emoji: '✅' },
  frogs: { name: 'Frogs', emoji: '🐸' },
  streaks: { name: 'Streaks', emoji: '🔥' },
  time: { name: 'Time Saved', emoji: '⏰' },
  accuracy: { name: 'Accuracy', emoji: '🎯' },
  xp: { name: 'XP & Levels', emoji: '⭐' },
  subtasks: { name: 'Subtasks', emoji: '✂️' },
  special: { name: 'Special', emoji: '🌟' }
};

const AchievementsContext = createContext();

export function AchievementsProvider({ children }) {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    frogsEaten: 0,
    longestStreak: 0,
    currentStreak: 0,
    totalTimeSaved: 0,
    accurateEstimates: 0,
    beatEstimates: 0,
    level: 1,
    totalXP: 0,
    subtasksCompleted: 0,
    earlyTasks: 0,
    lateTasks: 0,
    weekendTasks: 0
  });
  const [newAchievement, setNewAchievement] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedAchievements = localStorage.getItem('frog_achievements');
      if (savedAchievements) {
        setUnlockedAchievements(JSON.parse(savedAchievements));
      }
      const savedStats = localStorage.getItem('frog_achievement_stats');
      if (savedStats) {
        setStats(prev => ({ ...prev, ...JSON.parse(savedStats) }));
      }
    } catch (e) {
      console.error('Error loading achievements:', e);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('frog_achievements', JSON.stringify(unlockedAchievements));
      localStorage.setItem('frog_achievement_stats', JSON.stringify(stats));
    }
  }, [unlockedAchievements, stats, loaded]);

  // Check for new achievements
  const checkAchievements = (newStats) => {
    const merged = { ...stats, ...newStats };
    setStats(merged);
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id)) {
        const value = merged[achievement.field] || 0;
        if (value >= achievement.requirement) {
          // Unlock achievement!
          setUnlockedAchievements(prev => [...prev, achievement.id]);
          setNewAchievement(achievement);
          
          // Play celebration sound
          playAchievementSound();
          
          // Auto-hide after 3 seconds
          setTimeout(() => setNewAchievement(null), 3000);
        }
      }
    });
  };

  const playAchievementSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Play a triumphant sound
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
      });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    } catch (e) {}
  };

  const getProgress = (achievementId) => {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return 0;
    const value = stats[achievement.field] || 0;
    return Math.min(100, (value / achievement.requirement) * 100);
  };

  return (
    <AchievementsContext.Provider value={{
      ACHIEVEMENTS,
      ACHIEVEMENT_CATEGORIES,
      unlockedAchievements,
      stats,
      checkAchievements,
      newAchievement,
      setNewAchievement,
      getProgress
    }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return context;
}
