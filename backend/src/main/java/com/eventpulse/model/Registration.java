package com.eventpulse.model;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
@DynamoDbBean public class Registration {
 private String registrationId,eventId,userId,status,registeredAt,cancelledAt;
 @DynamoDbPartitionKey public String getRegistrationId(){return registrationId;} public void setRegistrationId(String v){registrationId=v;}
 @DynamoDbSecondaryPartitionKey(indexNames={"eventId-index"}) public String getEventId(){return eventId;} public void setEventId(String v){eventId=v;}
 @DynamoDbSecondaryPartitionKey(indexNames={"userId-index"}) public String getUserId(){return userId;} public void setUserId(String v){userId=v;}
 public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getRegisteredAt(){return registeredAt;} public void setRegisteredAt(String v){registeredAt=v;} public String getCancelledAt(){return cancelledAt;} public void setCancelledAt(String v){cancelledAt=v;}
}
