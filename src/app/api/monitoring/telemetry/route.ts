'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TelemetryAnalyticsService } from '@/services/telemetryAnalyticsService';
import { isAdminUser } from '@/lib/adminAuth';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';

const monitoringTelemetryRateLimiter = createRateLimiter(
  'monitoring-telemetry',
  'LOW_FREQUENCY'
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await isAdminUser(user.id, supabase as Parameters<typeof isAdminUser>[1]);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const rateLimitResult = await checkRateLimit(monitoringTelemetryRateLimiter, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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
