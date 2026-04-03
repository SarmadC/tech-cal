import { NextResponse } from 'next/server';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { toMobileEventDetail } from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

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
    const event = await EventService.getEventWithAgenda(id, authContext.supabase);
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
