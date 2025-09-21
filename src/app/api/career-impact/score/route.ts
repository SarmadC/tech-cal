import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerImpactService } from '@/services/careerImpactService';
import { CareerProfileService } from '@/services/careerProfileService';
import { MemoizedProfileService } from '@/services/memoizedProfileService';
import { EventService } from '@/services/eventServices';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';

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
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const lite = searchParams.get('lite') === 'true';
    const skipCache = searchParams.get('skipCache') === 'true';

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId parameter is required' },
        { status: 400 }
      );
    }

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = MemoizedProfileService.getCareerProfile(userProfile);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    // Get event data
    const event = await EventService.getEventById(eventId, supabase);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/career-impact/score
 * Calculate career impact score with request body options
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    let body: ScoreRequestBody;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { eventId, options = {} } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId is required' },
        { status: 400 }
      );
    }

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = MemoizedProfileService.getCareerProfile(userProfile);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    // Get event data
    const event = await EventService.getEventById(eventId, supabase);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
