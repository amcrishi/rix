'use client';

/**
 * Live Workout Session Tracker — /dashboard/workouts/session
 *
 * Flow:
 *   1. Load today's exercises from active plan (or let user pick day)
 *   2. For each exercise: log sets with actual weight × reps
 *   3. Auto rest-timer starts after each set is logged
 *   4. "Finish Workout" saves session to DB
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────

interface PlanExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: PlanExercise[];
}

interface SetLog {
  setNum: number;
  weight: string;
  reps: string;
  completed: boolean;
  completedAt?: string;
}

interface SessionExercise {
  name: string;
  muscleGroup: string;
  equipment: string;
  restSeconds: number;
  plannedSets: number;
  plannedReps: string;
  sets: SetLog[];
}

interface ActivePlan {
  id: string;
  name: string;
  difficulty: string;
  planData: {
    weeklySchedule?: WorkoutDay[];
    schedule?: WorkoutDay[];
  };
}

// ─── Rest Timer Component ─────────────────────────────

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const pct = (remaining / seconds) * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="#3b82f6" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{remaining}s</span>
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Rest · {seconds}s</p>
      <button onClick={onDone}
        className="px-4 py-1.5 text-xs font-semibold rounded-lg"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
        Skip Rest
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────

export default function SessionPage() {
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [schedule, setSchedule] = useState<WorkoutDay[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [phase, setPhase] = useState<'pick' | 'active' | 'done'>('pick');

  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number }>({ active: false, seconds: 60 });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load active plan
  useEffect(() => {
    api.get<{ plan: ActivePlan | null }>('/workouts/active').then(r => {
      const plan = r.data?.plan;
      if (!plan) return;
      setActivePlan(plan);
      const days = plan.planData?.weeklySchedule || plan.planData?.schedule || [];
      setSchedule(days);
    }).catch(() => {});
  }, []);

  // Elapsed timer while session is active
  useEffect(() => {
    if (phase === 'active') {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Start session — create in DB, init exercise state
  const handleStart = async () => {
    const day = schedule[selectedDayIdx];
    if (!day) return;

    const sessionExercises: SessionExercise[] = day.exercises.map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment || 'bodyweight',
      restSeconds: ex.restSeconds || 60,
      plannedSets: ex.sets,
      plannedReps: ex.reps,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        setNum: i + 1,
        weight: '',
        reps: '',
        completed: false,
      })),
    }));

    setExercises(sessionExercises);

    try {
      const res = await api.post<{ session: { id: string } }>('/workouts/sessions/start', {
        planId: activePlan?.id,
        planDayIndex: selectedDayIdx,
        name: `${day.day} – ${day.focus}`,
        exercises: sessionExercises,
      });
      setSessionId(res.data?.session?.id || null);
    } catch { /* continue even if DB fails */ }

    setPhase('active');
    setActiveExerciseIdx(0);
  };

  // Log a set
  const logSet = (exIdx: number, setIdx: number) => {
    const updated = exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => {
          if (si !== setIdx) return s;
          return { ...s, completed: true, completedAt: new Date().toISOString() };
        }),
      };
    });
    setExercises(updated);

    // Auto-start rest timer
    const restSecs = updated[exIdx].restSeconds;
    setRestTimer({ active: true, seconds: restSecs });

    // Auto-save progress
    if (sessionId) {
      api.patch(`/workouts/sessions/${sessionId}`, { exercises: updated }).catch(() => {});
    }
  };

  const updateSetField = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) };
    }));
  };

  const handleRestDone = useCallback(() => {
    setRestTimer({ active: false, seconds: 60 });
  }, []);

  // Finish session
  const handleFinish = async () => {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (sessionId) {
        await api.patch(`/workouts/sessions/${sessionId}`, {
          exercises,
          status: 'completed',
          totalDuration: elapsed,
        });
      }
    } catch { /* ignore */ }
    setSaving(false);
    setPhase('done');
  };

  const completedSetsTotal = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0);
  const totalSetsTotal = exercises.reduce((a, ex) => a + ex.sets.length, 0);

  // ── Render ────────────────────────────────────────

  // Done screen
  if (phase === 'done') {
    const completedExercises = exercises.filter(ex => ex.sets.some(s => s.completed));
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Workout Complete!</h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Great job finishing {schedule[selectedDayIdx]?.day}!
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{formatTime(elapsed)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Duration</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{completedSetsTotal}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sets done</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{completedExercises.length}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Exercises</p>
          </div>
        </div>
        <div className="space-y-3 mb-8 text-left">
          {completedExercises.map((ex, i) => {
            const doneSets = ex.sets.filter(s => s.completed);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ex.muscleGroup}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {doneSets.length} sets
                  {doneSets[0]?.weight ? ` · ${doneSets[0].weight}kg` : ''}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black uppercase tracking-wider"
            style={{ background: '#fff' }}>
            Back to Dashboard
          </button>
          <button onClick={() => router.push('/dashboard/workouts')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            View Plans
          </button>
        </div>
      </div>
    );
  }

  // Day picker
  if (phase === 'pick') {
    return (
      <div className="max-w-xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 text-sm"
          style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Start Workout</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Choose today&apos;s session from your active plan.
        </p>

        {!activePlan ? (
          <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="text-4xl mb-3">🏋️</div>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No active plan found</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Generate a workout plan first.</p>
            <button onClick={() => router.push('/dashboard/workouts')}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-black uppercase tracking-wider"
              style={{ background: '#fff' }}>
              Generate Plan
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border p-4 mb-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>ACTIVE PLAN</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{activePlan.name}</p>
              <p className="text-xs" style={{ color: 'var(--color-primary)' }}>{activePlan.difficulty}</p>
            </div>

            <div className="space-y-3 mb-6">
              {schedule.map((day, i) => (
                <button key={i} onClick={() => setSelectedDayIdx(i)}
                  className="w-full text-left rounded-xl border p-4 transition-all"
                  style={{
                    background: selectedDayIdx === i ? 'rgba(255,255,255,0.06)' : 'var(--bg-card)',
                    borderColor: selectedDayIdx === i ? '#fff' : 'var(--border-color)',
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: selectedDayIdx === i ? '#fff' : 'var(--bg-hover)',
                          color: selectedDayIdx === i ? '#000' : 'var(--text-secondary)',
                        }}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{day.day}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{day.focus}</p>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {day.exercises.length} exercises
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleStart} disabled={schedule.length === 0}
              className="w-full py-3 rounded-xl text-black font-semibold text-base transition-all hover:scale-[1.02] disabled:opacity-50 uppercase tracking-wider"
              style={{ background: '#fff' }}>
              🏋️ Start — {schedule[selectedDayIdx]?.day || 'Select a day'}
            </button>
          </>
        )}
      </div>
    );
  }

  // Active session
  const currentDay = schedule[selectedDayIdx];
  const currentEx = exercises[activeExerciseIdx];

  return (
    <div className="max-w-xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{currentDay?.day}</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{currentDay?.focus}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-mono font-bold" style={{ color: 'var(--color-primary)' }}>{formatTime(elapsed)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{completedSetsTotal}/{totalSetsTotal} sets</p>
          </div>
          <button onClick={handleFinish} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#22c55e' }}>
            {saving ? '...' : 'Finish'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${totalSetsTotal ? (completedSetsTotal / totalSetsTotal) * 100 : 0}%`, background: '#22c55e' }} />
      </div>

      {/* Rest Timer overlay */}
      {restTimer.active && (
        <div className="rounded-xl border mb-5 p-4" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.3)' }}>
          <RestTimer seconds={restTimer.seconds} onDone={handleRestDone} />
        </div>
      )}

      {/* Exercise nav tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {exercises.map((ex, i) => {
          const done = ex.sets.every(s => s.completed);
          const partial = ex.sets.some(s => s.completed);
          return (
            <button key={i} onClick={() => setActiveExerciseIdx(i)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: i === activeExerciseIdx ? '#fff' : done ? 'rgba(34,197,94,0.1)' : partial ? 'rgba(234,179,8,0.1)' : 'var(--bg-hover)',
                color: i === activeExerciseIdx ? '#000' : done ? '#22c55e' : partial ? '#eab308' : 'var(--text-secondary)',
                border: `1px solid ${i === activeExerciseIdx ? '#fff' : done ? 'rgba(34,197,94,0.3)' : partial ? 'rgba(234,179,8,0.3)' : 'var(--border-color)'}`,
              }}>
              {done ? '✓ ' : ''}{i + 1}. {ex.name.split(' ').slice(0, 2).join(' ')}
            </button>
          );
        })}
      </div>

      {/* Current exercise card */}
      {currentEx && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{currentEx.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-text)' }}>
                  {currentEx.muscleGroup}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {currentEx.equipment} · {currentEx.restSeconds}s rest
                </span>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
              Plan: {currentEx.plannedSets}×{currentEx.plannedReps}
            </span>
          </div>

          {/* Sets table */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-1 mb-1">
              <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>Set</p>
              <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>Weight (kg)</p>
              <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>Reps</p>
              <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>Done</p>
            </div>

            {currentEx.sets.map((set, si) => (
              <div key={si}
                className="grid grid-cols-4 gap-2 items-center px-1 py-2 rounded-lg transition-colors"
                style={{ background: set.completed ? 'rgba(34,197,94,0.06)' : 'var(--bg-hover)' }}>
                <div className="text-center">
                  <span className="text-sm font-bold" style={{ color: set.completed ? '#22c55e' : 'var(--text-primary)' }}>
                    {set.setNum}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={set.weight}
                  disabled={set.completed}
                  onChange={e => updateSetField(activeExerciseIdx, si, 'weight', e.target.value)}
                  className="w-full text-center text-sm font-semibold rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-white/20"
                  style={{
                    background: set.completed ? 'transparent' : 'var(--bg-card)',
                    border: `1px solid ${set.completed ? 'transparent' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
                <input
                  type="number"
                  placeholder={currentEx.plannedReps}
                  value={set.reps}
                  disabled={set.completed}
                  onChange={e => updateSetField(activeExerciseIdx, si, 'reps', e.target.value)}
                  className="w-full text-center text-sm font-semibold rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-white/20"
                  style={{
                    background: set.completed ? 'transparent' : 'var(--bg-card)',
                    border: `1px solid ${set.completed ? 'transparent' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
                <div className="flex justify-center">
                  {set.completed ? (
                    <span className="text-lg">✅</span>
                  ) : (
                    <button
                      onClick={() => logSet(activeExerciseIdx, si)}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                      style={{ borderColor: '#fff', color: '#fff' }}>
                      ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Next exercise button */}
          {activeExerciseIdx < exercises.length - 1 && (
            <button onClick={() => setActiveExerciseIdx(i => i + 1)}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-black uppercase tracking-wider"
              style={{ background: '#fff' }}>
              Next: {exercises[activeExerciseIdx + 1]?.name} →
            </button>
          )}
          {activeExerciseIdx === exercises.length - 1 && (
            <button onClick={handleFinish} disabled={saving}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#22c55e' }}>
              {saving ? 'Saving...' : '🏁 Finish Workout'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
