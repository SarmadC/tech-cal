import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { NetworkEventCountsService } from '@/services/networkEventCountsService';

const QuerySchema = z.object({
  eventIds: z.string().trim().min(1).max(8000),
});

const EventIdSchema = z.string().uuid();
const MAX_EVENT_IDS = 100;
const networkCountsRateLimiter = createRateLimiter('network-event-counts', 'MEDIUM_FREQUENCY');

function parseEventIds(value: string): string[] {
  const uniqueEventIds = Array.from(
    new Set(
      value
        .split(',')
        .map((eventId) => eventId.trim())
        .filter(Boolean)
    )
  );

  if (uniqueEventIds.length === 0) {
    return [];
  }

  if (uniqueEventIds.length > MAX_EVENT_IDS) {
    throw new Error(`A maximum of ${MAX_EVENT_IDS} event IDs is allowed per request.`);
  }

  for (const eventId of uniqueEventIds) {
    const parsed = EventIdSchema.safeParse(eventId);
    if (!parsed.success) {
      throw new Error('One or more event IDs are invalid.');
    }
  }

  return uniqueEventIds;
}

export async function GET(request: NextRequest) {
  try {
    const viewerSupabase = await createClient();
    const { data: { user }, error: authError } = await viewerSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(networkCountsRateLimiter, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const queryValidation = QuerySchema.safeParse({
      eventIds: request.nextUrl.searchParams.get('eventIds') ?? undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const eventIds = parseEventIds(queryValidation.data.eventIds);
    if (eventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          counts: [],
        },
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Network counts service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const counts = await NetworkEventCountsService.getNetworkCountsForEvents(
      user.id,
      eventIds,
      readSupabase
    );

    return NextResponse.json({
      success: true,
      data: {
        counts,
      },
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('maximum') ||
      error.message.includes('invalid')
    )) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('Network counts API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch network counts' },
      { status: 500 }
    );
  }
}

