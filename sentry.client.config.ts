// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry to see console logs
  enabled: false,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: process.env.NODE_ENV !== 'production',

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Only enable replay in development/staging
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0 : 0.1,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0 : 1,
});
