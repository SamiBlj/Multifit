// ─── User / Profile ──────────────────────────────────────────────────────────

export type GoalType = 'cut' | 'bulk' | 'muscleGrowth' | 'maintain';

export type Sex = 'male' | 'female' | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'lightlyActive'
  | 'moderatelyActive'
  | 'veryActive'
  | 'extraActive';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
  cookingTimeMinutes: number;       // max time available to cook per day
  allergies: string[];              // e.g. ['gluten', 'dairy', 'nuts']
  intolerances: string[];
  targetWeightKg?: number;
  onboardingComplete: boolean;
  createdAt: string;                // ISO date
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Ingredient {
  name: string;
  amount: string;                   // e.g. "200g", "1 cup"
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  description: string;
  prepTimeMinutes: number;
  calories: number;
  protein: number;                  // grams
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl?: string;
}

export interface DayPlan {
  date: string;                     // ISO date "YYYY-MM-DD"
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealCalendar {
  weekStartDate: string;
  days: DayPlan[];
}

// ─── Workouts ────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  sets: number;
  reps: string;                     // e.g. "8-12" or "30s"
  restSeconds: number;
  notes?: string;
  demoUrl?: string;                 // URL to gif/video
}

export interface WorkoutDay {
  dayLabel: string;                 // e.g. "Monday — Push"
  focus: string;                    // e.g. "Chest & Triceps"
  durationMinutes: number;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  goal: GoalType;
  weeksTotal: number;
  days: WorkoutDay[];
}

// ─── Motivation ──────────────────────────────────────────────────────────────

export interface MotivationQuote {
  text: string;
  author: string;
}

// ─── Onboarding step keys ────────────────────────────────────────────────────

export type OnboardingStep =
  | 'welcome'
  | 'basicStats'
  | 'cookingTime'
  | 'allergies'
  | 'goalSelection'
  | 'generating';
