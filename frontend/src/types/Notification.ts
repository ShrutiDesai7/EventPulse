export type NotificationStatus = 'PENDING' | 'ACCEPTED_BY_SES' | 'FAILED' | 'UNKNOWN' | string;

export interface Notification {
  notificationId: string;
  userId: string;
  eventId: string;
  type: 'EVENT_ANNOUNCEMENT' | 'EVENT_RESCHEDULED' | 'EVENT_CANCELLED' | 'EVENT_REMINDER' | string;
  status: NotificationStatus;
  createdAt: string;
  failureReason: string | null;
  messageId: string | null;
  attemptCount: number | null;
}
