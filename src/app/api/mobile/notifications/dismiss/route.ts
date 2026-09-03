import { mobileNotificationDismissRequestSchema } from '@kurecal/domain';
import { NextResponse, type NextRequest } from 'next/server';

import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function PATCH(request: Request) {
  const authContext = await getAuthenticatedRequestContext(
    request as NextRequest
  );
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

  let payload: { ids: string[]; dismissed: boolean };
  try {
    payload = mobileNotificationDismissRequestSchema.parse(
      await request.json()
    );
  } catch (parseError) {
    return NextResponse.json(
      {
        success: false,
        error:
          parseError instanceof Error ? parseError.message : 'Invalid payload'
      },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (authContext.supabase as any)
    .from('notifications')
    .update(
      { dismissed_at: payload.dismissed ? new Date().toISOString() : null },
      { count: 'exact' }
    )
    .eq('recipient_id', authContext.user.id)
    .in('id', payload.ids);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Failed to update notifications'
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { updated: count ?? 0 }
  });
}
