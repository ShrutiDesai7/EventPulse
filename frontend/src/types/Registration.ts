export interface Registration {
  registrationId: string;
  eventId: string;
  userId: string;
  status: 'ACTIVE' | 'CANCELLED' | string;
  registeredAt: string;
  cancelledAt: string | null;
}
