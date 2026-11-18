import { apiRequest } from './api';

/** Shape produced by DashboardService.summary() in the Java backend. */
export interface AdminDashboardSummary {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  registrationCounts: Record<string, number>;
}

export function getAdminDashboardSummary(signal?: AbortSignal) {
  return apiRequest<AdminDashboardSummary>('/admin/dashboard', { method: 'GET', authenticated: true, signal });
}
