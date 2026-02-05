'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

// Natural language patterns for parsing
const PATTERNS = {
  // Time patterns
  tomorrow: /\btomorrow\b/i,
  today: /\btoday\b/i,
  nextWeek: /\bnext\s+week\b/i,
  inDays: /\bin\s+(\d+)\s+days?\b/i,
  onDay: /\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  atTime: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  byDate: /\bby\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i,

  // Duration patterns
  forMinutes: /\bfor\s+(\d+)\s*(?:min(?:ute)?s?|m)\b/i,
  forHours: /\bfor\s+(\d+)\s*(?:hour?s?|h|hr)\b/i,
  quickTask: /\bquick\b/i,
  longTask: /\blong\b/i,

  // Priority patterns
  urgent: /\b(?:urgent|asap|immediately|critical)\b/i,
  important: /\b(?:important|priority|must|need to)\b/i,
  frog: /\b(?:frog|eat\s+the\s+frog|hardest|biggest)\b/i,

  // Category patterns
  work: /\b(?:work|job|office|meeting|client|project)\b/i,
  personal: /\b(?:personal|home|family|self)\b/i,
  health: /\b(?:health|exercise|workout|gym|doctor|medical)\b/i,
  learning: /\b(?:learn|study|read|course|class)\b/i,
  errands: /\b(?:errand|buy|shop|pick\s+up|grocery|store)\b/i,
  creative: /\b(?:creative|design|write|art|music)\b/i,

  // Recurrence patterns
  daily: /\b(?:every\s+day|daily)\b/i,
  weekly: /\b(?:every\s+week|weekly)\b/i,
  weekdays: /\b(?:weekdays|every\s+weekday)\b/i,
  monthly: /\b(?:every\s+month|monthly)\b/i,

  // Difficulty hints
  easy: /\b(?:easy|simple|quick|small)\b/i,
  hard: /\b(?:hard|difficult|complex|challenging)\b/i,
  medium: /\b(?:medium|moderate|normal)\b/i
};

// Days of the week
const DAYS_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

// Hook for natural language task input
export function useNaturalLanguageInput() {
  const [parseResult, setParseResult] = useState(null);

  // Parse natural language input
  const parseInput = useCallback((text) => {
    const result = {
      title: text,
      dueDate: null,
      dueTime: null,
      estimatedMinutes: null,
      difficulty: null,
      category: null,
      frog: false,
      recurrence: null,
      confidence: 0,
      extractedParts: []
    };

    let cleanTitle = text;

    // Parse date
    if (PATTERNS.today.test(text)) {
      result.dueDate = new Date();
      result.extractedParts.push({ type: 'date', value: 'today' });
      cleanTitle = cleanTitle.replace(PATTERNS.today, '');
    } else if (PATTERNS.tomorrow.test(text)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.dueDate = tomorrow;
      result.extractedParts.push({ type: 'date', value: 'tomorrow' });
      cleanTitle = cleanTitle.replace(PATTERNS.tomorrow, '');
    } else if (PATTERNS.nextWeek.test(text)) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      result.dueDate = nextWeek;
      result.extractedParts.push({ type: 'date', value: 'next week' });
      cleanTitle = cleanTitle.replace(PATTERNS.nextWeek, '');
    }

    // Parse "in X days"
    const inDaysMatch = text.match(PATTERNS.inDays);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      result.dueDate = futureDate;
      result.extractedParts.push({ type: 'date', value: `in ${days} days` });
      cleanTitle = cleanTitle.replace(PATTERNS.inDays, '');
    }

    // Parse "on [day]"
    const onDayMatch = text.match(PATTERNS.onDay);
    if (onDayMatch) {
      const targetDay = DAYS_MAP[onDayMatch[1].toLowerCase()];
      const today = new Date();
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysUntil);
      result.dueDate = targetDate;
      result.extractedParts.push({ type: 'date', value: `on ${onDayMatch[1]}` });
      cleanTitle = cleanTitle.replace(PATTERNS.onDay, '');
    }

    // Parse time
    const atTimeMatch = text.match(PATTERNS.atTime);
    if (atTimeMatch) {
      let hours = parseInt(atTimeMatch[1]);
      const minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0;
      const ampm = atTimeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      result.dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      result.extractedParts.push({ type: 'time', value: atTimeMatch[0] });
      cleanTitle = cleanTitle.replace(PATTERNS.atTime, '');
    }

    // Parse duration
    const forMinutesMatch = text.match(PATTERNS.forMinutes);
    if (forMinutesMatch) {
      result.estimatedMinutes = parseInt(forMinutesMatch[1]);
      result.extractedParts.push({ type: 'duration', value: `${forMinutesMatch[1]} min` });
      cleanTitle = cleanTitle.replace(PATTERNS.forMinutes, '');
    }

    const forHoursMatch = text.match(PATTERNS.forHours);
    if (forHoursMatch) {
      result.estimatedMinutes = parseInt(forHoursMatch[1]) * 60;
      result.extractedParts.push({ type: 'duration', value: `${forHoursMatch[1]} hours` });
      cleanTitle = cleanTitle.replace(PATTERNS.forHours, '');
    }

    if (PATTERNS.quickTask.test(text)) {
      result.estimatedMinutes = 15;
      result.extractedParts.push({ type: 'duration', value: 'quick' });
      cleanTitle = cleanTitle.replace(PATTERNS.quickTask, '');
    }

    // Parse priority/frog
    if (PATTERNS.frog.test(text) || PATTERNS.urgent.test(text)) {
      result.frog = true;
      result.extractedParts.push({ type: 'priority', value: 'frog' });
      cleanTitle = cleanTitle.replace(PATTERNS.frog, '').replace(PATTERNS.urgent, '');
    }

    // Parse category
    const categoryPatterns = [
      { pattern: PATTERNS.work, category: 'work' },
      { pattern: PATTERNS.personal, category: 'personal' },
      { pattern: PATTERNS.health, category: 'health' },
      { pattern: PATTERNS.learning, category: 'learning' },
      { pattern: PATTERNS.errands, category: 'errands' },
      { pattern: PATTERNS.creative, category: 'creative' }
    ];

    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(text)) {
        result.category = category;
        result.extractedParts.push({ type: 'category', value: category });
        break;
      }
    }

    // Parse difficulty
    if (PATTERNS.easy.test(text)) {
      result.difficulty = 1;
      result.extractedParts.push({ type: 'difficulty', value: 'easy' });
      cleanTitle = cleanTitle.replace(PATTERNS.easy, '');
    } else if (PATTERNS.hard.test(text)) {
      result.difficulty = 4;
      result.extractedParts.push({ type: 'difficulty', value: 'hard' });
      cleanTitle = cleanTitle.replace(PATTERNS.hard, '');
    }

    // Parse recurrence
    if (PATTERNS.daily.test(text)) {
      result.recurrence = 'daily';
      result.extractedParts.push({ type: 'recurrence', value: 'daily' });
      cleanTitle = cleanTitle.replace(PATTERNS.daily, '');
    } else if (PATTERNS.weekly.test(text)) {
      result.recurrence = 'weekly';
      result.extractedParts.push({ type: 'recurrence', value: 'weekly' });
      cleanTitle = cleanTitle.replace(PATTERNS.weekly, '');
    } else if (PATTERNS.weekdays.test(text)) {
      result.recurrence = 'weekdays';
      result.extractedParts.push({ type: 'recurrence', value: 'weekdays' });
      cleanTitle = cleanTitle.replace(PATTERNS.weekdays, '');
    }

    // Clean up title
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/^\s*[-,]\s*/, '')
      .replace(/\s*[-,]\s*$/, '')
      .trim();

    // Capitalize first letter
    if (cleanTitle) {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    result.title = cleanTitle || text;

    // Calculate confidence score
    result.confidence = Math.min(1, result.extractedParts.length * 0.2);

    setParseResult(result);
    return result;
  }, []);

  // Convert parse result to task
  const createTaskFromParse = useCallback((parseResult, defaults = {}) => {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: parseResult.title,
      category: parseResult.category || defaults.category || 'personal',
      difficulty: parseResult.difficulty || defaults.difficulty || 2,
      estimatedMinutes: parseResult.estimatedMinutes || defaults.estimatedMinutes || 25,
      frog: parseResult.frog,
      recurrence: parseResult.recurrence || 'none',
      completed: false,
      created_at: new Date().toISOString()
    };

    if (parseResult.dueDate) {
      const date = new Date(parseResult.dueDate);
      if (parseResult.dueTime) {
        const [hours, minutes] = parseResult.dueTime.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      task.dueDate = date.toISOString();
    }

    return task;
  }, []);

  // Clear parse result
  const clearParse = useCallback(() => {
    setParseResult(null);
  }, []);

  return {
    parseResult,
    parseInput,
    createTaskFromParse,
    clearParse
  };
}

// Extracted Part Badge
export function ExtractedPartBadge({ part }) {
  const colors = {
    date: 'bg-blue-500/20 text-blue-300',
    time: 'bg-purple-500/20 text-purple-300',
    duration: 'bg-green-500/20 text-green-300',
    priority: 'bg-red-500/20 text-red-300',
    category: 'bg-yellow-500/20 text-yellow-300',
    difficulty: 'bg-orange-500/20 text-orange-300',
    recurrence: 'bg-cyan-500/20 text-cyan-300'
  };

  const icons = {
    date: '📅',
    time: '⏰',
    duration: '⏱️',
    priority: '🐸',
    category: '🏷️',
    difficulty: '⭐',
    recurrence: '🔄'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[part.type]}`}>
      <span>{icons[part.type]}</span>
      <span>{part.value}</span>
    </span>
  );
}

// Parse Preview
export function ParsePreview({ result }) {
  if (!result || result.extractedParts.length === 0) {
    return null;
  }

  return (
    <div className="p-3 rounded-xl bg-white/5 space-y-2">
      <p className="text-sm text-white/60">Detected:</p>
      <div className="flex flex-wrap gap-1">
        {result.extractedParts.map((part, i) => (
          <ExtractedPartBadge key={i} part={part} />
        ))}
      </div>
      <p className="text-sm">
        <span className="text-white/40">Task: </span>
        <span className="text-white">{result.title}</span>
      </p>
      {result.dueDate && (
        <p className="text-sm">
          <span className="text-white/40">Due: </span>
          <span className="text-white">
            {new Date(result.dueDate).toLocaleDateString()}
            {result.dueTime && ` at ${result.dueTime}`}
          </span>
        </p>
      )}
    </div>
  );
}

// Natural Language Task Input
export function NaturalLanguageTaskInput({ onAddTask, placeholder = "Add task... (try: 'Call mom tomorrow at 3pm')" }) {
  const { parseResult, parseInput, createTaskFromParse, clearParse } = useNaturalLanguageInput();
  const [value, setValue] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const debounceRef = useRef(null);

  // Debounced parsing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        parseInput(value);
      }, 300);
    } else {
      clearParse();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, parseInput, clearParse]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;

    const result = parseInput(value);
    const task = createTaskFromParse(result);
    onAddTask(task);

    setValue('');
    clearParse();
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="glass-input w-full px-4 py-3 pr-12 rounded-xl"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50"
          >
            ➕
          </button>
        </div>
      </form>

      {showPreview && parseResult && parseResult.extractedParts.length > 0 && (
        <ParsePreview result={parseResult} />
      )}

      <div className="flex items-center justify-between text-xs text-white/40">
        <span>Try: "urgent meeting with client tomorrow at 2pm for 1 hour"</span>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="hover:text-white/60"
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
    </div>
  );
}

// Examples Panel
export function NLPExamplesPanel() {
  const examples = [
    { input: 'Call dentist tomorrow', explains: 'Sets due date to tomorrow' },
    { input: 'Buy groceries for 30 min', explains: 'Sets time estimate' },
    { input: 'Urgent: Submit report by Friday', explains: 'Marks as frog, sets due date' },
    { input: 'Study for exam every day', explains: 'Sets daily recurrence' },
    { input: 'Quick workout at 7am', explains: 'Sets time and short duration' },
    { input: 'Hard project planning in 3 days', explains: 'Sets difficulty and due date' }
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white/60">Examples</h4>
      <div className="space-y-2">
        {examples.map((ex, i) => (
          <div key={i} className="p-2 rounded-lg bg-white/5 text-sm">
            <p className="font-mono text-blue-300">{ex.input}</p>
            <p className="text-white/40 text-xs mt-1">{ex.explains}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Help Modal
export function NLPHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const features = [
    { emoji: '📅', title: 'Dates', examples: ['tomorrow', 'next week', 'on Friday', 'in 3 days'] },
    { emoji: '⏰', title: 'Times', examples: ['at 3pm', 'at 14:30', 'at 9am'] },
    { emoji: '⏱️', title: 'Duration', examples: ['for 30 min', 'for 2 hours', 'quick'] },
    { emoji: '🐸', title: 'Priority', examples: ['urgent', 'important', 'frog', 'asap'] },
    { emoji: '🏷️', title: 'Categories', examples: ['work meeting', 'gym workout', 'study chapter'] },
    { emoji: '🔄', title: 'Recurrence', examples: ['every day', 'weekly', 'every weekday'] }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">🧠 Natural Language Help</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-white/60">
            Type tasks naturally and the app will automatically detect dates, times, durations, and more.
          </p>

          {features.map((feature, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{feature.emoji}</span>
                <span className="font-medium">{feature.title}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {feature.examples.map((ex, j) => (
                  <span key={j} className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/60">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <NLPExamplesPanel />
        </div>
      </div>
    </div>
  );
}

export default NaturalLanguageTaskInput;
