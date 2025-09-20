import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerImpactService } from '@/services/careerImpactService';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { Event } from '@/types';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';
import { CareerProfile } from '@/types/career';

// Rate limiter for batch career impact API
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute per user
  analytics: true,
  prefix: 'career-impact-batch',
});

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
 * Cache-optimized batch processing
 * Checks cache first, only calculates missing scores
 */
async function processBatchWithCache(
  events: Event[],
  careerProfile: CareerProfile,
  profileHash: string,
  options: CareerImpactCalculationOptions
) {
  // Check cache for all events
  const eventIds = events.map(e => e.id);
  const cached = await CareerImpactCache.mget(eventIds, profileHash);

  // Separate cached vs uncached events
  const uncachedEvents = events.filter(event => !cached.has(event.id));
  const scores = new Map();
  const errors: Array<{ eventId: string; error: string }> = [];
  const cachedCount = cached.size;

  // Add cached scores using CareerImpactService helper
  cached.forEach((score, eventId) => {
    scores.set(eventId, {
      overall: score.overall,
      confidence: score.confidence,
      components: CareerImpactService.EMPTY_COMPONENTS,
      explanation: {
        careerImpactCategory: score.category,
        reasons: [`Cached result for ${score.category} impact event`],
        matchedSkills: [],
        speakerHighlights: [],
        confidenceFactors: [`${Math.round(score.confidence * 100)}% confidence`]
      }
    });
  });

  // Calculate uncached scores if any
  if (uncachedEvents.length > 0) {
    const batchResult = await CareerImpactService.calculateBatchCareerImpact(
      { events: uncachedEvents, careerProfile },
      options
    );

    // Add calculated scores and cache them
    const cacheEntries = new Map();
    batchResult.scores.forEach((score, eventId) => {
      scores.set(eventId, score);

      // Prepare for caching
      const lite = {
        overall: score.overall,
        confidence: score.confidence,
        category: score.explanation.careerImpactCategory
      };
      cacheEntries.set(eventId, { score: lite, eventId });
    });

    // Cache new results asynchronously
    if (cacheEntries.size > 0) {
      CareerImpactCache.mset(cacheEntries, profileHash).catch(error => {
        console.warn('Batch cache set failed:', error);
      });
    }

    // Add any errors
    batchResult.errors?.forEach(error => errors.push(error));
  }

  return {
    scores,
    errors: errors.length > 0 ? errors : undefined,
    stats: {
      total: events.length,
      successful: scores.size,
      errors: errors.length,
      cached: cachedCount,
      processingTimeMs: 0 // Will be updated by caller
    }
  };
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

    // Apply rate limiting
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
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

    // Stricter limits for performance
    if (eventIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 events allowed per batch request' },
        { status: 400 }
      );
    }

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });

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
    const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

    // Cache-optimized batch processing
    const batchResult = await Promise.race([
      processBatchWithCache(validEvents, careerProfile, profileHash, options),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof processBatchWithCache>>;

    // Update processing time
    batchResult.stats.processingTimeMs = Date.now() - startTime;

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
        category: score.category || score.explanation?.careerImpactCategory || 'low',
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

    const response: BatchScoreResponse = {
      success: true,
      data: {
        scores,
        ...(includeEvents && { events: eventsData }),
        stats: batchResult.stats,
        ...(batchResult.errors && batchResult.errors.length > 0 && { errors: batchResult.errors })
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
