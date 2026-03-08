import {
  ROLE_CATEGORIES,
  ROLE_TAXONOMY,
  COHORT_REQUIREMENTS,
  ROLE_EVENT_WEIGHTS
} from '@/types/career';
import type { CareerProfile, Event, TrackedEventRecord } from '@/types';

export interface PeerCohort {
  primaryMatch: UserCohort;
  fallbackMatch: UserCohort | null;
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface UserCohort {
  users: CohortUser[];
  size: number;
  averageActivity: number;
  eventBaseline: EventBaseline;
  roleCategory: string;
  seniorityRange: string[];
}

export interface PeerComparisonSnapshot {
  percentile: number;
  comparison: 'above' | 'below' | 'average';
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface CohortUser {
  userId: string;
  role: string;
  seniority: string;
  eventCount: number;
  careerImpactScore: number;
}

interface EventBaseline {
  eventsPerMonth: number;
  preferredEventTypes: string[];
  avgCareerImpact: number;
}

export class PeerCohortService {
  /**
   * Find intelligent peer cohorts for role-based comparison
   */
  static findUserCohorts(
    userProfile: CareerProfile,
    allUserProfiles: CareerProfile[] = [],
    userEvents: TrackedEventRecord[] = []
  ): PeerCohort {
    try {
      // 1. Try exact role + similar seniority match
      const primaryMatch = this.findExactRoleMatch(userProfile, allUserProfiles, userEvents);

      // 2. Try role category fallback if primary match is too small
      let fallbackMatch: UserCohort | null = null;
      if (primaryMatch.size < COHORT_REQUIREMENTS.MINIMUM_VIABLE) {
        fallbackMatch = this.findRoleCategoryMatch(userProfile, allUserProfiles, userEvents);
      }

      // 3. Determine confidence and recommendation
      const { confidence, recommendation } = this.assessCohortQuality(primaryMatch, fallbackMatch);

      return {
        primaryMatch,
        fallbackMatch,
        confidence,
        recommendation
      };
    } catch (error) {
      console.warn('Error finding user cohorts:', error);
      return this.getEmptyCohort(userProfile);
    }
  }

  /**
   * Build peer-comparison snapshot for dashboard metrics.
   * Uses cohort matching when available and deterministic modeled cohort as fallback.
   */
  static calculatePeerComparison(
    userProfile: CareerProfile,
    userEvents: TrackedEventRecord[] = [],
    allUserProfiles: CareerProfile[] = []
  ): PeerComparisonSnapshot {
    const cohortResult = this.findUserCohorts(userProfile, allUserProfiles, userEvents);
    const selectedObservedCohort =
      cohortResult.primaryMatch.size >= COHORT_REQUIREMENTS.MINIMUM_VIABLE
        ? cohortResult.primaryMatch
        : cohortResult.fallbackMatch && cohortResult.fallbackMatch.size > 0
          ? cohortResult.fallbackMatch
          : cohortResult.primaryMatch.size > 0
            ? cohortResult.primaryMatch
            : null;
    const hasObservedCohort = selectedObservedCohort !== null;
    const selectedCohort = selectedObservedCohort ?? this.createModeledCohort(userProfile, userEvents);

    const observedSignals = this.deriveObservedUserSignals(userEvents);
    const annualizedUserEventCount = observedSignals
      ? Math.round(observedSignals.eventsPerMonth * 12)
      : Math.max(
          0,
          userEvents.filter(event => event.status === 'attended').length
        );

    const percentile = this.calculatePercentile(annualizedUserEventCount, selectedCohort);
    const comparison: 'above' | 'below' | 'average' =
      percentile >= 60 ? 'above' : percentile <= 40 ? 'below' : 'average';

    const recommendation = hasObservedCohort
      ? cohortResult.recommendation
      : 'Baseline comparison derived from your role and activity patterns';

    return {
      percentile,
      comparison,
      sampleSize: selectedObservedCohort?.size ?? 0,
      confidence: hasObservedCohort ? cohortResult.confidence : 'low',
      recommendation
    };
  }

  /**
   * Find users with exact same role and similar seniority
   */
  private static findExactRoleMatch(
    userProfile: CareerProfile,
    allProfiles: CareerProfile[],
    userEvents: TrackedEventRecord[]
  ): UserCohort {
    const similarSeniorityLevels = this.getSimilarSeniorityLevels(userProfile.seniority);

    const matchingUsers = allProfiles.filter(profile =>
      profile.currentRole === userProfile.currentRole &&
      similarSeniorityLevels.includes(profile.seniority) &&
      profile.userId !== userProfile.userId
    );

    return this.buildCohort(
      matchingUsers,
      userProfile.currentRole,
      similarSeniorityLevels,
      userEvents
    );
  }

  /**
   * Find users in same role category (broader match)
   */
  private static findRoleCategoryMatch(
    userProfile: CareerProfile,
    allProfiles: CareerProfile[],
    userEvents: TrackedEventRecord[]
  ): UserCohort {
    const userRoleCategory = this.getRoleCategory(userProfile.currentRole);
    if (!userRoleCategory) {
      return this.getEmptyUserCohort();
    }

    const categoryRoles = ROLE_TAXONOMY[userRoleCategory as keyof typeof ROLE_TAXONOMY];
    const similarSeniorityLevels = this.getSimilarSeniorityLevels(userProfile.seniority);

    const matchingUsers = allProfiles.filter(profile =>
      (categoryRoles as readonly string[]).includes(profile.currentRole) &&
      similarSeniorityLevels.includes(profile.seniority) &&
      profile.userId !== userProfile.userId
    );

    return this.buildCohort(
      matchingUsers,
      userRoleCategory,
      similarSeniorityLevels,
      userEvents
    );
  }

  /**
   * Get role category for a specific role
   */
  private static getRoleCategory(role: string): string | null {
    for (const [category, roles] of Object.entries(ROLE_TAXONOMY)) {
      if ((roles as readonly string[]).includes(role)) {
        return category;
      }
    }
    return null;
  }

  /**
   * Get similar seniority levels for cohort matching
   */
  private static getSimilarSeniorityLevels(seniority: string): string[] {
    const seniorityGroups = {
      'early-career': ['student', 'entry-level', 'junior'],
      'mid-career': ['junior', 'mid-level', 'senior'],
      'senior-career': ['senior', 'staff', 'principal'],
      'leadership': ['lead', 'manager', 'director', 'vp']
    };

    for (const [_group, levels] of Object.entries(seniorityGroups)) {
      if (levels.includes(seniority)) {
        return levels;
      }
    }

    return [seniority]; // fallback to exact match
  }

  /**
   * Build cohort from matching users
   */
  private static buildCohort(
    matchingUsers: CareerProfile[],
    roleIdentifier: string,
    seniorityRange: string[],
    userEvents: TrackedEventRecord[]
  ): UserCohort {
    const observedSignals = this.deriveObservedUserSignals(userEvents);

    // Convert profiles to cohort users using deterministic profile-derived estimates.
    const cohortUsers: CohortUser[] = matchingUsers.map(profile => ({
      userId: profile.userId,
      role: profile.currentRole,
      seniority: profile.seniority,
      eventCount: this.estimateAnnualEventCount(profile, observedSignals?.eventsPerMonth ?? null),
      careerImpactScore: this.estimateCareerImpactScore(profile, observedSignals?.avgImpactScore ?? null)
    }));

    // Calculate baseline metrics
    const totalEvents = cohortUsers.reduce((sum, user) => sum + user.eventCount, 0);
    const averageActivity = cohortUsers.length > 0 ? totalEvents / cohortUsers.length : 0;

    // Create event baseline based on role category
    const eventBaseline = this.createEventBaseline(
      roleIdentifier,
      averageActivity,
      cohortUsers,
      matchingUsers
    );

    return {
      users: cohortUsers,
      size: cohortUsers.length,
      averageActivity,
      eventBaseline,
      roleCategory: roleIdentifier,
      seniorityRange
    };
  }

  private static createModeledCohort(
    userProfile: CareerProfile,
    userEvents: TrackedEventRecord[]
  ): UserCohort {
    const observedSignals = this.deriveObservedUserSignals(userEvents);
    const baseEventCount = this.estimateAnnualEventCount(userProfile, observedSignals?.eventsPerMonth ?? null);
    const baseImpact = this.estimateCareerImpactScore(userProfile, observedSignals?.avgImpactScore ?? null);
    const modeledSize = COHORT_REQUIREMENTS.MINIMUM_VIABLE;

    const modeledUsers: CohortUser[] = Array.from({ length: modeledSize }, (_, index) => {
      const spread = index - Math.floor(modeledSize / 2);
      return {
        userId: `modeled-peer-${index + 1}`,
        role: userProfile.currentRole,
        seniority: userProfile.seniority,
        eventCount: Math.max(4, Math.min(36, baseEventCount + spread)),
        careerImpactScore: Math.max(45, Math.min(95, baseImpact + (spread * 2)))
      };
    });

    const averageActivity = modeledUsers.reduce((sum, user) => sum + user.eventCount, 0) / modeledUsers.length;
    const eventBaseline = this.createEventBaseline(
      userProfile.currentRole,
      averageActivity,
      modeledUsers,
      [userProfile]
    );

    return {
      users: modeledUsers,
      size: modeledUsers.length,
      averageActivity,
      eventBaseline,
      roleCategory: this.getRoleCategory(userProfile.currentRole) || userProfile.currentRole,
      seniorityRange: this.getSimilarSeniorityLevels(userProfile.seniority)
    };
  }

  private static deriveObservedUserSignals(
    userEvents: TrackedEventRecord[]
  ): { eventsPerMonth: number; avgImpactScore: number | null } | null {
    const attendedEvents = userEvents
      .filter(record => record.status === 'attended' && record.event)
      .map(record => record.event as Event);

    if (attendedEvents.length === 0) {
      return null;
    }

    const eventTimestamps = attendedEvents
      .map(event => new Date(event.startTime).getTime())
      .filter(timestamp => Number.isFinite(timestamp))
      .sort((a, b) => a - b);

    const oldestTimestamp = eventTimestamps[0];
    const monthsObserved = oldestTimestamp
      ? Math.max(1, (Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24 * 30))
      : 12;

    const eventsPerMonth = attendedEvents.length / monthsObserved;

    // Only average over events that have a real score — skip fabricated zeros
    const scoredEvents = attendedEvents.filter(e => this.inferEventImpactScore(e) > 0);
    const avgImpactScore = scoredEvents.length > 0
      ? scoredEvents.reduce((sum, e) => sum + this.inferEventImpactScore(e), 0) / scoredEvents.length
      : null;

    return {
      eventsPerMonth,
      avgImpactScore
    };
  }

  private static estimateAnnualEventCount(
    profile: CareerProfile,
    observedEventsPerMonth: number | null
  ): number {
    let annualCount = this.getSeniorityActivityBaseline(profile.seniority);

    annualCount += Math.min(profile.skillsToLearn.length, 6) * 0.7;
    annualCount += Math.min(profile.networkingGoals.length, 5) * 0.9;
    annualCount += Math.min(profile.careerGoals.length, 4) * 0.6;

    const timeAdjustment: Record<string, number> = {
      'very-limited': -4,
      'limited': -2,
      'moderate': 0,
      'flexible': 2,
      'dedicated': 4
    };
    annualCount += timeAdjustment[profile.availableTime] ?? 0;

    if (observedEventsPerMonth !== null) {
      const observedAnnual = observedEventsPerMonth * 12;
      annualCount = (annualCount * 0.75) + (observedAnnual * 0.25);
    }

    return Math.round(Math.max(4, Math.min(36, annualCount)));
  }

  private static estimateCareerImpactScore(
    profile: CareerProfile,
    observedImpactScore: number | null
  ): number {
    let score = 52;

    score += this.getSeniorityImpactBaseline(profile.seniority);
    score += Math.min(profile.primarySkills.length, 8) * 2.2;
    score += Math.min(profile.skillsToLearn.length, 6) * 1.3;
    score += Math.min(profile.interests.length, 6) * 0.8;

    if (profile.careerGoals.includes('career-advancement')) score += 4;
    if (profile.careerGoals.includes('leadership-growth')) score += 4;
    if (profile.careerGoals.includes('networking')) score += 3;
    if (profile.careerGoals.includes('role-transition')) score += 3;

    if (profile.learningStyle.includes('hands-on')) score += 2;
    if (profile.learningStyle.includes('interactive')) score += 2;

    if (observedImpactScore !== null) {
      score = (score * 0.8) + (observedImpactScore * 0.2);
    }

    return Math.round(Math.max(45, Math.min(95, score)));
  }

  private static getSeniorityActivityBaseline(seniority: string): number {
    const activityBaseline: Record<string, number> = {
      'student': 20,
      'entry-level': 16,
      'junior': 14,
      'mid-level': 12,
      'senior': 10,
      'staff': 9,
      'principal': 8,
      'lead': 10,
      'manager': 9,
      'director': 8,
      'vp': 7,
      'founder': 11
    };

    return activityBaseline[seniority] ?? 10;
  }

  private static getSeniorityImpactBaseline(seniority: string): number {
    const impactBaseline: Record<string, number> = {
      'student': 2,
      'entry-level': 4,
      'junior': 5,
      'mid-level': 7,
      'senior': 9,
      'staff': 11,
      'principal': 12,
      'lead': 10,
      'manager': 10,
      'director': 11,
      'vp': 12,
      'founder': 10
    };

    return impactBaseline[seniority] ?? 7;
  }

  private static inferEventImpactScore(event: Event): number {
    const scoredEvent = event as Event & {
      careerImpactLite?: { overall?: number };
      careerImpact?: { overall?: number };
    };
    const knownScore = scoredEvent.careerImpactLite?.overall ?? scoredEvent.careerImpact?.overall;
    if (typeof knownScore === 'number' && Number.isFinite(knownScore)) {
      return Math.max(0, Math.min(100, knownScore <= 1 ? knownScore * 100 : knownScore));
    }

    return 0; // No real score — don't fabricate
  }

  private static getPreferredEventTypes(
    matchingUsers: CareerProfile[],
    roleCategory: string,
    fallbackPreferences: Record<string, string[]>
  ): string[] {
    const eventTypeCounts = new Map<string, number>();

    matchingUsers.forEach(profile => {
      profile.preferredEventTypes.forEach(eventType => {
        const normalized = eventType.toLowerCase();
        eventTypeCounts.set(normalized, (eventTypeCounts.get(normalized) || 0) + 1);
      });
    });

    const rankedEventTypes = Array.from(eventTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([eventType]) => eventType);

    return rankedEventTypes.length > 0
      ? rankedEventTypes
      : (fallbackPreferences[roleCategory] || ['conference', 'workshop']);
  }

  /**
   * Create event baseline for role category
   */
  private static createEventBaseline(
    roleIdentifier: string,
    averageActivity: number,
    cohortUsers: CohortUser[],
    matchingUsers: CareerProfile[]
  ): EventBaseline {
    const roleCategory = this.getRoleCategory(roleIdentifier) || roleIdentifier;

    // Role-specific event preferences
    const eventPreferences: Record<string, string[]> = {
      [ROLE_CATEGORIES.ENGINEERING]: ['technical', 'workshop', 'conference', 'hackathon'],
      [ROLE_CATEGORIES.DATA_AI]: ['technical', 'research', 'conference', 'workshop'],
      [ROLE_CATEGORIES.PRODUCT_DESIGN]: ['business', 'user-research', 'design', 'strategy'],
      [ROLE_CATEGORIES.LEADERSHIP]: ['leadership', 'strategy', 'business', 'management']
    };

    const avgCareerImpact = cohortUsers.length > 0
      ? cohortUsers.reduce((sum, user) => sum + user.careerImpactScore, 0) / cohortUsers.length
      : 75;

    return {
      eventsPerMonth: Math.round((averageActivity / 12) * 10) / 10,
      preferredEventTypes: this.getPreferredEventTypes(matchingUsers, roleCategory, eventPreferences),
      avgCareerImpact: Math.round(avgCareerImpact)
    };
  }

  /**
   * Assess quality of cohort matches
   */
  private static assessCohortQuality(
    primaryMatch: UserCohort,
    fallbackMatch: UserCohort | null
  ): { confidence: 'high' | 'medium' | 'low'; recommendation: string } {
    const primarySize = primaryMatch.size;

    if (primarySize >= COHORT_REQUIREMENTS.CONFIDENT_SAMPLE) {
      return {
        confidence: 'high',
        recommendation: `Strong peer comparison available with ${primarySize} similar professionals`
      };
    }

    if (primarySize >= COHORT_REQUIREMENTS.SMALL_SAMPLE) {
      return {
        confidence: 'medium',
        recommendation: `Good peer comparison with ${primarySize} professionals (smaller sample)`
      };
    }

    if (primarySize >= COHORT_REQUIREMENTS.MINIMUM_VIABLE) {
      return {
        confidence: 'medium',
        recommendation: `Basic peer comparison with ${primarySize} professionals`
      };
    }

    if (fallbackMatch && fallbackMatch.size >= COHORT_REQUIREMENTS.MINIMUM_VIABLE) {
      return {
        confidence: 'low',
        recommendation: `Comparison based on ${fallbackMatch.size} professionals in similar roles`
      };
    }

    return {
      confidence: 'low',
      recommendation: 'Building your peer group... More data needed for reliable comparison'
    };
  }

  /**
   * Calculate user percentile within cohort
   */
  static calculatePercentile(
    userEventCount: number,
    cohort: UserCohort
  ): number {
    if (cohort.size === 0) return 50; // default to median

    const usersBelowTarget = cohort.users.filter(
      user => user.eventCount < userEventCount
    ).length;

    return Math.round((usersBelowTarget / cohort.size) * 100);
  }

  /**
   * Apply role-specific event weighting
   */
  static calculateRoleWeightedScore(
    events: Event[],
    userRole: string
  ): number {
    const roleCategory = this.getRoleCategory(userRole);
    if (!roleCategory) return 0;

    const weights = ROLE_EVENT_WEIGHTS[roleCategory as keyof typeof ROLE_EVENT_WEIGHTS];
    if (!weights) return 0;

    let totalScore = 0;
    let eventCount = 0;

    events.forEach(event => {
      const eventType = this.categorizeEvent(event);
      const weight = (weights as Record<string, number>)[eventType] || 0.5; // default weight
      const baseScore = 75; // base event value

      totalScore += baseScore * weight;
      eventCount++;
    });

    return eventCount > 0 ? totalScore / eventCount : 0;
  }

  /**
   * Categorize event for role-specific weighting
   */
  private static categorizeEvent(event: Event): string {
    const title = event.title.toLowerCase();
    const _description = event.description.toLowerCase();

    // Technical events
    if (title.includes('technical') || title.includes('engineering') ||
        title.includes('coding') || title.includes('development')) {
      return 'technical';
    }

    // Research events
    if (title.includes('research') || title.includes('science') ||
        title.includes('ai') || title.includes('ml')) {
      return 'research';
    }

    // Business events
    if (title.includes('business') || title.includes('strategy') ||
        title.includes('product') || title.includes('management')) {
      return 'business';
    }

    // Workshops
    if (title.includes('workshop') || title.includes('hands-on') ||
        title.includes('tutorial')) {
      return 'workshop';
    }

    // Leadership
    if (title.includes('leadership') || title.includes('management') ||
        title.includes('executive')) {
      return 'leadership';
    }

    // Default to conference
    return 'conference';
  }

  /**
   * Empty cohort fallback
   */
  private static getEmptyCohort(_userProfile: CareerProfile): PeerCohort {
    return {
      primaryMatch: this.getEmptyUserCohort(),
      fallbackMatch: null,
      confidence: 'low',
      recommendation: 'Building your peer group... More users needed for comparison'
    };
  }

  private static getEmptyUserCohort(): UserCohort {
    return {
      users: [],
      size: 0,
      averageActivity: 0,
      eventBaseline: {
        eventsPerMonth: 2.0,
        preferredEventTypes: ['conference', 'workshop'],
        avgCareerImpact: 75
      },
      roleCategory: 'General',
      seniorityRange: []
    };
  }
}
