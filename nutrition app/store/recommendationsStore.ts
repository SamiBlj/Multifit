import { create } from 'zustand';
import { MealRecommendations } from '../services/recommendation/mealRecommender';

interface RecommendationsState {
  recommendations: MealRecommendations | null;
  setRecommendations: (recs: MealRecommendations) => void;
  clearRecommendations: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>((set) => ({
  recommendations: null,
  setRecommendations: (recommendations) => set({ recommendations }),
  clearRecommendations: () => set({ recommendations: null }),
}));
