import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { getMyNotifications } from './notificationService';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

describe('notification history service', () => {
  beforeEach(() => vi.mocked(apiRequest).mockResolvedValue([]));
  it('requests the authenticated current-user endpoint with the supported limit', async () => {
    await getMyNotifications(50);
    expect(apiRequest).toHaveBeenCalledWith('/users/me/notifications?limit=50', { method: 'GET', authenticated: true, signal: undefined });
  });
  it('bounds limits to the backend-supported range', async () => {
    await getMyNotifications(500);
    expect(apiRequest).toHaveBeenCalledWith('/users/me/notifications?limit=100', expect.any(Object));
  });
});
