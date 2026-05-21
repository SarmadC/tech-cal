import { NextResponse } from 'next/server';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { toMobileEventDetail } from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

async function loadMobileEventDetailSource(
  id: string,
  supabase: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedRequestContext>>
  >['supabase']
) {
  try {
    return await EventService.getEventWithAgenda(id, supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.toLowerCase().includes('not found')) {
      throw error;
    }

    console.warn(
      '[mobile/events] Agenda detail query failed; falling back to base event detail',
      { eventId: id, message }
    );

    return EventService.getEventById(id, supabase);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const event = await loadMobileEventDetailSource(id, authContext.supabase);
    const engagementMap = await loadEngagementMap(
      authContext.supabase,
      authContext.user.id,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: toMobileEventDetail(event, engagementMap.get(id)),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load event detail';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
