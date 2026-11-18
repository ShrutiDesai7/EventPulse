import type { Event } from '../types/Event';

export const eventFixture: Event = {
  eventId: 'event-42',
  title: 'Community design night',
  description: 'A hands-on design workshop.',
  category: 'Workshop',
  venue: 'Sydney Studio',
  startDateTime: '2026-11-12T09:00:00Z',
  endDateTime: '2026-11-12T11:00:00Z',
  createdBy: 'admin-sub',
  status: 'UPCOMING',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

export const secondEventFixture: Event = {
  ...eventFixture,
  eventId: 'event-43',
  title: 'Community lunch',
  description: null,
  category: 'Social',
  venue: 'Harbour Hall',
  startDateTime: '2026-11-15T02:00:00Z',
};
