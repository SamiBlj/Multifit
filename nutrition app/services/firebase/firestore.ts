/**
 * Firestore helpers — mirrors the SQL schema as Firestore collections.
 *
 * Collection layout:
 *   users/{uid}                        — profile + settings doc
 *   users/{uid}/meal_calendars/{id}    — 7-day plan header
 *   users/{uid}/meal_calendars/{id}/day_plans/{date}  — one day
 *   users/{uid}/meal_logs/{id}         — what the user actually ate
 *   users/{uid}/water_logs/{id}        — water intake entries
 *   users/{uid}/meal_ratings/{id}      — meal star ratings
 *   users/{uid}/workout_plans/{id}     — AI workout plan header
 *   users/{uid}/workout_sessions/{id}  — completed workout sessions
 *   users/{uid}/body_metrics/{date}    — weight / measurements
 *   users/{uid}/recommendations/{id}   — recommender output
 *   meal_catalog/{id}                  — shared meal template library
 */

import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit,
  getDocs, serverTimestamp, Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { UserProfile, MealCalendar, DayPlan, WorkoutPlan } from '../../types';
import { MealRecommendations } from '../recommendation/mealRecommender';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const userRef   = (uid: string) => doc(db, 'users', uid);
const subCol    = (uid: string, col: string) => collection(db, 'users', uid, col);
const subDoc    = (uid: string, col: string, id: string) => doc(db, 'users', uid, col, id);

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function saveProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  await setDoc(userRef(uid), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getProfile(uid: string): Promise<Partial<UserProfile> | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as Partial<UserProfile>;
}

// ─── Daily Targets ────────────────────────────────────────────────────────────

export async function saveDailyTargets(uid: string, targets: {
  calories: number; proteinG: number; carbsG: number; fatG: number;
}): Promise<void> {
  await setDoc(subDoc(uid, 'daily_targets', 'current'), {
    ...targets,
    updatedAt: serverTimestamp(),
  });
}

// ─── Meal Calendar ────────────────────────────────────────────────────────────

export async function saveMealCalendar(uid: string, calendar: MealCalendar): Promise<string> {
  const calRef = await addDoc(subCol(uid, 'meal_calendars'), {
    weekStartDate: calendar.weekStartDate,
    source: 'ai',
    generatedAt: serverTimestamp(),
  });

  // Save each day plan as a sub-document keyed by date
  for (const day of calendar.days) {
    await setDoc(doc(db, 'users', uid, 'meal_calendars', calRef.id, 'day_plans', day.date), {
      date: day.date,
      totalCalories: day.totalCalories,
      totalProtein: day.totalProtein,
      totalCarbs: day.totalCarbs,
      totalFat: day.totalFat,
      meals: day.meals,
    });
  }

  return calRef.id;
}

export async function getLatestMealCalendar(uid: string): Promise<MealCalendar | null> {
  const q = query(subCol(uid, 'meal_calendars'), orderBy('generatedAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const calDoc = snap.docs[0];
  const daySnaps = await getDocs(collection(db, 'users', uid, 'meal_calendars', calDoc.id, 'day_plans'));

  const days: DayPlan[] = daySnaps.docs.map((d) => d.data() as DayPlan);
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    weekStartDate: calDoc.data().weekStartDate,
    days,
  };
}

// ─── Meal Logs ────────────────────────────────────────────────────────────────

export async function logMeal(uid: string, entry: {
  mealType: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servings?: number;
  notes?: string;
  catalogId?: string;
}): Promise<string> {
  const ref = await addDoc(subCol(uid, 'meal_logs'), {
    ...entry,
    logDate: new Date().toISOString().split('T')[0],
    loggedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getMealLogsForDate(uid: string, date: string): Promise<DocumentData[]> {
  const q = query(subCol(uid, 'meal_logs'), where('logDate', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Water Logs ───────────────────────────────────────────────────────────────

export async function logWater(uid: string, amountMl: number): Promise<void> {
  await addDoc(subCol(uid, 'water_logs'), {
    amountMl,
    logDate: new Date().toISOString().split('T')[0],
    loggedAt: serverTimestamp(),
  });
}

export async function getWaterForDate(uid: string, date: string): Promise<number> {
  const q = query(subCol(uid, 'water_logs'), where('logDate', '==', date));
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data().amountMl ?? 0), 0);
}

// ─── Meal Ratings ─────────────────────────────────────────────────────────────

export async function rateMeal(uid: string, catalogId: string, rating: number, notes?: string): Promise<void> {
  await addDoc(subCol(uid, 'meal_ratings'), {
    catalogId,
    rating,
    notes: notes ?? null,
    ratedAt: serverTimestamp(),
  });
}

// ─── Workout Plan ─────────────────────────────────────────────────────────────

export async function saveWorkoutPlan(uid: string, plan: WorkoutPlan): Promise<string> {
  const ref = await addDoc(subCol(uid, 'workout_plans'), {
    goal: plan.goal,
    weeksTotal: plan.weeksTotal,
    isActive: true,
    days: plan.days,
    generatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getActiveWorkoutPlan(uid: string): Promise<WorkoutPlan | null> {
  const q = query(subCol(uid, 'workout_plans'), where('isActive', '==', true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return { id: snap.docs[0].id, goal: d.goal, weeksTotal: d.weeksTotal, days: d.days };
}

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export async function startWorkoutSession(uid: string, workoutDayLabel: string): Promise<string> {
  const ref = await addDoc(subCol(uid, 'workout_sessions'), {
    workoutDayLabel,
    startedAt: serverTimestamp(),
    endedAt: null,
    sets: [],
  });
  return ref.id;
}

export async function endWorkoutSession(uid: string, sessionId: string, sets: object[]): Promise<void> {
  await updateDoc(subDoc(uid, 'workout_sessions', sessionId), {
    endedAt: serverTimestamp(),
    sets,
  });
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

export async function saveBodyMetric(uid: string, metrics: {
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  notes?: string;
}): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  // Use date as doc ID so one entry per day (overwrites if logged twice same day)
  await setDoc(subDoc(uid, 'body_metrics', date), {
    ...metrics,
    logDate: date,
    loggedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getBodyMetrics(uid: string, limitCount = 30): Promise<DocumentData[]> {
  const q = query(subCol(uid, 'body_metrics'), orderBy('logDate', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function saveRecommendations(uid: string, recs: MealRecommendations): Promise<void> {
  await setDoc(subDoc(uid, 'recommendations', 'latest'), {
    dailyTargets: recs.dailyTargets,
    breakfast: recs.breakfast.slice(0, 5),
    lunch: recs.lunch.slice(0, 5),
    dinner: recs.dinner.slice(0, 5),
    snack: recs.snack.slice(0, 5),
    generatedAt: serverTimestamp(),
    algorithm: 'random_forest_v1',
  });
}

export async function getRecommendations(uid: string): Promise<DocumentData | null> {
  const snap = await getDoc(subDoc(uid, 'recommendations', 'latest'));
  if (!snap.exists()) return null;
  return snap.data();
}

// ─── Premium / Stripe ─────────────────────────────────────────────────────────

export async function setPremium(uid: string, plan: 'monthly' | 'annual'): Promise<void> {
  await updateDoc(userRef(uid), {
    isPremium:        true,
    premiumPlan:      plan,
    premiumSince:     serverTimestamp(),
  });
}

export async function getPremiumStatus(uid: string): Promise<{ isPremium: boolean; plan?: string }> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return { isPremium: false };
  const data = snap.data();
  return { isPremium: !!data.isPremium, plan: data.premiumPlan };
}
