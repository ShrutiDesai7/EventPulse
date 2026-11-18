import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventFixture } from '../test/eventFixtures';
import { ApiError } from '../services/api';
import { getEvent } from '../services/eventService';
import { cancelRegistration, getMyRegistrations, registerForEvent } from '../services/registrationService';
import type { Registration } from '../types/Registration';
import { EventDetails } from './EventDetails';
import { MyRegistrations } from './MyRegistrations';

const auth = vi.hoisted(() => ({ status: 'authenticated' as 'authenticated' | 'unauthenticated', user: { userId: 'u-1', email: 'user@example.com', name: 'User', role: 'USER' as const } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/eventService', () => ({ getEvent: vi.fn(), listEvents: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), cancelEvent: vi.fn() }));
vi.mock('../services/registrationService', () => ({ registerForEvent: vi.fn(), getMyRegistrations: vi.fn(), cancelRegistration: vi.fn(), getEventRegistrations: vi.fn() }));

const active: Registration = { registrationId: 'r-1', eventId: eventFixture.eventId, userId: 'u-1', status: 'ACTIVE', registeredAt: '2026-12-01T00:00:00Z', cancelledAt: null };
const cancelled: Registration = { ...active, status: 'CANCELLED', cancelledAt: '2026-12-02T00:00:00Z' };

function renderDetails() {
  return render(<MemoryRouter initialEntries={[`/events/${eventFixture.eventId}`]}><Routes><Route path="/events/:eventId" element={<EventDetails />} /></Routes></MemoryRouter>);
}

describe('registration experiences', () => {
  beforeEach(() => {
    auth.status = 'authenticated';
    vi.mocked(getEvent).mockResolvedValue({ ...eventFixture, startDateTime: '2099-12-01T10:00:00Z', endDateTime: '2099-12-01T11:00:00Z' });
    vi.mocked(getMyRegistrations).mockResolvedValue([]);
    vi.mocked(registerForEvent).mockResolvedValue(active);
    vi.mocked(cancelRegistration).mockResolvedValue(cancelled);
  });

  it('registers the authenticated user for the displayed event', async () => {
    renderDetails();
    fireEvent.click(await screen.findByRole('button', { name: 'Register for event' }));
    expect(await screen.findByText('Already registered')).toBeInTheDocument();
    expect(registerForEvent).toHaveBeenCalledWith(eventFixture.eventId);
  });

  it('shows already registered based on the user registrations response', async () => {
    vi.mocked(getMyRegistrations).mockResolvedValue([active]);
    renderDetails();
    expect(await screen.findByText('Already registered')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register for event' })).not.toBeInTheDocument();
  });

  it.each([
    ['ONGOING', 'Registration is closed because this event has already started.'],
    ['COMPLETED', 'Registration is closed because this event has completed.'],
    ['CANCELLED', 'Registration is unavailable because this event has been cancelled.'],
  ])('blocks the register button for %s events', async (eventStatus, message) => {
    vi.mocked(getEvent).mockResolvedValue({ ...eventFixture, status: eventStatus, startDateTime: '2025-12-01T10:00:00Z' });
    renderDetails();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register for event' })).not.toBeInTheDocument();
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it('closes registration at the event start-time boundary, even if status says upcoming', async () => {
    const start = new Date(Date.now()).toISOString();
    vi.mocked(getEvent).mockResolvedValue({ ...eventFixture, status: 'UPCOMING', startDateTime: start });
    renderDetails();
    expect(await screen.findByText('Registration is closed because this event has already started.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register for event' })).not.toBeInTheDocument();
  });

  it('explains duplicate/conflict responses and preserves cancelled registration state', async () => {
    vi.mocked(registerForEvent).mockRejectedValue(new ApiError('User is already registered for this event', 409, 'REGISTRATION_ERROR'));
    vi.mocked(getMyRegistrations).mockResolvedValueOnce([]).mockResolvedValueOnce([cancelled]);
    renderDetails();
    fireEvent.click(await screen.findByRole('button', { name: 'Register for event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('User is already registered for this event');
    expect(await screen.findByText('Registration cancelled')).toBeInTheDocument();
  });

  it('loads registrations with event details and cancels an active registration', async () => {
    vi.mocked(getMyRegistrations).mockResolvedValue([active]);
    vi.mocked(getEvent).mockResolvedValue(eventFixture);
    render(<MemoryRouter><MyRegistrations /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: eventFixture.title })).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Cancel registration for ${eventFixture.title}` }));
    await waitFor(() => expect(cancelRegistration).toHaveBeenCalledWith(active.registrationId));
    expect(await screen.findByText('Registration cancelled.')).toBeInTheDocument();
    expect(screen.getByText('Registration Cancelled')).toBeInTheDocument();
  });

  it('shows admin-cancelled and completed event statuses on active registrations', async () => {
    vi.mocked(getMyRegistrations).mockResolvedValue([active, { ...active, registrationId: 'r-2', eventId: 'event-cancelled' }]);
    vi.mocked(getEvent).mockImplementation(async (eventId) => ({
      ...eventFixture,
      eventId,
      status: eventId === 'event-cancelled' ? 'CANCELLED' : 'COMPLETED',
    }));
    render(<MemoryRouter><MyRegistrations /></MemoryRouter>);
    expect(await screen.findByText('Cancelled by Admin')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel registration for/ })).not.toBeInTheDocument();
  });

  it('labels a user-cancelled registration distinctly', async () => {
    vi.mocked(getMyRegistrations).mockResolvedValue([cancelled]);
    render(<MemoryRouter><MyRegistrations /></MemoryRouter>);
    expect(await screen.findByText('Registration Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel registration for/ })).not.toBeInTheDocument();
  });

  it('shows an empty state when the user has no registrations', async () => {
    render(<MemoryRouter><MyRegistrations /></MemoryRouter>);
    expect(await screen.findByText('No registrations to show')).toBeInTheDocument();
  });
});
