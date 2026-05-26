import { mobileEventAgendaSaveSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { EventAgendaSaveService } from '@/services/eventAgendaSaveService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ id: string; agendaItemId: string }>;
}

async function setSaved(request: Request, context: RouteContext, isSaved: boolean) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id, agendaItemId } = await context.params;
    const eventId = decodeURIComponent(id ?? '').trim();
    const decodedAgendaItemId = decodeURIComponent(agendaItemId ?? '').trim();

    if (!eventId || !decodedAgendaItemId) {
      return NextResponse.json(
        { success: false, error: 'Event id and agenda item id are required' },
        { status: 400 }
      );
    }

    await EventAgendaSaveService.setAgendaItemSaved(
      {
        eventId,
        agendaItemId: decodedAgendaItemId,
        userId: authContext.user.id,
        isSaved,
      },
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      data: mobileEventAgendaSaveSchema.parse({
        eventId,
        agendaItemId: decodedAgendaItemId,
        isSaved,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update agenda session save';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  return setSaved(request, context, true);
}

export async function DELETE(request: Request, context: RouteContext) {
  return setSaved(request, context, false);
}
