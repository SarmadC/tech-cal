import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Rate limiter for filtered events API
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  analytics: true,
  prefix: 'events-filtered',
});

interface FilteredEventsRequest {
  searchTerm?: string;
  categories?: string[];
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'date' | 'popularity' | 'career-impact';
  page?: number;
  pageSize?: number;
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
      cost = 'all',
      difficulty = 'all',
      dateRange,
      sortBy = 'date',
      page = 1,
      pageSize = 50
    } = body;

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Build server-side filters
    const eventFilters: Record<string, unknown> = {};
    
    if (searchTerm) {
      eventFilters.searchTerm = searchTerm;
    }
    
    if (categories.length > 0) {
      eventFilters.categories = categories;
    }
    
    if (dateRange?.start) {
      eventFilters.startDate = new Date(dateRange.start);
    }
    
    if (dateRange?.end) {
      eventFilters.endDate = new Date(dateRange.end);
    }

    // Get total count for pagination
    const totalEvents = await EventService.getEventCount(eventFilters, supabase);
    
    // Get filtered events with pagination
    const events = await EventService.getEvents(eventFilters, supabase, page, pageSize);

    // Apply additional client-side filters that can't be done in SQL
    let filteredEvents = events;

    // Format filtering
    if (format !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        const isVirtual = event.location?.toLowerCase().includes('virtual') || !!event.livestreamUrl;
        const isInPerson = !isVirtual && event.location !== 'TBA';
        
        switch (format) {
          case 'virtual': return isVirtual;
          case 'in-person': return isInPerson;
          case 'hybrid': return isVirtual && isInPerson;
          default: return true;
        }
      });
    }

    // Cost filtering (simplified server-side implementation)
    if (cost !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        // Simple heuristic - can be enhanced with actual pricing data
        const isFree = event.title?.toLowerCase().includes('free') || 
                      event.description?.toLowerCase().includes('free') ||
                      !event.title?.toLowerCase().includes('$');
        
        return cost === 'free' ? isFree : !isFree;
      });
    }

    // Difficulty filtering
    if (difficulty !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        const title = event.title?.toLowerCase() || '';
        const description = event.description?.toLowerCase() || '';
        
        switch (difficulty) {
          case 'beginner':
            return title.includes('beginner') || title.includes('intro') || title.includes('101');
          case 'intermediate':
            return title.includes('intermediate') || title.includes('advanced') || 
                   description.includes('experience required');
          case 'advanced':
            return title.includes('advanced') || title.includes('expert') || 
                   title.includes('senior');
          default:
            return true;
        }
      });
    }

    // Server-side sorting
    if (sortBy === 'date') {
      filteredEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else if (sortBy === 'popularity') {
      filteredEvents.sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0));
    }
    // Note: career-impact sorting would require career impact calculation

    // Generate filter statistics
    const availableFilters = {
      categories: await getAvailableCategories(supabase),
      difficulties: [
        { value: 'beginner', count: events.filter(e => getEventDifficulty(e) === 'beginner').length },
        { value: 'intermediate', count: events.filter(e => getEventDifficulty(e) === 'intermediate').length },
        { value: 'advanced', count: events.filter(e => getEventDifficulty(e) === 'advanced').length },
      ],
      formats: [
        { value: 'virtual', count: events.filter(e => isVirtualEvent(e)).length },
        { value: 'in-person', count: events.filter(e => isInPersonEvent(e)).length },
        { value: 'hybrid', count: events.filter(e => isHybridEvent(e)).length },
      ]
    };

    const processingTime = Date.now() - startTime;

    const response: FilteredEventsResponse = {
      success: true,
      data: {
        events: filteredEvents,
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
          filteredCount: filteredEvents.length,
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

function getEventDifficulty(event: { title?: string | null; description?: string | null }): string {
  const title = event.title?.toLowerCase() || '';
  const _description = event.description?.toLowerCase() || '';

  if (title.includes('beginner') || title.includes('intro') || title.includes('101')) {
    return 'beginner';
  }
  if (title.includes('advanced') || title.includes('expert') || title.includes('senior')) {
    return 'advanced';
  }
  return 'intermediate';
}

function isVirtualEvent(event: { location?: string | null; livestreamUrl?: string | null }): boolean {
  return event.location?.toLowerCase().includes('virtual') || !!event.livestreamUrl;
}

function isInPersonEvent(event: { location?: string | null; livestreamUrl?: string | null }): boolean {
  return !isVirtualEvent(event) && event.location !== 'TBA';
}

function isHybridEvent(event: { location?: string | null; livestreamUrl?: string | null }): boolean {
  return isVirtualEvent(event) && isInPersonEvent(event);
}
