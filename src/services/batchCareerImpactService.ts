import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import type { CareerProfile } from '@/types/career';

interface BatchCareerImpactRequest {
  eventIds: string[];
  options?: {
    includeExplanations?: boolean;
  };
  includeEvents?: boolean;
}

interface BatchCareerImpactResponse {
  success: boolean;
  data?: {
    scores: Record<string, {
      overall: number;
      confidence: number;
      category: string;
      components?: Record<string, number>;
      explanation?: {
        careerImpactCategory: string;
        reasons: string[];
        matchedSkills: string[];
        speakerHighlights: string[];
        confidenceFactors: string[];
      };
    }>;
    events?: Record<string, Event>;
    stats: {
      total: number;
      successful: number;
      errors: number;
      cached: number;
      processingTimeMs: number;
    };
    errors?: Array<{ eventId: string; error: string }>;
  };
  error?: string;
}

/**
 * Client-side service for batch career impact calculations
 * Replaces the N+1 query pattern with efficient batch processing
 */
export class BatchCareerImpactService {
  private static readonly BATCH_SIZE = 20; // Optimal batch size
  private static readonly MAX_RETRIES = 2;
  private static readonly TIMEOUT_MS = 15000; // 15 second timeout

  /**
   * Enhanced events with career impact using batch API
   */
  static async enhanceEventsWithCareerImpact(
    events: Event[]
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    if (events.length === 0) {
      return events;
    }

    try {
      const eventIds = events.map(event => event.id);
      
      // Process in batches if we have many events
      if (eventIds.length <= this.BATCH_SIZE) {
        return await this.processSingleBatch(events, eventIds);
      } else {
        return await this.processMultipleBatches(events, eventIds);
      }
    } catch (error) {
      console.error('Batch career impact enhancement failed:', error);
      // Return events without career impact rather than failing
      return events;
    }
  }

  /**
   * Process a single batch of events
   */
  private static async processSingleBatch(
    events: Event[],
    eventIds: string[]
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    try {
      const response = await this.callBatchAPI({
        eventIds,
        options: { includeExplanations: false }, // Lite version for performance
        includeEvents: false // We already have the events
      });

      if (!response.success || !response.data) {
        console.warn('Batch API returned no data');
        return events;
      }

      // Merge career impact scores with events
      return events.map(event => {
        const score = response.data!.scores[event.id];
        if (score) {
          const careerImpactLite: CareerImpactScoreLite = {
            overall: score.overall,
            confidence: score.confidence,
            category: score.category as 'transformative' | 'high' | 'moderate' | 'low'
          };
          return { ...event, careerImpactLite };
        }
        return event;
      });
    } catch (error) {
      console.error('Single batch processing failed:', error);
      return events;
    }
  }

  /**
   * Process multiple batches with controlled concurrency
   */
  private static async processMultipleBatches(
    events: Event[],
    eventIds: string[]
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    const batches = this.createBatches(eventIds, this.BATCH_SIZE);
    const results = new Map<string, CareerImpactScoreLite>();
    
    // Process batches with limited concurrency (2 at a time)
    for (let i = 0; i < batches.length; i += 2) {
      const currentBatches = batches.slice(i, i + 2);
      
      const batchPromises = currentBatches.map(batch => 
        this.callBatchAPI({
          eventIds: batch,
          options: { includeExplanations: false },
          includeEvents: false
        }).catch(error => {
          console.warn('Batch API call failed:', error);
          return { success: false, error: error.message };
        })
      );

      const batchResults = await Promise.all(batchPromises);

      // Process results
      batchResults.forEach(result => {
        if (result.success && 'data' in result && result.data) {
          Object.entries(result.data.scores).forEach(([eventId, score]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scoreData = score as any;
            const careerImpactLite: CareerImpactScoreLite = {
              overall: scoreData.overall,
              confidence: scoreData.confidence,
              category: scoreData.category as 'transformative' | 'high' | 'moderate' | 'low'
            };
            results.set(eventId, careerImpactLite);
          });
        }
      });
    }

    // Merge results with events
    return events.map(event => {
      const careerImpactLite = results.get(event.id);
      return careerImpactLite ? { ...event, careerImpactLite } : event;
    });
  }

  /**
   * Call the batch career impact API with retry logic
   */
  private static async callBatchAPI(
    request: BatchCareerImpactRequest,
    retryCount = 0
  ): Promise<BatchCareerImpactResponse> {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      // Construct absolute URL for server-side usage
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || 
          process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
          'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/career-impact/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!response.ok) {
        // Handle rate limiting gracefully
        if (response.status === 429) {
          const errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
          console.warn('Batch API rate limited, will use fallback processing');
          throw new Error(errorMessage);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: BatchCareerImpactResponse = await response.json();
      return data;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Handle rate limiting with exponential backoff + jitter
      if (errorObj.message.includes('Rate limit exceeded') && retryCount < this.MAX_RETRIES) {
        const baseDelay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
        const jitter = Math.random() * 500; // Add 0-500ms jitter
        const backoffDelay = baseDelay + jitter;
        console.warn(`Rate limited, waiting ${Math.round(backoffDelay/1000 * 10)/10}s before retry (${retryCount + 1}/${this.MAX_RETRIES})`);
        await this.delay(backoffDelay);
        return this.callBatchAPI(request, retryCount + 1);
      }
      
      // Normal retry logic for other errors
      if (retryCount < this.MAX_RETRIES && !this.isAbortError(errorObj)) {
        console.warn(`Batch API call failed, retrying (${retryCount + 1}/${this.MAX_RETRIES}):`, errorObj);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.callBatchAPI(request, retryCount + 1);
      }
      
      throw errorObj;
    } finally {
      // Always clear timeout to prevent memory leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Create batches from event IDs
   */
  private static createBatches(eventIds: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < eventIds.length; i += batchSize) {
      batches.push(eventIds.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Check if error is an abort error
   */
  private static isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lightweight version for quick loading (no explanations)
   */
  static async enhanceEventsLite(
    events: Event[]
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    if (events.length === 0) return events;

    try {
      const eventIds = events.map(event => event.id);
      
      const response = await this.callBatchAPI({
        eventIds,
        options: { includeExplanations: false }, // Faster processing
        includeEvents: false
      });

      if (!response.success || !response.data) {
        console.warn('Batch API returned no data, using fallback scores');
        return this.getEventsWithFallbackScores(events);
      }

      // Quick merge without detailed explanations
      return events.map(event => {
        const score = response.data!.scores[event.id];
        if (score) {
          return {
            ...event,
            careerImpactLite: {
              overall: score.overall,
              confidence: score.confidence,
              category: score.category as 'transformative' | 'high' | 'moderate' | 'low'
            }
          };
        }
        return event;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide user-friendly error context
      if (errorMessage.includes('Rate limit exceeded')) {
        console.warn('Career impact calculation rate limited - will retry automatically');
      } else if (errorMessage.includes('timeout')) {
        console.warn('Career impact calculation timed out - using fallback');
      } else {
        console.warn('Career impact calculation failed:', errorMessage);
      }
      
      // Always return events with fallback career impact scores rather than failing completely
      return this.getEventsWithFallbackScores(events);
    }
  }

  /**
   * Server-side version that works directly without HTTP requests
   * Used when called from server-side contexts like API routes
   */
  static async enhanceEventsLiteServer(
    events: Event[],
    userProfile: unknown,
    _supabaseClient: unknown
  ): Promise<(Event & { careerImpactLite?: CareerImpactScoreLite })[]> {
    if (events.length === 0) return events;

    try {
      // Import CareerImpactService dynamically to avoid circular dependencies
      const { CareerImpactService } = await import('./careerImpactService');
      
      // Process events in parallel with a reasonable concurrency limit
      const concurrencyLimit = 5;
      const results: (Event & { careerImpactLite?: CareerImpactScoreLite })[] = [];
      
      for (let i = 0; i < events.length; i += concurrencyLimit) {
        const batch = events.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (event) => {
          try {
            const impactScore = await CareerImpactService.calculateCareerImpactScoreAsync(
              {
                event,
                careerProfile: userProfile as unknown as CareerProfile // Type assertion for server-side compatibility
              },
              { includeExplanations: false }
            );
            
            // Derive category from overall score
            const getCategory = (score: number): 'transformative' | 'high' | 'moderate' | 'low' => {
              if (score >= 0.8) return 'transformative';
              if (score >= 0.6) return 'high';
              if (score >= 0.4) return 'moderate';
              return 'low';
            };

            return {
              ...event,
              careerImpactLite: {
                overall: impactScore.overall,
                confidence: impactScore.confidence,
                category: getCategory(impactScore.overall)
              }
            };
          } catch (error) {
            console.warn(`Failed to calculate impact for event ${event.id}:`, error);
            return {
              ...event,
              careerImpactLite: {
                overall: 0.5,
                confidence: 0.6,
                category: 'moderate' as const
              }
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.warn('Server-side career impact calculation failed:', error);
      return this.getEventsWithFallbackScores(events);
    }
  }

  /**
   * Get events with fallback career impact scores
   */
  private static getEventsWithFallbackScores(
    events: Event[]
  ): (Event & { careerImpactLite?: CareerImpactScoreLite })[] {
    return events.map(event => ({
      ...event,
      careerImpactLite: {
        overall: 0.5,
        confidence: 0.6,
        category: 'moderate' as const
      }
    }));
  }

  /**
   * Get career impact for specific events with caching
   */
  static async getCareerImpactForEvents(
    eventIds: string[],
    includeExplanations = false
  ): Promise<Record<string, CareerImpactScoreLite>> {
    if (eventIds.length === 0) return {};

    try {
      const response = await this.callBatchAPI({
        eventIds,
        options: { includeExplanations },
        includeEvents: false
      });

      if (!response.success || !response.data) {
        return {};
      }

      const results: Record<string, CareerImpactScoreLite> = {};
      
      Object.entries(response.data.scores).forEach(([eventId, score]) => {
        results[eventId] = {
          overall: score.overall,
          confidence: score.confidence,
          category: score.category as 'transformative' | 'high' | 'moderate' | 'low'
        };
      });

      return results;
    } catch (error) {
      console.error('Career impact fetching failed:', error);
      return {};
    }
  }
}
