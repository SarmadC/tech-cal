// src/services/optimizedAnalyticsService.ts
// Optimized analytics service using database-first approach

import { SupabaseClientType } from '@/types';
import { CareerProfileService } from './careerProfileService';
import { AppProfile, TrackedEventRecord, Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';

export interface OptimizedAnalyticsData {
  averageImpactScore: number;
  impactTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  skillsGrowth: Array<{
    skill: string;
    progress: number;
    events: number;
  }>;
  careerGoalProgress: {
    currentLevel: string;
    targetLevel: string;
    progress: number;
  };
  monthlyStats: {
    eventsAttended: number;
    highImpactEvents: number;
    skillsImproved: number;
    networkingEvents: number;
  };
  upcomingOpportunities: Array<Event & { careerImpactLite?: CareerImpactScoreLite }>;
  hasCareerProfile: boolean;
  userSummary: {
    totalTrackedEvents: number;
    eventsAttended: number;
    eventsBookmarked: number;
    uniqueEventTypes: number;
    highValueEvents: number;
    lastActivity: string | null;
  };
}

export interface OptimizedRecommendation {
  id: string;
  type: 'skill_gap' | 'networking' | 'career_advancement' | 'trending_topic' | 'learning_path';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  events: Array<Event & { careerImpactLite?: CareerImpactScoreLite }>;
  actionable: boolean;
  estimatedImpact: number;
  timeToComplete?: string;
  reason: string;
}

export class OptimizedAnalyticsService {
  /**
   * Get comprehensive analytics using database-first approach
   * This replaces the heavy JavaScript calculations with optimized database queries
   */
  static async getComprehensiveAnalytics(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[],
    supabaseClient: SupabaseClientType,
    includeRecommendations: boolean = true
  ): Promise<{
    analytics: OptimizedAnalyticsData;
    recommendations: OptimizedRecommendation[];
  }> {
    try {
      const startTime = Date.now();
      
      // Use database function for dashboard data
      const { data: analyticsData, error: analyticsError } = await supabaseClient.rpc(
        'get_user_dashboard_data',
        {
          user_uuid: userProfile.id
        }
      );

      if (analyticsError) {
        console.warn('Database analytics failed, falling back to basic calculations:', analyticsError);
        return await this.getFallbackAnalytics(userProfile, trackedEvents, upcomingEvents);
      }

      // Get recommendations if requested
      let recommendations: OptimizedRecommendation[] = [];
      if (includeRecommendations) {
        recommendations = await this.generateOptimizedRecommendations(
          userProfile,
          trackedEvents,
          upcomingEvents,
          supabaseClient
        );
      }

      const processingTime = Date.now() - startTime;
      console.log(`Optimized analytics generated in ${processingTime}ms`);

      return {
        analytics: (analyticsData as unknown as OptimizedAnalyticsData) || {} as OptimizedAnalyticsData,
        recommendations
      };
    } catch (error) {
      console.error('Error in optimized analytics:', error);
      return await this.getFallbackAnalytics(userProfile, trackedEvents, upcomingEvents);
    }
  }

  /**
   * Get basic analytics for users without career profiles
   * Fast, simple calculations using existing data
   */
  static async getBasicAnalytics(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<OptimizedAnalyticsData> {
    const eventsAttended = trackedEvents.filter(te => te.status === 'attended').length;
    const eventsBookmarked = trackedEvents.filter(te => te.status === 'bookmarked').length;
    
    // Simple impact score based on event types and attendance
    const averageImpactScore = this.calculateSimpleImpactScore(trackedEvents);
    
    // Simple monthly stats
    const monthlyStats = this.calculateSimpleMonthlyStats(trackedEvents);
    
    // Simple upcoming opportunities
    const upcomingOpportunities = this.getSimpleUpcomingOpportunities(upcomingEvents);

    return {
      averageImpactScore,
      impactTrend: 'stable' as const,
      trendPercentage: 0,
      skillsGrowth: [],
      careerGoalProgress: {
        currentLevel: 'Not Set',
        targetLevel: 'Not Set',
        progress: 0
      },
      monthlyStats,
      upcomingOpportunities,
      hasCareerProfile: false,
      userSummary: {
        totalTrackedEvents: trackedEvents.length,
        eventsAttended,
        eventsBookmarked,
        uniqueEventTypes: new Set(trackedEvents.map(te => te.event?.eventTypeId).filter(Boolean)).size,
        highValueEvents: trackedEvents.filter(te => 
          te.event && this.isHighValueEvent(te.event)
        ).length,
        lastActivity: trackedEvents.length > 0 ? trackedEvents[0].trackedAt : null
      }
    };
  }

  /**
   * Generate optimized recommendations using database queries
   */
  private static async generateOptimizedRecommendations(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[],
    supabaseClient: SupabaseClientType
  ): Promise<OptimizedRecommendation[]> {
    const careerProfile = supabaseClient 
      ? await CareerProfileService.getCareerProfile(userProfile.id, supabaseClient)
      : CareerProfileService.getCareerProfileFromPreferences(userProfile);
    if (!careerProfile) return [];

    const recommendations: OptimizedRecommendation[] = [];

    // Skill gap recommendations
    const skillGapRecs = await this.generateSkillGapRecommendations(
      careerProfile as unknown as Record<string, unknown>,
      upcomingEvents,
      supabaseClient
    );
    recommendations.push(...skillGapRecs);

    // Networking recommendations
    const networkingRecs = this.generateNetworkingRecommendations(
      careerProfile as unknown as Record<string, unknown>,
      trackedEvents,
      upcomingEvents
    );
    recommendations.push(...networkingRecs);

    // Career advancement recommendations
    const advancementRecs = this.generateAdvancementRecommendations(
      careerProfile as unknown as Record<string, unknown>,
      upcomingEvents
    );
    recommendations.push(...advancementRecs);

    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Generate skill gap recommendations using database queries
   */
  private static async generateSkillGapRecommendations(
    careerProfile: Record<string, unknown>,
    upcomingEvents: Event[],
    _supabaseClient: SupabaseClientType
  ): Promise<OptimizedRecommendation[]> {
    const targetSkills = Array.isArray(careerProfile?.targetSkills) ? careerProfile.targetSkills : [];
    if (targetSkills.length === 0) return [];

    const recommendations: OptimizedRecommendation[] = [];

    for (const skill of targetSkills.slice(0, 3)) { // Limit to top 3 skills
      const relatedEvents = upcomingEvents.filter(event =>
        event.title.toLowerCase().includes(skill.toLowerCase()) ||
        event.description?.toLowerCase().includes(skill.toLowerCase())
      ).slice(0, 3);

      if (relatedEvents.length > 0) {
        recommendations.push({
          id: `skill-gap-${skill}`,
          type: 'skill_gap',
          title: `Develop ${skill} Skills`,
          description: `Strengthen your ${skill} expertise to advance your career goals.`,
          priority: 'high',
          events: relatedEvents.map(event => ({
            ...event,
            careerImpactLite: this.calculateSimpleCareerImpact(event)
          })),
          actionable: true,
          estimatedImpact: 85,
          timeToComplete: '2-4 weeks',
          reason: `${skill} is a key skill for your target role.`
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate networking recommendations
   */
  private static generateNetworkingRecommendations(
    careerProfile: Record<string, unknown>,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): OptimizedRecommendation[] {
    const networkingEvents = trackedEvents.filter(te =>
      te.event && (
        te.event.title.toLowerCase().includes('networking') ||
        te.event.title.toLowerCase().includes('meetup')
      )
    );

    if (networkingEvents.length < 2) {
      const upcomingNetworking = upcomingEvents.filter(event =>
        event.title.toLowerCase().includes('networking') ||
        event.title.toLowerCase().includes('meetup')
      ).slice(0, 3);

      if (upcomingNetworking.length > 0) {
        return [{
          id: 'networking-boost',
          type: 'networking',
          title: 'Expand Your Professional Network',
          description: 'Build valuable connections in your industry through networking events.',
          priority: 'medium',
          events: upcomingNetworking.map(event => ({
            ...event,
            careerImpactLite: this.calculateSimpleCareerImpact(event)
          })),
          actionable: true,
          estimatedImpact: 75,
          timeToComplete: '1-2 weeks',
          reason: 'You have limited networking activity. Building professional relationships is crucial for career advancement.'
        }];
      }
    }

    return [];
  }

  /**
   * Generate career advancement recommendations
   */
  private static generateAdvancementRecommendations(
    careerProfile: Record<string, unknown>,
    upcomingEvents: Event[]
  ): OptimizedRecommendation[] {
    const targetRole = typeof careerProfile?.targetRole === 'string' ? careerProfile.targetRole : null;
    if (!targetRole) return [];

    const advancementEvents = upcomingEvents.filter(event =>
      event.title.toLowerCase().includes('leadership') ||
      event.title.toLowerCase().includes('management') ||
      event.title.toLowerCase().includes(targetRole.toLowerCase()) ||
      event.title.toLowerCase().includes('career')
    ).slice(0, 3);

    if (advancementEvents.length > 0) {
      return [{
        id: 'career-advancement',
        type: 'career_advancement',
        title: `Advance to ${targetRole}`,
        description: `Develop leadership and management skills to advance to your target role.`,
        priority: 'high',
        events: advancementEvents.map(event => ({
          ...event,
          careerImpactLite: this.calculateSimpleCareerImpact(event)
        })),
        actionable: true,
        estimatedImpact: 90,
        timeToComplete: '3-6 months',
        reason: `These events will help you develop the skills needed for ${targetRole}.`
      }];
    }

    return [];
  }

  /**
   * Fallback analytics when database queries fail
   */
  private static async getFallbackAnalytics(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<{
    analytics: OptimizedAnalyticsData;
    recommendations: OptimizedRecommendation[];
  }> {
    const analytics = await this.getBasicAnalytics(userProfile, trackedEvents, upcomingEvents);
    return {
      analytics,
      recommendations: []
    };
  }

  /**
   * Calculate simple impact score based on event data
   */
  private static calculateSimpleImpactScore(trackedEvents: TrackedEventRecord[]): number {
    if (trackedEvents.length === 0) return 0;

    const attendedEvents = trackedEvents.filter(te => te.status === 'attended' && te.event);
    if (attendedEvents.length === 0) return 0.2; // Default for bookmarked events

    const totalScore = attendedEvents.reduce((sum, te) => {
      const event = te.event!;
      let score = 0.2; // Base score
      
      // Increase score based on event characteristics
      if (event.attendeeCount && event.attendeeCount > 500) score += 0.3;
      else if (event.attendeeCount && event.attendeeCount > 100) score += 0.2;
      else if (event.attendeeCount && event.attendeeCount > 50) score += 0.1;
      
      // High-value event keywords
      if (this.isHighValueEvent(event)) score += 0.2;
      
      return sum + Math.min(score, 1.0);
    }, 0);

    return Math.round((totalScore / attendedEvents.length) * 100) / 100;
  }

  /**
   * Calculate simple monthly stats
   */
  private static calculateSimpleMonthlyStats(trackedEvents: TrackedEventRecord[]): {
    eventsAttended: number;
    highImpactEvents: number;
    skillsImproved: number;
    networkingEvents: number;
  } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthEvents = trackedEvents.filter(te => 
      te.event && new Date(te.event.startTime) >= startOfMonth && new Date(te.event.startTime) <= now
    );

    const eventsAttended = thisMonthEvents.filter(te => te.status === 'attended').length;
    
    const highImpactEvents = thisMonthEvents.filter(te => 
      te.event && this.isHighValueEvent(te.event)
    ).length;

    const uniqueCategories = new Set(
      thisMonthEvents
        .filter(te => te.status === 'attended' && te.event?.eventTypeId)
        .map(te => te.event!.eventTypeId)
    );
    const skillsImproved = uniqueCategories.size;

    const networkingEvents = thisMonthEvents.filter(te =>
      te.event && (
        te.event.title.toLowerCase().includes('networking') ||
        te.event.title.toLowerCase().includes('meetup')
      )
    ).length;

    return {
      eventsAttended,
      highImpactEvents,
      skillsImproved,
      networkingEvents
    };
  }

  /**
   * Get simple upcoming opportunities
   */
  private static getSimpleUpcomingOpportunities(upcomingEvents: Event[]): Array<Event & { careerImpactLite?: CareerImpactScoreLite }> {
    return upcomingEvents
      .filter(event => new Date(event.startTime) > new Date())
      .slice(0, 10)
      .map(event => ({
        ...event,
        careerImpactLite: this.calculateSimpleCareerImpact(event)
      }))
      .sort((a, b) => (b.careerImpactLite?.overall || 0) - (a.careerImpactLite?.overall || 0));
  }

  /**
   * Calculate simple career impact for an event
   */
  private static calculateSimpleCareerImpact(event: Event): CareerImpactScoreLite {
    let overall = 0.3; // Base score
    
    if (event.attendeeCount) {
      if (event.attendeeCount > 500) overall = 0.8;
      else if (event.attendeeCount > 100) overall = 0.6;
      else if (event.attendeeCount > 50) overall = 0.4;
    }
    
    if (this.isHighValueEvent(event)) {
      overall = Math.min(overall + 0.2, 1.0);
    }

    return {
      overall: Math.round(overall * 100) / 100,
      confidence: 0.7,
      category: overall > 0.7 ? 'high' : overall > 0.4 ? 'moderate' : 'low'
    };
  }

  /**
   * Check if an event is high-value
   */
  private static isHighValueEvent(event: Event): boolean {
    const title = event.title.toLowerCase();
    return title.includes('conference') ||
           title.includes('summit') ||
           title.includes('workshop') ||
           title.includes('training') ||
           title.includes('masterclass');
  }

  /**
   * Type guard to validate the structure of analytics data from RPC
   */
  private static validateAnalyticsData(data: unknown): data is OptimizedAnalyticsData {
    // Simplified validation - just check if it's an object with some expected properties
    return data !== null && 
           typeof data === 'object' && 
           data !== undefined;
  }
}
