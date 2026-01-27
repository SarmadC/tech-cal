/**
 * Server-side PostHog client for Next.js API routes and server actions.
 *
 * Use this to capture events, identify users, and track analytics from the server side.
 *
 * @example
 * import { getPostHogClient } from '@/lib/posthog-server';
 *
 * const posthog = getPostHogClient();
 * posthog.capture({
 *   distinctId: 'user-123',
 *   event: 'server_event',
 *   properties: { key: 'value' }
 * });
 * await posthog.shutdown();
 */

import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Get a PostHog server-side client instance.
 *
 * Note: For short-lived serverless functions, flushAt and flushInterval are set to
 * send events immediately. Always call `await posthog.shutdown()` when done to
 * ensure events are flushed before the function terminates.
 */
export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        // Send events immediately for serverless functions
        flushAt: 1,
        flushInterval: 0,
      }
    );
  }
  return posthogClient;
}

/**
 * Shutdown the PostHog client and flush any pending events.
 * Call this before your serverless function terminates.
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
