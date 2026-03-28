import { NextResponse } from 'next/server';
import {
  mobileEventEngagementSchema,
  mobileEventEngagementUpdateSchema,
} from '@kurecal/domain';
import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { getApiAuthContext } from '@/lib/apiAuth';
import { UserEventService } from '@/services/userEventService';

async function getEngagementState(
  supabase: Awaited<ReturnType<typeof getApiAuthContext>>['supabase'],
  userId: string,
  eventId: string
) {
  const engagementMap = await loadEngagementMap(supabase, userId, [eventId]);
  return mobileEventEngagementSchema.parse(
    engagementMap.get(eventId) ?? {
      isBookmarked: false,
      status: null,
    }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const engagement = await getEngagementState(supabase, user.id, id);

    return NextResponse.json({
      success: true,
      data: engagement,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load event engagement',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const payload = mobileEventEngagementUpdateSchema.parse(await request.json());

    if (payload.isBookmarked !== undefined) {
      await UserEventService.toggleBookmark(user.id, id, payload.isBookmarked, supabase);
    }

    if (payload.status !== undefined) {
      await UserEventService.setAttendanceStatus(user.id, id, payload.status, undefined, supabase);
    }

    const engagement = await getEngagementState(supabase, user.id, id);

    return NextResponse.json({
      success: true,
      data: engagement,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event engagement',
      },
      { status: 500 }
    );
  }
}
