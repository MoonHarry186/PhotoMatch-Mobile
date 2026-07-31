# Release and rollback runbook

Builds are promoted through EAS `development`, `preview`, `staging`, then
`production` channels. Native changes require a new immutable build; JavaScript
only changes may use an OTA update only when the runtime version and API
contract remain compatible.

## Rollback

1. Stop promotion and record the affected EAS update/build ID.
2. Republish the last known-good update to the same channel, or promote the
   previous immutable native build in the store when native code is involved.
3. Disable the affected feature server-side using its versioned restriction or
   feature code if the API remains available.
4. Confirm sign-in, discovery, chat, booking, push and deep-link smoke paths.
5. Re-enable phased rollout only after Sentry and startup/error metrics recover.

Forced upgrades are reserved for incompatible auth, security or API contract
changes. Keep the previous EAS artifact and release notes available for each
promotion.
