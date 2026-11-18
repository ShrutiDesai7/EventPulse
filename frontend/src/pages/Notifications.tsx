import { useEffect, useState } from 'react';
import { BellRing, CircleAlert, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { PageHeading } from '../components/PageHeading';
import { ApiError } from '../services/api';
import { getEvent } from '../services/eventService';
import { getMyNotifications } from '../services/notificationService';
import type { Event } from '../types/Event';
import type { Notification } from '../types/Notification';

interface NotificationWithEvent extends Notification { event: Event | null }

const typeLabels: Record<string, string> = {
  EVENT_ANNOUNCEMENT: 'Event announcement',
  EVENT_RESCHEDULED: 'Event rescheduled',
  EVENT_CANCELLED: 'Event cancelled',
  EVENT_REMINDER: 'Event reminder',
};

function statusLabel(status: string) {
  switch (status) {
    case 'ACCEPTED_BY_SES': return 'Accepted by SES · delivery not confirmed';
    case 'FAILED': return 'Failed';
    case 'UNKNOWN': return 'Delivery status unknown';
    case 'PENDING': return 'Pending';
    default: return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (letter: string) => letter.toUpperCase());
  }
}

function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function Notifications() {
  const [items, setItems] = useState<NotificationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getMyNotifications(20, controller.signal).then(async (notifications) => {
      const eventIds = [...new Set(notifications.map((notification) => notification.eventId).filter(Boolean))];
      const eventEntries = await Promise.all(eventIds.map(async (eventId) => {
        try { return [eventId, await getEvent(eventId, controller.signal)] as const; }
        catch { return [eventId, null] as const; }
      }));
      const eventMap = new Map<string, Event | null>(eventEntries);
      if (!controller.signal.aborted) setItems(notifications.map((notification) => ({ ...notification, event: eventMap.get(notification.eventId) ?? null })));
    }).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError ? requestError.message : 'Could not load notification history. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  return <div className="page-content"><PageHeading eyebrow="STAY IN THE LOOP" title="Notifications" description="Announcements, schedule changes, and reminders from your events." />
    <p className="notification-history-note">Recent email notification attempts. “Accepted by SES” means AWS accepted the send request; delivery is not confirmed here.</p>
    {loading ? <div className="surface-card results-card"><Loading label="Loading notification history…" /></div>
      : error ? <div className="surface-card event-error-state"><div className="auth-alert auth-alert-error" role="alert">{error}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Try again</button></div>
        : items.length === 0 ? <div className="surface-card results-card"><EmptyState icon={BellRing} title="No notification history yet" description="Event announcements and reminders will appear here after the backend attempts to send them." /></div>
          : <div className="notification-list">{items.map((item) => <article className="surface-card notification-card" key={item.notificationId}>
            <span className="notification-icon"><BellRing size={18} /></span>
            <div className="notification-content"><div className="notification-title-row"><h2>{typeLabels[item.type] ?? item.type.replace(/_/g, ' ')}</h2><span className={`notification-status notification-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div>
              <p>{item.event ? <Link to={`/events/${item.eventId}`}>{item.event.title}</Link> : <>Event <code>{item.eventId}</code></>}</p>
              <time dateTime={item.createdAt}>{timestamp(item.createdAt)}</time>
              {item.failureReason && <div className="notification-failure"><CircleAlert size={14} /><span>Failure reason: {item.failureReason}</span></div>}
            </div>
          </article>)}</div>}
  </div>;
}
