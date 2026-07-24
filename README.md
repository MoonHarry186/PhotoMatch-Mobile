# PhotoMatch Mobile

Expo SDK 57 / React Native 0.86 application for the PhotoMatch MVP.

## Prerequisites

- Node 22.23.1 (`nvm use`; minimum 22.13)
- npm 10+
- Xcode 26.4+ for iOS 16.4+
- Android Studio with API 36; supported devices use Android 7+
- The sibling `photomatch-api` project and its exported `openapi.json`

## Setup

```sh
nvm use
npm ci
cp .env.example .env.local
npm run generate:api
npm run start
```

Use an Expo development build for Maps, Apple/Google OAuth, Notifications and other native
capabilities:

```sh
npx expo run:ios
npx expo run:android
```

The iOS simulator cannot validate every Apple sign-in or push path. Use physical iOS and Android
devices before promotion.

## Environments and credentials

`EXPO_PUBLIC_*` values are bundled into the app and must never contain a server secret. Native
OAuth credentials, signing credentials and provider secrets belong in EAS/native credential
stores. See [credential-runbook.md](docs/readiness/credential-runbook.md) and `.env.example`.

Build profiles:

```sh
eas build --profile development --platform ios
eas build --profile preview --platform all
eas build --profile staging --platform all
eas build --profile production --platform all
```

## Contract and quality commands

```sh
npm run generate:api
npm run check:paths
npm run format:check
npm run lint
npm run typecheck
npm test
npm run expo:config
npm run expo:export
npm run test:e2e
```

Generated code in `src/generated/api` is never edited manually. Export the backend contract first
with `npm run openapi:export` in `photomatch-api`.

## Troubleshooting

- If Metro resolves stale generated files, run `npm run start:clear`.
- If the default shell uses an older Node, run `nvm use` and confirm `node --version`.
- `localhost` means the device itself. Use the computer's LAN address for a physical-device API
  URL.
- Missing Maps/OAuth values intentionally leave provider features unavailable; do not add fake
  production credentials to source.
