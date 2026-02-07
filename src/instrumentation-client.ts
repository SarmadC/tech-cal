// This file configures the initialization of Sentry on the client.
// Skip Sentry completely in development to prevent memory leaks with Next.js 16+
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

if (process.env.NODE_ENV !== 'development') {
  // Import the client config to initialize Sentry with our custom settings
  import("../sentry.client.config");
}

// Only export Sentry handler in production
export const onRouterTransitionStart = process.env.NODE_ENV === 'development'
  ? undefined
  : async (...args: Parameters<typeof import('@sentry/nextjs').captureRouterTransitionStart>) => {
      const Sentry = await import('@sentry/nextjs');
      return Sentry.captureRouterTransitionStart(...args);
    };