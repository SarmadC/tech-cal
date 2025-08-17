// src/services/analyticsService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // Import Json
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

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

            if (error) throw error;

            return data as unknown as GrowthAnalytics;

        } catch (error) {
            console.error('Error fetching growth analytics:', error);
            Sentry.captureException(error, { extra: { function: 'getGrowthAnalytics', userId } });
            throw new Error('Failed to load growth analytics.');
        }
    }
}