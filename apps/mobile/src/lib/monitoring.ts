import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initializeMobileMonitoring() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

  Sentry.init({
    dsn: dsn || undefined,
    enabled: Boolean(dsn) && !__DEV__,
    environment: __DEV__
      ? 'development'
      : process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      event.user = undefined;
      return event;
    },
  });
}

export function captureMobileException(
  error: unknown,
  context?: Record<string, string | number | boolean | null>,
) {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()) return;
  Sentry.captureException(error, { extra: context });
}

export { Sentry };
