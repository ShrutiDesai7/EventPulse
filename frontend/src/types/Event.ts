export interface Event {
  eventId: string;
  title: string;
  description: string | null;
  category: string;
  venue: string;
  startDateTime: string;
  endDateTime: string;
  createdBy: string;
  status: 'UPCOMING' | 'ONGOING' | 'CANCELLED' | 'COMPLETED' | string;
  createdAt: string;
  updatedAt: string;
}
