import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { WhosGoingService } from '@/services/whosGoingService';

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

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [parsedParams, parsedQuery] = await Promise.all([
      params.then(p => ParamsSchema.safeParse(p)),
      Promise.resolve(QuerySchema.safeParse({ limit: request.nextUrl.searchParams.get('limit') })),
    ]);

    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid event id' },
        { status: 400 }
      );
    }

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsedQuery.error.issues },
        { status: 400 }
      );
    }

    // Reads in this endpoint require access to other users' public profile fields.
    // Use a server-side service role client to avoid widening global profiles RLS.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Attendees service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const viewerId = authData.user.id;
    const attendeeData = await WhosGoingService.getEventAttendees(
      parsedParams.data.id,
      viewerId,
      readSupabase,
      parsedQuery.data.limit
    );

    return NextResponse.json({
      success: true,
      data: attendeeData,
    });
  } catch (error) {
    console.error('Event attendees API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
