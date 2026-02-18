// Abstracted database query patterns to eliminate duplication
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TIME_CONSTANTS, DATABASE_CONFIG } from '@/config/analyticsConfig';

type SupabaseClientType = SupabaseClient<Database>;

// =============================================
// COMMON QUERY PATTERNS
// =============================================

export interface UserInteractionQuery {
  userId: string;
  eventIds?: string[];
  interactionTypes?: string[];
  sections?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
}

export interface RecommendationBatchQuery {
  userId: string;
  algorithmVersion?: string;
  section?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
}

export class DatabaseQueryPatterns {
  /**
   * Unified user interactions query (eliminates 5 duplicate patterns)
   */
  static async getUserInteractions(
    query: UserInteractionQuery,
    supabaseClient: SupabaseClientType
  ) {
    let dbQuery = supabaseClient
      .from('user_interactions_simple')
      .select('*')
      .eq('user_id', query.userId);

    // Apply filters
    if (query.eventIds?.length) {
      dbQuery = dbQuery.in('event_id', query.eventIds);
    }

    if (query.interactionTypes?.length) {
      dbQuery = dbQuery.in('interaction_type', query.interactionTypes);
    }

    if (query.sections?.length) {
      dbQuery = dbQuery.in('section', query.sections);
    }

    if (query.dateRange?.start) {
      dbQuery = dbQuery.gte('created_at', query.dateRange.start.toISOString());
    }

    if (query.dateRange?.end) {
      dbQuery = dbQuery.lte('created_at', query.dateRange.end.toISOString());
    }

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }

    return dbQuery.order('created_at', { ascending: false });
  }

  /**
   * Unified recommendation batches query
   */
  static async getRecommendationBatches(
    query: RecommendationBatchQuery,
    supabaseClient: SupabaseClientType
  ) {
    let dbQuery = supabaseClient
      .from('recommendation_batches')
      .select('*')
      .eq('user_id', query.userId);

    if (query.algorithmVersion) {
      dbQuery = dbQuery.eq('algorithm_version', query.algorithmVersion);
    }

    if (query.section) {
      dbQuery = dbQuery.eq('section', query.section);
    }

    if (query.dateRange?.start) {
      dbQuery = dbQuery.gte('shown_at', query.dateRange.start.toISOString());
    }

    if (query.dateRange?.end) {
      dbQuery = dbQuery.lte('shown_at', query.dateRange.end.toISOString());
    }

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }

    return dbQuery.order('shown_at', { ascending: false });
  }

  /**
   * Get user behavior patterns (standardized query)
   */
  static async getUserBehaviorData(
    userId: string,
    supabaseClient: SupabaseClientType,
    days: number = 30
  ) {
    const startDate = new Date(Date.now() - days * TIME_CONSTANTS.DAY);

    return this.getUserInteractions({
      userId,
      dateRange: { start: startDate },
      limit: DATABASE_CONFIG.MAX_BATCH_SIZE
    }, supabaseClient);
  }

  /**
   * Get collaborative filtering data (standardized query)
   */
  static async getCollaborativeData(
    eventIds: string[],
    excludeUserId: string,
    supabaseClient: SupabaseClientType,
    days: number = 30
  ) {
    const startDate = new Date(Date.now() - days * TIME_CONSTANTS.DAY);

    return supabaseClient
      .from('user_interactions_simple')
      .select('user_id, event_id, interaction_type')
      .neq('user_id', excludeUserId)
      .in('event_id', eventIds)
      .eq('interaction_type', 'click')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
  }

  /**
   * Get trending events data (standardized query)
   */
  static async getTrendingData(
    eventId: string,
    supabaseClient: SupabaseClientType,
    days: number = 7
  ) {
    const startDate = new Date(Date.now() - days * TIME_CONSTANTS.DAY);

    return supabaseClient
      .from('user_interactions_simple')
      .select('interaction_type, created_at')
      .eq('event_id', eventId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
  }

  /**
   * Batch insert interactions (standardized)
   */
  static async batchInsertInteractions(
    interactions: Array<{
      user_id: string;
      event_id?: string | null;
      interaction_type: string;
      section: string;
      position?: number | null;
      algorithm_version?: string;
      duration_ms?: number | null;
      recommendation_batch_id?: string | null;
    }>,
    supabaseClient: SupabaseClientType
  ) {
    return supabaseClient.rpc('batch_insert_interactions', {
      interactions: interactions
    });
  }

  /**
   * Batch insert interactions with optional recommendation batch linkage.
   * Uses v2 RPC when attribution to recommendation_batches is needed.
   */
  static async batchInsertInteractionsV2(
    interactions: Array<{
      user_id: string;
      event_id?: string | null;
      interaction_type: string;
      section: string;
      position?: number | null;
      algorithm_version?: string;
      duration_ms?: number | null;
      recommendation_batch_id?: string | null;
    }>,
    supabaseClient: SupabaseClientType
  ) {
    return supabaseClient.rpc('batch_insert_interactions_v2', {
      interactions
    });
  }

  /**
   * Get analytics health (standardized)
   */
  static async getAnalyticsHealth(supabaseClient: SupabaseClientType) {
    return supabaseClient.rpc('get_analytics_health');
  }
}