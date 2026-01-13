'use client';

import { useState, useEffect, useCallback } from 'react';

// Default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    emoji: '🌅',
    category: 'health',
    tasks: [
      { title: 'Make bed', difficulty: 1, estimatedMinutes: 2 },
      { title: 'Morning stretch', difficulty: 1, estimatedMinutes: 10 },
      { title: 'Healthy breakfast', difficulty: 2, estimatedMinutes: 20 },
      { title: 'Review daily priorities', difficulty: 2, estimatedMinutes: 5 },
    ],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    emoji: '📋',
    category: 'work',
    tasks: [
      { title: 'Review completed tasks', difficulty: 2, estimatedMinutes: 15 },
      { title: 'Clear inbox to zero', difficulty: 3, estimatedMinutes: 30 },
      { title: 'Plan next week priorities', difficulty: 3, estimatedMinutes: 20 },
      { title: 'Update project status', difficulty: 2, estimatedMinutes: 15 },
    ],
  },
  {
    id: 'deep-work-session',
    name: 'Deep Work Session',
    emoji: '🎯',
    category: 'work',
    tasks: [
      { title: 'Set intention for session', difficulty: 1, estimatedMinutes: 5 },
      { title: 'Main focus task', difficulty: 4, estimatedMinutes: 90, frog: true },
      { title: 'Review and document progress', difficulty: 2, estimatedMinutes: 10 },
    ],
  },
  {
    id: 'workout',
    name: 'Workout Session',
    emoji: '💪',
    category: 'health',
    tasks: [
      { title: 'Warm-up', difficulty: 1, estimatedMinutes: 5 },
      { title: 'Main workout', difficulty: 4, estimatedMinutes: 45 },
      { title: 'Cool down & stretch', difficulty: 1, estimatedMinutes: 10 },
      { title: 'Log workout', difficulty: 1, estimatedMinutes: 2 },
    ],
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    emoji: '✍️',
    category: 'creative',
    tasks: [
      { title: 'Research & outline', difficulty: 3, estimatedMinutes: 30 },
      { title: 'Write first draft', difficulty: 4, estimatedMinutes: 60, frog: true },
      { title: 'Edit & refine', difficulty: 3, estimatedMinutes: 30 },
      { title: 'Add visuals/formatting', difficulty: 2, estimatedMinutes: 20 },
      { title: 'Final review & publish', difficulty: 2, estimatedMinutes: 15 },
    ],
  },
];

// Hook for managing templates
export function useTaskTemplates() {
  const [templates, setTemplates] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('task_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates([...DEFAULT_TEMPLATES, ...parsed]);
      } catch (e) {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
    setIsLoaded(true);
  }, []);

  // Save custom templates
  const saveTemplates = useCallback((customTemplates) => {
    localStorage.setItem('task_templates', JSON.stringify(customTemplates));
  }, []);

  // Add new template
  const addTemplate = useCallback((template) => {
    const newTemplate = {
      ...template,
      id: `custom_${Date.now()}`,
      isCustom: true,
    };

    setTemplates(prev => {
      const customTemplates = prev.filter(t => t.isCustom);
      const updated = [...customTemplates, newTemplate];
      saveTemplates(updated);
      return [...DEFAULT_TEMPLATES, ...updated];
    });

    return newTemplate;
  }, [saveTemplates]);

  // Update template
  const updateTemplate = useCallback((templateId, updates) => {
    setTemplates(prev => {
      const updated = prev.map(t =>
        t.id === templateId ? { ...t, ...updates } : t
      );
      const customTemplates = updated.filter(t => t.isCustom);
      saveTemplates(customTemplates);
      return updated;
    });
  }, [saveTemplates]);

  // Delete template
  const deleteTemplate = useCallback((templateId) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId);
      const customTemplates = updated.filter(t => t.isCustom);
      saveTemplates(customTemplates);
      return updated;
    });
  }, [saveTemplates]);

  // Create tasks from template
  const createTasksFromTemplate = useCallback((template, options = {}) => {
    const { addDueDate = false, dueDate = null } = options;

    return template.tasks.map((task, idx) => ({
      id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      category: template.category,
      difficulty: task.difficulty,
      estimatedMinutes: task.estimatedMinutes,
      frog: task.frog || false,
      recurrence: 'none',
      dueDate: addDueDate ? dueDate : null,
      completed: false,
      created_at: new Date().toISOString(),
      templateId: template.id,
    }));
  }, []);

  return {
    templates,
    isLoaded,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    createTasksFromTemplate,
    defaultTemplates: DEFAULT_TEMPLATES,
    customTemplates: templates.filter(t => t.isCustom),
  };
}

// Template Picker Modal
export function TemplatePickerModal({ isOpen, onClose, templates, onSelectTemplate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📦</span> Task Templates
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full glass-input px-4 py-3 rounded-xl text-white mb-4"
        />

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                  : 'glass-button text-white/70'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">📭</span>
              <p className="text-white/60 mt-2">No templates found</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template);
                  onClose();
                }}
                className="w-full glass-card p-4 rounded-xl text-left hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{template.name}</p>
                      {template.isCustom && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                      {template.tasks.length} tasks • {template.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} min total
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tasks.slice(0, 3).map((task, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          {task.title}
                        </span>
                      ))}
                      {template.tasks.length > 3 && (
                        <span className="text-xs text-white/40">+{template.tasks.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Create Template Modal
export function CreateTemplateModal({ isOpen, onClose, onSave, existingTemplate = null }) {
  const [name, setName] = useState(existingTemplate?.name || '');
  const [emoji, setEmoji] = useState(existingTemplate?.emoji || '📋');
  const [category, setCategory] = useState(existingTemplate?.category || 'personal');
  const [tasks, setTasks] = useState(existingTemplate?.tasks || [{ title: '', difficulty: 2, estimatedMinutes: 25 }]);

  const EMOJIS = ['📋', '🎯', '💪', '✍️', '🌅', '📊', '🧹', '📚', '💻', '🎨', '🏃', '🧘', '📧', '📞', '🛒'];
  const CATEGORIES = ['personal', 'work', 'health', 'creative', 'learning', 'errands'];

  if (!isOpen) return null;

  const addTask = () => {
    setTasks([...tasks, { title: '', difficulty: 2, estimatedMinutes: 25 }]);
  };

  const updateTask = (idx, updates) => {
    setTasks(tasks.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const removeTask = (idx) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== idx));
    }
  };

  const handleSave = () => {
    if (!name.trim() || tasks.every(t => !t.title.trim())) return;

    const template = {
      name: name.trim(),
      emoji,
      category,
      tasks: tasks.filter(t => t.title.trim()),
    };

    onSave(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {existingTemplate ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Template Name & Emoji */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-white/60 text-sm mb-2 block">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Template"
              className="w-full glass-input px-4 py-3 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block">Icon</label>
            <select
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="glass-input px-4 py-3 rounded-xl text-white bg-transparent text-xl"
            >
              {EMOJIS.map(e => (
                <option key={e} value={e} className="bg-gray-900">{e}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all ${
                  category === cat
                    ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                    : 'glass-button text-white/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Tasks in Template</label>
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <div key={idx} className="glass-card p-3 rounded-xl">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(idx, { title: e.target.value })}
                    placeholder="Task name"
                    className="flex-1 glass-input px-3 py-2 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => removeTask(idx)}
                    className="px-2 text-red-400 hover:text-red-300"
                    disabled={tasks.length === 1}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <select
                      value={task.difficulty}
                      onChange={(e) => updateTask(idx, { difficulty: parseInt(e.target.value) })}
                      className="w-full glass-input px-2 py-1 rounded-lg text-white text-xs bg-transparent"
                    >
                      {[1, 2, 3, 4, 5].map(d => (
                        <option key={d} value={d} className="bg-gray-900">
                          {'⭐'.repeat(d)} ({d === 1 ? 'Easy' : d === 5 ? 'Hard' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <select
                      value={task.estimatedMinutes}
                      onChange={(e) => updateTask(idx, { estimatedMinutes: parseInt(e.target.value) })}
                      className="w-full glass-input px-2 py-1 rounded-lg text-white text-xs bg-transparent"
                    >
                      {[5, 10, 15, 25, 30, 45, 60, 90, 120].map(m => (
                        <option key={m} value={m} className="bg-gray-900">{m} min</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={task.frog || false}
                      onChange={(e) => updateTask(idx, { frog: e.target.checked })}
                      className="rounded accent-green-500"
                    />
                    🐸
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={addTask}
              className="w-full py-2 glass-button rounded-xl text-white/60 text-sm"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || tasks.every(t => !t.title.trim())}
          className="w-full py-4 rounded-2xl font-semibold bg-green-500/30 border border-green-500/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingTemplate ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}

// Save Current Tasks as Template
export function SaveAsTemplateButton({ tasks, onSave }) {
  const [showModal, setShowModal] = useState(false);

  const handleSave = (template) => {
    onSave(template);
    setShowModal(false);
  };

  // Create template structure from selected tasks
  const templateFromTasks = {
    name: '',
    emoji: '📋',
    category: tasks[0]?.category || 'personal',
    tasks: tasks.map(t => ({
      title: t.title,
      difficulty: t.difficulty,
      estimatedMinutes: t.estimatedMinutes,
      frog: t.frog,
    })),
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 rounded-lg glass-button text-white/60 text-sm hover:text-white"
        disabled={tasks.length === 0}
      >
        📦 Save as Template
      </button>

      <CreateTemplateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        existingTemplate={templateFromTasks}
      />
    </>
  );
}

export default TemplatePickerModal;
