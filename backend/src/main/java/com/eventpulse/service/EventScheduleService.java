package com.eventpulse.service;
import com.eventpulse.model.Event;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import software.amazon.awssdk.services.scheduler.SchedulerClient;
import software.amazon.awssdk.services.scheduler.model.*;

public class EventScheduleService {
 private static final DateTimeFormatter EXPRESSION_TIME=DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss").withZone(ZoneOffset.UTC);
 private final SchedulerClient scheduler; private final String group,functionArn,roleArn; private final Clock clock; private final ObjectMapper json=new ObjectMapper();
 public EventScheduleService(SchedulerClient scheduler,String group,String functionArn,String roleArn){this(scheduler,group,functionArn,roleArn,Clock.systemUTC());}
 public EventScheduleService(SchedulerClient scheduler,String group,String functionArn,String roleArn,Clock clock){this.scheduler=scheduler;this.group=group;this.functionArn=functionArn;this.roleArn=roleArn;this.clock=clock;}
 public void reschedule(Event event){schedule(event,"24h",Duration.ofHours(24));schedule(event,"1h",Duration.ofHours(1));}
 public void cancel(String eventId){delete(name(eventId,"24h"));delete(name(eventId,"1h"));}
 private void schedule(Event event,String reminder,Duration offset){Instant start=Instant.parse(event.getStartDateTime());Instant exactFireAt=start.minus(offset);String name=name(event.getEventId(),reminder);Instant now=clock.instant();if(!exactFireAt.isAfter(now)){delete(name);return;}Instant fireAt=ceilToWholeSecond(exactFireAt);if(!fireAt.isAfter(now)){delete(name);return;}String expression="at("+EXPRESSION_TIME.format(fireAt)+")";String input;try{input=json.writeValueAsString(Map.of("eventId",event.getEventId(),"reminderType",reminder));}catch(Exception e){throw new IllegalStateException("Could not encode scheduler input",e);}Target target=Target.builder().arn(functionArn).roleArn(roleArn).input(input).build();FlexibleTimeWindow window=FlexibleTimeWindow.builder().mode(FlexibleTimeWindowMode.OFF).build();
  RetryPolicy retry=RetryPolicy.builder().maximumEventAgeInSeconds(3600).maximumRetryAttempts(3).build();target=target.toBuilder().retryPolicy(retry).build();
  try{scheduler.getSchedule(GetScheduleRequest.builder().name(name).groupName(group).build());update(name,expression,window,target);}catch(ResourceNotFoundException missing){try{scheduler.createSchedule(CreateScheduleRequest.builder().name(name).groupName(group).scheduleExpression(expression).scheduleExpressionTimezone("UTC").flexibleTimeWindow(window).target(target).actionAfterCompletion(ActionAfterCompletion.DELETE).build());}catch(ConflictException concurrentCreate){update(name,expression,window,target);}}
 }
 private static Instant ceilToWholeSecond(Instant instant){if(instant.getNano()==0)return instant;return instant.truncatedTo(java.time.temporal.ChronoUnit.SECONDS).plusSeconds(1);}
 private void update(String name,String expression,FlexibleTimeWindow window,Target target){scheduler.updateSchedule(UpdateScheduleRequest.builder().name(name).groupName(group).scheduleExpression(expression).scheduleExpressionTimezone("UTC").flexibleTimeWindow(window).target(target).actionAfterCompletion(ActionAfterCompletion.DELETE).build());}
 private void delete(String name){try{scheduler.deleteSchedule(DeleteScheduleRequest.builder().name(name).groupName(group).build());}catch(ResourceNotFoundException ignored){}}
 private String name(String eventId,String reminder){return ("ep-"+eventId+"-"+reminder).replaceAll("[^A-Za-z0-9_.-]","-");}
}
