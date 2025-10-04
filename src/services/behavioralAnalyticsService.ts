'use client';

import type { SupabaseClientType } from '@/types';
import { handleServiceError } from '@/utils/commonUtils';
import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';
import { DatabaseQueryPatterns } from '@/utils/databaseQueryPatterns';
import * as Sentry from '@sentry/nextjs';

// SupabaseClientType now imported from types

// =============================================
// TYPES FOR ENHANCED ANALYTICS
// =============================================

export interface UserInteraction {
  userId: string;
  eventId?: string;
  interactionType: 'view' | 'click' | 'hover' | 'dismiss' | 'share';
  section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins' | 'search';
  position?: number;
  algorithmVersion?: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

export interface RecommendationBatch {
  userId: string;
  sessionId: string;
  algorithmVersion: string;
  section: string;
  recommendations: Array<{
    eventId: string;
    score: number;
    position: number;
  }>;
}

export interface UserBehaviorPattern {
  avgSessionDuration: number;
  mostActiveHours: number[];
  preferredSections: string[];
  interactionFrequency: number;
  clickThroughRate: number;
}

export interface RecommendationMetrics {
  algorithmVersion: string;
  section: string;
  totalRecommendations: number;
  totalInteractions: number;
  clickThroughRate: number;
  avgPosition: number;
}

// =============================================
// ENHANCED ANALYTICS SERVICE
// =============================================

// User-specific interaction buffers with proper cleanup
class UserInteractionBuffer {
  private buffer: UserInteraction[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private errorCount: number = 0;
  private lastActivity: number = Date.now();
  private readonly BUFFER_SIZE = ANALYTICS_CONFIG.BUFFER_SIZE;
  private readonly FLUSH_INTERVAL = ANALYTICS_CONFIG.FLUSH_INTERVAL;
  private readonly MAX_ERRORS = ANALYTICS_CONFIG.MAX_ERRORS;

  constructor(private supabaseClient: SupabaseClientType) {}

  async add(interaction: UserInteraction): Promise<void> {
    this.lastActivity = Date.now();
    this.buffer.push(interaction);

    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(async () => {
        try {
          await this.flush();
        } catch (error) {
          console.error('Error in scheduled flush:', error);
        }
      }, this.FLUSH_INTERVAL);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      if (this.flushTimeout) {
        clearTimeout(this.flushTimeout);
        this.flushTimeout = null;
      }

      const interactions = this.buffer.map(interaction => ({
        user_id: interaction.userId,
        event_id: interaction.eventId || null,
        interaction_type: interaction.interactionType,
        section: interaction.section,
        position: interaction.position || null,
        algorithm_version: interaction.algorithmVersion || 'v1.0',
        duration_ms: interaction.durationMs || null,
      }));

      const { error } = await DatabaseQueryPatterns.batchInsertInteractions(
        interactions,
        this.supabaseClient
      );

      if (error) throw error;
      
      // Success: clear buffer and reset error count
      this.buffer = [];
      this.errorCount = 0;

    } catch (error) {
      handleServiceError(error, {
        function: 'flushInteractions',
        bufferSize: this.buffer.length,
        userId: this.buffer[0]?.userId
      });

      // Error recovery: clear buffer after too many failures
      this.errorCount++;
      if (this.errorCount >= this.MAX_ERRORS) {
        console.warn(`Clearing corrupted buffer after ${this.MAX_ERRORS} failures`);
        this.buffer = [];
        this.errorCount = 0;
      }
    }
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  isInactive(): boolean {
    return Date.now() - this.lastActivity > ANALYTICS_CONFIG.INACTIVE_THRESHOLD;
  }

  cleanup(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}

// Proper buffer management with automatic cleanup
class AnalyticsBufferManager {
  private buffers = new Map<string, UserInteractionBuffer>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Auto-cleanup inactive buffers
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveBuffers();
    }, ANALYTICS_CONFIG.CLEANUP_INTERVAL);
  }

  getUserBuffer(userId: string, supabaseClient: SupabaseClientType): UserInteractionBuffer {
    if (!this.buffers.has(userId)) {
      this.buffers.set(userId, new UserInteractionBuffer(supabaseClient));
    }
    return this.buffers.get(userId)!;
  }

  async forceFlushUser(userId: string): Promise<void> {
    const buffer = this.buffers.get(userId);
    if (buffer) {
      await buffer.forceFlush();
    }
  }

  async forceFlushAll(): Promise<void> {
    const flushPromises = Array.from(this.buffers.values()).map(buffer => buffer.forceFlush());
    await Promise.all(flushPromises);
  }

  cleanupUser(userId: string): void {
    const buffer = this.buffers.get(userId);
    if (buffer) {
      buffer.forceFlush(); // Flush any pending data
      buffer.cleanup(); // Clear timeouts
      this.buffers.delete(userId);
    }
  }

  private cleanupInactiveBuffers(): void {
    const inactiveUsers: string[] = [];
    
    for (const [userId, buffer] of this.buffers.entries()) {
      if (buffer.isInactive()) {
        inactiveUsers.push(userId);
      }
    }

    for (const userId of inactiveUsers) {
      this.cleanupUser(userId);
    }

    if (inactiveUsers.length > 0) {
      console.log(`Cleaned up ${inactiveUsers.length} inactive analytics buffers`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.forceFlushAll();
    this.buffers.clear();
  }
}

// Single instance with proper lifecycle management
const bufferManager = new AnalyticsBufferManager();

// Ensure cleanup on process exit or module unload
if (typeof window !== 'undefined') {
  // Browser environment - cleanup on page unload
  window.addEventListener('beforeunload', () => {
    bufferManager.destroy();
  });
} else {
  // Node.js environment - cleanup on process exit
  process.on('exit', () => {
    bufferManager.destroy();
  });
  process.on('SIGINT', () => {
    bufferManager.destroy();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    bufferManager.destroy();
    process.exit(0);
  });
}

export class BehavioralAnalyticsService {

  private static getUserBuffer(userId: string, supabaseClient: SupabaseClientType): UserInteractionBuffer {
    return bufferManager.getUserBuffer(userId, supabaseClient);
  }

  /**
   * Track user interaction with batching for performance
   */
  static async trackInteraction(
    interaction: UserInteraction,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const enhancedInteraction = {
        ...interaction,
        algorithmVersion: interaction.algorithmVersion || 'v1.0'
      };

      // Get user-specific buffer
      const userBuffer = this.getUserBuffer(interaction.userId, supabaseClient);
      await userBuffer.add(enhancedInteraction);

      // Additionally log a simple metric row for click interactions
      if (interaction.interactionType === 'click' && interaction.eventId) {
        await this.logCareerImpactMetric({
          userId: interaction.userId,
          eventId: interaction.eventId,
          metricType: 'click',
          algorithmVersion: enhancedInteraction.algorithmVersion || 'v1.0'
        }, supabaseClient);
      }

    } catch (error) {
      console.error('Error tracking interaction:', error);
      Sentry.captureException(error, {
        extra: { function: 'trackInteraction', interaction }
      });
    }
  }

  /**
   * Force flush any pending interactions for a specific user
   */
  static async forceFlushUser(userId: string): Promise<void> {
    await bufferManager.forceFlushUser(userId);
  }

  /**
   * Force flush all pending interactions (call on app shutdown)
   */
  static async forceFlushAll(): Promise<void> {
    await bufferManager.forceFlushAll();
  }

  /**
   * Track recommendation batch for algorithm performance analysis
   */
  static async trackRecommendationBatch(
    batch: RecommendationBatch,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('recommendation_batches')
        .insert({
          user_id: batch.userId,
          session_id: batch.sessionId,
          algorithm_version: batch.algorithmVersion,
          section: batch.section,
          event_ids: batch.recommendations.map(r => r.eventId),
          scores: batch.recommendations.map(r => r.score),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking recommendation batch:', error);
      Sentry.captureException(error, {
        extra: { function: 'trackRecommendationBatch', batch }
      });
    }
  }

  /**
   * Get user behavior patterns for personalization
   */
  static async getUserBehaviorPattern(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<UserBehaviorPattern | null> {
    try {
      const { data, error } = await DatabaseQueryPatterns.getUserBehaviorData(
        userId,
        supabaseClient,
        30 // 30 days
      );

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Analyze patterns
      const totalInteractions = data.length;
      const clicks = data.filter(i => i.interaction_type === 'click').length;
      const views = data.filter(i => i.interaction_type === 'view').length;
      
      // Calculate average session duration
      const durationsMs = data.filter(i => i.duration_ms).map(i => i.duration_ms!);
      const avgSessionDuration = durationsMs.length > 0 
        ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length 
        : 0;

      // Most active hours
      const hours = data.map(i => new Date(i.created_at!).getHours());
      const hourCounts = hours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      const mostActiveHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      // Preferred sections
      const sections = data.map(i => i.section);
      const sectionCounts = sections.reduce((acc, section) => {
        acc[section] = (acc[section] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const preferredSections = Object.entries(sectionCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([section]) => section);

      return {
        avgSessionDuration,
        mostActiveHours,
        preferredSections,
        interactionFrequency: totalInteractions,
        clickThroughRate: views > 0 ? clicks / views : 0
      };

    } catch (error) {
      console.error('Error getting user behavior pattern:', error);
      Sentry.captureException(error, {
        extra: { function: 'getUserBehaviorPattern', userId }
      });
      return null;
    }
  }

  /**
   * Get recommendation performance metrics
   */
  static async getRecommendationMetrics(
    algorithmVersion: string,
    section: string,
    supabaseClient: SupabaseClientType,
    days: number = 7
  ): Promise<RecommendationMetrics | null> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Get recommendation batches
      const { data: batches, error: batchError } = await supabaseClient
        .from('recommendation_batches')
        .select('*')
        .eq('algorithm_version', algorithmVersion)
        .eq('section', section)
        .gte('shown_at', startDate);

      if (batchError) throw batchError;

      // Get interactions for these recommendations
      const { data: interactions, error: interactionError } = await supabaseClient
        .from('user_interactions_simple')
        .select('*')
        .eq('algorithm_version', algorithmVersion)
        .eq('section', section)
        .gte('created_at', startDate);

      if (interactionError) throw interactionError;

      if (!batches || batches.length === 0) return null;

      const totalRecommendations = batches.reduce((sum, batch) => sum + batch.event_ids.length, 0);
      const totalInteractions = interactions?.length || 0;
      const clicks = interactions?.filter(i => i.interaction_type === 'click').length || 0;
      const views = interactions?.filter(i => i.interaction_type === 'view').length || 0;
      
      const avgPosition = interactions && interactions.length > 0
        ? interactions.reduce((sum, i) => sum + (i.position || 0), 0) / interactions.length
        : 0;

      return {
        algorithmVersion,
        section,
        totalRecommendations,
        totalInteractions,
        clickThroughRate: views > 0 ? clicks / views : 0,
        avgPosition
      };

    } catch (error) {
      console.error('Error getting recommendation metrics:', error);
      Sentry.captureException(error, {
        extra: { function: 'getRecommendationMetrics', algorithmVersion, section }
      });
      return null;
    }
  }

  /**
   * Update user recommendation preferences based on behavior
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Record<string, unknown>,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          recommendation_preferences: JSON.parse(JSON.stringify(preferences)),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      Sentry.captureException(error, {
        extra: { function: 'updateUserPreferences', userId, preferences }
      });
    }
  }

  /**
   * Clean up user buffer when user logs out or leaves
   */
  static cleanupUserBuffer(userId: string): void {
    bufferManager.cleanupUser(userId);
  }

  /**
   * Destroy the entire analytics system (for testing/cleanup)
   */
  static destroy(): void {
    bufferManager.destroy();
  }

  /**
   * Get analytics consent status for user
   */
  static async getAnalyticsConsent(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean | null> {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('analytics_consent')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.analytics_consent; // Returns null if never set, boolean if set
    } catch (error) {
      console.error('Error getting analytics consent:', error);
      return null; // Default to null (show banner) on error
    }
  }

  /**
   * Update analytics consent for user
   */
  static async updateAnalyticsConsent(
    userId: string,
    consent: boolean,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          analytics_consent: consent,
          analytics_consent_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating analytics consent:', error);
      Sentry.captureException(error, {
        extra: { function: 'updateAnalyticsConsent', userId, consent }
      });
    }
  }

  /**
   * Update user preferences based on interaction patterns
   */
  static async updatePreferenceEvolution(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const behaviorPattern = await this.getUserBehaviorPattern(userId, supabaseClient);
      if (!behaviorPattern) return;

      // Build evolved preferences based on behavior
      const evolvedPreferences = {
        preferredSections: behaviorPattern.preferredSections,
        optimalRecommendationTimes: behaviorPattern.mostActiveHours,
        engagementLevel: behaviorPattern.clickThroughRate > 0.1 ? 'high' : 'moderate',
        sessionDurationPreference: behaviorPattern.avgSessionDuration > 180000 ? 'long' : 'short',
        lastUpdated: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from('profiles')
        .update({
          recommendation_preferences: evolvedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference evolution:', error);
      Sentry.captureException(error, {
        extra: { function: 'updatePreferenceEvolution', userId }
      });
    }
  }

  /**
   * Get evolved user preferences
   */
  static async getEvolvedPreferences(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<Record<string, unknown> | null> {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('recommendation_preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.recommendation_preferences as Record<string, unknown> || null;
    } catch (error) {
      console.error('Error getting evolved preferences:', error);
      return null;
    }
  }

  /**
   * Write a minimal metric to career_impact_analytics
   */
  static async logCareerImpactMetric(
    args: { userId: string; eventId: string; metricType: 'click' | 'save'; algorithmVersion: string },
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      const { error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('career_impact_analytics')
        .insert({
          user_id: args.userId,
          event_id: args.eventId,
          metric_type: args.metricType,
          metric_value: 1,
          algorithm_version: args.algorithmVersion,
          measured_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging career impact metric:', error);
      Sentry.captureException(error, {
        extra: { function: 'logCareerImpactMetric', args }
      });
    }
  }
}
