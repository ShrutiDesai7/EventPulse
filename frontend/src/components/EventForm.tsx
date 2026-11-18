import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CalendarDays, MapPin, X } from 'lucide-react';
import type { Event } from '../types/Event';
import type { EventRequest } from '../services/eventService';

interface EventFormProps {
  initialEvent?: Event;
  busy?: boolean;
  serverError?: string;
  onSubmit: (event: EventRequest) => Promise<void>;
  onCancel: () => void;
}

interface EventFormErrors {
  title?: string;
  category?: string;
  venue?: string;
  startDateTime?: string;
  endDateTime?: string;
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventForm({ initialEvent, busy = false, serverError, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [category, setCategory] = useState(initialEvent?.category || '');
  const [venue, setVenue] = useState(initialEvent?.venue || '');
  const [startDateTime, setStartDateTime] = useState(toDateTimeLocal(initialEvent?.startDateTime));
  const [endDateTime, setEndDateTime] = useState(toDateTimeLocal(initialEvent?.endDateTime));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled])')?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]') ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const nextErrors: EventFormErrors = {};
    if (!title.trim()) nextErrors.title = 'Enter an event title.';
    if (!category.trim()) nextErrors.category = 'Enter a category.';
    if (!venue.trim()) nextErrors.venue = 'Enter a venue.';
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (!startDateTime || Number.isNaN(start.getTime())) nextErrors.startDateTime = 'Enter a valid start date and time.';
    if (!endDateTime || Number.isNaN(end.getTime())) nextErrors.endDateTime = 'Enter a valid end date and time.';
    else if (!Number.isNaN(start.getTime()) && end <= start) nextErrors.endDateTime = 'The end must be after the start.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim(),
      venue: venue.trim(),
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    });
  };

  const field = (key: keyof EventFormErrors) => errors[key] ? `field-control field-control-error` : 'field-control';

  return <div className="event-form-overlay"><section ref={dialogRef} onKeyDown={handleDialogKeyDown} className="event-form-dialog" role="dialog" aria-modal="true" aria-labelledby="event-form-title"><div className="event-form-heading"><div><span className="section-label">EVENT MANAGEMENT</span><h2 id="event-form-title">{initialEvent ? 'Edit event' : 'Create event'}</h2><p>Event times are submitted as ISO-8601 instants to the EventPulse API.</p></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Close event form"><X size={19} /></button></div>
    {serverError && <div className="auth-alert auth-alert-error" role="alert">{serverError}</div>}
    <form className="event-form" onSubmit={submit} noValidate>
      <label className="event-form-field event-form-wide"><span>Event title <b>*</b></span><input id="event-title" className={field('title')} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Community design night" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'event-title-error' : undefined} />{errors.title && <small className="field-error" id="event-title-error">{errors.title}</small>}</label>
      <label className="event-form-field"><span>Category <b>*</b></span><input id="event-category" className={field('category')} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Workshop" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'event-category-error' : undefined} />{errors.category && <small className="field-error" id="event-category-error">{errors.category}</small>}</label>
      <label className="event-form-field"><span>Venue <b>*</b></span><div className="event-input-icon"><MapPin size={15} /><input id="event-venue" className={field('venue')} value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Address or online" aria-invalid={Boolean(errors.venue)} aria-describedby={errors.venue ? 'event-venue-error' : undefined} /></div>{errors.venue && <small className="field-error" id="event-venue-error">{errors.venue}</small>}</label>
      <label className="event-form-field"><span>Starts <b>*</b></span><div className="event-input-icon"><CalendarDays size={15} /><input id="event-start" className={field('startDateTime')} type="datetime-local" value={startDateTime} onChange={(event) => setStartDateTime(event.target.value)} aria-invalid={Boolean(errors.startDateTime)} aria-describedby={errors.startDateTime ? 'event-start-error' : undefined} /></div>{errors.startDateTime && <small className="field-error" id="event-start-error">{errors.startDateTime}</small>}</label>
      <label className="event-form-field"><span>Ends <b>*</b></span><div className="event-input-icon"><CalendarDays size={15} /><input id="event-end" className={field('endDateTime')} type="datetime-local" value={endDateTime} onChange={(event) => setEndDateTime(event.target.value)} aria-invalid={Boolean(errors.endDateTime)} aria-describedby={errors.endDateTime ? 'event-end-error' : undefined} /></div>{errors.endDateTime && <small className="field-error" id="event-end-error">{errors.endDateTime}</small>}</label>
      <label className="event-form-field event-form-wide"><span>Description</span><textarea className="field-control" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should participants know?" rows={3} /></label>
      <div className="event-form-actions"><button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Saving…</> : initialEvent ? 'Save changes' : 'Create event'}</button></div>
    </form></section></div>;
}
