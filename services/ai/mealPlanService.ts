import { UserProfile, MealCalendar } from '../../types';

// AI generation is server-side only — stub to prevent browser bundling
export async function generateMealPlan(_profile: Partial<UserProfile>): Promise<MealCalendar> {
  throw new Error('AI meal plan generation is not available client-side');
}
