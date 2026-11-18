package com.eventpulse.service;

import com.eventpulse.model.Event;
import com.eventpulse.model.NotificationRecord;
import com.eventpulse.model.Registration;
import com.eventpulse.model.UserProfile;
import com.eventpulse.repository.NotificationRepository;
import com.eventpulse.repository.RegistrationRepository;
import com.eventpulse.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

public class NotificationService {
 public static final String EVENT_ANNOUNCEMENT="EVENT_ANNOUNCEMENT",EVENT_RESCHEDULED="EVENT_RESCHEDULED",EVENT_CANCELLED="EVENT_CANCELLED",EVENT_REMINDER="EVENT_REMINDER";
 private final SesV2Client ses; private final String sender,configurationSet; private final NotificationRepository notifications; private final RegistrationRepository registrations; private final UserRepository users; private final Clock clock;
 public NotificationService(SesV2Client ses,String sender,String configurationSet,NotificationRepository notifications,RegistrationRepository registrations,UserRepository users){this(ses,sender,configurationSet,notifications,registrations,users,Clock.systemUTC());}
 public NotificationService(SesV2Client ses,String sender,String configurationSet,NotificationRepository notifications,RegistrationRepository registrations,UserRepository users,Clock clock){this.ses=ses;this.sender=sender;this.configurationSet=configurationSet;this.notifications=notifications;this.registrations=registrations;this.users=users;this.clock=clock;}
 public List<NotificationRecord> history(String userId,int limit){return notifications.forUser(userId,limit);}
 public List<NotificationRecord> announce(Event event,String type){return announce(event,type,"revision:"+(event.getUpdatedAt()==null?event.getCreatedAt():event.getUpdatedAt()));}
 public List<NotificationRecord> announce(Event event,String type,String idempotencyScope){String subject=switch(type){case EVENT_ANNOUNCEMENT->"New event: "+event.getTitle();case EVENT_RESCHEDULED->"Event rescheduled: "+event.getTitle();case EVENT_CANCELLED->"Event cancelled: "+event.getTitle();case EVENT_REMINDER->"Reminder: "+event.getTitle();default->throw new IllegalArgumentException("Unsupported notification type");};String body=switch(type){case EVENT_ANNOUNCEMENT->"A new event has been announced. "+details(event);case EVENT_RESCHEDULED->"The event details have changed. "+details(event);case EVENT_CANCELLED->"This event has been cancelled: "+event.getTitle();case EVENT_REMINDER->"Your event is coming up. "+details(event);default->throw new IllegalArgumentException("Unsupported notification type");};return registrations.forEvent(event.getEventId()).stream().filter(r->"ACTIVE".equals(r.getStatus())).map(r->sendToUser(r.getUserId(),event.getEventId(),type,subject,body,idempotencyScope)).toList();}
 public NotificationRecord sendToUser(String userId,String eventId,String type,String subject,String body){return sendToUser(userId,eventId,type,subject,body,"default");}
 public NotificationRecord sendToUser(String userId,String eventId,String type,String subject,String body,String scope){
  String id=UUID.nameUUIDFromBytes((userId+"\n"+eventId+"\n"+type+"\n"+scope).getBytes(StandardCharsets.UTF_8)).toString();
  NotificationRecord prior=notifications.findById(id).orElse(null);
  if(prior!=null&&!("FAILED".equals(prior.getStatus())))return prior;
  NotificationRecord attempt=new NotificationRecord();attempt.setNotificationId(id);attempt.setUserId(userId);attempt.setEventId(eventId);attempt.setType(type);attempt.setCreatedAt(DateTimeFormatter.ISO_INSTANT.format(Instant.now(clock)));attempt.setStatus("PENDING");attempt.setAttemptCount(prior==null?1:(prior.getAttemptCount()==null?2:prior.getAttemptCount()+1));
  if(!notifications.claim(attempt))return notifications.findById(id).orElse(attempt);
  String email=users.findById(userId).map(UserProfile::getEmail).orElse(null);
  if(email==null||email.isBlank()){attempt.setStatus("FAILED");attempt.setFailureReason("USER_EMAIL_UNAVAILABLE");return notifications.save(attempt);}
  try{SendEmailRequest.Builder request=SendEmailRequest.builder().fromEmailAddress(sender).destination(Destination.builder().toAddresses(email).build()).content(EmailContent.builder().simple(Message.builder().subject(Content.builder().data(subject).charset("UTF-8").build()).body(Body.builder().text(Content.builder().data(body).charset("UTF-8").build()).build()).build()).build()).emailTags(MessageTag.builder().name("EventType").value(type).build());if(configurationSet!=null&&!configurationSet.isBlank())request.configurationSetName(configurationSet);SendEmailResponse response=ses.sendEmail(request.build());attempt.setStatus("ACCEPTED_BY_SES");attempt.setMessageId(response.messageId());}
  catch(AwsServiceException ex){if(ex.statusCode()<500){attempt.setStatus("FAILED");attempt.setFailureReason("SES_REJECTED_"+ex.statusCode());}else{attempt.setStatus("UNKNOWN");attempt.setFailureReason("SES_SERVER_ERROR_"+ex.statusCode());}}
  catch(SdkClientException ex){attempt.setStatus("UNKNOWN");attempt.setFailureReason("SES_RESULT_UNKNOWN");}
  catch(RuntimeException ex){attempt.setStatus("UNKNOWN");attempt.setFailureReason("SES_RESULT_UNKNOWN");}
  return notifications.save(attempt);
 }
 private String details(Event e){return e.getTitle()+" — "+e.getStartDateTime()+" at "+e.getVenue()+".";}
}
