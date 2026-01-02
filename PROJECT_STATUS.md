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

### Notifications & Reminders 🔔 NEW
- [x] **Daily Check-in Reminders** - Morning nudges with snooze
- [x] **Timer Completion Notifications** - Push + sound + vibration
- [x] **Streak Protection Alerts** - Save your streak
- [x] **Service Worker v5** - Enhanced notification scheduling

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
- [ ] **Authentication** - Supabase Auth login
- [ ] **Apple Reminders Sync** - Two-way sync

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
│   └── offline/page.jsx      # Offline fallback
├── components/
│   ├── BackgroundContext.jsx      # Background theming
│   ├── BackgroundSelector.jsx     # Background picker
│   ├── AchievementsContext.jsx    # Achievement system
│   ├── AchievementBadge.jsx       # Badge components
│   ├── DailyReminders.jsx         # 🆕 Morning check-in system
│   ├── ThemeProvider.jsx          # Theme management
│   ├── NotificationManager.jsx    # Push notifications
│   ├── SwipeableTabView.jsx       # Gesture navigation
│   ├── FrogCharacter.jsx          # Evolution system
│   └── ...more
├── lib/
│   └── supabase.js
public/
├── manifest.json
├── sw.js (v5)                     # 🆕 Enhanced service worker
└── icons/
```

---

## 🔄 Last Session Summary

**Date**: January 2, 2026

**What was done**:
1. ✅ Created DailyReminders system for ADD-friendly check-ins
2. ✅ Added morning reminder with snooze options (15/30/60 min)
3. ✅ Service Worker v5 with enhanced notification scheduling
4. ✅ Integrated reminders with energy check-in flow
5. ✅ Added streak protection notifications
6. ✅ Motivational messages for ADD brains

**Files Created**:
- `src/components/DailyReminders.jsx` - Complete reminder system

**Files Updated**:
- `public/sw.js` - v5 with daily check-in scheduling
- `src/app/page.jsx` - Integrated DailyReminders

**Commits this session**:
- `af43dc5e` - feat: Add DailyReminders system for ADD-friendly check-ins
- `f604d863` - feat: Service worker v5 - Enhanced daily reminder notifications
- `315f81ca` - feat: Integrate DailyReminders for compassionate morning check-ins

---

## 📝 Notes for Claude

When continuing this project:
1. Check this file first for current status
2. App uses **liquid glass** design system with 10 themes
3. Backgrounds stored in localStorage (`frog_backgrounds`)
4. Daily reminders use service worker for scheduling
5. Always test notifications on mobile devices
6. Energy check-in now records to reminder system
7. Achievements unlock with sound + haptic feedback

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

*Last updated: January 2, 2026*
