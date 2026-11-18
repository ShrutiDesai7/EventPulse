import { useEffect, useState } from 'react';
import { CalendarPlus, RotateCw } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { EventForm } from '../components/EventForm';
import { Loading } from '../components/Loading';
import { PageHeading } from '../components/PageHeading';
import { ApiError } from '../services/api';
import { cancelEvent, createEvent, listEvents, updateEvent, type EventMutationResult, type EventRequest } from '../services/eventService';
import { getEventRegistrations } from '../services/registrationService';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '../services/dashboardService';
import type { Registration } from '../types/Registration';
import type { Event } from '../types/Event';

type DialogState = { mode: 'create' } | { mode: 'edit'; event: Event } | { mode: 'cancel'; event: Event } | null;

function EventRegistrationList({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    getEventRegistrations(eventId, controller.signal).then(setItems).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError ? requestError.message : 'Could not load event registrations.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eventId, open, retry]);
  return <div className="admin-registration-panel"><button className="button button-secondary button-small" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? 'Hide registrations' : 'View registrations'}</button>
    {open && <section className="admin-registration-list" aria-label="Event registrations">{loading ? <Loading label="Loading registrations…" /> : error ? <div><p className="auth-alert auth-alert-error" role="alert">{error}</p><button className="button button-secondary button-small" onClick={() => setRetry((value) => value + 1)}>Try again</button></div> : items.length === 0 ? <p className="registration-list-empty">No registrations for this event.</p> : <><p className="registration-count">{items.length} {items.length === 1 ? 'registration' : 'registrations'}</p><ul>{items.map((item) => <li key={item.registrationId}><span className={`event-status status-${item.status.toLowerCase()}`}>{item.status}</span><code>{item.userId}</code><small>Registered {new Date(item.registeredAt).toLocaleString()}</small></li>)}</ul></>}</section>}
  </div>;
}

function AdminStatistics() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getAdminDashboardSummary(controller.signal).then(setSummary).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError && requestError.status === 404
        ? 'Dashboard statistics are unavailable: GET /admin/dashboard is not currently exposed by the backend API.'
        : requestError instanceof ApiError ? requestError.message : 'Could not load admin dashboard statistics.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <section className="admin-statistics" aria-labelledby="admin-statistics-heading"><div className="section-heading"><span className="section-label">LIVE SUMMARY</span><h2 id="admin-statistics-heading">Platform statistics</h2></div>
    {loading ? <div className="surface-card results-card"><Loading label="Loading dashboard statistics…" /></div>
      : error ? <div className="surface-card event-error-state"><div className="auth-alert auth-alert-error" role="alert">{error}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Retry statistics</button></div>
        : summary && <><div className="overview-grid admin-summary-grid">{[['Total events', summary.totalEvents], ['Upcoming', summary.upcomingEvents], ['Completed', summary.completedEvents], ['Cancelled', summary.cancelledEvents]].map(([label, value]) => <article className="overview-card" key={label}><span className="overview-label">{label}</span><strong className="overview-value">{value}</strong><small>From the admin dashboard API</small></article>)}</div>
          <div className="surface-card registration-counts-card"><h3>Active registrations by event</h3>{Object.keys(summary.registrationCounts).length === 0 ? <p>No per-event registration counts were returned.</p> : <ul>{Object.entries(summary.registrationCounts).map(([eventId, count]) => <li key={eventId}><code>{eventId}</code><strong>{count}</strong></li>)}</ul>}</div></>}
  </section>;
}

export function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    listEvents(controller.signal).then((result) => setEvents(result.filter((event) => event.status !== 'CANCELLED'))).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof ApiError ? error.message : 'Could not load events. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const completeMutation = (result: EventMutationResult, action: 'created' | 'updated' | 'cancelled') => {
    const schedulePending = result.scheduleSyncStatus === 'PENDING';
    setNotice({
      kind: schedulePending ? 'warning' : 'success',
      message: schedulePending
        ? `Event ${action}, but reminder schedules need reconciliation.`
        : `Event ${action} successfully.`,
    });
    setDialog(null);
    setFormError(''); setActionError('');
    setRetry((value) => value + 1);
  };

  const saveEvent = async (request: EventRequest) => {
    setBusy(true); setFormError(''); setNotice(null);
    try {
      if (dialog?.mode === 'edit') {
        completeMutation(await updateEvent(dialog.event.eventId, request), 'updated');
      } else {
        completeMutation(await createEvent(request), 'created');
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not save this event. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancellation = async () => {
    if (dialog?.mode !== 'cancel') return;
    setBusy(true); setActionError(''); setNotice(null);
    try {
      completeMutation(await cancelEvent(dialog.event.eventId), 'cancelled');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not cancel this event. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (next: DialogState) => { setFormError(''); setActionError(''); setNotice(null); setDialog(next); };

  return <div className="page-content"><PageHeading eyebrow="ORGANIZER SPACE" title="Admin dashboard" description="Create, update, and cancel community events." action={<button className="button button-primary" onClick={() => openDialog({ mode: 'create' })}><CalendarPlus size={16} /> Create event</button>} />
    <AdminStatistics />
    {notice && <div className={`auth-alert ${notice.kind === 'warning' ? 'auth-alert-info' : 'auth-alert-success'}`} role="status">{notice.message}</div>}
    <div className="admin-note"><span className="overview-icon icon-blue"><CalendarPlus size={19} /></span><div><strong>Event management</strong><p>Event updates are sent to participants by the backend when event details change.</p></div></div>
    <div className="section-heading admin-events-heading"><span className="section-label">EVENT MANAGEMENT</span><h2>Your events</h2></div>
    {loading ? <div className="surface-card results-card"><Loading label="Loading events…" /></div> : loadError ? <div className="surface-card event-error-state"><div className="auth-alert auth-alert-error" role="alert">{loadError}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Try again</button></div> : events.length === 0 ? <div className="surface-card results-card"><EmptyState icon={CalendarPlus} title="No events to manage" description="Create an event to publish it to the EventPulse event list." /><div className="empty-action-row"><button className="button button-primary" onClick={() => openDialog({ mode: 'create' })}><CalendarPlus size={16} /> Create event</button></div></div> : <div className="event-grid">{events.map((event) => <EventCard key={event.eventId} event={event} actions={<><button className="button button-secondary button-small" onClick={() => openDialog({ mode: 'edit', event })}>Edit</button><button className="button button-danger button-small" onClick={() => openDialog({ mode: 'cancel', event })}>Cancel event</button><EventRegistrationList eventId={event.eventId} /></>} />)}</div>}
    {dialog?.mode === 'create' && <EventForm busy={busy} serverError={formError} onSubmit={saveEvent} onCancel={() => setDialog(null)} />}
    {dialog?.mode === 'edit' && <EventForm key={dialog.event.eventId} initialEvent={dialog.event} busy={busy} serverError={formError} onSubmit={saveEvent} onCancel={() => setDialog(null)} />}
    {dialog?.mode === 'cancel' && <div className="event-form-overlay"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-event-heading"><span className="overview-icon icon-amber"><CalendarPlus size={19} /></span><h2 id="cancel-event-heading">Cancel “{dialog.event.title}”?</h2><p>The backend will mark this event cancelled and remove it from the public event list.</p>{actionError && <div className="auth-alert auth-alert-error" role="alert">{actionError}</div>}<div className="event-form-actions"><button className="button button-secondary" onClick={() => setDialog(null)} disabled={busy}>Keep event</button><button className="button button-danger" onClick={confirmCancellation} disabled={busy}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button></div></section></div>}
  </div>;
}
