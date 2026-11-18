package com.eventpulse.model;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
@DynamoDbBean public class NotificationRecord {
 private String notificationId,userId,eventId,type,status,createdAt,failureReason,messageId; private Integer attemptCount;
 @DynamoDbPartitionKey public String getNotificationId(){return notificationId;} public void setNotificationId(String v){notificationId=v;}
 @DynamoDbSecondaryPartitionKey(indexNames={"userId-createdAt-index"}) public String getUserId(){return userId;} public void setUserId(String v){userId=v;}
 @DynamoDbSecondarySortKey(indexNames={"userId-createdAt-index"}) public String getCreatedAt(){return createdAt;} public void setCreatedAt(String v){createdAt=v;}
 public String getEventId(){return eventId;} public void setEventId(String v){eventId=v;} public String getType(){return type;} public void setType(String v){type=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getFailureReason(){return failureReason;} public void setFailureReason(String v){failureReason=v;} public String getMessageId(){return messageId;} public void setMessageId(String v){messageId=v;}
 public Integer getAttemptCount(){return attemptCount;} public void setAttemptCount(Integer v){attemptCount=v;}
}
