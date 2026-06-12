import {
  mobileCalendarConnectionStatusSchema,
  type MobileCalendarConnectionStatus,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { CalendarConnectionService, type CalendarConnection } from '@/services/calendarConnectionService';
import type { SupabaseClientType } from '@/types';
import type { SubscriptionStatus } from '@/types/subscription';
import {
  getAuthenticatedRequestContext,
  type AuthenticatedRequestContext,
} from '@/utils/supabase/requestAuth';

// Explicit discriminated union: with an inferred return type TS normalizes
// the union with optional members, so `'response' in auth` fails to narrow
// and every route handler is inferred to return `NextResponse | undefined`.
export type MobileAuthResult =
  | { response: NextResponse }
  | { authContext: AuthenticatedRequestContext };

export async function requireMobileAuth(
  request: Request
): Promise<MobileAuthResult> {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { authContext };
}

export async function hasCalendarSyncEntitlement(
  supabase: SupabaseClientType,
  userId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status,tier,current_period_end,entitlements')
    .eq('user_id', userId)
    .maybeSingle();

  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];
  const isCanceledButActive =
    subscription?.status === 'canceled' &&
    !!subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now();

  const hasCalendarSyncEntitlement =
    typeof subscription?.entitlements === 'object' &&
    subscription.entitlements !== null &&
    !Array.isArray(subscription.entitlements) &&
    (subscription.entitlements as { calendar_sync?: unknown }).calendar_sync === true;

  return (
    !!subscription &&
    hasCalendarSyncEntitlement &&
    (activeStatuses.includes(subscription.status) || isCanceledButActive)
  );
}

export async function requireCalendarSyncEntitlement(
  supabase: SupabaseClientType,
  userId: string
) {
  const canSync = await hasCalendarSyncEntitlement(supabase, userId);
  if (canSync) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Calendar sync is a Pro feature. Upgrade to use this integration.',
      requiresUpgrade: true,
    },
    { status: 402 }
  );
}

export function buildGoogleCalendarStatus(
  connection: CalendarConnection | null,
  requiresUpgrade = false
): MobileCalendarConnectionStatus {
  if (!connection) {
    return mobileCalendarConnectionStatusSchema.parse({
      provider: null,
      connected: false,
      isActive: false,
      hasRefreshToken: false,
      status: 'not_connected',
      calendarId: null,
      lastSyncStatus: null,
      lastSyncAt: null,
      lastSyncError: null,
      requiresUpgrade,
    });
  }

  const status =
    connection.last_sync_status === 'failed'
      ? 'failed'
      : !connection.has_refresh_token
        ? 'needs_reauth'
        : connection.is_active
          ? 'connected'
          : 'not_connected';

  return mobileCalendarConnectionStatusSchema.parse({
    provider: 'google',
    connected: true,
    isActive: connection.is_active,
    hasRefreshToken: connection.has_refresh_token,
    status,
    calendarId: connection.calendar_id,
    lastSyncStatus: connection.last_sync_status,
    lastSyncAt: connection.last_sync_at,
    lastSyncError: connection.last_sync_error,
    requiresUpgrade,
  });
}

export async function loadGoogleConnectionStatus(
  supabase: SupabaseClientType,
  userId: string
) {
  return CalendarConnectionService.getConnection(userId, 'google', supabase);
}

export function mobileDataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}
