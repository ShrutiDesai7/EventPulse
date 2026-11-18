import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { eventFixture, secondEventFixture } from '../test/eventFixtures';
import { getEvent, listEvents } from '../services/eventService';
import { Events } from './Events';
import { EventDetails } from './EventDetails';

vi.mock('../services/eventService', () => ({
  listEvents: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  cancelEvent: vi.fn(),
}));

describe('event API pages', () => {
  beforeEach(() => {
    vi.mocked(listEvents).mockResolvedValue([eventFixture, secondEventFixture]);
    vi.mocked(getEvent).mockResolvedValue(eventFixture);
  });

  it('loads and displays events, then filters the returned data by category', async () => {
    render(<MemoryRouter><AuthProvider><Events /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Community design night' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Community lunch' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Workshop' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Community design night' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Community lunch' })).not.toBeInTheDocument();
    expect(listEvents).toHaveBeenCalled();
  });

  it('loads a single event using the GET event details contract', async () => {
    render(<MemoryRouter initialEntries={['/events/event-42']}><AuthProvider><Routes><Route path="/events/:eventId" element={<EventDetails />} /></Routes></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Community design night' })).toBeInTheDocument();
    expect(screen.getByText('Sydney Studio')).toBeInTheDocument();
    expect(getEvent).toHaveBeenCalledWith('event-42', expect.any(AbortSignal));
  });
});
