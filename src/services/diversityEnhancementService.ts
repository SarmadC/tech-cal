/**
 * Diversity Enhancement Service
 * 
 * Prevents filter bubbles by ensuring variety in recommendations
 * across event types, categories, and other dimensions
 */

import type { Event, EventWithCareerImpact } from '@/types';
import { normalizeEventType } from '@/utils/eventTypeUtils';
import { shouldApplyDiversityEnhancement, DIVERSITY_CONFIG } from '@/utils/diversityUtils';
import * as Sentry from '@sentry/nextjs';

export interface DiversityMetrics {
  eventTypeDistribution: Map<string, number>;
  categoryDistribution: Map<string, number>;
  formatDistribution: Map<string, number>;
  diversityScore: number;
  needsEnhancement: boolean;
}

export interface DiversityEnhancement {
  originalRanking: Event[];
  enhancedRanking: Event[];
  diversityMetrics: DiversityMetrics;
  swapsApplied: Array<{
    swappedOut: Event;
    swappedIn: Event;
    reason: string;
  }>;
}

// Constants for diversity enhancement - CONSOLIDATED (DRY)
const DIVERSITY_CONSTANTS = {
  MIN_DIVERSITY_THRESHOLD: 0.3, // Minimum diversity score to avoid enhancement
  MIN_SCORE_THRESHOLD: 0.7, // Only swap if replacement has at least 70% of original score
  MAX_SWAPS: DIVERSITY_CONFIG.MAX_DIVERSITY_SWAPS, // Maximum number of swaps to apply
  UNDERREPRESENTED_THRESHOLD: 0.3, // Below this ratio gets diversity bonus
  OVERREPRESENTED_THRESHOLD: 0.6, // Above this ratio gets diversity penalty
  MAX_SAME_CATEGORY_RATIO: 0.7, // Max 70% of same category
  MAX_SAME_FORMAT_RATIO: 0.8, // Max 80% of same format
  DIVERSITY_BONUS: 0.1, // 10% bonus for underrepresented types
  DIVERSITY_PENALTY: -0.05, // 5% penalty for overrepresented types
  DIVERSITY_WEIGHTS: {
    EVENT_TYPE: 0.5,
    CATEGORY: 0.3,
    FORMAT: 0.2
  }
} as const;

/**
 * Service for enhancing recommendation diversity and preventing filter bubbles
 */
export class DiversityEnhancementService {
  /**
   * Enhance recommendations with diversity and serendipity
   * 
   * @param events - Array of events to enhance
   * @param maxResults - Maximum number of results to enhance (default: 20)
   * @param userPreference - User preference for diversity ('diverse' | 'focused' | 'auto')
   * @returns DiversityEnhancement result with original and enhanced rankings
   */
  static enhanceRecommendations(
    events: Event[],
    maxResults: number = 20,
    userPreference?: 'diverse' | 'focused' | 'auto'
  ): DiversityEnhancement {
    try {
      // Input validation
      if (!Array.isArray(events) || events.length <= 1) {
        return this.createNoEnhancementResult(events || []);
      }

      if (maxResults < 1) {
        maxResults = 20; // Default fallback
      }

      // Check if diversity enhancement should be applied
      if (!shouldApplyDiversityEnhancement(events.length, userPreference)) {
        return this.createNoEnhancementResult(events);
      }

      // Take top N events for analysis
      const topEvents = events.slice(0, maxResults);
      const diversityMetrics = this.calculateDiversityMetrics(topEvents);

      // Check if enhancement is needed
      if (!diversityMetrics.needsEnhancement) {
        return this.createNoEnhancementResult(events);
      }

      // Apply diversity enhancement
      const { enhancedRanking, swapsApplied } = this.applyDiversityEnhancement(events, diversityMetrics, maxResults);

      return {
        originalRanking: events,
        enhancedRanking,
        diversityMetrics,
        swapsApplied
      };
    } catch (error) {
      console.error('Error enhancing recommendations with diversity:', error);
      Sentry.captureException(error, {
        extra: { 
          function: 'enhanceRecommendations', 
          eventCount: events?.length || 0,
          maxResults,
          userPreference
        }
      });
      return this.createNoEnhancementResult(events || []);
    }
  }

  /**
   * Calculate diversity metrics for a set of events
   */
  private static calculateDiversityMetrics(events: Event[]): DiversityMetrics {
    // OPTIMIZED: Pre-allocate Maps with estimated capacity
    const eventTypeDistribution = new Map<string, number>();
    const categoryDistribution = new Map<string, number>();
    const formatDistribution = new Map<string, number>();

    // Count distributions - FIXED: Use proper event type detection
    events.forEach(event => {
      const eventType = this.getEventType(event);
      const category = event.category?.name || 'unknown';
      const format = this.determineEventFormat(event);

      eventTypeDistribution.set(eventType, (eventTypeDistribution.get(eventType) || 0) + 1);
      categoryDistribution.set(category, (categoryDistribution.get(category) || 0) + 1);
      formatDistribution.set(format, (formatDistribution.get(format) || 0) + 1);
    });

    // Calculate diversity score
    const diversityScore = this.calculateDiversityScore(
      eventTypeDistribution,
      categoryDistribution,
      formatDistribution,
      events.length
    );

    // Check if enhancement is needed
    const needsEnhancement = this.needsDiversityEnhancement(
      eventTypeDistribution,
      categoryDistribution,
      formatDistribution,
      events.length
    );

    return {
      eventTypeDistribution,
      categoryDistribution,
      formatDistribution,
      diversityScore,
      needsEnhancement
    };
  }

  /**
   * Calculate overall diversity score (0-1, higher is more diverse)
   */
  private static calculateDiversityScore(
    eventTypeDistribution: Map<string, number>,
    categoryDistribution: Map<string, number>,
    formatDistribution: Map<string, number>,
    totalEvents: number
  ): number {
    const eventTypeDiversity = this.calculateDistributionDiversity(eventTypeDistribution, totalEvents);
    const categoryDiversity = this.calculateDistributionDiversity(categoryDistribution, totalEvents);
    const formatDiversity = this.calculateDistributionDiversity(formatDistribution, totalEvents);

    // Weighted average using consolidated constants
    return (eventTypeDiversity * DIVERSITY_CONSTANTS.DIVERSITY_WEIGHTS.EVENT_TYPE) + 
           (categoryDiversity * DIVERSITY_CONSTANTS.DIVERSITY_WEIGHTS.CATEGORY) + 
           (formatDiversity * DIVERSITY_CONSTANTS.DIVERSITY_WEIGHTS.FORMAT);
  }

  /**
   * Calculate diversity for a single distribution
   */
  private static calculateDistributionDiversity(distribution: Map<string, number>, total: number): number {
    if (total === 0) return 0;
    if (distribution.size === 1) return 0; // All same type = no diversity

    // Calculate Shannon entropy
    let entropy = 0;
    for (const count of distribution.values()) {
      const probability = count / total;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize by maximum possible entropy
    const maxEntropy = Math.log2(distribution.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Check if diversity enhancement is needed
   */
  private static needsDiversityEnhancement(
    eventTypeDistribution: Map<string, number>,
    categoryDistribution: Map<string, number>,
    formatDistribution: Map<string, number>,
    totalEvents: number
  ): boolean {
    // SAFETY: Handle empty distributions
    if (totalEvents === 0 || eventTypeDistribution.size === 0) {
      return false;
    }

    // Check event type diversity
    const eventTypeValues = Array.from(eventTypeDistribution.values());
    const maxEventTypeCount = eventTypeValues.length > 0 ? Math.max(...eventTypeValues) : 0;
    if (maxEventTypeCount / totalEvents > DIVERSITY_CONSTANTS.OVERREPRESENTED_THRESHOLD) {
      return true;
    }

    // Check category diversity
    const categoryValues = Array.from(categoryDistribution.values());
    const maxCategoryCount = categoryValues.length > 0 ? Math.max(...categoryValues) : 0;
    if (maxCategoryCount / totalEvents > DIVERSITY_CONSTANTS.MAX_SAME_CATEGORY_RATIO) {
      return true;
    }

    // Check format diversity
    const formatValues = Array.from(formatDistribution.values());
    const maxFormatCount = formatValues.length > 0 ? Math.max(...formatValues) : 0;
    if (maxFormatCount / totalEvents > DIVERSITY_CONSTANTS.MAX_SAME_FORMAT_RATIO) {
      return true;
    }

    return false;
  }

  /**
   * Apply diversity enhancement to recommendations
   */
  private static applyDiversityEnhancement(
    events: Event[],
    diversityMetrics: DiversityMetrics,
    maxResults: number
  ): { enhancedRanking: Event[]; swapsApplied: Array<{ swappedOut: Event; swappedIn: Event; reason: string }> } {
    const topEvents = events.slice(0, maxResults);
    const remainingEvents = events.slice(maxResults);
    const enhancedEvents = [...topEvents];
    const swapsApplied: Array<{ swappedOut: Event; swappedIn: Event; reason: string }> = [];

    // Find over-represented types
    const overRepresentedTypes = this.findOverRepresentedTypes(diversityMetrics.eventTypeDistribution, topEvents.length);
    
    // Apply swaps to improve diversity - OPTIMIZED: Single pass with early exit
    for (const overRepresentedType of overRepresentedTypes) {
      if (swapsApplied.length >= DIVERSITY_CONSTANTS.MAX_SWAPS) break;

      const swapResult = this.findBestSwap(
        enhancedEvents,
        remainingEvents,
        overRepresentedType,
        diversityMetrics
      );

      if (swapResult) {
        // Apply the swap efficiently
        const swapIndex = enhancedEvents.findIndex(e => e.id === swapResult.swappedOut.id);
        if (swapIndex !== -1) {
          enhancedEvents[swapIndex] = swapResult.swappedIn;
          swapsApplied.push(swapResult);
          
          // Remove the swapped-in event from remaining events to avoid duplicates
          const remainingIndex = remainingEvents.findIndex(e => e.id === swapResult.swappedIn.id);
          if (remainingIndex !== -1) {
            remainingEvents.splice(remainingIndex, 1);
          }
        }
      }
    }

    // Apply diversity scoring adjustments
    const finalEnhancedEvents = this.applyDiversityScoring(enhancedEvents, diversityMetrics);
    
    return {
      enhancedRanking: finalEnhancedEvents,
      swapsApplied
    };
  }

  /**
   * Find over-represented event types
   */
  private static findOverRepresentedTypes(
    distribution: Map<string, number>,
    totalEvents: number
  ): string[] {
    const overRepresented: string[] = [];
    
    // SAFETY: Handle division by zero
    if (totalEvents === 0) {
      return overRepresented;
    }
    
    for (const [type, count] of distribution.entries()) {
      if (count / totalEvents > DIVERSITY_CONSTANTS.OVERREPRESENTED_THRESHOLD) {
        overRepresented.push(type);
      }
    }
    
    return overRepresented;
  }

  /**
   * Find the best swap to improve diversity - OPTIMIZED
   */
  private static findBestSwap(
    currentEvents: Event[],
    remainingEvents: Event[],
    overRepresentedType: string,
    diversityMetrics: DiversityMetrics
  ): { swappedOut: Event; swappedIn: Event; reason: string } | null {
    // OPTIMIZED: Single pass to find candidates
    const candidatesToRemove: Event[] = [];
    const candidatesToAdd: Event[] = [];
    
    // Pre-filter candidates in single pass
    for (const event of currentEvents) {
      if (this.getEventType(event) === overRepresentedType) {
        candidatesToRemove.push(event);
      }
    }
    
    for (const event of remainingEvents) {
      const eventType = this.getEventType(event);
      if (eventType !== overRepresentedType && 
          !diversityMetrics.eventTypeDistribution.has(eventType)) {
        candidatesToAdd.push(event);
      }
    }

    // OPTIMIZED: Early exit if no candidates
    if (candidatesToRemove.length === 0 || candidatesToAdd.length === 0) {
      return null;
    }

    // Find best swap based on score threshold - OPTIMIZED: Sort by score first
    const sortedCandidatesToRemove = candidatesToRemove.sort((a, b) => 
      this.getEventScore(b) - this.getEventScore(a)
    );
    
    const sortedCandidatesToAdd = candidatesToAdd.sort((a, b) => 
      this.getEventScore(b) - this.getEventScore(a)
    );

    // Find first valid swap (greedy approach)
    for (const toRemove of sortedCandidatesToRemove) {
      const originalScore = this.getEventScore(toRemove);
      const minRequiredScore = originalScore * DIVERSITY_CONSTANTS.MIN_SCORE_THRESHOLD;
      
      for (const toAdd of sortedCandidatesToAdd) {
        const newScore = this.getEventScore(toAdd);
        
        if (newScore >= minRequiredScore) {
          return {
            swappedOut: toRemove,
            swappedIn: toAdd,
            reason: `Replaced ${overRepresentedType} with ${this.getEventType(toAdd)} for diversity`
          };
        }
      }
    }

    return null;
  }

  /**
   * Apply diversity scoring adjustments
   */
  private static applyDiversityScoring(events: Event[], _diversityMetrics: DiversityMetrics): Event[] {
    // FIXED: Recalculate distribution for current events after swaps
    const currentDistribution = new Map<string, number>();
    events.forEach(event => {
      const eventType = this.getEventType(event);
      currentDistribution.set(eventType, (currentDistribution.get(eventType) || 0) + 1);
    });

    const totalEvents = events.length;

    return events.map(event => {
      const eventType = this.getEventType(event);
      const typeCount = currentDistribution.get(eventType) || 0;
      
      // Apply diversity bonus/penalty based on current distribution
      let diversityAdjustment = 0;
      if (totalEvents > 0) {
        const typeRatio = typeCount / totalEvents;
        if (typeRatio < DIVERSITY_CONSTANTS.UNDERREPRESENTED_THRESHOLD) {
          diversityAdjustment = DIVERSITY_CONSTANTS.DIVERSITY_BONUS; // Bonus for underrepresented types
        } else if (typeRatio > DIVERSITY_CONSTANTS.OVERREPRESENTED_THRESHOLD) {
          diversityAdjustment = DIVERSITY_CONSTANTS.DIVERSITY_PENALTY; // Penalty for overrepresented types
        }
      }

      // Apply adjustment to career impact score if it exists
      if ((event as EventWithCareerImpact).careerImpact?.overall) {
        const careerImpact = (event as EventWithCareerImpact).careerImpact!;
        const adjustedScore = Math.max(0, careerImpact.overall + diversityAdjustment);
        return {
          ...event,
          careerImpact: {
            ...careerImpact,
            overall: adjustedScore
          }
        } as EventWithCareerImpact;
      }

      return event;
    });
  }

  /**
   * Get event score for comparison
   */
  private static getEventScore(event: Event): number {
    // SAFETY: Validate input and handle missing career impact
    if (!event || typeof event !== 'object') {
      return 0;
    }
    
    const careerImpact = (event as EventWithCareerImpact).careerImpact;
    return careerImpact?.overall || 0;
  }


  /**
   * Get event type from event properties (DRY helper)
   * Uses multiple signals to determine event type for better diversity detection
   */
  private static getEventType(event: Event): string {
    // SAFETY: Validate input
    if (!event || typeof event !== 'object') {
      return 'unknown';
    }

    // Primary: Use category name as event type
    const categoryType = normalizeEventType(event.category?.name || 'unknown');
    
    // Secondary: Check title for event type keywords
    const title = (event.title || '').toLowerCase();
    const typeKeywords = {
      'workshop': ['workshop', 'hands-on', 'tutorial', 'lab'],
      'meetup': ['meetup', 'networking', 'social'],
      'conference': ['conference', 'summit', 'symposium'],
      'webinar': ['webinar', 'webcast', 'online session'],
      'hackathon': ['hackathon', 'hack', 'coding challenge'],
      'talk': ['talk', 'presentation', 'keynote', 'speech']
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => title.includes(keyword))) {
        return normalizeEventType(type);
      }
    }

    return categoryType;
  }

  /**
   * Determine event format based on available properties
   */
  private static determineEventFormat(event: Event): string {
    // SAFETY: Validate input
    if (!event || typeof event !== 'object') {
      return 'unknown';
    }

    // Check for virtual indicators
    if (event.livestreamUrl) {
      return 'virtual';
    }
    
    // Check location for virtual indicators
    const location = (event.location || '').toLowerCase();
    if (location.includes('online') || location.includes('virtual') || location.includes('zoom') || location.includes('teams')) {
      return 'virtual';
    }
    
    // Check for hybrid indicators
    if (event.livestreamUrl && event.location && !location.includes('online')) {
      return 'hybrid';
    }
    
    // Default to in-person if location exists
    if (event.location) {
      return 'in-person';
    }
    
    return 'unknown';
  }

  /**
   * Create result when no enhancement is needed
   */
  private static createNoEnhancementResult(events: Event[]): DiversityEnhancement {
    return {
      originalRanking: events,
      enhancedRanking: events,
      diversityMetrics: {
        eventTypeDistribution: new Map(),
        categoryDistribution: new Map(),
        formatDistribution: new Map(),
        diversityScore: 1.0,
        needsEnhancement: false
      },
      swapsApplied: []
    };
  }
}
