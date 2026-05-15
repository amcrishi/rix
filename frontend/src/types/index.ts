/**
 * Shared TypeScript types for the frontend.
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  age: number | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  fitnessGoal: string | null;
  experienceLevel: string | null;
  daysPerWeek: number | null;
}

export interface Exercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  durationWeeks: number;
  isActive: boolean;
  generatedBy: string;
  planData: {
    daysPerWeek: number;
    goal: string;
    level: string;
    durationWeeks: number;
    schedule?: WorkoutDay[];
    weeklySchedule?: WorkoutDay[];
    notes: string[];
  };
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number | null;
  duration: number | null;
  notes: string | null;
  loggedAt: string;
}

export interface ProgressStats {
  currentWeight: number | null;
  workoutsThisWeek: number;
  totalWorkouts: number;
  streak: number;
  goalProgress: number;
}
