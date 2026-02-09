# 🌌 ASTRAFORGE — Gamified Application Experience

**ASTRAFORGE** is a cinematic, gamified application system that transforms a traditional multi-step workflow into a progression-driven journey. Instead of static forms, users advance through missions, earn XP, unlock achievements, and develop a unique behavioral identity — all within a persistent, state-driven experience.

> **Forge your place among the stars.**

---

## 🔗 Live Demo

🚀 **Vercel Deployment**  
https://astraforge-gamified-application-gr4.vercel.app

💻 **GitHub Repository**  
https://github.com/jolly-prableen/astraforge-gamified-application

---

## ✨ Why ASTRAFORGE?

Most application workflows are linear, forgettable, and purely transactional.  
ASTRAFORGE explores how **gamification, visual storytelling, and deterministic state management** can turn a routine process into a memorable experience.

This project demonstrates:
- Product-level UX thinking
- Scalable state architecture
- Gamification without gimmicks
- Clear lifecycle design with a defined end state
- Separation of cinematic visuals from business logic

---

## 🚀 Core Features

### 🎮 Mission-Based Workflow
- Tasks are grouped into **missions**
- Multiple missions can be completed over time
- Progress accumulates naturally — **no forced resets**

### ⭐ XP-Driven Progression
- XP is awarded for meaningful actions
- XP persists across sessions
- XP unlocks achievements and badges globally

### 🏆 Achievements & Badges
- Automatic badge unlocks at XP milestones
- Includes **hidden (shadow) achievements**
- All achievements are timestamped and logged

### 🧠 Behavioral Personality System
- User behavior is analyzed to derive a **Constellation Personality**
- Personality reflects pacing, consistency, and task cadence
- Personality locks permanently after final submission

### 🔥 Daily Streaks
- Completing tasks on consecutive days builds streaks
- Bonus XP is awarded at streak milestones
- Longest streak is tracked separately

### ♿ Accessibility-First Design
- Reduced-motion mode for animation-heavy scenes
- Toggleable and persisted across sessions

### 💾 Persistent State
- Entire application state is stored in `localStorage`
- Users can safely refresh or return later without losing progress

---

## 🧩 Application Flow

ASTRAFORGE follows a **four-stage progression model**:

### 1️⃣ Profile
- One-time operator setup
- Initializes the journey
- Awards **+20 XP**

### 2️⃣ Tasks (Missions)
- Tasks are completed within mission sets
- **+10 XP per task**
- Missions can be launched repeatedly over time

### 3️⃣ Submission
- Finalizes a completed mission
- Locks mission state
- Awards **+30 XP**

### 4️⃣ Status
- Read-only archival view
- Displays:
  - Mission history
  - Total XP
  - Achievements & badges
  - Constellation personality
  - Progress summary

Navigation is state-guarded to prevent skipping or invalid transitions.

---

## 🗂 Architecture Overview

ASTRAFORGE is intentionally split into **two independent layers**.

### 🎥 `scene/` — Cinematic & Visual Layer
Responsible for:
- Globe and constellation visuals
- Three.js rendering
- Post-processing effects
- Motion and atmosphere

**Technologies used:**
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `postprocessing`
- `framer-motion`

This layer contains **no business logic**.

---

### 🧠 `state/` — Application Engine
Powered by **Zustand** with persistence middleware.

Responsible for:
- XP calculation
- Mission lifecycle management
- Task completion
- Achievement & badge unlocking
- Daily streak tracking
- Behavioral personality derivation
- Step reconciliation & recovery
- Feature flag control
- Safe navigation guards

This separation ensures:
- Deterministic behavior
- Easy extension and testing
- Clear mental model of the system

---

## ⭐ XP & Progression Rules

| Action | XP Awarded |
|------|-----------|
| Complete Profile | +20 |
| Complete Task | +10 |
| Submit Mission | +30 |
| 5-Day Streak Bonus | +5 |

XP is:
- Global
- Cumulative
- Never silently reset

---

## 🏆 Badges & Achievements

### XP-Based Badges
- **Stellar Alignment** → 50 XP  
- **Astral Apex** → 100 XP  

### Shadow Achievements
- Hidden until unlocked
- Reward organic behavior (speed, consistency, exploration)
- Appear dynamically with animations

All achievements are logged with:
- Type
- Label
- XP (if applicable)
- Timestamp

---

## 🧠 Constellation Personality System

The system analyzes behavioral patterns such as:
- Time between task completions
- XP velocity
- Mission cadence

Possible personality types:
- **Methodical Architect** — deliberate and steady
- **Burst Explorer** — rapid progress bursts
- **Steady Navigator** — balanced consistency
- **Late Finisher** — long gaps with strong completion

Personality:
- Updates dynamically during progression
- Locks permanently after final submission
- Becomes part of the user’s final record

---

## 🔥 Daily Streak Logic

- A streak day counts if at least one task is completed
- Missing a day resets the current streak
- Longest streak is preserved
- Bonus XP is awarded every 5 days (configurable)

Streaks can be disabled via feature flags.

---

## 🧬 State Safety & Recovery

ASTRAFORGE includes multiple safeguards:
- Step reconciliation on application load
- Guarded navigation (no skipping ahead)
- Backward navigation to completed steps
- Protection against double XP or duplicate rewards

Users can never become trapped in an invalid state.

---

## 🛠 Tech Stack

### Frontend
- **React 18**
- **TypeScript**
- **Vite**

### State Management
- **Zustand**
- Persist middleware

### 3D & Animation
- **Three.js**
- **@react-three/fiber**
- **@react-three/drei**
- **Framer Motion**

### Utilities
- `html2canvas` (snapshots & sharing)

---

## ▶️ Running Locally

```bash
npm install
npm run dev
