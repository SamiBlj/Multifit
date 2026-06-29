import { supabase, AppUser, toAppUser } from './client';

export async function signUp(name: string, email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed');
  return toAppUser(data.user);
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed');
  return toAppUser(data.user);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Returns an unsubscribe function — same contract as Firebase's onAuthStateChanged
export function subscribeToAuthState(callback: (user: AppUser | null) => void): () => void {
  // Fire immediately with current session
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user ? toAppUser(data.session.user) : null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toAppUser(session.user) : null);
  });

  return () => subscription.unsubscribe();
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ? toAppUser(data.user) : null;
}
