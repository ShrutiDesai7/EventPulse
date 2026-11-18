package com.eventpulse.service;

import com.eventpulse.model.Event;
import com.eventpulse.model.Registration;
import com.eventpulse.repository.EventRepository;
import com.eventpulse.repository.RegistrationRepository;
import java.util.List;
import java.util.Map;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DashboardServiceTest {
    @Test
    void summaryReturnsBackendEventAndActiveRegistrationCounts() {
        EventRepository events = mock(EventRepository.class);
        RegistrationRepository registrations = mock(RegistrationRepository.class);
        Event upcoming = event("event-1", "COMPLETED", "2026-01-01T01:00:00Z");
        Event completed = event("event-2", "UPCOMING", "2025-12-31T23:59:59Z");
        Event cancelled = event("event-3", "CANCELLED", "2025-12-31T23:00:00Z");
        when(events.findAll()).thenReturn(List.of(upcoming, completed, cancelled));
        when(registrations.forEvent("event-1")).thenReturn(List.of(registration("ACTIVE"), registration("CANCELLED")));
        when(registrations.forEvent("event-2")).thenReturn(List.of(registration("ACTIVE")));
        when(registrations.forEvent("event-3")).thenReturn(List.of());

        Map<String, Object> summary = dashboard(events, registrations).summary();

        assertEquals(3, summary.get("totalEvents"));
        assertEquals(1L, summary.get("upcomingEvents"));
        assertEquals(1L, summary.get("completedEvents"));
        assertEquals(1L, summary.get("cancelledEvents"));
        assertEquals(Map.of("event-1", 1L, "event-2", 1L, "event-3", 0L), summary.get("registrationCounts"));
        verify(registrations).forEvent("event-1");
        verify(registrations).forEvent("event-2");
        verify(registrations).forEvent("event-3");
    }

    @Test
    void summaryReturnsZeroCountsForAnEmptyDatabase() {
        EventRepository events = mock(EventRepository.class);
        RegistrationRepository registrations = mock(RegistrationRepository.class);
        when(events.findAll()).thenReturn(List.of());

        assertEquals(Map.of("totalEvents", 0, "upcomingEvents", 0L, "completedEvents", 0L,
                "cancelledEvents", 0L, "registrationCounts", Map.of()),
                dashboard(events, registrations).summary());
        verifyNoInteractions(registrations);
    }

    @Test
    void summaryCompletesEventAtExactEndTime() {
        EventRepository events = mock(EventRepository.class);
        RegistrationRepository registrations = mock(RegistrationRepository.class);
        when(events.findAll()).thenReturn(List.of(event("event-boundary", "UPCOMING", "2026-01-01T00:00:00Z")));
        assertEquals(1L, dashboard(events, registrations).summary().get("completedEvents"));
    }

    private static DashboardService dashboard(EventRepository events, RegistrationRepository registrations) {
        return new DashboardService(events, registrations,
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
    }

    private static Event event(String id, String status, String endDateTime) {
        Event event = new Event();
        event.setEventId(id);
        event.setStatus(status);
        event.setStartDateTime(Instant.parse(endDateTime).minusSeconds(1800).toString());
        event.setEndDateTime(endDateTime);
        return event;
    }

    private static Registration registration(String status) {
        Registration registration = new Registration();
        registration.setStatus(status);
        return registration;
    }
}
