/**
 * Event Feedback Service
 * Handles CRUD operations for event feedback/ratings
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
export interface EventFeedbackInput {
    eventId: string;
    userId: string;
    actualValueRating?: number | null;
    careerBenefit?: string | null;
    connectionsMade?: number | null;
    skillsGained?: string[] | null;
    wouldRecommend?: boolean | null;
    feedbackText?: string | null;
    predictedScore: number;
}

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

type SupabaseClientType = SupabaseClient<Database>;

// Transform database row to EventFeedback type
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

export class EventFeedbackService {
    /**
     * Submit new feedback for an event
     */
    static async submitFeedback(
        input: EventFeedbackInput,
        supabase: SupabaseClientType
    ): Promise<EventFeedback> {
        const { data, error } = await supabase
            .from('event_feedback')
            .insert({
                event_id: input.eventId,
                user_id: input.userId,
                actual_value_rating: input.actualValueRating,
                career_benefit: input.careerBenefit,
                connections_made: input.connectionsMade,
                skills_gained: input.skillsGained,
                would_recommend: input.wouldRecommend,
                feedback_text: input.feedbackText,
                predicted_score: input.predictedScore,
                event_attended: true,
                feedback_date: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('[EventFeedbackService] Error submitting feedback:', error);
            throw error;
        }

        return transformFeedback(data);
    }

    /**
     * Update existing feedback
     */
    static async updateFeedback(
        feedbackId: string,
        updates: Partial<Omit<EventFeedbackInput, 'eventId' | 'userId' | 'predictedScore'>>,
        supabase: SupabaseClientType
    ): Promise<EventFeedback> {
        const { data, error } = await supabase
            .from('event_feedback')
            .update({
                actual_value_rating: updates.actualValueRating,
                career_benefit: updates.careerBenefit,
                connections_made: updates.connectionsMade,
                skills_gained: updates.skillsGained,
                would_recommend: updates.wouldRecommend,
                feedback_text: updates.feedbackText,
            })
            .eq('id', feedbackId)
            .select()
            .single();

        if (error) {
            console.error('[EventFeedbackService] Error updating feedback:', error);
            throw error;
        }

        return transformFeedback(data);
    }

    /**
     * Get feedback for a specific event by user
     */
    static async getFeedbackForEvent(
        eventId: string,
        userId: string,
        supabase: SupabaseClientType
    ): Promise<EventFeedback | null> {
        const { data, error } = await supabase
            .from('event_feedback')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[EventFeedbackService] Error fetching feedback:', error);
            throw error;
        }

        return data ? transformFeedback(data) : null;
    }

    /**
     * Get all feedback for a user
     */
    static async getAllFeedbackForUser(
        userId: string,
        supabase: SupabaseClientType
    ): Promise<EventFeedback[]> {
        const { data, error } = await supabase
            .from('event_feedback')
            .select('*')
            .eq('user_id', userId)
            .order('feedback_date', { ascending: false });

        if (error) {
            console.error('[EventFeedbackService] Error fetching user feedback:', error);
            throw error;
        }

        return (data || []).map(transformFeedback);
    }

    /**
     * Delete feedback
     */
    static async deleteFeedback(
        feedbackId: string,
        supabase: SupabaseClientType
    ): Promise<void> {
        const { error } = await supabase
            .from('event_feedback')
            .delete()
            .eq('id', feedbackId);

        if (error) {
            console.error('[EventFeedbackService] Error deleting feedback:', error);
            throw error;
        }
    }

    /**
     * Check if user has submitted feedback for an event
     */
    static async hasFeedback(
        eventId: string,
        userId: string,
        supabase: SupabaseClientType
    ): Promise<boolean> {
        const { data, error } = await supabase
            .from('event_feedback')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[EventFeedbackService] Error checking feedback:', error);
            return false;
        }

        return !!data;
    }
}
