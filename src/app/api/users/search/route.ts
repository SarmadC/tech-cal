import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { UserSearchService } from '@/services/userSearchService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';

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

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(userSearchRateLimiter, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const parsedQuery = QuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      hasHeadline: request.nextUrl.searchParams.get('hasHeadline') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: parsedQuery.error.issues,
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'User search is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const result = await UserSearchService.searchUsers(
      user.id,
      viewerSupabase,
      readSupabase,
      parsedQuery.data
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid pagination cursor.') {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination cursor.' },
        { status: 400 }
      );
    }

    console.error('User search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users',
      },
      { status: 500 }
    );
  }
}
