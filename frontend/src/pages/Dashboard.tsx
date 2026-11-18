import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BellRing, CalendarDays, RotateCw, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { listEvents } from '../services/eventService';
import { getMyRegistrations } from '../services/registrationService';
import type { Event } from '../types/Event';
import type { Registration } from '../types/Registration';

export function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [registrationsError, setRegistrationsError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setEventsLoading(true); setRegistrationsLoading(true); setEventsError(''); setRegistrationsError('');
    listEvents(controller.signal).then((items) => setEvents(items.filter((event) => event.status !== 'CANCELLED'))).catch((error: unknown) => {
      if (!controller.signal.aborted) setEventsError(error instanceof ApiError ? error.message : 'Could not load events. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setEventsLoading(false); });
    getMyRegistrations(controller.signal).then(setRegistrations).catch((error: unknown) => {
      if (!controller.signal.aborted) setRegistrationsError(error instanceof ApiError ? error.message : 'Could not load your registrations. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setRegistrationsLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const upcomingEvents = useMemo(() => events.filter((event) => event.status === 'UPCOMING' && new Date(event.startDateTime).getTime() >= Date.now()).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime)), [events]);
  const activeRegistrations = registrations.filter((registration) => registration.status === 'ACTIVE'
    && (eventsLoading || Boolean(eventsError) || events.some((event) => event.eventId === registration.eventId)));
  const registeredEventIds = new Set(activeRegistrations.map((registration) => registration.eventId));
  const registeredUpcoming = upcomingEvents.filter((event) => registeredEventIds.has(event.eventId));
  const busy = eventsLoading || registrationsLoading;

  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return <div className="page-content">
    <div className="welcome-banner"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> YOUR COMMUNITY, CONNECTED</span><h1>Good things happen<br />when we <em>come together.</em></h1><p>Discover what’s happening around you and keep every plan in sync.</p><Link to="/events" className="button button-white">Explore events <ArrowRight size={16} /></Link></div>
      <div className="welcome-illustration" aria-hidden="true"><span className="illustration-ring ring-one" /><span className="illustration-ring ring-two" /><div className="illustration-calendar"><CalendarDays size={36} /><span className="calendar-dots">•••<br />•••</span></div><span className="float-bubble bubble-one"><UsersRound size={18} /></span><span className="float-bubble bubble-two"><BellRing size={17} /></span><span className="float-bubble bubble-three"><ShieldCheck size={16} /></span></div><span className="banner-spark spark-a">✦</span><span className="banner-spark spark-b">✳</span>
    </div>
    <div className="section-heading section-heading-row"><div><span className="section-label">YOUR SPACE</span><h2>At a glance</h2></div><span className="data-badge"><span /> Live EventPulse data</span></div>
    <div className="overview-grid">
      <article className="overview-card"><span className="overview-icon icon-blue"><CalendarDays size={19} /></span><span className="overview-label">Available events</span><strong className="overview-value">{eventsLoading ? '…' : eventsError ? '—' : events.length}</strong><small>{eventsError ? 'Event data unavailable' : 'From the EventPulse API'}</small></article>
      <article className="overview-card"><span className="overview-icon icon-violet"><UsersRound size={19} /></span><span className="overview-label">Your active registrations</span><strong className="overview-value">{registrationsLoading ? '…' : registrationsError ? '—' : activeRegistrations.length}</strong><small>{registrationsError ? 'Registration data unavailable' : 'From your registration history'}</small></article>
      <article className="overview-card"><span className="overview-icon icon-amber"><BellRing size={19} /></span><span className="overview-label">Notification history</span><strong className="overview-value"><Link to="/notifications">View</Link></strong><small>Review email notification attempts</small></article>
    </div>
    {(eventsError || registrationsError) && <div className="event-error-state surface-card dashboard-data-error"><div className="auth-alert auth-alert-error" role="alert">{[eventsError, registrationsError].filter(Boolean).join(' ')}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Retry data</button></div>}
    <div className="section-heading section-heading-row upcoming-heading"><div><span className="section-label">MAKE A PLAN</span><h2>Coming up</h2></div><Link to="/events" className="text-link">Browse all events <ArrowRight size={15} /></Link></div>
    {eventsLoading ? <div className="surface-card results-card"><Loading label="Loading upcoming events…" /></div> : eventsError ? null : upcomingEvents.length === 0 ? <div className="surface-card"><EmptyState icon={CalendarDays} title="No upcoming events" description="When an organizer publishes an upcoming event, it will appear here." actionLabel="Explore events" actionTo="/events" /></div> : <div className="event-grid">{upcomingEvents.slice(0, 3).map((event) => <EventCard key={event.eventId} event={event} />)}</div>}
    <div className="section-heading section-heading-row upcoming-heading"><div><span className="section-label">YOUR PLANS</span><h2>Registered events</h2></div><Link to="/registrations" className="text-link">All registrations <ArrowRight size={15} /></Link></div>
    {registrationsLoading ? <div className="surface-card results-card"><Loading label="Loading your registrations…" /></div> : registrationsError ? null : activeRegistrations.length === 0 ? <div className="surface-card"><EmptyState icon={UsersRound} title="No active registrations" description="Register for an event to see it here." actionLabel="Explore events" actionTo="/events" /></div> : registeredUpcoming.length === 0 ? <div className="surface-card"><EmptyState icon={CalendarDays} title="No registered events coming up" description="Your active registration history is available on My registrations." actionLabel="View registrations" actionTo="/registrations" /></div> : <div className="event-grid">{registeredUpcoming.slice(0, 3).map((event) => <EventCard key={event.eventId} event={event} actions={<span className="registered-event-label">Registered</span>} />)}</div>}
    {busy && <span className="sr-only" role="status">Dashboard data is loading</span>}
  </div>;
}
