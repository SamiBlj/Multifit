import { api } from './client';
import { UserProfile } from '../../types';

export function getMe() {
  return api.get<{ user: { id: string; email: string; name: string }; profile: UserProfile | null }>('/users/me');
}

export function saveProfile(data: Partial<UserProfile>) {
  return api.put<{ profile: UserProfile }>('/users/profile', data);
}

export function savePushToken(token: string) {
  return api.post('/users/push-token', { token });
}
