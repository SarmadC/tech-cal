'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { unauthorizedJson, validationErrorJson, errorJson } from '@/lib/api/apiResponse';
import { createClient } from '@/utils/supabase/server';
import { logTelemetryEvent } from '@/utils/supabase/telemetry';

const TelemetrySchema = z.object({
  eventType: z.string().min(1),
  eventVersion: z.number().int().positive().optional(),
  source: z.string().min(1).optional(),
  sessionId: z.string().min(1).max(255).optional(),
  requestId: z.string().max(255).optional(),
  occurredAt: z.string().datetime().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const [{ data: { user } }, body] = await Promise.all([
      supabase.auth.getUser(),
      request.json()
    ]);

    if (!user) return unauthorizedJson();

    const validation = TelemetrySchema.safeParse(body);
    if (!validation.success) {
      return validationErrorJson('Invalid telemetry payload', validation.error.issues);
    }

    // Respect analytics consent (default to opt-out if null/false)
    const { data: consentRow } = await supabase
      .from('profiles')
      .select('analytics_consent')
      .eq('id', user.id)
      .single();

    if (!consentRow?.analytics_consent) {
      return NextResponse.json(
        { success: true, skipped: 'consent_not_granted' },
        { status: 202 }
      );
    }

    const payload = validation.data;
    await logTelemetryEvent(supabase, {
      eventType: payload.eventType,
      eventVersion: payload.eventVersion,
      source: payload.source,
      userId: user.id,
      sessionId: payload.sessionId,
      requestId: payload.requestId,
      occurredAt: payload.occurredAt,
      context: payload.context,
      metadata: payload.metadata
    });

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    console.error('Telemetry API error:', error);
    return errorJson('Failed to log telemetry event', 500);
  }
}
