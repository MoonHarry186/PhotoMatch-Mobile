# OAuth, Maps and native credential runbook

No production credential is committed or invented by the mobile repository.
The account owner must provision these values in the matching EAS environment.

## Google and Apple authentication

- Create separate Google OAuth clients for iOS, Android and web/backend exchange
  in each environment.
- Restrict iOS clients to the exact bundle ID and Android clients to package
  name plus release certificate SHA-1/SHA-256.
- Configure Apple Services/App IDs for each bundle and register the exact
  associated domain/callback owned by the backend.
- OAuth authorization uses system browser/native provider, PKCE where supported,
  random `state`, Google nonce/state validation and Apple SHA-256 nonce.
- The app sends only provider authorization material to `/auth/oauth`; backend
  verification remains authoritative.
- Store test accounts in the team's credential manager, never in repository
  fixtures or EAS plain-text variables.

Required public IDs:

- `EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID`

Apple private keys, Google service-account files and store credentials are EAS
Sensitive/Secret values or file variables and never use `EXPO_PUBLIC_`.

## Google Maps

- Provision distinct iOS and Android API keys for each environment.
- Restrict iOS key by bundle ID; restrict Android key by package and certificate.
- Enable only Maps SDKs actually required by the app.
- Configure daily quota and billing alerts before staging device tests.
- Values: `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY` and
  `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`.
- Device acceptance must verify render, permission denial/recovery and key
  restriction on both platforms before these checklist items are closed.
