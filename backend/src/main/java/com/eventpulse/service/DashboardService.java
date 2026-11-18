package com.eventpulse.service;

import com.eventpulse.model.Event;
import com.eventpulse.repository.EventRepository;
import com.eventpulse.repository.RegistrationRepository;
import java.time.Clock;
import java.util.Map;
import java.util.stream.Collectors;

public class DashboardService {
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final Clock clock;

    public DashboardService(EventRepository events, RegistrationRepository registrations) {
        this(events, registrations, Clock.systemUTC());
    }

    public DashboardService(EventRepository events, RegistrationRepository registrations, Clock clock) {
        this.events = events;
        this.registrations = registrations;
        this.clock = clock;
    }

    public Map<String, Object> summary() {
        var all = events.findAll();
        var statuses = all.stream().collect(Collectors.toMap(Event::getEventId,
                event -> EventService.statusAt(event, clock.instant())));
        long upcoming = statuses.values().stream().filter("UPCOMING"::equals).count();
        long completed = statuses.values().stream().filter("COMPLETED"::equals).count();
        long cancelled = statuses.values().stream().filter("CANCELLED"::equals).count();
        var registrationCounts = all.stream().collect(Collectors.toMap(Event::getEventId,
                event -> registrations.forEvent(event.getEventId()).stream()
                        .filter(registration -> "ACTIVE".equals(registration.getStatus())).count()));
        return Map.of("totalEvents", all.size(), "upcomingEvents", upcoming,
                "completedEvents", completed, "cancelledEvents", cancelled,
                "registrationCounts", registrationCounts);
    }
}
