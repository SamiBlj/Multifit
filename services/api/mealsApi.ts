import { api } from './client';
import { MealCalendar, Meal } from '../../types';

export function generateMealPlan() {
  return api.post<{ calendar: MealCalendar }>('/meals/generate');
}

export function getWeekCalendar(date?: string) {
  const qs = date ? `?date=${date}` : '';
  return api.get<{ weekStart: string; days: MealCalendar['days'] }>(`/meals/week${qs}`);
}

export function getTodaysMeals() {
  return api.get<{ date: string; meals: Meal[] }>('/meals/today');
}
