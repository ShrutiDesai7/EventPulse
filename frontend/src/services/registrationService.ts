import { apiRequest } from './api';
import type { Registration } from '../types/Registration';

export function registerForEvent(eventId: string) {
  return apiRequest<Registration>(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'POST', authenticated: true,
  });
}

export function getMyRegistrations(signal?: AbortSignal) {
  return apiRequest<Registration[]>('/users/me/registrations', { method: 'GET', authenticated: true, signal });
}

export function cancelRegistration(registrationId: string) {
  return apiRequest<Registration>(`/registrations/${encodeURIComponent(registrationId)}`, {
    method: 'DELETE', authenticated: true,
  });
}

export function getEventRegistrations(eventId: string, signal?: AbortSignal) {
  return apiRequest<Registration[]>(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'GET', authenticated: true, signal,
  });
}
