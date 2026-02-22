// Skip Sentry completely in development to prevent memory leaks with Next.js 16+
export async function register() {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Only export Sentry error handler in production
export const onRequestError = process.env.NODE_ENV === 'development'
  ? undefined
  : async (...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) => {
      const Sentry = await import('@sentry/nextjs');
      return Sentry.captureRequestError(...args);
    };
