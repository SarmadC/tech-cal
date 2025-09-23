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
  static async findUserCohorts(
    userProfile: CareerProfile,
    allUserProfiles: CareerProfile[] = [],
    userEvents: TrackedEventRecord[] = []
  ): Promise<PeerCohort> {
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
    _userEvents: TrackedEventRecord[]
  ): UserCohort {
    // Convert profiles to cohort users (simplified - would need real event data)
    const cohortUsers: CohortUser[] = matchingUsers.map(profile => ({
      userId: profile.userId,
      role: profile.currentRole,
      seniority: profile.seniority,
      eventCount: Math.floor(Math.random() * 24) + 1, // Mock data - would be real
      careerImpactScore: Math.floor(Math.random() * 40) + 60 // Mock data
    }));

    // Calculate baseline metrics
    const totalEvents = cohortUsers.reduce((sum, user) => sum + user.eventCount, 0);
    const averageActivity = cohortUsers.length > 0 ? totalEvents / cohortUsers.length : 0;

    // Create event baseline based on role category
    const eventBaseline = this.createEventBaseline(roleIdentifier, averageActivity);

    return {
      users: cohortUsers,
      size: cohortUsers.length,
      averageActivity,
      eventBaseline,
      roleCategory: roleIdentifier,
      seniorityRange
    };
  }

  /**
   * Create event baseline for role category
   */
  private static createEventBaseline(roleIdentifier: string, averageActivity: number): EventBaseline {
    const roleCategory = this.getRoleCategory(roleIdentifier) || roleIdentifier;

    // Role-specific event preferences
    const eventPreferences: Record<string, string[]> = {
      [ROLE_CATEGORIES.ENGINEERING]: ['technical', 'workshop', 'conference', 'hackathon'],
      [ROLE_CATEGORIES.DATA_AI]: ['technical', 'research', 'conference', 'workshop'],
      [ROLE_CATEGORIES.PRODUCT_DESIGN]: ['business', 'user-research', 'design', 'strategy'],
      [ROLE_CATEGORIES.LEADERSHIP]: ['leadership', 'strategy', 'business', 'management']
    };

    return {
      eventsPerMonth: Math.round((averageActivity / 12) * 10) / 10,
      preferredEventTypes: eventPreferences[roleCategory] || ['conference', 'workshop'],
      avgCareerImpact: 75 // baseline impact score
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