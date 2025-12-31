'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageBackground } from '@/components/BackgroundContext';
import BackgroundSelector from '@/components/BackgroundSelector';
import { useAchievements, ACHIEVEMENTS } from '@/components/AchievementsContext';

const ACHIEVEMENT_CATEGORIES = {
  tasks: { name: 'Tasks', emoji: '✅', description: 'Complete tasks to unlock' },
  frogs: { name: 'Frogs', emoji: '🐸', description: 'Eat your frogs first' },
  streaks: { name: 'Streaks', emoji: '🔥', description: 'Build consistency' },
  time: { name: 'Time Saved', emoji: '⏰', description: 'Beat your estimates' },
  accuracy: { name: 'Accuracy', emoji: '🎯', description: 'Estimate like a pro' },
  xp: { name: 'XP & Levels', emoji: '⭐', description: 'Grow your XP' },
  subtasks: { name: 'Subtasks', emoji: '✂️', description: 'Break it down' },
  special: { name: 'Special', emoji: '🌟', description: 'Unique achievements' }
};

export default function AchievementsPage() {
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { unlockedAchievements, stats, getProgress } = useAchievements();
  
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = unlockedAchievements.length;
  const progressPercent = Math.round((unlockedCount / totalAchievements) * 100);
  
  const filteredAchievements = Object.values(ACHIEVEMENTS).filter(a => 
    selectedCategory === 'all' || a.category === selectedCategory
  );

  return (
    <PageBackground page="stats">
      <div className="min-h-screen pb-24">
        {/* Header */}
        <div className="glass-dark sticky top-0 z-30 safe-area-top">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="glass-icon-sm w-10 h-10 flex items-center justify-center">
              ←
            </Link>
            <h1 className="text-white font-bold text-lg">Achievements</h1>
            <button 
              onClick={() => setShowBackgroundSelector(true)}
              className="glass-icon-sm w-10 h-10 flex items-center justify-center"
            >
              🎨
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Overall Progress */}
          <div className="glass-card p-6 text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-white text-2xl font-bold">{unlockedCount} / {totalAchievements}</h2>
            <p className="text-white/60 mb-4">Achievements Unlocked</p>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-yellow-400 text-sm mt-2">{progressPercent}% Complete</p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-white/20 text-white' 
                  : 'glass-button text-white/60'
              }`}
            >
              All
            </button>
            {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  selectedCategory === key 
                    ? 'bg-white/20 text-white' 
                    : 'glass-button text-white/60'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Achievement Grid by Category */}
          {(selectedCategory === 'all' ? Object.keys(ACHIEVEMENT_CATEGORIES) : [selectedCategory]).map(catKey => {
            const catInfo = ACHIEVEMENT_CATEGORIES[catKey];
            const catAchievements = filteredAchievements.filter(a => a.category === catKey);
            if (catAchievements.length === 0) return null;
            
            const catUnlocked = catAchievements.filter(a => unlockedAchievements.includes(a.id)).length;
            
            return (
              <div key={catKey} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="glass-icon w-12 h-12 flex items-center justify-center text-2xl">
                    {catInfo.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{catInfo.name}</h3>
                    <p className="text-white/40 text-sm">{catInfo.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{catUnlocked}/{catAchievements.length}</p>
                    <p className="text-white/40 text-xs">Unlocked</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {catAchievements.map(achievement => {
                    const isUnlocked = unlockedAchievements.includes(achievement.id);
                    const progress = getProgress(achievement.id);
                    const currentValue = stats[achievement.field] || 0;
                    
                    return (
                      <div 
                        key={achievement.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isUnlocked 
                            ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-40'}`}>
                            {achievement.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
                              {achievement.name}
                            </p>
                            <p className={`text-xs mt-0.5 ${isUnlocked ? 'text-white/60' : 'text-white/30'}`}>
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                        
                        {!isUnlocked && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/40">{currentValue} / {achievement.requirement}</span>
                              <span className="text-white/40">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-500/50 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {isUnlocked && (
                          <div className="mt-2 flex items-center gap-1">
                            <span className="text-green-400 text-xs">✓ Unlocked</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Stats Summary */}
          <div className="glass-card p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>📊</span> Your Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.tasksCompleted || 0}</p>
                <p className="text-white/40 text-xs">Tasks Done</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.frogsEaten || 0}</p>
                <p className="text-white/40 text-xs">Frogs Eaten</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.totalTimeSaved || 0}m</p>
                <p className="text-white/40 text-xs">Time Saved</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.subtasksCompleted || 0}</p>
                <p className="text-white/40 text-xs">Subtasks</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.beatEstimates || 0}</p>
                <p className="text-white/40 text-xs">Beat Estimates</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.longestStreak || 0}</p>
                <p className="text-white/40 text-xs">Best Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass-dark safe-area-bottom z-40">
          <div className="flex justify-around py-3">
            <Link href="/" className="flex flex-col items-center text-white/40">
              <span className="text-xl mb-1">🏠</span>
              <span className="text-xs">Home</span>
            </Link>
            <Link href="/stats" className="flex flex-col items-center text-white/40">
              <span className="text-xl mb-1">📊</span>
              <span className="text-xs">Stats</span>
            </Link>
            <div className="flex flex-col items-center text-yellow-400">
              <span className="text-xl mb-1">🏆</span>
              <span className="text-xs">Badges</span>
            </div>
          </div>
        </div>

        <BackgroundSelector
          isOpen={showBackgroundSelector}
          onClose={() => setShowBackgroundSelector(false)}
          currentPage="stats"
        />
      </div>
    </PageBackground>
  );
}
