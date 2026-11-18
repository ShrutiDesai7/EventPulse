package com.eventpulse.service;

import java.util.List;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CognitoProfileServiceTest {
    private static AttributeType attribute(String name, String value) {
        return AttributeType.builder().name(name).value(value).build();
    }

    @Test void getsVerifiedEmailForTheAuthenticatedSubject() {
        var client = mock(CognitoIdentityProviderClient.class);
        when(client.getUser(any(GetUserRequest.class))).thenReturn(GetUserResponse.builder().userAttributes(List.of(
                attribute("sub", "subject-1"), attribute("email", "person@example.test"),
                attribute("email_verified", "true"), attribute("name", "Person"))).build());

        var profile = new CognitoProfileService(client).getCurrentUser("access-token", "subject-1");

        assertEquals("person@example.test", profile.email().orElseThrow());
        assertEquals("Person", profile.name());
        verify(client).getUser(GetUserRequest.builder().accessToken("access-token").build());
    }

    @Test void returnsNoEmailWhenCognitoEmailIsMissingOrUnverified() {
        var client = mock(CognitoIdentityProviderClient.class);
        when(client.getUser(any(GetUserRequest.class))).thenReturn(GetUserResponse.builder().userAttributes(List.of(
                attribute("sub", "subject-1"), attribute("email", "person@example.test"),
                attribute("email_verified", "false"))).build());
        assertTrue(new CognitoProfileService(client).getCurrentUser("access-token", "subject-1").email().isEmpty());

        when(client.getUser(any(GetUserRequest.class))).thenReturn(GetUserResponse.builder().userAttributes(List.of(
                attribute("sub", "subject-1"))).build());
        assertTrue(new CognitoProfileService(client).getCurrentUser("access-token", "subject-1").email().isEmpty());
    }

    @Test void refusesCognitoResponseForDifferentSubject() {
        var client = mock(CognitoIdentityProviderClient.class);
        when(client.getUser(any(GetUserRequest.class))).thenReturn(GetUserResponse.builder()
                .userAttributes(List.of(attribute("sub", "different-subject"))).build());
        assertThrows(IllegalStateException.class,
                () -> new CognitoProfileService(client).getCurrentUser("access-token", "subject-1"));
    }

    @Test void propagatesCognitoLookupFailureWithoutLoggingTokenOrAttributes() {
        var client = mock(CognitoIdentityProviderClient.class);
        when(client.getUser(any(GetUserRequest.class))).thenThrow(new IllegalStateException("Cognito unavailable"));
        var exception = assertThrows(IllegalStateException.class,
                () -> new CognitoProfileService(client).getCurrentUser("access-token", "subject-1"));
        assertEquals("Cognito unavailable", exception.getMessage());
        verify(client).getUser(any(GetUserRequest.class));
    }
}
