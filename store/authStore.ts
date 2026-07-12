import { create } from 'zustand';
import { AppUser } from '../services/supabase/client';
import { signUp, signIn, signOut } from '../services/supabase/auth';

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await signUp(name, email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const msg = err?.message || err?.error_description || err?.code || (typeof err === 'string' ? err : '') || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await signIn(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const msg = err?.message || err?.error_description || err?.code || (typeof err === 'string' ? err : '') || 'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
