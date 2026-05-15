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
import ProgressBar from '@/components/ui/ProgressBar';
import TodayWorkout from '@/components/dashboard/TodayWorkout';
import RecentActivity from '@/components/dashboard/RecentActivity';
import WeeklyOverview from '@/components/dashboard/WeeklyOverview';
import { WorkoutLog, WorkoutDay } from '@/types';

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

/** Recommended water (ml) = weight × 35 ml → glasses of 250ml */
function calcWaterTarget(weight?: number): number {
  if (!weight) return 8;
  return Math.round((weight * 35) / 250);
}

/** Load today's water count from localStorage */
function loadWaterToday(): number {
  if (typeof window === 'undefined') return 0;
  const key = `rix_water_${new Date().toDateString()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function saveWaterToday(count: number) {
  const key = `rix_water_${new Date().toDateString()}`;
  localStorage.setItem(key, String(count));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];

  type ProfileShape = { weight?: number; height?: number; targetWeight?: number; fitnessGoal?: string; age?: number; gender?: string; activityLevel?: string; daysPerWeek?: number };
  type ActivePlanShape = { planData: { weeklySchedule?: WorkoutDay[]; schedule?: WorkoutDay[] }; createdAt?: string; difficulty?: string };

  const [profileData, setProfileData] = useState<ProfileShape | null>(null);
  const [logsStats, setLogsStats] = useState({ workoutsThisWeek: 0, totalWorkouts: 0, logs: [] as WorkoutLog[] });
  const [activePlan, setActivePlan] = useState<ActivePlanShape | null>(null);
  const [allLogs, setAllLogs] = useState<WorkoutLog[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);

  useEffect(() => {
    setWaterGlasses(loadWaterToday());
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
    ]);
  }, []);

  const addWater = () => {
    const target = calcWaterTarget(profileData?.weight);
    if (waterGlasses < target) {
      const next = waterGlasses + 1;
      setWaterGlasses(next);
      saveWaterToday(next);
    }
  };
  const removeWater = () => {
    if (waterGlasses > 0) {
      const next = waterGlasses - 1;
      setWaterGlasses(next);
      saveWaterToday(next);
    }
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
  const todayWorkout: WorkoutDay | null = (() => {
    if (!activePlan) return null;
    const schedule = activePlan.planData?.weeklySchedule || activePlan.planData?.schedule || [];
    return schedule[0] || null;
  })();

  // TDEE / calorie targets
  const tdee = calcTDEE(profileData?.weight, profileData?.height, profileData?.age, profileData?.gender, profileData?.activityLevel);
  const burnedToday = calcBurnedToday(logsStats.logs);
  const calorieTarget = tdee || null;

  // Water
  const waterTarget = calcWaterTarget(profileData?.weight);

  // BMI
  const bmi = profileData?.weight && profileData?.height
    ? Math.round((profileData.weight / ((profileData.height / 100) ** 2)) * 10) / 10
    : null;

  // Goal progress: % of workouts completed vs plan target
  const goalProgress = (() => {
    if (!activePlan?.createdAt || !profileData?.daysPerWeek) return null;
    const weeksSince = Math.max(1, Math.round((Date.now() - new Date(activePlan.createdAt).getTime()) / (7 * 24 * 3600 * 1000)));
    const targetSessions = weeksSince * (profileData.daysPerWeek || 4);
    return Math.min(100, Math.round((logsStats.totalWorkouts / Math.max(1, targetSessions)) * 100));
  })();

  // Week number of plan
  const planWeek = (() => {
    if (!activePlan?.createdAt) return null;
    return Math.max(1, Math.round((Date.now() - new Date(activePlan.createdAt).getTime()) / (7 * 24 * 3600 * 1000)));
  })();

  // Consistency % = workoutsThisWeek / daysPerWeek
  const consistencyPct = profileData?.daysPerWeek
    ? Math.min(100, Math.round((logsStats.workoutsThisWeek / profileData.daysPerWeek) * 100))
    : null;

  // Video background — always dark/white text
  const mutedColor = 'rgba(255,255,255,0.6)';
  const borderColor = 'rgba(255,255,255,0.08)';
  const cardBg = 'rgba(0,0,0,0.45)';
  const cardBackdrop = 'blur(16px)';

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Editorial Header */}
      <div
        className="px-12 py-10 flex items-end justify-between"
        style={{ borderBottom: `1px solid ${borderColor}`, background: 'rgba(0,0,0,0.3)' }}
      >
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-3" style={{ color: mutedColor }}>
            {getTodayDate()}
          </p>
          <h1 className="text-4xl font-bold tracking-tight leading-none text-white">
            {getGreeting().toUpperCase()},
          </h1>
          <h1 className="text-4xl font-bold tracking-tight leading-none mt-1 text-white">
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
        className="px-12 py-5 flex items-center gap-6"
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

      {/* Metrics Row: Calories + Water + Body */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        {/* Calories */}
        <div className="px-10 py-8" style={{ borderRight: `1px solid ${borderColor}` }}>
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
        <div className="px-10 py-8" style={{ borderRight: `1px solid ${borderColor}` }}>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-6 text-white opacity-65">Hydration</p>
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {Array.from({ length: waterTarget }).map((_, i) => (
              <button
                key={i}
                onClick={i < waterGlasses ? removeWater : addWater}
                title={i < waterGlasses ? 'Remove' : 'Add glass'}
                className="w-7 h-9 transition-all duration-150 hover:opacity-80 cursor-pointer"
                style={{
                  background: i < waterGlasses ? 'rgba(255,255,255,0.9)' : 'transparent',
                  border: `1px solid ${i < waterGlasses ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'}`,
                }}
              />
            ))}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold leading-none text-white">{waterGlasses}</span>
            <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>/ {waterTarget} glasses</span>
          </div>
          <p className="text-[10px] tracking-[0.2em] uppercase mt-2" style={{ color: waterGlasses >= waterTarget ? '#fff' : mutedColor }}>
            {waterGlasses >= waterTarget ? 'Goal reached' : `${waterTarget - waterGlasses} remaining`}
          </p>
        </div>

        {/* Body Metrics */}
        <div className="px-10 py-8">
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-6 text-white opacity-65">Body Metrics</p>
          {profileData?.weight || bmi ? (
            <div className="space-y-4">
              <MetricRow label="Weight" value={profileData?.weight ? `${profileData.weight} kg` : '—'} />
              {profileData?.targetWeight && (
                <MetricRow label="Target" value={`${profileData.targetWeight} kg`} />
              )}
              <MetricRow label="BMI" value={bmi ? `${bmi}` : '—'} note={bmi ? getBMICategory(bmi) : undefined} />
              {profileData?.height && (
                <MetricRow label="Height" value={`${profileData.height} cm`} />
              )}
            </div>
          ) : (
            <p className="text-[11px] tracking-[0.2em] uppercase text-white opacity-55">Add metrics in Profile</p>
          )}
        </div>
      </div>

      {/* Goal Progress */}
      <div
        className="px-12 py-8"
        style={{ borderBottom: `1px solid ${borderColor}`, background: cardBg, backdropFilter: cardBackdrop }}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[9px] tracking-[0.3em] uppercase font-semibold text-white opacity-50">Goal Progress</p>
          {planWeek && (
            <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: mutedColor }}>
              Week {planWeek}
            </span>
          )}
        </div>
        {goalProgress !== null ? (
          <>
            <ProgressBar
              value={goalProgress}
              label={`${(profileData?.fitnessGoal || 'Fitness Goal').replace(/_/g, ' ')} — ${logsStats.totalWorkouts} sessions`}
              size="lg"
            />
            <div className="grid grid-cols-3 gap-8 mt-8">
              <MiniProgress label="Consistency" value={consistencyPct ?? 0} />
              <MiniProgress label="Sessions" value={Math.min(100, Math.round((logsStats.totalWorkouts / 50) * 100))} />
              <MiniProgress label="Streak" value={Math.min(100, streak * 14)} />
            </div>
          </>
        ) : (
          <p className="text-[11px] tracking-[0.2em] uppercase text-white opacity-55">
            Generate a workout plan to begin tracking
          </p>
        )}
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
          />
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            <RecentActivity logs={logsStats.logs} />
          </div>
        </div>
      </div>

      {/* Activity Heat Map */}
      <div
        className="px-12 py-8"
        style={{ background: cardBg, backdropFilter: cardBackdrop }}
      >
        <p className="text-[9px] tracking-[0.3em] uppercase font-semibold mb-2 text-white opacity-50">Activity Heat Map</p>
        <p className="text-[9px] tracking-[0.2em] uppercase mb-6 text-white opacity-20">Last 12 weeks</p>
        <ActivityHeatMap logs={allLogs} />
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

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/* ─── Sub-Components ─── */

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

function MetricRow({ label, value, note }: { label: string; value: string; note?: string }) {
  const textColor = '#fff';
  const labelColor = 'rgba(255,255,255,0.55)';
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: labelColor }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: textColor }}>{value}</span>
        {note && (
          <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-white opacity-70">
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniProgress({ label, value }: { label: string; value: number }) {
  const textColor = '#fff';
  const labelColor = 'rgba(255,255,255,0.55)';
  const trackColor = '#1a1a1a';
  return (
    <div className="text-center">
      <div className="relative w-14 h-14 mx-auto mb-3">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="24" fill="none" stroke={trackColor} strokeWidth="4" />
          <circle cx="30" cy="30" r="24" fill="none" stroke={textColor} strokeWidth="4"
            strokeLinecap="square"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - value / 100)}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold" style={{ color: textColor }}>{value}%</span>
        </div>
      </div>
      <p className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: labelColor }}>{label}</p>
    </div>
  );
}

function ActivityHeatMap({ logs }: { logs: WorkoutLog[] }) {
  const weeks = 12;
  const logDates = new Set(logs.map(l => new Date(l.loggedAt).toDateString()));
  const data: number[][] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (let w = weeks - 1; w >= 0; w--) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - w * 7 - (6 - d));
      week.push(logDates.has(date.toDateString()) ? 1 : 0);
    }
    data.push(week);
  }

  const mutedColor = '#333';
  const activeColor = '#fff';
  const emptyColor = '#111';
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex gap-1.5">
      <div className="flex flex-col gap-1.5 mr-2">
        {dayLabels.map((d, i) => (
          <div key={i} className="w-3 h-3 flex items-center justify-center">
            <span className="text-[8px] tracking-widest uppercase" style={{ color: mutedColor }}>{i % 2 === 0 ? d : ''}</span>
          </div>
        ))}
      </div>
      {data.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1.5">
          {week.map((active, di) => (
            <div
              key={di}
              className="w-3 h-3 transition-colors"
              style={{ background: active ? activeColor : emptyColor }}
              title={active ? 'Workout logged' : 'No workout'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

