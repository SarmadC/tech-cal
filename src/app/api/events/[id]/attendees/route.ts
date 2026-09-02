import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, validationErrorJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { WhosGoingService } from '@/services/whosGoingService';
import { createClient } from '@/utils/supabase/server';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userScopedSupabase = await createClient();
    const { data: authData } = await userScopedSupabase.auth.getUser();
    if (!authData.user) return unauthorizedJson();

    const [parsedParams, parsedQuery] = await Promise.all([
      params.then(p => ParamsSchema.safeParse(p)),
      Promise.resolve(QuerySchema.safeParse({ limit: request.nextUrl.searchParams.get('limit') })),
    ]);

    if (!parsedParams.success) return validationErrorJson('Invalid event id');
    if (!parsedQuery.success) {
      return validationErrorJson('Invalid query parameters', parsedQuery.error.issues);
    }

    const readSupabase = getServiceSupabaseClient();
    if (!readSupabase) return errorJson('Attendees service is not configured.', 500);

    const viewerId = authData.user.id;
    const attendeeData = await WhosGoingService.getEventAttendees(
      parsedParams.data.id,
      viewerId,
      readSupabase,
      parsedQuery.data.limit
    );

    return successJson(attendeeData);
  } catch (error) {
    console.error('Event attendees API error:', error);
    return catchErrorJson(error, 'Failed to fetch attendees');
  }
}
