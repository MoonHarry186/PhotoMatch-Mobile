# OAuth and native credential runbook

No production credential is committed or invented by the mobile repository.
The account owner must provision these values in the matching EAS environment.

## Google and Apple authentication

- Create separate Google OAuth clients for iOS, Android and web/backend exchange
  in each environment. The native SDK uses the web client ID as the ID-token
  audience sent to the backend.
- Restrict iOS clients to the exact bundle ID and Android clients to package
  name plus release certificate SHA-1/SHA-256.
- Configure Apple Services/App IDs for each bundle and register the exact
  associated domain/callback owned by the backend.
- Native Google authorization uses the provider SDK. Web authorization uses
  AuthSession with random `state` and nonce validation. Apple uses a SHA-256
  nonce.
- The app sends only provider authorization material to `/auth/oauth`; backend
  verification remains authoritative.
- Store test accounts in the team's credential manager, never in repository
  fixtures or EAS plain-text variables.

Required public IDs:

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

The Android OAuth client is selected by package name and signing-certificate
SHA-1 in Google Cloud Console; its client ID is not embedded in application
JavaScript. The backend `GOOGLE_CLIENT_IDS` allow-list must include the web
client ID used by the native SDK and any web audience used by AuthSession.

Apple private keys, Google service-account files and store credentials are EAS
Sensitive/Secret values or file variables and never use `EXPO_PUBLIC_`.

## Nearby location

Nearby map and Google Maps credentials are deferred beyond MVP by `CR-002`.
MVP uses Expo Location for owner-approved exact-location updates and renders
only the backend-provided Nearby list with approximate distance buckets.
