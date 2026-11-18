package com.eventpulse.config;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
public final class SesConfig {
 private static final SesV2Client CLIENT=SesV2Client.builder().region(Region.of(System.getenv().getOrDefault("AWS_REGION","ap-southeast-2"))).build();
 private SesConfig(){}
 public static SesV2Client client(){return CLIENT;}
 public static String sender(){String value=System.getenv("SES_SENDER_EMAIL");if(value==null||value.isBlank())throw new IllegalStateException("SES_SENDER_EMAIL must be configured");return value;}
}
