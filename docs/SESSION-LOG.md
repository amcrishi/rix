# RIX — AI Fitness Trainer

## Project Summary
Production-ready SaaS app: AI-powered personalized workout plans, progress tracking, and AI coach.
**Brand**: RIX | **Color Theme**: Red (#dc2626) | **Modes**: Dark / Light

---

## Tech Stack
- **Frontend**: Next.js 14 + Tailwind CSS (App Router)
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL 16 + Prisma ORM
- **AI**: OpenAI API (separate module)
- **Auth**: JWT-based

## Project Location
```
D:\rishilifx\ai-fitness-trainer\
├── /frontend        → Next.js app (port 3000)
├── /backend         → Express API (port 5000)
├── /ai-engine       → AI prompts and services
├── /database        → Prisma schema and migrations
└── /docs            → Architecture and notes
```

## How to Run
```bash
# Frontend
cd D:\rishilifx\ai-fitness-trainer\frontend
npm run dev
# → http://localhost:3000

# Backend
cd D:\rishilifx\ai-fitness-trainer\backend
npm run dev
# → http://localhost:5000

# Database
# PostgreSQL at localhost:5432, password: postgres123, DB: ai_fitness_db
```

---

## What Was Done Today (2026-05-05)

### 1. Theme System Simplification
- Removed all 6 color theme definitions, kept only dark/light mode
- `ThemeContext.tsx` → mode-only (localStorage key: `rix_mode`)
- Sidebar button toggles dark/light instead of color picker

### 2. Top Bar — Sign In/Out (Premium)
- Created `TopBar.tsx` — page title left, auth controls top-right
- Avatar with gradient, hover glow effects, ghost→red sign out button

### 3. Auth Pages — Premium Design (GitHub-inspired)
- **Login** (`/login`) — dark gradient bg, centered card, password show/hide
- **Register** (`/register`) — 2-step wizard, progress dots, password strength meter
- **Forgot Password** (`/forgot-password`) — email form → success state

### 4. Red Theme + Animations
- Primary color: `#dc2626` (red-600)
- CSS animations: `float-slow`, `float-reverse`, `pulse-glow` (floating orbs)
- Glittering card border: `@property --angle` + `conic-gradient` rotation at **8s** speed
- `shimmer-text` for headings

### 5. Rebrand to RIX
- All branding updated: sidebar, auth pages, TopBar
- localStorage keys: `rix_mode`, `rix_auth_mode`
- Custom logo (`RixLogo.tsx`) using user's image

### 6. Custom Logo Integration
- User provided `rix-logo.png` (white wordmark on black)
- Generated transparent-background versions:
  - `public/rix-logo-white.png` → white logo, transparent bg (for dark mode)
  - `public/rix-logo-black.png` → black logo, transparent bg (for light mode)
- `RixLogo.tsx` switches between them based on `variant` prop

### 7. Day/Night Mode on Auth Pages
- `AuthModeToggle.tsx` — floating sun/moon button, bottom-right corner
- `useAuthMode()` hook — persists to localStorage (`rix_auth_mode`)
- All 3 auth pages fully adapt: background, card, inputs, text, logo, orbs

### 8. Copy & Placeholder Updates
- Login heading: **"Continue the Grind"**
- Login subtitle: **"Every rep counts. Let's go."**
- Input placeholders across all auth pages:
  - Email → "Enter your email"
  - Password → "Enter your password"
  - Name → "Enter your name"

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/login/page.tsx` | Login page (dark/light, animated) |
| `frontend/src/app/register/page.tsx` | Register page (2-step flow) |
| `frontend/src/app/forgot-password/page.tsx` | Forgot password page |
| `frontend/src/app/dashboard/layout.tsx` | Dashboard sidebar + TopBar layout |
| `frontend/src/app/globals.css` | CSS vars, animations, glitter-border |
| `frontend/src/components/ui/RixLogo.tsx` | Logo component (dark/light variant) |
| `frontend/src/components/ui/AuthModeToggle.tsx` | Day/night toggle + hook |
| `frontend/src/components/ui/TopBar.tsx` | Top bar with auth controls |
| `frontend/src/components/ui/ThemePicker.tsx` | Sidebar dark/light toggle |
| `frontend/src/context/ThemeContext.tsx` | Dashboard mode context |
| `frontend/src/lib/themes.ts` | Mode type definitions |
| `frontend/public/rix-logo-white.png` | White logo (transparent bg) |
| `frontend/public/rix-logo-black.png` | Black logo (transparent bg) |

---

## Current Status
- ✅ Project structure complete
- ✅ Backend API (auth, profile, workouts) functional
- ✅ Database (PostgreSQL + Prisma) connected
- ✅ AI Engine module created (OpenAI integration)
- ✅ Frontend UI — premium auth pages done
- ✅ Dark/Light mode working on all auth pages
- ✅ All 9 routes building successfully
- ✅ Session/Auth protection — JWT-based route guarding
- ✅ Theme consistency — all dashboard pages use CSS variables
- ✅ Advanced Dashboard — premium design with new widgets

---

## What Was Done (2026-05-06)

### 1. Session Management & Auth Protection
- Created `AuthContext.tsx` — full JWT session management
- Login/Register forms now call real backend API (`/api/auth/login`, `/api/auth/register`)
- JWT token stored in localStorage (`fitness_token`)
- Route protection: `/dashboard/*` routes redirect to `/login` if not authenticated
- Dashboard layout shows loading spinner while checking auth
- Home page (`/`) redirects to `/dashboard` or `/login` based on token
- TopBar now uses real user data from auth context
- Sign Out clears token and redirects to login

### 2. Theme Consistency (Red Theme on All Pages)
- Updated ALL dashboard components to use CSS variables instead of hardcoded `text-gray-*` / `bg-white`
- Components updated: `TodayWorkout`, `RecentActivity`, `WeeklyOverview`, `ProgressBar`
- Pages updated: Profile, Workouts, Progress — all now respect dark/light mode
- Dark mode now properly sets `--color-primary-light` and `--color-primary-text` for visibility
- Red accent color (`#dc2626`) consistent across all UI elements

### 3. Advanced Dashboard Redesign
- **Personalized Greeting** — time-based (Good Morning/Afternoon/Evening) + user's name
- **Motivational Quote Banner** — daily rotating fitness quotes
- **Calorie Tracker** — SVG ring chart showing consumed/burned/remaining calories
- **Water Intake** — visual glass tracker (8 glasses/day target)
- **Body Metrics Panel** — weight, body fat, muscle mass, BMI with change indicators
- **Goal Progress** — main progress bar + 3 mini SVG ring charts (Strength/Consistency/Recovery)
- **Activity Heat Map** — GitHub-style 12-week contribution grid showing workout intensity
- **Quick Action Button** — "Start Workout" CTA in header
- All new widgets fully support dark/light mode

### 4. Architecture Improvements
- Created `providers.tsx` — single client wrapper combining ThemeProvider + AuthProvider
- Root layout is now a server component (providers in separate client file)
- `useAuth()` hook available globally for any component needing user state

---

## Key Files Added/Updated

| File | Purpose |
|------|---------|
| `frontend/src/context/AuthContext.tsx` | JWT auth context + route protection |
| `frontend/src/app/providers.tsx` | Client providers wrapper |
| `frontend/src/app/page.tsx` | Smart redirect (token → dashboard, else → login) |
| `frontend/src/app/dashboard/page.tsx` | Advanced dashboard (complete redesign) |
| `frontend/src/app/dashboard/layout.tsx` | Auth guard + loading state |
| `frontend/src/components/ui/TopBar.tsx` | Real auth integration |

---

## What Was Done (2026-05-06 → 2026-05-07) — Session 3

### 1. Registration Fix — "Validation Failed" Error
- **Root cause**: Single "Full Name" field split by space → empty `lastName` failed backend validation
- Fixed `register/page.tsx` — removed broken partial edit, restored clean single-export component
- Split name input into `firstName` + `lastName` fields
- Friendly, field-specific error messages shown on screen (no raw "Validation failed" text)

### 2. Favicon — RIX Logo
- Used `sharp` (bundled with Next.js) to composite `public/rix-logo-white.png` onto `#050507` background
- Generated static PNGs: `src/app/icon.png` (64×64) and `src/app/apple-icon.png` (180×180)
- Next.js serves these automatically as favicon and Apple touch icon

### 3. Dark Mode → True Black
- Updated `ThemeContext.tsx` dark mode CSS variables from navy/slate to pure black
  - `--bg-page`: `#000000`, `--bg-card`: `#0a0a0a`, `--bg-sidebar`: `#050505`, `--bg-hover`: `#1a1a1a`

### 4. Profile Page — Full DB Persistence
- Rewrote `profile/page.tsx` with real API calls: `GET /api/profile` on mount, `PUT /api/profile` on save
- Added new fields to Prisma schema + migration (`add_profile_fields`):
  - `targetWeight`, `phone`, `dateOfBirth`, `activityLevel`, `workoutPreference`, `dietaryPreference`, `bodyMeasurements` (JSON), `medicalConditions`
- Profile sections: Personal Info, Body Metrics, Body Measurements (chest/waist/hips/arms/thighs), Fitness Goals, Medical

### 5. Subscription Pricing Page
- Created `/dashboard/subscription/page.tsx`
- 3-tier pricing: Free / Pro (₹499/mo) / Elite (₹999/mo)
- Monthly/yearly billing toggle (17% savings on yearly)
- Feature comparison lists, FAQ accordion
- "💎 Subscription" added to sidebar navigation

### 6. Floating Theme Toggle
- Rewrote `ThemePicker.tsx` as a fixed floating button (bottom-right corner, `position: fixed`)
- SVG sun/moon icons, always visible on every page
- Removed from sidebar bottom — now at root layout level

### 7. Logo Dark/Light Switch
- `dashboard/layout.tsx` uses `useTheme()` to switch logo variant
- Dark mode → white logo, Light mode → black logo
- No gray box in light mode — removed background entirely in light variant

### 8. Dashboard — All Dummy Data Replaced with Real API Data

#### Calories Today (was hardcoded 1850/2400/420)
- Calculates TDEE using **Mifflin-St Jeor formula**: BMR × activity multiplier
- Requires: weight, height, age, gender, activityLevel from profile
- Burned = estimated from today's workout logs (~300 kcal/session)
- If profile incomplete → "Complete your profile" prompt shown

#### Water Intake (was hardcoded 5/8)
- Target = `weight × 35ml ÷ 250ml` (weight-based recommendation)
- Interactive: click any glass to add/remove
- Persists per-day in `localStorage` (key: `rix_water_${dateString}`), resets each new day
- Shows "✅ Hydration goal reached!" when complete

#### Body Metrics Panel (was showing fake Body Fat 16.2%, Muscle Mass 34.8kg)
- Removed all untracked metrics
- Now shows only real values: Weight, Target Weight, BMI (calculated), Height
- BMI badge shows category: Normal / Overweight / Underweight / Obese

#### Goal Progress (was hardcoded Week 8 of 12, 72%/85%/60%)
- Week number calculated from `activePlan.createdAt`
- Progress % = total sessions ÷ expected sessions since plan started
- Mini rings: **Consistency** (this week ÷ target days), **Sessions** (milestone), **Streak** (days × 14%)
- Empty state → "Generate a workout plan to start tracking"

#### Activity Heat Map (was random noise on every render)
- Real dates from workout logs mapped onto 12-week calendar grid
- Red cells on days with logged workouts

#### Weekly Overview
- `completedDays` now computed from real log dates (not hardcoded `[0, 1, 2]`)

#### Stat Cards
- Trend labels: "Target: N/week" and "Keep it up!" / "Great start!" based on actual data
- No more hardcoded "-1.2 kg this month" or "+1 vs last week"

### 9. Workout Session Tracker — New Feature
- New DB models (migration: `add_workout_sessions_cardio`):
  - `WorkoutSession` (id, userId, planId, name, status, exercises JSON, totalDuration, startedAt, completedAt)
  - `CardioSession` (id, userId, type, duration, distance, distanceUnit, intensity, caloriesBurned, heartRate, notes)

#### Backend Endpoints Added (`/api/workouts/`)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/sessions/start` | Start a new session |
| PATCH | `/sessions/:id` | Update progress / mark complete |
| GET | `/sessions` | List user's sessions |
| GET | `/sessions/:id` | Get single session |
| POST | `/cardio` | Log cardio session |
| GET | `/cardio` | Get cardio history |
- `api.patch()` method added to `frontend/src/lib/api.ts`

#### `/dashboard/workouts/session` — Live Session Tracker Page
- **Phase 1 (Pick)**: Select workout day from active plan; shows exercise count per day
- **Phase 2 (Active)**:
  - Exercise nav tabs — color coded: red=current, green=done, yellow=partial
  - Per-set logging table: Weight (kg) input + Reps input + ✓ Done button
  - Auto rest timer starts after each set (uses plan's `restSeconds`), Skip button
  - Progress bar (completed sets / total sets)
  - "Next exercise →" button
  - Auto-saves to DB on each set completion
- **Phase 3 (Done)**:
  - Summary: duration, sets done, exercises count
  - Exercise list with weights used
  - Auto-creates `WorkoutLog` entries (backwards compat for streak/dashboard stats)

#### Workouts Page — 3 Tabs (My Plan | Cardio | History)
- **My Plan tab**: Generate plan form + active plan display (with ▶ Start button)
- **Cardio tab**: 8 activity types, log form (duration, distance, intensity, calories, heart rate, notes), recent sessions list
- **History tab**: All past workout sessions with status, duration, exercises, sets done

#### Dashboard "Start Workout" Button
- Wired to navigate to `/dashboard/workouts/session`
- If no active plan → prompts to generate one first

### 10. Live GPS Cardio Tracker — `/dashboard/workouts/cardio/session`
- Installed: `leaflet`, `react-leaflet`, `@types/leaflet`
- **10 activity types**: Running, Cycling, Hiking, HIIT, Jump Rope, Swimming, Walking, Rowing, Spin, Other
- Each type has a **MET value** for calorie calculation

#### Live Metrics Tracked in Real Time
| Metric | Method |
|--------|--------|
| ⏱ Timer | JS interval, pauses when user pauses |
| 📏 Distance | GPS coords → Haversine formula (m → km) |
| ⚡ Current Speed | Distance delta ÷ time delta (km/h), noise-filtered < 200 km/h |
| 📊 Avg Speed | Total distance ÷ total time |
| 🏆 Max Speed | Peak speed recorded during session |
| 🏃 Pace | 60 ÷ avg speed (min/km) |
| 🔥 Calories | MET × user weight (from profile) × hours elapsed |
| 🗺 Route Map | Leaflet + OpenStreetMap tiles, live red polyline, auto-pans to current position |

- Controls: Pause (stops timer + GPS recording) → Resume (continues) → Stop (opens summary)
- Summary screen: all 6 stats + route map + Save button → writes to `CardioSession` DB table
- GPS errors shown with helpful messages (denied / unavailable / timeout)
- `RouteMap.tsx` component: Leaflet map, green dot for start, red polyline, dynamic import (SSR-safe)
- Intensity auto-calculated from avg speed for DB storage

#### Cardio Tab — Live Track CTA
- Prominent "Live GPS Tracker" card with LIVE badge added to top of Cardio tab
- Shows feature icons: ⏱ Timer · 📏 Distance · ⚡ Speed · 🗺 Route · 🔥 Calories

---

## Updated Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/icon.png` | 64×64 favicon — white RIX logo on black bg |
| `frontend/src/app/apple-icon.png` | 180×180 Apple touch icon |
| `frontend/src/app/dashboard/page.tsx` | Dashboard — fully real data, no hardcoded values |
| `frontend/src/app/dashboard/workouts/page.tsx` | Workouts — 3 tabs (My Plan / Cardio / History) |
| `frontend/src/app/dashboard/workouts/session/page.tsx` | Live workout session tracker |
| `frontend/src/app/dashboard/workouts/cardio/session/page.tsx` | Live GPS cardio tracker |
| `frontend/src/app/dashboard/profile/page.tsx` | Profile — full DB persistence, all fields |
| `frontend/src/app/dashboard/subscription/page.tsx` | Subscription pricing page |
| `frontend/src/components/cardio/RouteMap.tsx` | Leaflet route map component |
| `frontend/src/components/ui/ThemePicker.tsx` | Fixed floating theme toggle |
| `frontend/src/lib/api.ts` | Added `api.patch()` method |
| `database/prisma/schema.prisma` | Added WorkoutSession + CardioSession models |
| `backend/src/controllers/workout.controller.js` | Added 6 new endpoint handlers |
| `backend/src/routes/workout.routes.js` | Added session + cardio routes |

---

## Current Status (as of 2026-05-07)
- ✅ All 11 routes building successfully
- ✅ Auth + JWT session protection on all dashboard routes
- ✅ Dark mode = true black, Light mode = white with black logo
- ✅ Profile page — full persistence to PostgreSQL via Prisma
- ✅ Dashboard — 100% real data, zero hardcoded values
- ✅ Water tracker — interactive, persists per-day in localStorage
- ✅ Calorie goal — TDEE from profile (Mifflin-St Jeor)
- ✅ Activity heat map — real workout log dates
- ✅ Workout session tracker — live per-set logging with rest timer
- ✅ Cardio tab — 8 activities, manual log + history
- ✅ Live GPS cardio tracker — timer, distance, speed, route map, calories
- ✅ Subscription pricing page (UI only, no payment gateway yet)

## Next Steps
- [ ] Payment gateway (Razorpay) for subscription
- [ ] Progress page — weight log entries, strength PRs (personal records)
- [ ] Push notifications / reminders
- [ ] Mobile responsive polish
- [ ] Real password reset flow (email OTP)
- [ ] AI chat coach in sidebar

---

## What Was Done (2026-05-13) — Session 4

### 1. Mobile Hotspot Access Fix
**Problem**: When accessing the app from a mobile connected to the laptop's hotspot, the login page loaded but API calls failed (login didn't work, dashboard stayed loading).

**Root causes identified**:
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api` → mobile browser called its own localhost
- Backend CORS only allowed `http://localhost:3000`
- Windows Firewall blocked Node.js on Public networks (hotspot)

**Final solution — Next.js Rewrites Proxy**:
- Configured `next.config.ts` with `rewrites()` to proxy `/api/*` → `http://localhost:5000/api/*`
- Changed `API_BASE` in `api.ts` to just `/api` (relative URL, same origin)
- All API calls now go through port 3000 (same origin) — eliminates CORS and port exposure
- Added `next dev -H 0.0.0.0` in `package.json` for LAN access
- Backend binds to `0.0.0.0` explicitly in `server.js`
- Backend CORS set to `origin: true` in development mode
- Added Windows Firewall rules: `RIX Frontend 3000` and `RIX Backend 5000` (Allow, Any profile)

### 2. Clickable Username → Profile
- User's name in the top navigation bar (`dashboard/layout.tsx`) is now a `<Link>` to `/dashboard/profile`
- Hover effect with opacity transition

### 3. Profile Score Feature
**Location**: `/dashboard/profile` page — appears as a card below the header.

Calculates a score out of 100 based on 4 categories:
| Category | Max | Factors |
|----------|-----|---------|
| Health | 30 | BMI in range, weight-to-target progress, body measurements |
| Progress | 35 | Workouts this week vs target, monthly consistency, total volume |
| Habit | 20 | Current streak, regularity over past month |
| Completeness | 15 | Profile fields filled out |

**UI**: Circular SVG gauge (color-coded: green/yellow/orange/red), breakdown bars per category with details text. Labels: Excellent (80+), Good (60+), Fair (40+), Getting Started (<40).

### 4. Removed Day/Night Mode (Permanent Dark Theme)
Deleted files:
- `frontend/src/components/ui/AuthModeToggle.tsx`
- `frontend/src/components/ui/ThemePicker.tsx`
- `frontend/src/context/ThemeContext.tsx`

Modified files:
- `providers.tsx` — removed `ThemeProvider` wrapper
- `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx` — removed toggle, hardcoded dark styles
- `dashboard/layout.tsx` — removed ThemePicker import
- `dashboard/page.tsx` — removed `useTheme`, hardcoded dark values
- `StatCard.tsx` — removed unused theme import

### 5. Diet & Nutrition Section — New Feature
**Navigation**: Added "Diet" link to dashboard nav (between Workouts and Progress).

#### Database (Prisma)
New model `MealLog` (migration: `add_meal_logs`):
```
id, userId, mealType (breakfast|lunch|dinner|snack),
foodName, calories, protein, carbs, fat, quantity, unit, loggedAt
```

#### Backend API (`/api/diet/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/diet/logs` | Fetch meal logs (optional `?date=YYYY-MM-DD`) + today's summary |
| POST | `/diet/logs` | Log a new meal |
| DELETE | `/diet/logs/:id` | Delete a meal log |
| GET | `/diet/summary` | Weekly calorie breakdown by day |

#### Frontend — `/dashboard/diet` (3 tabs)

**Tab 1: Calorie Tracker**
- Daily progress bar (consumed vs TDEE-based target)
- Summary cards: Consumed, Remaining, Protein, Meals Today
- Macro breakdown (protein, carbs, fat)
- Log Meal form (meal type, food name, calories, protein, carbs, fat, quantity, unit)
- Today's meals list with delete option

**Tab 2: Food Suggestions**
- 28 regional Indian foods with full nutrition facts
- Regions: North, South, West, East India
- Filters by region and meal type (breakfast/lunch/dinner/snack)
- Each card shows: name, region, serving size, calories, protein, carbs, fat
- "Quick Add to Tracker" button on each food item

**Tab 3: Meal Plan**
- Goal-based daily meal plans:
  - Weight Loss (1,400–1,800 kcal)
  - Muscle Building (2,500–3,000 kcal)
  - Maintenance (2,000–2,400 kcal)
  - Endurance (2,200–2,800 kcal)
- Each plan: 5 meals with specific food suggestions + calorie counts
- Highlighted "Recommended Plan" based on user's profile goal
- Nutrition tips section

### 6. Dashboard CSS Variables Fixed (Dark Theme)
**Problem**: After removing ThemeContext, CSS variables in `:root` were still set to light mode values (white bg, dark text), making `TodayWorkout`, `WeeklyOverview`, and `RecentActivity` cards appear as white boxes.

**Fix**: Updated `:root` CSS variables in `globals.css`:
```css
--bg-card: rgba(0,0,0,0.4);      /* was #ffffff */
--text-primary: #ffffff;           /* was #0f172a */
--text-secondary: rgba(255,255,255,0.6); /* was #475569 */
--text-muted: rgba(255,255,255,0.4);     /* was #94a3b8 */
--border-color: rgba(255,255,255,0.08);  /* was #f1f5f9 */
--bg-hover: rgba(255,255,255,0.05);      /* was #f8fafc */
```

---

## Updated Key Files Reference (2026-05-13)

| File | Purpose |
|------|---------|
| `frontend/next.config.ts` | API rewrites proxy (`/api/*` → backend) |
| `frontend/src/lib/api.ts` | API base = `/api` (relative, proxied) |
| `frontend/src/app/globals.css` | Dark-only CSS variables |
| `frontend/src/app/dashboard/layout.tsx` | +Diet nav, clickable username |
| `frontend/src/app/dashboard/diet/page.tsx` | Full diet page (tracker + suggestions + meal plan) |
| `frontend/src/app/dashboard/profile/page.tsx` | +Profile Score card |
| `backend/src/app.js` | +Diet routes, CORS dev mode fix |
| `backend/src/server.js` | Binds to 0.0.0.0 |
| `backend/src/controllers/diet.controller.js` | Meal log CRUD + summaries |
| `backend/src/routes/diet.routes.js` | Diet API routes |
| `database/prisma/schema.prisma` | +MealLog model |

---

## Current Status (as of 2026-05-13)
- ✅ Mobile hotspot access working (Next.js proxy, no CORS issues)
- ✅ Permanent dark theme (no more day/night toggle)
- ✅ Profile Score — health/progress/habit/completeness analysis
- ✅ Diet section — calorie tracker, regional food suggestions, goal-based meal plans
- ✅ Dashboard cards transparent (dark theme CSS vars)
- ✅ Username → clickable link to profile
- ✅ Firewall rules added for ports 3000 & 5000
- ✅ All TypeScript compiles without errors

---

## Technical Notes (Persistent)
- **Glitter border**: Uses CSS Houdini `@property --angle` — won't work in Firefox (graceful fallback needed for prod)
- **Two theme systems**: `rix_auth_mode` (auth pages) vs `rix_mode` (dashboard) — independent localStorage keys
- **Next.js image caching**: If logo doesn't update, restart dev server
- **PostgreSQL**: `C:\PostgreSQL\16`, user `postgres`, port 5432, DB `ai_fitness_db`, password `postgres123`
- **Backend**: Always kill port 5000 before running `prisma migrate` — Prisma DLL gets locked by nodemon
  ```powershell
  Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- **Prisma client regeneration**: After any schema migration, run `prisma generate` from `backend/` directory (not `database/`)
- **API patch method**: `api.patch()` added to `frontend/src/lib/api.ts` — use for partial updates (PATCH requests)
- **WorkoutLog vs WorkoutSession**: `WorkoutLog` = simple per-exercise log (used by streak/dashboard stats). `WorkoutSession` = structured session with per-set data. Session completion auto-creates WorkoutLog entries for backwards compatibility.
- **GPS Tracking**: Browser Geolocation API — requires HTTPS in production (localhost works in dev). User must grant location permission.
- **Leaflet in Next.js**: Must be loaded client-side only via `dynamic(() => import(...), { ssr: false })`. Fix for default icon path: delete `_getIconUrl` from prototype.
- **MET Calorie Formula**: `calories = MET × weight_kg × (seconds / 3600)` — requires user weight from profile for accuracy
