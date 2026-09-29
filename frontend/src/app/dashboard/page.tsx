'use client';

/**
 * Dashboard Page — Premium Design.
 * All data comes from real API calls — no hardcoded dummy values.
 */

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import TodayWorkout from '@/components/dashboard/TodayWorkout';
import RecentActivity from '@/components/dashboard/RecentActivity';
import WeeklyOverview from '@/components/dashboard/WeeklyOverview';
import { WorkoutLog, WorkoutDay, MuscleWindow } from '@/types';
import { todayDayIndex, daysSinceLastSession, localTzOffsetMinutes } from '@/lib/schedule';

const MOTIVATIONAL_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Push harder than yesterday if you want a different tomorrow.", author: "Vincent Williams" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Mifflin-St Jeor TDEE — returns kcal/day target or null if missing data */
function calcTDEE(weight?: number, height?: number, age?: number, gender?: string, activityLevel?: string): number | null {
  if (!weight || !height || !age) return null;
  // BMR
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  // Activity multiplier
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel || 'moderate'] || 1.55));
}

/** Estimate kcal burned from today's workout logs (~300 kcal per session) */
function calcBurnedToday(logs: WorkoutLog[]): number {
  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.loggedAt).toDateString() === today);
  if (!todayLogs.length) return 0;
  const uniqueSessions = new Set(todayLogs.map(l => new Date(l.loggedAt).toTimeString().slice(0, 5))).size;
  return uniqueSessions * 300;
}

/** How much a single tap adds or removes. */
const WATER_STEP_ML = 250;

/** Recommended intake in ml = weight x 35ml, defaulting to 2L. */
function calcWaterTargetMl(weight?: number): number {
  if (!weight) return 2000;
  return Math.round(weight * 35);
}

/** ml -> litres, one decimal (1750 -> "1.8"). */
function toLitres(ml: number): string {
  return (ml / 1000).toFixed(1);
}

/**
 * Load today's intake in ml.
 * Keyed separately from the old glass-count storage so a stored "6 glasses"
 * is never misread as 6ml.
 */
function loadWaterToday(): number {
  if (typeof window === 'undefined') return 0;
  const key = `rix_water_ml_${new Date().toDateString()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function saveWaterToday(ml: number) {
  const key = `rix_water_ml_${new Date().toDateString()}`;
  localStorage.setItem(key, String(ml));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];

  type ProfileShape = { weight?: number; height?: number; targetWeight?: number; fitnessGoal?: string; age?: number; gender?: string; activityLevel?: string; daysPerWeek?: number };
  type ActivePlanShape = { id?: string; planData: { weeklySchedule?: WorkoutDay[]; schedule?: WorkoutDay[]; weekAnchor?: string }; createdAt?: string; difficulty?: string };

  const [profileData, setProfileData] = useState<ProfileShape | null>(null);
  const [logsStats, setLogsStats] = useState({ workoutsThisWeek: 0, totalWorkouts: 0, logs: [] as WorkoutLog[] });
  const [activePlan, setActivePlan] = useState<ActivePlanShape | null>(null);
  const [allLogs, setAllLogs] = useState<WorkoutLog[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [muscleWindows, setMuscleWindows] = useState<MuscleWindow[]>([]);
  const [muscleRange, setMuscleRange] = useState(1); // default: 7 days
  const [muscleError, setMuscleError] = useState('');
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    setWaterMl(loadWaterToday());
    Promise.all([
      api.get<{ user: unknown; profile: ProfileShape }>('/profile')
        .then(r => { if (r.data?.profile) setProfileData(r.data.profile); })
        .catch(() => {}),
      api.get<{ logs: WorkoutLog[]; workoutsThisWeek: number; totalWorkouts: number }>('/workouts/logs?limit=5')
        .then(r => { if (r.data) setLogsStats({ workoutsThisWeek: r.data.workoutsThisWeek, totalWorkouts: r.data.totalWorkouts, logs: r.data.logs || [] }); })
        .catch(() => {}),
      api.get<{ logs: WorkoutLog[] }>('/workouts/logs?limit=200')
        .then(r => { if (r.data?.logs) setAllLogs(r.data.logs); })
        .catch(() => {}),
      api.get<{ plan: ActivePlanShape }>('/workouts/active')
        .then(r => { if (r.data?.plan) setActivePlan(r.data.plan); })
        .catch(() => {}),
      api.get<{ windows: MuscleWindow[] }>('/workouts/stats/muscle-volume')
        .then(r => { if (r.data?.windows) setMuscleWindows(r.data.windows); })
        .catch((e: { message?: string }) => setMuscleError(e?.message || 'Could not load training data.')),
    ]);
  }, []);

  const restartWeek = async () => {
    setRestarting(true);
    try {
      await api.post('/workouts/active/restart-week', { tzOffsetMinutes: localTzOffsetMinutes() });
      window.location.reload();
    } catch {
      setRestarting(false);
    }
  };

  const addWater = () => {
    const next = waterMl + WATER_STEP_ML;
    setWaterMl(next);
    saveWaterToday(next);
  };
  const removeWater = () => {
    const next = Math.max(0, waterMl - WATER_STEP_ML);
    setWaterMl(next);
    saveWaterToday(next);
  };

  // Streak from all logs
  const streak = (() => {
    if (!allLogs.length) return 0;
    const logDays = [...new Set(allLogs.map(l => new Date(l.loggedAt).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    let s = 0; const d = new Date(); d.setHours(0, 0, 0, 0);
    let cur = d;
    for (const day of logDays) {
      const ld = new Date(day); ld.setHours(0, 0, 0, 0);
      const diff = Math.round((cur.getTime() - ld.getTime()) / 86400000);
      if (diff <= 1) { s++; cur = ld; } else break;
    }
    return s;
  })();

  // Today's workout from active plan
  // The day actually scheduled for today — null on a rest day.
  const todayWorkout: WorkoutDay | null = (() => {
    if (!activePlan) return null;
    const schedule = activePlan.planData?.weeklySchedule || activePlan.planData?.schedule || [];
    const idx = todayDayIndex(schedule.length, { anchorIso: activePlan.planData?.weekAnchor });
    return idx >= 0 ? schedule[idx] : null;
  })();

  // Offer a fresh start after a long gap rather than showing a wall of
  // missed days and a locked session.
  const daysAway = daysSinceLastSession(allLogs[0]?.loggedAt);
  const showWelcomeBack = !!activePlan && daysAway !== null && daysAway >= 7;

  // TDEE / calorie targets
  const tdee = calcTDEE(profileData?.weight, profileData?.height, profileData?.age, profileData?.gender, profileData?.activityLevel);
  const burnedToday = calcBurnedToday(logsStats.logs);
  const calorieTarget = tdee || null;

  // Water
  const waterTargetMl = calcWaterTargetMl(profileData?.weight);
  const waterPct = Math.min(100, Math.round((waterMl / waterTargetMl) * 100));



  // Video background — always dark/white text
  const mutedColor = 'rgba(255,255,255,0.6)';
  const borderColor = 'rgba(255,255,255,0.08)';
  const cardBg = 'rgba(0,0,0,0.45)';
  const cardBackdrop = 'blur(16px)';

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Editorial Header */}
      <div
        className="px-4 py-6 md:px-12 md:py-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
        style={{ borderBottom: `1px solid ${borderColor}`, background: 'rgba(0,0,0,0.3)' }}
      >
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-3" style={{ color: mutedColor }}>
            {getTodayDate()}
          </p>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-none text-white">
            {getGreeting().toUpperCase()},
          </h1>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-none mt-1 text-white">
            {(user?.firstName || 'ATHLETE').toUpperCase()}
          </h1>
          <p className="mt-4 text-[11px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>
            {(profileData?.fitnessGoal || 'Fitness').replace(/_/g, ' ')} Program
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/workouts/session')}
          className="text-[10px] tracking-[0.3em] uppercase font-bold px-8 py-3 transition-all duration-200 text-white"
          style={{ border: '1px solid rgba(255,255,255,0.5)', background: 'transparent' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#fff'; el.style.borderColor = '#fff'; el.style.color = '#000'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = 'rgba(255,255,255,0.5)'; el.style.color = '#fff'; }}
        >
          Start Workout
        </button>
      </div>

      {/* Quote Bar */}
      <div
        className="px-4 py-4 md:px-12 md:py-5 flex flex-col md:flex-row items-center gap-6"
        style={{ borderBottom: `1px solid ${borderColor}`, borderLeft: '3px solid rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.25)' }}
      >
        <p className="text-[12px] italic leading-relaxed flex-1 text-white opacity-70">
          &ldquo;{quote.text}&rdquo;
        </p>
        <span className="text-[10px] tracking-[0.2em] uppercase shrink-0 text-white opacity-50">
          — {quote.author}
        </span>
      </div>

      {/* Stats Grid — 4 columns, editorial */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        <StatCard label="Current Weight" value={profileData?.weight ?? '—'} unit={profileData?.weight ? 'kg' : ''} />
        <StatCard label="This Week" value={logsStats.workoutsThisWeek} unit="workouts"
          trend={logsStats.workoutsThisWeek > 0 ? 'up' : undefined}
          trendValue={profileData?.daysPerWeek ? `Target ${profileData.daysPerWeek}/wk` : undefined} />
        <StatCard label="Total Sessions" value={logsStats.totalWorkouts}
          trendValue={logsStats.totalWorkouts > 0 ? 'All time' : undefined} />
        <StatCard label="Streak" value={streak} unit={streak !== 1 ? 'days' : 'day'}
          trend={streak > 1 ? 'up' : undefined} trendValue={streak > 2 ? 'Keep going' : streak > 0 ? 'Great start' : undefined} />
      </div>

      {/* Welcome back — offered after a long gap */}
      {showWelcomeBack && (
        <div
          className="px-4 py-5 md:px-12 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderBottom: `1px solid ${borderColor}`, background: 'rgba(34,197,94,0.06)' }}
        >
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: '#22c55e' }}>
              Welcome back
            </p>
            <p className="text-sm text-white opacity-80">
              It&apos;s been {daysAway} days since your last session. Start the plan again from today rather than waiting for the schedule.
            </p>
          </div>
          <button
            onClick={restartWeek}
            disabled={restarting}
            className="shrink-0 text-[10px] tracking-[0.3em] uppercase font-bold px-6 py-3 transition-all disabled:opacity-50"
            style={{ border: '1px solid #22c55e', color: '#22c55e', background: 'transparent' }}
          >
            {restarting ? 'Restarting…' : 'Restart from today'}
          </button>
        </div>
      )}

      {/* Metrics Row: Calories + Water */}
      <div
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        {/* Calories */}
        <div className="px-4 py-6 md:px-10 md:py-8" style={{ borderRight: `1px solid ${borderColor}` }}>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-6 text-white opacity-65">Calories Today</p>
          {calorieTarget ? (
            <div className="flex items-center gap-6">
              <CalorieRing consumed={burnedToday} target={calorieTarget} />
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>Daily Target</p>
                  <p className="text-2xl font-bold leading-none text-white">{calorieTarget}<span className="text-[11px] font-normal ml-1" style={{ color: mutedColor }}>kcal</span></p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>Burned</p>
                  <p className="text-2xl font-bold leading-none" style={{ color: '#fff' }}>{burnedToday}<span className="text-[11px] font-normal ml-1" style={{ color: mutedColor }}>kcal</span></p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] tracking-[0.2em] uppercase text-white opacity-55">Complete profile to calculate</p>
          )}
        </div>

        {/* Water */}
        <div className="px-4 py-6 md:px-10 md:py-8">
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-6 text-white opacity-65">Hydration</p>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold leading-none text-white">{toLitres(waterMl)}</span>
            <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>
              / {toLitres(waterTargetMl)} L
            </span>
          </div>

          <div className="h-1.5 mt-4 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full transition-all duration-300"
              style={{ width: `${waterPct}%`, background: 'rgba(255,255,255,0.9)' }} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={removeWater} disabled={waterMl === 0}
              className="px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all disabled:opacity-30"
              style={{ border: `1px solid ${borderColor}`, color: 'rgba(255,255,255,0.7)' }}>
              − 250ml
            </button>
            <button onClick={addWater}
              className="px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#fff' }}>
              + 250ml
            </button>
          </div>

          <p className="text-[10px] tracking-[0.2em] uppercase mt-3" style={{ color: waterMl >= waterTargetMl ? '#fff' : mutedColor }}>
            {waterMl >= waterTargetMl
              ? 'Goal reached'
              : `${toLitres(waterTargetMl - waterMl)} L remaining`}
          </p>
        </div>
      </div>

      {/* Muscle Group Training Volume */}
      <div
        className="px-4 py-6 md:px-12 md:py-8"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[9px] tracking-[0.3em] uppercase font-semibold text-white opacity-50">
            Muscle Group Volume
          </p>
          <div className="flex gap-1">
            {muscleWindows.map((w, i) => (
              <button key={w.key} onClick={() => setMuscleRange(i)}
                className="px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase font-semibold transition-all"
                style={{
                  background: i === muscleRange ? '#fff' : 'transparent',
                  color: i === muscleRange ? '#000' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${i === muscleRange ? '#fff' : borderColor}`,
                }}>
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          // A failed request must not look like an empty week.
          if (muscleError) {
            return (
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: '#f87171' }}>
                  {muscleError}
                </p>
                <button onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1.5 text-[9px] tracking-[0.2em] uppercase font-semibold"
                  style={{ border: `1px solid ${borderColor}`, color: 'rgba(255,255,255,0.7)' }}>
                  Retry
                </button>
              </div>
            );
          }
          const win = muscleWindows[muscleRange];
          if (!win) {
            return (
              <p className="text-[11px] tracking-[0.2em] uppercase text-white opacity-55">
                No training data yet
              </p>
            );
          }

          // `target` is absent on older backends; fall back to plain counts
          // rather than judging every group against a target that isn't there.
          const target = win.target ?? null;
          const maxSets = Math.max(...win.groups.map(g => g.sets), 1);
          // Scale past the target when a group overshoots, so exceeding is
          // visible as a bar running beyond the target band.
          const scaleMax = target ? Math.max(target.max, maxSets) : maxSets;

          type GroupState = 'unknown' | 'none' | 'under' | 'on' | 'over';
          const stateOf = (sets: number, hasTarget: boolean): GroupState => {
            if (!hasTarget || !target) return 'unknown';
            if (sets === 0) return 'none';
            if (sets < target.min) return 'under';
            if (sets <= target.max) return 'on';
            return 'over';
          };

          const COLORS: Record<GroupState, string> = {
            unknown: 'rgba(255,255,255,0.55)',
            none: 'rgba(255,255,255,0.15)',
            under: '#eab308',
            on: '#22c55e',
            over: '#f87171',
          };

          const pctOf = (n: number) => Math.min(100, (n / scaleMax) * 100);

          return (
            <>
              {target && (
                <p className="text-[9px] tracking-[0.2em] uppercase mb-4" style={{ color: mutedColor }}>
                  Target {target.min}–{target.max} sets per group
                  {win.days !== 7 && ` (${win.days} days)`}
                </p>
              )}

              <div className="space-y-3">
                {win.groups.map(g => {
                  const hasTarget = target !== null && g.onTarget !== null && g.onTarget !== undefined;
                  const state = stateOf(g.sets, hasTarget);

                  return (
                    <div key={g.muscleGroup} className="flex items-center gap-3">
                      <span className="w-20 md:w-28 flex-shrink-0 text-[10px] tracking-[0.2em] uppercase font-semibold text-white"
                        style={{ opacity: state === 'none' ? 0.4 : 0.75 }}>
                        {g.muscleGroup}
                      </span>

                      <div className="flex-1 h-6 relative" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {/* The 8-10 band, so "enough" is readable at a glance */}
                        {target && hasTarget && (
                          <div className="absolute top-0 bottom-0"
                            style={{
                              left: `${pctOf(target.min)}%`,
                              width: `${pctOf(target.max) - pctOf(target.min)}%`,
                              background: 'rgba(255,255,255,0.07)',
                              borderLeft: '1px solid rgba(255,255,255,0.35)',
                              borderRight: '1px solid rgba(255,255,255,0.35)',
                            }}
                            title={`Target ${target.min}–${target.max} sets`} />
                        )}
                        <div className="h-full relative transition-all duration-500"
                          style={{ width: `${pctOf(g.sets)}%`, background: COLORS[state], opacity: 0.9 }} />
                      </div>

                      <span className="w-28 md:w-36 flex-shrink-0 text-right text-[10px] tracking-[0.1em] uppercase"
                        style={{ color: mutedColor }}>
                        <span className="font-bold text-sm" style={{ color: state === 'none' ? 'rgba(255,255,255,0.35)' : '#fff' }}>
                          {g.sets}
                        </span>
                        {hasTarget && target ? ` / ${target.min}–${target.max}` : ' sets'}
                        {state === 'over' && (
                          <span className="ml-1 font-semibold" style={{ color: '#f87171' }}>
                            +{g.sets - target!.max}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {target && (
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] tracking-[0.2em] uppercase"
                  style={{ color: mutedColor }}>
                  {([
                    ['on', 'On target'],
                    ['under', 'Below'],
                    ['over', 'Over'],
                    ['none', 'Not trained'],
                  ] as [GroupState, string][]).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5" style={{ background: COLORS[key] }} />
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[9px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>
                {win.totalSets} sets logged
                {target && (() => {
                  const over = win.groups.filter(g => g.onTarget != null && g.sets > target.max);
                  const behind = win.groups.filter(g => g.onTarget === false);
                  const parts: string[] = [];
                  if (over.length) parts.push(`over on ${over.map(g => g.muscleGroup).join(', ')}`);
                  if (behind.length) parts.push(`behind on ${behind.map(g => g.muscleGroup).join(', ')}`);
                  return parts.length ? ` · ${parts.join(' · ')}` : ' · all groups on target';
                })()}
              </p>
            </>
          );
        })()}
      </div>

      {/* Today's Workout + Activity */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        <div style={{ borderRight: `1px solid ${borderColor}` }}>
          <TodayWorkout workout={todayWorkout} />
        </div>
        <div>
          <WeeklyOverview
            completedDays={getCompletedDaysThisWeek(allLogs)}
            targetDays={profileData?.daysPerWeek || 4}
            onSelectDay={(isoDate) => router.push(`/dashboard/workouts?tab=history&date=${isoDate}`)}
          />
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            <RecentActivity logs={logsStats.logs} />
          </div>
        </div>
      </div>

    </div>
  );
}

/** Get day indices (0=Mon…6=Sun) of days with logs this week */
function getCompletedDaysThisWeek(logs: WorkoutLog[]): number[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const days = new Set<number>();
  for (const log of logs) {
    const d = new Date(log.loggedAt);
    if (d >= weekStart) {
      const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
      days.add(dayIdx);
    }
  }
  return [...days];
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const percentage = Math.min((consumed / target) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const textColor = '#fff';
  const trackColor = '#1a1a1a';
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor} strokeWidth="6" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#fff" strokeWidth="6"
          strokeLinecap="square" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[12px] font-bold tracking-tight" style={{ color: textColor }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
