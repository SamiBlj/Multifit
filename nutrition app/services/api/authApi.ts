import { api } from './client';

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export function register(email: string, password: string, name: string) {
  return api.post<AuthResponse>('/auth/register', { email, password, name });
}

export function login(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password });
}
