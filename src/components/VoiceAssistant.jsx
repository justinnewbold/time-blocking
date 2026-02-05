'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Voice command patterns
const VOICE_COMMANDS = {
  // Task queries
  whatShouldIWorkOn: /^(what|which)\s*(should|can|do)\s*(i|we)\s*(work\s*on|do|tackle|focus\s*on)/i,
  showMyTasks: /^(show|list|display|what\s*are)\s*(my|the)\s*tasks/i,
  showMyFrog: /^(show|what('?s)?|where('?s)?)\s*(my|the)\s*(frog|hardest\s*task)/i,

  // Task creation
  addTask: /^(add|create|new|make)\s*(a\s*)?(task|todo|item)\s*(.+)?/i,
  quickTask: /^(quick|fast)\s*(task|add)\s*(.+)/i,

  // Timer controls
  startTimer: /^(start|begin|go)\s*(timer|focus|pomodoro)?(\s*for\s*(\d+)\s*(minutes?|mins?)?)?/i,
  stopTimer: /^(stop|end|cancel|quit)\s*(timer|focus|pomodoro)?/i,
  pauseTimer: /^(pause|hold|freeze)\s*(timer|focus)?/i,
  resumeTimer: /^(resume|continue|unpause)\s*(timer)?/i,

  // Energy and status
  setEnergy: /^(i('?m|am)|my\s*energy\s*is|feeling)\s*(zombie|low|cruising|locked\s*in|tired|energized|good|bad)/i,
  howAmIDoing: /^how\s*am\s*i\s*(doing|progressing)/i,

  // Navigation
  showStats: /^(show|open|go\s*to)\s*(stats|statistics|analytics|insights)/i,
  showSettings: /^(show|open|go\s*to)\s*(settings|preferences|options)/i,

  // Help
  help: /^(help|what\s*can\s*(you|i)\s*(do|say)|commands)/i
};

// Response templates
const VOICE_RESPONSES = {
  greeting: [
    "Hey! I'm your focus buddy. What can I help you with?",
    "Hi there! Ready to be productive?",
    "Hello! What would you like to work on?"
  ],
  taskSuggestion: (task) => [
    `Based on your energy, I suggest working on "${task.title}".`,
    `How about tackling "${task.title}"? It matches your current state well.`,
    `"${task.title}" would be a great choice right now.`
  ],
  frogReminder: (frog) => [
    `Your frog today is "${frog.title}". Want to eat it?`,
    `The hardest task is "${frog.title}". Ready to tackle it?`,
    `"${frog.title}" is waiting. Let's conquer it!`
  ],
  timerStarted: (minutes) => [
    `Timer started for ${minutes} minutes. Let's focus!`,
    `${minutes} minute focus session started. You've got this!`,
    `Starting ${minutes} minutes. Time to crush it!`
  ],
  encouragement: [
    "You're doing great! Keep it up!",
    "Every task completed is progress. Nice work!",
    "Look at you being productive! Amazing!"
  ],
  noTasks: [
    "You don't have any tasks right now. Want to add one?",
    "Your task list is empty! That's either great or we should add something.",
    "No tasks found. Shall I help you create one?"
  ],
  error: [
    "Sorry, I didn't catch that. Can you try again?",
    "I'm not sure what you mean. Try asking differently?",
    "Could you repeat that? I want to help!"
  ],
  help: [
    "You can ask me things like: 'What should I work on?', 'Add a task', 'Start timer for 25 minutes', 'Show my frog', 'How am I doing?'"
  ]
};

// Get random response from array
const getRandomResponse = (responses) => {
  if (Array.isArray(responses)) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return responses;
};

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

// Hook to manage voice assistant
export function useVoiceAssistant({
  tasks,
  completedTasks,
  energy,
  onCreateTask,
  onStartTimer,
  onStopTimer,
  onPauseTimer,
  onSetEnergy,
  onSelectTask,
  onNavigate
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() =>
    Storage.get('voiceAssistantEnabled', true)
  );
  const [conversationHistory, setConversationHistory] = useState([]);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;
          setTranscript(transcriptText);

          if (result.isFinal) {
            processCommand(transcriptText);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }

      // Speech synthesis
      if (window.speechSynthesis) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Save voice enabled preference
  useEffect(() => {
    Storage.set('voiceAssistantEnabled', voiceEnabled);
  }, [voiceEnabled]);

  // Speak response
  const speak = useCallback((text) => {
    if (!synthRef.current || !voiceEnabled) return;

    synthRef.current.cancel(); // Cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  // Process voice command
  const processCommand = useCallback((text) => {
    const trimmedText = text.trim().toLowerCase();
    let responseText = '';
    let action = null;

    // Add to conversation history
    setConversationHistory(prev => [...prev, {
      type: 'user',
      text: text,
      timestamp: new Date().toISOString()
    }]);

    // Check for wake word first
    if (wakeWordEnabled && !trimmedText.includes('hey frog') && !trimmedText.includes('okay frog')) {
      return;
    }

    // Remove wake word if present
    const command = trimmedText.replace(/^(hey|okay)\s*frog\s*/i, '');

    // Match commands
    if (VOICE_COMMANDS.whatShouldIWorkOn.test(command)) {
      // Get task recommendation based on energy
      const incompleteTasks = tasks.filter(t => !t.completed);
      if (incompleteTasks.length === 0) {
        responseText = getRandomResponse(VOICE_RESPONSES.noTasks);
      } else {
        // Sort by energy match
        const sorted = [...incompleteTasks].sort((a, b) => {
          const aDiff = Math.abs((a.difficulty || 2) - (energy || 2));
          const bDiff = Math.abs((b.difficulty || 2) - (energy || 2));
          return aDiff - bDiff;
        });
        const suggested = sorted[0];
        responseText = getRandomResponse(VOICE_RESPONSES.taskSuggestion(suggested));
        action = { type: 'suggestTask', task: suggested };
      }
    }
    else if (VOICE_COMMANDS.showMyFrog.test(command)) {
      const frog = tasks.find(t => t.frog && !t.completed);
      if (frog) {
        responseText = getRandomResponse(VOICE_RESPONSES.frogReminder(frog));
        action = { type: 'showFrog', task: frog };
      } else {
        responseText = "You haven't set a frog for today. Pick your hardest task to make it your frog!";
      }
    }
    else if (VOICE_COMMANDS.startTimer.test(command)) {
      const match = command.match(VOICE_COMMANDS.startTimer);
      const minutes = match && match[4] ? parseInt(match[4]) : 25;
      responseText = getRandomResponse(VOICE_RESPONSES.timerStarted(minutes));
      action = { type: 'startTimer', minutes };
      if (onStartTimer) onStartTimer(minutes);
    }
    else if (VOICE_COMMANDS.stopTimer.test(command)) {
      responseText = "Timer stopped. Good effort!";
      action = { type: 'stopTimer' };
      if (onStopTimer) onStopTimer();
    }
    else if (VOICE_COMMANDS.pauseTimer.test(command)) {
      responseText = "Timer paused. Take your time.";
      action = { type: 'pauseTimer' };
      if (onPauseTimer) onPauseTimer();
    }
    else if (VOICE_COMMANDS.addTask.test(command)) {
      const match = command.match(VOICE_COMMANDS.addTask);
      const taskTitle = match && match[4] ? match[4].trim() : null;
      if (taskTitle) {
        responseText = `Adding task: "${taskTitle}"`;
        action = { type: 'createTask', title: taskTitle };
        if (onCreateTask) {
          onCreateTask({
            title: taskTitle,
            category: 'personal',
            difficulty: 2,
            estimatedMinutes: 25
          });
        }
      } else {
        responseText = "What would you like to name the task?";
        action = { type: 'promptTaskTitle' };
      }
    }
    else if (VOICE_COMMANDS.setEnergy.test(command)) {
      let energyLevel = 2;
      if (/zombie|tired|bad|exhausted/i.test(command)) energyLevel = 1;
      else if (/low|meh|okay/i.test(command)) energyLevel = 2;
      else if (/cruising|good|normal/i.test(command)) energyLevel = 3;
      else if (/locked\s*in|energized|great|amazing/i.test(command)) energyLevel = 4;

      responseText = `Got it! Energy set to level ${energyLevel}.`;
      action = { type: 'setEnergy', level: energyLevel };
      if (onSetEnergy) onSetEnergy(energyLevel);
    }
    else if (VOICE_COMMANDS.howAmIDoing.test(command)) {
      const todayCompleted = completedTasks.filter(t => {
        const completed = new Date(t.completedAt || t.completed_at);
        const today = new Date();
        return completed.toDateString() === today.toDateString();
      }).length;
      responseText = todayCompleted > 0
        ? `You've completed ${todayCompleted} task${todayCompleted > 1 ? 's' : ''} today. ${getRandomResponse(VOICE_RESPONSES.encouragement)}`
        : "You haven't completed any tasks today yet. Let's change that!";
    }
    else if (VOICE_COMMANDS.help.test(command)) {
      responseText = getRandomResponse(VOICE_RESPONSES.help);
    }
    else {
      responseText = getRandomResponse(VOICE_RESPONSES.error);
    }

    setResponse(responseText);

    // Add response to history
    setConversationHistory(prev => [...prev, {
      type: 'assistant',
      text: responseText,
      action,
      timestamp: new Date().toISOString()
    }]);

    // Speak the response
    speak(responseText);

    return action;
  }, [tasks, completedTasks, energy, onCreateTask, onStartTimer, onStopTimer, onPauseTimer, onSetEnergy, speak, wakeWordEnabled]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setTranscript('');
    setResponse('');
    recognitionRef.current.start();
    setIsListening(true);
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Send text command (for typing)
  const sendTextCommand = useCallback((text) => {
    setTranscript(text);
    return processCommand(text);
  }, [processCommand]);

  return {
    // State
    isListening,
    isSupported,
    transcript,
    response,
    isSpeaking,
    voiceEnabled,
    conversationHistory,
    wakeWordEnabled,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    sendTextCommand,
    setVoiceEnabled,
    setWakeWordEnabled,
    speak
  };
}

// Voice Assistant Button Component
export function VoiceAssistantButton({ isListening, isSupported, onClick, size = 'md' }) {
  if (!isSupported) return null;

  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-12 h-12 text-xl',
    lg: 'w-14 h-14 text-2xl'
  };

  return (
    <button
      onClick={onClick}
      className={`glass-icon ${sizes[size]} flex items-center justify-center relative transition-all hover:scale-105 active:scale-95 ${
        isListening ? 'ring-2 ring-red-500 animate-pulse bg-red-500/20' : ''
      }`}
      title={isListening ? 'Listening...' : 'Voice command'}
    >
      <span>{isListening ? '🎙️' : '🎤'}</span>
      {isListening && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </button>
  );
}

// Voice Assistant Modal
export function VoiceAssistantModal({
  isOpen,
  onClose,
  isListening,
  isSupported,
  transcript,
  response,
  conversationHistory,
  onToggleListening,
  onSendText,
  voiceEnabled,
  onToggleVoice
}) {
  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  if (!isOpen) return null;

  const handleSendText = () => {
    if (textInput.trim()) {
      onSendText(textInput.trim());
      setTextInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐸</span>
            <div>
              <h2 className="font-bold">Focus Buddy</h2>
              <p className="text-xs text-white/60">Voice assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleVoice}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled ? 'bg-green-500/20' : 'bg-white/10'
              }`}
              title={voiceEnabled ? 'Voice output enabled' : 'Voice output disabled'}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversationHistory.length === 0 && (
            <div className="text-center text-white/60 py-8">
              <span className="text-4xl mb-2 block">🎤</span>
              <p>Say "Hey Frog" or tap the mic to start</p>
              <p className="text-sm mt-2">Try: "What should I work on?"</p>
            </div>
          )}

          {conversationHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-blue-500/30 rounded-br-sm'
                    : 'bg-white/10 rounded-bl-sm'
                }`}
              >
                <p>{msg.text}</p>
                <p className="text-xs text-white/40 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Live transcript */}
          {isListening && transcript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] p-3 rounded-2xl bg-blue-500/20 border border-blue-500/30 rounded-br-sm">
                <p className="italic">{transcript}...</p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a command..."
              className="glass-input flex-1"
            />
            <button
              onClick={handleSendText}
              className="glass-button px-4"
            >
              →
            </button>
            {isSupported && (
              <button
                onClick={onToggleListening}
                className={`glass-button px-4 ${
                  isListening ? 'bg-red-500/30 animate-pulse' : 'bg-blue-500/20'
                }`}
              >
                {isListening ? '⏹️' : '🎤'}
              </button>
            )}
          </div>

          {/* Quick commands */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['What should I work on?', 'Show my frog', 'Start timer', 'Help'].map(cmd => (
              <button
                key={cmd}
                onClick={() => onSendText(cmd)}
                className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceAssistantModal;
