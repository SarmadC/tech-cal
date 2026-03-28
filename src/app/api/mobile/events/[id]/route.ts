import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { toMobileEventDetail } from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';

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
    const event = await EventService.getEventWithAgenda(id, supabase);
    const engagementMap = await loadEngagementMap(supabase, user.id, [id]);

    return NextResponse.json({
      success: true,
      data: toMobileEventDetail(event, {
        engagement: engagementMap.get(id),
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load event' },
      { status: 500 }
    );
  }
}
