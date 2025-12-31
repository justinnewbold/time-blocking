'use client';
import { useAchievements, ACHIEVEMENTS } from './AchievementsContext';

// Achievement unlock popup
export function AchievementPopup() {
  const { newAchievement, setNewAchievement } = useAchievements();
  
  if (!newAchievement) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="glass-card p-6 text-center animate-bounce-in pointer-events-auto max-w-xs">
        <div className="text-6xl mb-3 animate-float">{newAchievement.emoji}</div>
        <p className="text-yellow-400 text-sm font-semibold uppercase tracking-wider mb-1">
          Achievement Unlocked!
        </p>
        <p className="text-white text-xl font-bold mb-2">{newAchievement.name}</p>
        <p className="text-white/60 text-sm">{newAchievement.description}</p>
        <button
          onClick={() => setNewAchievement(null)}
          className="mt-4 glass-button px-6 py-2 rounded-xl text-white/80 text-sm"
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}

// Single badge display
export function AchievementBadge({ achievementId, size = 'md', showProgress = false }) {
  const { unlockedAchievements, getProgress } = useAchievements();
  const achievement = ACHIEVEMENTS[achievementId];
  
  if (!achievement) return null;
  
  const isUnlocked = unlockedAchievements.includes(achievementId);
  const progress = getProgress(achievementId);
  
  const sizes = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  };
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`${sizes[size]} rounded-2xl flex items-center justify-center relative ${
          isUnlocked 
            ? 'glass-icon bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 border-yellow-500/40' 
            : 'glass-icon opacity-40 grayscale'
        }`}
      >
        <span className={isUnlocked ? '' : 'opacity-50'}>{achievement.emoji}</span>
        {!isUnlocked && showProgress && progress > 0 && (
          <div className="absolute -bottom-1 left-1 right-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {size !== 'sm' && (
        <p className={`text-xs mt-1 text-center ${isUnlocked ? 'text-white/80' : 'text-white/40'}`}>
          {achievement.name}
        </p>
      )}
    </div>
  );
}

// Full achievements grid view
export function AchievementsGrid({ category = null, showLocked = true }) {
  const { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, unlockedAchievements, getProgress } = useAchievements();
  
  const achievements = Object.values(ACHIEVEMENTS).filter(a => 
    (!category || a.category === category) &&
    (showLocked || unlockedAchievements.includes(a.id))
  );
  
  const categories = category ? [category] : Object.keys(ACHIEVEMENT_CATEGORIES);
  
  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const catAchievements = achievements.filter(a => a.category === cat);
        if (catAchievements.length === 0) return null;
        
        const catInfo = ACHIEVEMENT_CATEGORIES[cat];
        const unlockedCount = catAchievements.filter(a => unlockedAchievements.includes(a.id)).length;
        
        return (
          <div key={cat} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{catInfo.emoji}</span>
              <h3 className="text-white font-semibold">{catInfo.name}</h3>
              <span className="text-white/40 text-sm ml-auto">
                {unlockedCount}/{catAchievements.length}
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {catAchievements.map(achievement => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                const progress = getProgress(achievement.id);
                
                return (
                  <div key={achievement.id} className="flex flex-col items-center">
                    <div 
                      className={`w-14 h-14 rounded-xl flex items-center justify-center relative ${
                        isUnlocked 
                          ? 'glass-icon bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 border-yellow-500/40' 
                          : 'glass-icon opacity-50'
                      }`}
                    >
                      <span className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.emoji}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-1 text-center leading-tight ${
                      isUnlocked ? 'text-white/80' : 'text-white/40'
                    }`}>
                      {achievement.name}
                    </p>
                    {!isUnlocked && progress > 0 && (
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500/50 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AchievementBadge;
