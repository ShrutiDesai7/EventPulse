import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, RotateCw, Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { Loading } from '../components/Loading';
import { PageHeading } from '../components/PageHeading';
import { ApiError } from '../services/api';
import { listEvents } from '../services/eventService';
import type { Event } from '../types/Event';

function localDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    listEvents(controller.signal).then(setEvents).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(requestError instanceof ApiError ? requestError.message : 'Could not load events. Try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [events]);
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return events.filter((event) => {
      const matchesSearch = !query || [event.title, event.description || '', event.category, event.venue].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesSearch && (!category || event.category === category) && (!status || event.status === status) && (!date || localDate(event.startDateTime) === date);
    }).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  }, [events, search, category, status, date]);

  const clearFilters = () => { setSearch(''); setCategory(''); setStatus(''); setDate(''); };
  const hasFilters = Boolean(search || category || status || date);

  return <div className="page-content"><PageHeading eyebrow="DISCOVER" title="Explore events" description="Find your people, try something new, and make it a date." />
    <div className="filter-row event-filter-row"><label className="event-search"><Search size={17} /><input type="search" placeholder="Search title, venue, or category" aria-label="Search events" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="filter-control"><SlidersHorizontal size={14} /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="filter-control"><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{Array.from(new Set(events.map((event) => event.status))).sort().map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="filter-control filter-date"><CalendarDays size={14} /><input type="date" aria-label="Filter by date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
    {loading ? <div className="surface-card results-card"><Loading label="Loading events…" /></div> : error ? <div className="surface-card event-error-state"><div className="auth-alert auth-alert-error" role="alert">{error}</div><button className="button button-secondary" onClick={() => setRetry((value) => value + 1)}><RotateCw size={15} /> Try again</button></div> : events.length === 0 ? <div className="surface-card results-card"><EmptyState icon={CalendarDays} title="No events have been published yet" description="When an organizer publishes an event, it will appear here." /></div> : filteredEvents.length === 0 ? <div className="surface-card results-card"><EmptyState icon={Search} title="No events match these filters" description="Try another search, date, status, or category." /><button className="clear-filters-button" onClick={clearFilters}>Clear all filters</button></div> : <><p className="result-count">{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}{hasFilters ? ' match your filters' : ''}</p><div className="event-grid">{filteredEvents.map((event) => <EventCard key={event.eventId} event={event} />)}</div></>}
  </div>;
}
