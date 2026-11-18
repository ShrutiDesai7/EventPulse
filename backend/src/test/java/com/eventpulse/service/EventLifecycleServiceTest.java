package com.eventpulse.service;
import com.eventpulse.model.Event;import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.assertThrows;import static org.mockito.Mockito.*;
class EventLifecycleServiceTest {
 @Test void persistedEventCanBeReconciledAfterScheduleApiFailure(){var schedule=mock(EventScheduleService.class);var lifecycle=new EventLifecycleService(mock(NotificationService.class),schedule);var event=new Event();event.setEventId("e1");event.setStatus("UPCOMING");event.setStartDateTime("2027-01-02T10:00:00Z");doThrow(new RuntimeException("scheduler unavailable")).when(schedule).reschedule(event);assertThrows(RuntimeException.class,()->lifecycle.created(event));doNothing().when(schedule).reschedule(event);lifecycle.reconcile(event);verify(schedule,times(2)).reschedule(event);}
 @Test void cancelledEventReconciliationDeletesSchedules(){var schedule=mock(EventScheduleService.class);var lifecycle=new EventLifecycleService(mock(NotificationService.class),schedule);var event=new Event();event.setEventId("e1");event.setStatus("CANCELLED");lifecycle.reconcile(event);verify(schedule).cancel("e1");verify(schedule,never()).reschedule(any());}
}
