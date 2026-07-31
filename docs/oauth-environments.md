# OAuth environment contract

Each EAS profile supplies its own Google iOS/web client IDs through
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`; native client secrets never ship in the app.
The configured callback is the profile scheme (`photomatch-dev://`,
`photomatch-preview://`, `photomatch-staging://`, or `photomatch://`) and the
backend exchanges the provider assertion after validating state, nonce and PKCE
where supported. Apple uses a fresh cryptographic nonce per request and Google
uses the provider SDK state/PKCE verifier.

Before a store or staging promotion, the release owner must fill the credential
matrix in the secret manager and run one approved test account per profile.
Never commit client secrets, refresh tokens or test account passwords here.
