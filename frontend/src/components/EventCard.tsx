import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../types/Event';

interface EventCardProps {
  event: Event;
  actions?: ReactNode;
}

export function EventCard({ event, actions }: EventCardProps) {
  const start = new Date(event.startDateTime);
  return (
    <article className="event-card">
      <div className="event-card-art"><span className="event-card-orb" /><span className="event-category">{event.category}</span><div className="event-date-tile"><strong>{new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(start)}</strong><span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start)}</span></div></div>
      <div className="event-card-content"><p className="eyebrow"><CalendarDays size={14} />{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(start)}</p><div className="event-card-title-row"><h3>{event.title}</h3><span className={`event-status status-${event.status.toLowerCase()}`}>{event.status}</span></div><p className="event-description">{event.description || 'No description provided.'}</p><div className="event-card-footer"><span className="location"><MapPin size={15} />{event.venue}</span><Link to={`/events/${event.eventId}`} className="circle-link" aria-label={`View ${event.title}`}><ArrowUpRight size={17} /></Link></div>{actions && <div className="event-card-actions">{actions}</div>}</div>
    </article>
  );
}
