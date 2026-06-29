import { UserProfile, ActivityLevel } from '../../types';

// ─── Standard Activity Factors (SAF) ─────────────────────────────────────────
const SAF: Record<ActivityLevel, number> = {
  sedentary:        1.2,
  lightlyActive:    1.375,
  moderatelyActive: 1.55,
  veryActive:       1.725,
  extraActive:      1.9,
};

// ─── Protein coefficient of activity (CAP) ────────────────────────────────────
const CAP: Record<ActivityLevel, number> = {
  sedentary:        1.0,
  lightlyActive:    1.2,
  moderatelyActive: 1.4,
  veryActive:       1.6,
  extraActive:      1.8,
};

// ─── Lipid coefficient of activity (CAL) ─────────────────────────────────────
function lipidCoeff(activity: ActivityLevel): number {
  if (activity === 'sedentary' || activity === 'lightlyActive') return 0.8;
  if (activity === 'moderatelyActive') return 1.0;
  return 1.2; // veryActive / extraActive
}

// ─── Goal-based calorie adjustment (applied on top of TDEE) ──────────────────
const GOAL_DELTA: Record<string, number> = {
  cut:          -500,
  bulk:         +350,
  muscleGrowth: +150,
  maintain:      0,
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG:   number;
  fatG:     number;
  fibersG:  number;
}

export interface MacroRange {
  min:   DailyTargets;
  ideal: DailyTargets;
  max:   DailyTargets;
}

// ─── Core calculation for a single bodyweight ─────────────────────────────────
function calcForWeight(
  bw: number,
  heightCm: number,
  age: number,
  sex: string,
  activity: ActivityLevel,
  goalDelta: number,
): DailyTargets {
  const saf = SAF[activity];
  const cap = CAP[activity];
  const cal = lipidCoeff(activity);
  const isMale = sex === 'male';
  const cs  = isMale ? 1.0 : 0.9; // Coefficient of sex for protein (other → female coefficients)

  // 2. Calories — Mifflin-St Jeor BMR × SAF
  const bmr      = isMale
    ? (10 * bw + 6.25 * heightCm - 5 * age + 5)
    : (10 * bw + 6.25 * heightCm - 5 * age - 161);
  const calories = Math.round(bmr * saf + goalDelta);

  // 3. Proteins
  const proteinG = Math.round(bw * cap * cs);

  // 4. Lipids
  const fatG = Math.round(bw * cal);

  // 5. Carbs — calories left after protein and fat
  const carbsG = Math.max(0, Math.round((calories - (proteinG * 4 + fatG * 9)) / 4));

  // 6. Fibers
  const fibersG = Math.round(isMale ? 0.014 * calories : 0.016 * calories);

  return { calories, proteinG, carbsG, fatG, fibersG };
}

// ─── Main export: returns ideal targets (what the app shows) ──────────────────
export function calcDailyTargets(profile: Partial<UserProfile>): DailyTargets {
  return calcMacroRange(profile).ideal;
}

// ─── Full min/ideal/max range from BMI-based bodyweights ─────────────────────
export function calcMacroRange(profile: Partial<UserProfile>): MacroRange {
  const sex      = (profile.sex === 'other' ? 'female' : profile.sex) ?? 'male';
  const age      = profile.age ?? 25;
  const heightCm = profile.heightCm ?? 175;
  const activity = profile.activityLevel ?? 'moderatelyActive';
  const goal     = profile.goal ?? 'maintain';

  const heightM = heightCm / 100;
  const h2      = heightM * heightM;

  // 1. Bodyweight range from BMI
  const BWmin   = 18.5 * h2;
  const BWideal = (sex === 'male' ? 22 : 21.5) * h2;
  const BWmax   = 24.9 * h2;

  // If the user entered their actual weight, use it as the ideal BW for calculations.
  // Also derive a personalised calorie delta if a target weight was set.
  const actualBW = profile.weightKg;

  let goalDelta = GOAL_DELTA[goal] ?? 0;
  if (actualBW != null && profile.targetWeightKg != null) {
    const kgDiff  = profile.targetWeightKg - actualBW; // positive = gaining
    const raw     = Math.round((kgDiff * 7700) / 90);  // 1 kg ≈ 7700 kcal over 90 days
    goalDelta     = Math.max(-800, Math.min(600, raw));
  }

  // Use actual weight when available for the ideal calculation
  const idealBW = actualBW ?? BWideal;

  return {
    min:   calcForWeight(BWmin,   heightCm, age, sex, activity, goalDelta),
    ideal: calcForWeight(idealBW, heightCm, age, sex, activity, goalDelta),
    max:   calcForWeight(BWmax,   heightCm, age, sex, activity, goalDelta),
  };
}
