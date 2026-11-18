import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventFixture } from '../test/eventFixtures';
import { cancelEvent, createEvent, listEvents, updateEvent } from '../services/eventService';
import { getEventRegistrations } from '../services/registrationService';
import { getAdminDashboardSummary } from '../services/dashboardService';
import { ApiError } from '../services/api';
import { AdminDashboard } from './AdminDashboard';

vi.mock('../services/eventService', () => ({
  listEvents: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  cancelEvent: vi.fn(),
}));
vi.mock('../services/registrationService', () => ({ getEventRegistrations: vi.fn(), getMyRegistrations: vi.fn(), registerForEvent: vi.fn(), cancelRegistration: vi.fn() }));
vi.mock('../services/dashboardService', () => ({ getAdminDashboardSummary: vi.fn() }));

function renderAdminDashboard() {
  return render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
}

describe('admin event actions', () => {
  beforeEach(() => {
    vi.mocked(createEvent).mockResolvedValue({ event: eventFixture });
    vi.mocked(updateEvent).mockResolvedValue({ event: eventFixture });
    vi.mocked(cancelEvent).mockResolvedValue({ event: { ...eventFixture, status: 'CANCELLED' } });
    vi.mocked(getEventRegistrations).mockResolvedValue([]);
    vi.mocked(getAdminDashboardSummary).mockResolvedValue({ totalEvents: 8, upcomingEvents: 3, completedEvents: 4, cancelledEvents: 1, registrationCounts: { 'event-42': 6, 'event-43': 2 } });
  });

  it('creates an event using the backend request fields', async () => {
    vi.mocked(listEvents).mockResolvedValue([]);
    renderAdminDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Create event' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Community design night'), { target: { value: 'New community meetup' } });
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Workshop'), { target: { value: 'Meetup' } });
    fireEvent.change(within(dialog).getByPlaceholderText('Address or online'), { target: { value: 'Central Hall' } });
    fireEvent.change(within(dialog).getByLabelText('Starts *'), { target: { value: '2026-12-10T10:00' } });
    fireEvent.change(within(dialog).getByLabelText('Ends *'), { target: { value: '2026-12-10T11:00' } });
    fireEvent.change(within(dialog).getByPlaceholderText('What should participants know?'), { target: { value: 'Bring a notebook.' } });
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'New community meetup', category: 'Meetup', venue: 'Central Hall', description: 'Bring a notebook.' })));
    expect(vi.mocked(createEvent).mock.calls[0][0].startDateTime).toMatch(/Z$/);
    expect(await screen.findByRole('status')).toHaveTextContent('Event created successfully.');
  });

  it('updates an event through the admin edit form', async () => {
    vi.mocked(listEvents).mockResolvedValue([eventFixture]);
    renderAdminDashboard();
    const card = await screen.findByRole('heading', { name: eventFixture.title }).then((heading) => heading.closest<HTMLElement>('.event-card')!);
    fireEvent.click(within(card).getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Community design night'), { target: { value: 'Updated design night' } });
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(updateEvent).toHaveBeenCalledWith('event-42', expect.objectContaining({ title: 'Updated design night' })));
    expect(await screen.findByRole('status')).toHaveTextContent('Event updated successfully.');
  });

  it('cancels an event through the admin confirmation flow', async () => {
    vi.mocked(listEvents).mockResolvedValue([eventFixture]);
    renderAdminDashboard();
    const card = await screen.findByRole('heading', { name: eventFixture.title }).then((heading) => heading.closest<HTMLElement>('.event-card')!);
    fireEvent.click(within(card).getByRole('button', { name: 'Cancel event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    await waitFor(() => expect(cancelEvent).toHaveBeenCalledWith('event-42'));
    expect(await screen.findByRole('status')).toHaveTextContent('Event cancelled successfully.');
  });

  it('loads event registrations only when the admin opens the list', async () => {
    vi.mocked(listEvents).mockResolvedValue([eventFixture]);
    renderAdminDashboard();
    const card = await screen.findByRole('heading', { name: eventFixture.title }).then((heading) => heading.closest<HTMLElement>('.event-card')!);
    expect(getEventRegistrations).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByRole('button', { name: 'View registrations' }));
    expect(await within(card).findByText('No registrations for this event.')).toBeInTheDocument();
    expect(getEventRegistrations).toHaveBeenCalledWith(eventFixture.eventId, expect.any(AbortSignal));
  });

  it('displays the statistics and per-event registration counts returned by the backend', async () => {
    vi.mocked(listEvents).mockResolvedValue([]);
    renderAdminDashboard();
    expect(await screen.findByText('Total events')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('event-42')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(getAdminDashboardSummary).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('shows a loading state while dashboard statistics are pending', async () => {
    vi.mocked(listEvents).mockResolvedValue([]);
    vi.mocked(getAdminDashboardSummary).mockReturnValue(new Promise(() => {}));
    renderAdminDashboard();
    expect(await screen.findByText('Loading dashboard statistics…')).toBeInTheDocument();
  });

  it('reports that dashboard statistics are not exposed when the backend route is missing', async () => {
    vi.mocked(listEvents).mockResolvedValue([]);
    vi.mocked(getAdminDashboardSummary).mockRejectedValue(new ApiError('The requested resource could not be found.', 404));
    renderAdminDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent('GET /admin/dashboard is not currently exposed by the backend API.');
  });
});
