import { UserProfile, GoalType, ActivityLevel } from '../../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  moderatelyActive: 1.55,
  veryActive: 1.725,
  extraActive: 1.9,
};

const GOAL_CALORIE_DELTA: Record<GoalType, number> = {
  cut: -500,
  bulk: +350,
  muscleGrowth: +150,
  maintain: 0,
};

export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Evidence-based protein targets (g per kg of bodyweight)
const PROTEIN_PER_KG: Record<GoalType, number> = {
  cut:          2.4,  // high protein to preserve muscle in a deficit
  bulk:         2.0,  // adequate for muscle building
  muscleGrowth: 2.4,  // maximise muscle protein synthesis
  maintain:     1.8,  // comfortable maintenance target
};

// Fat as % of total calories (floor to protect hormones)
const FAT_RATIO: Record<GoalType, number> = {
  cut:          0.25,
  bulk:         0.20,
  muscleGrowth: 0.22,
  maintain:     0.28,
};

// Mifflin-St Jeor BMR
function calcBMR(profile: Partial<UserProfile>): number {
  const { weightKg = 75, heightCm = 175, age = 25, sex = 'male' } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

export function calcDailyTargets(profile: Partial<UserProfile>): DailyTargets {
  const goal   = profile.goal ?? 'maintain';
  const weight = profile.weightKg ?? 75;

  const bmr  = calcBMR(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel ?? 'moderatelyActive'];

  // If the user has set a 3-month target weight, derive a daily calorie delta from it.
  // 1 kg of body fat ≈ 7700 kcal; 3 months ≈ 90 days.
  let targetDelta = GOAL_CALORIE_DELTA[goal];
  if (profile.targetWeightKg != null && profile.weightKg != null) {
    const kgDiff         = profile.targetWeightKg - profile.weightKg; // positive = gaining
    const rawDelta       = Math.round((kgDiff * 7700) / 90);
    // Clamp to safe physiological limits: -800 kcal/day deficit, +600 kcal/day surplus
    targetDelta = Math.max(-800, Math.min(600, rawDelta));
  }

  const calories = Math.round(tdee + targetDelta);

  // 1. Protein: weight-based (most accurate method)
  const proteinG = Math.round(weight * PROTEIN_PER_KG[goal]);

  // 2. Fat: percentage of total calories
  const fatG = Math.round((calories * FAT_RATIO[goal]) / 9);

  // 3. Carbs: fill the remaining calories
  const proteinCals = proteinG * 4;
  const fatCals     = fatG * 9;
  const carbsG      = Math.max(0, Math.round((calories - proteinCals - fatCals) / 4));

  return { calories, proteinG, carbsG, fatG };
}
