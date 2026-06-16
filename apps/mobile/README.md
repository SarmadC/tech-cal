# Mobile Release Setup

`apps/mobile` builds read `EXPO_PUBLIC_*` variables from the Expo environment that
matches the active EAS build profile.

## Required runtime variables

These are required by `/Users/sarmad/tech-cal/apps/mobile/src/lib/env.ts`:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Optional RevenueCat variables

Set these for paid subscriptions:

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID`
- `EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID`
- `EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID`

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
```

5. Replace `YOUR_ASC_APP_ID` in `/Users/sarmad/tech-cal/apps/mobile/eas.json`
   with the real App Store Connect app id before submitting a production build.
   This value was not present in the repo during the launch audit and remains a
   release blocker.

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

Before archiving or submitting the first iOS App Store build from Xcode, sync the
native iOS project to the production variant:

```bash
cd /Users/sarmad/tech-cal/apps/mobile
APP_VARIANT=production npx expo prebuild --platform ios --clean
```

That generated Xcode project is the one whose bundle identifier must match the
App Store Connect app.
