/**
 * Lookalike User Service
 * 
 * Solves the cold start problem by finding users with similar profiles
 * and using their popular events as initial recommendations
 */

import type { SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';
import { handleServiceError } from '@/utils/commonUtils';
import * as Sentry from '@sentry/nextjs';

export interface LookalikeUser {
  userId: string;
  similarityScore: number;
  sharedSkills: string[];
  sharedInterests: string[];
  careerStage: string;
  industry: string;
}

export interface LookalikeRecommendation {
  eventId: string;
  popularityScore: number;
  lookalikeUsers: string[];
  reason: string;
}

// Constants for better maintainability
const LOOKALIKE_CONSTANTS = {
  MAX_PROFILES_TO_COMPARE: 1000,
  MIN_SIMILARITY_THRESHOLD: 0.3,
  INTERACTION_LOOKBACK_DAYS: 90,
  DEFAULT_LOOKALIKE_LIMIT: 10,
  DEFAULT_RECOMMENDATION_LIMIT: 20,
  SIMILARITY_WEIGHTS: {
    INTERACTION_SCORE: 0.4,
    DIVERSITY_SCORE: 0.4,
    ENGAGEMENT_SCORE: 0.2
  },
  STAGE_BONUS: {
    SAME_SENIORITY: 0.2,
    SAME_INDUSTRY: 0.1
  }
} as const;

/**
 * Service for finding lookalike users and generating cold start recommendations
 */
export class LookalikeUserService {
  /**
   * Find users with similar career profiles
   */
  static async findLookalikeUsers(
    userProfile: CareerProfile,
    supabaseClient: SupabaseClientType,
    limit: number = 10
  ): Promise<LookalikeUser[]> {
    try {
      // Validate input
      if (!userProfile?.userId) {
        console.warn('Invalid user profile provided to findLookalikeUsers');
        return [];
      }

      // Get career profiles with pagination for performance
      const { data: profiles, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('career_profiles')
        .select('user_id, primary_skills, skills_to_learn, interests, seniority, industry')
        .not('user_id', 'is', null)
        .neq('user_id', userProfile.userId) // Exclude current user
        .limit(LOOKALIKE_CONSTANTS.MAX_PROFILES_TO_COMPARE);

      if (error) throw error;
      if (!profiles?.length) return [];

      // Calculate similarity scores efficiently
      const lookalikeUsers = this.calculateSimilarityScores(userProfile, profiles, limit);
      return lookalikeUsers;
    } catch (error) {
      console.error('Error finding lookalike users:', error);
      Sentry.captureException(error, {
        extra: { function: 'findLookalikeUsers', userId: userProfile.userId }
      });
      return handleServiceError(error, { function: 'findLookalikeUsers', context: 'Failed to find lookalike users' }, []) as LookalikeUser[];
    }
  }

  /**
   * Get popular events from lookalike users
   */
  static async getLookalikeRecommendations(
    lookalikeUsers: LookalikeUser[],
    supabaseClient: SupabaseClientType,
    limit: number = 20
  ): Promise<LookalikeRecommendation[]> {
    if (!lookalikeUsers?.length) return [];

    try {
      const userIds = lookalikeUsers.map(user => user.userId).filter(Boolean);
      if (userIds.length === 0) return [];
      
      // Get events that lookalike users have interacted with
      const { data: interactions, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('career_impact_analytics')
        .select('event_id, user_id, metric_type, metric_value')
        .in('user_id', userIds)
        .in('metric_type', ['click', 'save'])
        .gte('metric_value', 1)
        .gte('created_at', new Date(Date.now() - LOOKALIKE_CONSTANTS.INTERACTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      if (!interactions?.length) return [];

      // Calculate popularity scores for each event
      const eventPopularity = this.calculateEventPopularity(interactions, lookalikeUsers.length);

      // Convert to recommendations with popularity scores
      const recommendations = this.createRecommendationsFromPopularity(eventPopularity, lookalikeUsers.length, limit);
      return recommendations;
    } catch (error) {
      console.error('Error getting lookalike recommendations:', error);
      Sentry.captureException(error, {
        extra: { function: 'getLookalikeRecommendations', lookalikeCount: lookalikeUsers.length }
      });
      return handleServiceError(error, { function: 'getLookalikeRecommendations', context: 'Failed to get lookalike recommendations' }, []) as LookalikeRecommendation[];
    }
  }

  /**
   * Calculate similarity scores for multiple profiles efficiently
   */
  private static calculateSimilarityScores(
    userProfile: CareerProfile,
    profiles: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    limit: number
  ): LookalikeUser[] {
    return profiles
      .map((profile: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const similarity = this.calculateProfileSimilarity(userProfile, profile);
        return {
          userId: profile.user_id,
          similarityScore: similarity.score,
          sharedSkills: similarity.sharedSkills,
          sharedInterests: similarity.sharedInterests,
          careerStage: profile.seniority || 'unknown',
          industry: profile.industry || 'unknown'
        };
      })
      .filter((user: LookalikeUser) => user.similarityScore > LOOKALIKE_CONSTANTS.MIN_SIMILARITY_THRESHOLD)
      .sort((a: LookalikeUser, b: LookalikeUser) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two career profiles
   */
  private static calculateProfileSimilarity(
    userProfile: CareerProfile,
    otherProfile: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): {
    score: number;
    sharedSkills: string[];
    sharedInterests: string[];
  } {
    // Validate inputs
    if (!userProfile || !otherProfile) {
      return { score: 0, sharedSkills: [], sharedInterests: [] };
    }

    const sharedSkills: string[] = [];
    const sharedInterests: string[] = [];

    // Compare primary skills
    const userSkills = userProfile.primarySkills || [];
    const otherSkills = otherProfile.primary_skills || [];
    const skillMatches = this.findMatchingItems(userSkills, otherSkills);
    sharedSkills.push(...skillMatches);

    // Compare skills to learn
    const userSkillsToLearn = userProfile.skillsToLearn || [];
    const otherSkillsToLearn = otherProfile.skills_to_learn || [];
    const skillsToLearnMatches = this.findMatchingItems(userSkillsToLearn, otherSkillsToLearn);
    sharedSkills.push(...skillsToLearnMatches);

    // Compare interests
    const userInterests = userProfile.interests || [];
    const otherInterests = otherProfile.interests || [];
    const interestMatches = this.findMatchingItems(userInterests, otherInterests);
    sharedInterests.push(...interestMatches);

    // Calculate similarity score (0-1)
    const totalUserItems = userSkills.length + userSkillsToLearn.length + userInterests.length;
    const totalMatches = skillMatches.length + skillsToLearnMatches.length + interestMatches.length;
    
    // Bonus for same career stage and industry
    let stageBonus = 0;
    if (userProfile.seniority === otherProfile.seniority) stageBonus += LOOKALIKE_CONSTANTS.STAGE_BONUS.SAME_SENIORITY;
    if (userProfile.industry === otherProfile.industry) stageBonus += LOOKALIKE_CONSTANTS.STAGE_BONUS.SAME_INDUSTRY;

    const baseScore = totalUserItems > 0 ? totalMatches / totalUserItems : 0;
    const finalScore = Math.min(1, baseScore + stageBonus);

    return {
      score: finalScore,
      sharedSkills: [...new Set(sharedSkills)],
      sharedInterests: [...new Set(sharedInterests)]
    };
  }

  /**
   * Find matching items between two arrays (DRY helper)
   */
  private static findMatchingItems(
    userItems: string[],
    otherItems: string[]
  ): string[] {
    if (!userItems?.length || !otherItems?.length) return [];
    
    return userItems.filter(userItem => 
      otherItems.some(otherItem => 
        this.stringsMatch(userItem, otherItem)
      )
    );
  }

  /**
   * Check if two strings match (case-insensitive, partial matching)
   */
  private static stringsMatch(str1: string, str2: string): boolean {
    if (!str1 || !str2) return false;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    return s1.includes(s2) || s2.includes(s1);
  }

  /**
   * Calculate event popularity from interactions (DRY helper)
   */
  private static calculateEventPopularity(
    interactions: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
    _totalLookalikeUsers: number
  ): Map<string, { totalInteractions: number; uniqueUsers: Set<string>; lookalikeUsers: string[] }> {
    const eventPopularity = new Map<string, {
      totalInteractions: number;
      uniqueUsers: Set<string>;
      lookalikeUsers: string[];
    }>();

    interactions.forEach((interaction: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const eventId = interaction.event_id;
      if (!eventId) return; // Skip invalid interactions

      if (!eventPopularity.has(eventId)) {
        eventPopularity.set(eventId, {
          totalInteractions: 0,
          uniqueUsers: new Set(),
          lookalikeUsers: []
        });
      }

      const eventData = eventPopularity.get(eventId)!;
      eventData.totalInteractions += interaction.metric_value || 1;
      eventData.uniqueUsers.add(interaction.user_id);
      eventData.lookalikeUsers.push(interaction.user_id);
    });

    return eventPopularity;
  }

  /**
   * Create recommendations from popularity data (DRY helper)
   */
  private static createRecommendationsFromPopularity(
    eventPopularity: Map<string, { totalInteractions: number; uniqueUsers: Set<string>; lookalikeUsers: string[] }>,
    totalLookalikeUsers: number,
    limit: number
  ): LookalikeRecommendation[] {
    return Array.from(eventPopularity.entries())
      .map(([eventId, data]) => {
        const popularityScore = this.calculatePopularityScore(
          data.totalInteractions,
          data.uniqueUsers.size,
          totalLookalikeUsers
        );

        return {
          eventId,
          popularityScore,
          lookalikeUsers: [...new Set(data.lookalikeUsers)],
          reason: `Popular among ${data.uniqueUsers.size} similar users`
        };
      })
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  /**
   * Calculate popularity score for an event
   */
  private static calculatePopularityScore(
    totalInteractions: number,
    uniqueUsers: number,
    totalLookalikeUsers: number
  ): number {
    // Weight by both total interactions and user diversity
    const interactionScore = Math.log(totalInteractions + 1) / Math.log(10); // Log scale
    const diversityScore = uniqueUsers / totalLookalikeUsers; // Percentage of lookalike users
    const engagementScore = uniqueUsers > 0 ? totalInteractions / uniqueUsers : 0; // Average interactions per user

    return interactionScore * LOOKALIKE_CONSTANTS.SIMILARITY_WEIGHTS.INTERACTION_SCORE + 
           diversityScore * LOOKALIKE_CONSTANTS.SIMILARITY_WEIGHTS.DIVERSITY_SCORE + 
           engagementScore * LOOKALIKE_CONSTANTS.SIMILARITY_WEIGHTS.ENGAGEMENT_SCORE;
  }

  /**
   * Check if user is in cold start state (no interactions)
   */
  static async isColdStartUser(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    try {
      const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('career_impact_analytics')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking cold start status:', error);
      Sentry.captureException(error, {
        extra: { function: 'isColdStartUser', userId }
      });
      return true; // Assume cold start on error for safety
    }
  }
}
