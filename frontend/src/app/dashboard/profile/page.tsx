'use client';

/**
 * Profile Page — /dashboard/profile
 * Clean read-only view of logged-in user's details.
 * "Edit Profile" toggles inline editing. CK editorial aesthetic.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { WorkoutLog } from '@/types';

const FITNESS_GOALS: Record<string, string> = {
  lose_weight: 'Lose Weight', build_muscle: 'Build Muscle', maintain: 'Maintain',
  endurance: 'Endurance', flexibility: 'Flexibility',
};
const ACTIVITY_LEVELS: Record<string, string> = {
  sedentary: 'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active',
  active: 'Active', very_active: 'Very Active',
};
const EXPERIENCE_LEVELS: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};
const WORKOUT_PREFS: Record<string, string> = {
  home: 'Home', gym: 'Gym', outdoor: 'Outdoor', mixed: 'Mixed',
};
const DIETARY_PREFS: Record<string, string> = {
  no_restriction: 'No Restriction', vegetarian: 'Vegetarian', vegan: 'Vegan',
  keto: 'Keto', paleo: 'Paleo', gluten_free: 'Gluten Free',
};

interface ProfileScoreData {
  total: number;
  health: { score: number; max: number; details: string };
  progress: { score: number; max: number; details: string };
  habit: { score: number; max: number; details: string };
  completeness: { score: number; max: number; details: string };
}

/** Calculate a profile score (0–100) from health metrics, workout progress, and habits */
function calculateProfileScore(form: ProfileForm, logs: WorkoutLog[]): ProfileScoreData {
  // 1. Health Score (max 30) — BMI in range, weight-to-target progress, measurements filled
  let healthScore = 0;
  let healthDetails = '';
  if (form.weight && form.height) {
    const bmi = Number(form.weight) / Math.pow(Number(form.height) / 100, 2);
    if (bmi >= 18.5 && bmi < 25) { healthScore += 15; healthDetails = 'BMI Normal'; }
    else if (bmi >= 16 && bmi < 30) { healthScore += 8; healthDetails = 'BMI Moderate'; }
    else { healthScore += 3; healthDetails = 'BMI Needs Attention'; }
  }
  if (form.weight && form.targetWeight) {
    const diff = Math.abs(Number(form.weight) - Number(form.targetWeight));
    if (diff <= 2) { healthScore += 10; healthDetails += ', At Target'; }
    else if (diff <= 5) { healthScore += 7; healthDetails += ', Near Target'; }
    else { healthScore += 3; healthDetails += ', Working to Target'; }
  }
  if (form.chest || form.waist || form.hips) healthScore += 5;

  // 2. Progress Score (max 35) — workout frequency, consistency, volume
  let progressScore = 0;
  let progressDetails = '';
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisWeekLogs = logs.filter(l => new Date(l.loggedAt) >= weekAgo);
  const thisMonthLogs = logs.filter(l => new Date(l.loggedAt) >= monthAgo);
  const uniqueDaysThisWeek = new Set(thisWeekLogs.map(l => new Date(l.loggedAt).toDateString())).size;
  const uniqueDaysThisMonth = new Set(thisMonthLogs.map(l => new Date(l.loggedAt).toDateString())).size;
  const targetDays = Number(form.daysPerWeek) || 4;

  if (uniqueDaysThisWeek >= targetDays) { progressScore += 15; progressDetails = `${uniqueDaysThisWeek}/${targetDays} days this week`; }
  else if (uniqueDaysThisWeek > 0) { progressScore += Math.round((uniqueDaysThisWeek / targetDays) * 15); progressDetails = `${uniqueDaysThisWeek}/${targetDays} days this week`; }
  else { progressDetails = 'No workouts this week'; }

  if (uniqueDaysThisMonth >= 12) { progressScore += 12; }
  else if (uniqueDaysThisMonth >= 6) { progressScore += 8; }
  else if (uniqueDaysThisMonth > 0) { progressScore += 4; }

  if (logs.length >= 50) { progressScore += 8; }
  else if (logs.length >= 20) { progressScore += 5; }
  else if (logs.length > 0) { progressScore += 2; }

  // 3. Habit Score (max 20) — streak, regularity
  let habitScore = 0;
  let habitDetails = '';
  const sortedDates = [...new Set(logs.map(l => new Date(l.loggedAt).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  const today = new Date().toDateString();
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toDateString();
    if (sortedDates[i] === expected || (i === 0 && sortedDates[0] === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString())) {
      streak++;
    } else if (i === 0 && sortedDates[0] !== today) {
      // Allow 1 day gap
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
      if (sortedDates[0] === yesterday) { streak++; }
      else break;
    } else break;
  }
  if (streak >= 7) { habitScore += 12; habitDetails = `${streak}-day streak 🔥`; }
  else if (streak >= 3) { habitScore += 7; habitDetails = `${streak}-day streak`; }
  else if (streak >= 1) { habitScore += 3; habitDetails = `${streak}-day streak`; }
  else { habitDetails = 'No current streak'; }

  // Regularity bonus: consistent over weeks
  if (uniqueDaysThisMonth >= targetDays * 3) { habitScore += 8; }
  else if (uniqueDaysThisMonth >= targetDays * 2) { habitScore += 5; }
  else if (uniqueDaysThisMonth >= targetDays) { habitScore += 3; }

  // 4. Profile Completeness (max 15)
  let completenessScore = 0;
  let completenessDetails = '';
  const fields = [form.age, form.gender, form.weight, form.height, form.fitnessGoal, form.activityLevel, form.experienceLevel, form.daysPerWeek, form.phone, form.dateOfBirth];
  const filled = fields.filter(f => f && f !== '').length;
  completenessScore = Math.round((filled / fields.length) * 15);
  completenessDetails = `${filled}/${fields.length} fields completed`;

  const total = Math.min(100, healthScore + progressScore + habitScore + completenessScore);

  return {
    total,
    health: { score: healthScore, max: 30, details: healthDetails || 'Add weight & height' },
    progress: { score: progressScore, max: 35, details: progressDetails },
    habit: { score: habitScore, max: 20, details: habitDetails },
    completeness: { score: completenessScore, max: 15, details: completenessDetails },
  };
}

interface ProfileForm {
  firstName: string; lastName: string; phone: string; dateOfBirth: string;
  age: string; gender: string; weight: string; height: string; targetWeight: string;
  fitnessGoal: string; activityLevel: string; experienceLevel: string;
  workoutPreference: string; dietaryPreference: string; daysPerWeek: string;
  medicalConditions: string;
  chest: string; waist: string; hips: string; arms: string; thighs: string;
}

const defaultForm: ProfileForm = {
  firstName: '', lastName: '', phone: '', dateOfBirth: '',
  age: '', gender: 'male', weight: '', height: '', targetWeight: '',
  fitnessGoal: 'build_muscle', activityLevel: 'moderate', experienceLevel: 'intermediate',
  workoutPreference: 'gym', dietaryPreference: 'no_restriction', daysPerWeek: '4',
  medicalConditions: '',
  chest: '', waist: '', hips: '', arms: '', thighs: '',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProfileForm>({ ...defaultForm });
  const [profileScore, setProfileScore] = useState<ProfileScoreData | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get<{ user: { firstName: string; lastName: string; email: string }; profile: Record<string, unknown> | null }>('/profile');
        const data = res.data;
        if (data) {
          const p = data.profile;
          const m = (p?.bodyMeasurements as Record<string, string>) || {};
          const formData: ProfileForm = {
            firstName: data.user?.firstName || user?.firstName || '',
            lastName: data.user?.lastName || user?.lastName || '',
            phone: (p?.phone as string) || '',
            dateOfBirth: (p?.dateOfBirth as string) || '',
            age: p?.age ? String(p.age) : '',
            gender: (p?.gender as string) || 'male',
            weight: p?.weight ? String(p.weight) : '',
            height: p?.height ? String(p.height) : '',
            targetWeight: p?.targetWeight ? String(p.targetWeight) : '',
            fitnessGoal: (p?.fitnessGoal as string) || 'build_muscle',
            activityLevel: (p?.activityLevel as string) || 'moderate',
            experienceLevel: (p?.experienceLevel as string) || 'intermediate',
            workoutPreference: (p?.workoutPreference as string) || 'gym',
            dietaryPreference: (p?.dietaryPreference as string) || 'no_restriction',
            daysPerWeek: p?.daysPerWeek ? String(p.daysPerWeek) : '4',
            medicalConditions: (p?.medicalConditions as string) || '',
            chest: m.chest || '', waist: m.waist || '', hips: m.hips || '', arms: m.arms || '', thighs: m.thighs || '',
          };
          setForm(formData);

          // Fetch workout logs to compute profile score
          let logs: WorkoutLog[] = [];
          try {
            const logsRes = await api.get<{ logs: WorkoutLog[]; workoutsThisWeek: number; totalWorkouts: number }>('/workouts/logs?limit=200');
            logs = logsRes.data?.logs || [];
          } catch { /* no logs */ }

          setProfileScore(calculateProfileScore(formData, logs));
        }
      } catch { /* defaults */ } finally { setLoading(false); }
    }
    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false); setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        targetWeight: form.targetWeight ? parseFloat(form.targetWeight) : undefined,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        fitnessGoal: form.fitnessGoal,
        activityLevel: form.activityLevel,
        experienceLevel: form.experienceLevel,
        workoutPreference: form.workoutPreference,
        dietaryPreference: form.dietaryPreference,
        daysPerWeek: form.daysPerWeek ? parseInt(form.daysPerWeek) : undefined,
        medicalConditions: form.medicalConditions || undefined,
        bodyMeasurements: (form.chest || form.waist || form.hips || form.arms || form.thighs)
          ? { chest: form.chest, waist: form.waist, hips: form.hips, arms: form.arms, thighs: form.thighs }
          : undefined,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
      await api.put('/profile', payload);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const bmi = form.weight && form.height
    ? (Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1)
    : null;
  const bmiCategory = bmi
    ? Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2.5 text-sm outline-none transition-all focus:ring-1 focus:ring-white/20";
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <div className="max-w-3xl mx-auto px-10 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px' }}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-white opacity-50">
            {form.firstName} {form.lastName} · {user?.email}
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] tracking-[0.2em] uppercase font-semibold px-6 py-2.5 transition-all duration-200 cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(false)}
              className="text-[11px] tracking-[0.2em] uppercase font-semibold px-5 py-2.5 transition-all duration-200 cursor-pointer text-white opacity-50 hover:opacity-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] tracking-[0.2em] uppercase font-semibold px-6 py-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{ background: '#fff', color: '#000' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Success / Error */}
      {saved && (
        <div className="mb-6 px-4 py-3 text-[11px] tracking-[0.15em] uppercase font-semibold text-white opacity-70"
          style={{ background: 'rgba(255,255,255,0.06)', borderLeft: '3px solid rgba(255,255,255,0.5)' }}>
          Profile updated successfully
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 text-[11px] tracking-[0.15em] uppercase font-semibold"
          style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)' }}>
          {error}
        </div>
      )}

      {/* Profile Score */}
      {profileScore && <ProfileScoreCard score={profileScore} />}

      <form onSubmit={handleSave}>
        {/* Personal Information */}
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-2 gap-x-12 gap-y-0 mb-10">
          <Row label="First Name" value={form.firstName} />
          <Row label="Last Name" value={form.lastName} />
          {editing ? (
            <>
              <EditRow label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 99999 99999" inputClass={inputClass} inputStyle={inputStyle} />
              <EditRow label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" inputClass={inputClass} inputStyle={inputStyle} />
              <EditRow label="Age" name="age" value={form.age} onChange={handleChange} type="number" placeholder="25" inputClass={inputClass} inputStyle={inputStyle} />
              <EditRow label="Gender" name="gender" value={form.gender} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={[['male','Male'],['female','Female'],['other','Other']]} />
            </>
          ) : (
            <>
              <Row label="Phone" value={form.phone || '—'} />
              <Row label="Date of Birth" value={form.dateOfBirth || '—'} />
              <Row label="Age" value={form.age ? `${form.age} years` : '—'} />
              <Row label="Gender" value={form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : '—'} />
            </>
          )}
        </div>

        {/* Body Metrics */}
        <SectionTitle>Body Metrics</SectionTitle>
        <div className="grid grid-cols-2 gap-x-12 gap-y-0 mb-2">
          {editing ? (
            <>
              <EditRow label="Weight" name="weight" value={form.weight} onChange={handleChange} type="number" placeholder="75" suffix="kg" inputClass={inputClass} inputStyle={inputStyle} />
              <EditRow label="Height" name="height" value={form.height} onChange={handleChange} type="number" placeholder="178" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
              <EditRow label="Target Weight" name="targetWeight" value={form.targetWeight} onChange={handleChange} type="number" placeholder="70" suffix="kg" inputClass={inputClass} inputStyle={inputStyle} />
            </>
          ) : (
            <>
              <Row label="Weight" value={form.weight ? `${form.weight} kg` : '—'} />
              <Row label="Height" value={form.height ? `${form.height} cm` : '—'} />
              <Row label="Target Weight" value={form.targetWeight ? `${form.targetWeight} kg` : '—'} />
            </>
          )}
          <Row label="BMI" value={bmi ? `${bmi}` : '—'} note={bmiCategory || undefined} />
        </div>

        {/* Body Measurements */}
        {(editing || form.chest || form.waist || form.hips || form.arms || form.thighs) && (
          <>
            <SectionTitle>Body Measurements</SectionTitle>
            <div className="grid grid-cols-2 gap-x-12 gap-y-0 mb-10">
              {editing ? (
                <>
                  <EditRow label="Chest" name="chest" value={form.chest} onChange={handleChange} type="number" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
                  <EditRow label="Waist" name="waist" value={form.waist} onChange={handleChange} type="number" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
                  <EditRow label="Hips" name="hips" value={form.hips} onChange={handleChange} type="number" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
                  <EditRow label="Arms" name="arms" value={form.arms} onChange={handleChange} type="number" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
                  <EditRow label="Thighs" name="thighs" value={form.thighs} onChange={handleChange} type="number" suffix="cm" inputClass={inputClass} inputStyle={inputStyle} />
                </>
              ) : (
                <>
                  {form.chest && <Row label="Chest" value={`${form.chest} cm`} />}
                  {form.waist && <Row label="Waist" value={`${form.waist} cm`} />}
                  {form.hips && <Row label="Hips" value={`${form.hips} cm`} />}
                  {form.arms && <Row label="Arms" value={`${form.arms} cm`} />}
                  {form.thighs && <Row label="Thighs" value={`${form.thighs} cm`} />}
                </>
              )}
            </div>
          </>
        )}

        {/* Fitness Goals */}
        <SectionTitle>Fitness Goals</SectionTitle>
        <div className="grid grid-cols-2 gap-x-12 gap-y-0 mb-10">
          {editing ? (
            <>
              <EditRow label="Primary Goal" name="fitnessGoal" value={form.fitnessGoal} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={Object.entries(FITNESS_GOALS)} />
              <EditRow label="Activity Level" name="activityLevel" value={form.activityLevel} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={Object.entries(ACTIVITY_LEVELS)} />
              <EditRow label="Experience" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={Object.entries(EXPERIENCE_LEVELS)} />
              <EditRow label="Workout Preference" name="workoutPreference" value={form.workoutPreference} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={Object.entries(WORKOUT_PREFS)} />
              <EditRow label="Dietary Preference" name="dietaryPreference" value={form.dietaryPreference} onChange={handleChange} inputClass={inputClass} inputStyle={inputStyle}
                options={Object.entries(DIETARY_PREFS)} />
              <EditRow label="Days per Week" name="daysPerWeek" value={form.daysPerWeek} onChange={handleChange} type="number" inputClass={inputClass} inputStyle={inputStyle} />
            </>
          ) : (
            <>
              <Row label="Primary Goal" value={FITNESS_GOALS[form.fitnessGoal] || form.fitnessGoal} />
              <Row label="Activity Level" value={ACTIVITY_LEVELS[form.activityLevel] || form.activityLevel} />
              <Row label="Experience" value={EXPERIENCE_LEVELS[form.experienceLevel] || form.experienceLevel} />
              <Row label="Workout Preference" value={WORKOUT_PREFS[form.workoutPreference] || form.workoutPreference} />
              <Row label="Dietary Preference" value={DIETARY_PREFS[form.dietaryPreference] || form.dietaryPreference} />
              <Row label="Days per Week" value={`${form.daysPerWeek} days`} />
            </>
          )}
        </div>

        {/* Medical */}
        {(editing || form.medicalConditions) && (
          <>
            <SectionTitle>Medical Information</SectionTitle>
            <div className="mb-10">
              {editing ? (
                <div className="py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <label className="text-[11px] tracking-[0.2em] uppercase text-white opacity-50 mb-2 block">Conditions / Injuries</label>
                  <textarea
                    name="medicalConditions" value={form.medicalConditions} onChange={handleChange} rows={3}
                    className={inputClass} style={inputStyle}
                    placeholder="e.g., knee injury, asthma, back pain"
                  />
                </div>
              ) : (
                <Row label="Conditions" value={form.medicalConditions || '—'} />
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

/* ── Sub-components ── */

function ProfileScoreCard({ score }: { score: ProfileScoreData }) {
  const getScoreColor = (total: number) => {
    if (total >= 80) return '#4ade80';
    if (total >= 60) return '#facc15';
    if (total >= 40) return '#fb923c';
    return '#f87171';
  };

  const getScoreLabel = (total: number) => {
    if (total >= 80) return 'Excellent';
    if (total >= 60) return 'Good';
    if (total >= 40) return 'Fair';
    return 'Getting Started';
  };

  const color = getScoreColor(score.total);

  return (
    <div className="mb-10 p-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px' }}>
      <div className="flex items-center gap-8">
        {/* Circular Score */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(score.total / 100) * 264} 264`}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{score.total}</span>
            <span className="text-[9px] tracking-[0.2em] uppercase opacity-50 text-white">/ 100</span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[11px] tracking-[0.3em] uppercase font-semibold text-white opacity-60">Profile Score</h3>
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5" style={{ color, border: `1px solid ${color}`, opacity: 0.8 }}>
              {getScoreLabel(score.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <ScoreBreakdownRow label="Health" score={score.health.score} max={score.health.max} detail={score.health.details} />
            <ScoreBreakdownRow label="Progress" score={score.progress.score} max={score.progress.max} detail={score.progress.details} />
            <ScoreBreakdownRow label="Habit" score={score.habit.score} max={score.habit.max} detail={score.habit.details} />
            <ScoreBreakdownRow label="Completeness" score={score.completeness.score} max={score.completeness.max} detail={score.completeness.details} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBreakdownRow({ label, score, max, detail }: { label: string; score: number; max: number; detail: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-white opacity-45">{label}</span>
        <span className="text-[10px] font-semibold text-white opacity-70">{score}/{max}</span>
      </div>
      <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.5)' }} />
      </div>
      <span className="text-[9px] text-white opacity-35 mt-0.5 block">{detail}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold text-white opacity-50 mb-4 mt-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
      {children}
    </h2>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-[12px] tracking-[0.1em] uppercase text-white opacity-45">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold text-white">{value}</span>
        {note && <span className="text-[10px] tracking-[0.1em] uppercase text-white opacity-50">{note}</span>}
      </div>
    </div>
  );
}

function EditRow({ label, name, value, onChange, type, placeholder, suffix, options, inputClass, inputStyle }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: string; placeholder?: string; suffix?: string;
  options?: [string, string][];
  inputClass: string; inputStyle: Record<string, string>;
}) {
  return (
    <div className="py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <label className="text-[11px] tracking-[0.15em] uppercase text-white opacity-45 mb-2 block">{label}</label>
      <div className="flex items-center gap-2">
        {options ? (
          <select name={name} value={value} onChange={onChange} className={inputClass} style={inputStyle}>
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ) : (
          <input name={name} type={type || 'text'} value={value} onChange={onChange}
            placeholder={placeholder} className={inputClass} style={inputStyle} />
        )}
        {suffix && <span className="text-[11px] text-white opacity-40 uppercase tracking-wide">{suffix}</span>}
      </div>
    </div>
  );
}
