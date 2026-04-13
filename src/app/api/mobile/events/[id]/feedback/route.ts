import {
  mobileEventNetworkingFeedbackSchema,
  mobileEventNetworkingFeedbackUpdateSchema,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { EventService } from '@/services/eventServices';
import { EventFeedbackService } from '@/services/eventFeedbackService';
import { EventNetworkingSummaryService } from '@/services/eventNetworkingSummaryService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getPredictedScore(overallScore: number | null | undefined) {
  if (typeof overallScore !== 'number' || Number.isNaN(overallScore)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(overallScore)));
}

function getEventOverallScore(event: unknown): number | null | undefined {
  if (
    event &&
    typeof event === 'object' &&
    'careerImpact' in event &&
    event.careerImpact &&
    typeof event.careerImpact === 'object' &&
    'overall' in event.careerImpact
  ) {
    const overall = event.careerImpact.overall;
    return typeof overall === 'number' ? overall : null;
  }

  return null;
}

async function resolveEventId(context: RouteContext) {
  const { id } = await context.params;
  return decodeURIComponent(id ?? '').trim();
}

export async function GET(request: Request, context: RouteContext) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const eventId = await resolveEventId(context);
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event id is required' },
        { status: 400 }
      );
    }

    const [feedback, networkingSummary] = await Promise.all([
      EventFeedbackService.getFeedbackForEvent(
        eventId,
        authContext.user.id,
        authContext.supabase
      ),
      EventNetworkingSummaryService.getSummaryForEvent(
        eventId,
        authContext.user.id,
        authContext.supabase
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: mobileEventNetworkingFeedbackSchema.parse({
        eventId,
        connectionsMade: feedback?.connectionsMade ?? null,
        linkedinRequestsSent: networkingSummary?.linkedinRequestsSent ?? null,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load networking feedback',
      },
      { status: 500 }
    );
  }
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
    const eventId = await resolveEventId(context);
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event id is required' },
        { status: 400 }
      );
    }

    const payload = mobileEventNetworkingFeedbackUpdateSchema.parse(
      await request.json().catch(() => ({}))
    );

    const [existingFeedback, existingNetworkingSummary] = await Promise.all([
      EventFeedbackService.getFeedbackForEvent(
        eventId,
        authContext.user.id,
        authContext.supabase
      ),
      EventNetworkingSummaryService.getSummaryForEvent(
        eventId,
        authContext.user.id,
        authContext.supabase
      ),
    ]);

    let nextConnectionsMade = existingFeedback?.connectionsMade ?? null;
    let nextLinkedInRequestsSent =
      existingNetworkingSummary?.linkedinRequestsSent ?? null;

    if (Object.prototype.hasOwnProperty.call(payload, 'connectionsMade')) {
      nextConnectionsMade = payload.connectionsMade ?? null;

      if (existingFeedback) {
        await EventFeedbackService.updateFeedback(
          existingFeedback.id,
          {
            connectionsMade: nextConnectionsMade,
          },
          authContext.supabase
        );
      } else if (nextConnectionsMade != null) {
        const event = await EventService.getEventById(
          eventId,
          authContext.supabase
        );
        await EventFeedbackService.submitFeedback(
          {
            eventId,
            userId: authContext.user.id,
            actualValueRating: null,
            careerBenefit: null,
            connectionsMade: nextConnectionsMade,
            skillsGained: null,
            wouldRecommend: null,
            feedbackText: null,
            predictedScore: getPredictedScore(getEventOverallScore(event)),
          },
          authContext.supabase
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'linkedinRequestsSent')) {
      nextLinkedInRequestsSent = payload.linkedinRequestsSent ?? null;
      await EventNetworkingSummaryService.setLinkedInRequestsSent(
        {
          eventId,
          userId: authContext.user.id,
          linkedinRequestsSent: nextLinkedInRequestsSent,
          lastOutreachLoggedAt:
            nextLinkedInRequestsSent == null
              ? null
              : nextLinkedInRequestsSent ===
                  existingNetworkingSummary?.linkedinRequestsSent
                ? existingNetworkingSummary?.lastOutreachLoggedAt ?? null
                : new Date().toISOString(),
        },
        authContext.supabase
      );
    }

    return NextResponse.json({
      success: true,
      data: mobileEventNetworkingFeedbackSchema.parse({
        eventId,
        connectionsMade: nextConnectionsMade,
        linkedinRequestsSent: nextLinkedInRequestsSent,
      }),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid networking feedback payload'
        : error instanceof Error
          ? error.message
          : 'Failed to update networking feedback';

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
