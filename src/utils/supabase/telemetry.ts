'use server';

import type { Json, SupabaseClientType } from '@/types';
import { warn } from '@/utils/logger';

export interface LogTelemetryEventParams {
  eventType: string;
  userId?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  context?: Record<string, unknown> | Json | null;
  metadata?: Record<string, unknown> | Json | null;
  occurredAt?: Date | string;
  source?: string;
  eventVersion?: number;
}

const sanitizeJson = (value?: Record<string, unknown> | Json | null): Json => {
  if (value === undefined || value === null) {
    return {} as Json;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch (error) {
    warn('Failed to sanitize telemetry payload; falling back to empty object', {
      error,
    });
    return {} as Json;
  }
};

/**
 * Inserts a telemetry event into Supabase. Errors are logged but not thrown so that
 * analytics never block the user-facing flow.
 */
export async function logTelemetryEvent(
  supabaseClient: SupabaseClientType,
  params: LogTelemetryEventParams
): Promise<void> {
  const {
    eventType,
    userId = null,
    sessionId = null,
    requestId = null,
    context,
    metadata,
    occurredAt,
    source = 'web',
    eventVersion = 1,
  } = params;

  if (!eventType) {
    warn('logTelemetryEvent called without an eventType. Event skipped.');
    return;
  }

  const occurredAtTimestamp =
    occurredAt instanceof Date
      ? occurredAt.toISOString()
      : occurredAt ?? new Date().toISOString();

  const { error } = await supabaseClient.from('telemetry_events').insert({
    event_type: eventType,
    event_version: eventVersion,
    user_id: userId,
    session_id: sessionId,
    request_id: requestId,
    source,
    occurred_at: occurredAtTimestamp,
    context: sanitizeJson(context),
    metadata: sanitizeJson(metadata),
  });

  if (error) {
    warn('Failed to log telemetry event', {
      eventType,
      error: error.message,
      code: error.code,
    });
  }
}
