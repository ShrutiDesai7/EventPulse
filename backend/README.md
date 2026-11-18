# EventPulse backend

Plain Java 21 Lambda backend. Table names, SES sender/configuration set, schedule group, reminder function ARN, and scheduler execution role ARN are provided by the SAM template as environment variables. Lambda SDK clients use the execution role and standard AWS credential chain.

Private HTTP routes require a Cognito JWT validated by API Gateway. There is no test identity header or custom password authentication. Public event listing/detail routes are intentionally unauthenticated. The Cognito ADMIN group is assigned by a trusted operator, never by an API request.

`GET /admin/dashboard` is routed to the existing EventHandler Lambda and requires the API Gateway Cognito JWT authorizer plus an `ADMIN` group claim. The handler also requires the verified `sub` claim and checks the ADMIN group before calling `DashboardService.summary()`. The raw JSON response contains `totalEvents`, `upcomingEvents`, `completedEvents`, `cancelledEvents`, and `registrationCounts` (active registration counts keyed by event ID). EventHandler already has the required DynamoDB permissions: `Scan` on the Events table and `Query` on the Registrations `eventId-index`.

Profile synchronization during registration and `GET /users/me` uses the API Gateway-validated bearer access token with Cognito `GetUser`. Cognito returns attributes only for the user represented by that token; the backend verifies the returned `sub` against the authorizer subject and persists only an email Cognito marks verified. Blank/missing email values do not replace a stored address. Cognito `GetUser` is authorized by the user's `aws.cognito.signin.user.admin` token scope and does not require a Lambda IAM permission. A later registration attempt or `GET /users/me` repairs an existing blank-email profile.

Event timestamps are ISO-8601 UTC instants such as 2027-03-01T10:00:00.500Z. Reminder calculations subtract 24 hours and 1 hour from the full-precision event instant. EventBridge Scheduler expressions have whole-second precision, so a fractional reminder instant is rounded up by less than one second, never fired early; reminders already in the past are skipped. If scheduler operations fail after an event write, an ADMIN can replay the schedules with `POST /events/{eventId}/schedule-reconciliation`; the operation is idempotent and uses the stored event state.

SES status ACCEPTED_BY_SES means SES accepted the send request. Delivery is not confirmed by that state. Notification IDs are deterministic per recipient, event, notification type, and event revision/reminder window. A DynamoDB conditional claim prevents concurrent duplicate sends; a definite SES rejection is retryable, while an ambiguous transport/server result is stored as UNKNOWN and is not resent automatically because SES may already have accepted it. The SES configuration set publishes aggregate send/delivery/bounce/complaint metrics to CloudWatch; event-to-record feedback updates are reserved for a later delivery webhook/consumer.

## Build and tests

From the repository root in Windows CMD (adjust JAVA_HOME for your machine):

    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    cd backend
    mvn -s maven-settings.xml clean test
    mvn -s maven-settings.xml package

## SAM commands (not run against AWS)

From the repository root:

    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    set "MAVEN_ARGS=-s maven-settings.xml"
    set "SAM_CLI_TELEMETRY=0"
    sam validate --template-file infrastructure/template.yaml
    sam build --template-file infrastructure/template.yaml

The later deployment command must supply a verified sender email and the frontend's browser origin, then go through change-set review, for example `sam deploy --config-file infrastructure/samconfig.toml --parameter-overrides SesSenderEmail=verified@example.org FrontendOrigin=https://your-frontend.example.org`. The template defaults FrontendOrigin to the local Vite origin for development; no production frontend URL is embedded. Do not run deploy as part of Step 2. SES sandbox accounts can send only to verified recipients until production access is granted.
