import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { CareerImpactUtils } from '@/utils/careerImpactUtils';
import { CareerProfile } from '@/types/career';

interface AnalyticsResponse {
  success: boolean;
  data?: {
    overview: {
      averageScore: number;
      totalEventsAnalyzed: number;
      highImpactEvents: number;
      improvementTrend: 'improving' | 'stable' | 'declining';
    };
    breakdown: {
      byCategory: Array<{
        category: string;
        averageScore: number;
        eventCount: number;
      }>;
      byTimeframe: Array<{
        period: string;
        averageScore: number;
        eventCount: number;
      }>;
    };
    recommendations: Array<{
      type: 'skill_gap' | 'career_stage' | 'networking' | 'industry';
      message: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  error?: string;
}

/**
 * GET /api/career-impact/analytics
 * Get career impact analytics for the authenticated user
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

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = CareerProfileService.getCareerProfile(userProfile);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get recent events for analysis
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));

    const events = await EventService.getEvents({
      startDate: cutoffDate
    }, supabase, 1, limit);

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            averageScore: 0,
            totalEventsAnalyzed: 0,
            highImpactEvents: 0,
            improvementTrend: 'stable' as const
          },
          breakdown: {
            byCategory: [],
            byTimeframe: []
          },
          recommendations: []
        }
      });
    }

    // Calculate career impact for events (using lite version for performance)
    const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpactLite(
      events,
      careerProfile
    );

    // Filter events with career impact scores
    const scoredEvents = enhancedEvents.filter(event => event.careerImpactLite);

    // Calculate overview metrics
    const scores = scoredEvents.map(event => event.careerImpactLite!.overall);
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const highImpactEvents = scores.filter(score => score >= 80).length;

    // Calculate improvement trend (simplified)
    const recentScores = scores.slice(-10);
    const olderScores = scores.slice(0, -10);
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length : 0;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : 0;
    
    let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > olderAvg + 5) improvementTrend = 'improving';
    else if (recentAvg < olderAvg - 5) improvementTrend = 'declining';

    // Breakdown by category
    const categoryBreakdown = scoredEvents.reduce((acc, event) => {
      const category = event.category?.name || 'Other';
      if (!acc[category]) {
        acc[category] = { scores: [], count: 0 };
      }
      acc[category].scores.push(event.careerImpactLite!.overall);
      acc[category].count++;
      return acc;
    }, {} as Record<string, { scores: number[]; count: number }>);

    const byCategory = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      eventCount: data.count
    }));

    // Breakdown by timeframe (weekly for last month)
    const byTimeframe = generateTimeframeBreakdown(scoredEvents, parseInt(timeframe));

    // Generate recommendations based on career profile and scores
    const recommendations = generateRecommendations(careerProfile, scoredEvents, averageScore);

    const response: AnalyticsResponse = {
      success: true,
      data: {
        overview: {
          averageScore: Math.round(averageScore),
          totalEventsAnalyzed: scoredEvents.length,
          highImpactEvents,
          improvementTrend
        },
        breakdown: {
          byCategory: byCategory.sort((a, b) => b.averageScore - a.averageScore),
          byTimeframe
        },
        recommendations
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Career impact analytics API error:', error);
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
 * Generate timeframe breakdown (weekly buckets)
 */
function generateTimeframeBreakdown(
  events: Array<{ startTime: string; careerImpactLite?: { overall: number } }>,
  timeframeDays: number
): Array<{ period: string; averageScore: number; eventCount: number }> {
  const now = new Date();
  const buckets: Record<string, { scores: number[]; count: number }> = {};

  // Create weekly buckets
  const weeksToShow = Math.ceil(timeframeDays / 7);
  for (let i = 0; i < weeksToShow; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekKey = `Week of ${weekStart.toLocaleDateString()}`;
    buckets[weekKey] = { scores: [], count: 0 };
  }

  // Distribute events into buckets
  events.forEach(event => {
    if (!event.careerImpactLite) return;
    
    const eventDate = new Date(event.startTime);
    const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(daysAgo / 7);
    
    if (weekIndex < weeksToShow) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (weekIndex + 1) * 7);
      const weekKey = `Week of ${weekStart.toLocaleDateString()}`;
      
      if (buckets[weekKey]) {
        buckets[weekKey].scores.push(event.careerImpactLite.overall);
        buckets[weekKey].count++;
      }
    }
  });

  return Object.entries(buckets)
    .map(([period, data]) => ({
      period,
      averageScore: data.scores.length > 0 
        ? Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length)
        : 0,
      eventCount: data.count
    }))
    .filter(item => item.eventCount > 0)
    .reverse(); // Most recent first
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  _careerProfile: CareerProfile,
  events: Array<{ careerImpactLite?: { overall: number }; category?: { name: string } }>,
  averageScore: number
): Array<{ type: 'skill_gap' | 'career_stage' | 'networking' | 'industry'; message: string; priority: 'high' | 'medium' | 'low' }> {
  const recommendations = [];

  // Score-based recommendations
  if (averageScore < 50) {
    recommendations.push({
      type: 'skill_gap' as const,
      message: 'Focus on events that align more closely with your primary skills and career goals.',
      priority: 'high' as const
    });
  } else if (averageScore < 70) {
    recommendations.push({
      type: 'career_stage' as const,
      message: 'Consider attending more advanced events that match your seniority level.',
      priority: 'medium' as const
    });
  }

  // Category diversity
  const categories = events.map(e => e.category?.name).filter(Boolean);
  const uniqueCategories = new Set(categories);
  if (uniqueCategories.size < 3 && events.length > 10) {
    recommendations.push({
      type: 'industry' as const,
      message: 'Diversify your event portfolio by exploring different tech categories.',
      priority: 'medium' as const
    });
  }

  // Networking opportunities
  const networkingEvents = events.filter(e => 
    e.category?.name?.toLowerCase().includes('networking') || 
    e.category?.name?.toLowerCase().includes('conference')
  );
  if (networkingEvents.length < events.length * 0.3) {
    recommendations.push({
      type: 'networking' as const,
      message: 'Increase networking opportunities by attending more conferences and meetups.',
      priority: 'medium' as const
    });
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}
