/**
 * Today's Workout Card.
 * Shows the current day's exercises in a clean list format.
 * Uses theme CSS variables for dark/light mode support.
 */

import { WorkoutDay } from '@/types';

interface TodayWorkoutProps {
  workout: WorkoutDay | null;
}

export default function TodayWorkout({ workout }: TodayWorkoutProps) {
  if (!workout) {
    return (
      <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Today&apos;s Workout</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏋️</div>
          <p style={{ color: 'var(--text-secondary)' }}>No workout scheduled today.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Rest day or generate a new plan!</p>
        </div>
      </div>
    );
  }

  const muscleGroupColors: Record<string, { bg: string; text: string }> = {
    chest: { bg: 'rgba(255,255,255,0.08)', text: '#fff' },
    back: { bg: 'rgba(255,255,255,0.06)', text: '#ccc' },
    legs: { bg: 'rgba(255,255,255,0.08)', text: '#e5e5e5' },
    shoulders: { bg: 'rgba(255,255,255,0.06)', text: '#bbb' },
    arms: { bg: 'rgba(255,255,255,0.08)', text: '#ddd' },
    core: { bg: 'rgba(255,255,255,0.06)', text: '#aaa' },
    cardio: { bg: 'rgba(255,255,255,0.08)', text: '#ccc' },
  };

  return (
    <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Workout</h3>
          <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{workout.focus}</p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-text)' }}>
          {workout.exercises.length} exercises
        </span>
      </div>

      <div className="space-y-3">
        {workout.exercises.map((exercise, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{ background: 'var(--bg-hover)' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-text)' }}>
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{exercise.name}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: muscleGroupColors[exercise.muscleGroup]?.bg || 'rgba(107,114,128,0.1)',
                    color: muscleGroupColors[exercise.muscleGroup]?.text || '#6b7280',
                  }}>
                  {exercise.muscleGroup}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {exercise.sets} × {exercise.reps}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {exercise.restSeconds}s rest
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
