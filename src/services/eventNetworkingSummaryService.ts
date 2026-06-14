import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface EventNetworkingSummary {
  id: string;
  userId: string;
  eventId: string;
  linkedinRequestsSent: number | null;
  lastOutreachLoggedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type SupabaseClientType = SupabaseClient<Database>;

function transformSummary(
  row: Database['public']['Tables']['event_networking_summary']['Row']
): EventNetworkingSummary {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    linkedinRequestsSent: row.linkedin_requests_sent,
    lastOutreachLoggedAt: row.last_outreach_logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EventNetworkingSummaryService {
  static async getSummaryForEvent(
    eventId: string,
    userId: string,
    supabase: SupabaseClientType
  ): Promise<EventNetworkingSummary | null> {
    const { data, error } = await supabase
      .from('event_networking_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error(
        '[EventNetworkingSummaryService] Error fetching event networking summary:',
        error
      );
      throw error;
    }

    return data ? transformSummary(data) : null;
  }

  static async getAllSummariesForUser(
    userId: string,
    supabase: SupabaseClientType
  ): Promise<EventNetworkingSummary[]> {
    const { data, error } = await supabase
      .from('event_networking_summary')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(
        '[EventNetworkingSummaryService] Error fetching networking summaries:',
        error
      );
      throw error;
    }

    return (data || []).map(transformSummary);
  }

  static async setLinkedInRequestsSent(
    params: {
      eventId: string;
      userId: string;
      linkedinRequestsSent: number | null;
      lastOutreachLoggedAt?: string | null;
    },
    supabase: SupabaseClientType
  ): Promise<EventNetworkingSummary | null> {
    if (params.linkedinRequestsSent == null) {
      const { error } = await supabase
        .from('event_networking_summary')
        .delete()
        .eq('event_id', params.eventId)
        .eq('user_id', params.userId);

      if (error) {
        console.error(
          '[EventNetworkingSummaryService] Error clearing networking summary:',
          error
        );
        throw error;
      }

      return null;
    }

    const { data, error } = await supabase
      .from('event_networking_summary')
      .upsert(
        {
          event_id: params.eventId,
          user_id: params.userId,
          linkedin_requests_sent: params.linkedinRequestsSent,
          last_outreach_logged_at: params.lastOutreachLoggedAt ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,event_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error(
        '[EventNetworkingSummaryService] Error upserting networking summary:',
        error
      );
      throw error;
    }

    return transformSummary(data);
  }

}
