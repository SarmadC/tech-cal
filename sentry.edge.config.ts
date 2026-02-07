// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
const sentryDebug = process.env.SENTRY_DEBUG === 'true';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Disable Sentry in development to save memory, or if SENTRY_ENABLED is explicitly false
  enabled: process.env.NODE_ENV === 'development' ? false : sentryEnabled,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: sentryDebug,

  // Only enable replay in development/staging
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0 : 0.1,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0 : 1,
});
