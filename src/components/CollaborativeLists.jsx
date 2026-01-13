'use client';

import { useState, useEffect, useCallback } from 'react';

// Collaborative list roles
const ROLES = {
  owner: { label: 'Owner', color: 'purple', permissions: ['read', 'write', 'share', 'delete'] },
  editor: { label: 'Editor', color: 'blue', permissions: ['read', 'write'] },
  viewer: { label: 'Viewer', color: 'gray', permissions: ['read'] },
};

// Hook for collaborative lists
export function useCollaborativeLists(supabase, userId) {
  const [sharedLists, setSharedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load shared lists
  useEffect(() => {
    if (!supabase || !userId) {
      setIsLoading(false);
      return;
    }

    const loadLists = async () => {
      try {
        // Get lists user owns
        const { data: ownedLists, error: ownedError } = await supabase
          .from('focusflow_shared_lists')
          .select('*')
          .eq('owner_id', userId);

        if (ownedError) throw ownedError;

        // Get lists shared with user
        const { data: sharedWithMe, error: sharedError } = await supabase
          .from('focusflow_list_members')
          .select(`
            role,
            list:focusflow_shared_lists(*)
          `)
          .eq('user_id', userId);

        if (sharedError) throw sharedError;

        const allLists = [
          ...(ownedLists || []).map(l => ({ ...l, role: 'owner' })),
          ...(sharedWithMe || []).map(m => ({ ...m.list, role: m.role })),
        ];

        setSharedLists(allLists);
      } catch (err) {
        console.error('Failed to load shared lists:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadLists();
  }, [supabase, userId]);

  // Create new shared list
  const createList = useCallback(async (name, description = '') => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('focusflow_shared_lists')
        .insert({
          owner_id: userId,
          name,
          description,
          share_code: generateShareCode(),
        })
        .select()
        .single();

      if (error) throw error;

      setSharedLists(prev => [...prev, { ...data, role: 'owner' }]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [supabase, userId]);

  // Join list via share code
  const joinList = useCallback(async (shareCode) => {
    if (!supabase || !userId) return null;

    try {
      // Find list by share code
      const { data: list, error: findError } = await supabase
        .from('focusflow_shared_lists')
        .select('*')
        .eq('share_code', shareCode.toUpperCase())
        .single();

      if (findError) throw new Error('List not found');

      // Check if already a member
      const { data: existing } = await supabase
        .from('focusflow_list_members')
        .select('*')
        .eq('list_id', list.id)
        .eq('user_id', userId)
        .single();

      if (existing) throw new Error('Already a member of this list');

      // Add as viewer
      const { error: joinError } = await supabase
        .from('focusflow_list_members')
        .insert({
          list_id: list.id,
          user_id: userId,
          role: 'viewer',
        });

      if (joinError) throw joinError;

      setSharedLists(prev => [...prev, { ...list, role: 'viewer' }]);
      return list;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [supabase, userId]);

  // Update member role
  const updateMemberRole = useCallback(async (listId, memberId, newRole) => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('focusflow_list_members')
        .update({ role: newRole })
        .eq('list_id', listId)
        .eq('user_id', memberId);

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [supabase]);

  // Remove member
  const removeMember = useCallback(async (listId, memberId) => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('focusflow_list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', memberId);

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [supabase]);

  // Leave list
  const leaveList = useCallback(async (listId) => {
    if (!supabase || !userId) return false;

    try {
      const { error } = await supabase
        .from('focusflow_list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);

      if (error) throw error;

      setSharedLists(prev => prev.filter(l => l.id !== listId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [supabase, userId]);

  // Delete list (owner only)
  const deleteList = useCallback(async (listId) => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('focusflow_shared_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      setSharedLists(prev => prev.filter(l => l.id !== listId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [supabase]);

  // Get list tasks
  const getListTasks = useCallback(async (listId) => {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('focusflow_tasks')
        .select('*')
        .eq('shared_list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [supabase]);

  // Add task to list
  const addTaskToList = useCallback(async (listId, task) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('focusflow_tasks')
        .insert({
          ...task,
          user_id: userId,
          shared_list_id: listId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [supabase, userId]);

  return {
    sharedLists,
    isLoading,
    error,
    createList,
    joinList,
    updateMemberRole,
    removeMember,
    leaveList,
    deleteList,
    getListTasks,
    addTaskToList,
  };
}

// Generate share code
function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Collaborative Lists Modal
export function CollaborativeListsModal({
  isOpen,
  onClose,
  collaborativeLists,
  onSelectList,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [newListName, setNewListName] = useState('');
  const [joinError, setJoinError] = useState('');

  if (!isOpen) return null;

  const { sharedLists, isLoading, createList, joinList } = collaborativeLists;

  const handleCreate = async () => {
    if (!newListName.trim()) return;

    const list = await createList(newListName.trim());
    if (list) {
      setNewListName('');
      setShowCreate(false);
    }
  };

  const handleJoin = async () => {
    if (!shareCode.trim()) return;

    setJoinError('');
    const list = await joinList(shareCode.trim());
    if (list) {
      setShareCode('');
      setShowJoin(false);
    } else {
      setJoinError('Could not find list with this code');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>👥</span> Shared Lists
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            className="flex-1 py-3 rounded-xl glass-button text-white"
          >
            ➕ Create List
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            className="flex-1 py-3 rounded-xl glass-button text-white"
          >
            🔗 Join List
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="glass-card p-4 rounded-xl mb-4">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="w-full glass-input px-4 py-3 rounded-xl text-white mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 glass-button rounded-lg text-white/60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newListName.trim()}
                className="flex-1 py-2 rounded-lg bg-green-500/30 border border-green-500/50 text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Join Form */}
        {showJoin && (
          <div className="glass-card p-4 rounded-xl mb-4">
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              placeholder="Enter share code..."
              className="w-full glass-input px-4 py-3 rounded-xl text-white mb-3 text-center tracking-widest font-mono"
              maxLength={6}
              autoFocus
            />
            {joinError && (
              <p className="text-red-400 text-sm mb-3">{joinError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowJoin(false); setJoinError(''); }}
                className="flex-1 py-2 glass-button rounded-lg text-white/60"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={shareCode.length < 6}
                className="flex-1 py-2 rounded-lg bg-blue-500/30 border border-blue-500/50 text-white disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        )}

        {/* Lists */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          ) : sharedLists.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">👥</span>
              <p className="text-white/60 mt-2">No shared lists yet</p>
              <p className="text-white/40 text-sm">Create one or join with a code</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => {
                    onSelectList(list);
                    onClose();
                  }}
                  className="w-full glass-card p-4 rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">{list.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${ROLES[list.role].color}-500/20 text-${ROLES[list.role].color}-300`}>
                      {ROLES[list.role].label}
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-white/60 text-sm mb-2">{list.description}</p>
                  )}
                  {list.role === 'owner' && (
                    <p className="text-white/40 text-xs">
                      Share code: <span className="font-mono">{list.share_code}</span>
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// List Detail Modal
export function ListDetailModal({
  isOpen,
  onClose,
  list,
  collaborativeLists,
  onTaskSelect,
}) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareCode, setShowShareCode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { getListTasks, addTaskToList, leaveList, deleteList } = collaborativeLists;

  useEffect(() => {
    if (!isOpen || !list) return;

    const loadData = async () => {
      setIsLoading(true);
      const taskData = await getListTasks(list.id);
      setTasks(taskData);
      setIsLoading(false);
    };

    loadData();
  }, [isOpen, list, getListTasks]);

  if (!isOpen || !list) return null;

  const canEdit = ['owner', 'editor'].includes(list.role);
  const canShare = list.role === 'owner';

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !canEdit) return;

    const task = await addTaskToList(list.id, {
      title: newTaskTitle.trim(),
      category: 'personal',
      difficulty: 2,
      estimatedMinutes: 25,
    });

    if (task) {
      setTasks([task, ...tasks]);
      setNewTaskTitle('');
    }
  };

  const handleLeave = async () => {
    if (confirm('Leave this shared list?')) {
      await leaveList(list.id);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this list? All tasks will be removed.')) {
      await deleteList(list.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{list.name}</h2>
            <p className="text-white/40 text-sm capitalize">{ROLES[list.role].label}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        {/* Share Code */}
        {canShare && (
          <div className="glass-card p-4 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Share Code</p>
                <p className="text-white font-mono text-lg tracking-widest">
                  {showShareCode ? list.share_code : '••••••'}
                </p>
              </div>
              <button
                onClick={() => setShowShareCode(!showShareCode)}
                className="text-white/60 hover:text-white"
              >
                {showShareCode ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}

        {/* Add Task */}
        {canEdit && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 glass-input px-4 py-3 rounded-xl text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="px-4 rounded-xl bg-green-500/30 border border-green-500/50 text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        )}

        {/* Tasks */}
        <div className="flex-1 overflow-y-auto mb-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">📝</span>
              <p className="text-white/60 mt-2">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl transition-all ${
                    task.completed
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'glass-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      task.completed
                        ? 'bg-green-500 text-white text-sm'
                        : 'border border-white/30'
                    }`}>
                      {task.completed && '✓'}
                    </div>
                    <div className="flex-1">
                      <p className={`${task.completed ? 'text-white/60 line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      {task.assignee_name && (
                        <p className="text-white/40 text-xs">Assigned to {task.assignee_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {list.role === 'owner' ? (
            <button
              onClick={handleDelete}
              className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300"
            >
              Delete List
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="flex-1 py-3 rounded-xl glass-button text-white/60"
            >
              Leave List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared Lists Card (for dashboard)
export function SharedListsCard({ sharedLists, onClick }) {
  if (sharedLists.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="w-full glass-card p-4 rounded-xl text-left hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">👥 Shared Lists</span>
        <span className="text-white/40 text-sm">{sharedLists.length} lists</span>
      </div>
      <div className="flex -space-x-2">
        {sharedLists.slice(0, 4).map((list, idx) => (
          <div
            key={list.id}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-gray-900"
            style={{ zIndex: 4 - idx }}
          >
            {list.name.charAt(0)}
          </div>
        ))}
        {sharedLists.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs border-2 border-gray-900">
            +{sharedLists.length - 4}
          </div>
        )}
      </div>
    </button>
  );
}

export default CollaborativeListsModal;
