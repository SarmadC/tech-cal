/**
 * Ingestion Metrics Service
 * 
 * Tracks ingestion pipeline metrics: success rates, quality distributions,
 * source performance, and generates alerts for failures.
 */

import type { SupabaseClientType } from '@/types';
import * as Sentry from '@sentry/nextjs';

export interface IngestionMetrics {
    dateRange: {
        from: string;
        to: string;
    };
    overall: {
        totalJobs: number;
        successfulJobs: number;
        failedJobs: number;
        successRate: number;
        totalEventsFetched: number;
        totalEventsNormalized: number;
        totalEventsPublished: number;
        averageQualityScore: number;
    };
    sourceMetrics: Array<{
        sourceId: string;
        sourceName: string;
        jobsCount: number;
        successRate: number;
        eventsFetched: number;
        eventsNormalized: number;
        averageQualityScore: number;
        lastFetchAt: string | null;
    }>;
    qualityDistribution: {
        high: number; // >= 75
        medium: number; // 50-74
        low: number; // < 50
    };
    moderationQueue: {
        pending: number;
        approved: number;
        rejected: number;
    };
}

export class IngestionMetricsService {
    /**
     * Get comprehensive ingestion metrics for a date range
     */
    static async getMetrics(
        supabaseClient: SupabaseClientType,
        days: number = 7
    ): Promise<IngestionMetrics | null> {
        try {
            const from = new Date();
            from.setDate(from.getDate() - days);
            const to = new Date();

            // Get job metrics
            const { data: jobs, error: jobsError } = await supabaseClient
                .from('ingestion_jobs')
                .select('*')
                .gte('started_at', from.toISOString())
                .lte('started_at', to.toISOString());

            if (jobsError) {
                throw jobsError;
            }

            // Get source metrics
            const { data: sources } = await supabaseClient
                .from('ingestion_sources')
                .select('id, name, is_active, last_fetched_at');

            // Get quality score distribution
            const { data: qualityScores } = await supabaseClient
                .from('events')
                .select('ingestion_quality_score')
                .not('ingestion_quality_score', 'is', null)
                .gte('created_at', from.toISOString());

            // Get moderation queue stats
            const { data: queueStats } = await supabaseClient
                .from('event_moderation_queue')
                .select('status')
                .gte('created_at', from.toISOString());

            // Calculate overall metrics
            const totalJobs = jobs?.length || 0;
            const successfulJobs = jobs?.filter(j => j.status === 'completed').length || 0;
            const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;
            const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

            const totalEventsFetched = jobs?.reduce((sum, j) => sum + (j.events_fetched || 0), 0) || 0;
            const totalEventsNormalized = jobs?.reduce((sum, j) => sum + (j.events_normalized || 0), 0) || 0;

            // Count published events (not in moderation queue or approved)
            const { data: publishedEvents } = await supabaseClient
                .from('events')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', from.toISOString())
                .not('ingestion_source_id', 'is', null);

            // Calculate average quality score
            const qualityScoresList = (qualityScores || [])
                .map(e => e.ingestion_quality_score)
                .filter((score): score is number => score !== null);
            const averageQualityScore = qualityScoresList.length > 0
                ? qualityScoresList.reduce((sum, score) => sum + score, 0) / qualityScoresList.length
                : 0;

            // Source-level metrics
            const sourceMetrics = await Promise.all(
                (sources || []).map(async (source) => {
                    const sourceJobs = jobs?.filter(j => j.source_id === source.id) || [];
                    const sourceJobsCount = sourceJobs.length;
                    const sourceSuccessfulJobs = sourceJobs.filter(j => j.status === 'completed').length;
                    const sourceSuccessRate = sourceJobsCount > 0
                        ? (sourceSuccessfulJobs / sourceJobsCount) * 100
                        : 0;

                    const sourceEventsFetched = sourceJobs.reduce((sum, j) => sum + (j.events_fetched || 0), 0);
                    const sourceEventsNormalized = sourceJobs.reduce((sum, j) => sum + (j.events_normalized || 0), 0);

                    // Get source quality scores
                    const { data: sourceEvents } = await supabaseClient
                        .from('events')
                        .select('ingestion_quality_score')
                        .eq('ingestion_source_id', source.id)
                        .not('ingestion_quality_score', 'is', null)
                        .gte('created_at', from.toISOString());

                    const sourceQualityScores = (sourceEvents || [])
                        .map(e => e.ingestion_quality_score)
                        .filter((score): score is number => score !== null);
                    const sourceAvgQuality = sourceQualityScores.length > 0
                        ? sourceQualityScores.reduce((sum, score) => sum + score, 0) / sourceQualityScores.length
                        : 0;

                    return {
                        sourceId: source.id,
                        sourceName: source.name,
                        jobsCount: sourceJobsCount,
                        successRate: sourceSuccessRate,
                        eventsFetched: sourceEventsFetched,
                        eventsNormalized: sourceEventsNormalized,
                        averageQualityScore: sourceAvgQuality,
                        lastFetchAt: source.last_fetched_at,
                    };
                })
            );

            // Quality distribution
            const qualityDistribution = {
                high: qualityScoresList.filter(s => s >= 75).length,
                medium: qualityScoresList.filter(s => s >= 50 && s < 75).length,
                low: qualityScoresList.filter(s => s < 50).length,
            };

            // Moderation queue stats
            const moderationQueue = {
                pending: queueStats?.filter(q => q.status === 'pending').length || 0,
                approved: queueStats?.filter(q => q.status === 'approved').length || 0,
                rejected: queueStats?.filter(q => q.status === 'rejected').length || 0,
            };

            return {
                dateRange: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                },
                overall: {
                    totalJobs,
                    successfulJobs,
                    failedJobs,
                    successRate,
                    totalEventsFetched,
                    totalEventsNormalized,
                    totalEventsPublished: publishedEvents?.length || 0,
                    averageQualityScore,
                },
                sourceMetrics,
                qualityDistribution,
                moderationQueue,
            };
        } catch (error) {
            console.error('Error calculating metrics:', error);
            Sentry.captureException(error, {
                extra: { function: 'getMetrics', days },
            });
            return null;
        }
    }

    /**
     * Check for alerts (sources failing, low quality spikes, etc.)
     */
    static async checkAlerts(
        supabaseClient: SupabaseClientType,
        metrics: IngestionMetrics
    ): Promise<Array<{ type: string; message: string; severity: 'warning' | 'error' }>> {
        const alerts: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = [];

        // Check for sources with high failure rate
        for (const source of metrics.sourceMetrics) {
            if (source.jobsCount > 0 && source.successRate < 50) {
                alerts.push({
                    type: 'source_failure',
                    message: `Source "${source.sourceName}" has low success rate: ${source.successRate.toFixed(1)}%`,
                    severity: 'error',
                });
            }
        }

        // Check for low overall quality
        if (metrics.overall.averageQualityScore < 60) {
            alerts.push({
                type: 'low_quality',
                message: `Average quality score is below threshold: ${metrics.overall.averageQualityScore.toFixed(1)}%`,
                severity: 'warning',
            });
        }

        // Check for high moderation queue
        if (metrics.moderationQueue.pending > 100) {
            alerts.push({
                type: 'high_moderation_queue',
                message: `Moderation queue is large: ${metrics.moderationQueue.pending} pending items`,
                severity: 'warning',
            });
        }

        // Check for sources not fetching
        const staleSources = metrics.sourceMetrics.filter(source => {
            if (!source.lastFetchAt) return true;
            const lastFetch = new Date(source.lastFetchAt);
            const hoursSinceFetch = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
            return hoursSinceFetch > 24; // No fetch in 24+ hours
        });

        if (staleSources.length > 0) {
            alerts.push({
                type: 'stale_sources',
                message: `${staleSources.length} source(s) have not fetched in 24+ hours`,
                severity: 'warning',
            });
        }

        return alerts;
    }
}


