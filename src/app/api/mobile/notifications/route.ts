import { mobileNotificationListResponseSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

interface NotificationRow {
  id: string;
  type: 'post_reply' | 'comment_reply' | 'mention';
  created_at: string;
  read_at: string | null;
  actor_id: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  circle_id: string | null;
  circle_slug: string | null;
  post_id: string | null;
  comment_id: string | null;
  entity_preview: string | null;
}

function decodeCursor(raw: string | null): { createdAt: string; id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as {
      c?: string;
      i?: string;
    };
    if (typeof parsed.c === 'string' && typeof parsed.i === 'string') {
      return { createdAt: parsed.c, id: parsed.i };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function encodeCursor(row: NotificationRow): string {
  return Buffer.from(
    JSON.stringify({ c: row.created_at, i: row.id }),
    'utf-8'
  ).toString('base64');
}

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = decodeCursor(url.searchParams.get('cursor'));

  // Query the visibility view, not the raw table — keeps list, count,
  // mark-read, and tap-target consistent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (authContext.supabase as any)
    .from('notifications_visible')
    .select(
      'id, type, created_at, read_at, actor_id, actor_display_name, actor_avatar_url, circle_id, circle_slug, post_id, comment_id, entity_preview'
    )
    .eq('recipient_id', authContext.user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    // (created_at, id) < (cursor.createdAt, cursor.id) in lexicographic
    // order. Supabase doesn't expose row-value comparisons directly, so
    // we use the equivalent OR.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = (await query) as {
    data: NotificationRow[] | null;
    error: { message?: string } | null;
  };

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message ?? 'Failed to load notifications' },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  try {
    return NextResponse.json({
      success: true,
      data: mobileNotificationListResponseSchema.parse({
        items: items.map((row) => ({
          id: row.id,
          type: row.type,
          createdAt: row.created_at,
          readAt: row.read_at,
          actor: row.actor_id || row.actor_display_name
            ? {
                id: row.actor_id,
                displayName: row.actor_display_name,
                avatarUrl: row.actor_avatar_url,
              }
            : null,
          circle: row.circle_id || row.circle_slug
            ? { id: row.circle_id, slug: row.circle_slug }
            : null,
          postId: row.post_id,
          commentId: row.comment_id,
          preview: row.entity_preview,
        })),
        nextCursor,
      }),
    });
  } catch (parseError) {
    return NextResponse.json(
      {
        success: false,
        error:
          parseError instanceof Error
            ? parseError.message
            : 'Failed to serialize notifications',
      },
      { status: 500 }
    );
  }
}
