// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
const sentryDebug = process.env.SENTRY_DEBUG === 'true';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry to see console logs
  enabled: sentryEnabled,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: sentryDebug,

  // Only enable replay in development/staging
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0 : 0.1,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0 : 1,
});
