import { UserProfile, WorkoutPlan } from '../../types';

// AI generation is server-side only — stub to prevent browser bundling
export async function generateWorkoutPlan(_profile: Partial<UserProfile>): Promise<WorkoutPlan> {
  throw new Error('AI workout generation is not available client-side');
}
