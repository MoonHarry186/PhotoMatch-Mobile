# Endpoint-by-screen contract matrix

Contract priority is generated OpenAPI, runtime serializer/policies, product
plan, then mobile presentation specs. A screen marked `blocked` cannot ship
against a handwritten DTO or client-only substitute.

| Surface                     | Required contract                                                                                                                                    | Readiness                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bootstrap                   | `POST /auth/refresh`, `GET /me`, `GET /me/restrictions`, `GET /me/consents`, `GET /me/onboarding/progress`                                           | Onboarding route is an additive backend change pending OpenAPI export/contract test |
| Sign in/up                  | `POST /auth/sign-in`, `/auth/sign-up`, `/auth/oauth`, `/auth/sign-out`                                                                               | Ready                                                                               |
| Verification                | `POST /auth/verify-email`, `/auth/resend-verification`                                                                                               | Ready                                                                               |
| Password recovery           | `POST /auth/forgot-password`, `/auth/verify-password-reset-otp`, `/auth/reset-password`                                                              | Six-digit OTP, one-time reset grant, then return to sign-in                         |
| Legal                       | `GET /legal-documents/current`, `GET/POST /me/consents`                                                                                              | Ready; client must send exact current ID/version                                    |
| Onboarding/profile          | `/roles/available`, `/me/roles`, `/me/current-role`, `/cities`, `/activity-fields`, `/services`, `/me/profile`, `/me/profile/avatar`, `/me/location` | Additive typed self/selection/progress responses required before final screens      |
| Public/Photographer profile | `/profiles/{userRoleId}`, `/me/photographer-profile`, owned/public portfolio routes, Photographer reviews                                            | Distinct minimized DTOs required; no exact GPS/email                                |
| Discovery/Nearby            | `/me/discovery-presence`, `/discovery/candidates`, `/nearby`, `/swipes`                                                                              | Nearby must expose only stable obfuscated public point/distance bucket              |
| Interests/matches           | `/interests/incoming`, `/interests/{interestId}/decision`, `/matches`, match detail/unmatch                                                          | Ready after nested counterpart/conversation schemas are generated                   |
| Messaging                   | conversations, conversation messages, conversation-scoped receipt                                                                                    | Ready after typed participant/last-message/receipt schemas; REST is history truth   |
| Booking/review              | booking list/create/detail/update/status, booking review, Photographer reviews                                                                       | Runtime behavior ready; generated detail/history/counterpart schemas required       |
| Media                       | `/uploads/presign`, `/uploads/{uploadId}/complete`, `GET /uploads/{assetId}/access-url`                                                              | Ready; canonical asset ID only, signed URL is ephemeral                             |
| Trust                       | `/blocks`, `/blocks/{blockedUserId}`, `/reports`, `/me/restrictions`                                                                                 | Ready after minimized nested block/restriction schemas                              |
| Settings/device             | `/me/settings`, `/devices`, `/devices/{deviceId}`                                                                                                    | Ready after full setting/device response schemas                                    |
| Realtime                    | Socket.IO `/realtime`, join, message/receipt/match/booking events                                                                                    | Versioned runtime schema required; REST recovery mandatory                          |

## Scope gates

- `ready`: generated path and schema match runtime behavior.
- `additive`: backend may add optional response fields/schemas without removing
  or renaming `/api/v1` behavior.
- `blocked`: screen implementation stops rather than inventing a response.
- `out`: payment/entitlement, notification inbox, shoot requests, referral
  rewards and KYC UI.

All filters execute server-side before cursor pagination. Mobile never returns
exact target GPS, credentials, Admin notes, unrestricted evidence or signed URL
as canonical data.
