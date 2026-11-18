# EventPulse DynamoDB design

Table names are supplied through Lambda environment variables: `EVENTS_TABLE`, `REGISTRATIONS_TABLE`, `USERS_TABLE`, and `NOTIFICATIONS_TABLE`. Development defaults match the names below. Configure AWS credentials through the standard SDK credential chain; credentials and account ARNs are not stored in the project.

| Table | Partition key | Secondary indexes | Access patterns |
|---|---|---|---|
| EventPulse-Events | `eventId` | None in Step 1 | Get by ID; list currently uses Scan |
| EventPulse-Registrations | `registrationId` | `userId-index` (`userId`); `eventId-index` (`eventId`) | User's registrations; event attendees; get/cancel by registration ID |
| EventPulse-Users | `userId` | None | Get/create profile by authenticated subject |
| EventPulse-Notifications | `notificationId` | `userId-createdAt-index` (`userId` partition, `createdAt` sort) | User notification history newest first; get/save by notification ID |

Registration IDs are deterministic UUIDs derived from the user and event IDs. A conditional put on the partition key prevents concurrent duplicate creation. A cancelled record remains as the unique user/event record, so a user cannot register again for the same event in this initial policy.

## Known query limitation and next index

Event listing and dashboard aggregation currently use a full table scan because the initial table has no event status or date index. This is acceptable only for a small development dataset. Before production scale, add a GSI such as `status-startDateTime-index` (partition key `status`, sort key `startDateTime`) for upcoming/completed/cancelled event queries. For dashboard totals, maintain aggregate counters transactionally or use periodic aggregation; do not scan the full event and registration tables on each dashboard request. Registration counts can be queried through `eventId-index` per event in this initial service.

Notification records store type, event ID, creation time, SES message ID, status, and sanitized failure category. ACCEPTED_BY_SES means SES accepted the request; it is not confirmed delivery. The SES configuration set emits aggregate send/delivery/bounce/complaint metrics to CloudWatch. A future SES event consumer can update records to DELIVERED, BOUNCED, or COMPLAINED; SES events are not yet correlated back to individual DynamoDB records.
