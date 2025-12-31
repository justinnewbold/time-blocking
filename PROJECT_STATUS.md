# 🐸 Frog - Project Status

> **Compassionate productivity app that works with your brain, not against it.**

## 📍 Quick Reference

| Item | Value |
|------|-------|
| **Live App** | https://frog.newbold.cloud |
| **Stats Dashboard** | https://frog.newbold.cloud/stats |
| **Vercel Dashboard** | https://vercel.com/newbold-cloud/time-blocking |
| **GitHub Repo** | https://github.com/justinnewbold/time-blocking |
| **Supabase Project** | `wektbfkzbxvtxsremnnk` (Vercel project) |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/wektbfkzbxvtxsremnnk |

---

## 🔑 Key Configuration

### Vercel
- **Team ID**: `team_SXtSdRdWwV7wzMteZsU2h1AF`
- **Project ID**: `prj_VHQLqK8jUwuukC0h70G95aaSkxk0`
- **Domain**: `frog.newbold.cloud`

### Supabase
- **Project Ref**: `wektbfkzbxvtxsremnnk`
- **URL**: `https://wektbfkzbxvtxsremnnk.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indla3RiZmt6Ynh2dHhzcmVtbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDcyNjMsImV4cCI6MjA4MTQyMzI2M30.-oLnJRoDBpqgzDZ7bM3fm6TXBNGH6SaRpnKDiHQZ3_4`

### Database Tables
- `focusflow_tasks` - All tasks (30 seeded)
- `focusflow_user_progress` - XP, level, streaks
- `focusflow_sessions` - Focus session history
- `focusflow_energy_log` - Daily energy tracking

### User
- **User ID**: `justin`
- **Categories**: patty-shack, admin, home, family, music, personal

---

## ✅ Completed Features

- [x] Core app with energy check-in, task management, focus timer
- [x] Gamification (XP, levels, streaks)
- [x] "Eat the Frog" methodology - tackle hardest task first
- [x] Category filtering and energy-based task filtering
- [x] PWA support (installable, offline capable)
- [x] Service worker with caching
- [x] Push notification infrastructure (service worker ready)
- [x] Supabase database integration
- [x] Cloud sync with offline fallback
- [x] Add task functionality
- [x] Timer presets (5, 15, 25, 45 min)
- [x] Celebration animations on task completion
- [x] Sync status indicator
- [x] **Rebrand to "Frog"** ✅
- [x] **Domain frog.newbold.cloud connected** ✅
- [x] **Stats Dashboard** ✅ (completed Dec 31, 2025)
  - Weekly XP bar chart
  - Focus time tracking chart
  - Category breakdown with progress bars
  - 14-day streak calendar
  - Level progress display
  - Quick stats cards (Tasks Done, Frogs Eaten, Streak, Focus Time)
  - Navigation from main app (header button + clickable bottom stats)

---

## 📋 To-Do List

### 🔴 Priority 1 - Next Up
- [ ] **Push Notifications** - Daily check-in reminders, streak alerts, timer completion

### 🟠 Priority 2 - High Impact
- [ ] **Authentication (Supabase Auth)** - Email/password or magic link login
- [ ] **Recurring Tasks** - Daily/weekly/monthly repeat options
- [ ] **Apple Reminders Sync** - Two-way sync with iOS Reminders

### 🟡 Priority 3 - Medium Impact
- [ ] **Google Calendar Integration** - Auto-block time during focus sessions
- [ ] **Sound Effects** - Completion sounds, timer alerts, level up sounds
- [ ] **Due Dates & Priorities** - Add deadlines, sort by urgency
- [ ] **AI Task Assistant** - Claude API to suggest tasks based on energy

### 🟢 Priority 4 - Future
- [ ] **Apple Watch App** - Quick task completion from wrist
- [ ] **Siri Shortcuts** - Voice commands to add tasks
- [ ] **Family Sharing** - Let Aimee see/add family tasks
- [ ] **Data Export** - CSV export for analysis
- [ ] **Achievements System** - Unlock badges for milestones
- [ ] **Dark/Light Theme Toggle** - User preference for theme
- [ ] **Task Notes & Subtasks** - Add details and checklists to tasks
- [ ] **Pomodoro Stats** - Track focus sessions over time
- [ ] **Widget Support** - iOS/Android home screen widgets
- [ ] **Settings Page** - Customize timer presets, notifications, themes

---

## 🏗️ Technical Architecture

```
src/
├── app/
│   ├── page.jsx          # Main app component (Frog)
│   ├── layout.jsx        # Root layout with PWA meta tags
│   ├── globals.css       # Tailwind styles
│   ├── stats/
│   │   └── page.jsx      # Stats Dashboard 📊
│   └── offline/
│       └── page.jsx      # Offline fallback page
├── components/
│   ├── InstallPrompt.jsx # PWA install prompt (green theme)
│   ├── ServiceWorkerRegister.jsx
│   └── NotificationManager.jsx
├── lib/
│   └── supabase.js       # Supabase client & helpers
public/
├── manifest.json         # PWA manifest (Frog branding)
├── sw.js                 # Service worker
├── icon.svg              # App icon
└── icons/                # PWA icons (various sizes)
```

---

## 🔄 Last Session Summary

**Date**: December 31, 2025 (continued)

**What was done**:
1. ✅ Created comprehensive Stats Dashboard at /stats
   - Weekly XP bar chart showing 7-day progress
   - Focus time chart tracking minutes per day
   - Category breakdown with color-coded progress bars
   - 14-day streak calendar visualization
   - Level hero section with XP progress to next level
   - Quick stats cards for key metrics
2. ✅ Added navigation between main app and stats
   - Header button (📊) links to stats page
   - Bottom stats bar is clickable with "Tap for detailed stats" hint
   - Back button on stats page returns to main app
3. ✅ Verified deployment successful at frog.newbold.cloud/stats

**Files Created/Updated**:
- `src/app/stats/page.jsx` - NEW: Full stats dashboard (459 lines)
- `src/app/page.jsx` - UPDATED: Added Link import, stats navigation

**Commits this session**:
- `1a158f9d` - feat: Add Stats Dashboard with XP charts, category breakdown, streak calendar 📊
- `e2a851a6` - feat: Add navigation to Stats Dashboard - header button + clickable bottom stats

**Current state**:
- App is live at https://frog.newbold.cloud 
- Stats Dashboard is live at https://frog.newbold.cloud/stats
- All features deployed and working
- Next priority: Push Notifications

---

## 📝 Notes for Claude

When continuing this project:
1. Always check this file first for current status
2. Update the to-do list after completing each task
3. Update "Last Session Summary" at end of each session
4. Use the stored IDs/keys above for API calls
5. User prefers cloud-only development (no local CLI commands)
6. Always push changes and provide PR/commit links
7. App is now called **"Frog"** (not FocusFlow)
8. Theme color is now **green** (#22c55e) not purple
9. Stats Dashboard is at `/stats` route

---

## 📊 Database Schema Quick Reference

```sql
-- Tasks (table names kept as focusflow_ for backwards compatibility)
focusflow_tasks: id, user_id, title, category, difficulty, 
                 energy_required, is_frog, completed, completed_at,
                 xp_earned, notes, created_at, updated_at

-- User Progress  
focusflow_user_progress: id, user_id, total_xp, level, current_streak,
                         longest_streak, tasks_completed, frogs_eaten,
                         total_focus_minutes, last_activity_date

-- Sessions
focusflow_sessions: id, user_id, task_id, duration_minutes,
                    energy_before, energy_after, completed,
                    started_at, ended_at, notes

-- Energy Log
focusflow_energy_log: id, user_id, energy_level, logged_at, 
                      log_date, notes
```

---

## 📱 Stats Dashboard Features

The stats dashboard includes:

1. **Level & XP Hero Section**
   - Current level display with frog emoji
   - Total XP earned
   - Progress bar to next level

2. **Quick Stats Grid (2x2)**
   - Tasks Completed (total)
   - Frogs Eaten (hardest tasks)
   - Current Streak (with best streak)
   - Focus Time (minutes + hours)

3. **Weekly Summary**
   - Total XP this week
   - Average daily XP
   - Active days count

4. **Weekly XP Chart**
   - 7-day bar chart
   - Today highlighted in green
   - XP values shown above bars

5. **Focus Time Chart**
   - 7-day bar chart (purple theme)
   - Minutes tracked per day
   - Today highlighted

6. **Category Breakdown**
   - All 6 categories with colored progress bars
   - Shows count per category
   - Emoji indicators

7. **Streak Calendar**
   - 14-day grid view
   - Active days highlighted in green
   - Easy visual of consistency

8. **Motivational Footer**
   - Dynamic messages based on progress

---

*Last updated: December 31, 2025*
