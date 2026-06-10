/**
 * Behavioral Boost Service
 *
 * Service for calculating behavioral boosts based on user interaction patterns
 */

import type { Event, SupabaseClientType } from '@/types';

export interface BehavioralBoostResult {
  boost: number; // Boost percentage (0-15)
  similarities: Array<{
  eventId: string;
    similarity: number;
    reason: string;
  }>;
  confidence: number; // 0-1 confidence in the boost
}

export interface UserContext {
  preferredCategories: string[];
  preferredFormats: string[];
  preferredTimes: string[];
  averageEventDuration: number;
  interactionFrequency: number;
}

/**
 * Behavioral Boost Service
 */
export class BehavioralBoostService {
  /**
   * Calculate behavioral boost for an event
   */
  static async calculateBehavioralBoost(
    userId: string,
    event: Event,
    interactedEvents: Event[],
    _supabaseClient: SupabaseClientType,
    _userContext?: UserContext
  ): Promise<BehavioralBoostResult> {
    try {
      // If no interaction history, no boost
      if (interactedEvents.length < 3) {
        return {
          boost: 0,
          similarities: [],
          confidence: 0
        };
      }

      // Calculate similarities with interacted events
      const similarities = this.calculateEventSimilarities(event, interactedEvents);
      
      // Calculate boost based on similarities
      const boost = this.calculateBoostFromSimilarities(similarities);
      
      // Calculate confidence based on interaction history quality
      const confidence = this.calculateConfidence(interactedEvents.length, similarities.length);

      return {
        boost: Math.min(15, Math.max(0, boost)), // Cap at 15%
        similarities: similarities.slice(0, 3), // Top 3 similarities
        confidence
      };

    } catch (error) {
      console.warn('Error calculating behavioral boost:', error);
      return {
        boost: 0,
        similarities: [],
        confidence: 0
      };
    }
  }

  /**
   * Calculate similarities between target event and user's interaction history
   */
  private static calculateEventSimilarities(
    targetEvent: Event,
    interactedEvents: Event[]
  ): Array<{
    eventId: string;
    similarity: number;
    reason: string;
  }> {
    const similarities: Array<{
      eventId: string;
      similarity: number;
      reason: string;
    }> = [];

    for (const interactedEvent of interactedEvents) {
      let similarity = 0;
        const reasons: string[] = [];

      // Category similarity (45% weight)
      if (targetEvent.eventTypeId && targetEvent.eventTypeId === interactedEvent.eventTypeId) {
        similarity += 0.45;
        reasons.push('Same category');
      }

      // Format similarity (25% weight) — only when both events carry real data.
      // Missing fields must not match (undefined === undefined previously
      // granted this weight to every event pair).
      if (
        targetEvent.eventFormat &&
        interactedEvent.eventFormat &&
        targetEvent.eventFormat === interactedEvent.eventFormat
      ) {
        similarity += 0.25;
        reasons.push('Same format');
      }

      // Difficulty similarity (15% weight) — same both-sides-present rule
      if (
        targetEvent.difficulty &&
        interactedEvent.difficulty &&
        targetEvent.difficulty === interactedEvent.difficulty
      ) {
        similarity += 0.15;
        reasons.push('Same difficulty');
      }

      // Time similarity (15% weight)
      const timeSimilarity = this.calculateTimeSimilarity(
        targetEvent.startTime,
        interactedEvent.startTime
      );
      similarity += timeSimilarity * 0.15;
      if (timeSimilarity > 0.5) {
        reasons.push('Similar time');
      }

      if (similarity > 0.3) { // Only include meaningful similarities
        similarities.push({
          eventId: interactedEvent.id,
          similarity,
          reason: reasons.join(', ')
        });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate boost percentage from similarities
   */
  private static calculateBoostFromSimilarities(
    similarities: Array<{ similarity: number }>
  ): number {
    if (similarities.length === 0) return 0;

    // Dampen weaker matches: the list is sorted by similarity strength (not
    // recency — interaction order is not preserved at this point), so the
    // strongest evidence dominates the boost.
    const weightedSimilarities = similarities.map((sim, index) => {
      const strengthWeight = 1 - (index * 0.1);
      return sim.similarity * strengthWeight;
    });

    const averageSimilarity = weightedSimilarities.reduce((sum, sim) => sum + sim, 0) / weightedSimilarities.length;
    
    // Convert similarity to boost percentage
    return averageSimilarity * 15; // Max 15% boost
  }

  /**
   * Calculate confidence in the boost calculation
   */
  private static calculateConfidence(
    interactionCount: number,
    similarityCount: number
  ): number {
    // Confidence increases with more interactions and similarities
    const interactionConfidence = Math.min(1, interactionCount / 10); // Max at 10 interactions
    const similarityConfidence = Math.min(1, similarityCount / 5); // Max at 5 similarities
    
    return (interactionConfidence + similarityConfidence) / 2;
  }

  /**
   * Calculate time similarity between two events
   */
  private static calculateTimeSimilarity(
    time1: string,
    time2: string
  ): number {
    try {
      const date1 = new Date(time1);
      const date2 = new Date(time2);
      
      const hour1 = date1.getHours();
      const hour2 = date2.getHours();
      
      // Check if events are at similar times of day
      const hourDiff = Math.abs(hour1 - hour2);
      
      if (hourDiff <= 1) return 1.0;
      if (hourDiff <= 2) return 0.8;
      if (hourDiff <= 4) return 0.6;
      if (hourDiff <= 6) return 0.4;
      
      return 0.2; // Very different times
    } catch {
      return 0;
    }
  }
}