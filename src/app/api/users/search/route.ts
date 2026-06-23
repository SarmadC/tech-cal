import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { UserSearchService } from '@/services/userSearchService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { createClient } from '@/utils/supabase/server';

const QuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  hasHeadline: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().trim().min(1).max(400).optional(),
});

const userSearchRateLimiter = createRateLimiter('community-user-search', 'MEDIUM_FREQUENCY');

export async function GET(request: NextRequest) {
  try {
    const viewerSupabase = await createClient();
    const { data: { user }, error: authError } = await viewerSupabase.auth.getUser();

    if (authError || !user) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(userSearchRateLimiter, user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const parsedQuery = QuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      hasHeadline: request.nextUrl.searchParams.get('hasHeadline') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    });
    if (!parsedQuery.success) {
      return validationErrorJson('Invalid query parameters', parsedQuery.error.issues);
    }

    const readSupabase = getServiceSupabaseClient();
    if (!readSupabase) return errorJson('User search is not configured.', 500);

    const result = await UserSearchService.searchUsers(
      user.id,
      viewerSupabase,
      readSupabase,
      parsedQuery.data
    );

    return successJson(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid pagination cursor.') {
      return errorJson('Invalid pagination cursor.', 400);
    }

    console.error('User search API error:', error);
    return catchErrorJson(error, 'Failed to search users');
  }
}
