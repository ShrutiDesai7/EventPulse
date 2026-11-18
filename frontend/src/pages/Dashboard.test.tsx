import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventFixture } from '../test/eventFixtures';
import { ApiError } from '../services/api';
import { listEvents } from '../services/eventService';
import { getMyRegistrations } from '../services/registrationService';
import type { Registration } from '../types/Registration';
import { Dashboard } from './Dashboard';

const auth = vi.hoisted(() => ({ user: { userId: 'u-1', email: 'person@example.com', name: 'Person', role: 'USER' as const } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/eventService', () => ({ listEvents: vi.fn(), getEvent: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), cancelEvent: vi.fn() }));
vi.mock('../services/registrationService', () => ({ getMyRegistrations: vi.fn(), registerForEvent: vi.fn(), cancelRegistration: vi.fn(), getEventRegistrations: vi.fn() }));

const registration: Registration = { registrationId: 'r-1', eventId: eventFixture.eventId, userId: 'u-1', status: 'ACTIVE', registeredAt: '2026-11-01T00:00:00Z', cancelledAt: null };
const upcomingEvent = { ...eventFixture, startDateTime: '2099-11-12T09:00:00Z', endDateTime: '2099-11-12T11:00:00Z' };
const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('user dashboard integration', () => {
  beforeEach(() => {
    vi.mocked(listEvents).mockResolvedValue([upcomingEvent]);
    vi.mocked(getMyRegistrations).mockResolvedValue([registration]);
  });
  it('loads events and registrations once and shows upcoming registered events', async () => {
    renderDashboard();
    expect(await screen.findByText('Your active registrations')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: eventFixture.title })).toHaveLength(2);
    expect(screen.getByText('Registered')).toBeInTheDocument();
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(getMyRegistrations).toHaveBeenCalledTimes(1);
  });
  it('excludes registrations for cancelled events from the active count and list', async () => {
    vi.mocked(listEvents).mockResolvedValue([{ ...upcomingEvent, status: 'CANCELLED' }]);
    renderDashboard();
    expect(await screen.findByText('Your active registrations')).toBeInTheDocument();
    expect(screen.getByText('Your active registrations').parentElement?.querySelector('.overview-value')).toHaveTextContent('0');
    expect(screen.getByText('No active registrations')).toBeInTheDocument();
    expect(screen.queryByText('Registered')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: eventFixture.title })).not.toBeInTheDocument();
  });
  it('shows independent loading states while dashboard data is pending', async () => {
    vi.mocked(listEvents).mockReturnValue(new Promise(() => {}));
    vi.mocked(getMyRegistrations).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(await screen.findByText('Dashboard data is loading')).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(1);
  });
  it('shows API errors without substituting fabricated event or registration data', async () => {
    vi.mocked(listEvents).mockRejectedValue(new ApiError('Events unavailable', 503));
    vi.mocked(getMyRegistrations).mockRejectedValue(new ApiError('Sign in required', 401));
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent('Events unavailable Sign in required');
    expect(screen.getByText('Registration data unavailable')).toBeInTheDocument();
  });
});
