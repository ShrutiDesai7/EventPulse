# EventPulse architecture

The backend is a modular Java 21 application packaged as a shaded Maven JAR. API Gateway HTTP API dispatches to separate Lambda entry points for events, registrations, users, and notification history. A scheduled Lambda entry point handles EventBridge Scheduler reminder invocations. There is no Spring server or permanently running scheduler.

## AWS service responsibilities

- Cognito User Pool handles email signup, email verification, and password-based sign-in. Its public app client has no client secret. Cognito issues JWTs; API Gateway validates issuer and audience before invoking private routes.
- API Gateway HTTP API exposes the REST-style routes. Event listing and event details are public; mutations and user-specific routes require JWT authorization.
- Lambda runs the small handler entry points. Handlers use constructor-injected services in tests and SDK clients are shared per execution environment.
- DynamoDB stores events, registrations, user profiles, and notification attempts.
- SES v2 accepts event announcement, rescheduling, cancellation, and reminder emails. App status ACCEPTED_BY_SES indicates request acceptance only.
- EventBridge Scheduler creates independent one-time schedules 24 hours and 1 hour before each event, in UTC, and invokes the reminder Lambda.
- CloudWatch Logs receives Lambda logs with 30-day retention. The SES configuration set also emits aggregate send/delivery/bounce/complaint metrics to CloudWatch.

## Authentication and roles

API Gateway's JWT authorizer validates Cognito issuer and app-client audience. Backend identity comes only from the validated sub claim. The /users/me operation synchronizes profile name/email from trusted JWT claims and sets profile role based on the trusted cognito:groups claim. The ADMIN group is provisioned by a trusted operator using the Cognito console or a restricted administrative process; no public route can assign roles. No custom password handling or client-supplied identity header is implemented.

## Notification and reminder lifecycle

Event creation attempts an announcement to currently registered participants and creates any future reminder schedules. Because registrations generally happen after creation, an ADMIN can also call the explicit announcement route once registration is open. A change to event start or end time sends rescheduling notices and updates both stable schedules. Cancellation sends cancellation notices and deletes the schedules. Schedule names are deterministic per event/reminder type. Event start instants retain their source precision during offset calculation. Since EventBridge Scheduler expressions support whole seconds, fractional instants are rounded up, with a second check against current time to avoid scheduling in the past. Schedule operations can partially fail after the event write; an ADMIN can call `POST /events/{eventId}/schedule-reconciliation` to idempotently project the persisted event state back to both schedules (or delete both for a cancelled event). The reminder handler reloads the event and ignores cancelled/completed/started events and stale early invocations after a reschedule.

Each notification operation has a deterministic key per recipient, event, type, and event revision/reminder window. Conditional DynamoDB claims prevent simultaneous invocations from sending the same notification twice. A definite SES 4xx rejection is marked FAILED and is eligible for a safe retry; SES transport errors and server failures are marked UNKNOWN and are not resent automatically because SES may have accepted the message before its response was lost. ACCEPTED_BY_SES records request acceptance only, not delivery. Recipients are not copied into notification records or logged. Delivery feedback is not yet correlated to individual records; the configuration set currently exports aggregate metrics only.

## IAM boundaries

SAM-generated Lambda execution roles have function-specific DynamoDB access. Event Lambda can write event/registration/notification records, read user profiles, send SES only from the configured sender, and manage only ep-* schedules in the configured group. iam:PassRole is limited to the dedicated Scheduler execution role and Scheduler service. The Scheduler role can invoke only the reminder Lambda. SES sender restriction uses an IAM condition because SES send actions do not support a useful per-message resource ARN. Each function's log actions are scoped to its pre-created log group.

## Build and deployment

Run Maven clean test from backend using the provided Maven settings. infrastructure/template.yaml describes resources but has not been deployed. Validate/build with SAM locally. A later deployment requires a verified SES sender address and explicit change-set review in ap-southeast-2; SES sandbox recipients may also need verification.
