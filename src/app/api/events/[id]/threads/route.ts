import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityRoomThreadService } from '@/services/communityRoomThreadService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { extractIdFromSlug } from '@/utils/slugUtils';
import { isValidUuid } from '@/lib/uuid';
import { createServiceClient } from '@/utils/supabase/service';

const threadDraftSchema = z.object({
  title: z.string().min(1).max(300).transform((s) => s.trim()),
  body: z.string().min(1).max(10000).transform((s) => s.trim()),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service config missing');
  return createServiceClient(url, key);
}

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
    if (!authContext) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const client = getServiceClient();
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
    if (!authContext) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) {
        return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 });
      }
    }

    const parsed = threadDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid thread draft' },
        { status: 400 },
      );
    }

    const client = getServiceClient();
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create thread' },
      { status: 400 },
    );
  }
}
