import { create } from 'zustand';
import { MealCalendar, DayPlan } from '../types';
import { getLatestMealCalendar } from '../services/supabase/database';

interface NutritionState {
  calendar:    MealCalendar | null;
  isLoading:   boolean;
  setCalendar: (calendar: MealCalendar) => void;
  loadCalendar: (uid: string) => Promise<void>;
  getTodaysPlan: () => DayPlan | null;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  calendar:  null,
  isLoading: false,

  setCalendar: (calendar) => set({ calendar }),

  loadCalendar: async (uid) => {
    set({ isLoading: true });
    try {
      const calendar = await getLatestMealCalendar(uid);
      if (calendar) set({ calendar });
    } finally {
      set({ isLoading: false });
    }
  },

  getTodaysPlan: () => {
    const { calendar } = get();
    if (!calendar) return null;
    const today = new Date().toISOString().split('T')[0];
    return calendar.days.find((d) => d.date === today) ?? calendar.days[0] ?? null;
  },
}));
