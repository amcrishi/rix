'use client';

/**
 * Workouts Page — /dashboard/workouts
 * Tabs: My Plan | Cardio | History
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const GOALS = ['lose_weight', 'build_muscle', 'maintain', 'endurance', 'flexibility'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

const CARDIO_TYPES = [
  { id: 'running', label: 'Running', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'hiit', label: 'HIIT', icon: '⚡' },
  { id: 'jump_rope', label: 'Jump Rope', icon: '🤸' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'rowing', label: 'Rowing', icon: '🚣' },
  { id: 'other', label: 'Other', icon: '🏋️' },
];

const muscleColors: Record<string, { bg: string; text: string }> = {
  chest: { bg: 'rgba(255,255,255,0.08)', text: '#fff' },
  back: { bg: 'rgba(255,255,255,0.06)', text: '#ccc' },
  legs: { bg: 'rgba(255,255,255,0.08)', text: '#e5e5e5' },
  shoulders: { bg: 'rgba(255,255,255,0.06)', text: '#bbb' },
  arms: { bg: 'rgba(255,255,255,0.08)', text: '#ddd' },
  core: { bg: 'rgba(255,255,255,0.06)', text: '#aaa' },
  cardio: { bg: 'rgba(255,255,255,0.08)', text: '#ccc' },
  full_body: { bg: 'rgba(255,255,255,0.06)', text: '#e5e5e5' },
};

interface Exercise { name: string; muscleGroup: string; sets: number; reps: string; restSeconds: number; equipment: string; }
interface WorkoutDay { day: string; focus: string; exercises: Exercise[]; }
interface WorkoutPlan { id: string; name: string; description: string; difficulty: string; durationWeeks: number; isActive: boolean; generatedBy: string; planData: { weeklySchedule?: WorkoutDay[]; schedule?: WorkoutDay[] }; createdAt: string; }

interface CardioSession {
  id: string;
  type: string;
  duration: number;
  distance?: number;
  distanceUnit?: string;
  intensity?: string;
  caloriesBurned?: number;
  heartRate?: number;
  notes?: string;
  loggedAt: string;
}

interface WorkoutSession {
  id: string;
  name: string;
  status: string;
  totalDuration?: number;
  exercises: { name: string; muscleGroup: string; sets: { completed: boolean; weight: string; reps: string }[] }[];
  startedAt: string;
  completedAt?: string;
}

type Tab = 'plan' | 'cardio' | 'history';

export default function WorkoutsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('plan');

  // Plan tab state
  const [generating, setGenerating] = useState(false);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState('');
  const [form, setForm] = useState({ goal: 'build_muscle', level: 'intermediate', days: '4', useAI: false });

  // Cardio tab state
  const [cardioForm, setCardioForm] = useState({ type: 'running', duration: '', distance: '', distanceUnit: 'km', intensity: 'moderate', caloriesBurned: '', heartRate: '', notes: '' });
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([]);
  const [savingCardio, setSavingCardio] = useState(false);
  const [cardioSuccess, setCardioSuccess] = useState(false);

  // History tab state
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchActivePlan();
  }, []);

  useEffect(() => {
    if (tab === 'cardio') fetchCardio();
    if (tab === 'history') fetchSessions();
  }, [tab]);

  const fetchActivePlan = async () => {
    try {
      const res = await api.get<{ plan: WorkoutPlan | null }>('/workouts/active');
      setActivePlan(res.data?.plan || null);
    } catch { /* no plan */ } finally { setLoadingPlan(false); }
  };

  const fetchCardio = async () => {
    try {
      const res = await api.get<{ sessions: CardioSession[] }>('/workouts/cardio?limit=10');
      setCardioSessions(res.data?.sessions || []);
    } catch { /* */ }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get<{ sessions: WorkoutSession[] }>('/workouts/sessions?limit=20');
      setSessions(res.data?.sessions || []);
    } catch { /* */ } finally { setLoadingSessions(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true); setPlanError('');
    try {
      const res = await api.post<{ plan: WorkoutPlan }>('/workouts/generate', {
        fitnessGoal: form.goal, experienceLevel: form.level,
        daysPerWeek: parseInt(form.days), useAI: form.useAI,
      });
      setActivePlan(res.data?.plan || null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPlanError(e.message || 'Failed to generate plan');
    } finally { setGenerating(false); }
  };

  const handleLogCardio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardioForm.duration) return;
    setSavingCardio(true);
    try {
      await api.post('/workouts/cardio', {
        type: cardioForm.type,
        duration: parseInt(cardioForm.duration),
        distance: cardioForm.distance ? parseFloat(cardioForm.distance) : undefined,
        distanceUnit: cardioForm.distanceUnit,
        intensity: cardioForm.intensity,
        caloriesBurned: cardioForm.caloriesBurned ? parseInt(cardioForm.caloriesBurned) : undefined,
        heartRate: cardioForm.heartRate ? parseInt(cardioForm.heartRate) : undefined,
        notes: cardioForm.notes || undefined,
      });
      setCardioSuccess(true);
      setCardioForm(f => ({ ...f, duration: '', distance: '', caloriesBurned: '', heartRate: '', notes: '' }));
      fetchCardio();
      setTimeout(() => setCardioSuccess(false), 3000);
    } catch { /* */ } finally { setSavingCardio(false); }
  };

  const schedule = activePlan?.planData?.weeklySchedule || activePlan?.planData?.schedule || [];

  const formatDuration = (s?: number) => {
    if (!s) return '—';
    const m = Math.floor(s / 60); const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'plan', label: 'My Plan', icon: '📋' },
    { id: 'cardio', label: 'Cardio', icon: '🏃' },
    { id: 'history', label: 'History', icon: '📊' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pt-6 md:pt-10">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Workouts</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Plan, track and crush your training sessions.
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/workouts/session')}
          className="text-[10px] tracking-[0.3em] uppercase font-bold px-5 py-2.5 sm:px-8 sm:py-3 transition-all duration-200 cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fff'; el.style.color = '#000'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.color = '#fff'; }}>
          ▶ Start Workout
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold transition-all cursor-pointer"
            style={{
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t.id ? '2px solid #fff' : '2px solid transparent',
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── MY PLAN TAB ─────────────────────────────── */}
      {tab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generator */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🤖 Generate New Plan</h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fitness Goal</label>
                  <select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-white/20"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    {GOALS.map(g => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Experience Level</label>
                  <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-white/20"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Days/week: <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{form.days}</span>
                  </label>
                  <input type="range" min="2" max="6" value={form.days}
                    onChange={e => setForm({ ...form, days: e.target.value })}
                    className="w-full accent-neutral-400" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.useAI} onChange={e => setForm({ ...form, useAI: e.target.checked })}
                    className="accent-neutral-400" />
                  Use AI generation
                </label>
                {planError && <p className="text-xs text-neutral-400">{planError}</p>}
                <button type="submit" disabled={generating}
                  className="w-full py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff' }}
                  onMouseEnter={e => { if (!generating) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : '✨ Generate Plan'}
                </button>
              </form>
            </div>
          </div>

          {/* Plan Display */}
          <div className="lg:col-span-2">
            {loadingPlan ? (
              <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : activePlan ? (
              <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{activePlan.name}</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>
                      {activePlan.difficulty} · {schedule.length} days/week · {activePlan.durationWeeks} weeks
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {activePlan.generatedBy === 'ai' ? '🤖 AI' : '📋 Rule-based'} · {new Date(activePlan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Active</span>
                    <button onClick={() => router.push('/dashboard/workouts/session')}
                      className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all cursor-pointer"
                      style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
                      ▶ Start
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {schedule.map((day, i) => (
                    <details key={i} className="group">
                      <summary className="flex items-center justify-between p-3 rounded-lg cursor-pointer list-none"
                        style={{ background: 'var(--bg-hover)' }}>
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-text)' }}>{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{day.day}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{day.focus}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{day.exercises.length} exercises</span>
                          <span className="group-open:rotate-180 transition-transform text-sm" style={{ color: 'var(--text-muted)' }}>▼</span>
                        </div>
                      </summary>
                      <div className="mt-2 space-y-2 pl-3">
                        {day.exercises.map((ex, j) => (
                          <div key={j} className="flex items-center justify-between py-2 px-3 rounded-lg border"
                            style={{ borderColor: 'var(--border-color)' }}>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ex.name}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: muscleColors[ex.muscleGroup]?.bg || 'rgba(107,114,128,0.1)', color: muscleColors[ex.muscleGroup]?.text || '#6b7280' }}>
                                {ex.muscleGroup}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{ex.sets}×{ex.reps}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ex.restSeconds}s rest</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-12 shadow-sm text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="text-4xl md:text-5xl mb-3">🏋️</div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No active plan yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Generate your personalized plan using the form.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CARDIO TAB ──────────────────────────────── */}
      {tab === 'cardio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log Form */}
          <div className="lg:col-span-1 space-y-4">

            {/* Live Track CTA */}
            <button onClick={() => router.push('/dashboard/workouts/cardio/session')}
              className="w-full rounded-xl p-5 text-left transition-all hover:scale-[1.01] group"
              style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.25)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📍</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ background: '#fff' }}>LIVE</span>
              </div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Live GPS Tracker</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Track time, distance, speed & route in real time with GPS
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>⏱ Timer</span>
                <span>📏 Distance</span>
                <span>⚡ Speed</span>
                <span>🗺 Route</span>
                <span>🔥 Calories</span>
              </div>
            </button>

            <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🏃 Log Cardio</h2>

              {/* Activity type picker */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {CARDIO_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setCardioForm(f => ({ ...f, type: ct.id }))}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl border transition-all text-center"
                    style={{
                      background: cardioForm.type === ct.id ? 'rgba(255,255,255,0.06)' : 'var(--bg-hover)',
                      borderColor: cardioForm.type === ct.id ? '#fff' : 'var(--border-color)',
                    }}>
                    <span className="text-xl">{ct.icon}</span>
                    <span className="text-[10px] font-medium leading-tight" style={{ color: cardioForm.type === ct.id ? '#fff' : 'var(--text-muted)' }}>{ct.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogCardio} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Duration (min) *</label>
                    <input type="number" required min="1" placeholder="30"
                      value={cardioForm.duration} onChange={e => setCardioForm(f => ({ ...f, duration: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-white/20"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Distance</label>
                    <div className="flex gap-1">
                      <input type="number" step="0.1" placeholder="5.0"
                        value={cardioForm.distance} onChange={e => setCardioForm(f => ({ ...f, distance: e.target.value }))}
                        className="w-full px-2 py-2 rounded-l-lg text-sm outline-none"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', color: 'var(--text-primary)' }} />
                      <select value={cardioForm.distanceUnit} onChange={e => setCardioForm(f => ({ ...f, distanceUnit: e.target.value }))}
                        className="px-2 py-2 rounded-r-lg text-xs outline-none"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderLeft: 'none', color: 'var(--text-primary)' }}>
                        <option value="km">km</option>
                        <option value="miles">mi</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Intensity</label>
                  <div className="flex gap-2">
                    {['light', 'moderate', 'intense'].map(lvl => (
                      <button key={lvl} type="button" onClick={() => setCardioForm(f => ({ ...f, intensity: lvl }))}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                        style={{
                          background: cardioForm.intensity === lvl
                            ? lvl === 'light' ? 'rgba(34,197,94,0.15)' : lvl === 'moderate' ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.1)'
                            : 'var(--bg-hover)',
                          color: cardioForm.intensity === lvl
                            ? lvl === 'light' ? '#22c55e' : lvl === 'moderate' ? '#eab308' : '#ccc'
                            : 'var(--text-muted)',
                          border: `1px solid ${cardioForm.intensity === lvl
                            ? lvl === 'light' ? 'rgba(34,197,94,0.3)' : lvl === 'moderate' ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.2)'
                            : 'var(--border-color)'}`,
                        }}>
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Calories burned</label>
                    <input type="number" placeholder="250"
                      value={cardioForm.caloriesBurned} onChange={e => setCardioForm(f => ({ ...f, caloriesBurned: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Avg heart rate</label>
                    <input type="number" placeholder="145"
                      value={cardioForm.heartRate} onChange={e => setCardioForm(f => ({ ...f, heartRate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                  <textarea rows={2} placeholder="How did it feel?"
                    value={cardioForm.notes} onChange={e => setCardioForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>

                {cardioSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                    ✅ Cardio session logged!
                  </div>
                )}

                <button type="submit" disabled={savingCardio || !cardioForm.duration}
                  className="w-full py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff' }}
                  onMouseEnter={e => { if (!(savingCardio || !cardioForm.duration)) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
                  {savingCardio ? 'Saving...' : '🏃 Log Session'}
                </button>
              </form>
            </div>
          </div>

          {/* Cardio history */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Cardio Sessions</h2>
              {cardioSessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🏃</div>
                  <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No cardio logged yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Log your first session using the form.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cardioSessions.map(cs => {
                    const ct = CARDIO_TYPES.find(t => t.id === cs.type);
                    return (
                      <div key={cs.id} className="flex items-center justify-between rounded-xl px-4 py-3 border"
                        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-hover)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{ct?.icon || '🏋️'}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {ct?.label || cs.type} · {cs.duration} min
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {new Date(cs.loggedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {cs.distance ? ` · ${cs.distance}${cs.distanceUnit}` : ''}
                              {cs.intensity ? ` · ${cs.intensity}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {cs.caloriesBurned && <p className="text-sm font-semibold" style={{ color: '#fff' }}>{cs.caloriesBurned} kcal</p>}
                          {cs.heartRate && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cs.heartRate} bpm</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {loadingSessions ? (
            <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border p-12 shadow-sm text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="text-5xl mb-3">📊</div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No sessions yet</p>
              <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
                Complete a workout session and it will appear here.
              </p>
              <button onClick={() => router.push('/dashboard/workouts/session')}
                className="px-6 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold transition-all cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
                ▶ Start First Workout
              </button>
            </div>
          ) : (
            sessions.map(s => {
              const exCount = (s.exercises || []).length;
              const doneSets = (s.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter(set => set.completed).length, 0);
              return (
                <div key={s.id} className="rounded-xl border p-5"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(s.startedAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {s.totalDuration ? ` · ${formatDuration(s.totalDuration)}` : ''}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full"
                      style={{
                        background: s.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                        color: s.status === 'completed' ? '#22c55e' : '#eab308',
                      }}>
                      {s.status === 'completed' ? '✓ Completed' : '⏸ Incomplete'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>🏋️ {exCount} exercises</span>
                    <span>✅ {doneSets} sets done</span>
                  </div>
                  {(s.exercises || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {s.exercises.slice(0, 5).map((ex, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                          {ex.name}
                        </span>
                      ))}
                      {s.exercises.length > 5 && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                          +{s.exercises.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
