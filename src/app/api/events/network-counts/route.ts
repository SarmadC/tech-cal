import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { NetworkEventCountsService } from '@/services/networkEventCountsService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { createClient } from '@/utils/supabase/server';

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

    if (authError || !user) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(networkCountsRateLimiter, user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const queryValidation = QuerySchema.safeParse({
      eventIds: request.nextUrl.searchParams.get('eventIds') ?? undefined,
    });
    if (!queryValidation.success) {
      return validationErrorJson('Invalid query parameters', queryValidation.error.issues);
    }

    const eventIds = parseEventIds(queryValidation.data.eventIds);
    if (eventIds.length === 0) return successJson({ counts: [] });

    const readSupabase = getServiceSupabaseClient();
    if (!readSupabase) return errorJson('Network counts service is not configured.', 500);

    const counts = await NetworkEventCountsService.getNetworkCountsForEvents(
      user.id,
      eventIds,
      readSupabase
    );

    return successJson({ counts });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('maximum') ||
      error.message.includes('invalid')
    )) {
      return errorJson(error.message, 400);
    }

    console.error('Network counts API error:', error);
    return catchErrorJson(error, 'Failed to fetch network counts');
  }
}

