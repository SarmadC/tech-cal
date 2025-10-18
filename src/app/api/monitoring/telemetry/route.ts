'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TelemetryAnalyticsService } from '@/services/telemetryAnalyticsService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const daysParam = searchParams.get('days');
    const maxEventsParam = searchParams.get('limit');

    const days = daysParam ? Number.parseInt(daysParam, 10) : undefined;
    const maxEvents = maxEventsParam ? Number.parseInt(maxEventsParam, 10) : undefined;

    const summary = await TelemetryAnalyticsService.getSummary(supabase, {
      days: Number.isNaN(days) ? undefined : days,
      maxEvents: Number.isNaN(maxEvents) ? undefined : maxEvents
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('Telemetry summary API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate telemetry summary'
      },
      { status: 500 }
    );
  }
}
