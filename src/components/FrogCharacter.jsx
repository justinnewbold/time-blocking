'use client';

// Frog evolution stages based on level
const FROG_STAGES = [
  { 
    minLevel: 1, 
    name: 'Tadpole', 
    emoji: '🥚',
    description: 'Just hatched! Keep going!',
    unlockText: 'Starting your journey'
  },
  { 
    minLevel: 3, 
    name: 'Baby Tadpole', 
    emoji: '🫧',
    description: 'Growing stronger every day',
    unlockText: 'Reach level 3'
  },
  { 
    minLevel: 5, 
    name: 'Tadpole', 
    emoji: '〰️',
    description: 'Swimming through tasks!',
    unlockText: 'Reach level 5'
  },
  { 
    minLevel: 10, 
    name: 'Froglet', 
    emoji: '🐸',
    description: 'Legs are growing!',
    unlockText: 'Reach level 10'
  },
  { 
    minLevel: 15, 
    name: 'Young Frog', 
    emoji: '🐸',
    color: '#4ade80',
    description: 'A proper frog now!',
    unlockText: 'Reach level 15'
  },
  { 
    minLevel: 25, 
    name: 'Wise Frog', 
    emoji: '🐸',
    color: '#22c55e',
    crown: true,
    description: 'Experienced and wise',
    unlockText: 'Reach level 25'
  },
  { 
    minLevel: 40, 
    name: 'Elder Frog', 
    emoji: '🐸',
    color: '#16a34a',
    crown: true,
    sparkle: true,
    description: 'A legendary productivity master!',
    unlockText: 'Reach level 40'
  },
  { 
    minLevel: 60, 
    name: 'Frog King', 
    emoji: '🐸',
    color: '#fbbf24',
    crown: true,
    sparkle: true,
    glow: true,
    description: 'The ultimate Frog King!',
    unlockText: 'Reach level 60'
  }
];

export function getFrogStage(level) {
  let stage = FROG_STAGES[0];
  for (const s of FROG_STAGES) {
    if (level >= s.minLevel) {
      stage = s;
    }
  }
  return stage;
}

export function getNextStage(level) {
  for (const s of FROG_STAGES) {
    if (level < s.minLevel) {
      return s;
    }
  }
  return null;
}

export default function FrogCharacter({ level, size = 'md', showName = false, animate = false }) {
  const stage = getFrogStage(level);
  const nextStage = getNextStage(level);
  
  const sizes = {
    sm: 'w-10 h-10 text-2xl',
    md: 'w-16 h-16 text-4xl',
    lg: 'w-24 h-24 text-6xl',
    xl: 'w-32 h-32 text-7xl'
  };
  
  // Calculate progress to next stage
  const progressToNext = nextStage 
    ? ((level - stage.minLevel) / (nextStage.minLevel - stage.minLevel)) * 100
    : 100;
  
  return (
    <div className="flex flex-col items-center">
      {/* Frog Display */}
      <div className={`relative ${sizes[size]} flex items-center justify-center`}>
        {/* Glow effect for high levels */}
        {stage.glow && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ 
              background: `radial-gradient(circle, ${stage.color}40 0%, transparent 70%)`,
              filter: 'blur(8px)'
            }}
          />
        )}
        
        {/* Sparkle effect */}
        {stage.sparkle && (
          <>
            <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
            <span className="absolute -bottom-1 -left-1 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</span>
          </>
        )}
        
        {/* Main frog/stage emoji */}
        <div 
          className={`relative z-10 ${animate ? 'animate-bounce' : ''}`}
          style={{ 
            filter: stage.color ? `drop-shadow(0 0 10px ${stage.color})` : undefined
          }}
        >
          {/* Crown for high level frogs */}
          {stage.crown && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</span>
          )}
          <span style={{ color: stage.color }}>{stage.emoji}</span>
        </div>
      </div>
      
      {/* Stage Name */}
      {showName && (
        <div className="text-center mt-2">
          <p className="text-white font-medium text-sm">{stage.name}</p>
          <p className="text-white/50 text-xs">Level {level}</p>
          
          {/* Progress to next stage */}
          {nextStage && (
            <div className="mt-2 w-24">
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>Lv {stage.minLevel}</span>
                <span>Lv {nextStage.minLevel}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40 mt-1">→ {nextStage.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Evolution showcase component for viewing all stages
export function FrogEvolutionShowcase({ currentLevel }) {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-center mb-4">🐸 Frog Evolution</h3>
      <div className="grid grid-cols-4 gap-3">
        {FROG_STAGES.map((stage, idx) => {
          const unlocked = currentLevel >= stage.minLevel;
          return (
            <div 
              key={stage.name}
              className={`glass-card p-3 text-center ${!unlocked ? 'opacity-40' : ''}`}
            >
              <div className="text-2xl mb-1">
                {unlocked ? (
                  <span style={{ filter: stage.color ? `drop-shadow(0 0 5px ${stage.color})` : undefined }}>
                    {stage.crown && <span className="text-xs">👑</span>}
                    {stage.emoji}
                    {stage.sparkle && <span className="text-xs">✨</span>}
                  </span>
                ) : (
                  <span>🔒</span>
                )}
              </div>
              <p className="text-white text-xs font-medium">{stage.name}</p>
              <p className="text-white/40 text-[10px]">Lv {stage.minLevel}+</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FROG_STAGES };
