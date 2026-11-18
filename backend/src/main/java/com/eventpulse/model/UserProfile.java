package com.eventpulse.model;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
@DynamoDbBean public class UserProfile {
 private String userId,name,email,role,createdAt;
 @DynamoDbPartitionKey public String getUserId(){return userId;} public void setUserId(String v){userId=v;}
 public String getName(){return name;} public void setName(String v){name=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;}
 public String getRole(){return role;} public void setRole(String v){role=v;} public String getCreatedAt(){return createdAt;} public void setCreatedAt(String v){createdAt=v;}
}
