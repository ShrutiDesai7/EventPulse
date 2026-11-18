package com.eventpulse.repository;
import com.eventpulse.model.Event; import java.util.*; import software.amazon.awssdk.enhanced.dynamodb.*; import software.amazon.awssdk.enhanced.dynamodb.model.*;
public class EventRepository {
 private final DynamoDbTable<Event> table;
 public EventRepository(DynamoDbEnhancedClient db,String tableName){table=db.table(tableName,TableSchema.fromBean(Event.class));}
 public Event save(Event e){table.putItem(e);return e;} public Optional<Event> findById(String id){return Optional.ofNullable(table.getItem(Key.builder().partitionValue(id).build()));}
 public List<Event> findAll(){return table.scan().items().stream().toList();}
}
