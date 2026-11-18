package com.eventpulse.repository;
import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*;
class EventRepositoryTest {@Test void repositoryRequiresConfiguredTableName(){assertThrows(NullPointerException.class,()->new EventRepository(null,"table"));}}
