import { mobileNotificationUnreadCountSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { count, error } = (await (authContext.supabase as never as {
    from: (t: string) => {
      select: (
        cols: string,
        opts: { count: 'exact'; head: true }
      ) => {
        eq: (
          col: string,
          val: string
        ) => {
          is: (
            col: string,
            val: null
          ) => Promise<{ count: number | null; error: { message?: string } | null }>;
        };
      };
    };
  })
    .from('notifications_visible')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', authContext.user.id)
    .is('read_at', null));

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message ?? 'Failed to load unread count' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: mobileNotificationUnreadCountSchema.parse({ count: count ?? 0 }),
  });
}
