import { create } from 'zustand';
import { UserProfile } from '../types';

type OnboardingDraft = Partial<UserProfile>;

interface OnboardingState {
  draft: OnboardingDraft;
  updateDraft: (fields: OnboardingDraft) => void;
  resetDraft: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: {},
  updateDraft: (fields) => set((state) => ({ draft: { ...state.draft, ...fields } })),
  resetDraft: () => set({ draft: {} }),
}));
