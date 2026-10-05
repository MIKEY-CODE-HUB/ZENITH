# ⚡ ZENITH — Deep Work, Focus Truth & Procrastination Blocker

> **"Track less. Focus more. Know the truth."**  
> *"Don't just detect procrastination. Prevent it."*

**ZENITH** is a modern, full-stack deep work and productivity ecosystem designed to break the illusion of pseudo-working. Combining real-time browser focus signals, live silent accountability rooms, instant snap-back distraction locking, and behavioral scoring, ZENITH exposes and eliminates the distractions you lie to yourself about.

---

## 🌟 Core Pillars & Key Features

### 1. 🧠 The Truth Tracker
- Real-time segmented progress visualization:
  - **Actual Focused Time** (active input in focused tab)
  - **Distraction Time** (tab hidden / away on other websites)
  - **Idle Time** (inactivity > 60s)
  - **Focus Efficiency Rate (%)**

### 2. 🧮 Authoritative Focus Scoring Engine
- Server-verified calculation with transparent penalties:
  - **Base Focus Score**: `(Focused Time / Planned Time) * 100`
  - **Tab-Switch Penalty**: `-2.5 pts` per excess tab switch
  - **Away Duration Penalty**: `-1.0 pt` per 30s away
  - **Prolonged Idle Penalty**: `-1.5 pts` per minute of inactivity
  - **Behavioral Grade**: `A+`, `A`, `B`, `C`, `D`, `F`

### 3. 👥 Live Focus Rooms & Social Accountability
- Join or create virtual silent library rooms for **Coding**, **Study**, **Work**, **Creative**, **Reading**, and **Gym**.
- Real-time **Socket.IO** sync: participant focus badges (🟢 Focused, 🟡 Idle, 🔴 Distracted), uninterrupted focus streaks (`🔥 24m`), camera feeds, and room chat.
- Built-in **Presentation Demo Bots** (`Alex`, `Sarah`, `Rahul`) for live demonstrations.

### 4. 🚨 Distraction Warning System & Soft Lock
- Displays gentle psychological warning overlays upon returning from a distracted tab:
  - *"👀 You were away for 23 seconds. Ready to lock back in?"*
  - Counter tracking number of times the session was abandoned.

### 5. 📊 In-Depth Behavioral Analytics
- Daily, weekly, and monthly focus trends using **Recharts**.
- Focus quality score trajectory.
- Activity breakdown (% distribution across coding, study, work).
- Automatic calculation of your **Peak Productivity Time of Day**.
- Personalized data-backed behavioral insights.

### 6. 🏆 Gamification & Leaderboards
- **Daily Streak Tracking** with consecutive active day requirements.
- 7+ Unlockable Badges (*First Step*, *Focus Starter*, *7-Day Iron Streak*, *Focus Master*, *Deep Work Monk*, *10 Hours in the Zone*, *Consistency King*).
- Room & Global Leaderboards ranked by Focus Score, Focused Hours, or Streaks.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js, Express.js, TypeScript, Socket.IO, JWT Auth, Bcrypt |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Focus Telemetry** | Page Visibility API (`document.visibilityState`), Debounced DOM Activity Listeners (`mousemove`, `keydown`, `touchstart`, `click`), Window Focus/Blur |
| **Media Stream** | Browser `navigator.mediaDevices.getUserMedia` WebRTC Camera abstraction |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v22+)
- PostgreSQL installed and running

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb trapbreaker

# Navigate to backend and sync Prisma schema
cd backend
npx prisma db push

# Seed demo users, rooms, achievements, and sample history
npm run prisma:seed
```

### 2. Start Backend Server
```bash
cd backend
npm run dev
# Server running at http://localhost:5001 (WebSocket initialized)
```

### 3. Start Frontend App
```bash
cd frontend
npm run dev
# Next.js app running at http://localhost:3000
```

---

## 🧪 Demo Accounts (Pre-Seeded)

For quick review and presentation testing, you can use the **1-Click Demo Login** or these credentials:

| Name | Username | Email | Password | Role / Specialty |
|---|---|---|---|---|
| **Mikey** | `mikey` | `mikey@trapbreaker.com` | `password123` | Full-Stack Developer |
| **Alex Chen** | `alexchen` | `alex@trapbreaker.com` | `password123` | CS Student / LeetCode |
| **Sarah Jenkins** | `sarahj` | `sarah@trapbreaker.com` | `password123` | UI/UX Designer |
| **Rahul Verma** | `rahulv` | `rahul@trapbreaker.com` | `password123` | Academic Researcher |

---

## 📡 REST API Summary

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/demo-login`, `GET /api/auth/me`, `POST /api/auth/onboarding`
- **Rooms**: `GET /api/rooms`, `POST /api/rooms`, `GET /api/rooms/:id`, `POST /api/rooms/:id/join`, `POST /api/rooms/:id/leave`
- **Sessions**: `POST /api/sessions/start`, `POST /api/sessions/:id/events`, `POST /api/sessions/:id/end`, `GET /api/sessions/history`, `GET /api/sessions/:id`
- **Analytics**: `GET /api/analytics/dashboard`, `GET /api/analytics/daily`, `GET /api/analytics/weekly`, `GET /api/analytics/monthly`, `GET /api/analytics/activity`
- **Achievements**: `GET /api/achievements`
- **User & Leaderboard**: `GET /api/users/profile`, `PUT /api/users/settings`, `GET /api/users/leaderboard`
