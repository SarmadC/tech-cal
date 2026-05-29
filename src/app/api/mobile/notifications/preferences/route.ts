import {
  mobileNotificationPreferencesSchema,
  mobileNotificationPreferencesUpdateSchema,
} from '@kurecal/domain';
import { NextResponse, type NextRequest } from 'next/server';

import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface PrefRow {
  post_reply: boolean;
  comment_reply: boolean;
  mention: boolean;
}

const DEFAULTS: PrefRow = {
  post_reply: true,
  comment_reply: true,
  mention: true,
};

function toResponse(row: PrefRow) {
  return mobileNotificationPreferencesSchema.parse({
    postReply: row.post_reply,
    commentReply: row.comment_reply,
    mention: row.mention,
  });
}

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as NextRequest);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa: any = authContext.supabase;
  const { data, error } = await supa
    .from('notification_preferences')
    .select('post_reply, comment_reply, mention')
    .eq('user_id', authContext.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message ?? 'Failed to load preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: toResponse((data as PrefRow | null) ?? DEFAULTS),
  });
}

export async function PATCH(request: Request) {
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

  let patch: Partial<{ postReply: boolean; commentReply: boolean; mention: boolean }>;
  try {
    patch = mobileNotificationPreferencesUpdateSchema.parse(await request.json());
  } catch (parseError) {
    return NextResponse.json(
      {
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Invalid payload',
      },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa: any = authContext.supabase;
  const { data: existing } = await supa
    .from('notification_preferences')
    .select('post_reply, comment_reply, mention')
    .eq('user_id', authContext.user.id)
    .maybeSingle();

  const base: PrefRow = (existing as PrefRow | null) ?? DEFAULTS;
  const next: PrefRow = {
    post_reply: patch.postReply ?? base.post_reply,
    comment_reply: patch.commentReply ?? base.comment_reply,
    mention: patch.mention ?? base.mention,
  };

  const { data, error } = await supa
    .from('notification_preferences')
    .upsert(
      {
        user_id: authContext.user.id,
        ...next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('post_reply, comment_reply, mention')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Failed to update preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: toResponse(data as PrefRow),
  });
}
