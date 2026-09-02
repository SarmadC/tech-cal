import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { requireServiceSupabaseClient } from '@/lib/api/serviceClient';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { isValidUuid } from '@/lib/uuid';
import { CommunityRoomThreadService } from '@/services/communityRoomThreadService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { extractIdFromSlug } from '@/utils/slugUtils';

const threadDraftSchema = z.object({
  title: z.string().min(1).max(300).transform((s) => s.trim()),
  body: z.string().min(1).max(10000).transform((s) => s.trim()),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: slugOrId } = await params;
    const eventId = extractIdFromSlug(slugOrId);
    if (!isValidUuid(eventId)) {
      return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    }

    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const client = requireServiceSupabaseClient();
    const [listResult, count] = await Promise.all([
      CommunityRoomThreadService.listThreads({
        eventId,
        viewerId: authContext.user.id,
        readClient: client,
        cursor,
        limit: typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined,
      }),
      CommunityRoomThreadService.getThreadCount(eventId, client),
    ]);

    return NextResponse.json({ success: true, data: { ...listResult, totalCount: count } });
  } catch (error) {
    console.error('[api/events/threads] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load threads' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: slugOrId } = await params;
    const eventId = extractIdFromSlug(slugOrId);
    if (!isValidUuid(eventId)) {
      return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    }

    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) return errorJson(sameOriginError, 403);
    }

    const parsed = threadDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid thread draft' },
        { status: 400 },
      );
    }

    const client = requireServiceSupabaseClient();
    const thread = await CommunityRoomThreadService.createThread({
      eventId,
      authorId: authContext.user.id,
      draft: parsed.data,
      writeClient: client,
    });

    const newCount = await CommunityRoomThreadService.getThreadCount(eventId, client);

    return NextResponse.json({ success: true, data: { thread, totalCount: newCount } }, { status: 201 });
  } catch (error) {
    console.error('[api/events/threads] POST failed', error);
    return catchErrorJson(error, 'Failed to create thread', 400);
  }
}
