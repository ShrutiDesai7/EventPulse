import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventFixture } from '../test/eventFixtures';
import { ApiError } from '../services/api';
import { getEvent } from '../services/eventService';
import { getMyNotifications } from '../services/notificationService';
import type { Notification } from '../types/Notification';
import { Notifications } from './Notifications';

vi.mock('../services/eventService', () => ({ getEvent: vi.fn(), listEvents: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), cancelEvent: vi.fn() }));
vi.mock('../services/notificationService', () => ({ getMyNotifications: vi.fn() }));

const records: Notification[] = [
  { notificationId: 'n-1', userId: 'u-1', eventId: eventFixture.eventId, type: 'EVENT_ANNOUNCEMENT', status: 'ACCEPTED_BY_SES', createdAt: '2026-12-01T10:00:00Z', failureReason: null, messageId: 'ses-1', attemptCount: 1 },
  { notificationId: 'n-2', userId: 'u-1', eventId: eventFixture.eventId, type: 'EVENT_REMINDER', status: 'FAILED', createdAt: '2026-12-01T09:00:00Z', failureReason: 'SES_REJECTED_400', messageId: null, attemptCount: 2 },
  { notificationId: 'n-3', userId: 'u-1', eventId: eventFixture.eventId, type: 'EVENT_RESCHEDULED', status: 'UNKNOWN', createdAt: '2026-12-01T08:00:00Z', failureReason: 'SES_RESULT_UNKNOWN', messageId: null, attemptCount: 1 },
];

function renderPage() { return render(<MemoryRouter><Notifications /></MemoryRouter>); }

describe('notification history page', () => {
  beforeEach(() => {
    vi.mocked(getMyNotifications).mockResolvedValue(records);
    vi.mocked(getEvent).mockResolvedValue(eventFixture);
  });
  it('shows loading while fetching history', async () => {
    vi.mocked(getMyNotifications).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(await screen.findByText('Loading notification history…')).toBeInTheDocument();
  });
  it('renders type, related event, timestamp, and accurate SES status labels', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Event announcement' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: eventFixture.title })).toHaveLength(3);
    expect(screen.getByText('Accepted by SES · delivery not confirmed')).toBeInTheDocument();
    expect(screen.getByText('Delivery status unknown')).toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-12-01T10:00:00Z"]')).toBeInTheDocument();
  });
  it('shows available failure reasons', async () => {
    renderPage();
    expect(await screen.findByText('Failure reason: SES_REJECTED_400')).toBeInTheDocument();
    expect(screen.getByText('Failure reason: SES_RESULT_UNKNOWN')).toBeInTheDocument();
  });
  it('shows an empty state for an empty history', async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No notification history yet')).toBeInTheDocument();
  });
  it('shows API failures and allows retry', async () => {
    vi.mocked(getMyNotifications).mockRejectedValueOnce(new ApiError('You do not have permission.', 403)).mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No notification history yet')).toBeInTheDocument();
  });
});
