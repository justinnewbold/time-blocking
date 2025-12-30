// Category definitions with colors and emojis
export const categories = {
  'Patty Shack': { color: '#f97316', bg: '#fff7ed', emoji: '🍔' },
  'Admin': { color: '#64748b', bg: '#f8fafc', emoji: '📋' },
  'Family': { color: '#ec4899', bg: '#fdf2f8', emoji: '👨‍👩‍👧' },
  'Music': { color: '#06b6d4', bg: '#ecfeff', emoji: '🎸' },
  'Home': { color: '#22c55e', bg: '#f0fdf4', emoji: '🏠' },
  'Personal': { color: '#8b5cf6', bg: '#f5f3ff', emoji: '✨' },
  'Development': { color: '#3b82f6', bg: '#eff6ff', emoji: '💻' },
};

// Apple Reminders list IDs
export const reminderLists = {
  'Reminders': 'AF8D31D8-06C5-4115-AA24-081D9D93E157',
  'Layton Patty Shack': 'F08EB204-16FA-4C5A-8018-7AC5BB8E8AE0',
  'Taylorsville Patty Shack': '2FB1418C-28DC-407F-9164-D32FBBC33512',
  'To Do (Home)': '57C9E43B-15B7-472A-B56F-570D71735EC9',
  'Grocery List': '4D3A49FA-F3E5-4D45-A28D-050BDCCD2C1F',
  'Family': '9E7DF8AA-630A-4BAF-800C-C991A26025B3',
};

// Energy level definitions
export const energyLevels = [
  { level: 1, emoji: '😴', label: 'Survival Mode', desc: 'Just the essentials today. Be gentle with yourself.', maxDifficulty: 2 },
  { level: 2, emoji: '🥱', label: 'Low Energy', desc: 'Take it easy. Small wins count.', maxDifficulty: 2 },
  { level: 3, emoji: '😐', label: 'Moderate', desc: 'Steady day. You got this.', maxDifficulty: 4 },
  { level: 4, emoji: '😊', label: 'Good Energy', desc: 'Solid day ahead. Tackle something meaningful.', maxDifficulty: 5 },
  { level: 5, emoji: '⚡', label: 'High Energy', desc: 'Great day for hard stuff! Bring on the frogs!', maxDifficulty: 5 },
];

// Timer presets in minutes
export const timerPresets = [5, 10, 15, 25, 45, 60];

// XP calculation
export const calculateXP = (difficulty, isFrog = false) => {
  const baseXP = difficulty * 10;
  return isFrog ? baseXP * 2 : baseXP;
};

// XP needed for level
export const xpForLevel = (level) => level * 200;

// Get energy info by level
export const getEnergyInfo = (level) => energyLevels[level - 1] || energyLevels[2];

// Format time from seconds to MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get due date display info
export const getDueDateDisplay = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: 'Overdue', color: '#ef4444' };
  if (diffDays === 0) return { text: 'Today', color: '#f97316' };
  if (diffDays === 1) return { text: 'Tomorrow', color: '#eab308' };
  if (diffDays <= 7) return { text: `${diffDays} days`, color: '#22c55e' };
  return { text: due.toLocaleDateString(), color: '#64748b' };
};