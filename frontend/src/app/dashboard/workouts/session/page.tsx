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
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { canStartDay, dayStatus, planDayDate, formatDayDate, todayDayIndex, localTzOffsetMinutes } from '@/lib/schedule';

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

interface LastPerformance {
  performedAt: string;
  sessionName: string;
  sets: { weight: number; reps: number }[];
  topSetWeight: number;
  topSetReps: number;
  totalReps: number;
  totalVolume: number;
}

interface ServerSession {
  id: string;
  startedAt: string;
  pausedMs?: number;
  planDayIndex?: number | null;
  exercises: SessionExercise[];
}

interface ActivePlan {
  id: string;
  name: string;
  difficulty: string;
  planData: {
    weeklySchedule?: WorkoutDay[];
    schedule?: WorkoutDay[];
    weekAnchor?: string;
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
  const [lastPerf, setLastPerf] = useState<Record<string, LastPerformance>>({});
  const [lastPerfError, setLastPerfError] = useState('');
  const [startError, setStartError] = useState('');
  // Day whose exercises are shown in the slide-over; null when closed.
  const [previewDayIdx, setPreviewDayIdx] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [saving, setSaving] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [discarding, setDiscarding] = useState(false);
  // Clock is derived from the server's startedAt so it survives navigation,
  // reload, even a different device — never from a local counter.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState(0);        // completed pauses
  const [pausedAt, setPausedAt] = useState<number | null>(null); // current pause
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set synchronously so the plan loader doesn't overwrite the resumed day.
  const resumedRef = useRef(false);

  // Resume an unfinished session. The sets were already saved by the
  // autosave on each logged set, so nothing is recovered from the browser.
  useEffect(() => {
    api.get<{ session: ServerSession | null }>('/workouts/sessions/active')
      .then(r => {
        const live = r.data?.session;
        if (!live) return;

        resumedRef.current = true;
        setSessionId(live.id);
        setStartedAt(new Date(live.startedAt).getTime());
        setPausedMs(live.pausedMs || 0);
        const began = new Date(live.startedAt).getTime();
        setElapsed(Math.max(0, Math.floor((Date.now() - began - (live.pausedMs || 0)) / 1000)));
        setExercises(Array.isArray(live.exercises) ? live.exercises : []);
        if (live.planDayIndex != null) setSelectedDayIdx(live.planDayIndex);
        setPhase('active');
      })
      .catch(() => {})
      .finally(() => setResuming(false));
  }, []);

  // Load active plan
  useEffect(() => {
    api.get<{ plan: ActivePlan | null }>('/workouts/active').then(r => {
      const plan = r.data?.plan;
      if (!plan) return;
      setActivePlan(plan);
      const days = plan.planData?.weeklySchedule || plan.planData?.schedule || [];
      setSchedule(days);

      // A resumed session already picked its day.
      if (resumedRef.current) return;

      // Open on today's session if there is one, else the most recent
      // startable day, so the user isn't staring at a locked day.
      const anchorIso = plan.planData?.weekAnchor;
      const todayIdx = todayDayIndex(days.length, { anchorIso });
      if (todayIdx >= 0) {
        setSelectedDayIdx(todayIdx);
      } else {
        let fallback = 0;
        for (let i = 0; i < days.length; i++) {
          if (canStartDay(i, { anchorIso })) fallback = i;
        }
        setSelectedDayIdx(fallback);
      }
    }).catch(() => {});

    // What we lifted last time, per exercise — the numbers to beat.
    api.get<{ lastPerformance: Record<string, LastPerformance> }>('/workouts/stats/last-performance')
      .then(r => setLastPerf(r.data?.lastPerformance || {}))
      .catch((e: { message?: string }) => setLastPerfError(e?.message || 'Could not load your previous numbers.'));
  }, []);

  // Elapsed = wall clock since start, minus any time spent paused.
  const computeElapsed = useCallback((now = Date.now()) => {
    if (!startedAt) return 0;
    const pausedSoFar = pausedMs + (pausedAt ? now - pausedAt : 0);
    return Math.max(0, Math.floor((now - startedAt - pausedSoFar) / 1000));
  }, [startedAt, pausedMs, pausedAt]);

  // The effect only owns the interval. `elapsed` is seeded wherever the
  // clock is anchored (start, resume, unpause) so nothing is set
  // synchronously from an effect.
  useEffect(() => {
    if (phase !== 'active' || !startedAt || pausedAt) return;
    timerRef.current = setInterval(() => setElapsed(computeElapsed()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, startedAt, pausedAt, computeElapsed]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Start session — create in DB, init exercise state
  const handleStart = async () => {
    const day = schedule[selectedDayIdx];
    if (!day) return;
    // Future days are view-only. The server enforces this too.
    if (!canStartDay(selectedDayIdx, { anchorIso: activePlan?.planData?.weekAnchor })) return;

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
      const res = await api.post<{ session: { id: string; startedAt: string } }>('/workouts/sessions/start', {
        planId: activePlan?.id,
        planDayIndex: selectedDayIdx,
        name: `${day.day} – ${day.focus}`,
        exercises: sessionExercises,
        tzOffsetMinutes: localTzOffsetMinutes(),
      });
      const created = res.data?.session;
      setSessionId(created?.id || null);
      setStartedAt(created?.startedAt ? new Date(created.startedAt).getTime() : Date.now());
      setPausedMs(0);
      setPausedAt(null);
      setElapsed(0);
    } catch (err) {
      // A rejected start (e.g. the day is locked) must not drop the user
      // into a session the server has no record of.
      const e = err as { status?: number; message?: string };
      if (e?.status === 403) {
        setStartError(e.message || 'This workout can only be started on its scheduled day.');
        return;
      }
      // Any other failure (offline, server down) still allows local logging.
    }

    setStartedAt(prev => prev ?? Date.now());
    setPhase('active');
    setActiveExerciseIdx(0);
  };

  // Pause freezes the clock; the accumulated total is persisted so it
  // survives leaving the page mid-break.
  const togglePause = () => {
    if (pausedAt) {
      const now = Date.now();
      const total = pausedMs + (now - pausedAt);
      setPausedMs(total);
      setPausedAt(null);
      if (startedAt) setElapsed(Math.max(0, Math.floor((now - startedAt - total) / 1000)));
      if (sessionId) api.patch(`/workouts/sessions/${sessionId}`, { pausedMs: total }).catch(() => {});
    } else {
      setPausedAt(Date.now());
    }
  };

  // Leave the session running and come back to it later.
  const handleSaveExit = async () => {
    if (sessionId) {
      const total = pausedMs + (pausedAt ? Date.now() - pausedAt : 0);
      await api.patch(`/workouts/sessions/${sessionId}`, { exercises, pausedMs: total }).catch(() => {});
    }
    router.push('/dashboard');
  };

  // Abandon it entirely, otherwise it stays in progress and resumes forever.
  const handleDiscard = async () => {
    if (!window.confirm('Discard this workout? Logged sets will be deleted and this cannot be undone.')) return;
    setDiscarding(true);
    try {
      if (sessionId) await api.delete(`/workouts/sessions/${sessionId}`);
      router.push('/dashboard');
    } catch {
      setDiscarding(false);
    }
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

  // Close the preview on Escape, and stop the page scrolling behind it.
  useEffect(() => {
    if (previewDayIdx === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewDayIdx(null); };
    window.addEventListener('keydown', onKey);
    // The dashboard scrolls <main>, not <body>, so lock both.
    const main = document.querySelector('main');
    const previousBody = document.body.style.overflow;
    const previousMain = main?.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
    if (main) main.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousBody;
      if (main) main.style.overflow = previousMain;
    };
  }, [previewDayIdx]);

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
          totalDuration: computeElapsed(),
          pausedMs: pausedMs + (pausedAt ? Date.now() - pausedAt : 0),
        });
      }
    } catch { /* ignore */ }
    setSaving(false);
    setPhase('done');
  };

  const completedSetsTotal = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0);
  const totalSetsTotal = exercises.reduce((a, ex) => a + ex.sets.length, 0);

  // Reps actually performed, and volume (weight x reps), across completed sets
  const completedSets = exercises.flatMap(ex => ex.sets.filter(s => s.completed));
  const repsTotal = completedSets.reduce((a, s) => a + (parseInt(s.reps, 10) || 0), 0);
  const volumeTotal = Math.round(completedSets.reduce(
    (a, s) => a + (parseInt(s.reps, 10) || 0) * (parseFloat(s.weight) || 0), 0
  ));

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{formatTime(elapsed)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Duration</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{completedSetsTotal}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sets done</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{repsTotal}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total reps</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{volumeTotal.toLocaleString()}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Volume (kg)</p>
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
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {doneSets.length} sets · {doneSets.reduce((a, s) => a + (parseInt(s.reps, 10) || 0), 0)} reps
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {doneSets.map(s => s.reps || 0).join(' · ')}
                    {doneSets[0]?.weight ? ` @ ${doneSets[0].weight}kg` : ''}
                  </p>
                </div>
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

  // Checking for an unfinished session — showing the picker first would
  // flash the wrong screen and invite starting a duplicate workout.
  if (resuming) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              {schedule.map((day, i) => {
                const anchorIso = activePlan?.planData?.weekAnchor;
                const status = dayStatus(i, { anchorIso });
                const locked = status === 'future';
                const scheduledFor = formatDayDate(planDayDate(i, { anchorIso }));
                return (
                <button key={i} onClick={() => { setSelectedDayIdx(i); setPreviewDayIdx(i); }}
                  className="w-full text-left rounded-xl border p-4 transition-all"
                  style={{
                    background: selectedDayIdx === i ? 'rgba(255,255,255,0.06)' : 'var(--bg-card)',
                    borderColor: selectedDayIdx === i ? '#fff' : 'var(--border-color)',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: selectedDayIdx === i ? '#fff' : 'var(--bg-hover)',
                        color: selectedDayIdx === i ? '#000' : 'var(--text-secondary)',
                      }}>
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {day.day}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{day.focus}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span className="text-[11px] block whitespace-nowrap font-medium"
                        style={{ color: status === 'today' ? '#22c55e' : 'var(--text-muted)' }}>
                        {locked ? `🔒 ${scheduledFor}` : status === 'today' ? 'Today' : scheduledFor}
                      </span>
                      <span className="text-[11px] block mt-0.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {day.exercises.length} exercises
                      </span>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>

            {(() => {
              const anchorIso = activePlan?.planData?.weekAnchor;
              const selectedLocked = schedule.length > 0 && !canStartDay(selectedDayIdx, { anchorIso });
              const scheduledFor = schedule.length > 0
                ? formatDayDate(planDayDate(selectedDayIdx, { anchorIso }))
                : '';

              return (
                <>
                  {startError && (
                    <p className="text-sm mb-3 rounded-lg px-3 py-2"
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                      {startError}
                    </p>
                  )}

                  <button onClick={handleStart} disabled={schedule.length === 0 || selectedLocked}
                    className="w-full py-3 rounded-xl text-black font-semibold text-base transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed uppercase tracking-wider"
                    style={{ background: '#fff' }}>
                    {selectedLocked
                      ? `🔒 Opens ${scheduledFor}`
                      : `🏋️ Start — ${schedule[selectedDayIdx]?.day || 'Select a day'}`}
                  </button>

                  {selectedLocked && (
                    <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                      You can review this workout now — it can only be started on its scheduled day.
                    </p>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* Slide-over: full workout for the chosen day, locked or not.
            Portalled to <body> because the dashboard's <main> is z-10 and the
            nav is z-20 — a fixed panel rendered inside main sits under it. */}
        {(() => {
          const idx = previewDayIdx;
          if (idx === null || typeof document === 'undefined') return null;
          const day = schedule[idx];
          if (!day) return null;

          const anchorIso = activePlan?.planData?.weekAnchor;
          const status = dayStatus(idx, { anchorIso });
          const locked = status === 'future';
          const scheduledFor = formatDayDate(planDayDate(idx, { anchorIso }));
          const totalSets = day.exercises.reduce((a, ex) => a + (ex.sets || 0), 0);

          return createPortal(
            <div className="fixed inset-0 z-[100] flex justify-end">
              <div
                onClick={() => setPreviewDayIdx(null)}
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
                aria-hidden="true"
              />

              <aside
                role="dialog"
                aria-modal="true"
                aria-label={`${day.day} — ${day.focus}`}
                className="relative flex flex-col h-full w-full sm:max-w-[420px] animate-[slideIn_.22s_ease-out]"
                style={{
                  background: 'var(--bg-card)',
                  borderLeft: '1px solid var(--border-color)',
                  boxShadow: '-16px 0 40px rgba(0,0,0,0.45)',
                }}
              >
                <header className="flex-shrink-0 flex items-start gap-3 px-5 py-4"
                  style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                      {day.day}
                    </h2>
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{day.focus}</p>
                    <p className="text-xs mt-1.5"
                      style={{ color: status === 'today' ? '#22c55e' : 'var(--text-muted)' }}>
                      {locked ? `🔒 ${scheduledFor}` : status === 'today' ? 'Today' : scheduledFor}
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' · '}{day.exercises.length} exercises{' · '}{totalSets} sets
                      </span>
                    </p>
                  </div>
                  <button onClick={() => setPreviewDayIdx(null)} aria-label="Close"
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xl leading-none"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    ×
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5">
                  {day.exercises.map((ex, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-3"
                      style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {ex.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {ex.muscleGroup}{ex.equipment ? ` · ${ex.equipment}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {ex.sets} × {ex.reps}
                        </p>
                        <p className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {ex.restSeconds}s rest
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="flex-shrink-0 px-5 pt-4"
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                  }}>
                  <button
                    onClick={() => { setPreviewDayIdx(null); handleStart(); }}
                    disabled={locked}
                    className="w-full py-3 rounded-xl text-black font-semibold text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#fff' }}>
                    {locked ? `🔒 Opens ${scheduledFor}` : `🏋️ Start ${day.day}`}
                  </button>
                  {locked && (
                    <p className="text-xs text-center mt-2.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      Review it now — it can only be started on its scheduled day.
                    </p>
                  )}
                </footer>
              </aside>
            </div>,
            document.body
          );
        })()}
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
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="text-lg font-mono font-bold"
              style={{ color: pausedAt ? 'var(--text-muted)' : 'var(--color-primary)' }}>
              {formatTime(elapsed)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pausedAt ? 'Paused' : `${completedSetsTotal}/${totalSetsTotal} sets`}
            </p>
          </div>
          <button onClick={togglePause}
            aria-label={pausedAt ? 'Resume timer' : 'Pause timer'}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            {pausedAt ? '▶' : '❚❚'}
          </button>
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

          {/* Last time — the numbers to beat */}
          {(() => {
            const prev = lastPerf[currentEx.name];
            if (!prev && lastPerfError) {
              // Never imply this is a first attempt when the lookup failed.
              return (
                <div className="rounded-lg px-3 py-2 mb-4 text-xs"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                  {lastPerfError} Your history is safe — log this set as normal.
                </div>
              );
            }
            if (!prev) {
              return (
                <div className="rounded-lg px-3 py-2 mb-4 text-xs"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                  First time logging this exercise — today sets your baseline.
                </div>
              );
            }

            const doneSets = currentEx.sets.filter(s => s.completed);
            const todayVolume = doneSets.reduce(
              (a, s) => a + (parseInt(s.reps, 10) || 0) * (parseFloat(s.weight) || 0), 0
            );
            const delta = prev.totalVolume ? Math.round(((todayVolume - prev.totalVolume) / prev.totalVolume) * 100) : null;
            const beaten = todayVolume > prev.totalVolume;

            return (
              <div className="rounded-lg px-3 py-2.5 mb-4"
                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3b82f6' }}>
                    Last time · {new Date(prev.performedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Top {prev.topSetWeight ? `${prev.topSetWeight}kg × ` : ''}{prev.topSetReps}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prev.sets.map((ps, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                      {ps.weight ? `${ps.weight}kg × ` : ''}{ps.reps}
                    </span>
                  ))}
                </div>
                {doneSets.length > 0 && prev.totalVolume > 0 && (
                  <p className="text-xs mt-2 font-semibold"
                    style={{ color: beaten ? '#22c55e' : 'var(--text-muted)' }}>
                    {beaten ? '↑ ' : ''}Today {Math.round(todayVolume).toLocaleString()}kg vs {prev.totalVolume.toLocaleString()}kg
                    {delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}
                  </p>
                )}
              </div>
            );
          })()}

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
                  placeholder={lastPerf[currentEx.name]?.sets[si]?.weight?.toString() || '0'}
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
                  placeholder={lastPerf[currentEx.name]?.sets[si]?.reps?.toString() || currentEx.plannedReps}
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

          <div className="flex gap-2 mt-3">
            <button onClick={handleSaveExit}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
              Save &amp; exit
            </button>
            <button onClick={handleDiscard} disabled={discarding}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' }}>
              {discarding ? 'Discarding…' : 'Discard'}
            </button>
          </div>
          <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
            Your sets save as you log them — leaving won&apos;t lose them.
          </p>
        </div>
      )}
    </div>
  );
}
