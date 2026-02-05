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

// Note types
export const NOTE_TYPES = {
  GENERAL: 'general',
  PROGRESS: 'progress',
  BLOCKER: 'blocker',
  IDEA: 'idea',
  REFLECTION: 'reflection'
};

// Note type configurations
const NOTE_TYPE_CONFIG = {
  [NOTE_TYPES.GENERAL]: { emoji: '📝', label: 'Note', color: 'white' },
  [NOTE_TYPES.PROGRESS]: { emoji: '✅', label: 'Progress', color: 'green' },
  [NOTE_TYPES.BLOCKER]: { emoji: '🚧', label: 'Blocker', color: 'red' },
  [NOTE_TYPES.IDEA]: { emoji: '💡', label: 'Idea', color: 'yellow' },
  [NOTE_TYPES.REFLECTION]: { emoji: '🤔', label: 'Reflection', color: 'purple' }
};

// Hook to manage task notes
export function useTaskNotes() {
  const [notes, setNotes] = useState(() =>
    Storage.get('taskNotes', {})
  );
  const [journalEntries, setJournalEntries] = useState(() =>
    Storage.get('journalEntries', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('taskNotes', notes);
  }, [notes]);

  useEffect(() => {
    Storage.set('journalEntries', journalEntries);
  }, [journalEntries]);

  // Add note to task
  const addTaskNote = useCallback((taskId, content, type = NOTE_TYPES.GENERAL) => {
    const note = {
      id: `note_${Date.now()}`,
      content,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), note]
    }));

    return note;
  }, []);

  // Update note
  const updateNote = useCallback((taskId, noteId, content) => {
    setNotes(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map(note =>
        note.id === noteId
          ? { ...note, content, updatedAt: new Date().toISOString() }
          : note
      )
    }));
  }, []);

  // Delete note
  const deleteNote = useCallback((taskId, noteId) => {
    setNotes(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter(note => note.id !== noteId)
    }));
  }, []);

  // Get notes for task
  const getTaskNotes = useCallback((taskId) => {
    return notes[taskId] || [];
  }, [notes]);

  // Get notes count for task
  const getNotesCount = useCallback((taskId) => {
    return (notes[taskId] || []).length;
  }, [notes]);

  // Add journal entry
  const addJournalEntry = useCallback((entry) => {
    const journalEntry = {
      id: `journal_${Date.now()}`,
      ...entry,
      createdAt: new Date().toISOString()
    };

    setJournalEntries(prev => [journalEntry, ...prev]);
    return journalEntry;
  }, []);

  // Delete journal entry
  const deleteJournalEntry = useCallback((entryId) => {
    setJournalEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

  // Get journal entries for date range
  const getJournalEntriesForRange = useCallback((startDate, endDate) => {
    return journalEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [journalEntries]);

  // Get today's journal entries
  const todayEntries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getJournalEntriesForRange(today, tomorrow);
  }, [journalEntries, getJournalEntriesForRange]);

  return {
    // State
    notes,
    journalEntries,
    todayEntries,

    // Actions
    addTaskNote,
    updateNote,
    deleteNote,
    getTaskNotes,
    getNotesCount,
    addJournalEntry,
    deleteJournalEntry,
    getJournalEntriesForRange,

    // Constants
    NOTE_TYPES,
    NOTE_TYPE_CONFIG
  };
}

// Task Note Input Component
export function TaskNoteInput({ taskId, onAddNote }) {
  const [content, setContent] = useState('');
  const [type, setType] = useState(NOTE_TYPES.GENERAL);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdd = () => {
    if (content.trim()) {
      onAddNote(taskId, content.trim(), type);
      setContent('');
      setType(NOTE_TYPES.GENERAL);
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-sm text-white/60 hover:text-white flex items-center gap-1"
      >
        <span>📝</span>
        <span>Add note</span>
      </button>
    );
  }

  return (
    <div className="glass-card p-3 space-y-2">
      <div className="flex gap-1">
        {Object.entries(NOTE_TYPE_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`px-2 py-1 rounded text-sm ${
              type === key ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
            }`}
            title={config.label}
          >
            {config.emoji}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note..."
        className="glass-input w-full h-20 resize-none"
        autoFocus
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            setIsExpanded(false);
            setContent('');
          }}
          className="text-sm text-white/60 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!content.trim()}
          className="glass-button px-3 py-1 text-sm bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

// Task Notes List Component
export function TaskNotesList({ notes, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  if (notes.length === 0) {
    return (
      <p className="text-sm text-white/40 text-center py-2">No notes yet</p>
    );
  }

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (noteId) => {
    if (editContent.trim()) {
      onUpdate(noteId, editContent.trim());
    }
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="space-y-2">
      {notes.map(note => {
        const config = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG.general;

        return (
          <div key={note.id} className="p-2 rounded-lg bg-white/5">
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="glass-input w-full h-16 resize-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(note.id)}
                    className="text-xs text-green-400"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-sm">{config.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-white/30 mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(note)}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(note.id)}
                      className="text-xs text-white/40 hover:text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Task Notes Panel Component
export function TaskNotesPanel({ taskId, task, notes, onAddNote, onUpdateNote, onDeleteNote }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">📝 Notes</h4>
        <span className="text-xs text-white/40">{notes.length} notes</span>
      </div>

      <TaskNotesList
        notes={notes}
        onUpdate={(noteId, content) => onUpdateNote(taskId, noteId, content)}
        onDelete={(noteId) => onDeleteNote(taskId, noteId)}
      />

      <TaskNoteInput taskId={taskId} onAddNote={onAddNote} />
    </div>
  );
}

// Journal Entry Card
export function JournalEntryCard({ entry, onDelete }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {entry.taskTitle && (
            <div className="text-sm text-purple-400 mb-1">
              Re: {entry.taskTitle}
            </div>
          )}
          <p className="whitespace-pre-wrap">{entry.content}</p>
          {entry.mood && (
            <div className="mt-2">
              <span className="text-sm">Mood: </span>
              {['😫', '😕', '😐', '🙂', '😊'][entry.mood - 1]}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-white/40 hover:text-red-400"
        >
          ×
        </button>
      </div>
      <div className="text-xs text-white/40 mt-2">
        {new Date(entry.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

// Daily Journal Component
export function DailyJournal({ entries, onAddEntry, onDeleteEntry }) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (content.trim()) {
      onAddEntry({
        content: content.trim(),
        mood,
        type: 'daily'
      });
      setContent('');
      setMood(3);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">📓 Today's Journal</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="glass-button px-3 py-1 text-sm"
          >
            + Entry
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? How did today go?"
            className="glass-input w-full h-24 resize-none"
            autoFocus
          />

          <div>
            <label className="text-sm text-white/60">How are you feeling?</label>
            <div className="flex gap-2 mt-2">
              {['😫', '😕', '😐', '🙂', '😊'].map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood(i + 1)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    mood === i + 1 ? 'bg-white/20 scale-110' : 'hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setContent('');
              }}
              className="glass-button flex-1 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!content.trim()}
              className="glass-button flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="text-center text-white/40 py-4">
          <p>No journal entries for today</p>
          <p className="text-sm mt-1">Write about your day, wins, or challenges!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onDelete={onDeleteEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Notes & Journal Modal
export function NotesJournalModal({
  isOpen,
  onClose,
  notes,
  journalEntries,
  todayEntries,
  tasks,
  onAddTaskNote,
  onUpdateNote,
  onDeleteNote,
  onAddJournalEntry,
  onDeleteJournalEntry,
  getNotesCount
}) {
  const [activeTab, setActiveTab] = useState('journal');
  const [selectedTask, setSelectedTask] = useState(null);

  if (!isOpen) return null;

  const tasksWithNotes = tasks.filter(t => getNotesCount(t.id) > 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">📓 Notes & Journal</h2>
          <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['journal', 'task-notes'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedTask(null);
              }}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'journal' && (
            <DailyJournal
              entries={todayEntries}
              onAddEntry={onAddJournalEntry}
              onDeleteEntry={onDeleteJournalEntry}
            />
          )}

          {activeTab === 'task-notes' && !selectedTask && (
            <div className="space-y-3">
              <p className="text-sm text-white/60 mb-4">
                Select a task to view or add notes
              </p>

              {tasksWithNotes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white/60 mb-2">Tasks with notes:</h4>
                  {tasksWithNotes.map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span>{task.frog ? '🐸' : '○'}</span>
                        <span>{task.title}</span>
                      </div>
                      <span className="text-xs text-white/40">
                        {getNotesCount(task.id)} notes
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">All tasks:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tasks.filter(t => !t.completed).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{task.frog ? '🐸' : '○'}</span>
                        <span>{task.title}</span>
                      </div>
                      {getNotesCount(task.id) > 0 && (
                        <span className="text-xs text-purple-400">
                          📝 {getNotesCount(task.id)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'task-notes' && selectedTask && (
            <div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-sm text-white/60 hover:text-white mb-4 flex items-center gap-1"
              >
                ← Back to tasks
              </button>

              <div className="glass-card p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedTask.frog ? '🐸' : '○'}</span>
                  <div>
                    <div className="font-medium">{selectedTask.title}</div>
                    <div className="text-xs text-white/40">{selectedTask.category}</div>
                  </div>
                </div>
              </div>

              <TaskNotesPanel
                taskId={selectedTask.id}
                task={selectedTask}
                notes={notes[selectedTask.id] || []}
                onAddNote={onAddTaskNote}
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotesJournalModal;
