import { apiRequest } from './api';
import type { Event } from '../types/Event';

export interface EventRequest {
  title: string;
  description: string | null;
  category: string;
  venue: string;
  startDateTime: string;
  endDateTime: string;
}

export interface EventMutationResult {
  event: Event;
  scheduleSyncStatus?: 'PENDING' | 'SYNCED';
  reconciliationPath?: string;
}

type EventMutationResponse = Event | {
  event: Event;
  scheduleSyncStatus?: 'PENDING' | 'SYNCED';
  reconciliationPath?: string;
};

function normalizeMutation(response: EventMutationResponse): EventMutationResult {
  if ('event' in response) {
    return { event: response.event, scheduleSyncStatus: response.scheduleSyncStatus, reconciliationPath: response.reconciliationPath };
  }
  return { event: response };
}

export function listEvents(signal?: AbortSignal) {
  return apiRequest<Event[]>('/events', { method: 'GET', signal });
}

export function getEvent(eventId: string, signal?: AbortSignal) {
  return apiRequest<Event>(`/events/${encodeURIComponent(eventId)}`, { method: 'GET', signal });
}

export async function createEvent(request: EventRequest) {
  const response = await apiRequest<EventMutationResponse>('/events', { method: 'POST', authenticated: true, body: request });
  return normalizeMutation(response);
}

export async function updateEvent(eventId: string, request: EventRequest) {
  const response = await apiRequest<EventMutationResponse>(`/events/${encodeURIComponent(eventId)}`, { method: 'PUT', authenticated: true, body: request });
  return normalizeMutation(response);
}

export async function cancelEvent(eventId: string) {
  const response = await apiRequest<EventMutationResponse>(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', authenticated: true });
  return normalizeMutation(response);
}
