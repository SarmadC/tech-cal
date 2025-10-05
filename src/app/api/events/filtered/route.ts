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
  console.log('[API] Starting filtered events request');
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('[API] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[API] User authenticated:', user.id);

    // Apply rate limiting (skip in development if KV not configured)
    try {
      const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
      if (!rateLimitSuccess) {
        console.log('[API] Rate limit exceeded for user:', user.id);
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Skip rate limiting if KV is not configured (development mode)
      const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : 'Unknown rate limit error';
      console.log('[API] Rate limiting skipped (KV not configured):', errorMessage);
    }

    // Parse and validate request
    const body: FilteredEventsRequest = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
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
    } catch (error) {
      // Profile might not exist for new users - this is fine
      console.log('No career profile found for user, skipping career impact scoring:', error);
    }

    // Get events with cold start handling
    let filteredEvents, totalEvents, isColdStart;
    try {
      console.log('[API] Attempting to fetch events with filters:', JSON.stringify(eventFilters, null, 2));
      
      // Try the simplest possible query first
      try {
        const { data: simpleEvents, error: simpleError } = await supabase
          .from('events')
          .select(`
            *,
            organizers (
              id,
              name,
              logo_url
            )
          `)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(pageSize);
          
        if (simpleError) {
          console.error('[API] Simple events query failed:', simpleError);
          throw simpleError;
        }
        
        console.log('[API] Simple query successful, events count:', simpleEvents?.length || 0);
        filteredEvents = (simpleEvents || []).map((event: Record<string, unknown>) => {
          // Helper function to get logo URL (similar to transformers.ts)
          const getLogoUrl = (logoUrl: string | null | undefined, _organizerName?: string): string | undefined => {
            if (!logoUrl) return undefined;
            
            // If it's already a full URL (starts with http), return as-is
            if (logoUrl.startsWith('http')) {
              return logoUrl;
            }
            
            // If it's a domain name (contains a dot but no file extension), use Logo.dev API
            if (logoUrl.includes('.') && !logoUrl.includes('/') && !logoUrl.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
              // Special handling for known companies with better transparent logos
              const specialLogos: Record<string, string> = {
                'meta.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
                'facebook.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
              };
              
              if (specialLogos[logoUrl]) {
                return specialLogos[logoUrl];
              }
              
              // Logo.dev API with SVG format for better scalability
              return `https://img.logo.dev/${logoUrl}?token=pk_GQL0xmfkStGE1eRKNPXh4A&format=svg&size=24`;
            }
            
            // If it's a filename (including SVG), construct Supabase storage URL
            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!baseUrl) {
              return undefined;
            }
            return `${baseUrl}/storage/v1/object/public/logos/${logoUrl}`;
          };

          // Extract organizer data from the nested structure
          const organizer = event.organizers as { id: string; name: string; logo_url?: string } | null;
          const organizerLogo = getLogoUrl(organizer?.logo_url, organizer?.name);

          return {
            id: event.id as string,
            title: (event.title as string) || 'Untitled Event',
            description: (event.description as string) || '',
            startTime: event.start_time as string,
            endTime: event.end_time as string,
            eventTypeId: (event.event_type_id as string) || '',
            organizerId: event.organizer_id as string,
            attendeeCount: (event.attendee_count as number) || 0,
            location: (event.location as string) || '',
            format: (event.event_format as string) || 'virtual', // Use actual event_format column
            cost: (event.pricing_type as string) === 'free' ? 'free' : 'paid', // Map pricing_type to cost
            difficulty: ((event.difficulty_level as string) || 'beginner') as 'beginner' | 'intermediate' | 'advanced', // Use actual difficulty_level column
            color: '#3B82F6', // Default color
            tags: [], // Default empty tags
            careerImpactScore: 0, // Default score
            careerImpactComponents: {}, // Default components
            createdAt: event.created_at as string,
            status: ((event.status_enum as string) || 'upcoming') as 'upcoming' | 'live' | 'ended' | 'cancelled', // Use actual status_enum
            sourceUrl: (event.source_url as string) || '',
            livestreamUrl: (event.livestream_url as string) || '',
            organizer: organizer?.name || 'Unknown Organizer',
            organization: {
              id: organizer?.id || '',
              name: organizer?.name || 'Unknown',
              ...(organizerLogo && { logo: organizerLogo })
            }
          };
        });
        
        totalEvents = filteredEvents.length;
        isColdStart = false;
        
      } catch (simpleError) {
        console.error('[API] Simple query also failed, trying EventService.getEvents:', simpleError);
        
        // Fallback to EventService.getEvents
        const basicResult = await EventService.getEvents(eventFilters, supabase, page, pageSize);
        console.log('[API] EventService.getEvents successful, count:', basicResult.length);
        
        filteredEvents = basicResult;
        totalEvents = await EventService.getEventCount(eventFilters, supabase);
        console.log('[API] Total events count:', totalEvents);
        
        isColdStart = false;
      }
      
    } catch (error) {
      console.error('[API] All event fetching methods failed:', error);
      console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Enrich events with career impact scores (skip for cold start users to avoid double processing)
    let enrichedEvents;
    try {
      enrichedEvents = isColdStart 
        ? filteredEvents // Cold start events already have metadata
        : await EventService.enrichEventsWithCareerImpact(
            filteredEvents,
            careerProfile,
            supabase,
            user.id
          );
    } catch (error) {
      console.error('Error enriching events with career impact:', error);
      // Fallback to using events without enrichment
      enrichedEvents = filteredEvents;
    }

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

    console.log('[API] Returning successful response with', enrichedEvents.length, 'events');
    console.log('[API] Response structure:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] Filtered events API error:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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

// Helper functions removed - all filtering now handled at database level in EventService

// Helper functions removed - all filtering now handled at database level in EventService
