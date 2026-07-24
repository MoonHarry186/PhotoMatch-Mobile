# Analytics decision and allow-list

Analytics is disabled by default for MVP (`EXPO_PUBLIC_ANALYTICS_PROVIDER=disabled`).
If product later approves a provider, only these coarse events may be emitted:

- `auth_sign_in_outcome`
- `auth_sign_up_outcome`
- `email_verification_outcome`
- `legal_consent_outcome`
- `bootstrap_outcome`
- `screen_view`

Allowed properties are release, environment, platform, screen key, provider
category and coarse outcome/error category. User IDs, emails, names, free text,
tokens, exact GPS, device/push tokens, legal content and media identifiers/URLs
are forbidden by type and runtime validation.
