import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { mobileCommunityMentionCandidateSchema } from '@kurecal/domain';
import { UserSearchService } from '@/services/userSearchService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(40),
});

const mentionSearchRateLimiter = createRateLimiter(
  'mobile-community-mention-search',
  'MEDIUM_FREQUENCY'
);

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(
      mentionSearchRateLimiter,
      authContext.user.id
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const parsedQuery = QuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Mention search is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const result = await UserSearchService.searchUsers(
      authContext.user.id,
      authContext.supabase,
      readSupabase,
      {
        q: parsedQuery.data.q,
        limit: 8,
      }
    );

    return NextResponse.json({
      success: true,
      data: mobileCommunityMentionCandidateSchema.array().parse(
        result.users
          .filter((user) => user.username)
          .map((user) => ({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
          }))
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to search mention candidates',
      },
      { status: 500 }
    );
  }
}
