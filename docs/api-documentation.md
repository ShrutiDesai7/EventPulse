# EventPulse API

API Gateway HTTP API routes are defined in the SAM template. Responses are JSON. Error responses use a consistent error envelope. CORS allows the configured frontend origin policy.

| Method | Path | Success / access |
|---|---|---|
| POST | /events | 201 event created; 202 event saved but lifecycle side effect needs retry; ADMIN |
| GET | /events | 200 public event list |
| GET | /events/{eventId} | 200 public event |
| PUT | /events/{eventId} | 200 updated event; 202 event saved but lifecycle side effect needs retry; ADMIN |
| DELETE | /events/{eventId} | 200 cancelled event; 202 event saved but lifecycle side effect needs retry; ADMIN |
| POST | /events/{eventId}/announcements | 200 announcement attempts completed for current registrants; ADMIN |
| POST | /events/{eventId}/schedule-reconciliation | 200 persisted event schedules reconciled (including cancellation deletion); ADMIN |
| POST | /events/{eventId}/registrations | 201 registration; authenticated user |
| GET | /events/{eventId}/registrations | 200 registrations; ADMIN |
| GET | /users/me/registrations | 200 current user's registrations |
| DELETE | /registrations/{registrationId} | 200 cancellation; owner only |
| GET | /users/me | 200 current user's profile |
| GET | /users/me/notifications | 200 notification history; authenticated user |

Create/update event JSON fields are title, description, category, venue, startDateTime, and endDateTime. Required fields are title, category, venue, and both timestamps. Timestamps must be ISO-8601 UTC instants such as 2027-03-01T10:00:00Z; end must follow start.

Private routes require a Cognito JWT validated by API Gateway. Public event listing and detail routes are intentionally unauthenticated. The backend reads identity only from validated JWT claims and derives ADMIN from the Cognito ADMIN group. No user ID or role is accepted from request headers or bodies. The ADMIN group is assigned only by a trusted Cognito operator.

Notification history is queried through the userId-createdAt-index, newest first; its limit is 1 to 100. Email status ACCEPTED_BY_SES means SES accepted the request; delivery is not confirmed. SES configuration-set metrics are aggregate CloudWatch metrics. Individual delivery feedback updates are not implemented yet. Deterministic notification keys and conditional claims make retries of definite FAILED sends safe; UNKNOWN results are not automatically resent to avoid possible duplicate email.
