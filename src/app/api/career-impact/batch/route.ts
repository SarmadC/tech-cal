import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerImpactService } from '@/services/careerImpactService';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { Event } from '@/types';

interface BatchScoreRequestBody {
  eventIds: string[];
  options?: CareerImpactCalculationOptions;
  includeEvents?: boolean; // Whether to include event data in response
}

interface BatchScoreResponse {
  success: boolean;
  data?: {
    scores: Record<string, {
      overall: number;
      confidence: number;
      category: string;
      components?: Record<string, number>;
      explanation?: {
        careerImpactCategory: string;
        reasons: string[];
        matchedSkills: string[];
        speakerHighlights: string[];
        confidenceFactors: string[];
      };
    }>;
    events?: Record<string, Event>; // Optional event data
    stats: {
      total: number;
      successful: number;
      errors: number;
      cached: number;
      processingTimeMs: number;
    };
    errors?: Array<{ eventId: string; error: string }>;
  };
  error?: string;
}

/**
 * POST /api/career-impact/batch
 * Calculate career impact scores for multiple events
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
    let body: BatchScoreRequestBody;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { eventIds, options = {}, includeEvents = false } = body;

    // Validate input
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'eventIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (eventIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 events allowed per batch request' },
        { status: 400 }
      );
    }

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = CareerProfileService.getCareerProfile(userProfile);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    // Get events data
    const events = await EventService.getEventsByIds(eventIds, supabase);
    const eventMap = new Map(events.map(event => [event.id, event]));

    // Filter out events that weren't found
    const validEvents = eventIds
      .map(id => eventMap.get(id))
      .filter((event): event is Event => event !== undefined);

    if (validEvents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid events found' },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    // Calculate batch career impact scores
    const batchResult = await CareerImpactService.calculateBatchCareerImpact(
      { events: validEvents, careerProfile },
      options
    );

    // Transform results for API response
    const scores: Record<string, {
      overall: number;
      confidence: number;
      category: string;
      components?: Record<string, number>;
      explanation?: {
        careerImpactCategory: string;
        reasons: string[];
        matchedSkills: string[];
        speakerHighlights: string[];
        confidenceFactors: string[];
      };
    }> = {};
    const eventsData: Record<string, Event> = {};

    batchResult.scores.forEach((score, eventId) => {
      scores[eventId] = {
        overall: score.overall,
        confidence: score.confidence,
        category: score.explanation.careerImpactCategory,
        ...(options.includeExplanations !== false && {
          components: score.components,
          explanation: score.explanation
        })
      };

      if (includeEvents) {
        const event = eventMap.get(eventId);
        if (event) {
          eventsData[eventId] = event;
        }
      }
    });

    // Calculate cache hit rate (simplified)
    const cacheHits = batchResult.stats.cachedScores || 0;

    const response: BatchScoreResponse = {
      success: true,
      data: {
        scores,
        ...(includeEvents && { events: eventsData }),
        stats: {
          total: eventIds.length,
          successful: batchResult.scores.size,
          errors: batchResult.errors.length,
          cached: cacheHits,
          processingTimeMs: Date.now() - startTime
        },
        ...(batchResult.errors.length > 0 && { errors: batchResult.errors })
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Career impact batch API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
