'use client';

import { useState } from 'react';

export function DataExportModal({
  isOpen,
  onClose,
  tasks,
  completedTasks,
  subtasks,
  userProgress,
  achievements
}) {
  const [exportFormat, setExportFormat] = useState('json');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeSubtasks, setIncludeSubtasks] = useState(true);
  const [includeProgress, setIncludeProgress] = useState(true);
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const prepareExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tasks: tasks || [],
    };

    if (includeCompleted) {
      data.completedTasks = completedTasks || [];
    }

    if (includeSubtasks) {
      data.subtasks = subtasks || {};
    }

    if (includeProgress) {
      data.userProgress = {
        streak: userProgress?.streak || 0,
        longestStreak: userProgress?.longestStreak || 0,
        level: userProgress?.level || 1,
        xp: userProgress?.xp || 0,
        totalTasksCompleted: userProgress?.totalTasksCompleted || 0,
        totalFrogsEaten: userProgress?.totalFrogsEaten || 0,
        totalFocusMinutes: userProgress?.totalFocusMinutes || 0,
      };
      data.achievements = achievements || [];
    }

    return data;
  };

  const convertToCSV = (data) => {
    const rows = [];

    // Tasks header
    rows.push('=== TASKS ===');
    rows.push('ID,Title,Category,Difficulty,Estimated Minutes,Due Date,Recurrence,Frog,Created At');

    const allTasks = [...(data.tasks || []), ...(data.completedTasks || [])];
    allTasks.forEach(task => {
      rows.push([
        task.id,
        `"${(task.title || '').replace(/"/g, '""')}"`,
        task.category || '',
        task.difficulty || '',
        task.estimatedMinutes || '',
        task.dueDate || '',
        task.recurrence || 'none',
        task.frog ? 'Yes' : 'No',
        task.created_at || task.createdAt || ''
      ].join(','));
    });

    // Subtasks
    if (data.subtasks && Object.keys(data.subtasks).length > 0) {
      rows.push('');
      rows.push('=== SUBTASKS ===');
      rows.push('Task ID,Subtask ID,Title,Completed');

      Object.entries(data.subtasks).forEach(([taskId, taskSubtasks]) => {
        taskSubtasks.forEach(subtask => {
          rows.push([
            taskId,
            subtask.id,
            `"${(subtask.title || '').replace(/"/g, '""')}"`,
            subtask.completed ? 'Yes' : 'No'
          ].join(','));
        });
      });
    }

    // Progress
    if (data.userProgress) {
      rows.push('');
      rows.push('=== USER PROGRESS ===');
      rows.push('Metric,Value');
      rows.push(`Current Streak,${data.userProgress.streak}`);
      rows.push(`Longest Streak,${data.userProgress.longestStreak}`);
      rows.push(`Level,${data.userProgress.level}`);
      rows.push(`XP,${data.userProgress.xp}`);
      rows.push(`Total Tasks Completed,${data.userProgress.totalTasksCompleted}`);
      rows.push(`Total Frogs Eaten,${data.userProgress.totalFrogsEaten}`);
      rows.push(`Total Focus Minutes,${data.userProgress.totalFocusMinutes}`);
    }

    // Achievements
    if (data.achievements && data.achievements.length > 0) {
      rows.push('');
      rows.push('=== ACHIEVEMENTS ===');
      rows.push('Achievement ID,Unlocked At');
      data.achievements.forEach(achievement => {
        rows.push(`${achievement.id || achievement},${achievement.unlockedAt || ''}`);
      });
    }

    return rows.join('\n');
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const data = prepareExportData();
      let content, filename, mimeType;

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `focusflow-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        content = convertToCSV(data);
        filename = `focusflow-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const taskCount = (tasks?.length || 0) + (includeCompleted ? (completedTasks?.length || 0) : 0);
  const subtaskCount = includeSubtasks ? Object.values(subtasks || {}).reduce((acc, arr) => acc + arr.length, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Export Your Data</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-3 block">Export Format</label>
          <div className="flex gap-3">
            <button
              onClick={() => setExportFormat('json')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                exportFormat === 'json'
                  ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                  : 'glass-button text-white/70'
              }`}
            >
              <span className="text-lg mr-2">📄</span>
              JSON
            </button>
            <button
              onClick={() => setExportFormat('csv')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                exportFormat === 'csv'
                  ? 'bg-green-500/30 border border-green-500/50 text-white'
                  : 'glass-button text-white/70'
              }`}
            >
              <span className="text-lg mr-2">📊</span>
              CSV
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="text-white/60 text-sm block">Include in Export</label>

          <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="w-5 h-5 rounded accent-green-500"
            />
            <span className="text-white">Completed Tasks</span>
            <span className="text-white/40 text-sm ml-auto">{completedTasks?.length || 0}</span>
          </label>

          <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubtasks}
              onChange={(e) => setIncludeSubtasks(e.target.checked)}
              className="w-5 h-5 rounded accent-green-500"
            />
            <span className="text-white">Subtasks</span>
            <span className="text-white/40 text-sm ml-auto">{Object.values(subtasks || {}).reduce((acc, arr) => acc + arr.length, 0)}</span>
          </label>

          <label className="flex items-center gap-3 p-3 glass-card rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={includeProgress}
              onChange={(e) => setIncludeProgress(e.target.checked)}
              className="w-5 h-5 rounded accent-green-500"
            />
            <span className="text-white">Progress & Achievements</span>
          </label>
        </div>

        {/* Summary */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="text-white/60 text-sm mb-2">Export Summary</div>
          <div className="flex justify-between text-white">
            <span>Tasks:</span>
            <span>{taskCount}</span>
          </div>
          {includeSubtasks && subtaskCount > 0 && (
            <div className="flex justify-between text-white">
              <span>Subtasks:</span>
              <span>{subtaskCount}</span>
            </div>
          )}
          {includeProgress && (
            <div className="flex justify-between text-white">
              <span>Progress Data:</span>
              <span>✓</span>
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-4 rounded-2xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 transition-all"
        >
          {exporting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Exporting...
            </span>
          ) : (
            <span>📥 Download {exportFormat.toUpperCase()}</span>
          )}
        </button>

        <p className="text-white/40 text-xs text-center mt-4">
          Your data stays on your device. We never upload exports.
        </p>
      </div>
    </div>
  );
}

// Data Import functionality
export function DataImportModal({ isOpen, onClose, onImport }) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // Validate structure
      if (!data.tasks && !data.completedTasks) {
        throw new Error('Invalid export file: no tasks found');
      }

      setPreview({
        filename: file.name,
        tasks: data.tasks?.length || 0,
        completedTasks: data.completedTasks?.length || 0,
        subtasks: data.subtasks ? Object.values(data.subtasks).reduce((acc, arr) => acc + arr.length, 0) : 0,
        hasProgress: !!data.userProgress,
        hasAchievements: data.achievements?.length > 0,
        data
      });
    } catch (err) {
      setError(err.message || 'Failed to parse file');
    }
  };

  const handleImport = async () => {
    if (!preview?.data) return;

    setImporting(true);
    try {
      await onImport(preview.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Import Data</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {!preview ? (
          <>
            <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center mb-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-white font-medium">Select JSON Export File</p>
                <p className="text-white/40 text-sm mt-1">Click to browse</p>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300">
                {error}
              </div>
            )}

            <p className="text-white/40 text-xs text-center mt-4">
              Only JSON exports from FocusFlow are supported
            </p>
          </>
        ) : (
          <>
            <div className="glass-card p-4 rounded-xl mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-white font-medium">{preview.filename}</p>
                  <p className="text-white/40 text-sm">Ready to import</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white">
                  <span>Active Tasks:</span>
                  <span>{preview.tasks}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Completed Tasks:</span>
                  <span>{preview.completedTasks}</span>
                </div>
                {preview.subtasks > 0 && (
                  <div className="flex justify-between text-white">
                    <span>Subtasks:</span>
                    <span>{preview.subtasks}</span>
                  </div>
                )}
                {preview.hasProgress && (
                  <div className="flex justify-between text-white">
                    <span>Progress Data:</span>
                    <span>✓</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-yellow-300 text-sm">
                ⚠️ Importing will merge with your existing data. Duplicate tasks may be created.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4 text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-3 glass-button rounded-xl text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-3 rounded-xl font-semibold bg-green-500/30 border border-green-500/50 text-white disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import Data'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DataExportModal;
