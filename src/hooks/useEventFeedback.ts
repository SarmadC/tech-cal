/**
 * Hook for fetching and aggregating event feedback data
 * Used by CareerOutcomesCard to show actual outcomes from attended events
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/supabase';

export interface EventFeedback {
    id: string;
    eventId: string;
    userId: string;
    actualValueRating: number | null;
    careerBenefit: string | null;
    connectionsMade: number | null;
    eventAttended: boolean;
    feedbackDate: string | null;
    feedbackText: string | null;
    predictedScore: number;
    skillsGained: string[] | null;
    wouldRecommend: boolean | null;
}

export interface FeedbackAggregates {
    totalFeedbackCount: number;
    averageRating: number | null;
    totalSkillsGained: number;
    uniqueSkills: string[];
    totalConnectionsMade: number;
    recommendationRate: number | null;
    predictionAccuracy: number | null;
}

function transformFeedback(row: Database['public']['Tables']['event_feedback']['Row']): EventFeedback {
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        actualValueRating: row.actual_value_rating,
        careerBenefit: row.career_benefit,
        connectionsMade: row.connections_made,
        eventAttended: row.event_attended,
        feedbackDate: row.feedback_date,
        feedbackText: row.feedback_text,
        predictedScore: row.predicted_score,
        skillsGained: row.skills_gained,
        wouldRecommend: row.would_recommend,
    };
}

function calculateAggregates(feedbackList: EventFeedback[]): FeedbackAggregates {
    if (feedbackList.length === 0) {
        return {
            totalFeedbackCount: 0,
            averageRating: null,
            totalSkillsGained: 0,
            uniqueSkills: [],
            totalConnectionsMade: 0,
            recommendationRate: null,
            predictionAccuracy: null,
        };
    }

    // Average rating
    const ratings = feedbackList.filter(f => f.actualValueRating !== null);
    const averageRating = ratings.length > 0
        ? ratings.reduce((sum, f) => sum + (f.actualValueRating || 0), 0) / ratings.length
        : null;

    // Skills gained
    const allSkills = feedbackList.flatMap(f => f.skillsGained || []);
    const uniqueSkills = [...new Set(allSkills)];

    // Connections made
    const totalConnectionsMade = feedbackList.reduce((sum, f) => sum + (f.connectionsMade || 0), 0);

    // Recommendation rate
    const withRecommendation = feedbackList.filter(f => f.wouldRecommend !== null);
    const recommendationRate = withRecommendation.length > 0
        ? (withRecommendation.filter(f => f.wouldRecommend).length / withRecommendation.length) * 100
        : null;

    // Prediction accuracy: compare predicted score to actual rating
    // If actual rating >= 4 and predicted was high (>=70), or actual < 4 and predicted was low (<70), it's accurate
    const withBothScores = feedbackList.filter(
        f => f.actualValueRating !== null && f.predictedScore > 0
    );
    let accurateCount = 0;
    withBothScores.forEach(f => {
        const actualHigh = (f.actualValueRating || 0) >= 4;
        const predictedHigh = f.predictedScore >= 70;
        if (actualHigh === predictedHigh) {
            accurateCount++;
        }
    });
    const predictionAccuracy = withBothScores.length > 0
        ? (accurateCount / withBothScores.length) * 100
        : null;

    return {
        totalFeedbackCount: feedbackList.length,
        averageRating,
        totalSkillsGained: allSkills.length,
        uniqueSkills,
        totalConnectionsMade,
        recommendationRate,
        predictionAccuracy,
    };
}

export function useEventFeedback(userId: string | undefined) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['event-feedback', userId],
        queryFn: async () => {
            if (!userId) {
                return { feedback: [], aggregates: calculateAggregates([]) };
            }

            const { data, error } = await supabase
                .from('event_feedback')
                .select('*')
                .eq('user_id', userId)
                .order('feedback_date', { ascending: false });

            if (error) {
                console.error('[useEventFeedback] Error fetching feedback:', error);
                throw error;
            }

            const feedback = (data || []).map(transformFeedback);
            const aggregates = calculateAggregates(feedback);

            return { feedback, aggregates };
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });
}
