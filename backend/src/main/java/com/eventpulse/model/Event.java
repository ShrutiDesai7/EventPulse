package com.eventpulse.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@DynamoDbBean
public class Event {
    private String eventId, title, description, category, venue, startDateTime, endDateTime, createdBy, status, createdAt, updatedAt;
    @DynamoDbPartitionKey @DynamoDbAttribute("eventId") public String getEventId(){return eventId;} public void setEventId(String v){eventId=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getCategory(){return category;} public void setCategory(String v){category=v;} public String getVenue(){return venue;} public void setVenue(String v){venue=v;}
    public String getStartDateTime(){return startDateTime;} public void setStartDateTime(String v){startDateTime=v;} public String getEndDateTime(){return endDateTime;} public void setEndDateTime(String v){endDateTime=v;}
    public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getCreatedAt(){return createdAt;} public void setCreatedAt(String v){createdAt=v;} public String getUpdatedAt(){return updatedAt;} public void setUpdatedAt(String v){updatedAt=v;}
}
