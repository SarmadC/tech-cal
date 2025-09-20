import { Event, CareerImpactScore } from '@/types';
import { CareerProfile } from '@/types/career';
import { CareerImpactCalculationOptions, CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerImpactService } from '@/services/careerImpactService';

export interface CareerImpactEvent extends Event {
  careerImpact?: CareerImpactScore;
}

/**
 * Utility functions for career impact integration
 */
export class CareerImpactUtils {
  /**
   * Enhance events with career impact scores (with caching)
   */
  static async enhanceEventsWithCareerImpact(
    events: Event[],
    careerProfile: CareerProfile,
    options?: CareerImpactCalculationOptions
  ): Promise<CareerImpactEvent[]> {
    // Use batch processing for better cache efficiency
    const batchResult = await CareerImpactService.calculateBatchCareerImpact(
      { events, careerProfile },
      options
    );

    return events.map(event => {
      const careerImpact = batchResult.scores.get(event.id);
      return {
        ...event,
        careerImpact,
      };
    });
  }

  /**
   * Enhance events with lightweight career impact scores (faster)
   */
  static async enhanceEventsWithCareerImpactLite(
    events: Event[],
    careerProfile: CareerProfile,
    options?: CareerImpactCalculationOptions
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    const results = await Promise.all(
      events.map(async event => {
        const careerImpactLite = await CareerImpactService.getCareerImpactScoreLiteAsync(
          { event, careerProfile },
          options
        );
        return {
          ...event,
          careerImpactLite,
        };
      })
    );

    return results;
  }

  /**
   * Sort events by career impact score
   */
  static sortEventsByCareerImpact(events: CareerImpactEvent[]): CareerImpactEvent[] {
    return events.sort((a, b) => {
      const scoreA = a.careerImpact?.overall || 0;
      const scoreB = b.careerImpact?.overall || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Filter events by minimum career impact score
   */
  static filterEventsByMinScore(
    events: CareerImpactEvent[],
    minScore: number
  ): CareerImpactEvent[] {
    return events.filter(event => 
      (event.careerImpact?.overall || 0) >= minScore
    );
  }

  /**
   * Get top N events by career impact
   */
  static getTopEventsByCareerImpact(
    events: CareerImpactEvent[],
    limit: number
  ): CareerImpactEvent[] {
    return CareerImpactUtils
      .sortEventsByCareerImpact(events)
      .slice(0, limit);
  }

  /**
   * Get career impact statistics
   */
  static getCareerImpactStats(events: CareerImpactEvent[]) {
    const scores = events
      .map(event => event.careerImpact?.overall)
      .filter(score => score !== undefined) as number[];

    if (scores.length === 0) {
      return {
        average: 0,
        median: 0,
        max: 0,
        min: 0,
        count: 0,
      };
    }

    const sorted = scores.sort((a, b) => a - b);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      max,
      min,
      count: scores.length,
    };
  }

  // Consolidated score thresholds for consistent categorization
  private static readonly SCORE_THRESHOLDS = {
    HIGH: 80,
    MODERATE: 60,
    LOW: 40
  } as const;

  // Consolidated score formatting data
  private static readonly SCORE_FORMATTING = {
    HIGH: { label: 'Excellent', color: 'text-green-600', badge: 'default' as const },
    MODERATE: { label: 'Good', color: 'text-blue-600', badge: 'secondary' as const },
    LOW: { label: 'Fair', color: 'text-yellow-600', badge: 'outline' as const },
    POOR: { label: 'Poor', color: 'text-red-600', badge: 'destructive' as const }
  } as const;

  /**
   * Get score category based on thresholds
   */
  private static getScoreCategory(score: number): keyof typeof CareerImpactUtils.SCORE_FORMATTING {
    if (score >= this.SCORE_THRESHOLDS.HIGH) return 'HIGH';
    if (score >= this.SCORE_THRESHOLDS.MODERATE) return 'MODERATE';
    if (score >= this.SCORE_THRESHOLDS.LOW) return 'LOW';
    return 'POOR';
  }

  /**
   * Format career impact score for display
   */
  static formatScore(score: number): string {
    return this.SCORE_FORMATTING[this.getScoreCategory(score)].label;
  }

  /**
   * Get score color for UI
   */
  static getScoreColor(score: number): string {
    return this.SCORE_FORMATTING[this.getScoreCategory(score)].color;
  }

  /**
   * Get score badge variant for UI
   */
  static getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
    return this.SCORE_FORMATTING[this.getScoreCategory(score)].badge;
  }
}
