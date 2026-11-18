package com.eventpulse.service;

/** Indicates the event write succeeded but its EventBridge Scheduler projection did not. */
public class ScheduleSyncException extends RuntimeException {
    private final String eventId;

    public ScheduleSyncException(String eventId, RuntimeException cause) {
        super("Schedule synchronization failed for event " + eventId, cause);
        this.eventId = eventId;
    }

    public String getEventId() { return eventId; }
}
