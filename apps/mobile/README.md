# KureCal Mobile

Expo Router native shell for the signed-in KureCal product surface.

## Local setup

1. Copy [`.env.example`](/Users/sarmad/tech-cal/apps/mobile/.env.example) to `.env`.
2. Keep `EXPO_PUBLIC_APP_ENV=development` for local work.
3. Add the native mobile callback URIs below to Supabase Auth redirect URLs:
   - `kurecal-dev://auth/callback`
   - `kurecal-staging://auth/callback`
   - `kurecal://auth/callback`
4. Run `npm run mobile:start` from the repo root.

## Environment contract

The Expo app now resolves one explicit environment: `development`, `staging`, or `production`.

- Local development uses `EXPO_PUBLIC_APP_ENV=development` and may fall back to `http://localhost:3000` or `http://10.0.2.2:3000` when `EXPO_PUBLIC_API_URL` is omitted.
- EAS `preview` builds are the staging lane and set `EXPO_PUBLIC_APP_ENV=staging`.
- EAS `production` builds set `EXPO_PUBLIC_APP_ENV=production`.
- Staging and production require explicit values for:
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_AUTH_REDIRECT_URI`
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
  - `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID`
  - `EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID`
  - `EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID`

## App identities

- Development: `KureCal Dev`, scheme `kurecal-dev`, bundle/package `com.kurecal.mobile.dev`
- Staging: `KureCal Staging`, scheme `kurecal-staging`, bundle/package `com.kurecal.mobile.staging`
- Production: `KureCal`, scheme `kurecal`, bundle/package `com.kurecal.mobile`

## Auth redirect contract

- Mobile auth must always resolve to the native callback route, never an `http(s)` callback.
- `EXPO_PUBLIC_AUTH_REDIRECT_URI` must match the active app scheme exactly:
  - Development: `kurecal-dev://auth/callback`
  - Staging: `kurecal-staging://auth/callback`
  - Production: `kurecal://auth/callback`
- Password recovery emails should also land on the native callback route and append `?type=recovery`.

## Useful scripts

- `npm run mobile:ios`
- `npm run mobile:android`
- `npm run type-check:mobile`
- `npm run test:mobile`
- `npm run test:mobile:contracts`
- `npm run test:mobile:smoke`
- `npm run build:mobile:preview`

## Native build/test

- Expo config now lives in [`app.config.ts`](/Users/sarmad/tech-cal/apps/mobile/app.config.ts).
- EAS profiles live in [`eas.json`](/Users/sarmad/tech-cal/apps/mobile/eas.json).
- Maestro smoke flows live in [`apps/mobile/.maestro/smoke-auth-discovery.yaml`](/Users/sarmad/tech-cal/apps/mobile/.maestro/smoke-auth-discovery.yaml) and [`apps/mobile/.maestro/smoke-community-paywall.yaml`](/Users/sarmad/tech-cal/apps/mobile/.maestro/smoke-community-paywall.yaml).
- RevenueCat sync depends on `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`, `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID`, and matching product identifiers.

## Monorepo boundaries

- Keep all Expo UI/runtime code inside [`apps/mobile`](/Users/sarmad/tech-cal/apps/mobile).
- Shared contracts live in [`packages/domain`](/Users/sarmad/tech-cal/packages/domain).
- Shared HTTP access for Expo lives in [`packages/mobile-client`](/Users/sarmad/tech-cal/packages/mobile-client).
- Web production releases do not run Expo checks; mobile CI and release workflows are isolated from the Vercel deploy path.
