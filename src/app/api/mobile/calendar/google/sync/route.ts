import { mobileGoogleCalendarSyncInputSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { CalendarSyncService } from '@/services/calendarSyncService';
import type { SupabaseClientType } from '@/types';

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

    const payload = mobileGoogleCalendarSyncInputSchema.parse(
      await request.json().catch(() => ({}))
    );

    const result =
      payload.action === 'sync'
        ? await CalendarSyncService.syncTrackedEvent(
            user.id,
            payload.eventId,
            supabase
          )
        : await unsyncEvent(user.id, payload.eventId, supabase);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Calendar sync failed',
          requiresReauth: result.requiresReauth,
        },
        { status: result.requiresReauth ? 401 : 500 }
      );
    }

    return mobileDataResponse({ ok: true });
  } catch (error) {
    const isValidationError = error instanceof ZodError;
    return NextResponse.json(
      {
        success: false,
        error: isValidationError
          ? 'Invalid Google Calendar sync payload'
          : 'Failed to sync Google Calendar event',
        details: isValidationError ? error.issues : undefined,
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

async function unsyncEvent(
  userId: string,
  eventId: string,
  supabase: SupabaseClientType
) {
  const { data: userEvent } = await supabase
    .from('user_events')
    .select('external_calendar_event_id, external_provider')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (
    !userEvent?.external_calendar_event_id ||
    userEvent.external_provider !== 'google'
  ) {
    return { success: true };
  }

  const result = await CalendarSyncService.unsyncTrackedEvent(
    userId,
    eventId,
    userEvent.external_calendar_event_id,
    supabase
  );

  if (result.success) {
    await supabase
      .from('user_events')
      .update({
        external_calendar_event_id: null,
        external_provider: null,
        calendar_sync_status: null,
        calendar_synced_at: null,
      })
      .eq('user_id', userId)
      .eq('event_id', eventId);
  }

  return result;
}
