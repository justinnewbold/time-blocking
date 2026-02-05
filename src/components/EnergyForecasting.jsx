'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Storage helper
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

// Time block labels
const TIME_BLOCKS = [
  { id: 'early-morning', label: 'Early Morning', range: '5:00-8:00', emoji: '🌅' },
  { id: 'morning', label: 'Morning', range: '8:00-12:00', emoji: '☀️' },
  { id: 'afternoon', label: 'Afternoon', range: '12:00-17:00', emoji: '🌤️' },
  { id: 'evening', label: 'Evening', range: '17:00-21:00', emoji: '🌆' },
  { id: 'night', label: 'Night', range: '21:00-5:00', emoji: '🌙' }
];

// Day labels
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Get time block for a given hour
const getTimeBlock = (hour) => {
  if (hour >= 5 && hour < 8) return 'early-morning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

// Hook to manage energy forecasting
export function useEnergyForecasting() {
  const [energyHistory, setEnergyHistory] = useState(() =>
    Storage.get('energyHistory', [])
  );
  const [patterns, setPatterns] = useState(() =>
    Storage.get('energyPatterns', {})
  );

  // Save to storage
  useEffect(() => {
    Storage.set('energyHistory', energyHistory);
  }, [energyHistory]);

  useEffect(() => {
    Storage.set('energyPatterns', patterns);
  }, [patterns]);

  // Record energy level
  const recordEnergy = useCallback((energyLevel, taskCompleted = false, taskCategory = null) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const timeBlock = getTimeBlock(hour);

    const record = {
      timestamp: now.toISOString(),
      energy: energyLevel,
      dayOfWeek,
      hour,
      timeBlock,
      taskCompleted,
      taskCategory
    };

    setEnergyHistory(prev => [record, ...prev].slice(0, 500)); // Keep last 500 records

    // Update patterns
    const patternKey = `${dayOfWeek}_${timeBlock}`;
    setPatterns(prev => {
      const existing = prev[patternKey] || { totalEnergy: 0, count: 0, completions: 0 };
      return {
        ...prev,
        [patternKey]: {
          totalEnergy: existing.totalEnergy + energyLevel,
          count: existing.count + 1,
          completions: existing.completions + (taskCompleted ? 1 : 0)
        }
      };
    });
  }, []);

  // Get average energy for a specific day and time block
  const getAverageEnergy = useCallback((dayOfWeek, timeBlock) => {
    const key = `${dayOfWeek}_${timeBlock}`;
    const data = patterns[key];
    if (!data || data.count < 2) return null;
    return Math.round((data.totalEnergy / data.count) * 10) / 10;
  }, [patterns]);

  // Get completion rate for a specific day and time block
  const getCompletionRate = useCallback((dayOfWeek, timeBlock) => {
    const key = `${dayOfWeek}_${timeBlock}`;
    const data = patterns[key];
    if (!data || data.count < 2) return null;
    return Math.round((data.completions / data.count) * 100);
  }, [patterns]);

  // Forecast tomorrow's energy
  const forecastTomorrow = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    const forecast = TIME_BLOCKS.map(block => {
      const avg = getAverageEnergy(dayOfWeek, block.id);
      const completionRate = getCompletionRate(dayOfWeek, block.id);

      return {
        ...block,
        dayOfWeek,
        predictedEnergy: avg,
        completionRate,
        confidence: patterns[`${dayOfWeek}_${block.id}`]?.count >= 5 ? 'high' :
                     patterns[`${dayOfWeek}_${block.id}`]?.count >= 2 ? 'medium' : 'low'
      };
    });

    // Find peak and low times
    const withEnergy = forecast.filter(f => f.predictedEnergy !== null);
    const peak = withEnergy.reduce((max, f) =>
      f.predictedEnergy > (max?.predictedEnergy || 0) ? f : max, null
    );
    const low = withEnergy.reduce((min, f) =>
      f.predictedEnergy < (min?.predictedEnergy || 5) ? f : min, null
    );

    return {
      dayName: DAY_FULL[dayOfWeek],
      blocks: forecast,
      peakTime: peak,
      lowTime: low
    };
  }, [patterns, getAverageEnergy, getCompletionRate]);

  // Get weekly pattern overview
  const weeklyPattern = useMemo(() => {
    const pattern = [];

    for (let day = 0; day < 7; day++) {
      const dayData = {
        day,
        dayName: DAYS[day],
        blocks: TIME_BLOCKS.map(block => ({
          ...block,
          avgEnergy: getAverageEnergy(day, block.id),
          completionRate: getCompletionRate(day, block.id),
          dataPoints: patterns[`${day}_${block.id}`]?.count || 0
        }))
      };

      // Calculate day average
      const energyValues = dayData.blocks
        .filter(b => b.avgEnergy !== null)
        .map(b => b.avgEnergy);
      dayData.avgEnergy = energyValues.length > 0
        ? Math.round((energyValues.reduce((a, b) => a + b, 0) / energyValues.length) * 10) / 10
        : null;

      pattern.push(dayData);
    }

    return pattern;
  }, [patterns, getAverageEnergy, getCompletionRate]);

  // Get best times for difficult tasks
  const getBestTimesForFrog = useMemo(() => {
    const times = [];

    for (let day = 0; day < 7; day++) {
      for (const block of TIME_BLOCKS) {
        const key = `${day}_${block.id}`;
        const data = patterns[key];
        if (data && data.count >= 2) {
          const avgEnergy = data.totalEnergy / data.count;
          const completionRate = data.completions / data.count;
          if (avgEnergy >= 3.5 && completionRate >= 0.5) {
            times.push({
              day,
              dayName: DAY_FULL[day],
              block: block,
              avgEnergy,
              completionRate,
              score: avgEnergy * 0.6 + completionRate * 4 * 0.4
            });
          }
        }
      }
    }

    return times.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [patterns]);

  // Get current time insights
  const getCurrentInsights = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeBlock = getTimeBlock(now.getHours());

    const currentAvg = getAverageEnergy(dayOfWeek, timeBlock);
    const currentRate = getCompletionRate(dayOfWeek, timeBlock);

    // Get next peak time today
    const currentBlockIndex = TIME_BLOCKS.findIndex(b => b.id === timeBlock);
    let nextPeak = null;

    for (let i = currentBlockIndex + 1; i < TIME_BLOCKS.length; i++) {
      const block = TIME_BLOCKS[i];
      const avg = getAverageEnergy(dayOfWeek, block.id);
      if (avg !== null && avg >= 3.5) {
        nextPeak = { ...block, avgEnergy: avg };
        break;
      }
    }

    return {
      current: {
        block: TIME_BLOCKS.find(b => b.id === timeBlock),
        avgEnergy: currentAvg,
        completionRate: currentRate
      },
      nextPeak,
      suggestion: currentAvg !== null
        ? currentAvg >= 3.5
          ? "You're typically at peak energy now - great time for your frog!"
          : currentAvg >= 2.5
            ? "Moderate energy expected - good for regular tasks"
            : "Energy typically lower now - try quick wins or take a break"
        : "Keep tracking to see your patterns here!"
    };
  }, [getAverageEnergy, getCompletionRate]);

  // Clear history
  const clearHistory = useCallback(() => {
    setEnergyHistory([]);
    setPatterns({});
  }, []);

  return {
    // State
    energyHistory,
    patterns,
    forecastTomorrow,
    weeklyPattern,
    getBestTimesForFrog,
    getCurrentInsights,

    // Actions
    recordEnergy,
    getAverageEnergy,
    getCompletionRate,
    clearHistory
  };
}

// Energy Forecast Card
export function EnergyForecastCard({ forecast, onDismiss }) {
  if (!forecast || !forecast.peakTime) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">🔮 Tomorrow's Energy Forecast</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="text-white/40 hover:text-white">×</button>
        )}
      </div>

      <div className="text-sm text-white/60 mb-3">{forecast.dayName}</div>

      {/* Time blocks */}
      <div className="flex gap-1 mb-4">
        {forecast.blocks.map(block => {
          const energy = block.predictedEnergy;
          const colorClass = energy === null ? 'bg-white/10'
            : energy >= 3.5 ? 'bg-green-500/40'
            : energy >= 2.5 ? 'bg-yellow-500/40'
            : 'bg-red-500/40';

          return (
            <div
              key={block.id}
              className={`flex-1 p-2 rounded-lg text-center ${colorClass}`}
              title={`${block.label}: ${energy ? `Energy ${energy}` : 'No data'}`}
            >
              <div className="text-lg">{block.emoji}</div>
              <div className="text-xs">{energy ? energy.toFixed(1) : '?'}</div>
            </div>
          );
        })}
      </div>

      {/* Peak and low times */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {forecast.peakTime && (
          <div className="p-2 rounded-lg bg-green-500/20">
            <div className="text-green-400 font-medium">⚡ Peak Time</div>
            <div>{forecast.peakTime.label}</div>
            <div className="text-xs text-white/40">Energy {forecast.peakTime.predictedEnergy}</div>
          </div>
        )}
        {forecast.lowTime && (
          <div className="p-2 rounded-lg bg-orange-500/20">
            <div className="text-orange-400 font-medium">🔋 Low Time</div>
            <div>{forecast.lowTime.label}</div>
            <div className="text-xs text-white/40">Energy {forecast.lowTime.predictedEnergy}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Weekly Pattern Heatmap
export function EnergyPatternHeatmap({ weeklyPattern }) {
  const getColor = (energy) => {
    if (energy === null) return 'bg-white/10';
    if (energy >= 3.5) return 'bg-green-500';
    if (energy >= 3) return 'bg-green-400/70';
    if (energy >= 2.5) return 'bg-yellow-400/70';
    if (energy >= 2) return 'bg-orange-400/70';
    return 'bg-red-400/70';
  };

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">📊 Weekly Energy Pattern</h3>

      {/* Header row */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        <div className="text-xs text-white/40"></div>
        {TIME_BLOCKS.map(block => (
          <div key={block.id} className="text-center text-xs text-white/60">
            {block.emoji}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {weeklyPattern.map(day => (
        <div key={day.day} className="grid grid-cols-6 gap-1 mb-1">
          <div className="text-xs text-white/60 flex items-center">
            {day.dayName}
          </div>
          {day.blocks.map(block => (
            <div
              key={block.id}
              className={`h-6 rounded ${getColor(block.avgEnergy)} transition-colors`}
              title={`${day.dayName} ${block.label}: ${block.avgEnergy ? `Energy ${block.avgEnergy}` : 'No data'}`}
            />
          ))}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/60">
        <span>Low</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-red-400/70" />
          <div className="w-4 h-4 rounded bg-orange-400/70" />
          <div className="w-4 h-4 rounded bg-yellow-400/70" />
          <div className="w-4 h-4 rounded bg-green-400/70" />
          <div className="w-4 h-4 rounded bg-green-500" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

// Best Times for Frog Card
export function BestTimesForFrogCard({ bestTimes }) {
  if (!bestTimes || bestTimes.length === 0) {
    return (
      <div className="glass-card p-4 text-center text-white/60">
        <p>Keep tracking to discover your best times for difficult tasks!</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-3">🐸 Best Times to Eat Your Frog</h3>

      <div className="space-y-2">
        {bestTimes.map((time, index) => (
          <div
            key={`${time.day}-${time.block.id}`}
            className="flex items-center justify-between p-2 rounded-lg bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
              <div>
                <div className="font-medium">{time.dayName}</div>
                <div className="text-sm text-white/60">{time.block.label}</div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-green-400">⚡ {time.avgEnergy.toFixed(1)}</div>
              <div className="text-white/40">{Math.round(time.completionRate * 100)}% done</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Current Insights Banner
export function CurrentInsightsBanner({ insights }) {
  if (!insights) return null;

  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{insights.current.block?.emoji}</span>
        <div className="flex-1">
          <div className="text-sm font-medium">{insights.current.block?.label}</div>
          <div className="text-xs text-white/60">{insights.suggestion}</div>
        </div>
        {insights.current.avgEnergy !== null && (
          <div className="text-right">
            <div className={`text-lg font-bold ${
              insights.current.avgEnergy >= 3.5 ? 'text-green-400' :
              insights.current.avgEnergy >= 2.5 ? 'text-yellow-400' : 'text-orange-400'
            }`}>
              {insights.current.avgEnergy.toFixed(1)}
            </div>
            <div className="text-xs text-white/40">typical energy</div>
          </div>
        )}
      </div>

      {insights.nextPeak && (
        <div className="mt-2 pt-2 border-t border-white/10 text-sm text-white/60">
          ⚡ Next peak: {insights.nextPeak.label} ({insights.nextPeak.avgEnergy.toFixed(1)} energy)
        </div>
      )}
    </div>
  );
}

// Energy Forecasting Modal
export function EnergyForecastingModal({
  isOpen,
  onClose,
  forecastTomorrow,
  weeklyPattern,
  bestTimesForFrog,
  currentInsights,
  onClearHistory
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/30 backdrop-blur-sm">
          <h2 className="text-lg font-bold">🔮 Energy Forecasting</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="p-4 space-y-6">
          {/* Current insights */}
          <CurrentInsightsBanner insights={currentInsights} />

          {/* Tomorrow's forecast */}
          <EnergyForecastCard forecast={forecastTomorrow} />

          {/* Weekly heatmap */}
          <EnergyPatternHeatmap weeklyPattern={weeklyPattern} />

          {/* Best times for frog */}
          <BestTimesForFrogCard bestTimes={bestTimesForFrog} />

          {/* Clear data */}
          <div className="text-center">
            <button
              onClick={() => {
                if (confirm('Clear all energy history? This cannot be undone.')) {
                  onClearHistory();
                }
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear history
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnergyForecastingModal;
