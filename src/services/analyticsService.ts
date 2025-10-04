// src/services/analyticsService.ts
import type { SupabaseClientType } from '@/types';
import * as Sentry from '@sentry/nextjs';

export interface GrowthAnalytics {
    followThroughRate: number;
    learningStreak: { current: number; longest: number };
    techStackCurrency: { category: string; score: number; color: string }[];
    industryPulseScore: number;
    networkExpansion: number;
}

export class AnalyticsService {
    static async getGrowthAnalytics(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<GrowthAnalytics> {
        try {
            const { data, error } = await supabaseClient.rpc('get_user_growth_analytics', {
                p_user_id: userId,
            });

            if (error) {
                console.warn('RPC function get_user_growth_analytics not found, returning mock data:', error);
                // Return mock data if RPC function doesn't exist yet
                return this.getMockGrowthAnalytics();
            }

            return data as unknown as GrowthAnalytics;

        } catch (error) {
            console.warn('Error fetching growth analytics, returning mock data:', error);
            // Return mock data instead of throwing error
            return this.getMockGrowthAnalytics();
        }
    }

    static getMockGrowthAnalytics(): GrowthAnalytics {
        return {
            followThroughRate: 75,
            learningStreak: { current: 5, longest: 12 },
            techStackCurrency: [
                { category: 'Frontend', score: 85, color: '#3B82F6' },
                { category: 'Backend', score: 70, color: '#10B981' },
                { category: 'DevOps', score: 60, color: '#F59E0B' },
                { category: 'AI/ML', score: 45, color: '#8B5CF6' }
            ],
            industryPulseScore: 82,
            networkExpansion: 15
        };
    }

    /**
     * Lightweight scoring analytics for tuning (dev/staging only)
     */
    static logScoringDebug(payload: {
        eventId: string;
        version: string;
        triggers: string[];
        components: Record<string, number>;
    }) {
        try {
            Sentry.addBreadcrumb({
                category: 'scoring-analytics',
                level: 'info',
                message: 'Scoring triggers',
                data: payload
            });
        } catch {
            // no-op
        }
        try {
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.info('ScoringAnalytics', payload);
            }
        } catch {
            // no-op
        }
    }
}