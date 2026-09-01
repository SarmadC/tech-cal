# iOS release operations

## Required configuration

- Set `APPLE_TEAM_ID` on the web deployment so `/.well-known/apple-app-site-association` emits the production app identifier.
- Configure `APPLE_CLIENT_ID`, `APPLE_SIGN_IN_KEY_ID`, `APPLE_SIGN_IN_PRIVATE_KEY`, and `TOKEN_ENCRYPTION_KEY` so Apple authorization can be revoked when a user deletes their account.
- Set `EXPO_PUBLIC_SENTRY_DSN` in preview and production EAS environments. Events remove request bodies, headers, cookies, and user fields other than the user ID.
- Keep `preview` and `production` builds on their matching EAS Update channels. The runtime version follows the native app version, so an incompatible native update cannot be applied over the air.

## Update rollout

1. Publish and exercise the update on the `preview` channel, including offline launch and a full cold restart.
2. Publish to `production` with a small EAS Update rollout percentage.
3. Check startup errors, API timeouts, and screen traces in Sentry before increasing the rollout.
4. The app downloads eligible updates without blocking the current session and applies them on a subsequent safe launch.

## Rollback

Republish the last known-good production update to the `production` channel or use EAS Update rollback. Do not change the runtime version to force an incompatible JavaScript bundle onto an older binary. Validate a cold launch after rollback before restoring rollout traffic.

## Preflight

Run `npm run release:check` from this directory, then run `APPLE_TEAM_ID=... npm run verify:ios-live` against the deployed API. Universal Links require the Associated Domains entitlement and a valid AASA response from `https://www.kure-cal.com/.well-known/apple-app-site-association`.
