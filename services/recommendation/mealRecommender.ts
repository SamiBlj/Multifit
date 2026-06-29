/**
 * Random Forest Meal Recommender
 *
 * Architecture:
 *  1. Hard filter – removes meals with allergens or over cooking-time budget.
 *  2. Decision tree – scores each meal on calorie fit, macro fit, and time.
 *  3. Random forest – runs NUM_TREES trees with randomised feature weights;
 *     each tree casts rank-weighted votes.  Final ranking = aggregated votes.
 */

import { UserProfile, MealType } from '../../types';
import { CatalogMeal, MEAL_CATALOG } from './mealCatalog';
import { calcDailyTargets, DailyTargets } from './calorieCalculator';

// ─── Config ───────────────────────────────────────────────────────────────────

const NUM_TREES = 12;
const WEIGHT_NOISE = 0.25; // ±25 % noise per tree

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureWeights {
  calorie: number;
  protein: number;
  carbs: number;
  fat: number;
  time: number;
}

export interface RecommendedMeal extends CatalogMeal {
  score: number;
  calorieTarget: number;
  proteinTarget: number;
}

export interface MealRecommendations {
  dailyTargets: DailyTargets;
  breakfast: RecommendedMeal[];
  lunch: RecommendedMeal[];
  dinner: RecommendedMeal[];
  snack: RecommendedMeal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function perturbWeights(base: FeatureWeights, rand: () => number): FeatureWeights {
  const noise = (v: number) => v * (1 + (rand() * 2 - 1) * WEIGHT_NOISE);
  return {
    calorie: noise(base.calorie),
    protein: noise(base.protein),
    carbs: noise(base.carbs),
    fat: noise(base.fat),
    time: noise(base.time),
  };
}

// Closeness score: 1 if exactly on target, decays as deviation grows
function proximity(actual: number, target: number, tolerance = 0.30): number {
  if (target === 0) return 1;
  const ratio = Math.abs(actual - target) / target;
  return Math.max(0, 1 - ratio / tolerance);
}

// ─── Hard Filter (Decision Tree root nodes) ───────────────────────────────────

function hardFilter(
  meals: CatalogMeal[],
  profile: Partial<UserProfile>,
  maxPrepMinutes: number,
): CatalogMeal[] {
  const userAllergens = new Set([
    ...(profile.allergies ?? []).map((a) => a.toLowerCase()),
    ...(profile.intolerances ?? []).map((i) => i.toLowerCase()),
  ]);

  return meals.filter((meal) => {
    // Allergy gate (hard NO)
    const hasAllergen = meal.allergens.some((a) => userAllergens.has(a.toLowerCase()));
    if (hasAllergen) return false;
    // Time gate (hard NO)
    if (meal.prepTimeMinutes > maxPrepMinutes) return false;
    return true;
  });
}

// ─── Single Decision Tree ─────────────────────────────────────────────────────

function scoreWithTree(
  meal: CatalogMeal,
  targets: DailyTargets,
  mealFraction: number,       // e.g. 0.30 for lunch out of daily total
  maxPrepMinutes: number,
  weights: FeatureWeights,
): number {
  const mealCalTarget  = targets.calories * mealFraction;
  const mealProtTarget = targets.proteinG  * mealFraction;
  const mealCarbTarget = targets.carbsG    * mealFraction;
  const mealFatTarget  = targets.fatG      * mealFraction;

  const calScore  = proximity(meal.calories, mealCalTarget);
  const protScore = proximity(meal.protein, mealProtTarget);
  const carbScore = proximity(meal.carbs, mealCarbTarget);
  const fatScore  = proximity(meal.fat, mealFatTarget);
  // Time score: reward faster prep; penalise meals near the ceiling
  const timeScore = 1 - meal.prepTimeMinutes / Math.max(maxPrepMinutes, 1);

  const totalWeight = weights.calorie + weights.protein + weights.carbs + weights.fat + weights.time;
  return (
    (calScore  * weights.calorie +
     protScore * weights.protein +
     carbScore * weights.carbs +
     fatScore  * weights.fat +
     timeScore * weights.time) / totalWeight
  );
}

// ─── Random Forest Aggregation ────────────────────────────────────────────────

function randomForest(
  meals: CatalogMeal[],
  targets: DailyTargets,
  mealFraction: number,
  maxPrepMinutes: number,
  baseWeights: FeatureWeights,
): RecommendedMeal[] {
  // votes[id] = cumulative rank-weighted vote across all trees
  const votes: Record<string, number> = {};
  meals.forEach((m) => (votes[m.id] = 0));

  for (let t = 0; t < NUM_TREES; t++) {
    const rand = seededRandom(t * 31337 + 1);
    const weights = perturbWeights(baseWeights, rand);

    const scored = meals
      .map((meal) => ({
        meal,
        treeScore: scoreWithTree(meal, targets, mealFraction, maxPrepMinutes, weights),
      }))
      .sort((a, b) => b.treeScore - a.treeScore);

    // Rank-weighted vote: 1st place gets N points, 2nd gets N-1, etc.
    scored.forEach(({ meal }, rank) => {
      votes[meal.id] += Math.max(0, meals.length - rank);
    });
  }

  // Normalise votes to [0, 1] and attach to meals
  const maxVotes = Math.max(...Object.values(votes), 1);
  return meals
    .map((meal) => ({
      ...meal,
      score: votes[meal.id] / maxVotes,
      calorieTarget: Math.round(targets.calories * mealFraction),
      proteinTarget: Math.round(targets.proteinG * mealFraction),
    }))
    .sort((a, b) => b.score - a.score);
}

// ─── Meal-type fractions of daily calories ───────────────────────────────────

const MEAL_FRACTIONS: Record<MealType, number> = {
  breakfast: 0.25,
  lunch:     0.35,
  dinner:    0.30,
  snack:     0.10,
};

// ─── Base feature weights (tuned per goal via macro priority) ─────────────────

function baseWeightsForProfile(profile: Partial<UserProfile>): FeatureWeights {
  const goal = profile.goal ?? 'maintain';
  switch (goal) {
    case 'cut':
      return { calorie: 1.8, protein: 2.0, carbs: 1.0, fat: 1.0, time: 0.5 };
    case 'bulk':
      return { calorie: 1.5, protein: 1.5, carbs: 2.0, fat: 0.8, time: 0.5 };
    case 'muscleGrowth':
      return { calorie: 1.4, protein: 2.0, carbs: 1.4, fat: 0.8, time: 0.6 };
    case 'maintain':
    default:
      return { calorie: 1.5, protein: 1.2, carbs: 1.2, fat: 1.2, time: 0.8 };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recommendMeals(profile: Partial<UserProfile>): MealRecommendations {
  const dailyTargets = calcDailyTargets(profile);
  const baseWeights  = baseWeightsForProfile(profile);

  const cookingTime = profile.cookingTimeMinutes ?? 60;

  // Realistic per-type budgets: breakfast & snacks are always quick;
  // lunch & dinner get the user's full stated cooking-time budget.
  const TIME_BUDGETS: Record<MealType, number> = {
    breakfast: Math.min(cookingTime, 20),
    lunch:     cookingTime,
    dinner:    cookingTime,
    snack:     15,
  };

  const byType = (type: MealType) => {
    const maxTime  = TIME_BUDGETS[type];
    const pool     = MEAL_CATALOG.filter((m) => m.type === type);
    const filtered = hardFilter(pool, profile, maxTime);
    // If every meal in this type exceeds the budget, fall back to the two quickest
    const candidates = filtered.length > 0
      ? filtered
      : pool.sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes).slice(0, 2);
    return randomForest(candidates, dailyTargets, MEAL_FRACTIONS[type], maxTime, baseWeights);
  };

  return {
    dailyTargets,
    breakfast: byType('breakfast'),
    lunch:     byType('lunch'),
    dinner:    byType('dinner'),
    snack:     byType('snack'),
  };
}

// Convenience: pick one top meal of each type for a single day's plan
export function pickDailyMeals(profile: Partial<UserProfile>) {
  const recs = recommendMeals(profile);
  return {
    dailyTargets: recs.dailyTargets,
    breakfast: recs.breakfast[0]  ?? null,
    lunch:     recs.lunch[0]      ?? null,
    dinner:    recs.dinner[0]     ?? null,
    snacks:    recs.snack.slice(0, 2),
  };
}
