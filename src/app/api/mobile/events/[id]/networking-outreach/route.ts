import { mobileLinkedInOutreachLogSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';

import { EventFeedbackService } from '@/services/eventFeedbackService';
import { EventNetworkingSummaryService } from '@/services/eventNetworkingSummaryService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const authContext = await getAuthenticatedRequestContext(_request as never);
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

    const existingFeedback = await EventFeedbackService.getFeedbackForEvent(
      eventId,
      authContext.user.id,
      authContext.supabase
    );

    const networkingSummary =
      await EventNetworkingSummaryService.incrementLinkedInRequestsSent(
        eventId,
        authContext.user.id,
        authContext.supabase
      );

    return NextResponse.json({
      success: true,
      data: mobileLinkedInOutreachLogSchema.parse({
        eventId,
        connectionsMade: existingFeedback?.connectionsMade ?? 0,
        linkedinRequestsSent: networkingSummary.linkedinRequestsSent ?? 0,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to log LinkedIn outreach',
      },
      { status: 500 }
    );
  }
}
