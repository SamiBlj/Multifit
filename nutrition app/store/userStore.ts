import { create } from 'zustand';
import { UserProfile } from '../types';
import { getProfile, saveProfile } from '../services/supabase/database';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  loadProfile: (uid: string) => Promise<void>;
  updateProfile: (uid: string, fields: Partial<UserProfile>) => Promise<void>;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile:   null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  loadProfile: async (uid) => {
    set({ isLoading: true });
    try {
      const data = await getProfile(uid);
      if (data) set({ profile: data as UserProfile });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (uid, fields) => {
    const merged = { ...(get().profile ?? {}), ...fields } as UserProfile;
    set({ profile: merged });
    await saveProfile(uid, merged);
  },

  clearProfile: () => set({ profile: null }),
}));
