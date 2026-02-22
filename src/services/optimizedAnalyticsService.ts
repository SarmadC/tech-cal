// src/services/optimizedAnalyticsService.ts
// Optimized analytics service using database-first approach

import { SupabaseClientType } from '@/types';
import { CareerProfileService } from './careerProfileService';
import { AppProfile, CareerProfile, TrackedEventRecord, Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import { getCanonicalSkillMeta } from '@/utils/skillTaxonomy';
import { getRoleKeywords } from '@/utils/roleTaxonomy';

const NETWORKING_KEYWORDS = [
  'network',
  'meetup',
  'community',
  'mixer',
  'social',
  'connect',
  'roundtable',
  'happy hour'
] as const;

const ADVANCEMENT_KEYWORDS = [
  'leadership',
  'management',
  'career',
  'promotion',
  'mentor',
  'executive',
  'strategy',
  'growth'
] as const;

const ADVANCEMENT_GOALS = new Set([
  'career-advancement',
  'leadership-growth',
  'role-transition',
  'salary-increase'
]);

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
  private static clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private static toCareerImpactCategory(score: number): CareerImpactScoreLite['category'] {
    if (score >= 90) return 'transformative';
    if (score >= 80) return 'high';
    if (score >= 50) return 'moderate';
    return 'low';
  }

  private static toCareerImpactLite(score: number, confidence: number): CareerImpactScoreLite {
    const normalized = this.clampScore(score);
    return {
      overall: normalized,
      confidence,
      category: this.toCareerImpactCategory(normalized),
    };
  }

  private static containsKeyword(haystack: string, keyword: string): boolean {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword || !haystack) return false;

    if (normalizedKeyword.includes(' ') || /[^a-z0-9]/i.test(normalizedKeyword)) {
      return haystack.includes(normalizedKeyword);
    }

    if (normalizedKeyword.length < 3) return false;

    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
  }

  private static getEventSearchText(event: Event): string {
    return [
      event.title,
      event.description,
      event.category?.name,
      event.organizer,
      event.targetAudience,
      event.eventTypeId,
      ...(event.tags || []).map(tag => `${tag.name} ${tag.category}`),
      ...(event.speakerLineup || []).map(speaker => `${speaker.name} ${speaker.title || ''} ${speaker.company || ''}`)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  private static hasExistingImpactScore(event: Event): boolean {
    const scoredEvent = event as Event & {
      careerImpactLite?: { overall?: number };
      careerImpact?: { overall?: number };
    };
    return typeof scoredEvent.careerImpactLite?.overall === 'number' ||
      typeof scoredEvent.careerImpact?.overall === 'number';
  }

  private static createScoreCacheKey(eventId: string, careerProfile?: CareerProfile): string {
    if (!careerProfile) return `anon:${eventId}`;
    return `${careerProfile.userId}:${eventId}`;
  }

  private static getEventImpactScore(
    event: Event,
    careerProfile?: CareerProfile,
    scoreCache?: Map<string, number>
  ): number {
    const cacheKey = this.createScoreCacheKey(event.id, careerProfile);
    if (scoreCache?.has(cacheKey)) {
      return scoreCache.get(cacheKey)!;
    }

    const scoredEvent = event as Event & {
      careerImpactLite?: { overall?: number };
      careerImpact?: { overall?: number };
    };
    const existingScore = scoredEvent.careerImpactLite?.overall ?? scoredEvent.careerImpact?.overall;
    if (typeof existingScore === 'number' && Number.isFinite(existingScore)) {
      const normalizedExisting = this.clampScore(existingScore <= 1 ? existingScore * 100 : existingScore);
      scoreCache?.set(cacheKey, normalizedExisting);
      return normalizedExisting;
    }

    if (careerProfile) {
      const computed = this.clampScore(calculateBaseScore(event, careerProfile).overall);
      scoreCache?.set(cacheKey, computed);
      return computed;
    }

    const fallback = this.calculateSimpleCareerImpact(event).overall;
    scoreCache?.set(cacheKey, fallback);
    return fallback;
  }

  private static attachImpactLite(
    events: Event[],
    careerProfile?: CareerProfile,
    scoreCache?: Map<string, number>
  ): Array<Event & { careerImpactLite?: CareerImpactScoreLite }> {
    return events
      .map(event => {
        const score = this.getEventImpactScore(event, careerProfile, scoreCache);
        const confidence = this.hasExistingImpactScore(event)
          ? 0.9
          : careerProfile
            ? 0.8
            : 0.7;
        return {
          ...event,
          careerImpactLite: this.toCareerImpactLite(score, confidence)
        };
      })
      .sort((a, b) => (b.careerImpactLite?.overall || 0) - (a.careerImpactLite?.overall || 0));
  }

  private static averageImpact(events: Array<Event & { careerImpactLite?: CareerImpactScoreLite }>): number {
    if (events.length === 0) return 0;
    const total = events.reduce((sum, event) => sum + (event.careerImpactLite?.overall || 0), 0);
    return total / events.length;
  }

  private static impactToPriority(impact: number): 'high' | 'medium' | 'low' {
    if (impact >= 75) return 'high';
    if (impact >= 55) return 'medium';
    return 'low';
  }

  private static isNetworkingEvent(event: Event): boolean {
    const searchText = this.getEventSearchText(event);
    return NETWORKING_KEYWORDS.some(keyword => searchText.includes(keyword));
  }

  private static getSkillKeywords(skill: string): string[] {
    const canonical = getCanonicalSkillMeta(skill);
    const candidates = new Set<string>();

    candidates.add(skill.toLowerCase());
    if (canonical) {
      candidates.add(canonical.name.toLowerCase());
      canonical.synonyms.forEach(synonym => candidates.add(synonym.toLowerCase()));
      canonical.keywords.forEach(keyword => candidates.add(keyword.toLowerCase()));
    }

    return Array.from(candidates).filter(keyword => keyword.length >= 3);
  }

  private static doesEventMatchSkill(event: Event, skill: string): boolean {
    const searchText = this.getEventSearchText(event);
    return this.getSkillKeywords(skill).some(keyword => this.containsKeyword(searchText, keyword));
  }

  private static estimateSkillGapTimeline(eventsNeeded: number): string {
    if (eventsNeeded <= 1) return '2-4 weeks';
    if (eventsNeeded === 2) return '1-2 months';
    return '2-3 months';
  }

  private static estimateAdvancementTimeline(timeframe: CareerProfile['timeframe']): string {
    switch (timeframe) {
      case 'immediate':
        return '1-2 months';
      case 'short-term':
        return '2-4 months';
      case 'medium-term':
        return '4-9 months';
      case 'long-term':
        return '6-12 months';
      default:
        return '3-6 months';
    }
  }

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

      const validatedAnalytics = this.validateAnalyticsData(analyticsData)
        ? analyticsData
        : await this.getBasicAnalytics(userProfile, trackedEvents, upcomingEvents);

      return {
        analytics: validatedAnalytics,
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
    const eventsBookmarked = trackedEvents.filter(te => te.isBookmarked).length;
    
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
    const scoreCache = new Map<string, number>();

    // Skill gap recommendations
    const skillGapRecs = this.generateSkillGapRecommendations(
      careerProfile,
      trackedEvents,
      upcomingEvents,
      scoreCache
    );
    recommendations.push(...skillGapRecs);

    // Networking recommendations
    const networkingRecs = this.generateNetworkingRecommendations(
      careerProfile,
      trackedEvents,
      upcomingEvents,
      scoreCache
    );
    recommendations.push(...networkingRecs);

    // Career advancement recommendations
    const advancementRecs = this.generateAdvancementRecommendations(
      careerProfile,
      upcomingEvents,
      scoreCache
    );
    recommendations.push(...advancementRecs);

    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDelta = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityDelta !== 0) return priorityDelta;
        return b.estimatedImpact - a.estimatedImpact;
      })
      .slice(0, 10);
  }

  /**
   * Generate skill gap recommendations using database queries
   */
  private static generateSkillGapRecommendations(
    careerProfile: CareerProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[],
    scoreCache?: Map<string, number>,
  ): OptimizedRecommendation[] {
    const targetSkills = careerProfile.skillsToLearn
      .map(skill => skill.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (targetSkills.length === 0) return [];

    const attendedEvents = trackedEvents
      .filter(te => te.status === 'attended' && te.event)
      .map(te => te.event as Event);

    const recommendations: OptimizedRecommendation[] = [];

    for (const skill of targetSkills) {
      const attendedSkillEvents = attendedEvents.filter(event => this.doesEventMatchSkill(event, skill)).length;
      const eventsNeeded = Math.max(0, 3 - attendedSkillEvents);
      if (eventsNeeded === 0) {
        continue;
      }

      const relatedEvents = this.attachImpactLite(
        upcomingEvents.filter(event => this.doesEventMatchSkill(event, skill)),
        careerProfile,
        scoreCache
      ).slice(0, 3);

      if (relatedEvents.length > 0) {
        const estimatedImpact = this.clampScore(
          this.averageImpact(relatedEvents) + (eventsNeeded >= 2 ? 8 : 4)
        );
        const skillSlug = skill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        recommendations.push({
          id: `skill-gap-${skillSlug || 'focus'}`,
          type: 'skill_gap',
          title: `Develop ${skill} Skills`,
          description: `Close your ${skill} gap with targeted events matched to your profile.`,
          priority: eventsNeeded >= 2 ? 'high' : this.impactToPriority(estimatedImpact),
          events: relatedEvents,
          actionable: true,
          estimatedImpact,
          timeToComplete: this.estimateSkillGapTimeline(eventsNeeded),
          reason: attendedSkillEvents > 0
            ? `You've attended ${attendedSkillEvents} ${skill}-related event${attendedSkillEvents === 1 ? '' : 's'} so far; these help close the remaining gap.`
            : `${skill} is currently underrepresented in your attended events.`
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate networking recommendations
   */
  private static generateNetworkingRecommendations(
    careerProfile: CareerProfile,
    trackedEvents: TrackedEventRecord[],
    upcomingEvents: Event[],
    scoreCache?: Map<string, number>
  ): OptimizedRecommendation[] {
    const attendedNetworkingEvents = trackedEvents.filter(te =>
      te.status === 'attended' &&
      te.event &&
      this.isNetworkingEvent(te.event)
    );

    const networkingIsPriority =
      careerProfile.networkingGoals.length > 0 ||
      careerProfile.careerGoals.includes('networking');

    const desiredNetworkingCadence = networkingIsPriority ? 3 : 2;
    if (attendedNetworkingEvents.length >= desiredNetworkingCadence) {
      return [];
    }

    const upcomingNetworking = this.attachImpactLite(
      upcomingEvents.filter(event => this.isNetworkingEvent(event)),
      careerProfile,
      scoreCache
    ).slice(0, 3);

    if (upcomingNetworking.length > 0) {
      const estimatedImpact = this.clampScore(
        this.averageImpact(upcomingNetworking) + (networkingIsPriority ? 10 : 4)
      );

      return [{
        id: 'networking-boost',
        type: 'networking',
        title: 'Expand Your Professional Network',
        description: networkingIsPriority
          ? 'Prioritize high-signal networking events aligned with your goals.'
          : 'Build more professional connections to increase career optionality.',
        priority: networkingIsPriority && attendedNetworkingEvents.length === 0
          ? 'high'
          : this.impactToPriority(estimatedImpact),
        events: upcomingNetworking,
        actionable: true,
        estimatedImpact,
        timeToComplete: '1-2 months',
        reason: attendedNetworkingEvents.length > 0
          ? `You have ${attendedNetworkingEvents.length} networking event${attendedNetworkingEvents.length === 1 ? '' : 's'} attended; increasing this will improve relationship leverage.`
          : 'You have no completed networking events yet, which limits referral and mentorship opportunities.'
      }];
    }

    return [];
  }

  /**
   * Generate career advancement recommendations
   */
  private static generateAdvancementRecommendations(
    careerProfile: CareerProfile,
    upcomingEvents: Event[],
    scoreCache?: Map<string, number>
  ): OptimizedRecommendation[] {
    const hasAdvancementGoal = careerProfile.careerGoals.some(goal => ADVANCEMENT_GOALS.has(goal));
    if (!hasAdvancementGoal) return [];

    const roleKeywords = getRoleKeywords(careerProfile.currentRole)
      .map(keyword => keyword.toLowerCase())
      .filter(keyword => keyword.length >= 3)
      .slice(0, 8);

    const keywordPool = [...ADVANCEMENT_KEYWORDS, ...roleKeywords];

    const advancementEvents = this.attachImpactLite(
      upcomingEvents.filter(event => {
        const searchText = this.getEventSearchText(event);
        return keywordPool.some(keyword => this.containsKeyword(searchText, keyword));
      }),
      careerProfile,
      scoreCache
    ).slice(0, 3);

    if (advancementEvents.length > 0) {
      const estimatedImpact = this.clampScore(this.averageImpact(advancementEvents) + 8);

      return [{
        id: 'career-advancement',
        type: 'career_advancement',
        title: `Accelerate your ${careerProfile.currentRole} trajectory`,
        description: 'Prioritize events that strengthen leadership, influence, and next-level career skills.',
        priority: this.impactToPriority(estimatedImpact),
        events: advancementEvents,
        actionable: true,
        estimatedImpact,
        timeToComplete: this.estimateAdvancementTimeline(careerProfile.timeframe),
        reason: `These events align with your ${careerProfile.careerGoals.join(', ').replace(/-/g, ' ')} goals and current role context.`
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
    const scoreCache = new Map<string, number>();

    const attendedEvents = trackedEvents.filter(te => te.status === 'attended' && te.event);
    if (attendedEvents.length === 0) {
      const bookmarkedCount = trackedEvents.filter(te => te.isBookmarked).length;
      return bookmarkedCount > 0 ? 25 : 0;
    }

    const totalScore = attendedEvents.reduce((sum, te) => {
      return sum + this.getEventImpactScore(te.event as Event, undefined, scoreCache);
    }, 0);

    return this.clampScore(totalScore / attendedEvents.length);
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
    const scoreCache = new Map<string, number>();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthEvents = trackedEvents.filter(te => 
      te.event && new Date(te.event.startTime) >= startOfMonth && new Date(te.event.startTime) <= now
    );

    const eventsAttended = thisMonthEvents.filter(te => te.status === 'attended').length;
    
    const highImpactEvents = thisMonthEvents.filter(te =>
      te.status === 'attended' &&
      te.event &&
      this.getEventImpactScore(te.event, undefined, scoreCache) >= 70
    ).length;

    const uniqueCategories = new Set(
      thisMonthEvents
        .filter(te => te.status === 'attended' && te.event?.eventTypeId)
        .map(te => te.event!.eventTypeId)
    );
    const skillsImproved = uniqueCategories.size;

    const networkingEvents = thisMonthEvents.filter(te =>
      te.status === 'attended' &&
      te.event &&
      this.isNetworkingEvent(te.event)
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
    return this.attachImpactLite(
      upcomingEvents
      .filter(event => new Date(event.startTime) > new Date())
    ).slice(0, 10);
  }

  /**
   * Calculate simple career impact for an event
   */
  private static calculateSimpleCareerImpact(event: Event): CareerImpactScoreLite {
    let overall = 35;

    if (event.attendeeCount) {
      if (event.attendeeCount > 1000) overall += 25;
      else if (event.attendeeCount > 500) overall += 20;
      else if (event.attendeeCount > 100) overall += 12;
      else if (event.attendeeCount > 50) overall += 8;
    }

    if (this.isHighValueEvent(event)) {
      overall += 15;
    }

    if ((event.speakerLineup?.length || 0) >= 3) {
      overall += 8;
    }

    if (this.isNetworkingEvent(event)) {
      overall += 6;
    }

    return this.toCareerImpactLite(overall, 0.65);
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
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return typeof record.averageImpactScore === 'number' &&
      typeof record.impactTrend === 'string' &&
      typeof record.trendPercentage === 'number' &&
      Array.isArray(record.skillsGrowth) &&
      typeof record.careerGoalProgress === 'object' &&
      typeof record.monthlyStats === 'object' &&
      Array.isArray(record.upcomingOpportunities) &&
      typeof record.hasCareerProfile === 'boolean' &&
      typeof record.userSummary === 'object';
  }
}
