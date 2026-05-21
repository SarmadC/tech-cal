import { NextResponse } from 'next/server';

import { CalendarConnectionService } from '@/services/calendarConnectionService';

import {
  buildGoogleCalendarStatus,
  mobileDataResponse,
  requireMobileAuth,
} from '../_shared';

export async function POST(request: Request) {
  const auth = await requireMobileAuth(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { supabase, user } = auth.authContext;
    await CalendarConnectionService.deleteConnection(user.id, 'google', supabase);
    return mobileDataResponse(buildGoogleCalendarStatus(null));
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect Google Calendar',
      },
      { status: 500 }
    );
  }
}
