'use client';

import type { TelemetryEventPayload } from '@/types';
import { warn } from '@/utils/logger';

/**
 * Fire-and-forget telemetry emitter that posts to our internal API.
 * Errors are logged but never surfaced to the UI.
 */
export async function sendTelemetryEvent(payload: TelemetryEventPayload): Promise<void> {
  if (!payload?.eventType) {
    warn('sendTelemetryEvent called without an eventType. Event skipped.');
    return;
  }

  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    warn('Failed to send telemetry event', {
      eventType: payload.eventType,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
