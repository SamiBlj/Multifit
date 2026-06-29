import { create } from 'zustand';
import { WorkoutPlan } from '../types';
import { getActiveWorkoutPlan } from '../services/supabase/database';

interface WorkoutState {
  plan:      WorkoutPlan | null;
  isLoading: boolean;
  setPlan:   (plan: WorkoutPlan) => void;
  loadPlan:  (uid: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  plan:      null,
  isLoading: false,

  setPlan: (plan) => set({ plan }),

  loadPlan: async (uid) => {
    set({ isLoading: true });
    try {
      const plan = await getActiveWorkoutPlan(uid);
      if (plan) set({ plan });
    } finally {
      set({ isLoading: false });
    }
  },
}));
