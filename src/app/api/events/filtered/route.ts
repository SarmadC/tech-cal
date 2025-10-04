import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { EventFilters } from '@/types';

// Rate limiter for filtered events API
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute per user
  analytics: true,
  prefix: 'events-filtered',
});

interface FilteredEventsRequest {
  searchTerm?: string;
  categories?: string[];
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  budget?: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'date' | 'popularity' | 'career-impact';
  page?: number;
  pageSize?: number;
  // Additional filters from useSmartFilters
  availability?: 'all' | 'available' | 'no-conflicts';
  popularity?: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration?: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  myTracked?: boolean;
  myNetwork?: boolean;
  recommended?: boolean;
}

interface FilteredEventsResponse {
  success: boolean;
  data?: {
    events: unknown[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    };
    filters: {
      applied: Record<string, unknown>;
      available: {
        categories: Array<{ id: string; name: string; count: number }>;
        difficulties: Array<{ value: string; count: number }>;
        formats: Array<{ value: string; count: number }>;
      };
    };
    stats: {
      processingTimeMs: number;
      filteredCount: number;
      totalCount: number;
    };
  };
  error?: string;
}

/**
 * POST /api/events/filtered
 * Server-side event filtering with pagination and statistics
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

    // Parse and validate request
    const body: FilteredEventsRequest = await request.json();
    const {
      searchTerm,
      categories = [],
      format = 'all',
    budget = 'all',
      cost = 'all',
      difficulty = 'all',
      dateRange,
      sortBy = 'date',
      page = 1,
      pageSize = 50,
      availability: _availability = 'all',
      popularity = 'all',
      duration = 'all',
      myTracked: _myTracked = false,
      myNetwork = false,
      recommended = false
    } = body;

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Build comprehensive server-side filters
    const eventFilters: EventFilters = {
      categories: categories.length > 0 ? categories : undefined,
      searchTerm: searchTerm || undefined,
      startDate: dateRange?.start ? new Date(dateRange.start) : undefined,
      endDate: dateRange?.end ? new Date(dateRange.end) : undefined,
      format: format !== 'all' ? format : undefined,
    budget: budget !== 'all' ? budget : undefined,
      cost: cost !== 'all' ? cost : undefined,
      difficulty: difficulty !== 'all' ? difficulty : undefined,
      availability: _availability !== 'all' ? _availability : undefined,
      popularity: popularity !== 'all' ? popularity : undefined,
      duration: duration !== 'all' ? duration : undefined,
      myTracked: _myTracked || undefined,
      myNetwork: myNetwork || undefined,
      recommended: recommended || undefined,
      sortBy: sortBy !== 'date' ? sortBy : undefined
    };

    // Get user's career profile for scoring and cold start detection
    let careerProfile = null;
    try {
      careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
    } catch (_error) {
      // Profile might not exist for new users - this is fine
      console.log('No career profile found for user, skipping career impact scoring');
    }

    // Get events with cold start handling
    const { events: filteredEvents, totalCount: totalEvents, isColdStart } = await EventService.getEventsWithColdStartHandling(
      eventFilters,
      supabase,
      careerProfile,
      user.id,
      page,
      pageSize
    );

    // Enrich events with career impact scores (skip for cold start users to avoid double processing)
    const enrichedEvents = isColdStart 
      ? filteredEvents // Cold start events already have metadata
      : await EventService.enrichEventsWithCareerImpact(
          filteredEvents,
          careerProfile,
          supabase,
          user.id
        );

    // Generate filter statistics (simplified since filtering is now at database level)
    const availableFilters = {
      categories: await getAvailableCategories(supabase),
      difficulties: [
        { value: 'beginner', count: 0 }, // Would need separate queries for accurate counts
        { value: 'intermediate', count: 0 },
        { value: 'advanced', count: 0 },
      ],
      formats: [
        { value: 'virtual', count: 0 }, // Would need separate queries for accurate counts
        { value: 'in-person', count: 0 },
        { value: 'hybrid', count: 0 },
      ]
    };

    const processingTime = Date.now() - startTime;

    const response: FilteredEventsResponse = {
      success: true,
      data: {
        events: enrichedEvents,
        pagination: {
          page,
          pageSize,
          total: totalEvents,
          hasMore: page * pageSize < totalEvents
        },
        filters: {
          applied: { searchTerm, categories, format, cost, difficulty, dateRange, sortBy },
          available: availableFilters
        },
        stats: {
          processingTimeMs: processingTime,
          filteredCount: enrichedEvents.length,
          totalCount: totalEvents
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Filtered events API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper methods for server-side filtering
async function getAvailableCategories(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Array<{ id: string; name: string; count: number }>> {
  try {
    const { data } = await supabase
      .from('event_type')
      .select('id, name')
      .order('name');

    return (data || [])
      .filter(item => item.name) // Filter out null names
      .map(item => ({
        id: item.id,
        name: item.name!,
        count: 0 // Will be calculated by frontend if needed
      }));
  } catch {
    return [];
  }
}
