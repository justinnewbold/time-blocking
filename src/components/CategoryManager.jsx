'use client';

import { useState, useEffect } from 'react';

// Storage helper
const Storage = {
  get: (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`frog_${key}`) || localStorage.getItem(`focusflow_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`frog_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// Default categories
export const DEFAULT_CATEGORIES = {
  'patty-shack': { name: 'Patty Shack', color: '#ef4444', emoji: '🍔', isDefault: true },
  'admin': { name: 'Admin', color: '#f59e0b', emoji: '📋', isDefault: true },
  'home': { name: 'Home', color: '#10b981', emoji: '🏠', isDefault: true },
  'family': { name: 'Family', color: '#ec4899', emoji: '👨‍👩‍👧', isDefault: true },
  'music': { name: 'Music', color: '#8b5cf6', emoji: '🎵', isDefault: true },
  'personal': { name: 'Personal', color: '#06b6d4', emoji: '✨', isDefault: true },
};

// Available colors for custom categories
export const AVAILABLE_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

// Available emojis for custom categories
export const AVAILABLE_EMOJIS = [
  '💼', '📁', '📂', '🗂️', '📋', '📝', '✏️', '📌',
  '🎯', '⭐', '💡', '🔔', '⚡', '🔥', '💪', '🏆',
  '🎨', '🎵', '🎮', '📱', '💻', '🖥️', '⌨️', '🔧',
  '🛠️', '🏠', '🏢', '🏗️', '🚗', '✈️', '🌍', '🌟',
  '💰', '💵', '📈', '📊', '🧮', '📅', '⏰', '📞',
  '✉️', '📧', '💬', '🗣️', '👥', '👨‍👩‍👧', '❤️', '🎉',
  '🏃', '🧘', '🏋️', '🥗', '☕', '📚', '📖', '🎓',
  '✨', '🌈', '🦋', '🌸', '🌺', '🍀', '🐸', '🦄',
];

// Get all categories (default + custom)
export function getCategories() {
  const customCategories = Storage.get('customCategories', {});
  return { ...DEFAULT_CATEGORIES, ...customCategories };
}

// Save custom categories
export function saveCustomCategories(categories) {
  Storage.set('customCategories', categories);
}

// Add a new custom category
export function addCustomCategory(key, category) {
  const customCategories = Storage.get('customCategories', {});
  customCategories[key] = { ...category, isDefault: false };
  saveCustomCategories(customCategories);
  return customCategories;
}

// Update a custom category
export function updateCustomCategory(key, category) {
  const customCategories = Storage.get('customCategories', {});
  if (customCategories[key]) {
    customCategories[key] = { ...customCategories[key], ...category };
    saveCustomCategories(customCategories);
  }
  return customCategories;
}

// Delete a custom category
export function deleteCustomCategory(key) {
  const customCategories = Storage.get('customCategories', {});
  delete customCategories[key];
  saveCustomCategories(customCategories);
  return customCategories;
}

// Category Editor Modal
export function CategoryEditor({ category, categoryKey, onSave, onDelete, onClose }) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || AVAILABLE_COLORS[0].value);
  const [emoji, setEmoji] = useState(category?.emoji || AVAILABLE_EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const isEditing = !!category;
  const isDefault = category?.isDefault;
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    const key = categoryKey || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    onSave(key, { name: name.trim(), color, emoji });
    onClose();
  };
  
  const handleDelete = () => {
    if (confirm('Delete this category? Tasks will keep their current category.')) {
      onDelete(categoryKey);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Edit Category' : 'New Category'}
            </h2>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>
          
          {/* Preview */}
          <div className="flex items-center justify-center mb-6">
            <div 
              className="px-6 py-3 rounded-2xl flex items-center gap-3"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}50`, borderWidth: 2 }}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-white font-medium">{name || 'Category Name'}</span>
            </div>
          </div>
          
          {/* Name Input */}
          <div className="mb-4">
            <label className="text-white/60 text-sm mb-2 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-white/30"
              disabled={isDefault}
              maxLength={20}
            />
          </div>
          
          {/* Emoji Picker */}
          <div className="mb-4">
            <label className="text-white/60 text-sm mb-2 block">Icon</label>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-full glass-button p-3 rounded-xl flex items-center justify-between"
              disabled={isDefault}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-white/40 text-sm">{showEmojiPicker ? 'Close' : 'Choose icon'}</span>
            </button>
            
            {showEmojiPicker && !isDefault && (
              <div className="mt-2 p-3 bg-white/5 rounded-xl max-h-40 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {AVAILABLE_EMOJIS.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                      className={`p-2 rounded-lg text-xl hover:bg-white/10 transition-colors ${
                        emoji === e ? 'bg-white/20 ring-2 ring-white/30' : ''
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Color Picker */}
          <div className="mb-6">
            <label className="text-white/60 text-sm mb-2 block">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {AVAILABLE_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => !isDefault && setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110' : ''
                  } ${isDefault ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.value }}
                  disabled={isDefault}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          
          {isDefault && (
            <p className="text-yellow-400/80 text-xs mb-4 text-center">
              ⚠️ Default categories cannot be edited
            </p>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            {isEditing && !isDefault && (
              <button
                onClick={handleDelete}
                className="flex-1 glass-button py-3 rounded-xl text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || isDefault}
              className="flex-1 glass-button py-3 rounded-xl bg-green-500/20 text-green-400 font-medium disabled:opacity-50"
            >
              {isEditing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Manager List Component (for Settings)
export function CategoryManagerList({ onCategoriesChange }) {
  const [categories, setCategories] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  useEffect(() => {
    setCategories(getCategories());
  }, []);
  
  const handleSave = (key, category) => {
    if (editingCategory) {
      updateCustomCategory(key, category);
    } else {
      addCustomCategory(key, category);
    }
    const updated = getCategories();
    setCategories(updated);
    onCategoriesChange?.(updated);
    setEditingCategory(null);
    setShowEditor(false);
  };
  
  const handleDelete = (key) => {
    deleteCustomCategory(key);
    const updated = getCategories();
    setCategories(updated);
    onCategoriesChange?.(updated);
    setEditingCategory(null);
    setShowEditor(false);
  };
  
  const handleEdit = (key, category) => {
    setEditingCategory({ key, ...category });
    setShowEditor(true);
  };
  
  const defaultCats = Object.entries(categories).filter(([_, c]) => c.isDefault);
  const customCats = Object.entries(categories).filter(([_, c]) => !c.isDefault);
  
  return (
    <div>
      {/* Custom Categories */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white/60 text-sm">Custom Categories</h4>
          <button
            onClick={() => { setEditingCategory(null); setShowEditor(true); }}
            className="text-green-400 text-sm hover:text-green-300"
          >
            + Add New
          </button>
        </div>
        
        {customCats.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            No custom categories yet
          </p>
        ) : (
          <div className="space-y-2">
            {customCats.map(([key, cat]) => (
              <button
                key={key}
                onClick={() => handleEdit(key, cat)}
                className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}30` }}
                >
                  <span className="text-xl">{cat.emoji}</span>
                </div>
                <span className="text-white flex-1 text-left">{cat.name}</span>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Default Categories */}
      <div>
        <h4 className="text-white/60 text-sm mb-2">Default Categories</h4>
        <div className="grid grid-cols-3 gap-2">
          {defaultCats.map(([key, cat]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1 p-2 bg-white/5 rounded-xl opacity-60"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${cat.color}30` }}
              >
                <span>{cat.emoji}</span>
              </div>
              <span className="text-white/60 text-xs">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Editor Modal */}
      {showEditor && (
        <CategoryEditor
          category={editingCategory}
          categoryKey={editingCategory?.key}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowEditor(false); setEditingCategory(null); }}
        />
      )}
    </div>
  );
}

// Hook to get categories with reactivity
export function useCategories() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  useEffect(() => {
    setCategories(getCategories());
    
    // Listen for storage changes
    const handleStorage = (e) => {
      if (e.key === 'frog_customCategories') {
        setCategories(getCategories());
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  const refresh = () => setCategories(getCategories());
  
  return [categories, refresh];
}

export default CategoryManagerList;
