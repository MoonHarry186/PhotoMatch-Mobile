# Acceptance matrix for phases 1-7

| Journey/state         | Customer | Photographer | VI/EN | Light/dark | A11y                      | Offline/retry           | Link state           |
| --------------------- | -------- | ------------ | ----- | ---------- | ------------------------- | ----------------------- | -------------------- |
| Cold bootstrap        | Required | Required     | Both  | Both       | Large text/reduced motion | Explicit retry          | Cold                 |
| Sign in/up            | Required | Required     | Both  | Both       | Keyboard/screen reader    | Domain vs network error | Warm                 |
| Google/Apple OAuth    | Required | Required     | Both  | Both       | Cancel/error labels       | Safe cancellation       | Callback             |
| Email verification    | Required | Required     | Both  | Both       | OTP autofill/paste        | Cooldown + resend retry | Manual six-digit OTP |
| Password reset        | Required | Required     | Both  | Both       | Secure input labels       | Neutral request         | Cold/warm token      |
| Legal viewer/consent  | Required | Required     | Both  | Both       | Focus/readability         | Stale version reload    | Bootstrap gate       |
| Restriction takeover  | Required | Required     | Both  | Both       | Non-color status          | Canonical reload        | Pending target held  |
| Main navigation shell | Required | Required     | Both  | Both       | 44x44/focus               | Offline state           | Resolved after gates |

Acceptance includes iOS 16.4+, current iOS, Android API 24 and API 36. No
protected screen may flash before bootstrap completes. OAuth/Maps device rows
remain externally blocked until real credentials and signed builds are provided.
