/* eslint-disable @typescript-eslint/no-explicit-any */
import { Event, AppProfile, TrackedEventRecord } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerProfileService } from './careerProfileService';
// import { CareerImpactUtils } from '@/utils/careerImpactUtils'; // Now using batch service

export interface CareerAnalyticsData {
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
}

export interface CareerRecommendation {
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

export class CareerAnalyticsService {
  /**
   * Generate comprehensive career analytics for dashboard
   */
  static async generateCareerAnalytics(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<CareerAnalyticsData> {
    const careerProfile = CareerProfileService.getCareerProfile(userProfile);
    
    if (!careerProfile) {
      return this.getEmptyAnalytics();
    }

    // Calculate average impact score from recent events
    const recentEvents = trackedEvents
      .filter(te => te.event && new Date(te.event.startTime) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
      .map(te => te.event!)
      .filter(Boolean);

    const averageImpactScore = await this.calculateAverageImpactScore(recentEvents, careerProfile);
    
    // Calculate trend
    const { impactTrend, trendPercentage } = await this.calculateImpactTrend(recentEvents, careerProfile);

    // Analyze skills growth
    const skillsGrowth = this.analyzeSkillsGrowth(recentEvents, careerProfile);

    // Calculate career goal progress
    const careerGoalProgress = this.calculateCareerGoalProgress(careerProfile, recentEvents);

    // Generate monthly stats
    const monthlyStats = this.calculateMonthlyStats(trackedEvents);

    // Get upcoming opportunities with career impact
    const upcomingOpportunities = await this.getUpcomingOpportunities(upcomingEvents, careerProfile);

    return {
      averageImpactScore,
      impactTrend,
      trendPercentage,
      skillsGrowth,
      careerGoalProgress,
      monthlyStats,
      upcomingOpportunities
    };
  }

  /**
   * Generate intelligent career recommendations
   */
  static async generateCareerRecommendations(
    userProfile: AppProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<CareerRecommendation[]> {
    const careerProfile = CareerProfileService.getCareerProfile(userProfile);
    
    if (!careerProfile) {
      return [];
    }

    const recommendations: CareerRecommendation[] = [];

    // Analyze skill gaps
    const skillGapRecommendations = await this.generateSkillGapRecommendations(
      careerProfile, 
      trackedEvents, 
      upcomingEvents
    );
    recommendations.push(...skillGapRecommendations);

    // Networking recommendations
    const networkingRecommendations = await this.generateNetworkingRecommendations(
      careerProfile,
      trackedEvents,
      upcomingEvents
    );
    recommendations.push(...networkingRecommendations);

    // Career advancement opportunities
    const advancementRecommendations = await this.generateAdvancementRecommendations(
      careerProfile,
      upcomingEvents
    );
    recommendations.push(...advancementRecommendations);

    // Trending topic recommendations
    const trendingRecommendations = await this.generateTrendingRecommendations(
      careerProfile,
      upcomingEvents
    );
    recommendations.push(...trendingRecommendations);

    return recommendations.slice(0, 10); // Limit to top 10
  }

  private static async calculateAverageImpactScore(
    events: Event[],
    _careerProfile: any
  ): Promise<number> {
    if (events.length === 0) return 0;

    try {
      // Use batch service instead of N+1 pattern
      const { BatchCareerImpactService } = await import('./batchCareerImpactService');
      const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(events);

      const scores = enhancedEvents
        .map(event => event.careerImpactLite?.overall || 0)
        .filter(score => score > 0);

      return scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
    } catch (error) {
      console.warn('Failed to calculate average impact score:', error);
      return 0;
    }
  }

  private static async calculateImpactTrend(
    events: Event[],
    careerProfile: any
  ): Promise<{ impactTrend: 'up' | 'down' | 'stable'; trendPercentage: number }> {
    if (events.length < 6) {
      return { impactTrend: 'stable', trendPercentage: 0 };
    }

    try {
      const sortedEvents = events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const halfPoint = Math.floor(sortedEvents.length / 2);
      
      const earlierEvents = sortedEvents.slice(0, halfPoint);
      const laterEvents = sortedEvents.slice(halfPoint);

      const earlierAvg = await this.calculateAverageImpactScore(earlierEvents, careerProfile);
      const laterAvg = await this.calculateAverageImpactScore(laterEvents, careerProfile);

      if (earlierAvg === 0 && laterAvg === 0) {
        return { impactTrend: 'stable', trendPercentage: 0 };
      }

      const trendPercentage = earlierAvg > 0 
        ? Math.round(((laterAvg - earlierAvg) / earlierAvg) * 100)
        : 0;

      const impactTrend = trendPercentage > 5 ? 'up' : 
                         trendPercentage < -5 ? 'down' : 'stable';

      return { impactTrend, trendPercentage };
    } catch (error) {
      console.warn('Failed to calculate impact trend:', error);
      return { impactTrend: 'stable', trendPercentage: 0 };
    }
  }

  private static analyzeSkillsGrowth(events: Event[], careerProfile: any): Array<{
    skill: string;
    progress: number;
    events: number;
  }> {
    const targetSkills = careerProfile?.targetSkills || [];
    
    if (targetSkills.length === 0) {
      return [];
    }

    return targetSkills.map((skill: string) => {
      // Count events related to this skill
      const relatedEvents = events.filter(event => 
        event.title.toLowerCase().includes(skill.toLowerCase()) ||
        event.description?.toLowerCase().includes(skill.toLowerCase()) ||
        event.tags?.some(tag => tag.name.toLowerCase().includes(skill.toLowerCase()))
      );

      // Calculate progress based on number of related events
      const progress = Math.min((relatedEvents.length / 5) * 100, 100); // 5 events = 100% progress

      return {
        skill,
        progress,
        events: relatedEvents.length
      };
    }).sort((a: any, b: any) => b.progress - a.progress);
  }

  private static calculateCareerGoalProgress(careerProfile: any, events: Event[]): {
    currentLevel: string;
    targetLevel: string;
    progress: number;
  } {
    const currentLevel = careerProfile?.currentRole || 'Not specified';
    const targetLevel = careerProfile?.targetRole || 'Not specified';
    
    // Simple progress calculation based on events attended and skills
    const skillProgress = this.analyzeSkillsGrowth(events, careerProfile);
    const avgSkillProgress = skillProgress.length > 0 
      ? skillProgress.reduce((sum, skill) => sum + skill.progress, 0) / skillProgress.length 
      : 0;

    const eventProgress = Math.min((events.length / 10) * 50, 50); // Up to 50% from events
    const progress = Math.min(avgSkillProgress * 0.5 + eventProgress, 100);

    return {
      currentLevel,
      targetLevel,
      progress
    };
  }

  private static calculateMonthlyStats(trackedEvents: TrackedEventRecord[]): {
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
    
    // Estimate high impact events (events with 'conference', 'summit', 'workshop' in title)
    const highImpactEvents = thisMonthEvents.filter(te => 
      te.event && (
        te.event.title.toLowerCase().includes('conference') ||
        te.event.title.toLowerCase().includes('summit') ||
        te.event.title.toLowerCase().includes('workshop')
      )
    ).length;

    // Estimate skills improved (unique categories of attended events)
    const uniqueCategories = new Set(
      thisMonthEvents
        .filter(te => te.status === 'attended' && te.event?.category)
        .map(te => te.event!.category!.name)
    );
    const skillsImproved = uniqueCategories.size;

    // Estimate networking events
    const networkingEvents = thisMonthEvents.filter(te =>
      te.event && (
        te.event.title.toLowerCase().includes('networking') ||
        te.event.title.toLowerCase().includes('meetup') ||
        te.event.category?.name.toLowerCase().includes('networking')
      )
    ).length;

    return {
      eventsAttended,
      highImpactEvents,
      skillsImproved,
      networkingEvents
    };
  }

  private static async getUpcomingOpportunities(
    events: Event[],
    _careerProfile: any
  ): Promise<Array<Event & { careerImpactLite?: CareerImpactScoreLite }>> {
    try {
      const upcomingEvents = events.filter(event => 
        new Date(event.startTime) > new Date() &&
        new Date(event.startTime) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Next 2 weeks
      );

      // Use batch service instead of N+1 pattern
      const { BatchCareerImpactService } = await import('./batchCareerImpactService');
      const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(upcomingEvents);

      return enhancedEvents
        .filter(event => event.careerImpactLite && event.careerImpactLite.overall >= 70)
        .sort((a, b) => (b.careerImpactLite?.overall || 0) - (a.careerImpactLite?.overall || 0))
        .slice(0, 10);
    } catch (error) {
      console.warn('Failed to get upcoming opportunities:', error);
      return [];
    }
  }

  private static async generateSkillGapRecommendations(
    careerProfile: any,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<CareerRecommendation[]> {
    const targetSkills = careerProfile?.targetSkills || [];
    const skillsGrowth = this.analyzeSkillsGrowth(
      trackedEvents.map(te => te.event!).filter(Boolean),
      careerProfile
    );

    const skillGaps = targetSkills.filter((skill: string) => {
      const skillProgress = skillsGrowth.find(sg => sg.skill === skill);
      return !skillProgress || skillProgress.progress < 50;
    });

    const recommendations: CareerRecommendation[] = [];

    for (const skill of skillGaps.slice(0, 2)) {
      const relatedEvents = upcomingEvents.filter(event =>
        event.title.toLowerCase().includes(skill.toLowerCase()) ||
        event.description?.toLowerCase().includes(skill.toLowerCase())
      ).slice(0, 3);

      if (relatedEvents.length > 0) {
        try {
          // Use batch service instead of N+1 pattern
          const { BatchCareerImpactService } = await import('./batchCareerImpactService');
          const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(relatedEvents);

          recommendations.push({
            id: `skill-gap-${skill}`,
            type: 'skill_gap',
            title: `Develop ${skill} Skills`,
            description: `Strengthen your ${skill} expertise to advance your career goals.`,
            priority: 'high',
            events: enhancedEvents,
            actionable: true,
            estimatedImpact: 85,
            timeToComplete: '2-4 weeks',
            reason: `${skill} is a key skill for your target role, but your current progress is below 50%.`
          });
        } catch (error) {
          console.warn(`Failed to enhance events for skill ${skill}:`, error);
        }
      }
    }

    return recommendations;
  }

  private static async generateNetworkingRecommendations(
    careerProfile: any,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[]
  ): Promise<CareerRecommendation[]> {
    const recentNetworkingEvents = trackedEvents.filter(te =>
      te.event && (
        te.event.title.toLowerCase().includes('networking') ||
        te.event.title.toLowerCase().includes('meetup')
      )
    );

    // If user hasn't attended many networking events, recommend some
    if (recentNetworkingEvents.length < 2) {
      const networkingEvents = upcomingEvents.filter(event =>
        event.title.toLowerCase().includes('networking') ||
        event.title.toLowerCase().includes('meetup') ||
        event.category?.name.toLowerCase().includes('networking')
      ).slice(0, 3);

      if (networkingEvents.length > 0) {
        try {
          // Use batch service instead of N+1 pattern
          const { BatchCareerImpactService } = await import('./batchCareerImpactService');
          const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(networkingEvents);

          return [{
            id: 'networking-boost',
            type: 'networking',
            title: 'Expand Your Professional Network',
            description: 'Build valuable connections in your industry through networking events.',
            priority: 'medium',
            events: enhancedEvents,
            actionable: true,
            estimatedImpact: 75,
            timeToComplete: '1-2 weeks',
            reason: 'You have limited networking activity. Building professional relationships is crucial for career advancement.'
          }];
        } catch (error) {
          console.warn('Failed to enhance networking events:', error);
        }
      }
    }

    return [];
  }

  private static async generateAdvancementRecommendations(
    careerProfile: any,
    upcomingEvents: Event[]
  ): Promise<CareerRecommendation[]> {
    const targetRole = careerProfile?.targetRole;
    
    if (!targetRole) {
      return [];
    }

    // Find events related to leadership, management, or the target role
    const advancementEvents = upcomingEvents.filter(event =>
      event.title.toLowerCase().includes('leadership') ||
      event.title.toLowerCase().includes('management') ||
      event.title.toLowerCase().includes(targetRole.toLowerCase()) ||
      event.title.toLowerCase().includes('career')
    ).slice(0, 3);

    if (advancementEvents.length > 0) {
      try {
        // Use batch service instead of N+1 pattern
        const { BatchCareerImpactService } = await import('./batchCareerImpactService');
        const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(advancementEvents);

        return [{
          id: 'career-advancement',
          type: 'career_advancement',
          title: `Advance to ${targetRole}`,
          description: `Learn the skills and strategies needed to reach your goal of becoming a ${targetRole}.`,
          priority: 'high',
          events: enhancedEvents,
          actionable: true,
          estimatedImpact: 90,
          timeToComplete: '3-6 months',
          reason: `These events focus on the leadership and strategic skills needed for your target role of ${targetRole}.`
        }];
      } catch (error) {
        console.warn('Failed to enhance advancement events:', error);
      }
    }

    return [];
  }

  private static async generateTrendingRecommendations(
    careerProfile: any,
    upcomingEvents: Event[]
  ): Promise<CareerRecommendation[]> {
    // Find events with trending tech topics
    const trendingKeywords = ['ai', 'machine learning', 'blockchain', 'cloud', 'devops', 'kubernetes'];
    
    const trendingEvents = upcomingEvents.filter(event =>
      trendingKeywords.some(keyword =>
        event.title.toLowerCase().includes(keyword) ||
        event.description?.toLowerCase().includes(keyword)
      )
    ).slice(0, 3);

    if (trendingEvents.length > 0) {
      try {
        // Use batch service instead of N+1 pattern
        const { BatchCareerImpactService } = await import('./batchCareerImpactService');
        const enhancedEvents = await BatchCareerImpactService.enhanceEventsLite(trendingEvents);

        return [{
          id: 'trending-topics',
          type: 'trending_topic',
          title: 'Stay Current with Tech Trends',
          description: 'Keep up with the latest technology trends and innovations in your field.',
          priority: 'medium',
          events: enhancedEvents,
          actionable: true,
          estimatedImpact: 70,
          timeToComplete: '1-2 weeks',
          reason: 'Staying current with technology trends is essential for remaining competitive in the tech industry.'
        }];
      } catch (error) {
        console.warn('Failed to enhance trending events:', error);
      }
    }

    return [];
  }

  private static getEmptyAnalytics(): CareerAnalyticsData {
    return {
      averageImpactScore: 0,
      impactTrend: 'stable',
      trendPercentage: 0,
      skillsGrowth: [],
      careerGoalProgress: {
        currentLevel: 'Not specified',
        targetLevel: 'Not specified',
        progress: 0
      },
      monthlyStats: {
        eventsAttended: 0,
        highImpactEvents: 0,
        skillsImproved: 0,
        networkingEvents: 0
      },
      upcomingOpportunities: []
    };
  }
}
