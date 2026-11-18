import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { getAdminDashboardSummary } from './dashboardService';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

describe('admin dashboard service', () => {
  beforeEach(() => vi.mocked(apiRequest).mockResolvedValue({ totalEvents: 2, upcomingEvents: 1, completedEvents: 1, cancelledEvents: 0, registrationCounts: { e1: 3 } }));
  it('calls the authenticated admin summary route without deriving additional metrics', async () => {
    await getAdminDashboardSummary();
    expect(apiRequest).toHaveBeenCalledWith('/admin/dashboard', { method: 'GET', authenticated: true, signal: undefined });
  });
});
