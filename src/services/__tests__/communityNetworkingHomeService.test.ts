import { describe, expect, it, vi } from 'vitest';

import { CommunityNetworkingHomeService } from '@/services/communityNetworkingHomeService';

function createEventsChain(
  batches: Array<
    Array<{
      id: string;
      slug: string;
      title: string;
      start_time: string;
      event_image_url: string | null;
      source_url: string | null;
      source_domain: string | null;
      location: string | null;
      attendee_count: number | null;
      event_format: string | null;
      event_type_id: string | null;
      status: string | null;
    }>
  >
) {
  let batchIndex = 0;

  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    lt: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.lt = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn(async () => {
    const data = batches[batchIndex] ?? [];
    batchIndex += 1;
    return { data, error: null };
  });

  return chain;
}

function createSpeakerRowsChain(
  batches: Array<
    Array<{
      event_id: string | null;
      speaker_id: string | null;
      speaker_name: string | null;
    }>
  >
) {
  let batchIndex = 0;

  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.not = vi.fn(async () => {
    const data = batches[batchIndex] ?? [];
    batchIndex += 1;
    return { data, error: null };
  });

  return chain;
}

describe('CommunityNetworkingHomeService', () => {
  it('continues scanning until it finds speaker-backed past events', async () => {
    const eventsChain = createEventsChain([
      Array.from({ length: 64 }, (_, index) => ({
        id: `event-${index + 1}`,
        slug: `recent-without-speakers-${index + 1}`,
        title: `Recent event without speakers ${index + 1}`,
        start_time: '2026-04-01T00:00:00.000Z',
        event_image_url: null,
        source_url: null,
        source_domain: null,
        location: null,
        attendee_count: null,
        event_format: null,
        event_type_id: null,
        status: 'confirmed',
      })),
      [
        {
          id: 'event-2',
          slug: 'data-summit',
          title: 'Data Summit 2026',
          start_time: '2026-03-01T00:00:00.000Z',
          event_image_url: null,
          source_url: null,
          source_domain: null,
          location: null,
          attendee_count: null,
          event_format: null,
          event_type_id: null,
          status: 'confirmed',
        },
      ],
      [],
    ]);
    const speakersChain = createSpeakerRowsChain([
      [],
      [
        {
          event_id: 'event-2',
          speaker_id: 'speaker-1',
          speaker_name: 'Jamie Chen',
        },
      ],
    ]);

    const readClient = {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return eventsChain;
        }

        if (table === 'event_speakers_flat') {
          return speakersChain;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as any;

    const result = await (CommunityNetworkingHomeService as any).getPastSpeakerCandidateData({
      readClient,
      now: new Date('2026-04-13T00:00:00.000Z'),
    });

    expect(eventsChain.range).toHaveBeenCalledTimes(2);
    expect(result.pastEvents).toEqual([
      expect.objectContaining({
        id: 'event-2',
        title: 'Data Summit 2026',
      }),
    ]);
    expect(result.speakerRows).toEqual([
      expect.objectContaining({
        event_id: 'event-2',
        speaker_id: 'speaker-1',
      }),
    ]);
  });
});
