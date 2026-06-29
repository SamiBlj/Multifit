// Shared types mirrored from the frontend — keep in sync
// In a mature monorepo these would live in a shared `packages/types` package.

export type GoalType = 'cut' | 'bulk' | 'muscleGrowth' | 'maintain';

export interface Ingredient { name: string; amount: string; }

export interface Meal {
  id: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string; description: string; prepTimeMinutes: number;
  calories: number; protein: number; carbs: number; fat: number;
  ingredients: Ingredient[]; instructions: string[]; imageUrl?: string;
}

export interface DayPlan {
  date: string; meals: Meal[];
  totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number;
}

export interface MealCalendar { weekStartDate: string; days: DayPlan[]; }

export interface Exercise {
  id: string; name: string; muscleGroups: string[];
  sets: number; reps: string; restSeconds: number; notes?: string; demoUrl?: string;
}

export interface WorkoutDay {
  dayLabel: string; focus: string; durationMinutes: number; exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string; goal: GoalType; weeksTotal: number; days: WorkoutDay[];
}
