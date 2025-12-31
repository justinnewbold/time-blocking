-- FocusFlow Database Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focusflow_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT DEFAULT 'default_user',
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'personal',
  difficulty INTEGER NOT NULL DEFAULT 2 CHECK (difficulty >= 1 AND difficulty <= 5),
  energy_required INTEGER DEFAULT 2 CHECK (energy_required >= 1 AND energy_required <= 4),
  is_frog BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,
  notes TEXT,
  apple_reminder_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON focusflow_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON focusflow_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON focusflow_tasks(category);

-- ============================================
-- USER PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focusflow_user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL DEFAULT 'default_user',
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  frogs_eaten INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOCUS SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focusflow_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  task_id UUID REFERENCES focusflow_tasks(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  energy_before INTEGER CHECK (energy_before >= 1 AND energy_before <= 4),
  energy_after INTEGER CHECK (energy_after >= 1 AND energy_after <= 4),
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON focusflow_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON focusflow_sessions(started_at);

-- ============================================
-- DAILY ENERGY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focusflow_energy_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 4),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  log_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  UNIQUE(user_id, log_date)
);

-- ============================================
-- INITIAL SAMPLE TASKS (Optional)
-- ============================================
INSERT INTO focusflow_tasks (title, category, difficulty, is_frog, user_id) VALUES
  -- Patty Shack Tasks
  ('Review Q4 sales reports', 'patty-shack', 3, false, 'default_user'),
  ('Schedule manager meetings', 'patty-shack', 2, false, 'default_user'),
  ('Update inventory system', 'patty-shack', 4, true, 'default_user'),
  ('Review virtual brand performance', 'patty-shack', 3, false, 'default_user'),
  ('Call Denver location', 'patty-shack', 2, false, 'default_user'),
  ('Check Milwaukee staffing', 'patty-shack', 2, false, 'default_user'),
  ('Layton equipment maintenance', 'patty-shack', 3, false, 'default_user'),
  ('Review food costs', 'patty-shack', 4, true, 'default_user'),
  ('Update menu pricing', 'patty-shack', 3, false, 'default_user'),
  ('Schedule health inspections', 'patty-shack', 2, false, 'default_user'),
  
  -- Admin Tasks
  ('File quarterly taxes', 'admin', 5, true, 'default_user'),
  ('Review insurance policies', 'admin', 4, true, 'default_user'),
  ('Update business licenses', 'admin', 3, false, 'default_user'),
  ('Pay vendor invoices', 'admin', 2, false, 'default_user'),
  ('Review payroll', 'admin', 3, false, 'default_user'),
  
  -- Home Tasks
  ('Fix garage door', 'home', 4, true, 'default_user'),
  ('Clean out basement', 'home', 5, true, 'default_user'),
  ('Organize office', 'home', 3, false, 'default_user'),
  ('Schedule HVAC maintenance', 'home', 2, false, 'default_user'),
  ('Replace smoke detectors', 'home', 2, false, 'default_user'),
  
  -- Family Tasks
  ('Plan date night with Aimee', 'family', 1, false, 'default_user'),
  ('Mia''s recital prep', 'family', 2, false, 'default_user'),
  ('Family dinner planning', 'family', 2, false, 'default_user'),
  
  -- Music Tasks
  ('Practice KeyPerfect exercises', 'music', 2, false, 'default_user'),
  ('Record new track ideas', 'music', 3, false, 'default_user'),
  ('Update music studio setup', 'music', 3, false, 'default_user'),
  
  -- Personal Tasks
  ('Doctor appointment', 'personal', 2, false, 'default_user'),
  ('Gym session', 'personal', 2, false, 'default_user'),
  ('Read 30 mins', 'personal', 1, false, 'default_user'),
  ('Meditation', 'personal', 1, false, 'default_user')
ON CONFLICT DO NOTHING;

-- Create initial user progress
INSERT INTO focusflow_user_progress (user_id, total_xp, level) 
VALUES ('default_user', 0, 1)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- ============================================
-- Uncomment these when you add authentication

-- ALTER TABLE focusflow_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE focusflow_user_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE focusflow_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE focusflow_energy_log ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own tasks" ON focusflow_tasks
--   FOR SELECT USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can insert own tasks" ON focusflow_tasks
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- CREATE POLICY "Users can update own tasks" ON focusflow_tasks
--   FOR UPDATE USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can delete own tasks" ON focusflow_tasks
--   FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Today's stats view
CREATE OR REPLACE VIEW focusflow_today_stats AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE completed AND completed_at::date = CURRENT_DATE) as tasks_completed_today,
  COALESCE(SUM(xp_earned) FILTER (WHERE completed AND completed_at::date = CURRENT_DATE), 0) as xp_earned_today,
  COUNT(*) FILTER (WHERE is_frog AND completed AND completed_at::date = CURRENT_DATE) as frogs_eaten_today
FROM focusflow_tasks
GROUP BY user_id;

-- Weekly progress view
CREATE OR REPLACE VIEW focusflow_weekly_progress AS
SELECT 
  user_id,
  DATE_TRUNC('week', completed_at)::date as week_start,
  COUNT(*) as tasks_completed,
  COALESCE(SUM(xp_earned), 0) as xp_earned,
  COUNT(*) FILTER (WHERE is_frog) as frogs_eaten
FROM focusflow_tasks
WHERE completed = true AND completed_at IS NOT NULL
GROUP BY user_id, DATE_TRUNC('week', completed_at)
ORDER BY week_start DESC;

-- Print success message
SELECT 'FocusFlow database schema created successfully!' as status;
