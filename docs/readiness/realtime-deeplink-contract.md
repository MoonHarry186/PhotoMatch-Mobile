# Realtime, push and deep-link contract

## Socket.IO

- Namespace: `/realtime`; authenticate after access-session bootstrap.
- Client command: `conversation.join` with an authorized conversation ID.
- Server events:
  - `conversation.message.created`
  - `conversation.message.receipt_updated`
  - `match.created`
  - `booking.created`
  - `booking.status_changed`
- Every payload is runtime-validated. Duplicate or out-of-order events only
  invalidate/reconcile canonical REST queries.

## Push

Supported versioned payload types are match created, booking created and booking
status changed. Direct booking routes only to booking; it does not produce a
second match experience. Payloads never contain tokens, exact location, signed
media URL or a private message body.

## Deep links

| Target       | Canonical route                       |
| ------------ | ------------------------------------- |
| Profile      | `/users/{userRoleId}`                 |
| Photographer | `/photographers/{photographerRoleId}` |
| Match        | `/matches/{matchId}`                  |
| Conversation | `/chat/{conversationId}`              |
| Booking      | `/bookings/{bookingId}`               |

Cold/warm links pass the same resolver and wait for session, verification,
restriction and onboarding gates. The destination always fetches the
authorized record; invalid, missing or unauthorized IDs go to a safe fallback.
