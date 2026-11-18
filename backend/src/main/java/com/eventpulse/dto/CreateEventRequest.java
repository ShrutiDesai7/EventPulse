package com.eventpulse.dto;
public record CreateEventRequest(String title,String description,String category,String venue,String startDateTime,String endDateTime) {}
