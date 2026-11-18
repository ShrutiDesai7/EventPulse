package com.eventpulse.config;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
public final class DynamoDbConfig {
 private static final DynamoDbClient CLIENT=DynamoDbClient.builder().region(Region.of(System.getenv().getOrDefault("AWS_REGION","ap-southeast-2"))).build();
 private static final DynamoDbEnhancedClient ENHANCED=DynamoDbEnhancedClient.builder().dynamoDbClient(CLIENT).build();
 private DynamoDbConfig(){}
 public static DynamoDbClient client(){return CLIENT;} public static DynamoDbEnhancedClient enhancedClient(){return ENHANCED;}
 public static String table(String env,String fallback){return System.getenv().getOrDefault(env,fallback);}
}
