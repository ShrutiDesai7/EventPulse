package com.eventpulse.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;

/** Retrieves the signed-in user's attributes using Cognito's user-scoped access-token API. */
public class CognitoProfileService {
    private final CognitoIdentityProviderClient cognito;

    public CognitoProfileService(CognitoIdentityProviderClient cognito) {
        this.cognito = cognito;
    }

    public ProfileAttributes getCurrentUser(String accessToken, String expectedSub) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("Authenticated Cognito access token is required");
        }
        if (expectedSub == null || expectedSub.isBlank()) {
            throw new IllegalArgumentException("Authenticated Cognito subject is required");
        }

        var response = cognito.getUser(GetUserRequest.builder().accessToken(accessToken).build());
        Map<String, String> attributes = new HashMap<>();
        for (AttributeType attribute : response.userAttributes()) {
            attributes.put(attribute.name(), attribute.value());
        }

        // GetUser is scoped to the bearer token. Also bind its returned subject to the
        // subject already validated by API Gateway before writing a DynamoDB profile.
        if (!expectedSub.equals(attributes.get("sub"))) {
            throw new IllegalStateException("Cognito identity did not match the authenticated request");
        }

        String email = attributes.get("email");
        boolean verified = "true".equalsIgnoreCase(attributes.get("email_verified"));
        return new ProfileAttributes(verified && email != null && !email.isBlank() ? email : null,
                attributes.get("name"));
    }

    public record ProfileAttributes(String verifiedEmail, String name) {
        public Optional<String> email() {
            return Optional.ofNullable(verifiedEmail);
        }
    }
}
