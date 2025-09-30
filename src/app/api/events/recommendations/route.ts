import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { Event } from '@/types';

// Rate limiter for recommendations
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  analytics: true,
  prefix: 'event-recommendations',
});

interface RecommendationResponse {
  success: boolean;
  data?: {
    events: Event[];
    total: number;
    matchedTags: string[];
    processingTimeMs: number;
  };
  error?: string;
}

/**
 * GET /api/events/recommendations
 * Get tag-based recommended events for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<RecommendationResponse>> {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    const startTime = Date.now();

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = await CareerProfileService.getCareerProfile(userProfile.id, supabase);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    let events: Event[] = [];
    let matchedTags: string[] = [];

    if (tags.length > 0) {
      // Search by specific tags
      events = await EventService.searchEventsByTags(tags, supabase, limit);
      matchedTags = tags;
    } else {
      // Get tag-based recommendations
      events = await EventService.getRecommendedEventsByTags(
        user.id,
        careerProfile,
        supabase,
        limit
      );
      
      // Extract matched tags from events
      const allTags = events.flatMap(event => event.tags?.map((tag) => tag.name) || []);
      matchedTags = [...new Set(allTags)];
    }

    const processingTime = Date.now() - startTime;

    const response: RecommendationResponse = {
      success: true,
      data: {
        events,
        total: events.length,
        matchedTags,
        processingTimeMs: processingTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Event recommendations API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
