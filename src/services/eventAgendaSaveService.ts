import type { MobileEventNetworkingPulse } from '@kurecal/domain';

import type { AgendaItem, SupabaseClientType } from '@/types';

const PULSE_PRIVACY_THRESHOLD = 2;

type AgendaSaveRow = {
  agenda_item_id: string;
};

function getUntypedClient(supabase: SupabaseClientType) {
  return supabase as unknown as {
    from: (table: string) => any;
  };
}

function normalizeTopic(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function buildActivityLabel(count: number) {
  if (count >= 10) {
    return 'Highly active';
  }

  if (count >= 5) {
    return 'Growing fast';
  }

  return 'Emerging';
}

export class EventAgendaSaveService {
  static async getSavedAgendaItemIds(
    params: {
      eventId: string;
      userId: string;
    },
    supabase: SupabaseClientType
  ): Promise<Set<string>> {
    const { data, error } = await getUntypedClient(supabase)
      .from('user_event_agenda_saves')
      .select('agenda_item_id')
      .eq('event_id', params.eventId)
      .eq('user_id', params.userId);

    if (error) {
      console.error('[EventAgendaSaveService] Failed to load agenda saves', error);
      throw error;
    }

    return new Set(
      ((data as Array<{ agenda_item_id: string }> | null) ?? []).map(
        (row) => row.agenda_item_id
      )
    );
  }

  static async setAgendaItemSaved(
    params: {
      eventId: string;
      agendaItemId: string;
      userId: string;
      isSaved: boolean;
    },
    supabase: SupabaseClientType
  ): Promise<void> {
    const client = getUntypedClient(supabase);

    const { data: agendaItem, error: agendaError } = await client
      .from('event_agenda')
      .select('id')
      .eq('id', params.agendaItemId)
      .eq('event_id', params.eventId)
      .maybeSingle();

    if (agendaError) {
      console.error('[EventAgendaSaveService] Failed to verify agenda item', agendaError);
      throw agendaError;
    }

    if (!agendaItem) {
      throw new Error('Agenda item not found for this event');
    }

    if (params.isSaved) {
      const { error } = await client
        .from('user_event_agenda_saves')
        .upsert(
          {
            user_id: params.userId,
            event_id: params.eventId,
            agenda_item_id: params.agendaItemId,
          },
          { onConflict: 'user_id,agenda_item_id' }
        );

      if (error) {
        console.error('[EventAgendaSaveService] Failed to save agenda item', error);
        throw error;
      }

      return;
    }

    const { error } = await client
      .from('user_event_agenda_saves')
      .delete()
      .eq('user_id', params.userId)
      .eq('event_id', params.eventId)
      .eq('agenda_item_id', params.agendaItemId);

    if (error) {
      console.error('[EventAgendaSaveService] Failed to unsave agenda item', error);
      throw error;
    }
  }

  static async buildNetworkingPulse(
    params: {
      eventId: string;
      agenda: AgendaItem[];
    },
    supabase: SupabaseClientType
  ): Promise<MobileEventNetworkingPulse> {
    const { data, error } = await getUntypedClient(supabase)
      .from('user_event_agenda_saves')
      .select('agenda_item_id')
      .eq('event_id', params.eventId);

    if (error) {
      console.error('[EventAgendaSaveService] Failed to load pulse counts', error);
      throw error;
    }

    const saveCounts = new Map<string, number>();
    for (const row of (data as AgendaSaveRow[] | null) ?? []) {
      saveCounts.set(
        row.agenda_item_id,
        (saveCounts.get(row.agenda_item_id) ?? 0) + 1
      );
    }
    const counts = Array.from(saveCounts, ([agenda_item_id, save_count]) => ({
      agenda_item_id,
      save_count,
    }));

    if (counts.length === 0) {
      return {
        state: 'empty',
        trendingTopic: null,
        mostSavedSession: null,
      };
    }

    const agendaById = new Map(params.agenda.map((item) => [item.id, item]));
    const validCounts = counts.filter((row) => agendaById.has(row.agenda_item_id));
    const sortedCounts = validCounts
      .filter((row) => row.save_count >= PULSE_PRIVACY_THRESHOLD)
      .sort((left, right) => right.save_count - left.save_count);
    const topSessionCount = sortedCounts[0] ?? null;
    const topicCounts = new Map<string, number>();

    for (const row of validCounts) {
      const agendaItem = agendaById.get(row.agenda_item_id);
      if (!agendaItem) {
        continue;
      }

      const labels =
        agendaItem.topics && agendaItem.topics.length > 0
          ? agendaItem.topics
          : [agendaItem.track];

      for (const label of labels) {
        const normalized = normalizeTopic(label);
        if (!normalized) {
          continue;
        }

        topicCounts.set(
          normalized,
          (topicCounts.get(normalized) ?? 0) + row.save_count
        );
      }
    }

    const topTopic = Array.from(topicCounts.entries())
      .filter((entry) => entry[1] >= PULSE_PRIVACY_THRESHOLD)
      .sort((left, right) => right[1] - left[1])[0];
    const topAgendaItem = topSessionCount
      ? agendaById.get(topSessionCount.agenda_item_id)
      : null;

    return {
      state: topSessionCount || topTopic ? 'active' : 'empty',
      trendingTopic: topTopic
        ? {
            label: topTopic[0],
            activityLabel: buildActivityLabel(topTopic[1]),
          }
        : null,
      mostSavedSession:
        topSessionCount && topAgendaItem
          ? {
              agendaItemId: topSessionCount.agenda_item_id,
              title: topAgendaItem.title,
              saveCount: topSessionCount.save_count,
            }
          : null,
    };
  }
}
