import { apiRequest } from './api';
import type { Notification } from '../types/Notification';

/** Notification history is scoped by the verified Cognito subject in the backend. */
export function getMyNotifications(limit = 20, signal?: AbortSignal) {
  const boundedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  return apiRequest<Notification[]>(`/users/me/notifications?limit=${boundedLimit}`, {
    method: 'GET', authenticated: true, signal,
  });
}
