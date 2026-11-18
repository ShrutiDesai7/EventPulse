package com.eventpulse.service;

import com.eventpulse.exception.RegistrationException;
import com.eventpulse.model.Event;
import com.eventpulse.model.Registration;
import com.eventpulse.repository.EventRepository;
import com.eventpulse.repository.RegistrationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RegistrationServiceTest {
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test void allowsRegistrationForFutureUpcomingEvent() {
        var registrations = mock(RegistrationRepository.class);
        var event = event("2026-01-01T00:00:00.001Z", "2026-01-01T01:00:00Z", "UPCOMING");
        var service = service(registrations, event);
        when(registrations.create(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals("ACTIVE", service.register("event", "user").getStatus());
        verify(registrations).create(any());
    }

    @Test void rejectsRegistrationAtExactStartTime() {
        var registrations = mock(RegistrationRepository.class);
        var service = service(registrations, event("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", "UPCOMING"));
        var error = assertThrows(RegistrationException.class, () -> service.register("event", "user"));
        assertEquals("Registration is closed because this event has already started.", error.getMessage());
        verifyNoInteractions(registrations);
    }

    @Test void rejectsOngoingEvent() {
        var registrations = mock(RegistrationRepository.class);
        var service = service(registrations, event("2025-12-31T23:00:00Z", "2026-01-01T01:00:00Z", "UPCOMING"));
        var error = assertThrows(RegistrationException.class, () -> service.register("event", "user"));
        assertEquals("Registration is closed because this event has already started.", error.getMessage());
        verifyNoInteractions(registrations);
    }

    @Test void rejectsCompletedEvent() {
        var registrations = mock(RegistrationRepository.class);
        var service = service(registrations, event("2025-12-31T22:00:00Z", "2025-12-31T23:00:00Z", "UPCOMING"));
        var error = assertThrows(RegistrationException.class, () -> service.register("event", "user"));
        assertEquals("Registration is closed because this event has completed.", error.getMessage());
        verifyNoInteractions(registrations);
    }

    @Test void rejectsCancelledEvent() {
        var registrations = mock(RegistrationRepository.class);
        var service = service(registrations, event("2026-01-01T01:00:00Z", "2026-01-01T02:00:00Z", "CANCELLED"));
        var error = assertThrows(RegistrationException.class, () -> service.register("event", "user"));
        assertEquals("Cannot register for a cancelled event.", error.getMessage());
        verifyNoInteractions(registrations);
    }

    @Test void preventsDuplicateActiveRegistration() {
        var registrations = mock(RegistrationRepository.class);
        var service = service(registrations, event("2026-01-01T01:00:00Z", "2026-01-01T02:00:00Z", "UPCOMING"));
        var prior = new Registration(); prior.setStatus("ACTIVE");
        when(registrations.findUserEvent("user", "event")).thenReturn(Optional.of(prior));
        assertThrows(RegistrationException.class, () -> service.register("event", "user"));
        verify(registrations, never()).create(any());
    }

    @Test void cancelsRegistration() {
        var registrations = mock(RegistrationRepository.class);
        var eventRepository = mock(EventRepository.class);
        var registration = new Registration(); registration.setRegistrationId("r"); registration.setUserId("u"); registration.setStatus("ACTIVE");
        when(registrations.findById("r")).thenReturn(Optional.of(registration));
        when(registrations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = new RegistrationService(registrations, new EventService(eventRepository), clock).cancel("r", "u");
        assertEquals("CANCELLED", result.getStatus());
    }

    private RegistrationService service(RegistrationRepository registrations, Event event) {
        var events = mock(EventRepository.class);
        when(events.findById("event")).thenReturn(Optional.of(event));
        return new RegistrationService(registrations, new EventService(events, clock), clock);
    }

    private static Event event(String start, String end, String storedStatus) {
        var event = new Event();
        event.setEventId("event"); event.setStartDateTime(start); event.setEndDateTime(end); event.setStatus(storedStatus);
        return event;
    }
}
