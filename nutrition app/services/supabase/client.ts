import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

// Normalised user shape — keeps existing user.uid references working everywhere
export interface AppUser {
  uid:   string;
  email: string | null;
  name:  string | null;
}

export function toAppUser(sbUser: any): AppUser {
  return {
    uid:   sbUser.id,
    email: sbUser.email ?? null,
    name:  sbUser.user_metadata?.name ?? sbUser.user_metadata?.full_name ?? null,
  };
}
