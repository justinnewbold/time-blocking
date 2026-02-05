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

// Hook for task estimation calibration
export function useTaskEstimationCalibration() {
  const [estimationHistory, setEstimationHistory] = useState(() =>
    Storage.get('estimationHistory', [])
  );
  const [calibrationStats, setCalibrationStats] = useState(() =>
    Storage.get('calibrationStats', {
      totalTasks: 0,
      totalEstimated: 0,
      totalActual: 0,
      accuracyTrend: []
    })
  );

  // Save to storage
  useEffect(() => {
    Storage.set('estimationHistory', estimationHistory);
  }, [estimationHistory]);

  useEffect(() => {
    Storage.set('calibrationStats', calibrationStats);
  }, [calibrationStats]);

  // Record completed task timing
  const recordTaskCompletion = useCallback((task, actualMinutes) => {
    const record = {
      id: `est_${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      difficulty: task.difficulty || 2,
      estimatedMinutes: task.estimatedMinutes || 25,
      actualMinutes,
      ratio: actualMinutes / (task.estimatedMinutes || 25),
      timestamp: new Date().toISOString()
    };

    setEstimationHistory(prev => {
      const updated = [record, ...prev].slice(0, 200); // Keep last 200 records
      return updated;
    });

    // Update stats
    setCalibrationStats(prev => {
      const newAccuracy = record.estimatedMinutes / record.actualMinutes;
      const accuracyTrend = [...prev.accuracyTrend, newAccuracy].slice(-30);

      return {
        totalTasks: prev.totalTasks + 1,
        totalEstimated: prev.totalEstimated + record.estimatedMinutes,
        totalActual: prev.totalActual + record.actualMinutes,
        accuracyTrend
      };
    });

    return record;
  }, []);

  // Calculate accuracy metrics
  const accuracyMetrics = useMemo(() => {
    if (estimationHistory.length === 0) {
      return {
        overallAccuracy: 1,
        bias: 0,
        biasLabel: 'neutral',
        averageRatio: 1,
        underestimateRate: 0,
        overestimateRate: 0
      };
    }

    const ratios = estimationHistory.map(h => h.ratio);
    const averageRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    const underestimates = ratios.filter(r => r > 1.2).length;
    const overestimates = ratios.filter(r => r < 0.8).length;
    const accurate = ratios.filter(r => r >= 0.8 && r <= 1.2).length;

    const overallAccuracy = accurate / ratios.length;
    const bias = averageRatio - 1;
    const biasLabel = bias > 0.2 ? 'underestimate' : bias < -0.2 ? 'overestimate' : 'neutral';

    return {
      overallAccuracy,
      bias,
      biasLabel,
      averageRatio,
      underestimateRate: underestimates / ratios.length,
      overestimateRate: overestimates / ratios.length
    };
  }, [estimationHistory]);

  // Get calibration factor for a category
  const getCategoryCalibration = useCallback((category) => {
    const categoryHistory = estimationHistory.filter(h => h.category === category);
    if (categoryHistory.length < 3) return 1;

    const ratios = categoryHistory.map(h => h.ratio);
    return ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }, [estimationHistory]);

  // Get calibration factor for a difficulty level
  const getDifficultyCalibration = useCallback((difficulty) => {
    const difficultyHistory = estimationHistory.filter(h => h.difficulty === difficulty);
    if (difficultyHistory.length < 3) return 1;

    const ratios = difficultyHistory.map(h => h.ratio);
    return ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }, [estimationHistory]);

  // Suggest calibrated estimate
  const suggestCalibratedEstimate = useCallback((estimatedMinutes, category, difficulty) => {
    const categoryFactor = getCategoryCalibration(category);
    const difficultyFactor = getDifficultyCalibration(difficulty);

    // Combine factors with weights
    const combinedFactor = (categoryFactor * 0.6 + difficultyFactor * 0.4);

    // Apply factor but keep within reasonable bounds
    let suggested = Math.round(estimatedMinutes * combinedFactor);
    suggested = Math.max(5, Math.min(suggested, estimatedMinutes * 2.5));

    return {
      original: estimatedMinutes,
      suggested,
      factor: combinedFactor,
      reason: combinedFactor > 1.2
        ? 'You tend to underestimate these tasks'
        : combinedFactor < 0.8
          ? 'You tend to overestimate these tasks'
          : 'Your estimates are usually accurate'
    };
  }, [getCategoryCalibration, getDifficultyCalibration]);

  // Get insights
  const getInsights = useCallback(() => {
    const insights = [];

    // Overall bias insight
    if (accuracyMetrics.biasLabel === 'underestimate') {
      insights.push({
        type: 'warning',
        emoji: '⏱️',
        message: `You underestimate tasks by ~${Math.round((accuracyMetrics.averageRatio - 1) * 100)}% on average`
      });
    } else if (accuracyMetrics.biasLabel === 'overestimate') {
      insights.push({
        type: 'info',
        emoji: '🎯',
        message: `You overestimate tasks by ~${Math.round((1 - accuracyMetrics.averageRatio) * 100)}% on average`
      });
    }

    // Category-specific insights
    const categories = [...new Set(estimationHistory.map(h => h.category))];
    categories.forEach(cat => {
      const factor = getCategoryCalibration(cat);
      if (factor > 1.3) {
        insights.push({
          type: 'category',
          emoji: '📁',
          message: `${cat} tasks take ${Math.round((factor - 1) * 100)}% longer than estimated`
        });
      }
    });

    // Difficulty insights
    const hardTaskFactor = getDifficultyCalibration(4);
    if (hardTaskFactor > 1.5) {
      insights.push({
        type: 'difficulty',
        emoji: '💪',
        message: `Hard tasks take ${Math.round((hardTaskFactor - 1) * 100)}% longer than expected`
      });
    }

    // Improvement trend
    if (calibrationStats.accuracyTrend.length >= 10) {
      const recentAccuracy = calibrationStats.accuracyTrend.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const olderAccuracy = calibrationStats.accuracyTrend.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

      if (Math.abs(recentAccuracy - 1) < Math.abs(olderAccuracy - 1)) {
        insights.push({
          type: 'success',
          emoji: '📈',
          message: 'Your estimation accuracy is improving!'
        });
      }
    }

    return insights;
  }, [accuracyMetrics, estimationHistory, calibrationStats, getCategoryCalibration, getDifficultyCalibration]);

  // Clear history
  const clearHistory = useCallback(() => {
    setEstimationHistory([]);
    setCalibrationStats({
      totalTasks: 0,
      totalEstimated: 0,
      totalActual: 0,
      accuracyTrend: []
    });
  }, []);

  return {
    // State
    estimationHistory,
    calibrationStats,
    accuracyMetrics,

    // Actions
    recordTaskCompletion,
    suggestCalibratedEstimate,
    getCategoryCalibration,
    getDifficultyCalibration,
    getInsights,
    clearHistory
  };
}

// Accuracy Gauge
export function AccuracyGauge({ accuracy }) {
  const percentage = Math.round(accuracy * 100);
  const rotation = Math.min(180, Math.max(0, accuracy * 180));

  const getColor = () => {
    if (accuracy >= 0.8) return 'text-green-400';
    if (accuracy >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="relative w-32 h-16">
      <div className="absolute inset-0 border-t-8 border-l-8 border-r-8 border-white/20 rounded-t-full" />
      <div
        className="absolute bottom-0 left-1/2 w-1 h-12 bg-white origin-bottom transition-transform duration-500"
        style={{ transform: `translateX(-50%) rotate(${rotation - 90}deg)` }}
      />
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-xl font-bold ${getColor()}`}>
        {percentage}%
      </div>
    </div>
  );
}

// Bias Indicator
export function BiasIndicator({ bias, label }) {
  const getBiasColor = () => {
    if (label === 'underestimate') return 'bg-red-500/20 text-red-400';
    if (label === 'overestimate') return 'bg-blue-500/20 text-blue-400';
    return 'bg-green-500/20 text-green-400';
  };

  const getBiasIcon = () => {
    if (label === 'underestimate') return '⬇️';
    if (label === 'overestimate') return '⬆️';
    return '✓';
  };

  return (
    <div className={`px-3 py-2 rounded-lg ${getBiasColor()}`}>
      <div className="flex items-center gap-2">
        <span>{getBiasIcon()}</span>
        <span className="capitalize">{label}</span>
      </div>
      <p className="text-xs mt-1 opacity-60">
        {Math.abs(Math.round(bias * 100))}% {label === 'neutral' ? 'accurate' : 'off'}
      </p>
    </div>
  );
}

// Estimation History Item
export function EstimationHistoryItem({ record }) {
  const ratio = record.ratio;
  const accuracy = ratio >= 0.8 && ratio <= 1.2;
  const statusColor = accuracy ? 'text-green-400' : ratio > 1 ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
      <div className="flex-1">
        <p className="text-sm truncate">{record.taskTitle}</p>
        <p className="text-xs text-white/40">
          {new Date(record.timestamp).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm">
          <span className="text-white/40">{record.estimatedMinutes}m</span>
          <span className="mx-1">→</span>
          <span className={statusColor}>{record.actualMinutes}m</span>
        </p>
        <p className={`text-xs ${statusColor}`}>
          {accuracy ? '✓ Accurate' : ratio > 1 ? `${Math.round((ratio - 1) * 100)}% longer` : `${Math.round((1 - ratio) * 100)}% shorter`}
        </p>
      </div>
    </div>
  );
}

// Calibration Suggestion
export function CalibrationSuggestion({ suggestion, onAccept, onDecline }) {
  if (!suggestion || suggestion.suggested === suggestion.original) return null;

  return (
    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-yellow-400">💡 Calibration Suggestion</p>
          <p className="text-xs text-white/60 mt-1">{suggestion.reason}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="text-center">
          <p className="text-xs text-white/40">Your estimate</p>
          <p className="text-lg">{suggestion.original}m</p>
        </div>
        <span className="text-white/40">→</span>
        <div className="text-center">
          <p className="text-xs text-white/40">Suggested</p>
          <p className="text-lg text-yellow-400">{suggestion.suggested}m</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => onAccept(suggestion.suggested)}
          className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-sm"
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          Keep
        </button>
      </div>
    </div>
  );
}

// Insight Card
export function CalibrationInsight({ insight }) {
  const colors = {
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    category: 'bg-purple-500/10 border-purple-500/30',
    difficulty: 'bg-orange-500/10 border-orange-500/30'
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[insight.type] || 'bg-white/5'}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{insight.emoji}</span>
        <p className="text-sm">{insight.message}</p>
      </div>
    </div>
  );
}

// Stats Summary Card
export function CalibrationStatsCard({ stats, metrics }) {
  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">📊 Estimation Calibration</h3>

      <div className="flex justify-center mb-4">
        <AccuracyGauge accuracy={metrics.overallAccuracy} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-2xl font-bold">{stats.totalTasks}</p>
          <p className="text-xs text-white/40">Tasks</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-2xl font-bold">{Math.round(stats.totalEstimated / 60)}h</p>
          <p className="text-xs text-white/40">Estimated</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-2xl font-bold">{Math.round(stats.totalActual / 60)}h</p>
          <p className="text-xs text-white/40">Actual</p>
        </div>
      </div>

      <BiasIndicator bias={metrics.bias} label={metrics.biasLabel} />
    </div>
  );
}

// Calibration Modal
export function CalibrationModal({ isOpen, onClose, calibrationState }) {
  const [activeTab, setActiveTab] = useState('stats');

  if (!isOpen) return null;

  const {
    estimationHistory,
    calibrationStats,
    accuracyMetrics,
    getInsights,
    clearHistory
  } = calibrationState;

  const insights = getInsights();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📊 Estimation Calibration</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex border-b border-white/10">
          {['stats', 'insights', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'stats' && (
            <CalibrationStatsCard stats={calibrationStats} metrics={accuracyMetrics} />
          )}

          {activeTab === 'insights' && (
            <div className="space-y-3">
              {insights.length === 0 ? (
                <p className="text-center text-white/40 py-8">
                  Complete more tasks to see insights
                </p>
              ) : (
                insights.map((insight, i) => (
                  <CalibrationInsight key={i} insight={insight} />
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {estimationHistory.length === 0 ? (
                <p className="text-center text-white/40 py-8">
                  No estimation history yet
                </p>
              ) : (
                <>
                  {estimationHistory.slice(0, 20).map(record => (
                    <EstimationHistoryItem key={record.id} record={record} />
                  ))}
                  {estimationHistory.length > 20 && (
                    <p className="text-center text-white/40 text-sm">
                      + {estimationHistory.length - 20} more records
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {estimationHistory.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={clearHistory}
              className="w-full glass-button py-2 text-red-400 hover:bg-red-500/20"
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalibrationModal;
