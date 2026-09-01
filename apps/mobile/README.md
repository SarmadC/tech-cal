# Mobile Release Setup

`apps/mobile` builds read `EXPO_PUBLIC_*` variables from the Expo environment that
matches the active EAS build profile.

## Required runtime variables

These are required by `/Users/sarmad/tech-cal/apps/mobile/src/lib/env.ts`:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Required iOS authentication variables

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

The matching production Google iOS URL scheme is public application metadata
and is pinned in `app.config.ts` so EAS can resolve the project before loading
its remote environment.

## Required RevenueCat variables for production

Set these for paid subscriptions:

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID`
- `EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID`
- `EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID`

The API deployment also requires these server-only values so account deletion
can remove the RevenueCat customer record:

- `REVENUECAT_V2_SECRET_API_KEY`
- `REVENUECAT_PROJECT_ID`

Sign in with Apple remains enabled. To revoke only the deleting user's Apple
authorization during permanent account deletion, configure the API deployment:

- `APPLE_CLIENT_ID=com.kurecal.mobile`
- `APPLE_DEVELOPMENT_CLIENT_ID=com.kurecal.mobile.dev` for physical dev builds
- `APPLE_TEAM_ID`
- `APPLE_SIGN_IN_KEY_ID`
- `APPLE_SIGN_IN_PRIVATE_KEY`
- `TOKEN_ENCRYPTION_KEY` (64 hexadecimal characters)

Production and preview EAS environments must also provide
`EXPO_PUBLIC_SENTRY_DSN` and an appropriate `EXPO_PUBLIC_SENTRY_ENVIRONMENT`.

## RevenueCat webhook

Configure a RevenueCat webhook destination for the production API deployment:

```text
https://www.kure-cal.com/api/revenuecat/webhook
```

Set the same authorization header value in the RevenueCat dashboard and the API
deployment environment:

- `REVENUECAT_WEBHOOK_SECRET`

This value is the complete expected `Authorization` header value. For example,
if the dashboard sends `Bearer rc_webhook_secret`, set
`REVENUECAT_WEBHOOK_SECRET=Bearer rc_webhook_secret`.

The webhook keeps the server-side `subscriptions` table current for mobile
renewals, cancellations, billing issues, refunds, and expirations. The mobile
client still calls `/api/mobile/subscription/reconcile` after purchase and
restore as a self-healing path.

## Google Calendar OAuth

Web and mobile calendar sync use one server-owned Google OAuth web client. Configure
the API deployment with:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Do not configure a separate `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for calendar sync. Add
both callback paths to the same Google Cloud OAuth client's authorized redirect
URIs. For local development:

```text
http://localhost:3000/api/calendar/google/callback
http://localhost:3000/api/mobile/calendar/google/callback
```

For production, using the API URL below:

```text
https://www.kure-cal.com/api/calendar/google/callback
https://www.kure-cal.com/api/mobile/calendar/google/callback
```

The native return URLs, `kurecal-dev://calendar/google/callback` and
`kurecal://calendar/google/callback`, are handled after the server callback and
are not Google Cloud authorized redirect URIs.

## Production setup

1. Log in to Expo with `npx eas-cli login`.
2. Set the production environment variables for this project:

```bash
cd apps/mobile
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://www.kure-cal.com --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key --visibility plaintext
```

3. If subscriptions are enabled in production, also set the RevenueCat public SDK
   keys and product identifiers in the same `production` environment.
4. Confirm the environment before releasing:

```bash
cd apps/mobile
npx eas-cli env:list --environment production
npm run release:check
npm run verify:ios-live # requires APPLE_TEAM_ID and a deployed production API
```

5. For App Store submission, run `npm run configure:ios-submit` with
   `APP_STORE_CONNECT_APP_ID` set to the numeric Apple ID from App Store Connect.
   The release workflow performs this step on its ephemeral checkout when
   `submit_to_store` is selected.

## RevenueCat launch checklist

- RevenueCat iOS app exists for bundle id `com.kurecal.mobile`.
- Entitlement id matches `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID`; the app
  defaults to `kure_cal_pro`.
- Monthly and annual App Store products match the configured RevenueCat product
  identifiers.
- Current RevenueCat offering contains the monthly and annual packages.
- Customer Center is configured if the in-app manage-subscription flow should
  use RevenueCat UI before falling back to the App Store subscription page.
- Sandbox TestFlight purchase, restore, cancellation, billing issue, and
  expiration events reach `/api/revenuecat/webhook` and update
  `/api/mobile/subscription/status`.

## Build profile mapping

`/Users/sarmad/tech-cal/apps/mobile/eas.json` explicitly maps build profiles to
Expo environments:

- `development` -> `development`
- `preview` -> `preview`
- `production` -> `production`

This keeps local `.env` values out of hosted preview and production builds.

## App identifiers

The mobile app now uses an explicit app variant split:

- development and preview builds -> `com.kurecal.mobile.dev`
- production builds -> `com.kurecal.mobile`

Local scripts default to the development variant. Production release commands set
`APP_VARIANT=production` automatically.

The repository uses Expo Continuous Native Generation and intentionally does not
track `apps/mobile/ios`. To inspect a generated production project locally:

```bash
cd /Users/sarmad/tech-cal/apps/mobile
APP_VARIANT=production npx expo prebuild --platform ios --clean
```

Do not commit that generated directory. EAS regenerates it for every build so the
production identifier and entitlements come from `app.config.ts`.
