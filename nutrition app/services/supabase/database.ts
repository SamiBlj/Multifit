import { supabase } from './client';
import { UserProfile, MealCalendar, DayPlan, WorkoutPlan } from '../../types';
import { MealRecommendations } from '../recommendation/mealRecommender';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function saveProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id:                   uid,
    name:                 profile.name,
    email:                (profile as any).email ?? null,
    age:                  profile.age,
    sex:                  profile.sex,
    height_cm:            profile.heightCm,
    weight_kg:            profile.weightKg,
    goal:                 profile.goal,
    activity_level:       profile.activityLevel,
    allergies:            profile.allergies ?? [],
    intolerances:         profile.intolerances ?? [],
    cooking_time_minutes: profile.cookingTimeMinutes,
    target_weight_kg:     profile.targetWeightKg ?? null,
    onboarding_complete:  profile.onboardingComplete ?? false,
    is_premium:           (profile as any).isPremium ?? false,
    premium_plan:         (profile as any).premiumPlan ?? null,
    updated_at:           new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getProfile(uid: string): Promise<Partial<UserProfile> | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (error || !data) return null;
  return {
    id:                  data.id,
    name:                data.name,
    age:                 data.age,
    sex:                 data.sex,
    heightCm:            data.height_cm,
    weightKg:            data.weight_kg,
    goal:                data.goal,
    activityLevel:       data.activity_level,
    allergies:           data.allergies ?? [],
    intolerances:        data.intolerances ?? [],
    cookingTimeMinutes:  data.cooking_time_minutes,
    targetWeightKg:      data.target_weight_kg ?? undefined,
    onboardingComplete:  data.onboarding_complete,
    isPremium:           data.is_premium,
    premiumPlan:         data.premium_plan,
  } as any;
}

// ─── Daily Targets ────────────────────────────────────────────────────────────

export async function saveDailyTargets(uid: string, targets: {
  calories: number; proteinG: number; carbsG: number; fatG: number;
}): Promise<void> {
  // Store targets inside the profile row
  await supabase.from('profiles').upsert({
    id:             uid,
    daily_calories: targets.calories,
    daily_protein:  targets.proteinG,
    daily_carbs:    targets.carbsG,
    daily_fat:      targets.fatG,
    updated_at:     new Date().toISOString(),
  });
}

// ─── Meal Calendar ────────────────────────────────────────────────────────────

export async function saveMealCalendar(uid: string, calendar: MealCalendar): Promise<string> {
  const { data, error } = await supabase.from('meal_calendars').insert({
    user_id:         uid,
    week_start_date: calendar.weekStartDate,
    days:            calendar.days,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getLatestMealCalendar(uid: string): Promise<MealCalendar | null> {
  const { data, error } = await supabase
    .from('meal_calendars')
    .select('*')
    .eq('user_id', uid)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return { weekStartDate: data.week_start_date, days: data.days as DayPlan[] };
}

// ─── Meal Logs ────────────────────────────────────────────────────────────────

export async function logMeal(uid: string, entry: {
  mealType: string; name: string; calories: number;
  proteinG: number; carbsG: number; fatG: number;
  servings?: number; notes?: string; catalogId?: string;
}): Promise<string> {
  const { data, error } = await supabase.from('meal_logs').insert({
    user_id:    uid,
    meal_type:  entry.mealType,
    name:       entry.name,
    calories:   entry.calories,
    protein_g:  entry.proteinG,
    carbs_g:    entry.carbsG,
    fat_g:      entry.fatG,
    servings:   entry.servings ?? 1,
    notes:      entry.notes ?? null,
    catalog_id: entry.catalogId ?? null,
    log_date:   new Date().toISOString().split('T')[0],
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getMealLogsForDate(uid: string, date: string) {
  const { data } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', uid)
    .eq('log_date', date);
  return data ?? [];
}

// ─── Water Logs ───────────────────────────────────────────────────────────────

export async function logWater(uid: string, amountMl: number): Promise<void> {
  await supabase.from('water_logs').insert({
    user_id:   uid,
    amount_ml: amountMl,
    log_date:  new Date().toISOString().split('T')[0],
  });
}

export async function getWaterForDate(uid: string, date: string): Promise<number> {
  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', uid)
    .eq('log_date', date);
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.amount_ml ?? 0), 0);
}

// ─── Workout Plan ─────────────────────────────────────────────────────────────

export async function saveWorkoutPlan(uid: string, plan: WorkoutPlan): Promise<string> {
  // Deactivate old plans first
  await supabase.from('workout_plans').update({ is_active: false }).eq('user_id', uid);

  const { data, error } = await supabase.from('workout_plans').insert({
    user_id:     uid,
    goal:        plan.goal,
    weeks_total: plan.weeksTotal,
    is_active:   true,
    days:        plan.days,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getActiveWorkoutPlan(uid: string): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', uid)
    .eq('is_active', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return { id: data.id, goal: data.goal, weeksTotal: data.weeks_total, days: data.days };
}

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export async function startWorkoutSession(uid: string, workoutDayLabel: string): Promise<string> {
  const { data, error } = await supabase.from('workout_sessions').insert({
    user_id:            uid,
    workout_day_label:  workoutDayLabel,
    sets:               [],
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function endWorkoutSession(uid: string, sessionId: string, sets: object[]): Promise<void> {
  await supabase.from('workout_sessions').update({
    ended_at: new Date().toISOString(),
    sets,
  }).eq('id', sessionId).eq('user_id', uid);
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

export async function saveBodyMetric(uid: string, metrics: {
  weightKg?: number; bodyFatPct?: number; waistCm?: number; notes?: string;
}): Promise<void> {
  await supabase.from('body_metrics').insert({
    user_id:       uid,
    weight_kg:     metrics.weightKg ?? null,
    body_fat_pct:  metrics.bodyFatPct ?? null,
    waist_cm:      metrics.waistCm ?? null,
    notes:         metrics.notes ?? null,
    log_date:      new Date().toISOString().split('T')[0],
  });
}

export async function getBodyMetrics(uid: string, limitCount = 30) {
  const { data } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', uid)
    .order('log_date', { ascending: false })
    .limit(limitCount);
  return data ?? [];
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function saveRecommendations(uid: string, recs: MealRecommendations): Promise<void> {
  // Delete old entry then insert fresh
  await supabase.from('recommendations').delete().eq('user_id', uid);
  await supabase.from('recommendations').insert({
    user_id:       uid,
    daily_targets: recs.dailyTargets,
    breakfast:     recs.breakfast.slice(0, 5),
    lunch:         recs.lunch.slice(0, 5),
    dinner:        recs.dinner.slice(0, 5),
    snack:         recs.snack.slice(0, 5),
    algorithm:     'random_forest_v1',
  });
}

export async function getRecommendations(uid: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', uid)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return {
    dailyTargets: data.daily_targets,
    breakfast:    data.breakfast,
    lunch:        data.lunch,
    dinner:       data.dinner,
    snack:        data.snack,
  };
}

// ─── Premium ──────────────────────────────────────────────────────────────────

export async function setPremium(uid: string, plan: 'monthly' | 'annual'): Promise<void> {
  await supabase.from('profiles').upsert({
    id:            uid,
    is_premium:    true,
    premium_plan:  plan,
    premium_since: new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  });
}

export async function getPremiumStatus(uid: string): Promise<{ isPremium: boolean; plan?: string }> {
  const { data } = await supabase
    .from('profiles')
    .select('is_premium, premium_plan')
    .eq('id', uid)
    .single();
  if (!data) return { isPremium: false };
  return { isPremium: !!data.is_premium, plan: data.premium_plan };
}
