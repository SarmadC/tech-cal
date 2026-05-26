import { describe, expect, it } from 'vitest';

import { EventAgendaSaveService } from './eventAgendaSaveService';

function buildSupabaseWithSaves(agendaItemIds: string[]) {
  const query = {
    select: () => query,
    eq: async () => ({
      data: agendaItemIds.map((agenda_item_id) => ({ agenda_item_id })),
      error: null,
    }),
  };

  return {
    from: () => query,
  } as any;
}

describe('EventAgendaSaveService.buildNetworkingPulse', () => {
  it('returns active pulse data from aggregate session saves', async () => {
    const pulse = await EventAgendaSaveService.buildNetworkingPulse(
      {
        eventId: 'event-1',
        agenda: [
          {
            id: 'agenda-1',
            title: 'Advanced T-SQL Triage',
            startTime: '2026-04-12T18:00:00.000Z',
            endTime: '2026-04-12T18:45:00.000Z',
            type: 'session',
            topics: ['Microsoft Fabric'],
          },
        ],
      },
      buildSupabaseWithSaves(Array(12).fill('agenda-1'))
    );

    expect(pulse.state).toBe('active');
    expect(pulse.trendingTopic?.label).toBe('Microsoft Fabric');
    expect(pulse.trendingTopic?.activityLabel).toBe('Highly active');
    expect(pulse.mostSavedSession?.saveCount).toBe(12);
  });

  it('returns empty pulse data below the privacy threshold', async () => {
    const pulse = await EventAgendaSaveService.buildNetworkingPulse(
      {
        eventId: 'event-1',
        agenda: [
          {
            id: 'agenda-1',
            title: 'Small session',
            startTime: '2026-04-12T18:00:00.000Z',
            endTime: '2026-04-12T18:45:00.000Z',
            type: 'session',
            track: 'Data',
          },
        ],
      },
      buildSupabaseWithSaves(['agenda-1'])
    );

    expect(pulse).toEqual({
      state: 'empty',
      trendingTopic: null,
      mostSavedSession: null,
    });
  });
});
