# 🐸 Frog - Project Status

> **Compassionate productivity app that works with your brain, not against it.**

## 📍 Quick Reference

| Item | Value |
|------|-------|
| **Live App** | https://frog.newbold.cloud |
| **Stats Dashboard** | https://frog.newbold.cloud/stats |
| **Calendar** | https://frog.newbold.cloud/calendar |
| **Achievements** | https://frog.newbold.cloud/achievements |
| **GitHub Repo** | https://github.com/justinnewbold/time-blocking |
| **Vercel Dashboard** | https://vercel.com/newbold-cloud/time-blocking |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/wektbfkzbxvtxsremnnk |

---

## ✅ Completed Features

### Core Functionality
- [x] Energy check-in with 4 levels
- [x] Task management with categories
- [x] Focus timer with presets (5, 15, 25, 45 min)
- [x] "Eat the Frog" methodology
- [x] Gamification (XP, levels, streaks)
- [x] Supabase cloud sync
- [x] PWA support (installable)
- [x] Recurring tasks (daily, weekly, etc.)

### UI/UX
- [x] **iOS Liquid Glass Design** - Complete UI overhaul
- [x] **10 Themes** - 5 light + 5 dark themes
- [x] **Theme-aware backgrounds** - Auto-switch for light/dark
- [x] **Customizable Backgrounds** - 8 stunning options
- [x] **Per-Page Backgrounds** - Different themes for each screen
- [x] **Glass Icons & Cards** - Frosted glass effect throughout
- [x] **iOS-Style Tab Bar** - Native feel navigation
- [x] **Swipeable Tab Views** - Gesture navigation

### ADD/ADHD-Specific Features ✨
- [x] **Mood Tracking** - Change energy throughout the day
- [x] **Subtasks with Dopamine Hits** - 2 XP per subtask
- [x] **Quick Wins Filter** - Show only 5-15 min tasks
- [x] **Daily Top 3** - Pick your most important tasks
- [x] **Thought Dump** - Capture fleeting thoughts during focus
- [x] **Streak Calendar** - GitHub-style contribution graph
- [x] **Time Estimates** - Track estimated vs actual time

### Notifications & Reminders 🔔
- [x] **Daily Check-in Reminders** - Morning nudges with snooze
- [x] **Timer Completion Notifications** - Push + sound + vibration
- [x] **Streak Protection Alerts** - Save your streak
- [x] **Service Worker v5** - Enhanced notification scheduling

### Authentication 🔐 NEW!
- [x] **AuthContext** - Complete auth state management
- [x] **LoginModal** - Beautiful glass-styled login/signup UI
- [x] **Google OAuth** - One-tap Google sign in
- [x] **Apple OAuth** - Sign in with Apple support
- [x] **Email/Password** - Traditional authentication
- [x] **Password Reset** - Email-based recovery
- [x] **Auto-migration** - Local data syncs to cloud on first login
- [x] **UserProfile** - Account display with sync status
- [x] **Guest Mode** - Continue without account option

### Achievements System 🏆
- [x] 30+ achievement badges
- [x] Categories: tasks, frogs, streaks, time, accuracy, XP, subtasks
- [x] Unlockable with sound + haptic feedback
- [x] Achievement progress tracking

---

## 🎨 Available Themes

### Light Themes ☀️
| Name | Description |
|------|-------------|
| Light | Clean white |
| Sky | Bright blue |
| Peach | Warm orange |
| Mint | Fresh green |
| Lavender | Soft purple |

### Dark Themes 🌙
| Name | Description |
|------|-------------|
| Dark | Pure dark |
| Midnight | Deep blue |
| Sunset | Warm orange |
| Ocean | Calm teal |
| Forest | Nature green |

---

## 📋 To-Do List

### 🔴 Priority 1 - Next Up
- [ ] **Integrate UserProfile in Settings** - Add account section
- [ ] **Configure Supabase OAuth** - Enable Google/Apple providers
- [x] **Apple Reminders Sync** - Two-way sync ✅

### 🟠 Priority 2 - High Impact
- [ ] **Google Calendar** - Auto-block time
- [ ] **Due Dates with Notifications** - Task deadlines
- [ ] **Sound Effects Library** - More audio options

### 🟡 Priority 3 - Medium
- [ ] **Widget Support** - iOS/Android widgets
- [ ] **Siri Shortcuts** - Voice integration
- [ ] **Family Sharing** - Share tasks

### 🟢 Priority 4 - Future
- [ ] Apple Watch App
- [ ] AI Task Suggestions
- [ ] Team/Collaboration Features

---

## 🏗️ Technical Architecture

```
src/
├── app/
│   ├── page.jsx              # Main app (2640+ lines)
│   ├── layout.jsx            # Root layout with providers
│   ├── globals.css           # Liquid glass design system
│   ├── stats/page.jsx        # Stats Dashboard
│   ├── calendar/page.jsx     # Calendar view
│   ├── achievements/page.jsx # Achievements page
│   ├── auth/callback/page.jsx # 🆕 OAuth callback
│   └── offline/page.jsx      # Offline fallback
├── components/
│   ├── AuthContext.jsx       # 🆕 Auth state management
│   ├── LoginModal.jsx        # 🆕 Login/signup UI
│   ├── UserProfile.jsx       # 🆕 Account display
│   ├── BackgroundContext.jsx      # Background theming
│   ├── BackgroundSelector.jsx     # Background picker
│   ├── AchievementsContext.jsx    # Achievement system
│   ├── AchievementBadge.jsx       # Badge components
│   ├── DailyReminders.jsx         # Morning check-in system
│   ├── ThemeProvider.jsx          # Theme management
│   ├── NotificationManager.jsx    # Push notifications
│   ├── SwipeableTabView.jsx       # Gesture navigation
│   ├── FrogCharacter.jsx          # Evolution system
│   └── ...more
├── lib/
│   └── supabase.js           # 🆕 Updated with auth helpers
public/
├── manifest.json
├── sw.js (v5)                     # Enhanced service worker
└── icons/
```

---

## 🔐 Supabase Auth Configuration Required

To enable OAuth, configure these in Supabase Dashboard:

### Google OAuth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add Google Client ID and Secret from Google Cloud Console
4. Set redirect URL: `https://frog.newbold.cloud/auth/callback`

### Apple OAuth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Apple provider
3. Add Apple Service ID and Secret Key
4. Set redirect URL: `https://frog.newbold.cloud/auth/callback`

### Email Settings
1. Go to Authentication → Settings → Email
2. Enable "Confirm email" for new signups
3. Customize email templates if desired

---

## 🔄 Last Session Summary

**Date**: January 02, 2026

**What was done**:
1. ✅ Created Apple Reminders 2-way sync API endpoint
2. ✅ Created AppleRemindersSync UI component with glass design
3. ✅ Created Shortcuts setup page with step-by-step instructions
4. ✅ Integrated sync component into settings modal
5. ✅ Added category mapping (Apple lists → Frog categories)
6. ✅ Added priority to difficulty mapping
7. ✅ Added intelligent energy estimation from task titles

**Files Created**:
- `src/app/api/apple-reminders/route.js` - Sync API endpoint
- `src/components/AppleRemindersSync.jsx` - Sync UI component
- `src/app/shortcuts/page.jsx` - Apple Shortcuts setup guide

**Files Updated**:
- `src/app/page.jsx` - Integrated AppleRemindersSync into settings

**API Endpoints**:
- `GET /api/apple-reminders` - Export tasks for Apple
- `POST /api/apple-reminders` - Import reminders, sync, mark complete

**Previous Session**

**What was done**:
1. ✅ Created AuthContext for Supabase authentication
2. ✅ Created LoginModal with glass design + OAuth buttons
3. ✅ Created UserProfile component for account display
4. ✅ Created auth callback page for OAuth redirects
5. ✅ Updated layout.jsx with AuthProvider
6. ✅ Updated supabase.js with auth-aware functions
7. ✅ Added auto-migration of local data to cloud on sign in

**Files Created**:
- `src/components/AuthContext.jsx` - Auth state management
- `src/components/LoginModal.jsx` - Login/signup UI
- `src/components/UserProfile.jsx` - Account display
- `src/app/auth/callback/page.jsx` - OAuth callback

**Files Updated**:
- `src/app/layout.jsx` - Added AuthProvider + LoginModal
- `src/lib/supabase.js` - Auth-aware helper functions

**Commits this session**:
- `feat: Add AuthContext for Supabase authentication 🔐`
- `feat: Add LoginModal with glass design + OAuth 🎨`
- `feat: Add UserProfile component for account display 👤`
- `feat: Add OAuth callback page for auth redirects 🔄`
- `feat: Add AuthProvider + LoginModal to layout 🔐`
- `feat: Update Supabase client with auth-aware functions ☁️`

---

## 📝 Notes for Claude

When continuing this project:
1. Check this file first for current status
2. App uses **liquid glass** design system with 10 themes
3. **Auth system is now in place** - needs Supabase provider config
4. UserProfile needs to be integrated into settings modal in page.jsx
5. Backgrounds stored in localStorage (`frog_backgrounds`)
6. Daily reminders use service worker for scheduling
7. Always test notifications on mobile devices
8. Energy check-in now records to reminder system
9. Achievements unlock with sound + haptic feedback

---

## 🎨 CSS Class Reference

| Class | Effect |
|-------|--------|
| `glass` | Base glass effect |
| `glass-light` | Lighter glass |
| `glass-dark` | Darker glass (headers) |
| `glass-card` | Card with glass + gradient |
| `glass-button` | Interactive glass button |
| `glass-icon` | Icon container (medium) |
| `glass-icon-sm` | Icon container (small) |
| `glass-input` | Input field styling |
| `liquid-shine` | Shine animation on hover |
| `animate-fade-in` | Fade in animation |
| `animate-scale-in` | Scale + fade animation |
| `animate-bounce-slow` | Slow bounce (for frog) |

---

*Last updated: January 1, 2026*
