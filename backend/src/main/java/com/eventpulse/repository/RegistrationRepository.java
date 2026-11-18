package com.eventpulse.repository;
import com.eventpulse.model.Registration; import java.util.*; import software.amazon.awssdk.enhanced.dynamodb.*; import software.amazon.awssdk.enhanced.dynamodb.model.*;
public class RegistrationRepository {
 private final DynamoDbTable<Registration> table;
 public RegistrationRepository(DynamoDbEnhancedClient db,String tableName){table=db.table(tableName,TableSchema.fromBean(Registration.class));}
 public Registration save(Registration r){table.putItem(r);return r;} public Registration create(Registration r){table.putItem(PutItemEnhancedRequest.builder(Registration.class).item(r).conditionExpression(Expression.builder().expression("attribute_not_exists(registrationId)").build()).build());return r;} public Optional<Registration> findById(String id){return Optional.ofNullable(table.getItem(Key.builder().partitionValue(id).build()));}
 public List<Registration> forUser(String id){return table.index("userId-index").query(QueryEnhancedRequest.builder().queryConditional(QueryConditional.keyEqualTo(Key.builder().partitionValue(id).build())).build()).stream().flatMap(p->p.items().stream()).toList();}
 public List<Registration> forEvent(String id){return table.index("eventId-index").query(QueryEnhancedRequest.builder().queryConditional(QueryConditional.keyEqualTo(Key.builder().partitionValue(id).build())).build()).stream().flatMap(p->p.items().stream()).toList();}
 public Optional<Registration> findUserEvent(String userId,String eventId){return forUser(userId).stream().filter(r->eventId.equals(r.getEventId())).findFirst();}
}
