import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { FollowService } from '@/services/followService';

const QuerySchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime({ offset: true }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userScopedSupabase = await createClient();
    const { data: { user }, error: authError } = await userScopedSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsedQuery = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsedQuery.error.issues },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Followers service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const targetUserId = parsedQuery.data.userId ?? user.id;

    const result = await FollowService.getFollowers(
      targetUserId,
      user.id,
      userScopedSupabase,
      readSupabase,
      {
        limit: parsedQuery.data.limit,
        cursor: parsedQuery.data.cursor,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Followers API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}
