# EventPulse frontend

React, TypeScript, and Vite application for EventPulse. Phase 3.1 provides the responsive UI and route structure. Phase 3.2 adds Cognito sign-up, email verification, sign-in/sign-out, session restoration, and role-aware route guards. Phase 3.3 connects event management, Phase 3.4 connects registrations, and Phase 3.5 connects notification history and dashboard data where the backend exposes it.

## Run locally

```sh
npm install
npm run dev
```

The screens use explicit empty and not-connected states; they do not display fabricated event or account data. Authentication requires a deployed Cognito User Pool and public app client. No AWS credentials or app client secret are used in the browser.

## Configure Cognito

The SAM template creates an email-based Cognito User Pool, requires email verification, and creates a public app client (`GenerateSecret: false`). It also creates the trusted `ADMIN` group. The app client supports Cognito SRP authentication, which Amplify Auth uses for sign-in. Passwords must be at least 12 characters and contain uppercase, lowercase, numeric, and symbol characters.

Copy `.env.example` to `.env.local` and fill in the deployed stack's values:

```dotenv
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
VITE_COGNITO_APP_CLIENT_ID=your-public-app-client-id
VITE_AWS_REGION=ap-southeast-2
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com
```

If the SAM stack is already deployed, read the pool and client IDs from its outputs:

```sh
aws cloudformation describe-stacks --stack-name eventpulse --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId' || OutputKey=='CognitoAppClientId' || OutputKey=='ApiUrl'].[OutputKey,OutputValue]" --output table
```

The stack outputs include `CognitoUserPoolId`, `CognitoAppClientId`, and `ApiUrl`. The values are public identifiers/URLs, not secrets. Vite exposes `VITE_` values in the browser bundle; never put AWS credentials, client secrets, or private keys in this file. Amplify manages the Cognito session and token storage and refresh; the API client gets the current access token from Amplify for authenticated requests. If configuration is missing or the pool region does not match `VITE_AWS_REGION`, auth screens explain how to configure it.

New users receive a Cognito confirmation code by email and must verify before signing in. Cognito users in the trusted `ADMIN` group receive the `ADMIN` UI role; other authenticated pool users receive the default `USER` role. The frontend never accepts a role from form input or local profile data. Route guards improve navigation only: API Gateway's JWT authorizer and backend claim checks remain authoritative for protected operations.

When the stack is not deployed, real signup/login and API calls cannot succeed. The UI shows configuration/network errors; no fake user, event, or session data is supplied.

## Event API contracts

The frontend uses the current Java handler contracts:

| Request | Access | Request/response |
| --- | --- | --- |
| `GET /events` | Public | JSON array of event objects; cancelled events are filtered out by the backend. |
| `GET /events/{eventId}` | Public | One event object. |
| `POST /events` | Cognito JWT + ADMIN claim | JSON fields `title`, `description`, `category`, `venue`, `startDateTime`, `endDateTime`; returns an event object (201). |
| `PUT /events/{eventId}` | Cognito JWT + ADMIN claim | Same six fields; returns the updated event object (200). |
| `DELETE /events/{eventId}` | Cognito JWT + ADMIN claim | Returns the cancelled event object (200). |

Event responses contain `eventId`, `title`, `description`, `category`, `venue`, `startDateTime`, `endDateTime`, `createdBy`, `status`, `createdAt`, and `updatedAt`. Dates are sent as ISO-8601 UTC instants. If an event is saved but its scheduler update fails, the backend returns 202 with the event under `event` plus `scheduleSyncStatus: PENDING`; the UI reports that reminder schedules need reconciliation.

The backend does not accept search, status, category, or date query parameters. Search and these filters are applied in the browser over the returned event array. The list endpoint omits cancelled events, so they are not available in the list filters. The event API client sends `Authorization: Bearer <Cognito access token>` on mutation calls. API Gateway validates the JWT, and the Java handler independently enforces ADMIN for writes; frontend role guards are only a navigation aid.

## Verify

```sh
npm run build
npm test
```

## Registration API contracts

Phase 3.4 connects the registration screens to the current Java handlers:

| Request | Access | Request/response |
| --- | --- | --- |
| `POST /events/{eventId}/registrations` | Cognito JWT; handler requires a Cognito subject | No body; returns one registration object (201). |
| `GET /users/me/registrations` | Cognito JWT | Returns the signed-in user's registration array. The user ID comes from the verified JWT subject; the client does not send a user ID. |
| `DELETE /registrations/{registrationId}` | Cognito JWT | Returns the cancelled registration object (200); backend checks ownership. |
| `GET /events/{eventId}/registrations` | Cognito JWT + ADMIN claim | Returns registrations for that event. |

Registration objects contain `registrationId`, `eventId`, `userId`, `status`, `registeredAt`, and `cancelledAt`. The frontend requests an event's public details separately to display each registration in My Registrations. API Gateway JWT validation and handler checks remain authoritative; the UI's ADMIN route is only a navigation guard.

The Java service uses a stable registration ID for each user/event pair and rejects a second stored registration record. Active duplicates return HTTP 409. A cancelled record also cannot currently be reactivated through the API: attempting to register again conflicts with that existing ID. The UI shows cancelled registrations and explains this backend limitation. Re-registration would require a backend contract change.

## Notification history and dashboard contracts

The notification page calls `GET /users/me/notifications?limit=20` with the Cognito access token. The Java handler accepts limits from 1 to 100, defaults to 20, scopes results to the verified Cognito subject, and returns a JSON array ordered newest first. The fields used are `notificationId`, `userId`, `eventId`, `type`, `status`, `createdAt`, `failureReason`, `messageId`, and `attemptCount`. The frontend fetches event details once per distinct event ID to show event titles; if an event is no longer available, it displays its ID.

Notification statuses follow `NotificationService`: `PENDING`, `ACCEPTED_BY_SES`, `FAILED`, and `UNKNOWN`. `ACCEPTED_BY_SES` means SES accepted the send request and does not confirm delivery. Failure reasons are shown when present. The history is read-only; the backend has no read/unread state.

The frontend requests `GET /admin/dashboard` using the summary shape produced by `DashboardService.summary()`: `totalEvents`, `upcomingEvents`, `completedEvents`, `cancelledEvents`, and `registrationCounts` (active registration count keyed by event ID). It does not derive a total registrations metric. The existing `EventHandler` exposes this route through SAM and requires the verified ADMIN group claim.

The regular user dashboard calls `GET /events` and `GET /users/me/registrations` once each, then uses those responses to show upcoming events and the user's active registered events. ADMIN users are directed to the admin dashboard.

## Phase boundary

Event management, registration, read-only notification history, and dashboard statistics are connected to the current backend contracts. Notification read/unread actions are not supported by the backend. Local frontend tests mock the API and Cognito session; live authentication and AWS-backed workflows still require deployed resources.
