# Mobile platform decisions

## Baseline

| Concern              | Decision                                                                            |
| -------------------- | ----------------------------------------------------------------------------------- |
| Expo                 | SDK 57 stable                                                                       |
| React Native / React | 0.86 / 19.2.3                                                                       |
| Node / npm           | Node >= 22.13.x LTS, npm >= 10                                                      |
| Package manager      | npm with committed lockfile                                                         |
| Minimum OS           | Android 7+, API target/compile 36; iOS 16.4+                                        |
| Routing              | Expo Router under `src/app`                                                         |
| Native runtime       | Development builds; Expo Go is not a release acceptance target                      |
| E2E                  | Maestro for device journeys; Jest + React Native Testing Library below device level |
| Analytics            | Disabled by default for MVP until a provider is approved; typed allow-list remains  |

The SDK/OS baseline follows the versioned Expo SDK 57 reference. The supported
acceptance devices are:

- iOS: smallest supported iPhone-size simulator/device on iOS 16.4, one current iPhone on latest iOS.
- Android: API 24 emulator, API 36 emulator, and one representative lower-memory physical device.
- Tablets are not a product target for MVP.

## Application variants

| Variant     | Display name       | Bundle/package ID              | URL scheme           | Associated domain           |
| ----------- | ------------------ | ------------------------------ | -------------------- | --------------------------- |
| development | PhotoMatch Dev     | `vn.photomatch.mobile.dev`     | `photomatch-dev`     | `dev-app.photomatch.vn`     |
| preview     | PhotoMatch Preview | `vn.photomatch.mobile.preview` | `photomatch-preview` | `preview-app.photomatch.vn` |
| staging     | PhotoMatch Staging | `vn.photomatch.mobile.staging` | `photomatch-staging` | `staging-app.photomatch.vn` |
| production  | PhotoMatch         | `vn.photomatch.mobile`         | `photomatch`         | `app.photomatch.vn`         |

Each variant has isolated API, OAuth, Maps, push, Sentry and EAS configuration.
Production universal/app links use `app.photomatch.vn`; non-production domains
must never redirect into the production bundle.

## Assets

`documents/brand/logos/logo-app.png` is the approved icon/splash source. The app
bundles Plus Jakarta Sans from `@expo-google-fonts/plus-jakarta-sans`; loading
failure uses the system font without blocking bootstrap.
