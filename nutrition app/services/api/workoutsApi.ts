import { api } from './client';
import { WorkoutPlan } from '../../types';

export function generateWorkoutPlan() {
  return api.post<{ plan: WorkoutPlan }>('/workouts/generate');
}

export function getWorkoutPlan() {
  return api.get<{ plan: WorkoutPlan }>('/workouts/plan');
}
