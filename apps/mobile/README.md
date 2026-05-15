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
