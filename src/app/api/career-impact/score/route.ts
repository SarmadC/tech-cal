import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedJson, validationErrorJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { CareerImpactService } from '@/services/careerImpactService';
import { CareerProfileService } from '@/services/careerProfileService';
import { MemoizedProfileService } from '@/services/memoizedProfileService';
import { EventService } from '@/services/eventServices';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { createClient } from '@/utils/supabase/server';

interface ScoreRequestBody {
  eventId: string;
  options?: CareerImpactCalculationOptions;
}

interface ScoreResponse {
  success: boolean;
  data?: {
    eventId: string;
    careerImpact: {
      overall: number;
      confidence: number;
      category: string;
      components: Record<string, number>;
      explanation: {
        careerImpactCategory: string;
        reasons: string[];
        matchedSkills: string[];
        speakerHighlights: string[];
        confidenceFactors: string[];
      };
    };
    cached: boolean;
    processingTimeMs: number;
  };
  error?: string;
}

/**
 * GET /api/career-impact/score?eventId={id}&lite={boolean}
 * Calculate career impact score for a single event
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const lite = searchParams.get('lite') === 'true';
    const skipCache = searchParams.get('skipCache') === 'true';

    if (!eventId) return validationErrorJson('eventId parameter is required');

    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = await MemoizedProfileService.getCareerProfile(userProfile, supabase);
    if (!careerProfile) {
      return errorJson('Career profile not found. Please complete career onboarding.', 404);
    }

    const event = await EventService.getEventById(eventId, supabase);
    if (!event) return errorJson('Event not found', 404);

    const startTime = Date.now();
    const options: CareerImpactCalculationOptions = { skipCache };

    // Calculate score (lite or full)
    if (lite) {
      const careerImpactLite = await CareerImpactService.getCareerImpactScoreLiteAsync(
        { event, careerProfile },
        options
      );

      return NextResponse.json({
        success: true,
        data: {
          eventId,
          careerImpact: careerImpactLite,
          cached: !skipCache, // Simplified for lite version
          processingTimeMs: Date.now() - startTime
        }
      });
    } else {
      const careerImpact = await CareerImpactService.calculateCareerImpactScoreAsync(
        { event, careerProfile },
        options
      );

      return NextResponse.json({
        success: true,
        data: {
          eventId,
          careerImpact: {
            overall: careerImpact.overall,
            confidence: careerImpact.confidence,
            category: careerImpact.explanation.careerImpactCategory,
            components: careerImpact.components,
            explanation: careerImpact.explanation
          },
          cached: !skipCache, // Simplified cache indicator
          processingTimeMs: Date.now() - startTime
        }
      });
    }

  } catch (error) {
    console.error('Career impact score API error:', error);
    return catchErrorJson(error, 'Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    let body: ScoreRequestBody;
    try {
      body = await request.json();
    } catch (_error) {
      return validationErrorJson('Invalid JSON in request body');
    }

    const { eventId, options = {} } = body;
    if (!eventId) return validationErrorJson('eventId is required');

    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = await MemoizedProfileService.getCareerProfile(userProfile, supabase);
    if (!careerProfile) {
      return errorJson('Career profile not found. Please complete career onboarding.', 404);
    }

    const event = await EventService.getEventById(eventId, supabase);
    if (!event) return errorJson('Event not found', 404);

    const startTime = Date.now();

    // Calculate full career impact score
    const careerImpact = await CareerImpactService.calculateCareerImpactScoreAsync(
      { event, careerProfile },
      options
    );

    const response: ScoreResponse = {
      success: true,
      data: {
        eventId,
        careerImpact: {
          overall: careerImpact.overall,
          confidence: careerImpact.confidence,
          category: careerImpact.explanation.careerImpactCategory,
          components: careerImpact.components,
          explanation: careerImpact.explanation
        },
        cached: !options.skipCache,
        processingTimeMs: Date.now() - startTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Career impact score POST API error:', error);
    return catchErrorJson(error, 'Internal server error');
  }
}
