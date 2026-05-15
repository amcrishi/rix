/**
 * Mock data for dashboard development.
 * Replace with real API calls once backend + DB are connected.
 */

import { WorkoutDay, ProgressStats, WorkoutLog } from '@/types';

export const mockTodayWorkout: WorkoutDay = {
  day: 'Day 1',
  focus: 'Upper Body',
  exercises: [
    { name: 'Dumbbell Bench Press', muscleGroup: 'chest', sets: 4, reps: '8-12', restSeconds: 90, equipment: 'dumbbells' },
    { name: 'Incline Push-ups', muscleGroup: 'chest', sets: 4, reps: '8-12', restSeconds: 90, equipment: 'none' },
    { name: 'Dumbbell Rows', muscleGroup: 'back', sets: 4, reps: '8-12', restSeconds: 90, equipment: 'dumbbells' },
    { name: 'Lat Pulldowns', muscleGroup: 'back', sets: 4, reps: '8-12', restSeconds: 90, equipment: 'machine' },
    { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', sets: 4, reps: '8-12', restSeconds: 90, equipment: 'dumbbells' },
    { name: 'Lateral Raises', muscleGroup: 'shoulders', sets: 3, reps: '12-15', restSeconds: 60, equipment: 'dumbbells' },
  ],
};

export const mockProgress: ProgressStats = {
  currentWeight: 78.5,
  workoutsThisWeek: 3,
  totalWorkouts: 47,
  streak: 5,
  goalProgress: 65,
};

export const mockRecentLogs: WorkoutLog[] = [
  { id: '1', exercise: 'Bench Press', sets: 4, reps: 10, weight: 60, duration: null, notes: null, loggedAt: '2026-05-05T10:00:00Z' },
  { id: '2', exercise: 'Squats', sets: 4, reps: 8, weight: 80, duration: null, notes: null, loggedAt: '2026-05-04T09:30:00Z' },
  { id: '3', exercise: 'Pull-ups', sets: 3, reps: 12, weight: null, duration: null, notes: 'Bodyweight', loggedAt: '2026-05-03T11:00:00Z' },
  { id: '4', exercise: 'Running', sets: 1, reps: 1, weight: null, duration: 30, notes: '5K run', loggedAt: '2026-05-02T07:00:00Z' },
];
