import { NextResponse } from 'next/server';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { toMobileEventDetail } from '@/app/api/mobile/serializers';
import { EventAgendaSaveService } from '@/services/eventAgendaSaveService';
import { EventService } from '@/services/eventServices';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { createAdminClient } from '@/utils/supabase/server';

const EMPTY_NETWORKING_PULSE = {
  state: 'empty' as const,
  trendingTopic: null,
  mostSavedSession: null,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return String(error || 'Unknown error');
}

async function loadMobileEventDetailSource(
  id: string,
  supabase: NonNullable<
    Awaited<ReturnType<typeof getAuthenticatedRequestContext>>
  >['supabase']
) {
  try {
    return await EventService.getEventWithAgenda(id, supabase);
  } catch (error) {
    const message = getErrorMessage(error);

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
    const networkingPulsePromise = createAdminClient()
      .then((adminClient) =>
        EventAgendaSaveService.buildNetworkingPulse(
          {
            eventId: id,
            agenda: event.agenda ?? [],
          },
          adminClient
        )
      )
      .catch((error) => {
        console.warn('[mobile/events] Networking pulse unavailable', {
          eventId: id,
          message: getErrorMessage(error),
        });
        return EMPTY_NETWORKING_PULSE;
      });
    const [engagementMap, savedAgendaItemIds, networkingPulse] = await Promise.all([
      loadEngagementMap(authContext.supabase, authContext.user.id, [id]).catch(
        (error) => {
          console.warn('[mobile/events] Engagement state unavailable', {
            eventId: id,
            message: getErrorMessage(error),
          });
          return new Map();
        }
      ),
      EventAgendaSaveService.getSavedAgendaItemIds(
        {
          eventId: id,
          userId: authContext.user.id,
        },
        authContext.supabase
      ).catch((error) => {
        console.warn('[mobile/events] Agenda save state unavailable', {
          eventId: id,
          message: getErrorMessage(error),
        });
        return new Set<string>();
      }),
      networkingPulsePromise,
    ]);

    return NextResponse.json({
      success: true,
      data: toMobileEventDetail(event, engagementMap.get(id), {
        savedAgendaItemIds,
        networkingPulse,
      }),
    });
  } catch (error) {
    const message = getErrorMessage(error) || 'Failed to load event detail';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
