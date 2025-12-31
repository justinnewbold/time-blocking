import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for FocusFlow

// Tasks
export async function getTasks() {
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .insert([task])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('focusflow_tasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function completeTask(id, xpEarned) {
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .update({ 
      completed: true, 
      completed_at: new Date().toISOString(),
      xp_earned: xpEarned,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// User Progress
export async function getUserProgress(userId) {
  const { data, error } = await supabase
    .from('focusflow_user_progress')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertUserProgress(progress) {
  const { data, error } = await supabase
    .from('focusflow_user_progress')
    .upsert([{ ...progress, updated_at: new Date().toISOString() }], { onConflict: 'user_id' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Focus Sessions
export async function createSession(session) {
  const { data, error } = await supabase
    .from('focusflow_sessions')
    .insert([session])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function completeSession(id, energyAfter) {
  const { data, error } = await supabase
    .from('focusflow_sessions')
    .update({ 
      completed: true, 
      ended_at: new Date().toISOString(),
      energy_after: energyAfter
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getTodaysSessions() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('focusflow_sessions')
    .select('*')
    .gte('started_at', today + 'T00:00:00')
    .lt('started_at', today + 'T23:59:59')
  
  if (error) throw error
  return data
}

// Calculate XP based on task difficulty and energy
export function calculateXP(difficulty, energyRequired, isFrog) {
  let baseXP = difficulty * 10 + energyRequired * 5
  if (isFrog) baseXP *= 2 // Double XP for eating the frog!
  return baseXP
}

// Calculate level from XP
export function calculateLevel(totalXP) {
  return Math.floor(totalXP / 100) + 1
}

// Sync initial tasks to database
export async function syncInitialTasks(tasks, userId) {
  const formattedTasks = tasks.map(task => ({
    user_id: userId,
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    energy_required: task.energyRequired || task.difficulty,
    is_frog: false,
    completed: task.completed || false,
    notes: task.notes || null,
    apple_reminder_id: task.appleReminderId || null
  }))
  
  const { data, error } = await supabase
    .from('focusflow_tasks')
    .upsert(formattedTasks, { onConflict: 'apple_reminder_id' })
    .select()
  
  if (error) throw error
  return data
}
