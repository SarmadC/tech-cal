/**
 * Ingestion Source Service
 * 
 * CRUD operations for ingestion_sources table.
 * Manages source registry, trust score calculation, and source metadata.
 */

import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import type { IngestionSourceType, SourceMetadata } from '@/config/ingestionSources';
import { INITIAL_SOURCES } from '@/config/ingestionSources';
import * as Sentry from '@sentry/nextjs';

// Supported collector types - only these can be processed
const SUPPORTED_COLLECTOR_TYPES = ['RSS', 'ICS', 'API'] as const;

/**
 * Validate source type is supported
 */
function validateSourceType(sourceType: string): void {
    if (!SUPPORTED_COLLECTOR_TYPES.includes(sourceType as typeof SUPPORTED_COLLECTOR_TYPES[number])) {
        throw new Error(
            `Unsupported source type: ${sourceType}. ` +
            `Supported types: ${SUPPORTED_COLLECTOR_TYPES.join(', ')}. ` +
            `Please use one of the supported types or implement a collector for this type.`
        );
    }
}

export interface IngestionSource {
    id: string;
    name: string;
    source_url: string;
    source_type: IngestionSourceType;
    access_type: string;
    trust_score: number;
    is_active: boolean;
    metadata: SourceMetadata;
    last_fetched_at: string | null;
    fetch_interval_minutes: number;
    created_at: string;
    updated_at: string;
}

export interface CreateSourceInput {
    name: string;
    source_url: string;
    source_type: IngestionSourceType;
    access_type: string;
    trust_score?: number;
    fetch_interval_minutes?: number;
    metadata?: SourceMetadata;
    is_active?: boolean;
}

export class IngestionSourceService {
    /**
     * Get all active ingestion sources
     */
    static async getActiveSources(
        supabaseClient: SupabaseClientType
    ): Promise<IngestionSource[]> {
        try {
            const { data, error } = await supabaseClient
                .from('ingestion_sources')
                .select('*')
                .eq('is_active', true)
                .order('trust_score', { ascending: false });

            if (error) throw error;
            return (data || []) as IngestionSource[];
        } catch (error) {
            console.error('Error fetching active sources:', error);
            Sentry.captureException(error, {
                extra: { function: 'getActiveSources' },
            });
            throw new Error('Failed to fetch active sources.');
        }
    }

    /**
     * Get source by ID
     */
    static async getSourceById(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<IngestionSource | null> {
        try {
            const { data, error } = await supabaseClient
                .from('ingestion_sources')
                .select('*')
                .eq('id', sourceId)
                .single();

            if (error) throw error;
            return data as IngestionSource | null;
        } catch (error) {
            console.error('Error fetching source by ID:', error);
            Sentry.captureException(error, {
                extra: { function: 'getSourceById', sourceId },
            });
            return null;
        }
    }

    /**
     * Create a new ingestion source
     */
    static async createSource(
        input: CreateSourceInput,
        supabaseClient: SupabaseClientType
    ): Promise<IngestionSource> {
        try {
            // Validate source type before creating
            validateSourceType(input.source_type);

            const { data, error } = await supabaseClient
                .from('ingestion_sources')
                .insert({
                    name: input.name,
                    source_url: input.source_url,
                    source_type: input.source_type,
                    access_type: input.access_type,
                    trust_score: input.trust_score ?? 50.0,
                    fetch_interval_minutes: input.fetch_interval_minutes ?? 60,
                    metadata: (input.metadata ?? {}) as unknown as Database['public']['Tables']['ingestion_sources']['Insert']['metadata'],
                    is_active: input.is_active ?? true,
                })
                .select()
                .single();

            if (error) throw error;
            return data as IngestionSource;
        } catch (error) {
            console.error('Error creating source:', error);
            Sentry.captureException(error, {
                extra: { function: 'createSource', input },
            });
            throw new Error('Failed to create source.');
        }
    }

    /**
     * Update source trust score based on historical performance
     */
    static async updateTrustScore(
        sourceId: string,
        newTrustScore: number,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabaseClient
                .from('ingestion_sources')
                .update({ trust_score: newTrustScore })
                .eq('id', sourceId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating trust score:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateTrustScore', sourceId, newTrustScore },
            });
            throw new Error('Failed to update trust score.');
        }
    }

    /**
     * Update last_fetched_at timestamp
     */
    static async updateLastFetched(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabaseClient
                .from('ingestion_sources')
                .update({ last_fetched_at: new Date().toISOString() })
                .eq('id', sourceId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating last_fetched_at:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateLastFetched', sourceId },
            });
            throw new Error('Failed to update last fetched timestamp.');
        }
    }

    /**
     * Initialize default sources from configuration
     * This should be run once during setup
     */
    static async initializeDefaultSources(
        supabaseClient: SupabaseClientType
    ): Promise<IngestionSource[]> {
        try {
            const sources: IngestionSource[] = [];

            for (const sourceConfig of INITIAL_SOURCES) {
                // Skip sources with unsupported types
                if (!SUPPORTED_COLLECTOR_TYPES.includes(sourceConfig.source_type as typeof SUPPORTED_COLLECTOR_TYPES[number])) {
                    console.warn(
                        `[IngestionSourceService] Skipping source "${sourceConfig.name}" with unsupported type: ${sourceConfig.source_type}`
                    );
                    continue;
                }

                // Check if source already exists
                const { data: existing } = await supabaseClient
                    .from('ingestion_sources')
                    .select('id')
                    .eq('source_url', sourceConfig.source_url)
                    .single();

                if (existing) {
                    // Skip if already exists
                    continue;
                }

                const created = await this.createSource(sourceConfig, supabaseClient);
                sources.push(created);
            }

            return sources;
        } catch (error) {
            console.error('Error initializing default sources:', error);
            Sentry.captureException(error, {
                extra: { function: 'initializeDefaultSources' },
            });
            throw new Error('Failed to initialize default sources.');
        }
    }

    /**
     * Calculate trust score based on historical performance
     * Uses data from source_trust_scores table
     */
    static async calculateTrustScore(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<number> {
        try {
            // Get most recent trust score calculation
            const { data, error } = await supabaseClient
                .from('source_trust_scores')
                .select('avg_quality_score, duplicate_rate, error_rate, events_approved, events_rejected')
                .eq('source_id', sourceId)
                .order('calculated_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                // No historical data, return default
                return 50.0;
            }

            // Simple weighted calculation
            // Base score from average quality
            let score = data.avg_quality_score || 50.0;

            // Adjust for approval rate
            const totalEvents = (data.events_approved || 0) + (data.events_rejected || 0);
            if (totalEvents > 0) {
                const approvalRate = (data.events_approved || 0) / totalEvents;
                score = score * 0.7 + (approvalRate * 100) * 0.3;
            }

            // Penalize for duplicates and errors
            score -= (data.duplicate_rate || 0) * 0.5;
            score -= (data.error_rate || 0) * 0.5;

            // Clamp between 0 and 100
            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error('Error calculating trust score:', error);
            Sentry.captureException(error, {
                extra: { function: 'calculateTrustScore', sourceId },
            });
            return 50.0; // Default on error
        }
    }

    /**
     * Check if source is blocklisted
     */
    static async isBlocklisted(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<boolean> {
        try {
            const { data, error } = await supabaseClient
                .from('source_blocklist')
                .select('id')
                .eq('source_id', sourceId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "not found" - that's fine
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Error checking blocklist:', error);
            return false;
        }
    }

    /**
     * Check if source is allowlisted
     */
    static async isAllowlisted(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<boolean> {
        try {
            const { data, error } = await supabaseClient
                .from('source_allowlist')
                .select('id, auto_approve_threshold')
                .eq('source_id', sourceId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            console.error('Error checking allowlist:', error);
            return false;
        }
    }
}


