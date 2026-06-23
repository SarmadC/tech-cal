import { mobileSavedEventsFeedSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { engagementFromTrackedEvent } from '@/app/api/mobile/engagement';
import { toMobileEventSummary } from '@/app/api/mobile/serializers';
import { UserEventService } from '@/services/userEventService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const SAVED_PAGE_SIZE = 20;

function readPage(request: Request) {
  const value = new URL(request.url).searchParams.get('page');
  const parsed = value ? Number(value) : 1;

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error('Invalid page value');
  }

  return parsed;
}

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const page = readPage(request);
    const trackedEvents = await UserEventService.getTrackedEvents(
      authContext.user.id,
      authContext.supabase
    );

    const savedRecords = trackedEvents.filter(
      (record) => record.isBookmarked && record.event
    );
    const offset = (page - 1) * SAVED_PAGE_SIZE;
    const pageRecords = savedRecords.slice(offset, offset + SAVED_PAGE_SIZE);

    return NextResponse.json({
      success: true,
      data: mobileSavedEventsFeedSchema.parse({
        header: {
          eyebrow: 'Saved',
          title: 'Your shortlist',
          subtitle: 'Events you bookmarked or auto-saved from your plans',
        },
        totalCount: savedRecords.length,
        nextPage:
          offset + SAVED_PAGE_SIZE < savedRecords.length ? page + 1 : null,
        events: pageRecords.map((record) =>
          toMobileEventSummary(record.event!, engagementFromTrackedEvent(record))
        ),
      }),
    });
  } catch (error) {
    const isValidationError =
      error instanceof Error && error.message.startsWith('Invalid');
    return NextResponse.json(
      {
        success: false,
        error: isValidationError
          ? 'Invalid request parameters'
          : 'Failed to load saved events',
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
