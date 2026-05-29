import { mobileNotificationMarkReadRequestSchema } from '@kurecal/domain';
import { NextResponse, type NextRequest } from 'next/server';

import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as NextRequest);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  if (authContext.authMethod === 'cookie') {
    const sameOriginError = validateSameOriginRequest(request as NextRequest);
    if (sameOriginError) {
      return NextResponse.json(
        { success: false, error: sameOriginError },
        { status: 403 }
      );
    }
  }

  let payload: { ids?: string[]; all?: boolean };
  try {
    payload = mobileNotificationMarkReadRequestSchema.parse(await request.json());
  } catch (parseError) {
    return NextResponse.json(
      {
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Invalid payload',
      },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa: any = authContext.supabase;

  if (payload.all) {
    // Resolve the set of currently-visible unread ids first, then update
    // the underlying table by id. Updates against a view aren't supported.
    const { data, error } = await supa
      .from('notifications_visible')
      .select('id')
      .eq('recipient_id', authContext.user.id)
      .is('read_at', null);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message ?? 'Failed to load notifications' },
        { status: 500 }
      );
    }
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: { updated: 0 } });
    }
    const { error: updateError } = await supa
      .from('notifications')
      .update({ read_at: nowIso })
      .eq('recipient_id', authContext.user.id)
      .is('read_at', null)
      .in('id', ids);
    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message ?? 'Failed to mark read' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data: { updated: ids.length } });
  }

  const ids = payload.ids ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ success: true, data: { updated: 0 } });
  }

  const { error: updateError, count } = await supa
    .from('notifications')
    .update({ read_at: nowIso }, { count: 'exact' })
    .eq('recipient_id', authContext.user.id)
    .is('read_at', null)
    .in('id', ids);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message ?? 'Failed to mark read' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { updated: count ?? 0 } });
}
