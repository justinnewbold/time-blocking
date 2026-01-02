'use server';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Sync secret for security (set in Vercel env vars)
const SYNC_SECRET = process.env.APPLE_REMINDERS_SYNC_SECRET || 'frog-sync-2025';

// Map Apple Reminders list names to Frog categories
const LIST_TO_CATEGORY = {
  'Patty Shack': 'patty-shack',
  'Patty Shack - Denver': 'patty-shack',
  'Patty Shack - Milwaukee': 'patty-shack',
  'Patty Shack - Layton': 'patty-shack',
  'Admin': 'admin',
  'Home': 'home',
  'Family': 'family',
  'Music': 'music',
  'Personal': 'personal',
  'Work': 'work',
  'Shopping': 'shopping',
  'Frog': 'personal',
  'Reminders': 'personal'
};

// Map priority to difficulty (Apple: 0=none, 1=high, 5=medium, 9=low)
function mapPriorityToDifficulty(priority) {
  if (priority === 1) return 5;
  if (priority === 5) return 3;
  if (priority === 9) return 1;
  return 2;
}

// Estimate energy from title keywords
function estimateEnergy(title) {
  const lowEnergy = /quick|email|call|check|review|read/i;
  const mediumEnergy = /schedule|plan|update|fix|organize/i;
  const highEnergy = /complete|finish|build|create|implement|file|clean/i;
  const exhausting = /deep clean|overhaul|migrate|taxes|audit/i;
  
  if (exhausting.test(title)) return 4;
  if (highEnergy.test(title)) return 3;
  if (mediumEnergy.test(title)) return 2;
  if (lowEnergy.test(title)) return 1;
  return 2;
}

// POST: Receive reminders from Apple Shortcuts
export async function POST(request) {
  try {
    const body = await request.json();
    const { secret, action, reminders, user_id = 'default_user' } = body;
    
    if (secret !== SYNC_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (action === 'import') {
      return await importFromApple(reminders, user_id);
    } else if (action === 'export') {
      return await exportToApple(user_id);
    } else if (action === 'sync') {
      return await fullSync(reminders, user_id);
    } else if (action === 'complete') {
      return await markComplete(body.apple_id, user_id);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Apple Reminders sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Get tasks for export to Apple Reminders
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const user_id = searchParams.get('user_id') || 'default_user';
  const filter = searchParams.get('filter') || 'incomplete';
  
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    let query = supabase
      .from('focusflow_tasks')
      .select('*')
      .eq('user_id', user_id);
    
    if (filter === 'incomplete') {
      query = query.eq('completed', false);
    }
    
    const { data: tasks, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    const appleFormat = tasks.map(task => ({
      id: task.id,
      title: task.title,
      list: getCategoryDisplayName(task.category),
      notes: task.notes || `[Frog] Energy: ${task.energy_required}/4 | Difficulty: ${task.difficulty}/5${task.is_frog ? ' | 🐸 Frog!' : ''}`,
      priority: mapDifficultyToPriority(task.difficulty),
      completed: task.completed,
      frog_id: task.id,
      apple_id: task.apple_reminder_id
    }));
    
    return NextResponse.json({ success: true, count: appleFormat.length, tasks: appleFormat });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function importFromApple(reminders, user_id) {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };
  
  for (const reminder of reminders) {
    try {
      const { data: existing } = await supabase
        .from('focusflow_tasks')
        .select('id, completed')
        .eq('apple_reminder_id', reminder.id)
        .single();
      
      const category = LIST_TO_CATEGORY[reminder.list] || 'personal';
      const difficulty = mapPriorityToDifficulty(reminder.priority || 0);
      
      if (existing) {
        await supabase.from('focusflow_tasks').update({
          title: reminder.title,
          category,
          completed: reminder.completed || false,
          notes: reminder.notes,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        results.updated++;
      } else {
        await supabase.from('focusflow_tasks').insert({
          user_id,
          title: reminder.title,
          category,
          difficulty,
          energy_required: estimateEnergy(reminder.title),
          is_frog: difficulty >= 4,
          completed: reminder.completed || false,
          notes: reminder.notes,
          apple_reminder_id: reminder.id
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push({ reminder: reminder.title, error: err.message });
    }
  }
  
  return NextResponse.json({ success: true, results });
}

async function exportToApple(user_id) {
  const { data: tasks, error } = await supabase
    .from('focusflow_tasks')
    .select('*')
    .eq('user_id', user_id)
    .eq('completed', false)
    .is('apple_reminder_id', null)
    .order('difficulty', { ascending: false });
  
  if (error) throw error;
  
  const appleFormat = tasks.map(task => ({
    title: task.is_frog ? `🐸 ${task.title}` : task.title,
    list: getCategoryDisplayName(task.category),
    notes: `[Frog ID: ${task.id}]\nEnergy: ${task.energy_required}/4\nDifficulty: ${task.difficulty}/5`,
    priority: mapDifficultyToPriority(task.difficulty),
    frog_id: task.id
  }));
  
  return NextResponse.json({ success: true, count: appleFormat.length, reminders: appleFormat });
}

async function fullSync(appleReminders, user_id) {
  const results = { imported: { created: 0, updated: 0 }, exported: { count: 0 }, completed_sync: { count: 0 } };
  
  for (const reminder of appleReminders) {
    const { data: existing } = await supabase
      .from('focusflow_tasks')
      .select('id, completed')
      .eq('apple_reminder_id', reminder.id)
      .single();
    
    const category = LIST_TO_CATEGORY[reminder.list] || 'personal';
    
    if (existing) {
      if (reminder.completed && !existing.completed) {
        await supabase.from('focusflow_tasks').update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        results.completed_sync.count++;
      }
      results.imported.updated++;
    } else {
      const difficulty = mapPriorityToDifficulty(reminder.priority || 0);
      await supabase.from('focusflow_tasks').insert({
        user_id,
        title: reminder.title,
        category,
        difficulty,
        energy_required: estimateEnergy(reminder.title),
        is_frog: difficulty >= 4,
        completed: reminder.completed || false,
        notes: reminder.notes,
        apple_reminder_id: reminder.id
      });
      results.imported.created++;
    }
  }
  
  const { data: toExport } = await supabase
    .from('focusflow_tasks')
    .select('*')
    .eq('user_id', user_id)
    .eq('completed', false)
    .is('apple_reminder_id', null);
  
  results.exported.count = (toExport || []).length;
  
  return NextResponse.json({
    success: true,
    results,
    export_to_apple: (toExport || []).map(task => ({
      title: task.is_frog ? `🐸 ${task.title}` : task.title,
      list: getCategoryDisplayName(task.category),
      notes: `[Frog ID: ${task.id}]`,
      priority: mapDifficultyToPriority(task.difficulty),
      frog_id: task.id
    }))
  });
}

async function markComplete(apple_id, user_id) {
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .update({ completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('apple_reminder_id', apple_id)
    .eq('user_id', user_id)
    .select()
    .single();
  
  if (error) throw error;
  return NextResponse.json({ success: true, task: data });
}

function getCategoryDisplayName(category) {
  const names = { 'patty-shack': 'Patty Shack', 'admin': 'Admin', 'home': 'Home', 'family': 'Family', 'music': 'Music', 'personal': 'Personal', 'work': 'Work', 'shopping': 'Shopping' };
  return names[category] || 'Reminders';
}

function mapDifficultyToPriority(difficulty) {
  if (difficulty >= 5) return 1;
  if (difficulty >= 3) return 5;
  return 9;
}
