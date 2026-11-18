import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventFixture } from '../test/eventFixtures';
import { apiRequest } from './api';
import { cancelEvent, createEvent, getEvent, listEvents, updateEvent, type EventRequest } from './eventService';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

const request: EventRequest = {
  title: 'Design session',
  description: null,
  category: 'Workshop',
  venue: 'Sydney Studio',
  startDateTime: '2026-11-12T09:00:00Z',
  endDateTime: '2026-11-12T11:00:00Z',
};

describe('event service API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists from the public GET /events route', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([eventFixture] as never);
    await expect(listEvents()).resolves.toEqual([eventFixture]);
    expect(apiRequest).toHaveBeenCalledWith('/events', expect.objectContaining({ method: 'GET' }));
  });

  it('reads one event from GET /events/{eventId}', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(eventFixture as never);
    await getEvent('event/42');
    expect(apiRequest).toHaveBeenCalledWith('/events/event%2F42', expect.objectContaining({ method: 'GET' }));
  });

  it('sends the DTO fields to POST /events with authentication', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(eventFixture as never);
    await expect(createEvent(request)).resolves.toEqual({ event: eventFixture });
    expect(apiRequest).toHaveBeenCalledWith('/events', { method: 'POST', authenticated: true, body: request });
  });

  it('updates and cancels through the authenticated event routes', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(eventFixture as never).mockResolvedValueOnce({ ...eventFixture, status: 'CANCELLED' } as never);
    await updateEvent('event-42', request);
    await cancelEvent('event-42');
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/events/event-42', { method: 'PUT', authenticated: true, body: request });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/events/event-42', { method: 'DELETE', authenticated: true });
  });

  it('normalizes the backend 202 schedule-pending mutation envelope', async () => {
    const pending = { event: eventFixture, scheduleSyncStatus: 'PENDING' as const, reconciliationPath: '/events/event-42/schedule-reconciliation' };
    vi.mocked(apiRequest).mockResolvedValueOnce(pending as never);
    await expect(createEvent(request)).resolves.toEqual(pending);
  });
});
