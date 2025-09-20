import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerAnalyticsService } from '@/services/careerAnalyticsService';
import { UserEventService } from '@/services/userEventService';
import { EventService } from '@/services/eventServices';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Rate limiter for analytics API - Increased for dashboard usage
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  analytics: true,
  prefix: 'dashboard-analytics',
});

interface AnalyticsRequest {
  includeRecommendations?: boolean;
  eventLimit?: number;
}

interface AnalyticsResponse {
  success: boolean;
  data?: {
    analytics: unknown;
    recommendations?: unknown[];
    stats: {
      processingTimeMs: number;
      eventsProcessed: number;
      trackedEventsCount: number;
    };
  };
  error?: string;
}

/**
 * GET /api/dashboard/analytics
 * Server-side career analytics generation
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

    // Apply rate limiting
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const includeRecommendations = url.searchParams.get('includeRecommendations') === 'true';
    const eventLimit = Math.min(parseInt(url.searchParams.get('eventLimit') || '50'), 100);

    const startTime = Date.now();

    // Load user data server-side
    const [trackedEventsResult, upcomingEventsResult] = await Promise.allSettled([
      UserEventService.getLightweightTrackedEvents(user.id, supabase),
      EventService.getEvents({ startDate: new Date() }, supabase, 1, eventLimit)
    ]);

    // Handle data loading failures gracefully
    const trackedEvents = trackedEventsResult.status === 'fulfilled' ? trackedEventsResult.value : [];
    const upcomingEvents = upcomingEventsResult.status === 'fulfilled' ? upcomingEventsResult.value : [];

    // Get user profile for analytics
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Convert database profile to AppProfile format
    const appProfile = {
      id: profileData.id,
      fullName: profileData.full_name,
      avatarUrl: profileData.avatar_url,
      currentRole: null, // Not in profiles table
      seniority: null, // Not in profiles table
      industry: null, // Not in profiles table
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
      analyticsConsent: profileData.analytics_consent,
      analyticsConsentDate: profileData.analytics_consent_date,
      bookmarkCountToday: profileData.bookmark_count_today || 0,
      timezone: profileData.timezone,
      preferences: profileData.preferences,
      lastViewedEvent: null, // Not in profiles table
      lastViewedEventDate: null // Not in profiles table
    };

    // Generate analytics server-side with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analytics calculation timeout')), 15000); // 15 second timeout
    });

    const analyticsPromises = [
      Promise.race([
        CareerAnalyticsService.generateCareerAnalytics(appProfile, trackedEvents, upcomingEvents),
        timeoutPromise
      ])
    ];

    if (includeRecommendations) {
      analyticsPromises.push(
        Promise.race([
          CareerAnalyticsService.generateCareerRecommendations(appProfile, trackedEvents, upcomingEvents),
          timeoutPromise
        ])
      );
    }

    const [analyticsResult, recommendationsResult] = await Promise.allSettled(analyticsPromises);

    // Handle results
    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
    const recommendations = recommendationsResult?.status === 'fulfilled' ? recommendationsResult.value as unknown[] : [];

    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate analytics' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    const response: AnalyticsResponse = {
      success: true,
      data: {
        analytics,
        recommendations: includeRecommendations ? recommendations : undefined,
        stats: {
          processingTimeMs: processingTime,
          eventsProcessed: upcomingEvents.length,
          trackedEventsCount: trackedEvents.length,
        }
      }
    };

    // Add cache headers for performance
    const responseWithCache = NextResponse.json(response);
    responseWithCache.headers.set('Cache-Control', 'private, max-age=300'); // 5 minute cache
    responseWithCache.headers.set('X-Processing-Time', processingTime.toString());
    
    return responseWithCache;

  } catch (error) {
    console.error('Dashboard analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/analytics  
 * Server-side analytics with custom parameters
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
    const body: AnalyticsRequest = await request.json();
    const { includeRecommendations = true, eventLimit = 50 } = body;

    // Validate input
    if (eventLimit > 100) {
      return NextResponse.json(
        { success: false, error: 'Event limit cannot exceed 100' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Load user data server-side (same logic as GET)
    const [trackedEventsResult, upcomingEventsResult] = await Promise.allSettled([
      UserEventService.getLightweightTrackedEvents(user.id, supabase),
      EventService.getEvents({ startDate: new Date() }, supabase, 1, eventLimit)
    ]);

    const trackedEvents = trackedEventsResult.status === 'fulfilled' ? trackedEventsResult.value : [];
    const upcomingEvents = upcomingEventsResult.status === 'fulfilled' ? upcomingEventsResult.value : [];

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Convert database profile to AppProfile format
    const appProfile = {
      id: profileData.id,
      fullName: profileData.full_name,
      avatarUrl: profileData.avatar_url,
      currentRole: null, // Not in profiles table
      seniority: null, // Not in profiles table
      industry: null, // Not in profiles table
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
      analyticsConsent: profileData.analytics_consent,
      analyticsConsentDate: profileData.analytics_consent_date,
      bookmarkCountToday: profileData.bookmark_count_today || 0,
      timezone: profileData.timezone,
      preferences: profileData.preferences,
      lastViewedEvent: null, // Not in profiles table
      lastViewedEventDate: null // Not in profiles table
    };

    // Generate analytics and recommendations server-side
    const [analyticsResult, recommendationsResult] = await Promise.allSettled([
      CareerAnalyticsService.generateCareerAnalytics(appProfile, trackedEvents, upcomingEvents),
      includeRecommendations
        ? CareerAnalyticsService.generateCareerRecommendations(appProfile, trackedEvents, upcomingEvents)
        : Promise.resolve([])
    ]);

    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
    const recommendations = recommendationsResult.status === 'fulfilled' ? recommendationsResult.value : [];

    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate analytics' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    const response: AnalyticsResponse = {
      success: true,
      data: {
        analytics,
        recommendations: includeRecommendations ? recommendations : undefined,
        stats: {
          processingTimeMs: processingTime,
          eventsProcessed: upcomingEvents.length,
          trackedEventsCount: trackedEvents.length,
        }
      }
    };

    // Add cache headers for performance
    const responseWithCache = NextResponse.json(response);
    responseWithCache.headers.set('Cache-Control', 'private, max-age=300'); // 5 minute cache
    responseWithCache.headers.set('X-Processing-Time', processingTime.toString());
    
    return responseWithCache;

  } catch (error) {
    console.error('Dashboard analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
