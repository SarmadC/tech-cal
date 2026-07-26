import { NextResponse } from 'next/server';

import {
  buildGoogleCalendarStatus,
  hasCalendarSyncEntitlement,
  loadGoogleConnectionStatus,
  mobileDataResponse,
  requireMobileAuth,
} from '../_shared';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireMobileAuth(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { supabase, user } = auth.authContext;
    const [connection, canSync] = await Promise.all([
      loadGoogleConnectionStatus(supabase, user.id),
      hasCalendarSyncEntitlement(supabase, user.id),
    ]);

    return mobileDataResponse(buildGoogleCalendarStatus(connection, !canSync));
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load Google Calendar status',
      },
      { status: 500 }
    );
  }
}
