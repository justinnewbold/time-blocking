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
- [x] Supabase database integration
- [x] Cloud sync with offline fallback
- [x] Add task functionality
- [x] Timer presets (5, 15, 25, 45 min)
- [x] Celebration animations on task completion
- [x] Sync status indicator
- [x] **Rebrand to "Frog"** ✅
- [x] **Domain frog.newbold.cloud connected** ✅
- [x] **Stats Dashboard** ✅
  - Weekly XP bar chart
  - Focus time tracking chart
  - Category breakdown with progress bars
  - 14-day streak calendar
  - Level progress display
  - Quick stats cards
- [x] **Timer Completion Notifications** ✅ (completed Dec 31, 2025)
  - Push notification when timer ends
  - Sound effect (sine wave tone)
  - Vibration pattern for mobile
  - Shows XP earned and task name
  - Notification settings panel (🔔 button)
  - Enable/disable per notification type
  - Test notification button

---

## 📋 To-Do List

### 🔴 Priority 1 - Next Up
- [ ] **Daily Check-in Reminders** - Morning push notification to set energy
- [ ] **Streak Protection Alerts** - Evening reminder to maintain streak

### 🟠 Priority 2 - High Impact
- [ ] **Authentication (Supabase Auth)** - Email/password or magic link login
- [ ] **Recurring Tasks** - Daily/weekly/monthly repeat options
- [ ] **Apple Reminders Sync** - Two-way sync with iOS Reminders

### 🟡 Priority 3 - Medium Impact
- [ ] **Google Calendar Integration** - Auto-block time during focus sessions
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
│   └── NotificationManager.jsx  # 🔔 Notification settings
├── lib/
│   └── supabase.js       # Supabase client & helpers
public/
├── manifest.json         # PWA manifest (Frog branding)
├── sw.js                 # Service worker (v4 with notifications)
├── icon.svg              # App icon
└── icons/                # PWA icons (various sizes)
```

---

## 🔔 Notification System

### Features Implemented
- **Timer Completion**: Push notification + sound + vibration when focus timer ends
- **Notification Settings Panel**: Accessible via 🔔 button in header
- **Permission Request**: Proper browser permission flow
- **Test Notification**: Button to send test notification

### Notification Types Available
| Type | Description | Trigger |
|------|-------------|---------|
| `FOCUS_END` | Timer complete | When timer reaches 0 |
| `MORNING_REMINDER` | Daily check-in | Scheduled (7-10am) |
| `FROG_REMINDER` | Tackle frog task | After delay |
| `STREAK_REMINDER` | Maintain streak | Evening |
| `CELEBRATION` | Level up/achievement | On milestone |

### Sound & Vibration
- **Timer Complete Sound**: 880Hz sine wave (A5 note), 0.5 second
- **Timer Complete Vibration**: `[200, 100, 200, 100, 200, 100, 400]` pattern
- **Other Notifications Vibration**: `[100, 50, 100]` pattern

---

## 🔄 Last Session Summary

**Date**: December 31, 2025 (continued)

**What was done**:
1. ✅ Implemented Timer Completion Notifications
   - Added NotificationManager import and integration
   - Push notification when timer completes
   - Sound effect using Web Audio API
   - Vibration pattern for mobile devices
   - Shows task name and XP earned
2. ✅ Added Notification Settings Panel
   - 🔔 button in header opens settings
   - Toggle each notification type
   - Set morning reminder time
   - Test notification button
   - Permission request flow
3. ✅ Enhanced Service Worker
   - Updated to v4 with /stats route caching
   - Celebratory vibration pattern for timer completion
   - RequireInteraction for timer notifications

**Files Created/Updated**:
- `src/app/page.jsx` - Added notification integration, sound, vibration
- `public/sw.js` - Enhanced v4 with notification handling

**Commits this session**:
- `1a158f9d` - feat: Add Stats Dashboard with XP charts, category breakdown, streak calendar 📊
- `e2a851a6` - feat: Add navigation to Stats Dashboard
- `786c4c1b` - docs: Update PROJECT_STATUS.md
- `d81d56c9` - feat: Add timer completion notifications with sound + vibration 🔔
- `842b2437` - feat: Enhanced service worker with celebratory vibration for timer completion

**Current state**:
- App is live at https://frog.newbold.cloud 
- Timer notifications work with sound and vibration
- Next priority: Daily check-in reminders

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
10. Notification system uses service worker for push notifications

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

*Last updated: December 31, 2025*
