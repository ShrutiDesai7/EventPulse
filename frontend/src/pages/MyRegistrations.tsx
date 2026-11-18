import { useEffect, useState } from 'react';
import { CalendarDays, RotateCw, Ticket, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { PageHeading } from '../components/PageHeading';
import { ApiError } from '../services/api';
import { getEvent } from '../services/eventService';
import { cancelRegistration, getMyRegistrations } from '../services/registrationService';
import type { Event } from '../types/Event';
import type { Registration } from '../types/Registration';

interface RegistrationWithEvent extends Registration { event: Event | null }

function registrationStatus(item: RegistrationWithEvent) {
  if (item.status === 'CANCELLED') return { label: 'Registration Cancelled', className: 'status-cancelled' };
  if (item.event?.status === 'CANCELLED') return { label: 'Cancelled by Admin', className: 'status-cancelled' };
  if (item.event?.status === 'COMPLETED') return { label: 'Completed', className: 'status-completed' };
  return { label: 'Registered', className: 'status-active' };
}

function displayDate(value?: string | null) {
  if (!value) return 'Event details unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function MyRegistrations() {
  const [items, setItems] = useState<RegistrationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getMyRegistrations(controller.signal).then(async (registrations) => {
      const joined = await Promise.all(registrations.map(async (registration) => {
        try { return { ...registration, event: await getEvent(registration.eventId, controller.signal) }; }
        catch { return { ...registration, event: null }; }
      }));
      if (!controller.signal.aborted) setItems(joined.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)));
    }).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError ? requestError.message : 'Could not load your registrations. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const cancel = async (registrationId: string) => {
    setBusyId(registrationId); setActionError(''); setNotice('');
    try {
      const updated = await cancelRegistration(registrationId);
      setItems((current) => current.map((item) => item.registrationId === registrationId ? { ...item, ...updated } : item));
      setNotice('Registration cancelled.');
    } catch (requestError) {
      setActionError(requestError instanceof ApiError ? requestError.message : 'Could not cancel this registration. Try again.');
    } finally { setBusyId(null); }
  };

  return <div className="page-content"><PageHeading eyebrow="YOUR PLANS" title="My registrations" description="The events you’ve signed up for, all in one place." />
    {notice && <div className="auth-alert auth-alert-success" role="status">{notice}</div>}
    {actionError && <div className="auth-alert auth-alert-error" role="alert">{actionError}</div>}
    {loading ? <div className="surface-card results-card"><Loading label="Loading your registrations…" /></div>
      : error ? <div className="surface-card event-error-state"><div className="auth-alert auth-alert-error" role="alert">{error}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Try again</button></div>
        : items.length === 0 ? <div className="surface-card results-card"><EmptyState icon={Ticket} title="No registrations to show" description="Browse events and register to see your plans here." actionLabel="Browse events" actionTo="/events" /></div>
          : <div className="registration-list">{items.map((item) => { const status = registrationStatus(item); return <article className="surface-card registration-card" key={item.registrationId}>
            <div className="registration-card-icon"><CalendarDays size={20} /></div>
            <div className="registration-card-info"><span className={`event-status ${status.className}`}>{status.label}</span><h2>{item.event?.title ?? 'Event details unavailable'}</h2>
              {item.event ? <><p>{item.event.category} · {item.event.venue}</p><p>{displayDate(item.event.startDateTime)}</p><Link to={`/events/${item.eventId}`}>View event</Link></> : <p>Registration ID: {item.registrationId}</p>}
              <small>Registered {displayDate(item.registeredAt)}{item.cancelledAt ? ` · Cancelled ${displayDate(item.cancelledAt)}` : ''}</small>
            </div>
            {item.status === 'ACTIVE' && item.event?.status !== 'CANCELLED' && item.event?.status !== 'COMPLETED' && <button className="button button-danger button-small" onClick={() => void cancel(item.registrationId)} disabled={busyId !== null} aria-label={`Cancel registration for ${item.event?.title ?? item.eventId}`}><XCircle size={14} />{busyId === item.registrationId ? 'Cancelling…' : 'Cancel registration'}</button>}
          </article>; })}</div>}
  </div>;
}
