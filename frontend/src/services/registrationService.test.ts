import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { cancelRegistration, getEventRegistrations, getMyRegistrations, registerForEvent } from './registrationService';
import type { Registration } from '../types/Registration';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

const registration: Registration = { registrationId: 'r-1', eventId: 'e-1', userId: 'u-1', status: 'ACTIVE', registeredAt: '2026-12-01T00:00:00Z', cancelledAt: null };

describe('registration API service', () => {
  beforeEach(() => vi.mocked(apiRequest).mockResolvedValue(registration));

  it('creates an authenticated registration with the event route contract', async () => {
    await registerForEvent('event/one');
    expect(apiRequest).toHaveBeenCalledWith('/events/event%2Fone/registrations', { method: 'POST', authenticated: true });
  });

  it('fetches current-user registrations from the identity-scoped route', async () => {
    await getMyRegistrations();
    expect(apiRequest).toHaveBeenCalledWith('/users/me/registrations', { method: 'GET', authenticated: true, signal: undefined });
  });

  it('cancels the specified registration', async () => {
    await cancelRegistration('r-1');
    expect(apiRequest).toHaveBeenCalledWith('/registrations/r-1', { method: 'DELETE', authenticated: true });
  });

  it('fetches event registrations through the authenticated admin route', async () => {
    await getEventRegistrations('e-1');
    expect(apiRequest).toHaveBeenCalledWith('/events/e-1/registrations', { method: 'GET', authenticated: true, signal: undefined });
  });
});
