'use client';
import { useState, useCallback } from 'react';

// Task breakdown patterns based on common task types
const TASK_PATTERNS = {
  writing: {
    keywords: ['write', 'draft', 'email', 'report', 'document', 'blog', 'article', 'essay'],
    steps: [
      { text: 'Open your writing tool/document', duration: 2 },
      { text: 'Write a rough outline (bullet points)', duration: 5 },
      { text: 'Draft the opening/intro', duration: 10 },
      { text: 'Write the main content', duration: 15 },
      { text: 'Write the conclusion', duration: 5 },
      { text: 'Quick review and edit', duration: 5 }
    ]
  },
  cleaning: {
    keywords: ['clean', 'organize', 'tidy', 'declutter', 'sort'],
    steps: [
      { text: 'Set a 15-minute timer', duration: 1 },
      { text: 'Clear visible surfaces first', duration: 5 },
      { text: 'Put items in their designated spots', duration: 5 },
      { text: 'Quick vacuum/sweep if needed', duration: 3 },
      { text: 'Final walkthrough', duration: 1 }
    ]
  },
  coding: {
    keywords: ['code', 'program', 'develop', 'build', 'implement', 'fix', 'debug', 'feature'],
    steps: [
      { text: 'Review requirements/problem statement', duration: 5 },
      { text: 'Break down into smaller functions/components', duration: 5 },
      { text: 'Write pseudocode or plan approach', duration: 5 },
      { text: 'Implement core functionality', duration: 20 },
      { text: 'Test and debug', duration: 10 },
      { text: 'Clean up and document', duration: 5 }
    ]
  },
  communication: {
    keywords: ['call', 'phone', 'contact', 'reach out', 'message', 'text', 'reply'],
    steps: [
      { text: 'Find contact information', duration: 2 },
      { text: 'Jot down 2-3 key points to discuss', duration: 3 },
      { text: 'Make the call/send the message', duration: 5 },
      { text: 'Take notes if needed', duration: 2 }
    ]
  },
  studying: {
    keywords: ['study', 'learn', 'read', 'review', 'research', 'prepare'],
    steps: [
      { text: 'Gather materials (notes, textbook, etc.)', duration: 3 },
      { text: 'Skim headings and key terms', duration: 5 },
      { text: 'Read actively (highlight, annotate)', duration: 15 },
      { text: 'Summarize main points in your words', duration: 5 },
      { text: 'Quiz yourself on key concepts', duration: 5 }
    ]
  },
  exercise: {
    keywords: ['exercise', 'workout', 'gym', 'run', 'yoga', 'stretch'],
    steps: [
      { text: 'Put on workout clothes', duration: 3 },
      { text: 'Quick warm-up (jumping jacks, stretching)', duration: 5 },
      { text: 'Main workout activity', duration: 20 },
      { text: 'Cool down and stretch', duration: 5 },
      { text: 'Hydrate!', duration: 2 }
    ]
  },
  creative: {
    keywords: ['design', 'create', 'make', 'draw', 'paint', 'compose', 'craft'],
    steps: [
      { text: 'Gather inspiration (references, ideas)', duration: 5 },
      { text: 'Sketch initial concepts', duration: 10 },
      { text: 'Choose direction and refine', duration: 5 },
      { text: 'Execute main work', duration: 20 },
      { text: 'Review and polish', duration: 5 }
    ]
  },
  administrative: {
    keywords: ['file', 'submit', 'apply', 'register', 'form', 'paperwork', 'appointment'],
    steps: [
      { text: 'Gather required information/documents', duration: 5 },
      { text: 'Open the form/application', duration: 2 },
      { text: 'Fill in basic information', duration: 5 },
      { text: 'Complete detailed sections', duration: 10 },
      { text: 'Review and submit', duration: 3 }
    ]
  },
  planning: {
    keywords: ['plan', 'schedule', 'organize event', 'prepare', 'set up'],
    steps: [
      { text: 'Define the goal/outcome', duration: 3 },
      { text: 'List all required tasks', duration: 5 },
      { text: 'Prioritize and order tasks', duration: 3 },
      { text: 'Assign time estimates', duration: 3 },
      { text: 'Identify potential blockers', duration: 2 }
    ]
  }
};

// Default generic breakdown for unrecognized tasks
const GENERIC_BREAKDOWN = {
  easy: [
    { text: 'Open/prepare what you need', duration: 2 },
    { text: 'Do the first small part', duration: 5 },
    { text: 'Continue with the rest', duration: 10 },
    { text: 'Wrap up and review', duration: 3 }
  ],
  medium: [
    { text: 'Gather materials and clear space', duration: 3 },
    { text: 'Break into 3-4 sub-parts mentally', duration: 2 },
    { text: 'Complete first sub-part', duration: 10 },
    { text: 'Complete remaining sub-parts', duration: 15 },
    { text: 'Review and finalize', duration: 5 }
  ],
  hard: [
    { text: 'Review task requirements', duration: 5 },
    { text: 'Create a rough plan/outline', duration: 5 },
    { text: 'Start with the easiest part first', duration: 10 },
    { text: 'Tackle the challenging middle section', duration: 20 },
    { text: 'Complete final parts', duration: 10 },
    { text: 'Review, test, or polish', duration: 5 },
    { text: 'Take a break if needed before finishing', duration: 5 }
  ]
};

// Motivation messages for each step
const STEP_ENCOURAGEMENTS = [
  "You've got this! 💪",
  "One step at a time! 🌟",
  "Small wins add up! ✨",
  "Progress over perfection! 🚀",
  "Keep going! 🎯",
  "Almost there! 🏆",
  "You're crushing it! 💥"
];

// Hook for AI task breakdown
export function useAITaskBreakdown() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Detect task pattern from title
  const detectPattern = useCallback((title) => {
    const lowerTitle = title.toLowerCase();

    for (const [patternName, pattern] of Object.entries(TASK_PATTERNS)) {
      if (pattern.keywords.some(keyword => lowerTitle.includes(keyword))) {
        return patternName;
      }
    }

    return null;
  }, []);

  // Generate breakdown for a task
  const generateBreakdown = useCallback((task) => {
    setIsAnalyzing(true);

    const title = task.title || '';
    const difficulty = task.difficulty || 2;
    const estimatedMinutes = task.estimatedMinutes || 25;

    // Try to detect pattern
    const detectedPattern = detectPattern(title);

    let baseSteps;
    if (detectedPattern && TASK_PATTERNS[detectedPattern]) {
      baseSteps = TASK_PATTERNS[detectedPattern].steps;
    } else {
      // Use generic breakdown based on difficulty
      if (difficulty <= 2) {
        baseSteps = GENERIC_BREAKDOWN.easy;
      } else if (difficulty <= 3) {
        baseSteps = GENERIC_BREAKDOWN.medium;
      } else {
        baseSteps = GENERIC_BREAKDOWN.hard;
      }
    }

    // Adjust step durations to match estimated time
    const baseTotalDuration = baseSteps.reduce((sum, s) => sum + s.duration, 0);
    const scaleFactor = estimatedMinutes / baseTotalDuration;

    const adjustedSteps = baseSteps.map((step, index) => ({
      id: `step_${index}`,
      text: step.text.replace('${title}', title),
      duration: Math.max(1, Math.round(step.duration * scaleFactor)),
      completed: false,
      encouragement: STEP_ENCOURAGEMENTS[index % STEP_ENCOURAGEMENTS.length]
    }));

    setIsAnalyzing(false);

    return {
      taskId: task.id,
      taskTitle: task.title,
      pattern: detectedPattern,
      steps: adjustedSteps,
      totalDuration: adjustedSteps.reduce((sum, s) => sum + s.duration, 0),
      generatedAt: new Date().toISOString()
    };
  }, [detectPattern]);

  // Generate smart suggestions based on task context
  const generateSuggestions = useCallback((task) => {
    const suggestions = [];
    const title = task.title?.toLowerCase() || '';
    const difficulty = task.difficulty || 2;

    // Difficulty-based suggestions
    if (difficulty >= 4) {
      suggestions.push({
        type: 'tip',
        emoji: '🎯',
        text: 'This is a hard task - consider eating this frog first thing tomorrow!'
      });
      suggestions.push({
        type: 'tip',
        emoji: '⏰',
        text: 'Try the "2-minute rule" - just start for 2 minutes'
      });
    }

    // Pattern-based suggestions
    const pattern = detectPattern(title);
    switch (pattern) {
      case 'writing':
        suggestions.push({
          type: 'tip',
          emoji: '✍️',
          text: 'Start with a "brain dump" - write without editing first'
        });
        break;
      case 'coding':
        suggestions.push({
          type: 'tip',
          emoji: '💻',
          text: 'Write tests first to clarify what you need to build'
        });
        break;
      case 'communication':
        suggestions.push({
          type: 'tip',
          emoji: '📞',
          text: 'Prepare a brief script to reduce phone anxiety'
        });
        break;
      case 'studying':
        suggestions.push({
          type: 'tip',
          emoji: '📚',
          text: 'Use the Pomodoro technique - 25 min study, 5 min break'
        });
        break;
      case 'cleaning':
        suggestions.push({
          type: 'tip',
          emoji: '🧹',
          text: 'Put on energizing music and set a timer!'
        });
        break;
    }

    // Time-based suggestions
    if ((task.estimatedMinutes || 25) > 45) {
      suggestions.push({
        type: 'warning',
        emoji: '⚠️',
        text: 'Long task - consider breaking into multiple sessions'
      });
    }

    // General ADHD-friendly suggestions
    suggestions.push({
      type: 'tip',
      emoji: '🧠',
      text: 'Remove distractions - put phone in another room'
    });

    return suggestions.slice(0, 4); // Return max 4 suggestions
  }, [detectPattern]);

  return {
    isAnalyzing,
    generateBreakdown,
    generateSuggestions,
    detectPattern,
    TASK_PATTERNS
  };
}

// Step Progress Component
export function BreakdownStepProgress({ step, onToggle, isActive }) {
  return (
    <div
      className={`p-3 rounded-lg transition-all ${
        step.completed
          ? 'bg-green-500/20'
          : isActive
            ? 'bg-blue-500/20 ring-2 ring-blue-500/30'
            : 'bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(step.id)}
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            step.completed
              ? 'bg-green-500 text-white'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {step.completed ? '✓' : ''}
        </button>
        <div className="flex-1">
          <p className={step.completed ? 'line-through opacity-60' : ''}>
            {step.text}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-white/40">~{step.duration} min</span>
            {isActive && !step.completed && (
              <span className="text-xs text-blue-400">{step.encouragement}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Breakdown Panel
export function TaskBreakdownPanel({
  breakdown,
  onStepToggle,
  onStartFromStep,
  suggestions
}) {
  if (!breakdown) return null;

  const completedSteps = breakdown.steps.filter(s => s.completed).length;
  const progress = Math.round((completedSteps / breakdown.steps.length) * 100);
  const currentStepIndex = breakdown.steps.findIndex(s => !s.completed);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">🔨 Task Breakdown</h3>
          <p className="text-sm text-white/60">
            {completedSteps} of {breakdown.steps.length} steps complete
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{progress}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {breakdown.steps.map((step, index) => (
          <BreakdownStepProgress
            key={step.id}
            step={step}
            onToggle={onStepToggle}
            isActive={index === currentStepIndex}
          />
        ))}
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-medium text-white/60 mb-2">💡 Tips</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{suggestion.emoji}</span>
                <span className={suggestion.type === 'warning' ? 'text-yellow-400' : ''}>
                  {suggestion.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start from next incomplete step */}
      {currentStepIndex >= 0 && (
        <button
          onClick={() => onStartFromStep(currentStepIndex)}
          className="glass-button w-full py-3 bg-blue-500/20 hover:bg-blue-500/30"
        >
          ▶️ Start "{breakdown.steps[currentStepIndex].text}"
        </button>
      )}
    </div>
  );
}

// AI Breakdown Modal
export function AIBreakdownModal({
  isOpen,
  onClose,
  task,
  breakdown,
  suggestions,
  onGenerateBreakdown,
  onStepToggle,
  onStartTimer,
  isAnalyzing
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🤖 AI Task Breakdown</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="p-4">
          {/* Task info */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{task?.frog ? '🐸' : '📋'}</span>
              <div>
                <div className="font-semibold">{task?.title}</div>
                <div className="text-sm text-white/60">
                  ~{task?.estimatedMinutes || 25} min • Difficulty: {task?.difficulty || 2}/5
                </div>
              </div>
            </div>
          </div>

          {!breakdown ? (
            <div className="text-center py-8">
              <button
                onClick={() => onGenerateBreakdown(task)}
                disabled={isAnalyzing}
                className="glass-button px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <span className="animate-spin mr-2">⚙️</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    🪄 Generate Breakdown
                  </>
                )}
              </button>
              <p className="text-sm text-white/40 mt-4">
                AI will analyze your task and create actionable steps
              </p>
            </div>
          ) : (
            <TaskBreakdownPanel
              breakdown={breakdown}
              onStepToggle={onStepToggle}
              onStartFromStep={(stepIndex) => {
                const step = breakdown.steps[stepIndex];
                onStartTimer(step.duration, step.text);
              }}
              suggestions={suggestions}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AIBreakdownModal;
