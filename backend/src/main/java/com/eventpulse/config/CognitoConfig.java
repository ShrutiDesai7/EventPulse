package com.eventpulse.config;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

public final class CognitoConfig {
    private static final CognitoIdentityProviderClient CLIENT = CognitoIdentityProviderClient.builder()
            .region(Region.of(System.getenv().getOrDefault("AWS_REGION", "ap-southeast-2")))
            .build();

    private CognitoConfig() {}

    public static CognitoIdentityProviderClient client() {
        return CLIENT;
    }
}
