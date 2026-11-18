package com.eventpulse.dto;
import com.eventpulse.model.Event;
public record EventResponse(String eventId,String title,String description,String category,String venue,String startDateTime,String endDateTime,String createdBy,String status,String createdAt,String updatedAt) {
 public static EventResponse from(Event e){return new EventResponse(e.getEventId(),e.getTitle(),e.getDescription(),e.getCategory(),e.getVenue(),e.getStartDateTime(),e.getEndDateTime(),e.getCreatedBy(),e.getStatus(),e.getCreatedAt(),e.getUpdatedAt());}
}
