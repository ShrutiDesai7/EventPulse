import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, MapPin, RotateCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { getEvent } from '../services/eventService';
import { getMyRegistrations, registerForEvent } from '../services/registrationService';
import type { Event } from '../types/Event';
import type { Registration } from '../types/Registration';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}

function registrationClosedMessage(event: Event) {
  if (event.status === 'CANCELLED') return 'Registration is unavailable because this event has been cancelled.';
  if (event.status === 'COMPLETED') return 'Registration is closed because this event has completed.';
  if (event.status === 'ONGOING' || new Date(event.startDateTime).getTime() <= Date.now()) return 'Registration is closed because this event has already started.';
  if (event.status !== 'UPCOMING') return 'Registration is only available for upcoming events.';
  return null;
}

export function EventDetails() {
  const { eventId = '' } = useParams();
  const { status, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setEvent(null);
    getEvent(eventId, controller.signal).then(setEvent).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError ? requestError.message : 'Could not load this event. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eventId, retry]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) { setRegistration(null); return; }
    const controller = new AbortController();
    setRegistration(null); setRegistrationLoading(true); setRegistrationError('');
    getMyRegistrations(controller.signal).then((items) => setRegistration(items.find((item) => item.eventId === eventId) ?? null)).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setRegistrationError(requestError instanceof ApiError ? requestError.message : 'Could not check your registration status.');
    }).finally(() => { if (!controller.signal.aborted) setRegistrationLoading(false); });
    return () => controller.abort();
  }, [eventId, status, user]);

  const submitRegistration = async () => {
    setRegistering(true); setRegistrationError(''); setNotice('');
    try {
      const created = await registerForEvent(eventId);
      setRegistration(created);
      setNotice('You are registered for this event.');
    } catch (requestError) {
      setRegistrationError(requestError instanceof ApiError
        ? requestError.status === 409 && (requestError.message.includes('already registered') || requestError.message.includes('registration record')) ? `${requestError.message} If you previously cancelled, contact an event administrator to restore your place.` : requestError.message
        : 'Could not register for this event. Try again.');
      if (requestError instanceof ApiError && requestError.status === 409) {
        try { const items = await getMyRegistrations(); setRegistration(items.find((item) => item.eventId === eventId) ?? null); } catch { /* Keep the original conflict message visible. */ }
      }
    } finally { setRegistering(false); }
  };

  return <div className="page-content"><Link to="/events" className="back-link"><ArrowLeft size={16} /> Back to events</Link>
    {loading ? <div className="surface-card results-card"><Loading label="Loading event details…" /></div> : error ? <div className="surface-card results-card"><EmptyState icon={CalendarDays} title="Could not load this event" description={error} /><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Try again</button></div> : !event ? <div className="surface-card results-card"><EmptyState icon={CalendarDays} title="Event not found" description="This event may have been removed or the link may be incorrect." actionLabel="Browse events" actionTo="/events" /></div> : <article className="surface-card event-detail-card"><div className="event-detail-banner"><span className="event-detail-category">{event.category}</span><CalendarDays size={44} strokeWidth={1.4} /></div><div className="event-detail-content"><span className={`event-status status-${event.status.toLowerCase()}`}>{event.status}</span><h1>{event.title}</h1><p className="event-detail-description">{event.description || 'No description provided.'}</p><div className="event-detail-facts"><div><span className="detail-fact-icon"><CalendarDays size={17} /></span><span><small>DATE</small><strong>{formatDate(event.startDateTime)}</strong></span></div><div><span className="detail-fact-icon"><Clock3 size={17} /></span><span><small>TIME</small><strong>{formatTime(event.startDateTime)} – {formatTime(event.endDateTime)}</strong></span></div><div><span className="detail-fact-icon"><MapPin size={17} /></span><span><small>VENUE</small><strong>{event.venue}</strong></span></div></div>
      <section className="registration-action" aria-label="Event registration">
        {notice && <div className="auth-alert auth-alert-success" role="status">{notice}</div>}
        {registrationError && <div className="auth-alert auth-alert-error" role="alert">{registrationError}</div>}
        {status === 'authenticated' && registrationLoading ? <Loading label="Checking registration…" />
          : status !== 'authenticated' ? <p className="event-detail-footnote"> <Link to="/login">Sign in</Link> to register for this event.</p>
            : registration?.status === 'ACTIVE' ? <div className="registered-status" role="status">Already registered <span>Registration confirmed</span></div>
              : registration?.status === 'CANCELLED' ? <div className="registered-status registration-cancelled" role="status">Registration cancelled <span>This registration cannot be reactivated from the current registration API.</span></div>
                : registrationClosedMessage(event) ? <div className="registered-status registration-cancelled">Registration unavailable <span>{registrationClosedMessage(event)}</span></div>
                  : <button className="button button-primary" onClick={submitRegistration} disabled={registering}>{registering ? 'Registering…' : 'Register for event'}</button>}
      </section>
    </div></article>}
  </div>;
}
