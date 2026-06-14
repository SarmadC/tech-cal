import {
  mobileEventEngagementSchema,
  mobileEventEngagementUpdateSchema,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { UserEventService } from '@/services/userEventService';
import { getFeatureLimits, getSubscriptionByUserId } from '@/lib/subscription';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const eventId = decodeURIComponent(id ?? '').trim();
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event id is required' },
        { status: 400 }
      );
    }

    const payload = mobileEventEngagementUpdateSchema.parse(
      await request.json().catch(() => ({}))
    );

    if (Object.prototype.hasOwnProperty.call(payload, 'isBookmarked')) {
      if (payload.isBookmarked === true) {
        const currentState = await UserEventService.isEventTracked(
          authContext.user.id,
          eventId,
          authContext.supabase
        );
        if (!currentState.isBookmarked) {
          const subscription = await getSubscriptionByUserId(authContext.user.id);
          const limits = getFeatureLimits(subscription);

          if (Number.isFinite(limits.bookmarkLimit)) {
            const trackedEvents = await UserEventService.getTrackedEvents(
              authContext.user.id,
              authContext.supabase
            );
            const bookmarkCount = trackedEvents.filter(
              (record) => record.isBookmarked
            ).length;

            if (bookmarkCount >= limits.bookmarkLimit) {
              return NextResponse.json(
                {
                  success: false,
                  error: `You've reached the free bookmark limit (${limits.bookmarkLimit}). Upgrade to add more.`,
                },
                { status: 403 }
              );
            }
          }
        }
      }

      await UserEventService.toggleBookmark(
        authContext.user.id,
        eventId,
        payload.isBookmarked as boolean,
        authContext.supabase
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      await UserEventService.setAttendanceStatus(
        authContext.user.id,
        eventId,
        payload.status ?? null,
        undefined,
        authContext.supabase
      );
    }

    const state = await UserEventService.isEventTracked(
      authContext.user.id,
      eventId,
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      data: mobileEventEngagementSchema.parse({
        isBookmarked: state.isBookmarked,
        status: state.status ?? null,
      }),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid engagement payload'
        : error instanceof Error
          ? error.message
          : 'Failed to update event engagement';

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error instanceof ZodError ? error.issues : undefined,
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}
