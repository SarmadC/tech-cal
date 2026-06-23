import { NextResponse } from 'next/server';

import { CalendarSyncService } from '@/services/calendarSyncService';

import {
  mobileDataResponse,
  requireCalendarSyncEntitlement,
  requireMobileAuth,
} from '../_shared';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireMobileAuth(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { supabase, user } = auth.authContext;
    const entitlementResponse = await requireCalendarSyncEntitlement(
      supabase,
      user.id
    );
    if (entitlementResponse) {
      return entitlementResponse;
    }

    const result = await CalendarSyncService.bulkSyncExistingEvents(
      user.id,
      supabase
    );
    return mobileDataResponse(result);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk sync Google Calendar events',
      },
      { status: 500 }
    );
  }
}
