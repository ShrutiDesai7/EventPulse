package com.eventpulse.handler;
import com.amazonaws.services.lambda.runtime.*;
import com.amazonaws.services.lambda.runtime.events.*;
import com.eventpulse.config.DynamoDbConfig;
import com.eventpulse.config.CognitoConfig;
import com.eventpulse.repository.*;
import com.eventpulse.service.*;
import com.eventpulse.util.ResponseUtil;

public class UserHandler implements RequestHandler<APIGatewayV2HTTPEvent,APIGatewayV2HTTPResponse> {
 private final UserService users; private final RegistrationService registrations; private final CognitoProfileService cognitoProfiles;
 public UserHandler(){var db=DynamoDbConfig.enhancedClient();var events=new EventService(new EventRepository(db,DynamoDbConfig.table("EVENTS_TABLE","EventPulse-Events")));registrations=new RegistrationService(new RegistrationRepository(db,DynamoDbConfig.table("REGISTRATIONS_TABLE","EventPulse-Registrations")),events);users=new UserService(new UserRepository(db,DynamoDbConfig.table("USERS_TABLE","EventPulse-Users")));cognitoProfiles=new CognitoProfileService(CognitoConfig.client());}
 public UserHandler(UserService users,RegistrationService registrations,CognitoProfileService cognitoProfiles){this.users=users;this.registrations=registrations;this.cognitoProfiles=cognitoProfiles;}
 public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent request,Context context){try{String path=request.getRawPath(),method=request.getRequestContext().getHttp().getMethod(),userId=EventHandler.user(request);if(method.equals("GET")&&path.equals("/users/me")){var profile=cognitoProfiles.getCurrentUser(EventHandler.accessToken(request),userId);return ResponseUtil.response(200,users.get(userId,profile.verifiedEmail(),profile.name(),EventHandler.isAdmin(request)));}if(method.equals("GET")&&path.equals("/users/me/registrations"))return ResponseUtil.response(200,registrations.forUser(userId));return ResponseUtil.error(404,"NOT_FOUND","Route not found");}catch(Exception e){return EventHandler.handleError(e);}}
}
