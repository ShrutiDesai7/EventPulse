package com.eventpulse.repository;
import com.eventpulse.model.UserProfile; import java.util.Optional; import software.amazon.awssdk.enhanced.dynamodb.*;
public class UserRepository { private final DynamoDbTable<UserProfile> table; public UserRepository(DynamoDbEnhancedClient db,String n){table=db.table(n,TableSchema.fromBean(UserProfile.class));} public UserProfile save(UserProfile u){table.putItem(u);return u;} public Optional<UserProfile> findById(String id){return Optional.ofNullable(table.getItem(Key.builder().partitionValue(id).build()));} }
