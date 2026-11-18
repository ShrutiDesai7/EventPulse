package com.eventpulse.config;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.scheduler.SchedulerClient;
public final class SchedulerConfig {private static final SchedulerClient CLIENT=SchedulerClient.builder().region(Region.of(System.getenv().getOrDefault("AWS_REGION","ap-southeast-2"))).build();private SchedulerConfig(){}public static SchedulerClient client(){return CLIENT;}public static String group(){return System.getenv().getOrDefault("SCHEDULE_GROUP_NAME","eventpulse-reminders");}}
