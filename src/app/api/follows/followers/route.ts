import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, validationErrorJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { FollowService } from '@/services/followService';
import { createClient } from '@/utils/supabase/server';

const QuerySchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime({ offset: true }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userScopedSupabase = await createClient();
    const { data: { user }, error: authError } = await userScopedSupabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const parsedQuery = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    });
    if (!parsedQuery.success) {
      return validationErrorJson('Invalid query parameters', parsedQuery.error.issues);
    }

    const readSupabase = getServiceSupabaseClient();
    if (!readSupabase) return errorJson('Followers service is not configured.', 500);

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

    return successJson(result);
  } catch (error) {
    console.error('Followers API error:', error);
    return catchErrorJson(error, 'Failed to fetch followers');
  }
}
