import { NextResponse } from 'next/server';

import {
  buildGoogleCalendarStatus,
  hasCalendarSyncEntitlement,
  loadGoogleConnectionStatus,
  mobileDataResponse,
  requireMobileAuth,
} from '../_shared';

export async function GET(request: Request) {
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load Google Calendar status',
      },
      { status: 500 }
    );
  }
}
