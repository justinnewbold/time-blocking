'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          // Migrate local data to cloud on first sign in
          await migrateLocalData(session.user.id);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Migrate localStorage data to Supabase when user signs in
  const migrateLocalData = async (userId) => {
    try {
      // Get local tasks
      const localTasks = JSON.parse(localStorage.getItem('frog_tasks') || localStorage.getItem('focusflow_tasks') || '[]');
      
      if (localTasks.length > 0) {
        // Check if user already has cloud tasks
        const { data: existingTasks } = await supabase
          .from('focusflow_tasks')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        // Only migrate if no cloud tasks exist
        if (!existingTasks || existingTasks.length === 0) {
          const tasksToMigrate = localTasks.map(task => ({
            user_id: userId,
            title: task.title,
            category: task.category || 'work',
            difficulty: task.difficulty || 2,
            energy_required: task.energyRequired || task.difficulty || 2,
            is_frog: task.isFrog || false,
            completed: task.completed || false,
            completed_at: task.completedAt || null,
            notes: task.notes || null,
            estimated_minutes: task.estimatedMinutes || 25,
            actual_minutes: task.actualMinutes || null,
            subtasks: task.subtasks || [],
            recurring: task.recurring || null,
            due_date: task.dueDate || null,
            reminder_time: task.reminderTime || null
          }));

          await supabase
            .from('focusflow_tasks')
            .insert(tasksToMigrate);

          console.log(`✅ Migrated ${tasksToMigrate.length} tasks to cloud`);
        }
      }

      // Migrate user progress
      const localProgress = JSON.parse(localStorage.getItem('frog_progress') || localStorage.getItem('focusflow_progress') || 'null');
      
      if (localProgress) {
        await supabase
          .from('focusflow_user_progress')
          .upsert({
            user_id: userId,
            total_xp: localProgress.totalXp || 0,
            current_streak: localProgress.currentStreak || 0,
            longest_streak: localProgress.longestStreak || 0,
            tasks_completed: localProgress.tasksCompleted || 0,
            frogs_eaten: localProgress.frogsEaten || 0,
            last_activity: localProgress.lastActivity || new Date().toISOString()
          }, { onConflict: 'user_id' });

        console.log('✅ Migrated progress to cloud');
      }
    } catch (error) {
      console.error('Error migrating data:', error);
    }
  };

  // Sign up with email
  const signUp = async (email, password, displayName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            avatar_url: null
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in with email
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    loading,
    showAuthModal,
    setShowAuthModal,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
