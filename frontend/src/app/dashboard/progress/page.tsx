'use client';

/**
 * Progress Page — /dashboard/progress
 * Shows workout frequency, goal tracking, and workout history from real API data.
 * Uses theme CSS variables for dark/light mode support.
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProgressBar from '@/components/ui/ProgressBar';
import StatCard from '@/components/ui/StatCard';

interface WorkoutLog { id: string; exercise: string; sets: number; reps: number; weight: number | null; duration: number | null; notes: string | null; loggedAt: string; }
interface LogsResponse { logs: WorkoutLog[]; total: number; workoutsThisWeek: number; totalWorkouts: number; }
interface Profile { weight?: number; height?: number; targetWeight?: number; fitnessGoal?: string; }

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [stats, setStats] = useState({ workoutsThisWeek: 0, totalWorkouts: 0 });
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<LogsResponse>('/workouts/logs').then(r => {
        if (r.data) {
          setLogs(r.data.logs || []);
          setStats({ workoutsThisWeek: r.data.workoutsThisWeek, totalWorkouts: r.data.totalWorkouts });
        }
      }).catch(() => {}),
      api.get<{ user: unknown; profile: Profile | null }>('/profile').then(r => {
        if (r.data?.profile) setProfile(r.data.profile);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Build weekly data from logs (last 6 weeks)
  const weeklyData = (() => {
    const weeks: { week: string; workouts: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay()); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      const count = new Set(
        logs.filter(l => { const ld = new Date(l.loggedAt); return ld >= weekStart && ld < weekEnd; })
            .map(l => new Date(l.loggedAt).toDateString())
      ).size;
      weeks.push({ week: i === 0 ? 'This Week' : `${6 - i}w ago`, workouts: count });
    }
    return weeks;
  })();

  const maxWorkouts = Math.max(...weeklyData.map(w => w.workouts), 1);

  // Streak calculation
  const streak = (() => {
    if (!logs.length) return 0;
    const logDays = [...new Set(logs.map(l => new Date(l.loggedAt).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    let s = 0;
    let d = new Date(); d.setHours(0, 0, 0, 0);
    for (const day of logDays) {
      const ld = new Date(day); ld.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - ld.getTime()) / 86400000);
      if (diff <= 1) { s++; d = ld; } else break;
    }
    return s;
  })();

  // Goal progress based on weight vs target
  const goalProgress = (() => {
    if (!profile.weight || !profile.targetWeight) return 0;
    const diff = Math.abs(profile.weight - profile.targetWeight);
    const total = Math.abs(75 - profile.targetWeight) || 10;
    return Math.max(0, Math.min(100, Math.round((1 - diff / total) * 100)));
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Progress</h1>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Track your fitness journey over time.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Current Weight" value={profile.weight ?? '—'} unit="kg"
          icon={<span className="text-2xl">⚖️</span>} />
        <StatCard label="This Week" value={stats.workoutsThisWeek} unit="sessions"
          icon={<span className="text-2xl">🔥</span>} trend="up" trendValue={`${stats.workoutsThisWeek} sessions`} />
        <StatCard label="Total Sessions" value={stats.totalWorkouts}
          icon={<span className="text-2xl">🏆</span>} />
        <StatCard label="Day Streak" value={streak} unit="days"
          icon={<span className="text-2xl">⚡</span>} trend={streak > 0 ? 'up' : undefined} trendValue={streak > 2 ? 'Keep it up!' : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Progress */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Goal Progress</h2>
          <div className="space-y-4">
            <ProgressBar value={goalProgress} label={`${(profile.fitnessGoal || 'fitness goal').replace(/_/g, ' ')} — Weight Progress`} size="md" />
            <ProgressBar value={Math.min(100, stats.workoutsThisWeek * 20)} label="Weekly Consistency" size="md" />
            <ProgressBar value={Math.min(100, Math.round((stats.totalWorkouts / 50) * 100))} label="Total Milestones (50 sessions)" size="md" />
          </div>
          {profile.weight && profile.targetWeight && (
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Current: {profile.weight}kg → Target: {profile.targetWeight}kg ({Math.abs(profile.weight - profile.targetWeight).toFixed(1)}kg to go)
            </p>
          )}
        </div>

        {/* Weekly Frequency Chart */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Weekly Workout Frequency</h2>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{week.workouts}</span>
                <div className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(4, (week.workouts / maxWorkouts) * 100)}px`,
                    background: i === weeklyData.length - 1 ? 'var(--color-primary)' : 'var(--color-primary-light)',
                  }} />
                <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{week.week}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workout Logs */}
        <div className="rounded-xl border p-6 shadow-sm lg:col-span-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Workout History {logs.length === 0 && (
              <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>(no logs yet)</span>
            )}
          </h2>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p style={{ color: 'var(--text-secondary)' }}>No workout logs yet. Start tracking your workouts!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Exercise</th>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Sets</th>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Reps</th>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Weight</th>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{log.exercise}</td>
                      <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{log.sets}</td>
                      <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{log.duration ? `${log.duration} min` : log.reps}</td>
                      <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{log.weight ? `${log.weight} kg` : '—'}</td>
                      <td className="py-2.5" style={{ color: 'var(--text-muted)' }}>{new Date(log.loggedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
