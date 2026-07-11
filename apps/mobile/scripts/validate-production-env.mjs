const REQUIRED_PRODUCTION_ENV = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
  'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID',
  'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID',
  'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
];

const variant = process.env.APP_VARIANT?.trim().toLowerCase();
if (variant !== 'production' && variant !== 'prod') {
  console.log('Skipping production environment validation for a non-production build.');
  process.exit(0);
}

const missing = REQUIRED_PRODUCTION_ENV.filter(
  (name) => !process.env[name]?.trim()
);

if (missing.length > 0) {
  throw new Error(
    `Production mobile environment is missing: ${missing.join(', ')}`
  );
}

console.log('Production mobile environment validation passed.');
